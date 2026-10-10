#!/usr/bin/env node
/**
 * @description Puts on the record that some Y outside the reporting office's own lane is flawed — noticed while that office was doing X, stated so a stranger can re-observe it, and left for Analyze to judge rather than fixed, ignored, or routed by the reporter itself. Refuses no stdin, an observed-by that seats in no offices pool, an id already seated, and an `at` that names a path that does not exist when it is path-shaped. Use the moment an office notices a flaw outside its jurisdiction while working on something else; this is the Monitor sensor of the firm's Huidu MAPE-K loop, never the fix and never the routing.
 *
 * @throws {Error} Refuses when stdin does not hold JSON naming id, name, observed-by, while, observed, and at.
 * @throws {Error} Refuses when observed-by does not resolve to an office seated in an offices pool found by walking up from --from or the working directory.
 * @throws {Error} Refuses when an anomaly of this id is already seated in the anomalies pool.
 * @throws {Error} Refuses when at is path-shaped and the path it names does not exist.
 *
 * Once written, an anomaly record exists that conforms to emsenn/schema/anomaly, and the anomaly's id equals its own basename in the pool.
 *
 * The andon cord, on a record. A line worker who sees a defect at a neighbouring
 * station pulls the cord and says what they saw — they do not leave their own
 * station to fix it, and they do not decide whose problem it is beyond a guess.
 * This script is that cord: any office, on noticing while doing X that some Y
 * outside its lane is wrong, reports it here instead of fixing it (which is
 * someone else's design to own), ignoring it (which is how known defects
 * accumulate unrecorded), or letting it derail X (which is how the office that
 * noticed stops doing the work it was asked to do).
 *
 * ## What this is not
 *
 * This is the Monitor sensor in the firm's Huidu MAPE-K loop
 * (Kephart & Chess, 'The Vision of Autonomic Computing', 2003):
 * `content/anomalies/` is the symptom feed, and the pool it accumulates in is
 * the loop's Knowledge. It is deliberately silent on everything downstream:
 *
 *   - No severity. Judging how bad it is is Analyze's work, done with more
 *     context than the reporter had in passing.
 *   - No disposition or status. What becomes of an anomaly is the fact of a
 *     task later raised against it (making-a-task) — read that, never this.
 *   - No routing. `lane` is a belief the reporter may offer, never an
 *     instruction; the office that actually dispatches the resulting task
 *     decides where it goes.
 *
 * A reporter who wrote any of those would be marking its own homework, or
 * fixing the neighbouring station from its own — the exact failure andon's
 * separation of noticing from fixing exists to prevent.
 *
 * ## Run it
 *
 * ```sh
 * echo '{"id":"…","observed-by":"<office-id>","while":"<task-id or plain sentence>",
 *        "name":"…","observed":"…","at":"…","lane":"<office-id>"}' \
 *   | node .../report-an-anomaly.js
 *
 * node .../report-an-anomaly.js --list
 * node .../report-an-anomaly.js --check
 * ```
 *
 * Input is JSON. Output is JSON. `--from` (default: the caller's working
 * directory) is where resolution starts; `--pool` names the anomalies pool
 * directly and wins outright.
 *
 * ## Resolution
 *
 * There is no fixed default path, because this script has to work from
 * whichever unit's own records it is reporting into. The unit boundary and
 * the `observed-by` office's seat are both resolved by the shared law in
 * resolve-an-identifier.js (its NEAREST strategy): walk UP from `--from` (or
 * its cwd default) to the nearest ancestor carrying `content/` or
 * `lib/management/`, retrying once from this script's own file location if
 * nothing is found — so a bare invocation run from above every unit, such as
 * the repository root, still finds the pool this script is seated beside.
 * The directory that answers is the unit; its `content/anomalies` (or
 * `--pool`, which overrides outright) is where the anomaly is written,
 * created on first write.
 *
 * ## What it refuses, and why that is the skill
 *
 * Filing a JSON blob is trivial. What makes it an anomaly report rather than
 * a note to nobody:
 *
 * - **No stdin** — refused. An anomaly is reported from data, never typed
 *   into a file or asserted in a conversation.
 * - **`observed-by` that seats in no offices pool** — refused. An anomaly
 *   observed by nobody is a note; the andon cord has to be pulled by an
 *   actual station.
 * - **An id already seated** — refused, never overwritten. Amending a
 *   symptom after the fact is not what a sensor reading is for.
 * - **An `at` that names a path that does not exist**, when it is
 *   path-shaped (contains a `.` or starts with `/`, `./`, or `../`) — refused.
 *   A record address (`emsenn/schema/office`) is not checked for existence
 *   this way; only something that reads as a filesystem path is held to one.
 *
 * ## When NOT to use
 *
 * - Not to fix the flaw. Noticing and fixing are different acts; fix it
 *   through whatever instrument governs Y, not this one.
 * - Not to decide who owns it. `lane` is a guess, not a dispatch; routing
 *   belongs to whichever office dispatches the task raised against this.
 * - Not to record that an anomaly has been handled. There is no field for
 *   that here — raise a task against it (making-a-task) and let that task's
 *   goal be what settles it.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendDataRecord, dataDir, findDataRecord, findUnit as resolveFindUnit, readDataPool, resolveIdentifier } from "./resolve-an-identifier.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FROM = argValue("--from") ?? process.cwd();
const POOL_OVERRIDE = argValue("--pool");
const OFFICES_OVERRIDE = argValue("--offices");
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

// ── resolution ─────────────────────────────────────────────────────────────
// The unit boundary now comes from the ONE shared resolution law
// (resolve-an-identifier.js's findUnit): nearest ancestor carrying content/
// or lib/management/, walked UP from the asking point, retrying once from
// this script's own file location if nothing is found — the identical rule
// write-an-office.js and raise-an-idea.js already use.
//
// This replaces a hand-rolled walk that additionally required content/offices
// to hold at least one record before accepting it as "modern" before falling
// back to a legacy pool further up. That refinement is dropped here, not
// hidden: it never once changes which unit is chosen for any unit presently
// seated in this tree, since every unit that carries content/ also carries a
// populated content/offices — and keeping a second, subtly stricter walk
// beside the shared one is exactly the kind of drift
// office-resolution-disagrees-across-instruments exists to end.
const UNIT_ROOT = resolveFindUnit(FROM) ?? resolveFindUnit(HERE);

// An office seats where the shared law's NEAREST strategy finds it — the
// same seat-forms list dispatch-a-task.js's officeSeats and
// list-open-obligations.js's officeSeats also try, now written once.
function officeSeats(id) {
  if (OFFICES_OVERRIDE) {
    const p = join(OFFICES_OVERRIDE, `${id}.json`);
    return existsSync(p) ? [p] : [];
  }
  if (!UNIT_ROOT) return [];
  const hit = resolveIdentifier(id, { kind: "offices", strategy: "nearest", from: UNIT_ROOT });
  return hit.ok ? hit.seats : [];
}

// Anomalies are a sensor reading, write-once, so per the Chairperson's
// content/data/lib rule they seat as data/, a day-bucketed log.
function anomalyPool() {
  if (POOL_OVERRIDE) return POOL_OVERRIDE;
  if (!UNIT_ROOT) return null;
  return dataDir(UNIT_ROOT, "anomalies");
}

const ANOMALY_POOL = anomalyPool();

// ⊥ — no unit at or above the asking point carries content/, data/, or
// lib/management/ at all. An absence, not an empty pool: nothing was found
// to search, rather than searched and found empty.
if (!ANOMALY_POOL) {
  die(`⊥ no unit at or above ${FROM} (or ${HERE}) — nothing carries content/ or lib/management/, so no anomaly pool can be located either. Pass --pool and --offices to name both directly.`);
}

function seatedAnomalies() {
  return readDataPool(ANOMALY_POOL, "anomalies").map((r) => r.record);
}

// The record shape is the schema pool's, checked through READING-A-SCHEMA —
// the one validator, called and never copied, so this script cannot drift
// from the contract the pool actually enforces.
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
  if (!reader) die("⊥ cannot find reading-a-schema — the one validator. No anomaly is reported against an unchecked record.");
  const r = spawnSync(process.execPath, [reader, "anomaly", "--from", FROM], {
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

// A path-shaped `at`: contains a `.` (an extension), or opens with `/`, `./`,
// or `../`. A record address (emsenn/schema/office) has none of these and is
// never held to existsSync — only something that reads as a filesystem path
// is held to one.
function pathShaped(at) {
  return /\./u.test(at) || at.startsWith("/") || at.startsWith("./") || at.startsWith("../");
}

function report() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) die("no data on stdin — an anomaly is reported from data, never typed into a file or asserted in a conversation");
  let intake;
  try {
    intake = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }

  for (const key of ["id", "name", "observed-by", "while", "observed", "at"]) {
    if (intake[key] === undefined) die(`anomaly has no '${key}'`);
  }
  if (!ID.test(String(intake.id))) die(`id '${intake.id}' is not kebab-case`);
  if (!ID.test(String(intake["observed-by"]))) die(`observed-by '${intake["observed-by"]}' is not kebab-case`);
  if (intake.lane !== undefined && !ID.test(String(intake.lane))) die(`lane '${intake.lane}' is not kebab-case`);

  // The id must not already seat. An anomaly is a sensor reading, not a
  // record amended after the fact.
  if (findDataRecord(ANOMALY_POOL, "anomalies", String(intake.id))) {
    die(`anomaly '${intake.id}' already seats in ${relative(FROM, ANOMALY_POOL)} — refused, never overwritten`);
  }

  // observed-by must resolve to an actual station. An anomaly observed by
  // nobody is a note, not a report — andon's cord has to be pulled by
  // somebody standing at it.
  const seats = officeSeats(String(intake["observed-by"]));
  if (seats.length === 0) {
    const where = UNIT_ROOT ? relative(FROM, UNIT_ROOT) : "(no offices pool found)";
    die(`observed-by '${intake["observed-by"]}' seats in no offices pool (looked in ${where}) — an anomaly observed by nobody is a note, not a report`);
  }

  // A path-shaped `at` must exist. A record address is not held to this —
  // only something that reads as a filesystem path is.
  if (pathShaped(String(intake.at))) {
    const at = String(intake.at);
    const resolved = at.startsWith("/") ? at : resolve(FROM, at);
    if (!existsSync(resolved)) {
      die(`at '${at}' reads as a path and does not exist (looked at ${resolved}) — an anomaly a stranger cannot re-observe is not yet a report`);
    }
  }

  const record = {
    id: intake.id,
    name: intake.name,
    "observed-by": intake["observed-by"],
    while: intake.while,
    observed: intake.observed,
    at: intake.at,
    ...(intake.lane !== undefined ? { lane: intake.lane } : {}),
    "x-provenance": {
      "recorded-by": intake["recorded-by"] ?? "claude",
      "recorded-on": new Date().toISOString().slice(0, 10),
    },
  };

  const errs = violations(record);
  if (errs.length) die(`anomaly does not conform to emsenn/schema/anomaly: ${errs.join("; ")}`);

  const witness = {
    ok: true,
    reported: {
      id: intake.id,
      pool: relative(FROM, ANOMALY_POOL),
      "observed-by": intake["observed-by"],
      "office-record": relative(FROM, seats[0]),
      at: intake.at,
    },
  };
  if (DRY_RUN) out({ ...witness, dryRun: true });

  appendDataRecord(ANOMALY_POOL, "anomalies", record);
  out(witness);
}

function list() {
  out({
    ok: true,
    anomalies: seatedAnomalies().map((a) => ({ id: a.id, name: a.name, "observed-by": a["observed-by"], at: a.at, lane: a.lane })),
  });
}

// The honest-sweep rule every checking sibling in this pool follows
// (write-a-schema.js --check, normalizing-a-units-management-records): an
// empty sweep is refused as a clean sweep, because a pool nobody has ever
// written into and a pool proven free of nonconformance read identically
// unless the emptiness itself is called out.
function check() {
  const records = seatedAnomalies();
  if (records.length === 0) {
    die(`the pool at ${relative(FROM, ANOMALY_POOL)} holds no anomalies — an empty sweep is a broken sweep, not a clean one`);
  }
  const results = [];
  let ok = true;
  for (const record of records) {
    const errs = violations(record);
    if (errs.length) {
      ok = false;
      results.push({ id: record.id, errors: errs });
    } else {
      results.push({ id: record.id, ok: true });
    }
  }
  out({ ok, checked: records.length, results }, ok ? 0 : 1);
}

if (process.argv.includes("--list")) list();
else if (process.argv.includes("--check")) check();
else report();
