#!/usr/bin/env node
/**
 * @description A session readout realizing the Obsmetrologia corpus's closure-rule-system result (Obsmetrologia/Closure/RuleSystem.lean) over the firm's own live pools: charges a fixed set of cells from record content only (movements, anomalies, tasks, requirement-events), joins every charging fact per cell in the FOUR knowledge order {unknown, held, denied, contested} to its least fixed point, and reports the settled valuation, per-charge counts, and any contested cells. Deterministic and model-free: byte-identical pool state yields byte-identical output. Use to read what the firm's own evidence currently settles to, not to change anything about it.
 *
 * @returns {object} every cell charged by at least one seated record is reported exactly once in the settled valuation.
 * @returns {object} a cell's settled charge is the knowledge-join of every fact that charges it, order-independent (checked, not merely asserted, against a reverse-order refold).
 * @returns {object} counts partition the settled valuation exactly: unknown + held + denied + contested equals the valuation's size.
 *
 * Assumes none beyond the pools existing or being absent — an absent pool reads as zero charging facts of that kind, never a refusal.
 *
 * ## Position
 *
 * This instrument realizes the Obsmetrologia corpus's closure-rule system
 * (`Obsmetrologia/Closure/RuleSystem.lean`) against this firm's own
 * management substrate, rather than against Obsmetrologia's own subject
 * matter. The corpus: a closure-rule system `S` generates the immediate-
 * consequence operator `T_S` (van Emden–Kowalski / Datalog), and `cl^S =
 * lfp(T_S)` — the least fixed point above a seed, reached by iterating
 * `T_S` to quiescence (`generated_closure_is_least`,
 * `immediate_consequence_lfp`). `T_S v = v ∨ₖ (join of every rule
 * consequent whose antecedent holds in v)`.
 *
 * This realization's rule system has **no rules with antecedents that read
 * other cells' current values** — every charge here is a ground fact read
 * directly off one seated record (a movement, an anomaly, a task, a
 * requirement-event), never a fact conditioned on what some other cell has
 * settled to. So `fire(S, v)` for this `S` does not depend on `v` at all:
 * it is the same join of ground consequents on every round. One round of
 * `T_S` therefore already reaches the fixed point — `Tstep S v = v ∨ₖ
 * fire(S)`, and a second round joins the identical `fire(S)` onto an
 * already-settled `v`, changing nothing (`joinK` idempotence). This is
 * stated plainly rather than iterating a fixed number of times and calling
 * it depth: `rounds` in the output is honestly `1` because that is what
 * this rule system's own shape entails, not a number chosen for effect. A
 * genuine cascade (a rule whose antecedent inspects another cell, e.g. "an
 * anomaly naming a component denies every task-goal cell whose command
 * mentions that component") is a documented possible extension, not
 * implemented here — adding one without a real antecedent to test would be
 * exactly the fabricated depth this office's duties refuse.
 *
 * The **knowledge order** realized is Belnap's FOUR (the corpus's `Charge`
 * quartet `{⊥ₖ, t, f, ⊤ₖ}` — unknown/held/denied/contested here), modeled
 * as a pair of independent booleans (told-true, told-false) so that
 * `joinK` is exactly pairwise OR: `unknown = (F,F)`, `held = (T,F)`,
 * `denied = (F,T)`, `contested = (T,T)`. This is commutative, associative,
 * and idempotent by construction, which is exactly `Charge.joinList_congr`
 * (`CRDTCohomologicalCALM.lean`, "the knowledge-join of a list of deltas
 * depends only on the *set* of deltas, not their order or multiplicity") —
 * the property this instrument's own cross-check verifies computationally
 * (below), rather than only citing.
 *
 * ## The charge map — derived from record content only
 *
 * No command is executed and no model is called to produce a charge; every
 * charge is read straight off a seated record's own fields.
 *
 * 1. **Act cells.** For every seated `content/movements/*.json` record with
 *    `kind === "assistant"` and a non-empty `tool-acts` array, one cell per
 *    distinct tool name in that array: `act:<session-id>-<turn-index>-
 *    <tool-name>`. Charge: `held` (a recorded act happened). If a future
 *    revision of `movement.schema.json` ever carries a per-act error
 *    marker (an `errored` field on a tool-act entry), that act would charge
 *    `denied` instead — checked defensively below, dormant today because no
 *    seated movement record carries such a field.
 * 2. **Component cells.** For every seated `content/anomalies/*.json`
 *    record, cell `component:<at>`. Charge: `denied` (a flaw was observed
 *    there) — `at` verbatim, so two anomalies naming the same component are
 *    two sources charging the same cell the same value.
 * 3. **Task-goal cells.** For every seated `content/tasks/*.json` record
 *    carrying `x-provenance.at-declaration` (a map from each goal-condition
 *    command string to the exit code recorded when the task was raised),
 *    one cell per entry in the task's own `goal` array, in that array's
 *    order: `task-goal:<task-id>-<index>`. Charge: `held` when the recorded
 *    exit is `0`, else `denied`. A task with no `at-declaration` contributes
 *    no task-goal cells at all — there is nothing in its own record to
 *    derive a charge from, and inventing one by running the goal now would
 *    violate this instrument's own model-free, command-free discipline.
 * 4. **Requirement cells.** For every seated `content/requirement-events/
 *    *.json` record with `kind === "attested"`, cell `requirement:<the
 *    record's own requirement field>`. Charge: `held`. For every requirement
 *    named by a `kind === "distributed"` event that carries **no** attested
 *    event anywhere in the pool, the same cell charges `unknown` — the
 *    bottom of the knowledge order, which contributes nothing to any join
 *    it takes part in (`unknown ∨ₖ x = x`) and is reported for honesty, not
 *    because it moves anything.
 *
 * Every cell id is namespaced (`act:`, `component:`, `task-goal:`,
 * `requirement:`), so the four charge kinds can never collide on the same
 * cell by construction — any future `contested` cell reported here means
 * two facts of the *same* kind (e.g. two requirement-events, or a held and
 * a denied task-goal declaration under one id — which cannot presently
 * happen since ids are per-task-per-index) actually disagreed, not an
 * accidental namespace collision.
 *
 * ## Algorithm
 *
 * 1. Load every charging fact from the four pools, each fact `{cell,
 *    charge, source}` (`source` is provenance only — the office, session,
 *    or task the fact came from — carried through so a reader can see why a
 *    cell charged as it did, not consulted by the join itself).
 * 2. Sort facts into one fixed order — `(cell, source, charge)` — so
 *    grouping and folding are independent of any pool's directory-iteration
 *    order.
 * 3. Group by cell; fold each group's charges with `joinK`, seeded at
 *    `unknown`, in the sorted order — this is `cl^S` at round 1, per the
 *    position note above.
 * 4. **Cross-check**: refold every group in *reverse* order and compare.
 *    `joinK` is commutative and idempotent, so the two folds must agree
 *    cell-for-cell; a mismatch is an internal defect in this instrument's
 *    join (not a fact about the pools) and refuses (⊥) rather than
 *    reporting a settlement it cannot stand behind.
 * 5. Report the valuation, counts, and every cell whose settled charge is
 *    `contested`.
 *
 * ## Error paths
 *
 * - Any of the four pools not existing reads as zero facts from that pool,
 *   not a refusal — a fresh or partially-seated firm still gets a
 *   readout.
 * - Malformed JSON in a seated pool record — refused (⊥) naming the file.
 * - The forward/reverse fold cross-check disagreeing for any cell —
 *   refused (⊥) naming the cell, since a settlement that cannot verify its
 *   own order-independence is worse than none.
 *
 * ## Resource use
 *
 * Pure in-memory computation over pool files already on disk: one read per
 * seated movement, anomaly, task, and requirement-event record, no
 * subprocess, no network, no model call. No record is written; this is a
 * readout only.
 *
 * ## Run it
 *
 * ```sh
 * node .../settle-the-evidence.js --root <repo>
 * node .../settle-the-evidence.js --root <repo> \
 *   --movements-pool <dir> --anomalies-pool <dir> --tasks-pool <dir> --requirement-events-pool <dir>
 * ```
 *
 * `--root` (default: cwd) is the base every default pool path is resolved
 * under (`<root>/lib/emsenn/services/union-services-section/services/board-of-directors/services/executive-office/content/{movements,anomalies,tasks,requirement-
 * events}`); each pool flag overrides its own default directly. Output is
 * JSON on stdout; exit code is always 0 on a completed readout and 1 only
 * on the internal refusals named above.
 *
 * ## When NOT to use
 *
 * - Not to change the evidence. This never writes a record.
 * - Not a general Datalog engine. The cell vocabulary and rule set are
 *   fixed to this firm's own movements/anomalies/tasks/requirement-events
 *   shape; there is no rule language exposed to a caller.
 * - Not to decide what should be done about a denied or contested cell —
 *   that is a different act by a different office, on this readout as
 *   input.
 */

import { join, relative } from "node:path";
import { dataDir, readDataPool } from "./resolve-an-identifier.js";
import {
  deriveChargingFacts,
  joinCharge,
  operationalReadoutOfCharge,
  OPERATIONAL_READOUT_NAMES,
} from "./lib/four-charge-projection.js";

const REPO_ROOT = argValue("--root") ?? process.cwd();
const UNIT = join(REPO_ROOT, "lib/emsenn");
// Movements, anomalies, tasks, and requirement-events are all write-once/
// append-only data/ pools per the Chairperson's content/data/lib rule —
// day-bucketed logs, read wholesale rather than one file per record.
const MOVEMENTS_POOL = argValue("--movements-pool") ?? dataDir(UNIT, "movements");
const ANOMALIES_POOL = argValue("--anomalies-pool") ?? dataDir(UNIT, "anomalies");
const TASKS_POOL = argValue("--tasks-pool") ?? dataDir(UNIT, "tasks");
const REQUIREMENT_EVENTS_POOL = argValue("--requirement-events-pool") ?? dataDir(UNIT, "requirement-events");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

const die = (message) => out({ ok: false, error: message }, 1);

// {record, seat} pairs, seat a "path:line" pointer into the day-file a
// record actually lives at — the provenance readDataPool already carries.
function seatedRecords(pool, kind) {
  try {
    return readDataPool(pool, kind).map((r) => ({ record: r.record, seat: `${relative(REPO_ROOT, r.file)}:${r.line}` }));
  } catch (e) {
    die(`⊥ ${e.message} — a settlement is not built while silently skipping an unreadable record`);
  }
}

// ── 1. admit pools, then apply the single pure Charge projection ─────────
const facts = deriveChargingFacts({
  movements: seatedRecords(MOVEMENTS_POOL, "movements"),
  anomalies: seatedRecords(ANOMALIES_POOL, "anomalies"),
  tasks: seatedRecords(TASKS_POOL, "tasks"),
  requirementEvents: seatedRecords(REQUIREMENT_EVENTS_POOL, "requirement-events"),
});

// ── 3. fold per cell (round 1 of Tstep — see header) ────────────────────
const byCell = new Map();
for (const f of facts) {
  if (!byCell.has(f.cell)) byCell.set(f.cell, []);
  byCell.get(f.cell).push(f);
}

function foldGroup(group) {
  return group.reduce((acc, f) => joinCharge(acc, f.charge), "absurd");
}

const canonicalValuation = [];
for (const [cell, group] of byCell) {
  const forward = foldGroup(group);
  const reverse = foldGroup([...group].reverse());
  if (forward !== reverse) {
    die(`⊥ internal defect: join for cell '${cell}' is not order-independent (forward '${forward}' vs reverse '${reverse}') — refusing to report a settlement this instrument cannot stand behind`);
  }
  canonicalValuation.push({
    cell,
    charge: forward,
    "charged-by": group.map((f) => ({ source: f.source, charge: f.charge, record: f.record })).sort((a, b) => (a.source < b.source ? -1 : a.source > b.source ? 1 : 0)),
  });
}
canonicalValuation.sort((a, b) => (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : 0));

// ── 4. explicit compatibility readout (never the Charge carrier) ─────────
const valuation = canonicalValuation.map((value) => ({
  ...value,
  charge: operationalReadoutOfCharge(value.charge),
  "charged-by": value["charged-by"].map((source) => ({
    ...source,
    charge: operationalReadoutOfCharge(source.charge),
  })),
}));
const counts = Object.fromEntries(OPERATIONAL_READOUT_NAMES.map((name) => [name, 0]));
for (const value of valuation) counts[value.charge]++;
const contested = canonicalValuation
  .filter((value) => value.charge === "stable")
  .map((value) => valuation.find((readout) => readout.cell === value.cell));

out({
  ok: true,
  source: "Obsmetrologia Closure.RuleSystem: cl^S = lfp(T_S), the immediate-consequence operator (generated_closure_is_least, immediate_consequence_lfp); the per-cell join is Charge.joinList_congr's order-independent knowledge-join (CRDTCohomologicalCALM.lean, 'a delta is a Čech 1-cochain modulo coboundaries').",
  rounds: 1,
  "cell-count": valuation.length,
  counts,
  valuation,
  contested,
});
