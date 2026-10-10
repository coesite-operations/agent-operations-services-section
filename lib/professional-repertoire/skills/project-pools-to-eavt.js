#!/usr/bin/env node
/**
 * @description Folds and unfolds the content pools against application/eavt+jsonl, the wire form the protocol-allocation decision names as the platform's one source symbol: --unfold reads lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/*\/*.json and emits one [entity, attribute, value, time] row per line, entity derived from the record's own pool seat and attribute a JSON Pointer into it; --fold reads such rows back into records. Deliberately shreds by JSON Pointer rather than inventing a second schema for the shredded form — an EAVT row says nothing a JSON Pointer and a value do not already say. Use to prove the pools ARE a state projection over a log, per the requirement's eavt-projection:fold-unfold-instrument condition, and as the read substrate query-eavt.js's triple-pattern surface runs over.
 *
 * @returns {Array} every row --unfold emits parses as JSON and has exactly four elements
 * @returns {object} unfold(pools) then fold reproduces every record structurally identically (deep-equal), or the residue is reported precisely — never silently
 * @returns {Array} time is read from the record's own x-provenance.recorded-on and never from filesystem mtime
 * @throws {Error} --fold is given, on stdin, lines each parsing as a 4-element JSON array [entity, attribute, value, time]
 *
 * --unfold is given a pool root under which content/<kind>/<slug>.json seats
 * records.
 *
 * ## Why JSON Pointer, and why no fifth column
 *
 * The prior art (WitnessJournal, metroplat's own unfoldJson/foldJson) shreds a JSON
 * document into rows keyed by JSON Pointer (RFC 6901) because a pointer
 * already says everything an attribute needs to say — which field, at what
 * depth, under which key — without a second, parallel vocabulary this
 * platform would have to keep in step with the first. A leaf value (string,
 * number, boolean, null) gets its own row; an EMPTY array or object also
 * gets its own row, its value literally `[]` or `{}`, because otherwise an
 * empty container leaves no trace to fold back from. A NON-empty array or
 * object emits no row of its own — only its children do — because the
 * container's existence and shape are exactly what folding reconstructs
 * from the pointers of what is inside it.
 *
 * ## The one heuristic, named rather than hidden
 *
 * Folding has to decide, at every internal node, whether it is rebuilding
 * an array or an object — RFC 6901 pointers do not carry that distinction
 * themselves ("/0" addresses index 0 of an array or key "0" of an object
 * identically). This codec resolves it the same way every JSON-Pointer
 * shredder does: if a node's immediate children are exactly the keys
 * "0".."n-1" in some order, it is rebuilt as an array; otherwise, an object.
 * This is exactly right for every record in this pool — kebab-case field
 * names are never bare small integers — and it is exactly wrong for a
 * hypothetical record whose object keys happen to be "0", "1", "2" with
 * nothing else. No record in lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/ does this today; a record
 * that started would be silently misfolded as an array, which is why
 * --roundtrip exists: run it after any real change to the pools, not just
 * once, because this heuristic is a standing limitation and not a solved
 * problem.
 *
 * ## Time: recorded-on, never mtime
 *
 * The prior art's own doctrine — provenance is never timestamps — refuses
 * filesystem mtime as a time source outright: a checkout, a rebase, or a
 * clock skew moves a file's mtime without anyone having touched its
 * content, so mtime is not a fact about the record, only about the last
 * disk operation on it. This codec's stated time law is narrower and
 * honest about its own limit: EVERY row of one record shares that record's
 * own `x-provenance.recorded-on` where the record carries one — a single
 * date the record's own writer stated, never a derived instant, never a
 * per-field time. A record with no x-provenance.recorded-on projects its
 * rows with time null, reported as exactly that rather than defaulted to a
 * fabricated date. This is coarser than the datom-per-edit granularity the
 * prior art's own journal doctrine describes (each amendment its own
 * transaction time) — this instrument folds/unfolds the CURRENT pool state,
 * one projection per record, not a multi-version history; the journal phase
 * the protocol-allocation decision defers to later is what would give each
 * field-level edit its own time.
 *
 * ## Run it
 *
 * ```sh
 * node .../project-pools-to-eavt.js --unfold --root <repo>  > pools.eavt.jsonl
 * node .../project-pools-to-eavt.js --fold   --root <repo> < pools.eavt.jsonl
 * node .../project-pools-to-eavt.js --roundtrip --root <repo>
 * ```
 *
 * `--root` (default: the caller's working directory) is the repository
 * root; pools are read from `<root>/lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/<kind>/<slug>.json`,
 * one level deep — `_archive/` and any other nested directory is never
 * descended into, so an archived record is never confused with a live one.
 * `--fold` writes reconstructed records to stdout as one JSON object per
 * line, `{"entity": "...", "record": {...}}`; it does not write pool files,
 * because writing a pool record unchecked is exactly what
 * writing-a-requirement and its siblings exist to refuse doing.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **A --fold line that is not a 4-element JSON array** — refused, the
 *   line and its parse error named, rather than skipped silently and the
 *   reconstruction quietly missing a field.
 * - **--roundtrip finding a residue** — reported exactly, entity and JSON
 *   Pointer named, never summarized as "differences found". A residue this
 *   instrument cannot explain is the signal that the heuristic above has
 *   met a record it does not fit, and that is worth knowing precisely.
 *
 * ## When NOT to use
 *
 * - Not a general RDF/JSON-LD processor — it emits and reads exactly one
 *   media type, application/eavt+jsonl, and nothing else.
 * - Not for writing a pool record — read-a-schema.js and each record's own
 *   writer (raise-an-idea.js, make-a-task.js, …) still own that; --fold
 *   reconstructs a record in memory, on stdout, never on disk.
 * - Not a query engine — query-eavt.js reads what this emits.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const MEDIA_TYPE = "application/eavt+jsonl";

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(text) {
  process.stdout.write(text);
}

function die(message) {
  process.stderr.write(JSON.stringify({ ok: false, error: message }, null, 2) + "\n");
  process.exit(1);
}

// ── JSON Pointer (RFC 6901) ─────────────────────────────────────────────────
const escapeToken = (t) => t.replace(/~/gu, "~0").replace(/\//gu, "~1");
const unescapeToken = (t) => t.replace(/~1/gu, "/").replace(/~0/gu, "~");

function pointerOf(segments) {
  return segments.map((s) => `/${escapeToken(String(s))}`).join("");
}

function segmentsOf(pointer) {
  if (pointer === "") return [];
  if (!pointer.startsWith("/")) throw new Error(`not a JSON Pointer: ${JSON.stringify(pointer)}`);
  return pointer.slice(1).split("/").map(unescapeToken);
}

const isLeaf = (v) => v === null || typeof v !== "object";
const isEmptyContainer = (v) => typeof v === "object" && v !== null && Object.keys(v).length === 0;

// ── unfold: record -> rows ───────────────────────────────────────────────
/** Shred one record into [entity, attribute, value, time] rows. */
export function unfoldRecord(record, entity, time) {
  const rows = [];
  (function walk(value, segments) {
    if (isLeaf(value) || isEmptyContainer(value)) {
      rows.push([entity, pointerOf(segments), value, time]);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, [...segments, i]));
    } else {
      for (const [k, v] of Object.entries(value)) walk(v, [...segments, k]);
    }
  })(record, []);
  return rows;
}

// ── fold: rows -> record ─────────────────────────────────────────────────
// Two passes per entity: (1) learn, for every internal pointer prefix, the
// set of immediate child tokens any row's pointer passes through it with;
// (2) build bottom-up, a node with a direct row becoming that row's value
// (leaf or empty container), a node with children becoming an array when
// its children are exactly "0".."n-1", else an object.
function foldEntity(rows) {
  const direct = new Map(); // pointer -> value
  const children = new Map(); // pointer -> Set(child token)
  for (const [, attribute, value] of rows) {
    direct.set(attribute, value);
    const segs = segmentsOf(attribute);
    for (let i = 0; i < segs.length; i++) {
      const prefix = pointerOf(segs.slice(0, i));
      if (!children.has(prefix)) children.set(prefix, new Set());
      children.get(prefix).add(segs[i]);
    }
  }

  function build(pointer) {
    if (direct.has(pointer)) return direct.get(pointer);
    const kids = children.get(pointer);
    if (!kids) throw new Error(`pointer '${pointer}' has neither a direct row nor children — the row set is incomplete`);
    const keys = [...kids];
    const isArray = keys.length > 0 && keys.every((k, i) => String(i) === String(keys.map(Number).sort((a, b) => a - b)[i])) &&
      keys.every((k) => /^\d+$/u.test(k));
    if (isArray) {
      const n = keys.length;
      const arr = new Array(n);
      for (let i = 0; i < n; i++) arr[i] = build(pointerOf([...segmentsOf(pointer), String(i)]));
      return arr;
    }
    const obj = {};
    for (const k of keys) obj[k] = build(pointerOf([...segmentsOf(pointer), k]));
    return obj;
  }

  return build("");
}

/** Fold a full stream of rows (possibly many entities) into a Map(entity -> record). */
export function foldRows(rows) {
  const byEntity = new Map();
  for (const row of rows) {
    if (!byEntity.has(row[0])) byEntity.set(row[0], []);
    byEntity.get(row[0]).push(row);
  }
  const result = new Map();
  for (const [entity, entityRows] of byEntity) result.set(entity, foldEntity(entityRows));
  return result;
}

// ── the content pools ────────────────────────────────────────────────────
// One level deep, exactly as application/eavt+jsonl's entity law requires:
// lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/<kind>/<slug>.json. A nested directory — _archive/, or
// any other — is never descended into: an archived record is not a live
// entity, and conflating the two would make the projection lie about what
// is currently seated.
export function readPools(root) {
  const contentDir = join(root, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content");
  const records = [];
  if (!existsSync(contentDir)) return records;
  for (const kind of readdirSync(contentDir)) {
    const kindDir = join(contentDir, kind);
    if (!statSync(kindDir).isDirectory()) continue;
    for (const file of readdirSync(kindDir)) {
      const path = join(kindDir, file);
      if (!file.endsWith(".json") || !statSync(path).isFile()) continue;
      const slug = file.slice(0, -".json".length);
      let record;
      try {
        record = JSON.parse(readFileSync(path, "utf8"));
      } catch (e) {
        die(`${relative(root, path)} is not valid JSON: ${e.message}`);
      }
      records.push({ entity: `emsenn/${kind}/${slug}`, kind, slug, path, record });
    }
  }
  return records;
}

/** Unfold every seated record into EAVT rows, time from x-provenance.recorded-on. */
export function unfoldPools(root) {
  const rows = [];
  for (const { entity, record } of readPools(root)) {
    const time = record?.["x-provenance"]?.["recorded-on"] ?? null;
    rows.push(...unfoldRecord(record, entity, time));
  }
  return rows;
}

// ── deep-equal, for --roundtrip ─────────────────────────────────────────
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (typeof a === "object") {
    const ak = Object.keys(a), bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => k in b && deepEqual(a[k], b[k]));
  }
  return false;
}

// Walk two values in parallel, returning the first JSON Pointer at which
// they diverge, or null if they match structurally throughout.
function firstDivergence(a, b, pointer = "") {
  if (deepEqual(a, b)) return null;
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null && Array.isArray(a) === Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const d = firstDivergence(a[k], b[k], `${pointer}/${escapeToken(k)}`);
      if (d) return d;
    }
  }
  return { pointer: pointer || "(root)", expected: a, actual: b };
}

export function roundtrip(root) {
  const seated = readPools(root);
  const rows = unfoldPools(root);
  const folded = foldRows(rows);
  const mismatches = [];
  for (const { entity, record } of seated) {
    const rebuilt = folded.get(entity);
    if (rebuilt === undefined) { mismatches.push({ entity, error: "no rows folded back for this entity" }); continue; }
    const d = firstDivergence(record, rebuilt);
    if (d) mismatches.push({ entity, ...d });
  }
  const extra = [...folded.keys()].filter((e) => !seated.some((s) => s.entity === e));
  return { ok: mismatches.length === 0 && extra.length === 0, checked: seated.length, rows: rows.length, mismatches, extraEntities: extra };
}

// ── CLI ──────────────────────────────────────────────────────────────────
function printUsage() {
  out(
    [
      "Usage:",
      "  node project-pools-to-eavt.js --unfold --root <repo>    > rows.eavt.jsonl",
      "  node project-pools-to-eavt.js --fold   --root <repo>    < rows.eavt.jsonl",
      "  node project-pools-to-eavt.js --roundtrip --root <repo>",
      "  node project-pools-to-eavt.js --help",
      "",
      `--unfold emits one JSON array per line, media type ${MEDIA_TYPE}:`,
      "  [entity, attribute, value, time]",
      "--fold reads such rows on stdin and emits one reconstructed record per",
      "line as {\"entity\":..., \"record\":...} — it writes nothing to the pools.",
      "--roundtrip unfolds then folds the live pools and reports any residue.",
    ].join("\n") + "\n",
  );
}

function main() {
  if (process.argv.includes("--help")) { printUsage(); return; }
  const root = argValue("--root") ?? process.cwd();

  if (process.argv.includes("--unfold")) {
    const rows = unfoldPools(root);
    for (const row of rows) out(JSON.stringify(row) + "\n");
    process.stderr.write(`# ${MEDIA_TYPE}: ${rows.length} rows from ${readPools(root).length} records\n`);
    return;
  }

  if (process.argv.includes("--fold")) {
    const input = readFileSync(0, "utf8");
    const lines = input.split("\n").filter((l) => l.trim());
    const rows = lines.map((line, i) => {
      let row;
      try {
        row = JSON.parse(line);
      } catch (e) {
        die(`line ${i + 1} is not JSON: ${e.message}`);
      }
      if (!Array.isArray(row) || row.length !== 4) {
        die(`line ${i + 1} is not a 4-element ${MEDIA_TYPE} row: ${line}`);
      }
      return row;
    });
    const folded = foldRows(rows);
    for (const [entity, record] of folded) out(JSON.stringify({ entity, record }) + "\n");
    process.stderr.write(`# folded ${rows.length} rows into ${folded.size} records\n`);
    return;
  }

  if (process.argv.includes("--roundtrip")) {
    const report = roundtrip(root);
    out(JSON.stringify(report, null, 2) + "\n");
    process.exit(report.ok ? 0 : 1);
  }

  printUsage();
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
