#!/usr/bin/env node
/**
 * @description A session readout realizing the Obsmetrologia corpus's attention-allocation result (Obsmetrologia/Cohomology/AttentionAllocation.lean, AllocationSolver.lean) over the firm's own live pools: recomputes glue-the-sections.js's obstruction list internally, prices every obstruction at one Landauer-bit of reconciliation cost, and selects — under a bounded attention budget --budget N (default: every obstruction) — a deterministic, model-free priority order for which obstructions to reconcile first. Deterministic and model-free. Use to read which obstructions a bounded agent should reconcile first, not to reconcile anything.
 *
 * @returns {object} every obstruction gluing-the-sections would report appears in exactly one of chosen or deferred
 * @returns {object} chosen's total cost never exceeds the budget; deferred is exactly the obstructions the budget could not reach in priority order
 *
 * Assumes: none beyond the pools existing or being absent — an absent pool
 * reads as zero obstructions, never a refusal.
 *
 * The priority order is a pure function of obstruction cell id and
 * incident-source count — never a model call, never the order pool files
 * happened to be read in.
 *
 * ## Position
 *
 * This realizes the corpus's attention allocation
 * (`Cohomology/AttentionAllocation.lean`): a bounded agent has a finite
 * attention budget `B` and many `Obstruction`s, each an atomic `{cost,
 * benefit}` pair — here, the gluing obstructions `glue-the-sections.js`
 * reports. Every obstruction costs exactly **one Landauer-bit** to
 * reconcile (`LandauerEntropy.landauerBits`, one bit per independent
 * cycle/disagreement) — a uniform unit cost, never derived from running
 * anything. Its **benefit** is the number of distinct sources disagreeing
 * at that cell (its incident-edge count in the obstruction nerve): the more
 * sources a cell's disagreement touches, the more of the board's own
 * disagreement resolving that one cell would settle. The allocation
 * problem the corpus states: which subset of obstructions maximises
 * captured benefit under `∑ cost ≤ B` (`attention_allocation`'s bundle —
 * `Feasible`, `cost_monotone_cons`, `residual_antitone`).
 *
 * `AllocationSolver.lean` solves the general (non-unit-cost) case by an
 * exhaustive powerset search folded from either end (`solveL`/`solveR`),
 * because with arbitrary per-item costs greedy-by-benefit is not
 * necessarily optimal. Here every cost is exactly `1`
 * (`LandauerEntropy.landauerBits` prices every obstruction identically),
 * which collapses the knapsack to its classical unit-cost degenerate case:
 * **selecting the `B` highest-benefit items greedily is provably optimal**
 * whenever all costs are equal, because swapping any lower-benefit chosen
 * item for any higher-benefit deferred item of the same cost cannot lower
 * total benefit and the budget spend is unaffected either way — the same
 * fact `solveL_optimal`/`solveR_optimal` prove by exhaustive search in
 * general, reached here in closed form because the cost structure is
 * degenerate. So this instrument sorts rather than searches the powerset;
 * the result is the same optimum value the two-handed solver would reach,
 * without the combinatorial cost of enumerating `2^n` subsets over what
 * may be a large obstruction list.
 *
 * The **tie-break** (`AllocationSolver.lean`'s chirality: `solveL` and
 * `solveR` keep opposite beads on an exact benefit tie, `bias_witness`) is
 * resolved here by ascending cell id — a fixed, arbitrary, but
 * *documented* and stable rule, chosen over either fold direction because
 * a lexicographic tie-break on the cell's own name is reproducible from
 * the record alone and carries no "which hand" asymmetry to justify.
 *
 * ## Design choice: recompute internally, do not spawn a subprocess
 *
 * This script recomputes the same charge map and obstruction derivation
 * `glue-the-sections.js` performs, in-process, rather than spawning it as
 * a child process. Both are pure, cheap (one JSON read per seated pool
 * record, no model call, no network), so a subprocess would add process-
 * spawn latency and a dependency on this script's own file location and
 * the caller's `node` on `PATH`, for no benefit: there is no shared mutable
 * state a subprocess boundary would protect, and the two scripts' charge
 * derivations are kept textually identical (both documented here and in
 * `glue-the-sections.js`) rather than factored into a shared module, per
 * the flat-script discipline this whole skills pool follows — one file,
 * no sibling to fall out of step with.
 *
 * ## Algorithm
 *
 * 1. Derive the same charging facts and obstruction cells as
 *    `glue-the-sections.js` (see that script's header for the full charge
 *    map and the agreeing/disagreeing rule).
 * 2. Build the obstruction list: one `Obstruction` per disagreeing cell,
 *    `cost = 1`, `benefit = ` the number of distinct sources charging it.
 * 3. Sort the universe by `(benefit descending, cell ascending)` — the
 *    documented deterministic priority.
 * 4. `--budget N` (default: the full obstruction count, i.e. every
 *    obstruction is reconciled) selects the first `N` of that order as
 *    `chosen`; the rest is `deferred`, still in priority order.
 * 5. Cross-check: `chosen.length + deferred.length` equals the universe
 *    size with no duplicate cell, `totalCost(chosen) ≤ budget`, and
 *    `totalCost(chosen) + 1 > budget` whenever `deferred` is non-empty (the
 *    greedy prefix is budget-tight, not merely feasible) — refused (⊥) on
 *    any violation, since a selection that cannot verify its own
 *    feasibility is worse than none.
 *
 * ## Error paths
 *
 * - Any of the four underlying pools not existing reads as zero facts, not
 *   a refusal.
 * - Malformed JSON in a seated pool record — refused (⊥) naming the file.
 * - `--budget` given a negative or non-integer value — refused (⊥): a
 *   budget is a count of obstructions reconciled, and a fractional or
 *   negative count is not a coherent one.
 * - The internal feasibility cross-check (step 5) failing — refused (⊥).
 *
 * ## Resource use
 *
 * Pure in-memory computation, no subprocess, no network, no model call. No
 * record is written; this is a readout only.
 *
 * ## Run it
 *
 * ```sh
 * node .../allocate-attention.js --root <repo>
 * node .../allocate-attention.js --root <repo> --budget 3
 * ```
 *
 * `--root` (default: cwd) resolves the same four default pool paths
 * `glue-the-sections.js` uses, with the same override flags
 * (`--movements-pool`, `--anomalies-pool`, `--tasks-pool`,
 * `--requirement-events-pool`). `--budget` (default: every obstruction) is
 * the count of obstructions to reconcile. Output is JSON on stdout; exit
 * code is always 0 on a completed readout and 1 only on the internal
 * refusals named above.
 *
 * ## When NOT to use
 *
 * - Not to reconcile anything. This never writes a record and never
 *   changes which cells disagree; it only orders them.
 * - Not a general knapsack solver. The unit-cost collapse to a sort is
 *   correct only because every obstruction costs exactly one Landauer-bit
 *   here; a domain with genuinely variable reconciliation costs needs
 *   `AllocationSolver.lean`'s actual powerset solvers, not this shortcut.
 */

import { join } from "node:path";
import { dataDir, readDataPool } from "./resolve-an-identifier.js";
import { deriveChargingFacts, nonAbsurdCharges } from "./lib/four-charge-projection.js";

const REPO_ROOT = argValue("--root") ?? process.cwd();
const UNIT = join(REPO_ROOT, "lib/emsenn");
// Movements, anomalies, tasks, and requirement-events are all write-once/
// append-only data/ pools per the Chairperson's content/data/lib rule —
// day-bucketed logs, read wholesale rather than one file per record.
const MOVEMENTS_POOL = argValue("--movements-pool") ?? dataDir(UNIT, "movements");
const ANOMALIES_POOL = argValue("--anomalies-pool") ?? dataDir(UNIT, "anomalies");
const TASKS_POOL = argValue("--tasks-pool") ?? dataDir(UNIT, "tasks");
const REQUIREMENT_EVENTS_POOL = argValue("--requirement-events-pool") ?? dataDir(UNIT, "requirement-events");
const BUDGET_ARG = argValue("--budget");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

const die = (message) => out({ ok: false, error: message }, 1);

function records(pool, kind) {
  try {
    return readDataPool(pool, kind).map((r) => r.record);
  } catch (e) {
    die(`⊥ ${e.message} — an allocation is not built while silently skipping an unreadable record`);
  }
}

// ── 1. admit pools, then apply the single pure Charge projection ─────────
const facts = deriveChargingFacts({
  movements: records(MOVEMENTS_POOL, "movements"),
  anomalies: records(ANOMALIES_POOL, "anomalies"),
  tasks: records(TASKS_POOL, "tasks"),
  requirementEvents: records(REQUIREMENT_EVENTS_POOL, "requirement-events"),
});

const byCell = new Map();
for (const f of facts) {
  if (!byCell.has(f.cell)) byCell.set(f.cell, []);
  byCell.get(f.cell).push(f);
}

// ── 2. the obstruction universe ─────────────────────────────────────────
const universe = [];
for (const [cell, group] of byCell) {
  if (nonAbsurdCharges(group).size <= 1) continue; // agrees — glue-the-sections.js glues it, no obstruction
  const sources = [...new Set(group.map((f) => f.source))].sort();
  universe.push({ cell, cost: 1, benefit: sources.length, sources });
}

// ── 3. the documented deterministic priority ────────────────────────────
universe.sort((a, b) => (b.benefit - a.benefit) || (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : 0));

// ── 4. the budget ────────────────────────────────────────────────────────
let budget = universe.length;
if (BUDGET_ARG !== undefined) {
  if (!/^\d+$/u.test(BUDGET_ARG)) {
    die(`⊥ --budget '${BUDGET_ARG}' is not a non-negative integer — a budget is a count of obstructions reconciled`);
  }
  budget = Number.parseInt(BUDGET_ARG, 10);
}

const chosen = universe.slice(0, budget);
const deferred = universe.slice(budget);

// ── 5. feasibility cross-check ──────────────────────────────────────────
const totalCost = (list) => list.reduce((acc, o) => acc + o.cost, 0);
const totalBenefit = (list) => list.reduce((acc, o) => acc + o.benefit, 0);

const spent = totalCost(chosen);
if (chosen.length + deferred.length !== universe.length) {
  die(`⊥ internal defect: chosen (${chosen.length}) + deferred (${deferred.length}) does not equal the obstruction universe (${universe.length})`);
}
if (spent > budget) {
  die(`⊥ internal defect: chosen selection costs ${spent} against a budget of ${budget} — infeasible`);
}
if (deferred.length > 0 && spent + 1 <= budget) {
  die(`⊥ internal defect: budget ${budget} not exhausted (spent ${spent}) while ${deferred.length} obstruction(s) remain deferred — the greedy prefix is not budget-tight`);
}

out({
  ok: true,
  source: "Obsmetrologia Cohomology.Attention.attention_allocation: a bounded budget B over priced obstructions, maximising captured benefit under total cost ≤ B (Feasible, cost_monotone_cons, residual_antitone); AllocationSolver.lean's unit-cost degenerate case, where the greedy highest-benefit-first order reaches the same optimum the powerset solvers solveL/solveR would.",
  "obstruction-count": universe.length,
  budget,
  "budget-spent": spent,
  "budget-remaining": budget - spent,
  "residual-benefit": totalBenefit(deferred),
  chosen,
  deferred,
});
