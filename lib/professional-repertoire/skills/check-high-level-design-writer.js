#!/usr/bin/env node
/**
 * @description Independently exercises write-a-high-level-design.js against safe, self-cleaning fixtures seated inside the owning settlement (never against the real data/records/high-level-designs pool) and proves: dry-run mutates nothing; a valid record appends, reads back, and conforms; a duplicate id refuses; malformed JSON refuses; a schema-invalid record refuses; an explicit --home inside the fixture is honored; a missing house schema reader fails closed; both writer files are syntactically valid JavaScript; and nothing outside the fixture moved. Use to prove the writer works without trusting its own report of itself.
 *
 * Assumes:
 * - write-a-high-level-design.js seats beside this script
 * - the owning settlement (three directories up from here) is writable, so a fixture can be seated and removed inside it
 *
 * Every fixture this run created is removed, pass or fail. No file outside
 * the fixture directory this run created changed.
 *
 * This is the WITNESS's instrument, not the writer's: it never imports the
 * writer's own functions and never trusts the writer's stdout at face value
 * for anything a check can instead confirm by reading the fixture's files
 * directly off disk. Exits 0 only when every check passed.
 *
 * ## Run it
 *
 * ```sh
 * node .../check-high-level-design-writer.js
 * ```
 *
 * Output is JSON: { ok, checks: [...], fixture }. Exits 1 on any failed
 * check, or if a fixture could not be cleaned up.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolvePath(fileURLToPath(new URL(".", import.meta.url)));
const OWNER = resolvePath(HERE, "..", "..", "..");
const WRITER = join(HERE, "write-a-high-level-design.js");
const CHECKER_SELF = join(HERE, "check-high-level-design-writer.js");
const REAL_POOL = join(OWNER, "data", "records", "high-level-designs");
const REAL_SCHEMAS = join(OWNER, "lib", "schemas");

const checks = [];
function record(name, ok, detail) {
  checks.push({ name, ok, detail });
  return ok;
}

// A bounded, content-hashed snapshot of a directory tree, so "nothing else
// moved" is proven rather than assumed. Both trees this is called on
// (the real high-level-designs pool, the real schema pool) sit outside the
// fixture directory entirely, so there is nothing here that needs skipping.
function hashTree(dir) {
  const out = {};
  if (!existsSync(dir)) return out;
  (function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile()) {
        out[relative(OWNER, p)] = createHash("sha256").update(readFileSync(p)).digest("hex");
      }
    }
  })(dir);
  return out;
}

function sameTree(a, b) {
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) {
    if (ak[i] !== bk[i]) return false;
    if (a[ak[i]] !== b[bk[i]]) return false;
  }
  return true;
}

function runWriter(args, stdin) {
  const proc = spawnSync(process.execPath, [WRITER, ...args], {
    input: stdin ?? "",
    encoding: "utf8",
  });
  let parsed = null;
  try {
    parsed = JSON.parse(proc.stdout);
  } catch {
    // left null — some refusals (e.g. no stdin at all) may not reach a
    // JSON.stringify call; callers check status + raw output too.
  }
  return { status: proc.status, stdout: proc.stdout, stderr: proc.stderr, parsed };
}

function fixtureRecord(id, overrides = {}) {
  return {
    id,
    name: `Check high-level-design writer fixture ${id}`,
    unit: "check-high-level-design-writer-fixture",
    status: "draft",
    body: "Fixture body written solely to exercise write-a-high-level-design.js from its own independent checker. Not a real design.",
    ...overrides,
  };
}

function readFixtureLines(fixtureHome) {
  const pool = join(fixtureHome, "data", "records", "high-level-designs");
  const lines = [];
  if (!existsSync(pool)) return lines;
  (function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (statSync(p).isDirectory()) walk(p);
      else if (entry.isFile() && entry.name.endsWith("-high-level-designs.jsonl")) {
        for (const line of readFileSync(p, "utf8").split("\n")) {
          if (line.trim()) lines.push(JSON.parse(line));
        }
      }
    }
  })(pool);
  return lines;
}

function main() {
  // ── syntax: node --check parses without executing either file ───────────
  for (const file of [WRITER, CHECKER_SELF]) {
    const res = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    record(`valid JavaScript syntax: ${relative(HERE, file) || relative(OWNER, file)}`, res.status === 0, res.stderr.trim() || "parses cleanly");
  }

  const beforeRealPool = hashTree(REAL_POOL);
  const beforeSchemas = hashTree(REAL_SCHEMAS);

  const stamp = `${process.pid}-${Date.now()}`;
  const FIXTURE = join(OWNER, `.check-hld-writer-fixture-${stamp}`);
  if (existsSync(FIXTURE)) {
    console.error(JSON.stringify({ ok: false, error: `fixture ${FIXTURE} already exists — refusing to reuse it` }));
    process.exit(1);
  }

  let fatal = null;
  try {
    // ── dry-run causes no mutation ─────────────────────────────────────────
    const dryId = "check-fixture-dry-run";
    const dry = runWriter(["--home", FIXTURE, "--dry-run"], JSON.stringify(fixtureRecord(dryId)));
    record(
      "dry-run: exits ok with dryRun:true",
      dry.status === 0 && dry.parsed?.ok === true && dry.parsed?.dryRun === true,
      dry.parsed ?? dry.stdout,
    );
    record("dry-run: creates nothing on disk", !existsSync(FIXTURE), { fixture: FIXTURE, exists: existsSync(FIXTURE) });

    // ── explicit --home inside the fixture, append, readback, schema
    //    conformance all succeed together ─────────────────────────────────
    const appendId = "check-fixture-append";
    const append = runWriter(["--home", FIXTURE], JSON.stringify(fixtureRecord(appendId)));
    record(
      "append: exits ok and echoes the fixture --home",
      append.status === 0 && append.parsed?.ok === true && append.parsed?.home === FIXTURE,
      append.parsed ?? append.stdout,
    );
    const linesAfterAppend = readFixtureLines(FIXTURE);
    const landed = linesAfterAppend.find((r) => r.id === appendId);
    record(
      "append: record actually lands in the fixture pool on disk",
      Boolean(landed && landed.name && landed.unit && landed.status && landed.body),
      { found: Boolean(landed), record: landed ?? null },
    );

    // Independently re-validate the landed record against the REAL live
    // schema, without going through the writer's own reader invocation.
    if (landed) {
      const reader = join(HERE, "read-a-schema.js");
      const verdict = spawnSync(process.execPath, [reader, "high-level-design", "--pool", REAL_SCHEMAS], {
        input: JSON.stringify(landed),
        encoding: "utf8",
      });
      let parsedVerdict = null;
      try { parsedVerdict = JSON.parse(verdict.stdout); } catch { /* handled by ok check below */ }
      record("append: landed record independently conforms to the live schema", Boolean(parsedVerdict?.ok), parsedVerdict ?? verdict.stdout);
    } else {
      record("append: landed record independently conforms to the live schema", false, "no landed record to check");
    }

    // ── duplicate input refuses ──────────────────────────────────────────
    const dup = runWriter(["--home", FIXTURE], JSON.stringify(fixtureRecord(appendId)));
    record(
      "duplicate: refused, and the pool line count does not grow",
      dup.status !== 0 && dup.parsed?.ok === false && readFixtureLines(FIXTURE).length === linesAfterAppend.length,
      dup.parsed ?? dup.stdout,
    );

    // ── malformed JSON refuses ───────────────────────────────────────────
    const malformed = runWriter(["--home", FIXTURE], "{not json");
    record("malformed JSON: refused", malformed.status !== 0 && malformed.parsed?.ok === false, malformed.parsed ?? malformed.stdout);

    // ── schema-invalid record refuses (required 'body' omitted) ─────────
    const invalidRecord = fixtureRecord("check-fixture-invalid");
    delete invalidRecord.body;
    const invalid = runWriter(["--home", FIXTURE], JSON.stringify(invalidRecord));
    record(
      "schema-invalid record: refused",
      invalid.status !== 0 && invalid.parsed?.ok === false && !readFixtureLines(FIXTURE).some((r) => r.id === "check-fixture-invalid"),
      invalid.parsed ?? invalid.stdout,
    );

    // ── a missing schema reader fails closed, before any append ─────────
    const linesBeforeMissingReader = readFixtureLines(FIXTURE).length;
    const missingReaderPath = join(FIXTURE, "no-such-schema-reader.js");
    const missingReader = runWriter(
      ["--home", FIXTURE, "--schema-reader", missingReaderPath],
      JSON.stringify(fixtureRecord("check-fixture-missing-reader")),
    );
    record(
      "missing schema reader: fails closed, appends nothing",
      missingReader.status !== 0
        && missingReader.parsed?.ok === false
        && /schema reader/i.test(missingReader.parsed?.error ?? "")
        && readFixtureLines(FIXTURE).length === linesBeforeMissingReader,
      missingReader.parsed ?? missingReader.stdout,
    );

    // ── a --home outside the owning settlement is refused ───────────────
    const outside = runWriter(["--home", "/tmp"], JSON.stringify(fixtureRecord("check-fixture-outside")));
    record(
      "--home outside the owning settlement: refused",
      outside.status !== 0 && outside.parsed?.ok === false,
      outside.parsed ?? outside.stdout,
    );
  } catch (error) {
    fatal = String(error?.stack ?? error);
  } finally {
    if (existsSync(FIXTURE)) rmSync(FIXTURE, { recursive: true, force: true });
    record("fixture cleanup: fixture directory no longer exists", !existsSync(FIXTURE), { fixture: FIXTURE });
  }

  // ── no mutation outside the fixture: the real pool and the real schema
  //    pool hash identically before and after every check above ──────────
  const afterRealPool = hashTree(REAL_POOL);
  const afterSchemas = hashTree(REAL_SCHEMAS);
  record("no mutation outside the fixture: real high-level-designs pool unchanged", sameTree(beforeRealPool, afterRealPool), {
    before: Object.keys(beforeRealPool).length,
    after: Object.keys(afterRealPool).length,
  });
  record("no mutation outside the fixture: real schema pool unchanged", sameTree(beforeSchemas, afterSchemas), {
    before: Object.keys(beforeSchemas).length,
    after: Object.keys(afterSchemas).length,
  });

  if (fatal) record("fatal error during checks", false, fatal);

  const ok = checks.every((c) => c.ok);
  process.stdout.write(JSON.stringify({ ok, fixture: FIXTURE, checks }, null, 2) + "\n");
  process.exit(ok ? 0 : 1);
}

main();
