#!/usr/bin/env node
/**
 * @description Searches every requirement, idea, decision-record, and glossary term this unit carries for a topic, two ways: --keyword <word> is an exact, complete match against a requirement's own keywords field (or, for a requirement seated before that field existed, content/requirement-keywords/index.json's entry for its id) — the reliable mode, because it cannot miss a requirement that happens not to share a searched word. Bare positional arguments instead do a case-insensitive substring search across every pool's serialized text — a wider, best-effort mode for ideas/decisions/glossary terms, which carry no keywords field. Returns every hit's full governing text (asks/says/met-when/definition/keywords), never truncated to an id, grouped by pool in one reply. Use before designing or changing any capability whose placement, shape, or naming might already be ruled.
 *
 * @returns {object} in --keyword mode, every requirement whose own keywords array or whose content/requirement-keywords/index.json entry contains the exact word is reported, and no requirement lacking that word is
 * @returns {object} in search mode, every record in requirements, ideas, decision-records, and glossary/terms whose serialized text contains every given search term (case-insensitive) is reported, with its full governing text and its file path
 * @returns {object} a pool this unit does not carry is reported empty, never as an error
 * @throws {Error} at least one search term is given, non-empty after trimming, OR --keyword is given a non-empty word
 *
 * A unit is resolved by walking up from --from (or cwd) to the nearest
 * ancestor carrying data/ or content/, retrying once from this script's own
 * location.
 *
 * ## Why this exists
 *
 * A rule can be on the record — an idea, a requirement's met-when, a decision,
 * a glossary term — and still get violated, not because nobody wrote it down,
 * but because nobody asked the record before acting. This is the asking:
 * one script, run before a design or placement choice, that returns every
 * governing text mentioning the topic in one reply instead of a session
 * hand-grepping a few files it happens to think of and calling that complete.
 *
 * It aggregates; it does not adjudicate. Two hits that disagree are both
 * reported — reconciling them is a decision for the office whose lane the
 * topic is in, never a thing this script resolves by picking one.
 *
 * ## Run it
 *
 * ```sh
 * node .../aggregate-requirements.js --keyword file-placement --root .
 * node .../aggregate-requirements.js "low-level design" placement
 * node .../aggregate-requirements.js content data write-once --root .
 * node .../aggregate-requirements.js --help
 * ```
 *
 * With --keyword, the word must match exactly (no substring, no case-folding) —
 * it's a controlled-vocabulary key, not prose to search. Without it, all
 * positional arguments are search terms; a record must contain every one
 * (case-insensitive substring match against its own JSON or markdown text)
 * to be reported — AND, not OR, because a topic named by several words is
 * one topic, not a match on any word in it.
 *
 * `--root` (default: cwd) is where the unit is resolved from. Output is
 * JSON: `{ ok, mode, terms|keyword, unit, pools: [{ pool, kind, scanned, hits }] }`.
 *
 * ## When NOT to use
 *
 * - Not to decide what a rule means once several are found — that reading is
 *   the incumbent's, or the office whose lane the topic sits in.
 * - Not a substitute for reading-a-schema.js on a specific record already in
 *   hand — this finds candidates across pools, it does not validate one.
 * - Not for a rule that lives only in prose nobody has yet raised as an idea
 *   or requirement — raising-an-idea.js is how an unrecorded rule gets found
 *   by a future run of this one.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dataDir } from "./resolve-an-identifier.js";

const HERE = dirname(fileURLToPath(import.meta.url));

if (process.argv.includes("--help")) {
  process.stdout.write(
    [
      "Usage:",
      "  node aggregate-requirements.js --keyword <word> [--root DIR]",
      "  node aggregate-requirements.js <term> [<term> ...] [--root DIR]",
      "  node aggregate-requirements.js --help",
      "",
      "--keyword <word> is an exact match against a requirement's own keywords",
      "field (or the legacy content/requirement-keywords/index.json entry for",
      "requirements seated before that field existed).",
      "",
      "Without --keyword, reports every requirement, idea, decision-record, and",
      "glossary term whose text contains every given search term",
      "(case-insensitive), grouped by pool, with full text — not just an id.",
    ].join("\n") + "\n",
  );
  process.exit(0);
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

function die(message) {
  out({ ok: false, error: message }, 1);
}

// Same walk-up-to-nearest-unit-boundary rule every sibling instrument shares:
// content/ or data/ marks a unit, not package.json alone, since this script
// must resolve the SAME unit resolve-an-identifier.js's own findUnit would,
// and a unit's data/ pools are what it actually reads.
function findUnit(from) {
  let d = resolve(from);
  for (;;) {
    if (existsSync(join(d, "data")) || existsSync(join(d, "content"))) return d;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

const ROOT = argValue("--root") ?? process.cwd();
const KEYWORD = argValue("--keyword");
// strip --root's and --keyword's values out of positionals
const valueFlags = new Set(["--root", "--keyword"]);
const positionals = process.argv.slice(2).filter((a, i) => {
  const realIndex = i + 2;
  if (a.startsWith("--")) return false;
  const prev = process.argv[realIndex - 1];
  if (valueFlags.has(prev)) return false;
  return true;
});

if (!KEYWORD && positionals.length === 0) die("no search term or --keyword given — nothing to search for");
const needles = positionals.map((k) => k.toLowerCase());

const unit = findUnit(ROOT) ?? findUnit(HERE);
if (!unit) die(`⊥ no unit at or above ${ROOT} carries data/ or content/ — nothing to search`);

function matches(text) {
  const hay = text.toLowerCase();
  return needles.every((n) => hay.includes(n));
}

// A data pool is presently found in either of two shapes, both live at once
// across this unit's own pools mid class/instance migration: the legacy one
// file per id (data/<kind>/<slug>.json) and the day-bucketed log this rule's
// own idea calls for (data/<kind>/<YYYY>/<MM>/<DD>/*-<kind>.jsonl). A scanner
// that reads only one shape silently drops every record still in the other —
// exactly the kind of undercount this skill exists to make impossible, so
// both are walked here rather than delegated to a single-shape reader.
function allRecordsUnder(base, kind) {
  const found = [];
  if (!existsSync(base)) return found;
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = join(dir, entry.name);
      if (entry.isDirectory()) { walk(child); continue; }
      if (entry.name.endsWith(".json")) {
        try {
          found.push({ file: child, record: JSON.parse(readFileSync(child, "utf8")) });
        } catch (e) {
          found.push({ file: child, error: `not valid JSON: ${e.message}` });
        }
        continue;
      }
      if (entry.name.endsWith(`-${kind}.jsonl`)) {
        const lines = readFileSync(child, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (!line.trim()) return;
          try {
            found.push({ file: child, line: i + 1, record: JSON.parse(line) });
          } catch (e) {
            found.push({ file: child, line: i + 1, error: `not valid JSON: ${e.message}` });
          }
        });
      }
    }
  })(base);
  return found;
}

function scanDataPool(kind) {
  const base = dataDir(unit, kind);
  const records = allRecordsUnder(base, kind);
  const hits = records
    .filter((r) => !r.error && matches(JSON.stringify(r.record)))
    .map((r) => ({ file: relative(unit, r.file), ...(r.line ? { line: r.line } : {}), record: r.record }));
  return { pool: relative(unit, base), kind, scanned: records.length, hits };
}

function scanContentTermPool() {
  const base = join(unit, "content", "glossary", "terms");
  if (!existsSync(base)) return { pool: relative(unit, base), kind: "glossary-terms", scanned: 0, hits: [] };
  const files = readdirSync(base).filter((f) => f.endsWith(".json") || f.endsWith(".md"));
  const hits = [];
  for (const f of files) {
    const path = join(base, f);
    const text = readFileSync(path, "utf8");
    if (matches(text)) {
      let record = text;
      if (f.endsWith(".json")) {
        try { record = JSON.parse(text); } catch { /* keep raw text on parse failure */ }
      }
      hits.push({ file: relative(unit, path), record });
    }
  }
  return { pool: relative(unit, base), kind: "glossary-terms", scanned: files.length, hits };
}

// The legacy index for requirements seated before keywords existed. Its
// absence is not an error — a unit that has never used keyword tagging simply
// has no legacy backlog to consult, and every requirement is judged on its
// own keywords field alone.
function legacyKeywordIndex() {
  const path = join(unit, "content", "requirement-keywords", "index.json");
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")).keywords ?? {};
  } catch {
    return {};
  }
}

function scanRequirementsByKeyword(word) {
  const base = dataDir(unit, "requirements");
  const records = allRecordsUnder(base, "requirements");
  const legacy = legacyKeywordIndex();
  const hits = records
    .filter((r) => !r.error)
    .filter((r) => {
      const own = Array.isArray(r.record.keywords) ? r.record.keywords : null;
      const words = own ?? legacy[r.record.id] ?? [];
      return words.includes(word);
    })
    .map((r) => ({
      file: relative(unit, r.file),
      ...(r.line ? { line: r.line } : {}),
      source: Array.isArray(r.record.keywords) ? "own-keywords-field" : "legacy-index",
      record: r.record,
    }));
  return { pool: relative(unit, base), kind: "requirements", scanned: records.length, hits };
}

if (KEYWORD) {
  const pool = scanRequirementsByKeyword(KEYWORD);
  out({
    ok: true,
    mode: "exact",
    keyword: KEYWORD,
    unit: relative(ROOT, unit) || ".",
    totalHits: pool.hits.length,
    pools: [pool],
  });
}

const pools = [
  scanDataPool("requirements"),
  scanDataPool("ideas"),
  scanDataPool("decision-records"),
  scanContentTermPool(),
];

out({
  ok: true,
  mode: "search",
  terms: needles,
  unit: relative(ROOT, unit) || ".",
  totalHits: pools.reduce((n, p) => n + p.hits.length, 0),
  pools,
});
