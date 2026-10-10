#!/usr/bin/env node
/**
 * @description A session readout realizing the Obsmetrologia corpus's settling-cohomology gluing result (Obsmetrologia/Cohomology/SettlingCohomologyH1.lean, CRDTCohomologicalCALM.lean) over the firm's own live pools: recomputes the same charge map settle-the-evidence.js settles (movements, anomalies, tasks, requirement-events), treats each cell's charging facts as a family of local sections indexed by SOURCE (session, office, or task), glues the cells where every source agrees into one global section, and reports every cell where sources disagree as a Čech gluing obstruction, ranking their bipartite source-cell nerve's Ȟ¹ = |E| − |V| + |C| exactly as read-coordination-cost.js does. Deterministic and model-free. Use to read where the firm's evidence presently fails to glue, not to change anything about it.
 * @returns {object} Every cell all of whose sources agree (including a cell charged by exactly one source) appears in the glued global section at their common joined value.
 * @returns {object} Every cell whose sources disagree — at least two distinct non-unknown charges recorded by distinct sources — appears in obstructions and nowhere in the glued section.
 * @returns {object} rank-h1 equals |E| − |V| + |C| over the source-cell nerve built from disagreeing cells only, cross-checked against an independent fundamental-cycle count.
 *
 * Assumes: none beyond the pools existing or being absent — an absent pool
 * reads as zero charging facts, never a refusal.
 *
 * ## Position
 *
 * This realizes two corpus results at once, over the same charge map
 * `settle-the-evidence.js` settles (documented there in full; duplicated
 * here rather than imported, per the flat-script discipline every skill in
 * this pool follows — each script is one file with no sibling to fall out
 * of step with):
 *
 * * **Gluing (`SettlingCohomologyH1.lean`).** A Čech 1-datum is a cover
 *   plus a local section per patch; it is a *cocycle* (an agreeing family)
 *   when local sections coincide on every overlap, and `H¹ = 0` says every
 *   cocycle glues to a unique global section (`h1_vanishes`, reusing
 *   `Sheaf.separated`). Read onto this firm's pools: the "patches" are
 *   SOURCES (a session for a movement-derived cell, an office for an
 *   anomaly- or requirement-event-derived cell, a task for its own goal
 *   cells), the "local section" a source asserts is the charge(s) it
 *   contributes to each cell it charges, and the "overlap" between two
 *   sources is the set of cells both charge. Where all sources charging a
 *   cell agree (or only one source charges it), the family glues — the
 *   global section's value there is their common (joined) charge. Where
 *   they disagree, that cell is exactly the Čech obstruction: no single
 *   global value restricts back to every local one.
 * * **Rank (`CoordinationCohomology`, realized identically to
 *   `read-coordination-cost.js`).** Over the *disagreeing* cells only, a
 *   bipartite nerve — vertices are sources and cells, edges are (source,
 *   cell) incidence pairs — has Ȟ¹ = |E| − |V| + |C|
 *   (Euler's formula for a 1-complex), computed by union-find plus a
 *   fundamental-cycle basis over a spanning forest built in one fixed
 *   sorted edge order, cross-checked against the same formula computed
 *   independently. `LandauerEntropy.landauerBits` reads this rank as bits
 *   of information irreversibly lost — one bit per independent cycle the
 *   nerve of obstructions still carries.
 *
 * A cell with zero or one charging source can never disagree with itself,
 * so it never becomes an obstruction; disagreement requires at least two
 * *distinct* sources charging the *same* cell with charges whose join is
 * not simply the one non-`unknown` value already present (i.e. `held` from
 * one source and `denied` from another — `unknown` never disagrees with
 * anything, since it is the join's own identity). Every cell id this
 * instrument charges is namespaced by kind (`act:`, `component:`, `task-
 * goal:`, `requirement:`), so disagreement can only ever be between facts
 * of the *same* charge kind — this instrument does not invent cross-kind
 * collisions to manufacture obstructions where the pools carry none.
 *
 * ## Algorithm
 *
 * 1. Load the same four pools and derive the same per-cell charging facts
 *    `{cell, charge, source}` as `settle-the-evidence.js` (see that
 *    script's header for the full charge map).
 * 2. Sort facts into the fixed order `(cell, source, charge)`.
 * 3. Group by cell. For each cell, take the SET of distinct charges
 *    contributed (a source contributing the same charge as another
 *    contributes nothing new to the set). A cell is **agreeing** when that
 *    set has at most one non-`unknown` member; **disagreeing** when it has
 *    two or more.
 * 4. Agreeing cells glue: the global section's value is the knowledge-join
 *    of every source's charge (identical to `settle-the-evidence.js`'s
 *    settled value for that cell, since no disagreement means the join is
 *    just that one value, possibly with `unknown` contributing nothing).
 * 5. Disagreeing cells become obstructions and build the bipartite
 *    source-cell nerve: vertex per distinct source, vertex per disagreeing
 *    cell, one edge per (source, cell) incidence among the disagreeing
 *    cells only. Sort edges by `(source, cell)`; union-find over all
 *    vertices in that order; a non-tree edge is one independent cycle
 *    (fundamental-cycle basis, identical construction to
 *    `read-coordination-cost.js`). `rank-h1` is the non-tree edge count,
 *    cross-checked against `|E| − |V| + |C|` computed independently from
 *    the same graph; a mismatch refuses (⊥).
 * 6. `landauer-bits` equals `rank-h1` (`LandauerEntropy.landauerBits`, one
 *    irreversibly-lost bit per independent obstruction cycle).
 *
 * ## Error paths
 *
 * - Any of the four pools not existing reads as zero facts, not a refusal.
 * - Malformed JSON in a seated pool record — refused (⊥) naming the file.
 * - The internal rank cross-check (step 5) disagreeing with the
 *   fundamental-cycle count — refused (⊥), since a readout that cannot
 *   verify its own arithmetic is worse than none.
 *
 * ## Resource use
 *
 * Pure in-memory computation, one read per seated record across the four
 * pools, no subprocess, no network, no model call. No record is written.
 *
 * ## Run it
 *
 * ```sh
 * node .../glue-the-sections.js --root <repo>
 * ```
 *
 * `--root` (default: cwd) is the base every default pool path is resolved
 * under, mirroring `settle-the-evidence.js`'s own pool flags exactly
 * (`--movements-pool`, `--anomalies-pool`, `--tasks-pool`,
 * `--requirement-events-pool`). Output is JSON on stdout; exit code is
 * always 0 on a completed readout and 1 only on the internal refusals
 * named above.
 *
 * ## When NOT to use
 *
 * - Not to change the board. This never writes a record.
 * - Not to decide which obstruction matters more than another — every
 *   disagreeing cell costs the same one bit under the Landauer reading;
 *   choosing which to reconcile first is `allocate-attention.js`'s
 *   question, not this one's.
 */

import { join } from "node:path";
import { dataDir, readDataPool } from "./resolve-an-identifier.js";
import {
  deriveChargingFacts,
  joinCharge,
  nonAbsurdCharges,
  operationalReadoutOfCharge,
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

function records(pool, kind) {
  try {
    return readDataPool(pool, kind).map((r) => r.record);
  } catch (e) {
    die(`⊥ ${e.message} — a gluing is not built while silently skipping an unreadable record`);
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

// ── 3. agreeing vs disagreeing ────────────────────────────────────────────
const glued = [];
const obstructionCells = []; // { cell, sources: [{source, charge}] }
for (const [cell, group] of byCell) {
  if (nonAbsurdCharges(group).size <= 1) {
    const value = group.reduce((acc, f) => joinCharge(acc, f.charge), "absurd");
    glued.push({ cell, value, "agreeing-sources": [...new Set(group.map((f) => f.source))].sort() });
  } else {
    obstructionCells.push({
      cell,
      sources: group.map((f) => ({ source: f.source, charge: f.charge })).sort((a, b) => (a.source < b.source ? -1 : a.source > b.source ? 1 : 0)),
    });
  }
}
glued.sort((a, b) => (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : 0));
obstructionCells.sort((a, b) => (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : 0));

// Preserve the existing JSON contract through an explicit readout bijection.
for (const section of glued) section.value = operationalReadoutOfCharge(section.value);
for (const obstruction of obstructionCells) {
  for (const source of obstruction.sources) source.charge = operationalReadoutOfCharge(source.charge);
}

// ── 4. the bipartite source-cell nerve over disagreeing cells only ─────
const vertexSet = new Set();
const candidates = [];
for (const oc of obstructionCells) {
  const cellVertex = `cell:${oc.cell}`;
  vertexSet.add(cellVertex);
  for (const s of oc.sources) {
    const sourceVertex = `source:${s.source}`;
    vertexSet.add(sourceVertex);
    candidates.push({ a: sourceVertex, b: cellVertex, label: `${s.source} charges ${oc.cell} as ${s.charge}` });
  }
}
candidates.sort((x, y) => {
  const kx = `${x.a} ${x.b}`;
  const ky = `${y.a} ${y.b}`;
  return kx < ky ? -1 : kx > ky ? 1 : 0;
});

const allVertices = [...vertexSet].sort();
const parent = new Map(allVertices.map((v) => [v, v]));
function find(v) {
  while (parent.get(v) !== v) {
    parent.set(v, parent.get(parent.get(v)));
    v = parent.get(v);
  }
  return v;
}
function union(a, b) {
  const ra = find(a);
  const rb = find(b);
  if (ra !== rb) parent.set(ra, rb);
}

const treeAdj = new Map(allVertices.map((v) => [v, []]));
function bfsPath(start, target) {
  if (start === target) return [];
  const cameFrom = new Map([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === target) break;
    for (const { to, edge } of treeAdj.get(cur) ?? []) {
      if (cameFrom.has(to)) continue;
      cameFrom.set(to, { from: cur, edge });
      queue.push(to);
    }
  }
  if (!cameFrom.has(target)) return null;
  const path = [];
  let cur = target;
  while (cur !== start) {
    const step = cameFrom.get(cur);
    path.push(step.edge);
    cur = step.from;
  }
  return path.reverse();
}

const cycles = [];
for (const edge of candidates) {
  const ra = find(edge.a);
  const rb = find(edge.b);
  if (ra !== rb) {
    union(edge.a, edge.b);
    treeAdj.get(edge.a).push({ to: edge.b, edge });
    treeAdj.get(edge.b).push({ to: edge.a, edge });
  } else {
    const path = bfsPath(edge.a, edge.b);
    if (path === null) die(`⊥ internal defect: '${edge.a}' and '${edge.b}' union-find as connected but no tree path was found between them`);
    cycles.push({ "closing-edge": edge.label, edges: [...path.map((e) => e.label), edge.label] });
  }
}

const componentOf = new Map(allVertices.map((v) => [v, find(v)]));
const components = new Set(componentOf.values()).size;

const V = allVertices.length;
const E = candidates.length;
const C = components;
const rankFromFormula = E - V + C;
const rankFromCycles = cycles.length;
if (rankFromFormula !== rankFromCycles) {
  die(`⊥ internal defect: rank-h1 by formula (${rankFromFormula}) disagrees with the fundamental-cycle count (${rankFromCycles}) — refusing to report a number this instrument cannot stand behind`);
}

out({
  ok: true,
  source: "Obsmetrologia SettlingCohomologyH1.h1_vanishes: every agreeing family (1-cocycle) glues to a unique global section, and disagreement is the Čech obstruction; CoordinationCohomology's rank Ȟ¹ = |E| − |V| + |C| over the bipartite source-cell nerve of disagreeing cells; LandauerEntropy.landauerBits reads that rank as irreversibly-lost bits.",
  "glued-count": glued.length,
  "obstruction-count": obstructionCells.length,
  glued,
  obstructions: obstructionCells,
  vertices: V,
  edges: E,
  "total-components": C,
  "rank-h1": rankFromFormula,
  "landauer-bits": rankFromFormula,
  cycles,
});
