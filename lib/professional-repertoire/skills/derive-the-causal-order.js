#!/usr/bin/env node
/**
 * @description A session readout realizing the Obsmetrologia corpus's causal-set order result (CausalSets/Causal/Order (a Lean module), CausalSets/Causal/Reachability (a Lean module)) over the firm's own live pools: gathers every presently OPEN task, undisposed idea, and undisposed requirement into one node set, derives precedence edges by scanning each node's own record fields for emsenn/<kind>/<id>-shaped addresses that resolve to another node in the set, settles the fuel-bounded transitive closure into a strict partial order (refusing a cycle rather than silently breaking it), and ranks every node by longest-chain depth from the order's sources into parallel batches and one total order, ties broken by id ascending. Deterministic and model-free: byte-identical pool state yields byte-identical output. Use to read what order the firm's own open work should be done in, not to change anything about it.
 * @returns {object} Every node reported is exactly one of an open task (its own goal not presently achieved), an undisposed idea (no requirement's from-idea and no decision record names it), or an undisposed requirement (no requirement-event of kind closed names it).
 * @returns {object} An edge appears only where its source address is itself a node in the set and its target address is a different node in the set.
 * @returns {object} Depth is derived by the same fuel-bounded round-layering causalStep/T_caus's transitive closure performs, never guessed or read from a record.
 * @returns {object} Two nodes at the same depth share no path between them in either direction, so a batch is genuinely a set of mutually independent nodes.
 * @throws {Error} Every seated task, idea, and requirement record must parse as JSON.
 * @throws {Error} A genuine cycle among the node set's own edges is refused with exit code 3, distinct from every other refusal's exit code 1.
 *
 * Assumes: none beyond the tasks, ideas, and requirements pools existing or
 * being absent — an absent pool reads as zero nodes of that kind, never a
 * refusal.
 *
 * ## Position
 *
 * This realizes two corpus results at once, generalized from physical
 * causal-set events to this firm's own open work:
 *
 * * **Order (`CausalSets/Causal/Order (a Lean module)`).** A `CausalSet` is a finite
 *   set of events under a step relation; `causalStep` is one edge, and
 *   `T_caus` is its *fuel-bounded* transitive closure — the settling
 *   process this instrument's `deriveOrder` reimplements as a round-by-
 *   round frontier layering, bounded by a fixed fuel budget (`node
 *   count + 1` rounds) rather than trusted to terminate on faith. Where
 *   `T_caus` settles to an irreflexive, transitive relation, the events
 *   form a strict partial order; where the underlying step relation
 *   contains a genuine cycle, no such order exists, and this instrument
 *   refuses rather than reporting one anyway.
 * * **Reachability (`CausalSets/Causal/Reachability (a Lean module)`).** `longestChain`
 *   ranks an event by the length of the longest chain of steps reaching
 *   it — its `properTime` — and events sharing a rank are exactly the ones
 *   with no chain between them in either direction: an antichain, safe to
 *   act on in any order or in parallel. This instrument's `batches` are
 *   exactly those antichains, grouped by shared depth.
 *
 * Here, the "events" are this firm's own open work: a task whose own goal
 * has not settled, an idea no requirement or decision has yet disposed of,
 * and a requirement no `closed` requirement-event has yet closed the loop
 * on. The "step relation" is read, not invented: wherever one node's own
 * record field carries an `emsenn/<kind>/<id>`-shaped address naming
 * another node in the set, the named node is read as causally PRIOR to the
 * node that names it (the referenced idea or requirement had to already
 * exist for the record naming it to be written), so the edge runs
 * `referenced -> referencer`.
 *
 * ## Node set: three independent derivations, none of them invented here
 *
 * * **Open tasks.** A task is open exactly as `make-a-task.js --verify`
 *   already defines achievement — every one of its own `goal` commands
 *   exits 0 — but this instrument cannot simply shell out to `--verify`
 *   for that answer. `--verify` itself refuses when `GOAL_DERIVATION` is
 *   set in its environment (its own guard against exactly the recursion
 *   `list-open-obligations.js`'s header describes fork-bombing the node on
 *   2026-07-16), and this instrument's own goal condition IS `node
 *   derive-the-causal-order.js --root .` — so when `make-a-task.js
 *   --verify` re-runs THIS instrument's own condition, this instrument is
 *   itself running with `GOAL_DERIVATION=1` already set, and a call out to
 *   `--verify` from inside that would immediately refuse for every task,
 *   every time. So task achievement is settled here directly — the same
 *   rule `--verify` already states in its own header (settled iff every
 *   goal command exits 0), re-run rather than borrowed — and every
 *   condition re-run this way is spawned with `GOAL_DERIVATION=1` set (so
 *   any OTHER self-aware instrument named in a task's own goal text
 *   correctly refuses instead of cascading) and with this instrument's own
 *   `CAUSAL_ORDER_RECHECK=1` guard set (see Known limits, below).
 * * **Undisposed ideas.** Reused, not reinvented: `raise-an-idea.js --open`
 *   already derives exactly this — no requirement's `from-idea` and no
 *   decision record names the idea — and is invoked here as a sibling
 *   subprocess (this pool's own convention: skills call each other as
 *   subprocesses, never import), never re-implemented.
 * * **Undisposed requirements.** No dedicated "list open requirements"
 *   instrument exists yet. This does not invent new disposition semantics
 *   for one: `record-a-requirement-event.js` and `recalling-a-
 *   requirement`'s own audit already establish that closing the loop on a
 *   requirement is exactly the fact of a `closed` requirement-event
 *   (raiser equal to the requirement's own `raised-by`) — the direct
 *   sibling of `raise-an-idea.js`'s own "disposed by a citing record in a
 *   related pool" rule. A requirement is open here exactly while no such
 *   event names it, applying the vocabulary those two instruments already
 *   settled rather than adding a fourth.
 *
 * ## Known limits, stated rather than hidden
 *
 * This instrument's own task, `realize-the-causal-order-instrument`,
 * carries a goal condition that invokes this very script. Checking that
 * task's achievement therefore re-invokes this script as a subprocess of
 * itself, and unbounded that is exactly the fork-bomb `list-open-
 * obligations.js`'s header names. The guard: every subprocess this
 * instrument spawns to re-check a task's own goal condition carries
 * `CAUSAL_ORDER_RECHECK=1` in its environment, and this instrument's very
 * first act, before parsing any argument, is to check for that variable
 * and — if present — emit a fixed, schema-shaped, empty stub (`nodes: []`,
 * `edges: []`, `batches: []`, `order: []`) and exit 0, rather than
 * re-deriving anything. This terminates the recursion at one level, always,
 * because the stub spawns nothing further. The cost: a task whose own goal
 * happens to re-invoke this instrument is always read, by this instrument's
 * own internal check, as achieved (every stub-satisfied condition exits 0)
 * — which only ever affects THIS instrument's own task, never any other
 * task's genuine achievement, and coincides with the truth exactly when
 * this file exists and runs cleanly at the path its goal names.
 *
 * A `--self-test-cycle` run that somehow fails to detect its own
 * unambiguous 3-node fixture as cyclic exits 1, not 3 — 3 is reserved for
 * "a cycle was correctly found", never for "the self-test itself broke".
 *
 * ## Resource use
 *
 * One subprocess per open task's goal condition (bounded by the tasks
 * pool's own size), one subprocess to `raise-an-idea.js --open`, and
 * otherwise pure in-memory JSON reads and graph computation. No record is
 * written; this is a readout only. No model call, no network, no wall
 * clock or random value anywhere in the output.
 *
 * ## Run it
 *
 * ```sh
 * node .../derive-the-causal-order.js --root <repo>
 * node .../derive-the-causal-order.js --self-test-cycle
 * ```
 *
 * `--root` (default: cwd) resolves the default pools under
 * `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/`; `--tasks-pool`, `--ideas-pool`,
 * `--requirements-pool`, and `--requirement-events-pool` override them
 * individually, for a foreign enterprise whose tree does not seat pools at
 * emsenn's paths. Output is JSON on stdout. Exit 0 on a settled order, 1 on
 * a refusal (malformed input, a missing sibling instrument), 3 on a genuine
 * cycle among the node set's own edges — live or synthetic.
 *
 * ## When NOT to use
 *
 * - Not to change what order anything happens in. This never writes a
 *   record, dispatches a task, or disposes an idea or requirement; it only
 *   reads and ranks.
 * - Not a general-purpose graph library. The edge derivation is scoped
 *   exactly to `emsenn/<kind>/<id>`-shaped address fields already present
 *   on task, idea, and requirement records — it adds no field to any
 *   schema, and it does not follow `subtasks` or `work-items`, which name
 *   other records by bare id rather than by address and are out of this
 *   instrument's stated scope even though they are real dependency edges;
 *   see this office's own report on that gap.
 * - Not the prover. This reimplements `T_caus` and `longestChain`'s
 *   already-proved shape in JavaScript over live records; it never invokes
 *   the proof assistant, its build tool, or any external interpreter.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── the recursion guard, checked before anything else runs ────────────────
// See "Known limits" above: this instrument's own task's goal invokes this
// very script, so checking that task's achievement re-invokes this script.
// Every subprocess THIS instrument spawns to re-check a task's own goal
// condition sets CAUSAL_ORDER_RECHECK=1; seeing it set here means this
// process IS one of those re-checks, and it must not derive anything
// further, or the recursion never terminates.
if (process.env.CAUSAL_ORDER_RECHECK) {
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        "recursion-guard": true,
        note:
          "invoked recursively while re-checking a task's own goal condition for self-referential achievement — short-circuited to this fixed stub rather than re-deriving; see 'Known limits' in this script's own header",
        nodes: [],
        edges: [],
        batches: [],
        order: [],
      },
      null,
      2,
    ) + "\n",
  );
  process.exit(0);
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

const die = (message) => out({ ok: false, error: message }, 1);

// ── the closure derivation, shared by the live run and --self-test-cycle ──
// Round-by-round frontier layering over a fixed sort order: a
// fuel-bounded reimplementation of causalStep/T_caus's transitive closure,
// and simultaneously longestChain's rank — a node's round number IS the
// length of the longest chain of edges reaching it, because Kahn's rule
// only ever releases a node once every edge INTO it has been consumed, and
// that happens only after every predecessor's own round is already fixed.
// Two nodes released in the same round share no edge, direct or
// transitive, in either direction — exactly longestChain's antichain.
function deriveOrder(nodeAddrs, edges) {
  const indegree = new Map(nodeAddrs.map((a) => [a, 0]));
  const adjacency = new Map(nodeAddrs.map((a) => [a, []]));
  for (const e of edges) {
    if (!indegree.has(e.from) || !indegree.has(e.to)) continue;
    adjacency.get(e.from).push(e.to);
    indegree.set(e.to, indegree.get(e.to) + 1);
  }
  for (const list of adjacency.values()) list.sort();

  let frontier = nodeAddrs.filter((a) => indegree.get(a) === 0).sort();
  const depthOf = new Map();
  const batches = [];
  let processed = 0;
  const fuel = nodeAddrs.length + 1;
  let round = 0;

  while (frontier.length > 0) {
    if (round > fuel) {
      return {
        ok: false,
        internalDefect: true,
        reason: `fuel exhausted at round ${round} against a budget of ${fuel} — more rounds ran than the node set has nodes, which a DAG can never require`,
      };
    }
    for (const a of frontier) depthOf.set(a, round);
    batches.push(frontier.slice());
    processed += frontier.length;
    const next = new Set();
    for (const a of frontier) {
      for (const succ of adjacency.get(a)) {
        indegree.set(succ, indegree.get(succ) - 1);
        if (indegree.get(succ) === 0) next.add(succ);
      }
    }
    frontier = [...next].sort();
    round += 1;
  }

  if (processed < nodeAddrs.length) {
    const cycle = nodeAddrs.filter((a) => !depthOf.has(a)).sort();
    return { ok: false, cycle };
  }

  const order = nodeAddrs
    .slice()
    .sort((a, b) => depthOf.get(a) - depthOf.get(b) || (a < b ? -1 : a > b ? 1 : 0));
  return { ok: true, depthOf, batches, order };
}

// ── --self-test-cycle: a synthetic fixture, no pool ever touched ──────────
function selfTestCycle() {
  const nodes = [
    { kind: "task", id: "self-test-a" },
    { kind: "idea", id: "self-test-b" },
    { kind: "requirement", id: "self-test-c" },
  ];
  const addrs = nodes.map((n) => `emsenn/${n.kind}/${n.id}`);
  const edges = [
    { from: addrs[0], to: addrs[1] },
    { from: addrs[1], to: addrs[2] },
    { from: addrs[2], to: addrs[0] },
  ];
  const result = deriveOrder(addrs, edges);
  if (result.ok || result.internalDefect) {
    out(
      {
        ok: false,
        "self-test": "FAILED",
        reason:
          result.internalDefect
            ? result.reason
            : "the synthetic 3-node fixture (a strict cycle by construction) settled as acyclic — the closure derivation itself is broken, not the fixture",
        nodes: addrs,
        edges,
      },
      1,
    );
  }
  out(
    {
      ok: true,
      "self-test": "cycle correctly refused",
      nodes: addrs,
      edges,
      cycle: result.cycle,
    },
    3,
  );
}

if (process.argv.includes("--self-test-cycle")) selfTestCycle();

// ── live pools ──────────────────────────────────────────────────────────
const REPO_ROOT = argValue("--root") ?? process.cwd();
const TASKS_POOL = argValue("--tasks-pool") ?? join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/state/tasks");
const IDEAS_POOL = argValue("--ideas-pool") ?? join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/records/ideas");
const REQUIREMENTS_POOL = argValue("--requirements-pool") ?? join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/records/requirements");
const REQUIREMENT_EVENTS_POOL = argValue("--requirement-events-pool") ?? join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/journals/requirement-events");

function seatedFiles(pool) {
  if (!existsSync(pool)) return [];
  return readdirSync(pool).filter((f) => f.endsWith(".json")).sort();
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    die(`⊥ ${path} is not valid JSON (${e.message}) — an order is not derived while silently skipping an unreadable record`);
  }
}

// A skill is one file: it calls its siblings as subprocesses rather than
// importing them, so a sibling must be FOUND. Two shapes answer — the flat
// pool a skill's source lives in, and a node it was projected into. The
// identical pattern raise-an-idea.js's own findSkill already uses.
function findSkill(flatName) {
  const beside = join(HERE, flatName);
  if (existsSync(beside)) return beside;
  let d = REPO_ROOT;
  for (;;) {
    const pooled = join(d, "lib/management/skills", flatName);
    if (existsSync(pooled)) return pooled;
    const projected = join(d, ".claude/skills");
    if (existsSync(projected)) {
      for (const entry of readdirSync(projected)) {
        const at = join(projected, entry, "scripts", flatName);
        if (existsSync(at)) return at;
      }
    }
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

// ── open tasks: re-run each task's own goal, never assumed and never
// borrowed from make-a-task.js --verify (see "Known limits" above for why
// --verify itself cannot be called from here) ──────────────────────────────
//
// Run CONCURRENTLY, bounded by a fixed-size worker pool, never sequentially.
// The pool holds ~100 tasks carrying ~650 goal conditions between them; run
// one at a time, that is ~650 process spawns end to end, which measured over
// 100 seconds on this node — comfortably over the 120-second-per-condition
// budget make-a-task.js's own run() enforces, and fatal to this instrument's
// OWN determinism condition, which re-runs the whole derivation TWICE inside
// that one budget. Concurrency does not change what is computed — each
// task's own conditions still run in the task's own declared order, stopping
// at the first that fails, exactly as sequential execution would — it only
// changes how many of ~100 independent tasks' checks are in flight over the
// wall clock at once, which nothing in the derivation's own correctness
// depends on.
const TASK_CHECK_CONCURRENCY = 24;

function spawnGoalCondition(command) {
  return new Promise((resolve) => {
    let settled = false;
    const child = spawn("bash", ["-c", command], {
      cwd: REPO_ROOT,
      stdio: "ignore",
      // GOAL_DERIVATION mirrors make-a-task.js's own convention, so any OTHER
      // self-aware instrument a task's own goal names (list-open-obligations.js,
      // make-a-task.js --verify) correctly refuses instead of cascading.
      // CAUSAL_ORDER_RECHECK is this instrument's own guard, above.
      env: { ...process.env, GOAL_DERIVATION: "1", CAUSAL_ORDER_RECHECK: "1" },
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve(false);
    }, 60000);
    child.on("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(false);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

async function isTaskAchieved(task) {
  const goal = Array.isArray(task.goal) ? task.goal : [];
  if (goal.length === 0) return false;
  for (const condition of goal) {
    if (typeof condition !== "string") return false;
    if (!(await spawnGoalCondition(condition))) return false;
  }
  return true;
}

// A fixed-size worker pool over an ordered list: each worker pulls the next
// unclaimed index and awaits fn on it, so results[i] always corresponds to
// items[i] regardless of which worker or what order completion arrives in —
// concurrency changes the SCHEDULE, never the mapping.
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function openTasks() {
  const entries = seatedFiles(TASKS_POOL).map((file) => {
    const record = readJson(join(TASKS_POOL, file));
    const id = record.id ?? file.replace(/\.json$/u, "");
    return { id, record };
  });
  const achieved = await mapWithConcurrency(entries, TASK_CHECK_CONCURRENCY, (e) => isTaskAchieved(e.record));
  return entries.filter((_, i) => !achieved[i]);
}

// ── undisposed ideas: reused from raise-an-idea.js --open, never
// reimplemented (this pool's own sibling-subprocess convention) ───────────
//
// raise-an-idea.js's OWN unit resolution (resolve-an-identifier.js's
// findUnit) walks UP from --from/--root testing for a content/, data/, or
// lib/management/ directory at each ancestor. This repository's OWN root
// owns a data/ directory (one of the seven a unit may hold), so passing
// --root/--from pointed at the repository root resolves UNIT to the
// repository root itself rather than lib/emsenn — leaving raise-an-idea.js's
// OWN requirementsPools()/decisionPools() lookups pointed at
// <repo-root>/content/requirements and <repo-root>/content/decision-records,
// neither of which exist, so EVERY idea reads as vacuously undisposed. --home
// alone does not fix this: it only overrides the ideas pool itself, not
// those other two lookups internal to raise-an-idea.js. So --from is passed
// explicitly here, computed from IDEAS_POOL's own parent's parent (the
// "<unit>/content/ideas" shape, stripped back to "<unit>") rather than from
// REPO_ROOT, so a --ideas-pool override naming a foreign unit is honored
// exactly as given rather than assumed to sit under this repository's root.
function openIdeas() {
  if (!existsSync(IDEAS_POOL)) return [];
  const script = findSkill("raise-an-idea.js");
  if (!script) die("⊥ cannot find raising-an-idea — open ideas cannot be derived without it, and this instrument does not reimplement its rule");
  const ideasUnit = dirname(dirname(IDEAS_POOL));
  const r = spawnSync(process.execPath, [script, "--open", "--home", IDEAS_POOL, "--from", ideasUnit], { encoding: "utf8" });
  let verdict;
  try {
    verdict = JSON.parse(r.stdout);
  } catch {
    die(`⊥ raise-an-idea.js --open returned nothing parseable: ${(r.stderr || r.stdout || "").trim()}`);
  }
  if (!verdict.ok) die(`⊥ raise-an-idea.js --open failed: ${verdict.error}`);
  return (verdict.open ?? []).map((record) => ({ id: record.id, record }));
}

// ── undisposed requirements: open exactly while no 'closed'
// requirement-event names it — record-a-requirement-event.js's and
// recalling-a-requirement's own established disposition vocabulary,
// applied rather than reinvented ───────────────────────────────────────────
function openRequirements() {
  const closed = new Set(
    seatedFiles(REQUIREMENT_EVENTS_POOL)
      .map((f) => readJson(join(REQUIREMENT_EVENTS_POOL, f)))
      .filter((e) => e.kind === "closed")
      .map((e) => e.requirement),
  );
  const result = [];
  for (const file of seatedFiles(REQUIREMENTS_POOL)) {
    const record = readJson(join(REQUIREMENTS_POOL, file));
    const id = record.id ?? file.replace(/\.json$/u, "");
    if (!closed.has(id)) result.push({ id, record });
  }
  return result;
}

// ── edges: scan every node's own record for emsenn/<kind>/<id>-shaped
// addresses that resolve to another node in the set, add no schema field ──
const ADDRESS_RE = /emsenn\/[a-z0-9-]+\/[a-z0-9]+(?:-[a-z0-9]+)*/gu;

function collectAddresses(value, sink) {
  if (typeof value === "string") {
    for (const m of value.matchAll(ADDRESS_RE)) sink.push(m[0]);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectAddresses(v, sink);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectAddresses(v, sink);
  }
}

function deriveEdges(nodes, addr) {
  const known = new Set(nodes.map(addr));
  const seen = new Set();
  const edges = [];
  for (const n of nodes) {
    const refs = [];
    collectAddresses(n.record, refs);
    const self = addr(n);
    for (const ref of refs) {
      if (ref === self || !known.has(ref)) continue;
      const key = `${ref}=>${self}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: ref, to: self });
    }
  }
  edges.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0) || (a.to < b.to ? -1 : a.to > b.to ? 1 : 0));
  return edges;
}

// ── main ────────────────────────────────────────────────────────────────
async function main() {
  const nodes = [
    ...(await openTasks()).map(({ id, record }) => ({ kind: "task", id, record })),
    ...openIdeas().map(({ id, record }) => ({ kind: "idea", id, record })),
    ...openRequirements().map(({ id, record }) => ({ kind: "requirement", id, record })),
  ];
  const addr = (n) => `emsenn/${n.kind}/${n.id}`;
  const byAddr = new Map(nodes.map((n) => [addr(n), n]));
  const nodeAddrs = [...byAddr.keys()].sort();
  const edges = deriveEdges(nodes, addr);

  const result = deriveOrder(nodeAddrs, edges);
  if (!result.ok) {
    if (result.internalDefect) die(`⊥ ${result.reason}`);
    out(
      {
        ok: false,
        error: "a cycle exists among the open task/idea/requirement address references — refused rather than silently ordering it",
        "node-count": nodeAddrs.length,
        edges,
        cycle: result.cycle,
      },
      3,
    );
  }

  const describe = (a) => {
    const n = byAddr.get(a);
    return { kind: n.kind, id: n.id, depth: result.depthOf.get(a) };
  };

  out({
    ok: true,
    source:
      "Obsmetrologia CausalSets/Causal/Order (a Lean module) (CausalSet, causalStep/T_caus's fuel-bounded transitive closure settling to a strict partial order) and CausalSets/Causal/Reachability (a Lean module) (longestChain/properTime ranking) — generalized from physical causal-set events to this firm's own open task/idea/requirement records, reimplemented here rather than invoked; this instrument never runs the proof assistant itself.",
    "node-count": nodeAddrs.length,
    nodes: nodeAddrs.map(describe),
    edges,
    batches: result.batches,
    order: result.order.map(describe),
  });
}

await main();
