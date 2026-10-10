#!/usr/bin/env node
/**
 * @description Seats one book entry — a unit's sourced cost figure, with the value it created and the value it captured kept in separate columns rather than netted — into the chief financial officer's own content/books/ pool, validated against emsenn/schema/book-entry. Refuses no stdin, a figure with no source, a value-created or value-captured side asserting a figure while quantified is false, and an id already seated. Use whenever a unit's settled cost is owed to the books and no entry for it yet exists — this is what actually opens the books the office's own record otherwise only promises in prose.
 * @throws {Error} stdin must hold JSON naming id, name, unit, source, cost ({fuel-consumed, wall-time-seconds, denomination}), value-created ({description, quantified}), value-captured ({description, quantified}).
 * @throws {Error} source, when path-shaped, must name a path that exists.
 * @throws {Error} No book entry of this id may already be seated in the books pool.
 * @throws {Error} A value-side (value-created or value-captured) carrying a figure must have quantified true.
 *
 * A book-entry record exists that conforms to emsenn/schema/book-entry, and
 * the entry's id equals its own basename in the pool.
 *
 * The books are this office's record, per its own normative-structure: what
 * the firm has, what it owes, what value each unit created and captured, and
 * in what denomination any of that is counted. Nothing before this script
 * mechanized any of that — the office's own unrealized note said so plainly:
 * "no books exist yet". This is the instrument that opens them, one sourced
 * entry at a time, rather than a ledger asserted open by prose that no
 * schema checks and no script writes.
 *
 * ## What it is not
 *
 * It does not settle a firm-wide allocation currency (settle-the-denomination
 * -an-allocation-is-counted-in — this office's own deontic-power, exercised
 * separately and named honestly on the entry via cost.denomination-settled,
 * never implied true by an entry simply existing). It does not decide
 * whether a line is worth continuing (the investment review board's
 * altitude — this office holds a deontic-immunity against being made to rule
 * it) and it does not set a unit's distribution formula (sanquan's own
 * reserve). It books the number; it does not spend it or judge it.
 *
 * ## Run it
 *
 * ```sh
 * echo '{"id":"…","name":"…","unit":"<unit-id>","source":"<path-or-record-address>",
 *        "cost":{"fuel-consumed":15,"wall-time-seconds":99.706,"denomination":"…","denomination-settled":false},
 *        "value-created":{"description":"…","quantified":false},
 *        "value-captured":{"description":"…","quantified":false},
 *        "authorized-by":["<decision-record-id>"],"witnessed-by":"<task-id>"}' \
 *   | node .../keep-the-books.js
 *
 * node .../keep-the-books.js --list
 * node .../keep-the-books.js --check
 * ```
 *
 * Input is JSON. Output is JSON. `--from` (default: the caller's working
 * directory) is where resolution starts; `--pool` names the books pool
 * directly and wins outright.
 *
 * ## Resolution
 *
 * The unit boundary is the same shared law every sibling in this pool uses
 * (resolve-an-identifier.js's findUnit, NEAREST): walk UP from `--from` (or
 * its cwd default) to the nearest ancestor carrying `content/` or
 * `lib/management/`, retrying once from this script's own file location if
 * nothing is found. That unit's `content/books` (or `--pool`, which
 * overrides outright) is where the entry is written, created on first write
 * — the books are opened, per this office's own deontic-power, by the act of
 * that first write, not by a separate ceremony.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **No stdin** — refused. A book entry is written from data, never typed
 *   into a file or asserted in a conversation.
 * - **A figure with no source** — refused. This office's own duty is to
 *   refuse a figure a unit cannot source; a source that is path-shaped and
 *   does not resolve is exactly that failure, caught before the entry seats.
 * - **A value-side claiming a figure while quantified is false** — refused.
 *   quantified is what keeps "value created" honest as a description that
 *   may or may not yet be a number; a figure present under quantified:false
 *   would let a number in without the field that says it can be trusted.
 * - **An id already seated** — refused, never overwritten. A book entry is a
 *   settled fact about a cost already incurred; amending it after the fact
 *   is not what this instrument is for — supersede or a new entry is.
 *
 * ## When NOT to use
 *
 * - Not to decide whether a line is worth continuing — that is the
 *   investment review board's altitude, held out of this instrument by the
 *   same deontic-immunity the office itself holds.
 * - Not to set a unit's distribution formula — sanquan's own reserve.
 * - Not to settle the firm's allocation currency — a separate act this
 *   script does not perform, only records honestly when it has or has not
 *   happened via cost.denomination-settled.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findUnit as resolveFindUnit } from "./resolve-an-identifier.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FROM = argValue("--from") ?? process.cwd();
const POOL_OVERRIDE = argValue("--pool");
const DRY_RUN = process.argv.includes("--dry-run");

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

const die = (message) => out({ ok: false, error: message }, 1);

const UNIT_ROOT = resolveFindUnit(FROM) ?? resolveFindUnit(HERE);

function booksPool() {
  if (POOL_OVERRIDE) return POOL_OVERRIDE;
  if (!UNIT_ROOT) return null;
  return join(UNIT_ROOT, "content/books");
}

const BOOKS_POOL = booksPool();

// ⊥ — no unit at or above the asking point carries content/ or
// lib/management/ at all.
if (!BOOKS_POOL) {
  die(`⊥ no unit at or above ${FROM} (or ${HERE}) — nothing carries content/ or lib/management/, so no books pool can be located either. Pass --pool to name it directly.`);
}

function seatedIds() {
  if (!existsSync(BOOKS_POOL)) return [];
  return readdirSync(BOOKS_POOL)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/u, ""));
}

function seatedEntries() {
  return seatedIds().map((id) => JSON.parse(readFileSync(join(BOOKS_POOL, `${id}.json`), "utf8")));
}

// The record shape is the schema pool's, checked through READING-A-SCHEMA —
// the one validator, called and never copied.
function findReader() {
  const beside = join(HERE, "read-a-schema.js");
  if (existsSync(beside)) return beside;
  let d = resolve(FROM);
  for (;;) {
    const at = join(d, "lib/management/skills/read-a-schema.js");
    if (existsSync(at)) return at;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

function violations(record) {
  const reader = findReader();
  if (!reader) die("⊥ cannot find reading-a-schema — the one validator. No book entry is seated against an unchecked record.");
  const r = spawnSync(process.execPath, [reader, "book-entry", "--from", FROM], {
    input: JSON.stringify(record),
    encoding: "utf8",
  });
  let verdict;
  try {
    verdict = JSON.parse(r.stdout);
  } catch {
    die(`⊥ reading-a-schema returned nothing parseable: ${(r.stderr || r.stdout || "").trim()}`);
  }
  return verdict.ok ? [] : (verdict.errors ?? [verdict.error]);
}

// A path-shaped source, same rule report-an-anomaly.js's `at` uses: contains
// a `.` (an extension), or opens with `/`, `./`, or `../`. A record address
// (emsenn/schema/office) has none of these and is never held to existsSync.
function pathShaped(s) {
  return /\./u.test(s) || s.startsWith("/") || s.startsWith("./") || s.startsWith("../");
}

function checkValueSide(side, label) {
  if (side == null || typeof side !== "object") die(`${label} must be an object`);
  if (side.figure !== undefined && side.quantified !== true) {
    die(`${label} carries a figure but quantified is not true — a figure this office cannot stand behind as quantified is not booked`);
  }
}

function report() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) die("no data on stdin — a book entry is written from data, never typed into a file or asserted in a conversation");
  let intake;
  try {
    intake = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }

  for (const key of ["id", "name", "unit", "source", "cost", "value-created", "value-captured"]) {
    if (intake[key] === undefined) die(`book entry has no '${key}'`);
  }
  if (!ID.test(String(intake.id))) die(`id '${intake.id}' is not kebab-case`);
  if (!ID.test(String(intake.unit))) die(`unit '${intake.unit}' is not kebab-case`);

  if (seatedIds().includes(String(intake.id))) {
    die(`book entry '${intake.id}' already seats in ${relative(FROM, BOOKS_POOL)} — refused, never overwritten`);
  }

  // A figure this office cannot source is refused before it ever reaches
  // the record — the office's own duty, enforced here rather than trusted.
  const source = String(intake.source);
  if (pathShaped(source)) {
    const resolved = source.startsWith("/") ? source : resolve(FROM, source);
    if (!existsSync(resolved)) {
      die(`source '${source}' reads as a path and does not exist (looked at ${resolved}) — a figure this office cannot source is refused, not booked`);
    }
  }

  checkValueSide(intake["value-created"], "value-created");
  checkValueSide(intake["value-captured"], "value-captured");

  const record = {
    id: intake.id,
    name: intake.name,
    unit: intake.unit,
    source: intake.source,
    cost: intake.cost,
    "value-created": intake["value-created"],
    "value-captured": intake["value-captured"],
    ...(intake["authorized-by"] !== undefined ? { "authorized-by": intake["authorized-by"] } : {}),
    ...(intake["witnessed-by"] !== undefined ? { "witnessed-by": intake["witnessed-by"] } : {}),
    "x-provenance": {
      "recorded-by": intake["recorded-by"] ?? "claude/chief-financial-officer",
      "recorded-on": new Date().toISOString().slice(0, 10),
    },
  };

  const errs = violations(record);
  if (errs.length) die(`book entry does not conform to emsenn/schema/book-entry: ${errs.join("; ")}`);

  const path = join(BOOKS_POOL, `${intake.id}.json`);

  const witness = {
    ok: true,
    booked: {
      id: intake.id,
      path: relative(FROM, path),
      unit: intake.unit,
      source: intake.source,
    },
  };
  if (DRY_RUN) out({ ...witness, dryRun: true });

  mkdirSync(BOOKS_POOL, { recursive: true });
  writeFileSync(path, JSON.stringify(record, null, 2) + "\n");
  out(witness);
}

function list() {
  out({
    ok: true,
    entries: seatedEntries().map((e) => ({ id: e.id, name: e.name, unit: e.unit, source: e.source })),
  });
}

function check() {
  const ids = seatedIds();
  if (ids.length === 0) {
    die(`the pool at ${relative(FROM, BOOKS_POOL)} holds no book entries — an empty sweep is a broken sweep, not a clean one`);
  }
  const results = [];
  let ok = true;
  for (const id of ids) {
    const record = JSON.parse(readFileSync(join(BOOKS_POOL, `${id}.json`), "utf8"));
    const errs = violations(record);
    if (errs.length) {
      ok = false;
      results.push({ id, errors: errs });
    } else {
      results.push({ id, ok: true });
    }
  }
  out({ ok, checked: ids.length, results }, ok ? 0 : 1);
}

if (process.argv.includes("--list")) list();
else if (process.argv.includes("--check")) check();
else report();
