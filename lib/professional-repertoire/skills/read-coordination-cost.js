#!/usr/bin/env node
/**
 * @description A session readout realizing the Obsmetrologia corpus's CoordinationCohomology result over the firm's own live pools: builds the nerve whose vertices are offices and tasks and whose edges are dispatches (office<->task) plus task<->task subtask edges, ranks its first cohomology Ȟ¹ = |E| − |V| + |C|, and reports it as Landauer-bits — one irreversibly erased bit per independent cycle the nerve presently carries, since Ȟ¹ = 0 iff the nerve is a forest iff a coordination-free global section glues. Deterministic and model-free: byte-identical pool state yields byte-identical output. Use to read what the board's own shape is presently costing in coordination, not to change anything about it.
 *
 * @returns {object} every seated office and task is counted exactly once as a vertex
 * @returns {object} every seated dispatch and every task-record subtask entry whose both endpoints resolve to a seated vertex is counted exactly once as an edge; one that does not resolve is named in `unresolved` and excluded from the count, never silently dropped
 * @returns {object} rank-h1 equals |E| − |V| + |C| computed over the graph actually built, and landauer-bits equals rank-h1
 * @returns {object} when rank-h1 is greater than zero, every independent cycle names the records whose edges compose it, derived by a fundamental-cycle basis over a spanning forest built in one fixed, sorted edge order
 *
 * None beyond the pools existing or being absent — an absent pool reads as
 * zero vertices of that kind, never a refusal.
 *
 * ## Position
 *
 * This instrument realizes one named result from the Obsmetrologia corpus
 * (lib/emsenn/services/561-group/services/lenticule-science/services/obsmetrological-services-section/src/services/obsmetrologia/)
 * against this firm's own management substrate, rather than against
 * Obsmetrologia's own subject matter: CoordinationCohomology. Over a nerve
 * built from a bipartite incidence structure, the rank of its first Čech
 * cohomology group is the graph's circuit rank, computed by the standard
 * graph-theoretic identity rank Ȟ¹ = |E| − |V| + |C| (edges minus vertices
 * plus connected components — Euler's formula for a 1-complex). Ȟ¹ = 0
 * exactly when the nerve is a forest, which is exactly when a global
 * section glues without contradiction — no cycle exists whose local pieces
 * cannot be reconciled into one whole — which is CALM's own coordination-
 * free condition (Hellerstein & Alvaro, "Keeping CALM"): a computation
 * needs no coordination iff it is monotonic, and a forest nerve is the
 * shape of a computation with nothing left to reconcile. Where Ȟ¹ > 0, each
 * independent cycle is a place the nerve's local pieces cannot glue for
 * free — Landauer's principle (Landauer, 1961) reads this as a minimum: at
 * least one bit of information is irreversibly erased per independent
 * cycle closed, since closing a cycle discards which of the cycle's
 * alternate paths was "the" path. This citation is why the header states
 * the formula rather than deriving it fresh, per this office's own duty:
 * a readout is a citation, not a vibe.
 *
 * The nerve here is built from THIS firm's own board, not from any
 * Obsmetrologia fixture: vertices are offices (content/offices) and tasks
 * (content/tasks); edges are dispatches (content/dispatches, each joining
 * one office to one task) and subtask references (a task record's own
 * `subtasks` array, each joining one task to another). Dispatch edges are
 * bipartite (office<->task) by construction — a dispatch schema requires
 * exactly a task and an office. Subtask edges are task<->task, which is
 * NOT bipartite against the office/task split — stated here rather than
 * smoothed over: "bipartite nerve" in the task's own framing describes the
 * dispatch layer, and the subtask layer rides the same graph without
 * preserving that property. The rank formula does not require bipartiteness
 * — it holds for any graph — so this is a naming precision, not a
 * correctness gap.
 *
 * ## Structure and data
 *
 * Vertex id: `office:<id>` for every `<id>.json` in the offices pool,
 * `task:<id>` for every `<id>.json` in the tasks pool. The two namespaces
 * are disjoint by construction even where an office and a task happen to
 * share a bare slug.
 *
 * Edge record (in memory): { kind: "dispatch" | "subtask", source: <path
 * relative to root>, label: <human string>, a: <vertex id>, b: <vertex id> }.
 * `source` is the ONE seated JSON record that asserts the edge — the
 * dispatch file itself for a dispatch edge, the parent task's own file for
 * a subtask edge (that is where the `subtasks` array actually lives; the
 * child task's file asserts nothing about the edge).
 *
 * Determinism requires one fixed processing order, independent of
 * filesystem directory-iteration order (readdirSync's order is not
 * guaranteed stable across platforms): office ids, task ids, dispatch
 * files, and each task's own subtask list are all read once, and the
 * combined edge list is sorted by (kind, source, a, b) before any
 * graph algorithm sees it. Two runs against byte-identical pool state
 * therefore process edges in byte-identical order.
 *
 * ## Logic and algorithms
 *
 * 1. Load vertices: every seated office id, every seated task id.
 * 2. Load candidate edges: one per seated dispatch (a = office vertex,
 *    b = task vertex); one per (task, subtask-id) pair found in every
 *    seated task's own `subtasks` array (a = parent task vertex, b =
 *    subtask's task vertex).
 * 3. Partition candidate edges into resolved (both endpoints are seated
 *    vertices) and unresolved (named in the witness, excluded from the
 *    graph — a dispatch or subtask reference that names something unseated
 *    is a fact about the board worth reporting, not a fact this readout is
 *    entitled to paper over by dropping it silently).
 * 4. Sort resolved edges into the one fixed order (above).
 * 5. Union-find over all vertices, processing sorted edges once: an edge
 *    joining two not-yet-joined components is added to the spanning
 *    forest; an edge joining two already-joined vertices is a NON-TREE
 *    edge — one independent cycle, by the standard fundamental-cycle-basis
 *    construction (a graph's non-tree edges, relative to any one spanning
 *    forest, biject with a basis of its cycle space; the count is
 *    basis-independent even though which edges land in the forest is not).
 *    For each non-tree edge, the tree path already built between its two
 *    endpoints — found by breadth-first search restricted to tree edges
 *    laid down so far, which must already connect them since union-find
 *    just reported they share a component — plus the non-tree edge itself,
 *    is that cycle's full edge set.
 * 6. rank-h1 is the count of non-tree edges. This is checked, not merely
 *    asserted, against |E| − |V| + |C| computed independently from the
 *    same resolved-edge and vertex counts and the union-find's own final
 *    component count; a mismatch is an internal defect in this instrument
 *    and refuses (⊥) rather than reporting a number it cannot stand behind.
 * 7. Components are read off the union-find's final partition; each
 *    component's own vertex and edge counts are reported, alongside the
 *    global totals the task asked for.
 *
 * ## Error paths
 *
 * - A pool (offices, tasks, or dispatches) that does not exist reads as
 *   empty, not as a refusal — a fresh or partially-seated firm still gets a
 *   readout, honestly reporting few or no vertices, rather than an error
 *   for a state that is not actually wrong.
 * - A dispatch naming an office or task that resolves to no seated vertex,
 *   or a subtask id that resolves to no seated task — named in `unresolved`
 *   and excluded from V/E/the graph, never silently dropped and never
 *   allowed to crash the readout.
 * - The internal rank cross-check (step 6) disagreeing with the fundamental-
 *   cycle count — refused (⊥), since a readout that cannot verify its own
 *   arithmetic is worse than no readout.
 * - Malformed JSON in a seated pool record — refused (⊥) naming the file,
 *   since a nerve built while silently skipping unreadable records is a
 *   nerve of a firm that does not exist.
 *
 * ## Resource use
 *
 * Pure in-memory computation over pool files already on disk: one read per
 * seated office, task, and dispatch record, no subprocess, no network, no
 * model call, no unbounded loop — the union-find and BFS are both linear in
 * vertices plus edges. No record is written; this is a readout only.
 *
 * ## Run it
 *
 * ```sh
 * node .../read-coordination-cost.js --root <repo>
 * node .../read-coordination-cost.js --root <repo> \
 *   --offices-pool <dir> --tasks-pool <dir> --dispatch-pool <dir>
 * ```
 *
 * `--root` (default: cwd) is the base every default pool path is resolved
 * under (`<root>/lib/emsenn/services/union-services-section/services/board-of-directors/services/executive-office/content/{offices,tasks,dispatches}`); each pool
 * flag overrides its own default directly. Output is JSON on stdout; exit
 * code is always 0 on a completed readout (there is no achieved/failed
 * distinction to signal — a readout that ran is the whole of what it does)
 * and 1 only on the internal refusals named above.
 *
 * ## When NOT to use
 *
 * - Not to change the board. This never writes a record; a high rank-h1 is
 *   a fact reported, and whatever is done about it is a different act by a
 *   different office.
 * - Not as a general-purpose graph tool. The vertex and edge vocabulary is
 *   fixed to this firm's own offices/tasks/dispatches/subtasks shape.
 * - Not to assert which cycle is "worse." Every independent cycle costs the
 *   same one bit under Landauer's reading; ranking them by consequence is
 *   not this instrument's question.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { dataDir, readDataPool } from "./resolve-an-identifier.js";

const REPO_ROOT = argValue("--root") ?? process.cwd();
const UNIT = join(REPO_ROOT, "lib/emsenn");
// Offices stand and are amended in place, so per the Chairperson's
// content/data/lib rule they stay content/. Tasks and dispatches are
// write-once, so they seat as data/, day-bucketed logs.
const OFFICES_POOL = argValue("--offices-pool") ?? join(REPO_ROOT, "lib/emsenn/services/union-services-section/services/board-of-directors/services/executive-office/content/offices");
const TASKS_POOL = argValue("--tasks-pool") ?? dataDir(UNIT, "tasks");
const DISPATCH_POOL = argValue("--dispatch-pool") ?? dataDir(UNIT, "dispatches");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

const die = (message) => out({ ok: false, error: message }, 1);

function seatedIds(pool) {
  if (!existsSync(pool)) return [];
  return readdirSync(pool)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/u, ""))
    .sort();
}

function seatedRecords(pool, kind) {
  try {
    return readDataPool(pool, kind).map((r) => ({ record: r.record, seat: `${relative(REPO_ROOT, r.file)}:${r.line}` }));
  } catch (e) {
    die(`⊥ ${e.message} — a nerve is not built while silently skipping an unreadable record`);
  }
}

// ── 1. vertices ──────────────────────────────────────────────────────────
const officeIds = seatedIds(OFFICES_POOL);
const taskIds = seatedRecords(TASKS_POOL, "tasks").map(({ record }) => record.id);
const officeVertices = officeIds.map((id) => `office:${id}`);
const taskVertices = taskIds.map((id) => `task:${id}`);
const vertexSet = new Set([...officeVertices, ...taskVertices]);

// ── 2. candidate edges ───────────────────────────────────────────────────
const candidates = [];
const unresolved = [];

for (const { record: d, seat: source } of seatedRecords(DISPATCH_POOL, "dispatches")) {
  const a = `office:${d.office}`;
  const b = `task:${d.task}`;
  const label = `dispatch ${d.id}: office:${d.office} <-> task:${d.task}`;
  if (vertexSet.has(a) && vertexSet.has(b)) {
    candidates.push({ kind: "dispatch", source, label, a, b });
  } else {
    unresolved.push({ kind: "dispatch", source, label, missing: [a, b].filter((v) => !vertexSet.has(v)) });
  }
}

for (const { record: t, seat: source } of seatedRecords(TASKS_POOL, "tasks")) {
  const parentId = t.id;
  for (const sub of t.subtasks ?? []) {
    const a = `task:${parentId}`;
    const b = `task:${sub}`;
    const label = `task ${parentId} subtask ${sub}`;
    if (vertexSet.has(a) && vertexSet.has(b)) {
      candidates.push({ kind: "subtask", source, label, a, b });
    } else {
      unresolved.push({ kind: "subtask", source, label, missing: [a, b].filter((v) => !vertexSet.has(v)) });
    }
  }
}

// ── 3. fixed, sorted processing order ───────────────────────────────────
candidates.sort((x, y) => {
  const kx = `${x.kind} ${x.source} ${x.a} ${x.b}`;
  const ky = `${y.kind} ${y.source} ${y.a} ${y.b}`;
  return kx < ky ? -1 : kx > ky ? 1 : 0;
});

// ── 4. union-find over every vertex, including isolated ones ───────────
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

// Tree adjacency, built incrementally, used only for fundamental-cycle BFS.
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
  if (!cameFrom.has(target)) return null; // should never happen — see step 6 cross-check
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
    const cycleEdges = [...path, edge];
    const records = [...new Set(cycleEdges.map((e) => e.source))].sort();
    cycles.push({
      "closing-edge": { kind: edge.kind, source: edge.source, label: edge.label },
      edges: cycleEdges.map((e) => ({ kind: e.kind, source: e.source, label: e.label, a: e.a, b: e.b })),
      records,
    });
  }
}

// ── 5. components ────────────────────────────────────────────────────────
const componentOf = new Map(allVertices.map((v) => [v, find(v)]));
const byComponent = new Map();
for (const v of allVertices) {
  const root = componentOf.get(v);
  if (!byComponent.has(root)) byComponent.set(root, { vertices: [], edges: [] });
  byComponent.get(root).vertices.push(v);
}
for (const edge of candidates) {
  byComponent.get(componentOf.get(edge.a)).edges.push(edge);
}

const components = [...byComponent.values()]
  .map((c) => ({
    vertices: c.vertices.sort(),
    edges: c.edges.length,
    "vertex-count": c.vertices.length,
  }))
  .sort((x, y) => (x.vertices[0] < y.vertices[0] ? -1 : x.vertices[0] > y.vertices[0] ? 1 : 0));

// ── 6. the headline numbers, cross-checked ──────────────────────────────
const V = allVertices.length;
const E = candidates.length;
const C = byComponent.size;
const rankFromFormula = E - V + C;
const rankFromCycles = cycles.length;
if (rankFromFormula !== rankFromCycles) {
  die(`⊥ internal defect: rank-h1 by formula (${rankFromFormula}) disagrees with the fundamental-cycle count (${rankFromCycles}) — refusing to report a number this instrument cannot stand behind`);
}

out({
  ok: true,
  source: "Obsmetrologia CoordinationCohomology: over a nerve, rank Ȟ¹ = |E| − |V| + |C|, and Ȟ¹ = 0 iff the nerve is a forest iff a coordination-free global section glues (CALM); Landauer reading: one irreversibly erased bit per independent cycle (Landauer, 1961).",
  vertices: V,
  edges: E,
  "total-components": C,
  "rank-h1": rankFromFormula,
  "landauer-bits": rankFromFormula,
  components,
  cycles,
  unresolved,
});
