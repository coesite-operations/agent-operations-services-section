#!/usr/bin/env node
/**
 * @skill recalling-a-requirement
 * @verb-phrase recalling a requirement
 * @closure-kind derivation
 * @description Reads a requirement and derives whether it is met by re-running its own conditions, never by reading a status; and with --audit, settles the cells the requirements duties discharge against, reporting a cell it cannot settle as unknown rather than guessing it. Use to answer whether a requirement is met, to see what a requirement asked before the work rewrote the memory of it, and to read how far the requirements duties are from discharged.
 *
 * @precondition the requirement resolves by slug, or --audit is reading the whole pool
 * @precondition every condition read carries a command, so it can be re-run rather than believed
 * @postcondition whether a requirement is met is derived by re-running its conditions at read time
 * @postcondition no cell is reported settled unless a command settled it during this run
 * @postcondition a cell that cannot be settled is reported unknown with the reason, and never as held
 * @witness each condition re-run, its expected exit code, its actual exit code, and whether it settled
 * @witness the derived state of the requirement and the gap of conditions that did not settle
 * @witness on --audit, every cell, its settlement, and for an unknown cell what is missing to settle it
 *
 * This is the READ half, and the deterministic inverse of writing-a-requirement.
 *
 * The rule it exists to hold: whether a requirement is met is a READOUT, never
 * a field. Nothing writes "met: true", because a record that can assert its own
 * success is indistinguishable from a record of actual success, and the whole
 * apparatus is here because those two came apart.
 *
 * --audit is deliberately honest about its own reach. Three cells —
 * distribution-editing, attestation-by-a-different-body, and closure-with-
 * the-raiser — are correlated against the requirement-events pool
 * (record-a-requirement-event.js, emsenn/term/requirement-event), never
 * against a field on the requirement itself: requirement.schema.json's own
 * $comment-absences refuses distributed-by, verified-by and their kin by
 * name, because who acted is the offices' business and belongs to the acts,
 * not to the artifact they acted on. A cell with no event to correlate
 * against is HELD, not unknown — the same vacuous-truth rule an empty
 * requirements pool already gets, applied to an empty slice of it. Where no
 * mechanism at all exists to settle a cell, it still comes back unknown,
 * with what is missing, and never held — that substitution is the one this
 * apparatus exists against.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dataDir, findDataRecord, findUnit, readDataPool } from "../../resolve-an-identifier.js";

const REPO_ROOT = argValue("--root") ?? "/home/emsenn/info";
const UNIT = findUnit(dirname(fileURLToPath(import.meta.url)));
if (!UNIT) throw new Error("recall-a-requirement: cannot resolve the owning unit");
// Requirements and their events are write-once/append-only data/ pools per
// the Chairperson's content/data/lib rule. A requirement's --tier/
// --distribute amendments (write-a-requirement.js) append a fresh snapshot
// under the same id rather than editing a file in place; readAll() below
// keeps only the LAST snapshot per id, the same "latest wins" rule
// findDataRecord already applies.
const HOME = argValue("--home") ?? dataDir(UNIT, "requirements");
const EVENTS_HOME = argValue("--events-home") ?? dataDir(UNIT, "requirement-events");

// Mirrors record-a-requirement-event.js's snapshotOf exactly — the same
// content, the same canonicalization, the same hash. Inlined rather than
// imported: this script and that one seat at different depths in the pool
// (this one nested under recalling-a-requirement/scripts/, that one flat),
// and a static import pinned to one relative depth would break the moment
// either is projected or moved. Kept in sync by hand is the honest tradeoff;
// a drift between the two would show up immediately as every distributed
// event failing to verify, never silently.
function snapshotOf(spec) {
  const canonical = JSON.stringify({ asks: spec.asks, "met-when": spec["met-when"] });
  return createHash("sha256").update(canonical).digest("hex");
}

function readEvents() {
  return readDataPool(EVENTS_HOME, "requirement-events").map((r) => r.record);
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function has(flag) {
  return process.argv.includes(flag);
}

function readAll() {
  let rows;
  try {
    rows = readDataPool(HOME, "requirements");
  } catch (e) {
    return [{ slug: "(unreadable)", unreadable: e.message }];
  }
  // Latest snapshot per id wins — an amendment (--tier, --distribute) is a
  // fresh append under the same id, never an edit of the earlier line.
  const latest = new Map();
  for (const { record } of rows) {
    if (record?.id) latest.set(record.id, record);
  }
  return [...latest.entries()].map(([slug, spec]) => ({ slug, spec }));
}

// Settlement is the exit code, and nothing else. A condition is held when its
// command exits as expected — not when it looks like it should.
function settle(condition) {
  if (!condition.command) {
    return { settled: false, reason: "the condition carries no command, so nothing can settle it" };
  }
  const result = spawnSync(condition.command, { shell: true, cwd: REPO_ROOT, encoding: "utf8", timeout: 120_000 });
  if (result.error) {
    return { settled: false, exit: null, reason: `could not be spawned: ${result.error.message}` };
  }
  const exit = result.status ?? 1;
  const expected = condition["expected-exit"] ?? 0;
  return { settled: exit === expected, exit, expected };
}

function recallOne(slug) {
  const found = findDataRecord(HOME, "requirements", slug);
  if (!found) {
    console.error(`recall-a-requirement: '${slug}' is not recorded.`);
    console.error(`  The glossary does not define this is a real answer. It is not a licence to invent one.`);
    process.exit(1);
  }
  const spec = found.record;

  console.log(`${spec.name}  (${spec.id})`);
  console.log(`  raised by: ${spec["raised-by"]}`);
  console.log(`  tier: ${spec.tier ?? "(not decided — no body has taken this up)"}`);
  if (spec.changes) console.log(`  changes: ${spec.changes}`);
  console.log(`\n  asks, in the raiser's own words:`);
  console.log(`    ${spec.asks}`);

  const realized = spec["realized-by"] ?? [];
  console.log(`\n  realized by: ${realized.length ? realized.join(", ") : "(nothing — distributed to nobody)"}`);

  console.log(`\n  met-when, re-run now:`);
  let held = 0;
  for (const condition of spec["met-when"]) {
    const result = settle(condition);
    if (result.settled) held += 1;
    const mark = result.settled ? "SETTLES" : "does not settle";
    const detail = result.reason ? result.reason : `exit ${result.exit} (expected ${result.expected})`;
    console.log(`    [${mark}]  ${condition.cell}`);
    console.log(`      ${detail}`);
    if (condition.command) console.log(`      $ ${condition.command}`);
  }

  const total = spec["met-when"].length;
  console.log(`\n  DERIVED: ${held}/${total} conditions settled — ${held === total ? "MET" : "NOT MET"}`);
  console.log(`  (read by re-running the conditions just now; the file asserts nothing about this)`);
  if (held !== total) process.exit(1);
}

// Which duty each cell belongs to. This mapping lives here because the cells
// are computed here — never on the duty specs. A duty is standing and carries
// no discharge conditions: conditions written onto a duty are stale the day
// after, and a duty is not the sort of thing that finishes. What this audit
// reads out is how the standing obligations are being met by the work raised
// against them, and the readout is derived by running, never by reading.
const CELLS_BY_DUTY = {
  "analysing-a-requirement": [
    "milestone:every-requirement-carries-conditions-that-settle-without-emsenn",
    "milestone:every-requirement-carries-the-ask-in-the-raisers-own-words",
  ],
  "deciding-a-requirement": [
    "milestone:every-requirement-records-the-tier-it-was-decided-at",
    "milestone:every-change-to-a-requirement-is-a-new-requirement-naming-what-it-changes",
  ],
  "realizing-a-requirement": ["milestone:no-requirement-was-edited-after-it-was-distributed"],
  "closing-the-loop-on-a-requirement": [
    "milestone:every-realized-requirement-was-verified-by-a-body-that-did-not-realize-it",
    "milestone:every-verified-requirement-was-closed-with-the-party-that-raised-it",
  ],
};

// The cells the four requirements duties discharge against. Each names what
// settles it, or says plainly that nothing can.
function audit() {
  const forDuty = argValue("--for");
  if (forDuty && !CELLS_BY_DUTY[forDuty]) {
    console.error(`recall-a-requirement: no duty '${forDuty}' is checked here.`);
    console.error(`  checked duties: ${Object.keys(CELLS_BY_DUTY).join(", ")}`);
    process.exit(2);
  }
  const all = readAll();
  const unreadable = all.filter((r) => r.unreadable);
  const reqs = all.filter((r) => !r.unreadable).map((r) => ({ ...r.spec, slug: r.slug }));

  const cells = [];
  const fail = (cell, offenders, reason) =>
    cells.push({ cell, state: offenders.length ? "denied" : "held", offenders, reason });

  fail(
    "milestone:every-requirement-carries-conditions-that-settle-without-emsenn",
    reqs.filter((r) => !(r["met-when"] ?? []).length || (r["met-when"] ?? []).some((c) => !c.command)).map((r) => r.slug),
  );
  fail(
    "milestone:every-requirement-carries-the-ask-in-the-raisers-own-words",
    reqs.filter((r) => !String(r.asks ?? "").trim()).map((r) => r.slug),
  );
  fail(
    "milestone:every-requirement-records-the-tier-it-was-decided-at",
    reqs.filter((r) => !r.tier).map((r) => r.slug),
  );
  fail(
    "milestone:every-change-to-a-requirement-is-a-new-requirement-naming-what-it-changes",
    reqs
      .filter((r) => r.changes && !reqs.some((o) => `emsenn/requirement/${o.id}` === r.changes))
      .map((r) => r.slug),
  );

  // Correlated against the requirement-events pool (record-a-requirement-event.js).
  // A cell with nothing to correlate against is HELD vacuously — the same rule
  // the cells above already apply to an empty requirements pool: a milestone
  // nothing has yet violated is held, not unknown, and it is reported unknown
  // only where no mechanism exists to tell the difference. The mechanism exists
  // now; what it finds is the honest readout, whichever way it comes out.
  const events = readEvents();

  fail(
    "milestone:no-requirement-was-edited-after-it-was-distributed",
    reqs
      .filter((r) =>
        events.some(
          (e) => e.kind === "distributed" && e.requirement === r.slug && e.snapshot !== snapshotOf(r),
        ),
      )
      .map((r) => r.slug),
  );
  fail(
    "milestone:every-realized-requirement-was-verified-by-a-body-that-did-not-realize-it",
    reqs
      .filter((r) => (r["realized-by"] ?? []).length > 0)
      .filter(
        (r) =>
          !events.some(
            (e) => e.kind === "attested" && e.requirement === r.slug && !(r["realized-by"] ?? []).includes(e.attester),
          ),
      )
      .map((r) => r.slug),
  );
  fail(
    "milestone:every-verified-requirement-was-closed-with-the-party-that-raised-it",
    reqs
      .filter((r) => events.some((e) => e.kind === "attested" && e.requirement === r.slug))
      .filter(
        (r) =>
          !events.some((e) => e.kind === "closed" && e.requirement === r.slug && e.raiser === r["raised-by"]),
      )
      .map((r) => r.slug),
  );

  const scope = forDuty ? new Set(CELLS_BY_DUTY[forDuty]) : null;
  const shown = scope ? cells.filter((c) => scope.has(c.cell)) : cells;

  console.log(
    `requirements audit — ${reqs.length} requirement(s) in ${HOME}${forDuty ? `\ndischarge of emsenn/duty/${forDuty}` : ""}\n`,
  );
  for (const c of shown) {
    console.log(`  [${c.state.toUpperCase()}]  ${c.cell}`);
    if (c.offenders.length) console.log(`      offenders: ${c.offenders.join(", ")}`);
    if (c.reason) console.log(`      ${c.reason}`);
  }

  if (unreadable.length) {
    console.error(`\n${unreadable.length} unreadable requirement(s):`);
    for (const r of unreadable) console.error(`  ${r.slug}: ${r.unreadable}`);
  }

  const held = shown.filter((c) => c.state === "held").length;
  const unknown = shown.filter((c) => c.state === "unknown").length;
  const denied = shown.filter((c) => c.state === "denied").length;
  console.log(`\n${held} held, ${denied} denied, ${unknown} unknown, of ${shown.length} cells.`);
  console.log(
    forDuty
      ? `emsenn/duty/${forDuty} is discharged when every cell above is held — it is ${
          denied || unknown ? "NOT discharged" : "discharged"
        }.`
      : `The requirements duties are discharged when every cell is held.${
          unknown
            ? ` ${unknown} cannot be settled by anything that exists — those duties are NOT discharged, and no amount of care will discharge them.`
            : ""
        }`,
  );

  if (reqs.length === 0) {
    console.error(`\nNO REQUIREMENTS FOUND. An empty pool is not a clean audit — every cell above is vacuously held.`);
    process.exit(1);
  }
  if (shown.some((c) => c.state !== "held") || unreadable.length) process.exit(1);
}

function main() {
  if (has("--audit")) return audit();
  const slug = argValue("--slug");
  if (!slug) {
    const all = readAll();
    if (!all.length) {
      console.error(`recall-a-requirement: no requirements recorded in ${HOME}`);
      process.exit(1);
    }
    for (const r of all) console.log(r.slug);
    return;
  }
  recallOne(slug);
}

main();
