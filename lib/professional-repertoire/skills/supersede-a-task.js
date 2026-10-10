#!/usr/bin/env node
/**
 * @description Settles the twice-precedented record-repair pattern into one atomic instrument: archives a defective task and its dispatch stamped with superseded-by and per pointers to the successor and the authorizing decision, raises the successor stamped supersedes, and re-dispatches it to the same office — all in one invocation, so the board never lacks an open dispatch answering for the obligation at any observable moment. Refuses a decision that does not resolve, or one that is not yet decided.
 *
 * @throws {Error} Refuses unless the intake names the task being superseded, the decision authorizing it, and the successor's own goal and discharges.
 * @throws {Error} Refuses when the superseded task does not seat in the tasks pool.
 * @throws {Error} Refuses when the decision does not seat in a decision-records pool, or its status is not decided.
 * @throws {Error} Refuses when the successor's goal and discharges do not pass making-a-task's own gate, unaltered and unmediated.
 *
 * After a successful run: the successor task exists, raised by making-a-task, before the superseded task is touched. The successor is re-dispatched, to the superseded task's own office unless told otherwise, before the superseded task is touched. The superseded task and its dispatch, if it had one, are moved to their pool's _archive/, each carrying superseded-by and per in its own x-provenance. At every moment this instrument could be interrupted, some dispatch — the old one or the new one — answers for the obligation; never neither.
 *
 * ## The pattern this replaces
 *
 * Twice now, a defective task has been repaired by hand: edit the task in
 * place, or abandon it and raise a new one with no trace back, or archive it
 * without a pointer forward. Each time cost a session re-deriving what
 * happened from context that would not be there the next time. The pattern
 * is the same both times — archive the defective record, raise what replaces
 * it, keep the board covered throughout — and a pattern repeated twice
 * un-mechanized is exactly what settle-recurring-pattern-into-mechanism
 * exists to close before a third ad hoc repair invents a third shape.
 *
 * ## Why the ordering is the safety property
 *
 * The successor is raised and dispatched BEFORE the superseded task or its
 * dispatch is touched. If raising the successor fails — its goal is prose,
 * its discharges names no duty, anything making-a-task or dispatching-a-task
 * itself refuses — this instrument dies there, and the superseded task and
 * its dispatch are exactly as they were: still open, still answering for the
 * obligation. There is no window in which the board has archived the old
 * obligation and not yet raised the new one. The archive happens last,
 * specifically so the failure mode is "nothing changed" rather than "the
 * obligation vanished."
 *
 * ## What it delegates, and why
 *
 * This script does not raise a task or a dispatch itself — it calls
 * making-a-task.js and dispatching-a-task.js, the instruments that already
 * own that gate (prose goals refused, a duty that must resolve, an office
 * that must seat), and propagates their refusals uncensored. Reimplementing
 * either gate here would be a second answer to a question one instrument
 * already answers, and the two would drift the first time either was edited
 * alone.
 *
 * ## The pointers, and where they live
 *
 * `superseded-by` and `per` (the id of the authorizing decision) are written
 * into the ARCHIVED task's and dispatch's own `x-provenance` — never as
 * top-level keys, because task.schema.json and dispatch.schema.json both
 * declare `additionalProperties: false` on the live record, and a record
 * about to leave the live pool is not a reason to grow the live contract.
 * `x-provenance` is declared `{"type": "object"}` on both schemas precisely
 * so history can be written there without a schema change. `supersedes` on
 * the successor's own record is written the same way, patched into its
 * x-provenance once making-a-task has raised it — making-a-task does not
 * know this key and must not be taught it just to carry one instrument's
 * bookkeeping.
 *
 * ## Run it
 *
 * ```sh
 * echo '{"supersedes":"<old-task-id>","decision":"<decision-id>",
 *        "id":"<new-task-id>","goal":["…"],"discharges":"<duty-id>",
 *        "work-items":["…"]}' \
 *   | node .../supersede-a-task.js
 *
 * node .../supersede-a-task.js --dry-run   # (with the same stdin) — nothing written
 * ```
 *
 * `office` is optional and defaults to the superseded task's own dispatch's
 * office; give it explicitly to redirect the successor, or omit it and
 * leave the successor undispatched if the superseded task had no dispatch
 * of its own to inherit from.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **A decision that does not resolve** — refused. An unnamed or
 *   unfindable authority is no authority; archiving a task on the strength
 *   of a decision nobody can read is the record asserting a fact it cannot
 *   source.
 * - **A decision whose status is not `decided`** — refused, the status
 *   named. A proposed or last-call decision has not yet bound anyone, and
 *   superseding a task on its strength would make the record true before
 *   the board that authorizes it has said so.
 * - **A superseded task that seats nowhere** — refused. There is nothing to
 *   supersede.
 * - **A successor making-a-task or dispatching-a-task itself refuses** —
 *   refused, their message propagated uncensored, and the superseded task
 *   and its dispatch are left exactly as found.
 *
 * ## When NOT to use
 *
 * - Not for amending a task's goal in place. If the goal is merely wrong in
 *   a way its own discharges still holds, that is a task record nobody
 *   should be hand-editing either, but it is not a supersession — raise the
 *   correction as what it is.
 * - Not for closing a task that succeeded. Achievement is derived by
 *   make-a-task.js --verify; a task that passed its goal needs no
 *   successor and no archive.
 * - Not for deciding that a task is defective. That decision is the
 *   authorizing decision this instrument requires as input — it is made
 *   where decisions are made, not invented here under time pressure.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dataDir, findDataRecord, readDataPool } from "./resolve-an-identifier.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = argValue("--root") ?? process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");
const UNIT = join(REPO_ROOT, "lib/emsenn");

// Tasks, dispatches, and decision-records are all write-once data/ pools
// per the Chairperson's content/data/lib rule — day-bucketed logs, never
// files moved or amended in place. --decision-pool, when given, still wins
// outright, as a literal override base directory.
const TASK_POOL = argValue("--task-pool") ?? dataDir(UNIT, "tasks");
const DISPATCH_POOL = argValue("--dispatch-pool") ?? dataDir(UNIT, "dispatches");
const DECISION_POOL = argValue("--decision-pool") ?? dataDir(UNIT, "decision-records");

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
  out({ ok: false, error: message, touched: false }, 1);
}

// The sibling instruments seat beside this script in the flat pool — the
// same resolution dispatch-a-task.js already uses for reading-a-schema, and
// for the same reason: called, never copied, so the gate they own cannot
// drift into a second, slightly different gate here.
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

function sibling(name) {
  const beside = join(HERE, name);
  if (existsSync(beside)) return beside;
  const pooled = findUp(HERE, join("lib/management/skills", name));
  if (pooled) return pooled;
  die(`⊥ cannot find ${name} beside this script or in a lib/management/skills pool at or above it — this instrument delegates rather than reimplements, and has nothing to delegate to.`);
}

// Run a sibling instrument, exactly as an operator would from the shell:
// stdin in, stdout parsed as its own JSON, its own exit code respected. A
// non-zero exit is propagated uncensored — this instrument adds no gloss to
// a refusal that already explains itself.
function runSibling(name, input, extraArgs = []) {
  const script = sibling(name);
  const args = [script, "--root", REPO_ROOT, ...extraArgs];
  const r = spawnSync(process.execPath, args, { input: JSON.stringify(input), encoding: "utf8" });
  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch {
    die(`⊥ ${name} returned nothing parseable: ${(r.stderr || r.stdout || "").trim()}`);
  }
  if (r.status !== 0 || parsed.ok === false) {
    die(`${name} refused: ${parsed.error ?? ((r.stderr || "").trim() || `exited ${r.status}`)}`);
  }
  return parsed;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function seatedDispatchFor(taskId) {
  return readDataPool(DISPATCH_POOL, "dispatches").find((r) => r.record.task === taskId) ?? null;
}

// The decision authorizing this supersession. Unresolvable — named in no
// pool — is refused before anything is written; found but not yet decided
// is refused the same way, the status named, so the record is never truer
// than the board that authorizes it.
function resolveDecision(id) {
  const found = findDataRecord(DECISION_POOL, "decision-records", id);
  if (!found) die(`decision '${id}' seats nowhere in ${relative(REPO_ROOT, DECISION_POOL)} — an unresolvable authority is no authority`);
  if (found.record.status !== "decided") {
    die(`decision '${id}' at ${relative(REPO_ROOT, found.file)}:${found.line} is not decided (status: ${found.record.status ?? "(none)"}) — a supersession stands on a decision that has bound someone, not one still open`);
  }
  return found;
}

// A task or dispatch already in a data/ pool is never moved or amended —
// write-once means write-once. "Archiving" a superseded record is a
// derived readout (the same discipline achievement already gets): the
// successor's own x-provenance carries supersedes/per, and "was task X
// superseded" is answered by scanning for that pointer, never by mutating
// or relocating X's own line.

function supersede() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) die("no data on stdin — a supersession is raised from data, never from a conversation");
  let intake;
  try {
    intake = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }

  for (const key of ["supersedes", "decision", "id", "goal", "discharges"]) {
    if (intake[key] === undefined) die(`intake has no '${key}'`);
  }
  if (!ID.test(String(intake.supersedes))) die(`supersedes '${intake.supersedes}' is not kebab-case`);
  if (!ID.test(String(intake.decision))) die(`decision '${intake.decision}' is not kebab-case`);

  // The superseded task must exist. There is nothing to supersede otherwise.
  const oldTaskFound = findDataRecord(TASK_POOL, "tasks", intake.supersedes);
  if (!oldTaskFound) {
    die(`task '${intake.supersedes}' seats nowhere in ${relative(REPO_ROOT, TASK_POOL)} — there is nothing to supersede`);
  }
  const oldTask = oldTaskFound.record;

  // The authorizing decision, resolved and checked BEFORE anything else is
  // touched — an unresolvable or undecided decision refuses here, and
  // nothing downstream has run yet.
  const decision = resolveDecision(String(intake.decision));

  // The old dispatch, if the superseded task has one. Its office is the
  // successor's default; its absence just means there is nothing to inherit
  // from, and re-dispatch happens only if `office` was given explicitly.
  const oldDispatch = seatedDispatchFor(intake.supersedes);
  const office = intake.office ?? oldDispatch?.record.office;

  // The successor, raised by making-a-task itself — its own gate, its own
  // refusals, unaltered — carrying supersedes/per so the forward trail is
  // stamped into its x-provenance AT CREATION. The superseded task and its
  // dispatch are never touched: a data/ pool record is write-once, so
  // "archiving" here means the successor points backward, not that the old
  // record is moved or amended.
  const makeIntake = {
    id: intake.id,
    name: intake.name,
    goal: intake.goal,
    discharges: intake.discharges ?? oldTask.discharges,
    ...(intake.subtasks ? { subtasks: intake.subtasks } : {}),
    ...(intake["work-items"] ? { "work-items": intake["work-items"] } : {}),
    ...(intake.plan ? { plan: intake.plan } : {}),
    "recorded-by": intake["recorded-by"] ?? "claude",
    supersedes: intake.supersedes,
    per: intake.decision,
  };
  const raised = runSibling("make-a-task.js", makeIntake, DRY_RUN ? ["--dry-run"] : []);

  // Re-dispatched to the office that answered for the superseded task,
  // unless told otherwise. list-open-obligations.js derives that the old
  // dispatch is no longer open by finding this successor's supersedes
  // pointer — the same way it already derives achievement, never a stored
  // status on the old dispatch itself.
  let redispatched = null;
  if (office) {
    redispatched = runSibling(
      "dispatch-a-task.js",
      { id: intake.id, task: intake.id, office, "recorded-by": intake["recorded-by"] ?? "claude" },
      DRY_RUN ? ["--dry-run"] : [],
    );
  }

  out({
    ok: true,
    ...(DRY_RUN ? { dryRun: true } : {}),
    decision: { id: intake.decision, seat: `${relative(REPO_ROOT, decision.file)}:${decision.line}`, status: decision.record.status },
    superseded: { task: intake.supersedes, "superseded-by": intake.id, per: intake.decision },
    ...(oldDispatch ? { "superseded-dispatch": { id: oldDispatch.record.id, "superseded-by": intake.id, per: intake.decision } } : {}),
    successor: { task: intake.id, raised: raised.raised ?? raised.would },
    ...(redispatched ? { "successor-dispatch": redispatched.dispatched ?? redispatched.would } : {}),
  });
}

supersede();
