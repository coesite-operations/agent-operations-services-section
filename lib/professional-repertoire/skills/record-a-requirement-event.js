#!/usr/bin/env node
/**
 * @description Writes one requirement-event record — distributed, attested, or closed — the act, never a field on the requirement it is about, per requirement.schema.json's own $comment-absences. Refuses a requirement that seats nowhere, a distributed event with no content snapshot, an attested event whose attester equals its realizer, and a closed event whose raiser is not the requirement's own raised-by. Use to give the requirements-line audit (recalling-a-requirement --audit) real events to correlate instead of an unmechanized "unknown".
 *
 * @throws {Error} Refuses when the intake does not name a requirement that seats in the requirements pool, or does not carry a kind of distributed, attested, or closed.
 * @throws {Error} Refuses when a distributed event carries no snapshot; when an attested event's attester and realizer do not differ; or when a closed event's raiser is not the requirement's own raised-by, or carries no agreed.
 * @throws {Error} Refuses when the record does not conform to emsenn/term/requirement-event, checked by reading-a-schema and never by a second copy of its rules.
 *
 * Once written, an event record exists in the requirement-events pool, one file per event, never amended once written. The event reads back clean against emsenn/term/requirement-event.
 *
 * ## Why an event, not a field
 *
 * requirement.schema.json refuses distributed-by, verified-by, and their kin
 * by name in its own $comment-absences: "who acted is the offices' business
 * and belongs to the acts, not to the artifact they acted on." This script
 * is where those acts live. A requirement record never grows a status field
 * for this; the audit correlates the two pools instead.
 *
 * ## The snapshot, not a timestamp
 *
 * A distributed event does not record when — it records a hash of the
 * requirement's asks and met-when AS THEY STOOD at distribution. A checkout,
 * a rebase, or a clock skew can move a file's mtime without anyone having
 * touched its content; a hash cannot drift that way. The audit recomputes
 * the same hash from the requirement's current content and compares.
 *
 * ## Run it
 *
 * ```sh
 * echo '{"requirement":"<id>","kind":"distributed"}' | node .../record-a-requirement-event.js
 * echo '{"requirement":"<id>","kind":"attested","attester":"<office>","realizer":"<office>"}' \
 *   | node .../record-a-requirement-event.js
 * echo '{"requirement":"<id>","kind":"closed","agreed":true}' | node .../record-a-requirement-event.js
 * ```
 *
 * `id` defaults to `<requirement>-<kind>`; a second event of the same kind
 * for the same requirement needs its own id, given explicitly — this script
 * never overwrites an event, because an event is a fact about what happened
 * and a fact does not get corrected by being replaced.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **A requirement that seats nowhere** — refused. There is nothing to
 *   record an act about.
 * - **`distributed` with no snapshot supplied** — computed here from the
 *   requirement's current content, never left to the caller to assert; a
 *   caller-supplied snapshot could name content the requirement never held.
 * - **`attested` with attester equal to realizer** — refused. A body
 *   attesting its own work is exactly the substitution attesting-a-work-product
 *   exists to prevent, and this script will not record the record of it.
 * - **`closed` with a raiser other than the requirement's own raised-by** —
 *   refused. Closing is the raiser agreeing; anyone else's agreement is not
 *   a closure, whatever else it is.
 *
 * ## When NOT to use
 *
 * - Not for recording that a requirement is met. Achievement is derived by
 *   re-running met-when (recall-a-requirement.js), never asserted by an
 *   event.
 * - Not for the requirement record itself — that is writing-a-requirement.
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { appendDataRecord, dataDir, findDataRecord, findUnit, readDataPool } from "./resolve-an-identifier.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = argValue("--root") ?? process.cwd();
const UNIT = findUnit(HERE);
if (!UNIT) throw new Error("record-a-requirement-event: cannot resolve the owning unit");
// Requirements and their events are write-once — a requirement is raised
// once and its lifecycle is a log of events, never a mutated field — so
// per the Chairperson's content/data/lib rule both seat as data/. Glossary
// terms stand and are amended in place, so they stay content/.
const REQUIREMENTS_POOL_OVERRIDE = argValue("--requirements-pool");
const EVENTS_POOL = argValue("--pool") ?? dataDir(UNIT, "requirement-events");
const TERMS_POOL = argValue("--terms") ?? join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/glossary/terms");

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

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

function findUp(from, shape) {
  let d = from;
  for (;;) {
    const at = join(d, shape);
    if (existsSync(at)) return at;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

// The content a distributed snapshot is a hash of — asks and met-when,
// exactly the two fields requirement.schema.json says an accepted change
// must never edit in place. Deterministic: same requirement content, same
// hash, from any machine.
export function snapshotOf(spec) {
  const canonical = JSON.stringify({ asks: spec.asks, "met-when": spec["met-when"] });
  return createHash("sha256").update(canonical).digest("hex");
}

function violations(record) {
  const beside = join(HERE, "read-a-schema.js");
  const reader = existsSync(beside) ? beside : findUp(HERE, "lib/management/skills/read-a-schema.js");
  if (!reader) die("⊥ cannot find reading-a-schema — the one validator. No event is written unchecked.");
  const r = spawnSync(process.execPath, [reader, "requirement-event", "--pool", TERMS_POOL], {
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

function record() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) die("no data on stdin — an event is recorded from data, never from a conversation");
  let intake;
  try {
    intake = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }

  for (const key of ["requirement", "kind"]) {
    if (intake[key] === undefined) die(`intake has no '${key}'`);
  }
  if (!ID.test(String(intake.requirement))) die(`requirement '${intake.requirement}' is not kebab-case`);
  if (!["distributed", "attested", "closed"].includes(intake.kind)) {
    die(`kind '${intake.kind}' is not one of distributed, attested, closed`);
  }

  // --requirements-pool still wins outright when given, as a literal
  // override base directory; absent it, the default requirements data pool.
  const REQUIREMENTS_POOL = REQUIREMENTS_POOL_OVERRIDE ?? dataDir(UNIT, "requirements");
  const reqFound = findDataRecord(REQUIREMENTS_POOL, "requirements", intake.requirement);
  if (!reqFound) {
    die(`requirement '${intake.requirement}' seats nowhere in ${relative(REPO_ROOT, REQUIREMENTS_POOL)} — there is nothing to record an act about`);
  }
  const spec = reqFound.record;

  if (intake.kind === "attested") {
    if (!intake.attester || !intake.realizer) die("kind 'attested' needs both attester and realizer");
    if (intake.attester === intake.realizer) {
      die(`attester and realizer are both '${intake.attester}' — a body attesting its own work is the exact substitution this refuses`);
    }
  }
  if (intake.kind === "closed") {
    const raiser = intake.raiser ?? spec["raised-by"];
    if (raiser !== spec["raised-by"]) {
      die(`raiser '${raiser}' is not requirement '${intake.requirement}'s own raised-by ('${spec["raised-by"]}') — closing is the raiser agreeing, and anyone else's agreement is not a closure`);
    }
    if (intake.agreed === undefined) die("kind 'closed' needs 'agreed'");
  }

  const id = intake.id ?? `${intake.requirement}-${intake.kind}`;
  if (!ID.test(id)) die(`id '${id}' is not kebab-case`);
  // requirement-events carry no id field of their own — the schema names
  // them by requirement+kind. The same computed id still guards against a
  // duplicate act (e.g. two "distributed" events for one requirement),
  // scanned across every seated event rather than checked as one file's
  // existence.
  const already = readDataPool(EVENTS_POOL, "requirement-events")
    .some(({ record: r }) => (r.id ?? `${r.requirement}-${r.kind}`) === id);
  if (already) die(`event '${id}' already seats in ${relative(REPO_ROOT, EVENTS_POOL)} — refused, never overwritten; an event is a fact about what happened, not a field to correct`);

  const eventRecord = {
    requirement: intake.requirement,
    kind: intake.kind,
    ...(intake.kind === "distributed" ? { snapshot: snapshotOf(spec) } : {}),
    ...(intake.kind === "attested" ? { attester: intake.attester, realizer: intake.realizer } : {}),
    ...(intake.kind === "closed" ? { raiser: spec["raised-by"], agreed: Boolean(intake.agreed) } : {}),
    "recorded-by": intake["recorded-by"] ?? "claude",
    "recorded-on": new Date().toISOString().slice(0, 10),
  };

  const errs = violations(eventRecord);
  if (errs.length) die(`event does not conform to emsenn/term/requirement-event: ${errs.join("; ")}`);

  appendDataRecord(EVENTS_POOL, "requirement-events", eventRecord);

  out({ ok: true, recorded: { id, pool: relative(REPO_ROOT, EVENTS_POOL), requirement: intake.requirement, kind: intake.kind } });
}

// Run as main only — recalling-a-requirement's audit imports snapshotOf from
// this module to recompute a distributed event's hash, and an import must
// not read stdin and exit out from under its importer.
if (import.meta.url === `file://${process.argv[1]}`) record();
