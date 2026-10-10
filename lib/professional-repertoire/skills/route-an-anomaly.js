#!/usr/bin/env node
/**
 * @description Joins one admitted anomaly to one goal-bearing task and dispatches that task to an explicitly supplied seated office. It composes making-a-task and dispatching-a-task, never infers ownership from the reporter's lane, and resumes an interrupted task-to-dispatch hand-off without duplicating either edge.
 *
 * @throws {Error} Refuses unless the anomaly resolves exactly once and the intake explicitly names the receiving office.
 * @throws {Error} Refuses when another effective task already names this anomaly as its source-record.
 *
 * After a successful run, exactly one effective task names the anomaly and exactly one dispatch hands it to the supplied office.
 *
 * Quality Operations routes and never repairs. The reporter's lane is evidence,
 * not authority; therefore office is mandatory intake. A failure after the task
 * append is returned as explicit resumable residue rather than hidden as success.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = arg("--root") ?? process.cwd();
const UNIT = join(ROOT, "lib/emsenn");
const DRY_RUN = process.argv.includes("--dry-run");

function arg(flag) { const i = process.argv.indexOf(flag); return i < 0 ? undefined : process.argv[i + 1]; }
function out(value, code = 0) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); process.exit(code); }
function die(error, extra = {}) { out({ ok: false, error, ...extra }, 1); }
function findUp(from, shape) {
  for (let at = from;; at = dirname(at)) {
    const hit = join(at, shape); if (existsSync(hit)) return hit;
    if (dirname(at) === at) return null;
  }
}

const skills = findUp(HERE, "lib/management/skills");
if (!skills) die("cannot find the canonical management skills pool");
const resolverPath = join(skills, "resolve-an-identifier.js");
const { dataDir, findUnit, readDataPool, resolveIdentifier } = await import(pathToFileURL(resolverPath));
const anomalyPool = arg("--anomaly-pool") ?? dataDir(UNIT, "anomalies");
const taskPool = arg("--task-pool") ?? dataDir(UNIT, "tasks");
const workItemPool = arg("--work-item-pool") ?? dataDir(UNIT, "work-items");
const dispatchPool = arg("--dispatch-pool") ?? dataDir(UNIT, "dispatches");
const dutyPool = arg("--duty-pool") ?? join(ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/duties");
const schemas = arg("--schemas") ?? join(ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas");
const officeFrom = arg("--office-from") ?? dirname(dirname(dutyPool));

let intake;
try { intake = JSON.parse(readFileSync(0, "utf8")); } catch (error) { die(`stdin is not JSON: ${error.message}`); }
for (const key of ["anomaly", "office", "task", "goal", "work-items"]) {
  if (intake?.[key] === undefined) die(`routing intake has no '${key}'`);
}
const source = `anomalies/${intake.anomaly}`;
const anomalyHits = readDataPool(anomalyPool, "anomalies").filter((entry) => entry.record?.id === intake.anomaly);
if (anomalyHits.length !== 1) die(`anomaly '${intake.anomaly}' resolves ${anomalyHits.length} times; routing requires exactly one sensor record`);
const unitRoot = findUnit(officeFrom) ?? findUnit(HERE);
const officeHit = unitRoot && resolveIdentifier(String(intake.office), { kind: "offices", strategy: "nearest", from: unitRoot });
if (!officeHit?.ok || officeHit.seats.length === 0) die(`office '${intake.office}' seats in no roster — routing requires an explicit real office`);

const tasks = readDataPool(taskPool, "tasks").map((entry) => entry.record);
const superseded = new Set(tasks.map((task) => task?.["x-provenance"]?.supersedes).filter(Boolean));
const sourced = tasks.filter((task) => task?.["source-record"] === source && !superseded.has(task.id));
if (sourced.length > 1 || (sourced.length === 1 && sourced[0].id !== intake.task)) {
  die(`anomaly '${intake.anomaly}' has ${sourced.length} effective task source edges, incompatible with requested task '${intake.task}'`);
}

const dispatches = readDataPool(dispatchPool, "dispatches").map((entry) => entry.record).filter((d) => d.task === intake.task);
if (dispatches.length > 1) die(`task '${intake.task}' has ${dispatches.length} dispatches; refusing a contradictory board`);
if (dispatches.length === 1) {
  if (dispatches[0].office !== intake.office) die(`task '${intake.task}' is already dispatched to '${dispatches[0].office}', not '${intake.office}'`);
  if (sourced.length !== 1) die(`dispatch '${dispatches[0].id}' exists but task '${intake.task}' does not carry source-record '${source}'`);
  out({ ok: true, route: "already-complete", anomaly: intake.anomaly, task: intake.task, dispatch: dispatches[0].id, office: intake.office });
}
const requestedDispatch = intake.dispatch ?? intake.task;
const occupiedDispatch = readDataPool(dispatchPool, "dispatches").map((entry) => entry.record).find((d) => d.id === requestedDispatch);
if (occupiedDispatch) die(`dispatch id '${requestedDispatch}' already names task '${occupiedDispatch.task}'`);

const common = ["--root", ROOT, "--pool", taskPool, "--work-item-pool", workItemPool, "--duty-pool", dutyPool, "--schemas", schemas, "--source-pool", anomalyPool];
let mode = "resumed";
if (sourced.length === 0) {
  const makeInput = { id: intake.task, name: intake.name, goal: intake.goal, discharges: intake.discharges ?? "keeping-the-anomaly-register", "work-items": intake["work-items"], "source-record": source, "recorded-by": intake["recorded-by"] };
  const made = spawnSync(process.execPath, [join(skills, "make-a-task.js"), ...common, ...(DRY_RUN ? ["--dry-run"] : [])], { input: JSON.stringify(makeInput), encoding: "utf8" });
  if (made.status !== 0) die("making-a-task refused the route", { provider: parse(made.stdout), stderr: made.stderr.trim() });
  if (DRY_RUN) out({ ok: true, dryRun: true, route: "would-raise", anomaly: intake.anomaly, task: intake.task, office: intake.office, taskWitness: parse(made.stdout) });
  mode = "raised";
}

const dispatchInput = { id: requestedDispatch, task: intake.task, office: intake.office, "recorded-by": intake["recorded-by"] };
const handed = spawnSync(process.execPath, [join(skills, "dispatch-a-task.js"), "--root", ROOT, "--pool", dispatchPool, "--task-pool", taskPool, "--office-from", officeFrom], { input: JSON.stringify(dispatchInput), encoding: "utf8" });
if (handed.status !== 0) die("dispatching-a-task refused after the task edge was present", { residue: { anomaly: intake.anomaly, task: intake.task, sourceRecord: source, resumable: true }, provider: parse(handed.stdout), stderr: handed.stderr.trim() });
const witness = parse(handed.stdout);
out({ ok: true, route: mode, anomaly: intake.anomaly, task: intake.task, dispatch: witness?.dispatched?.id, office: intake.office });

function parse(text) { try { return JSON.parse(text); } catch { return text?.trim() || null; } }
