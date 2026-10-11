#!/usr/bin/env node
/**
 * @description Appends one write-once design-review record to this Executive Office's own canonical data/records/design-reviews pool. The record is checked before and after append through the live house schema reader; this writer never imports a private schema copy, emits Markdown, stages Git, or accepts a caller-selected settlement root.
 * @param {string} home - if supplied, is inside this owning settlement
 * @throws {Error} stdin is one JSON design-review record with a kebab-case id
 * @throws {Error} the live emsenn/schema/design-review schema accepts the record
 * @throws {Error} no design-review with that id is already seated in the target pool
 *
 * A non-dry run appends once via appendDataRecord and revalidates the read-back record.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { appendDataRecord, findDataRecord } from "./resolve-an-identifier.js";

const HERE = resolvePath(fileURLToPath(new URL(".", import.meta.url)));
const OWNER = resolvePath(HERE, "..", "..", "..");
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const DRY_RUN = process.argv.includes("--dry-run");

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}
function out(value, status = 0) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  process.exit(status);
}
function refuse(error) { out({ ok: false, error }, 1); }
function inside(parent, child) {
  if (parent === child) return true;
  const remainder = relative(parent, child);
  return remainder !== "" && !remainder.startsWith("..") && !isAbsolute(remainder);
}

const ROOT = argValue("--root") ?? process.cwd();
const FROM = argValue("--from") ?? process.cwd();
function home() {
  const given = argValue("--home");
  if (given === undefined) return OWNER;
  const candidate = isAbsolute(given) ? given : resolvePath(FROM, given);
  if (!inside(OWNER, candidate)) {
    refuse(`--home '${given}' resolves to ${candidate}, outside owning settlement ${OWNER}; use the target settlement's own writer`);
  }
  return candidate;
}

const HOME = home();
const POOL = join(HOME, "data", "records", "design-reviews");
const readerArg = argValue("--schema-reader");
const READER = readerArg
  ? (isAbsolute(readerArg) ? readerArg : resolvePath(ROOT, readerArg))
  : join(HERE, "read-a-schema.js");
const SCHEMAS = join(OWNER, "lib", "schemas");

function validate(record) {
  if (!existsSync(READER)) {
    refuse(`no house schema reader at ${READER}; refusing to validate a design-review with a private copy of schema law`);
  }
  const result = spawnSync(process.execPath, [READER, "design-review", "--pool", SCHEMAS], {
    input: JSON.stringify(record), encoding: "utf8",
  });
  try { return JSON.parse(result.stdout); }
  catch { refuse(`house schema reader returned no parseable verdict: ${(result.stderr || result.stdout || "").trim()}`); }
}

function buildRecord(intake) {
  const provenance = { ...(intake["x-provenance"] ?? {}) };
  if (!provenance["recorded-by"]) provenance["recorded-by"] = intake["recorded-by"] ?? "claude";
  if (!provenance["recorded-on"]) provenance["recorded-on"] = new Date().toISOString().slice(0, 10);
  return {
    id: intake.id,
    name: intake.name,
    reviews: intake.reviews,
    reviewer: intake.reviewer,
    verdict: intake.verdict,
    ...(intake["authorizes-next-step"] === undefined ? {} : { "authorizes-next-step": intake["authorizes-next-step"] }),
    body: intake.body,
    "x-provenance": provenance,
  };
}

function work() {
  const source = readFileSync(0, "utf8").trim();
  if (!source) refuse("no data on stdin — a design review is appended from typed data, never hand-seated as Markdown");
  let intake;
  try { intake = JSON.parse(source); }
  catch (error) { refuse(`stdin is not JSON: ${error.message}`); }
  if (typeof intake.id !== "string" || !ID.test(intake.id)) {
    refuse(`id '${intake.id}' is missing or not kebab-case — a write-once pool needs a stable id`);
  }
  const record = buildRecord(intake);
  const verdict = validate(record);
  if (!verdict.ok) refuse(`design-review does not conform to live emsenn/schema/design-review: ${(verdict.errors ?? [verdict.error]).join("; ")}`);
  if (findDataRecord(POOL, "design-reviews", record.id)) {
    refuse(`design-review '${record.id}' already seats in ${POOL}; refused, never overwritten`);
  }
  const witness = { ok: true, id: record.id, reviewer: record.reviewer, verdict: record.verdict, owner: OWNER, home: HOME, pool: POOL, schema: verdict.schema };
  if (DRY_RUN) out({ ...witness, dryRun: true });
  const written = appendDataRecord(POOL, "design-reviews", record);
  const readback = findDataRecord(POOL, "design-reviews", record.id);
  if (!readback) refuse(`appended '${record.id}' to ${written.file} but it does not read back from ${POOL}`);
  const readVerdict = validate(readback.record);
  if (!readVerdict.ok) refuse(`read-back '${record.id}' from ${written.file} fails live schema: ${(readVerdict.errors ?? [readVerdict.error]).join("; ")}`);
  out({ ...witness, appended: { file: written.file, date: written.date, line: readback.line }, readback: { ok: true } });
}

if (process.argv.includes("--help")) {
  process.stdout.write("Usage: node write-a-design-review.js [--dry-run] [--home <inside-owner>] < review.json\n");
} else work();
