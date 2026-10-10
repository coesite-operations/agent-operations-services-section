#!/usr/bin/env node
/** Independently checks the target-owned write-a-design-review circuit. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolvePath(fileURLToPath(new URL(".", import.meta.url)));
const OWNER = resolvePath(HERE, "..", "..", "..");
const WRITER = join(HERE, "write-a-design-review.js");
const SELF = join(HERE, "check-design-review-writer.js");
const REAL_POOL = join(OWNER, "data", "records", "design-reviews");
const REAL_SCHEMAS = join(OWNER, "lib", "schemas");
const checks = [];
function check(name, ok, detail) { checks.push({ name, ok, detail }); }
function treeHash(root) {
  const snapshot = {};
  if (!existsSync(root)) return snapshot;
  (function walk(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile()) snapshot[relative(OWNER, path)] = createHash("sha256").update(readFileSync(path)).digest("hex");
  } })(root);
  return snapshot;
}
function same(a, b) { return JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort()); }
function run(args, input = "") {
  const result = spawnSync(process.execPath, [WRITER, ...args], { input, encoding: "utf8" });
  let parsed; try { parsed = JSON.parse(result.stdout); } catch { parsed = null; }
  return { ...result, parsed };
}
function record(id, overrides = {}) { return {
  id, name: `Design review writer check ${id}`, reviews: "check-reviewed-design", reviewer: "independent-checker", verdict: "PASS", body: "Ephemeral fixture record for independently checking the target-owned writer.", ...overrides,
}; }
function fixtureRecords(home) {
  const pool = join(home, "data", "records", "design-reviews"); const records = [];
  if (!existsSync(pool)) return records;
  (function walk(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (statSync(path).isDirectory()) walk(path);
    else if (entry.isFile() && entry.name.endsWith("-design-reviews.jsonl")) for (const line of readFileSync(path, "utf8").split("\n")) if (line.trim()) records.push(JSON.parse(line));
  } })(pool); return records;
}

const beforePool = treeHash(REAL_POOL);
const beforeSchemas = treeHash(REAL_SCHEMAS);
const fixture = join(OWNER, `.check-design-review-writer-${process.pid}-${Date.now()}`);
let fatal;
try {
  for (const file of [WRITER, SELF]) {
    const syntax = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    check(`syntax: ${relative(HERE, file)}`, syntax.status === 0, syntax.stderr.trim() || "parses cleanly");
  }
  const dry = run(["--home", fixture, "--dry-run"], JSON.stringify(record("check-design-review-dry-run")));
  check("dry-run succeeds", dry.status === 0 && dry.parsed?.ok && dry.parsed?.dryRun, dry.parsed ?? dry.stdout);
  check("dry-run causes no fixture mutation", !existsSync(fixture), { fixture, exists: existsSync(fixture) });
  const id = "check-design-review-append";
  const append = run(["--home", fixture], JSON.stringify(record(id, { "authorizes-next-step": true })));
  check("append returns target-owned fixture witness", append.status === 0 && append.parsed?.ok && append.parsed?.home === fixture && append.parsed?.appended?.line === 1, append.parsed ?? append.stdout);
  const landed = fixtureRecords(fixture).find((entry) => entry.id === id);
  check("append lands one typed record", Boolean(landed && landed.reviews && landed.reviewer && landed.verdict && landed.body), landed ?? null);
  const reader = join(HERE, "read-a-schema.js");
  const schemaRun = landed && spawnSync(process.execPath, [reader, "design-review", "--pool", REAL_SCHEMAS], { input: JSON.stringify(landed), encoding: "utf8" });
  let schema; try { schema = JSON.parse(schemaRun?.stdout ?? ""); } catch { schema = null; }
  check("read-back independently conforms to live schema", schema?.ok === true, schema ?? schemaRun?.stdout ?? "no record");
  const count = fixtureRecords(fixture).length;
  const duplicate = run(["--home", fixture], JSON.stringify(record(id)));
  check("duplicate refuses without another append", duplicate.status !== 0 && duplicate.parsed?.ok === false && fixtureRecords(fixture).length === count, duplicate.parsed ?? duplicate.stdout);
  const malformed = run(["--home", fixture], "{not-json");
  check("malformed JSON refuses", malformed.status !== 0 && malformed.parsed?.ok === false, malformed.parsed ?? malformed.stdout);
  const invalid = run(["--home", fixture], JSON.stringify(record("check-design-review-invalid", { body: undefined })));
  check("schema-invalid input refuses", invalid.status !== 0 && invalid.parsed?.ok === false && !fixtureRecords(fixture).some((entry) => entry.id === "check-design-review-invalid"), invalid.parsed ?? invalid.stdout);
  const missing = run(["--home", fixture, "--schema-reader", join(fixture, "missing-reader.js")], JSON.stringify(record("check-design-review-missing-reader")));
  check("missing reader refuses without append", missing.status !== 0 && missing.parsed?.ok === false && /schema reader/i.test(missing.parsed?.error ?? "") && fixtureRecords(fixture).length === count, missing.parsed ?? missing.stdout);
  const outside = run(["--home", "/tmp"], JSON.stringify(record("check-design-review-outside")));
  check("outside-home refuses", outside.status !== 0 && outside.parsed?.ok === false, outside.parsed ?? outside.stdout);
} catch (error) { fatal = String(error?.stack ?? error); }
finally { if (existsSync(fixture)) rmSync(fixture, { recursive: true, force: true }); check("fixture cleanup", !existsSync(fixture), { fixture }); }
check("real design-review pool unchanged", same(beforePool, treeHash(REAL_POOL)), { before: Object.keys(beforePool).length, after: Object.keys(treeHash(REAL_POOL)).length });
check("real schema pool unchanged", same(beforeSchemas, treeHash(REAL_SCHEMAS)), { before: Object.keys(beforeSchemas).length, after: Object.keys(treeHash(REAL_SCHEMAS)).length });
if (fatal) check("no fatal checker error", false, fatal);
const ok = checks.every((entry) => entry.ok);
process.stdout.write(`${JSON.stringify({ ok, fixture, checks }, null, 2)}\n`);
process.exit(ok ? 0 : 1);
