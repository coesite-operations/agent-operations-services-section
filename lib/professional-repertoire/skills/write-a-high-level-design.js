#!/usr/bin/env node
/**
 * @description Appends one write-once high-level-design record to this settlement's own canonical data/records/high-level-designs pool, after validating it against the LIVE emsenn/schema/high-level-design schema through the house schema reader (never a private copy of schema law) and refusing a duplicate id. Use when a module lead's high-level design is ready to be seated as the record a module developer builds an LLD against.
 * @param {string} home - when given, resolves inside this owning settlement
 * @throws {Error} stdin carries one JSON high-level-design record with a kebab-case id
 * @throws {Error} the record conforms to the live emsenn/schema/high-level-design schema, checked through the house schema reader
 * @throws {Error} no high-level-design of this id already seats in the target pool
 *
 * On success, the record is appended through the shared dated-data mechanism
 * (appendDataRecord), never staged with git and never written as Markdown,
 * and the appended record reads back from disk and still conforms to the
 * live schema.
 *
 * This writer is TARGET-OWNED: it does not take a caller's --root and go
 * write wherever that caller says. Its owning settlement is fixed to the
 * settlement THIS script itself is installed in — three directories up from
 * lib/management/skills/, the same node that carries this settlement's own
 * lib/schemas and lib/management/skills/read-a-schema.js — a design that
 * defaults there and only ever writes there, or to a --home a caller names
 * that is lawfully inside it. A --home outside the owning settlement is
 * refused outright: reach that settlement's OWN writer through its OWN
 * membrane instead of asking this one to reach across it.
 *
 * ## Why the house schema reader, not a private copy
 *
 * A record's shape is emsenn/schema/high-level-design AS IT IS ON DISK RIGHT
 * NOW, read by lib/management/skills/read-a-schema.js — the one house
 * validator every script in this pool is meant to share rather than
 * re-implement. This script carries no keyword logic of its own; it shells
 * out to the reader and reports exactly the verdict it returns, both before
 * the append (gating it) and after (revalidating the value actually landed
 * on disk, not just the value this process held in memory).
 *
 * ## Run it
 *
 * ```sh
 * echo '{"id":"…","name":"…","unit":"…","status":"draft","body":"…"}' \
 *   | node .../write-a-high-level-design.js
 *
 * node .../write-a-high-level-design.js --dry-run < record.json
 * node .../write-a-high-level-design.js --home <dir-inside-owning-settlement> < record.json
 * ```
 *
 * Input is JSON. Output is JSON. `--root` and `--from` are the bases a
 * relative `--schema-reader` override and a relative `--home` override (in
 * that order) resolve against; both default to the caller's working
 * directory. `--dry-run` runs every check, including the duplicate refusal,
 * and reports the witness it WOULD have written, without appending anything.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **No stdin, or stdin that is not JSON** — refused.
 * - **No id, or an id that is not kebab-case** — refused. An append-only
 *   pool needs a stable id to refuse a duplicate against.
 * - **A record the live schema rejects** — refused, with every violation.
 * - **An id already seated** — refused, never overwritten. A revision is a
 *   new record citing `supersedes`, never an edit in place.
 * - **A `--home` outside the owning settlement** — refused. Reach belongs
 *   to the settlement that owns the write, not to whoever calls this script.
 * - **A missing house schema reader** — refused. Copying schema law into
 *   this script to work around its absence is exactly the drift the reader
 *   exists to prevent.
 *
 * ## When NOT to use
 *
 * - Not to amend a seated design — data/ pools are write-once; supersede it.
 * - Not to decide whether a design is READY to be seated, or to review it —
 *   that is senior-software-engineer's and the module lead's own work; this
 *   only seats what is handed to it, gated by shape and duplication alone.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { appendDataRecord, findDataRecord } from "./resolve-an-identifier.js";

const HERE = resolvePath(fileURLToPath(new URL(".", import.meta.url)));
// This owning settlement: fixed to where THIS script itself is installed,
// three directories up from lib/management/skills/ — never derived from a
// caller's --root, because a target-owned writer that trusted a caller's
// root would let any caller point its own writes at any settlement's pool.
const OWNER = resolvePath(HERE, "..", "..", "..");

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/u;
const DRY_RUN = process.argv.includes("--dry-run");

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

// child is OWNER itself, or strictly beneath it — never above, never beside.
function isInside(parent, child) {
  if (child === parent) return true;
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

const ROOT = argValue("--root") ?? process.cwd();
const FROM = argValue("--from") ?? process.cwd();

function resolveHome() {
  const given = argValue("--home");
  if (given === undefined) return OWNER;
  const candidate = isAbsolute(given) ? given : resolvePath(FROM, given);
  if (!isInside(OWNER, candidate)) {
    die(`--home '${given}' resolves to ${candidate}, which is outside the owning settlement ${OWNER} — refused; reach that settlement through its own writer instead`);
  }
  return candidate;
}

const HOME = resolveHome();
const POOL_BASE = join(HOME, "data", "records", "high-level-designs");

// Discovery: the house schema reader is this script's own sibling by
// default — the same lib/management/skills/ this writer itself seats in.
// --schema-reader exists solely so a check harness can point discovery at a
// path that is not there, and prove this writer fails closed rather than
// falling back to a copy of schema law it does not carry.
const SCHEMA_READER_ARG = argValue("--schema-reader");
const SCHEMA_READER = SCHEMA_READER_ARG
  ? (isAbsolute(SCHEMA_READER_ARG) ? SCHEMA_READER_ARG : resolvePath(ROOT, SCHEMA_READER_ARG))
  : join(HERE, "read-a-schema.js");
const SCHEMAS = join(OWNER, "lib", "schemas");

function schemaVerdict(record) {
  if (!existsSync(SCHEMA_READER)) {
    die(`⊥ no house schema reader at ${SCHEMA_READER} — refusing to validate a high-level-design without it, and refusing to carry a private copy of schema law in this script`);
  }
  const run = spawnSync(process.execPath, [SCHEMA_READER, "high-level-design", "--pool", SCHEMAS], {
    input: JSON.stringify(record),
    encoding: "utf8",
  });
  let verdict;
  try {
    verdict = JSON.parse(run.stdout);
  } catch {
    die(`house schema reader returned no parseable verdict: ${(run.stderr || run.stdout || "").trim()}`);
  }
  return verdict;
}

function buildRecord(intake) {
  const provenance = { ...(intake["x-provenance"] ?? {}) };
  if (!provenance["recorded-by"]) provenance["recorded-by"] = intake["recorded-by"] ?? "claude";
  if (!provenance["recorded-on"]) provenance["recorded-on"] = new Date().toISOString().slice(0, 10);
  return {
    id: intake.id,
    name: intake.name,
    unit: intake.unit,
    status: intake.status,
    ...(intake.cites !== undefined ? { cites: intake.cites } : {}),
    ...(intake.supersedes !== undefined ? { supersedes: intake.supersedes } : {}),
    body: intake.body,
    "x-provenance": provenance,
  };
}

function work() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) die("no data on stdin — a high-level design is appended from data, never typed into a file or asserted in a conversation");
  let intake;
  try {
    intake = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }

  if (typeof intake.id !== "string" || !ID.test(intake.id)) {
    die(`id '${intake.id}' is missing or not kebab-case — an append-only pool needs a stable id to refuse a duplicate against`);
  }

  const record = buildRecord(intake);

  // The schema is the sole authority on shape. This gate happens before the
  // duplicate check on purpose: a caller should learn its record is
  // malformed even when it also happens to collide with a seated id.
  const verdict = schemaVerdict(record);
  if (!verdict.ok) {
    die(`high-level-design does not conform to the live emsenn/schema/high-level-design: ${(verdict.errors ?? [verdict.error]).join("; ")}`);
  }

  if (findDataRecord(POOL_BASE, "high-level-designs", record.id)) {
    die(`high-level-design '${record.id}' already seats in ${POOL_BASE} — refused, never overwritten; a revision is a new record citing supersedes`);
  }

  const witness = {
    ok: true,
    id: record.id,
    unit: record.unit,
    status: record.status,
    owner: OWNER,
    home: HOME,
    pool: POOL_BASE,
    schema: verdict.schema,
  };
  if (DRY_RUN) out({ ...witness, dryRun: true });

  const written = appendDataRecord(POOL_BASE, "high-level-designs", record);
  const readback = findDataRecord(POOL_BASE, "high-level-designs", record.id);
  if (!readback) {
    die(`appended '${record.id}' to ${written.file} but it does not read back from ${POOL_BASE} — refusing to report success for a write that did not land`);
  }
  const readVerdict = schemaVerdict(readback.record);
  if (!readVerdict.ok) {
    die(`appended '${record.id}' but the value read back from ${written.file} does not conform to the live schema: ${(readVerdict.errors ?? [readVerdict.error]).join("; ")}`);
  }

  out({
    ...witness,
    appended: { file: written.file, date: written.date, line: readback.line },
    readback: { ok: true },
  });
}

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      '  echo \'{"id":"…","name":"…","unit":"…","status":"draft","body":"…"}\' \\',
      "    | node write-a-high-level-design.js",
      "",
      "  node write-a-high-level-design.js --dry-run           # validate and refuse-check, append nothing",
      "  node write-a-high-level-design.js --home <dir>        # target a --home lawfully inside the owning settlement",
      "  node write-a-high-level-design.js --help",
      "",
      "Input is JSON. Output is JSON. Appends once, through the shared dated-data",
      "mechanism, to this settlement's own data/records/high-level-designs pool.",
    ].join("\n") + "\n",
  );
}

if (process.argv.includes("--help")) printUsage();
else work();
