#!/usr/bin/env node
/**
 * @description Reads anomalies, their effective source-linked tasks, and dispatches as one derived frontier: unrouted, tasked-undispatched, open, settled, or contradiction. It reuses making-a-task verification and writes no status or closure field.
 *
 * @returns {object} every admitted anomaly id appears exactly once or is named as a duplicate contradiction
 * @returns {object} open and settled are derived by executing the linked task goal
 *
 * Anomaly, task, and dispatch pools are readable.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = arg("--root") ?? process.cwd();
const UNIT = join(ROOT, "lib/emsenn");
function arg(flag) { const i = process.argv.indexOf(flag); return i < 0 ? undefined : process.argv[i + 1]; }
function findUp(from, shape) { for (let at = from;; at = dirname(at)) { const hit = join(at, shape); if (existsSync(hit)) return hit; if (dirname(at) === at) return null; } }
function finish(value, code) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); process.exit(code); }
const skills = findUp(HERE, "lib/management/skills");
if (!skills) finish({ ok: false, error: "cannot find the canonical management skills pool" }, 1);
const { dataDir, readDataPool } = await import(pathToFileURL(join(skills, "resolve-an-identifier.js")));
const anomalyPool = arg("--anomaly-pool") ?? dataDir(UNIT, "anomalies");
const taskPool = arg("--task-pool") ?? dataDir(UNIT, "tasks");
const dispatchPool = arg("--dispatch-pool") ?? dataDir(UNIT, "dispatches");
const anomalies = readDataPool(anomalyPool, "anomalies").map((entry) => entry.record);
const tasks = readDataPool(taskPool, "tasks").map((entry) => entry.record);
const dispatches = readDataPool(dispatchPool, "dispatches").map((entry) => entry.record);
const superseded = new Set(tasks.map((task) => task?.["x-provenance"]?.supersedes).filter(Boolean));
const effective = tasks.filter((task) => !superseded.has(task.id));
const byId = new Map();
for (const record of anomalies) byId.set(record.id, [...(byId.get(record.id) ?? []), record]);
const frontier = [];

for (const [id, records] of [...byId].sort(([a], [b]) => a.localeCompare(b))) {
  if (records.length !== 1) { frontier.push({ anomaly: id, state: "contradiction", reason: `${records.length} anomaly records share this id` }); continue; }
  const linked = effective.filter((task) => task?.["source-record"] === `anomalies/${id}`);
  if (linked.length === 0) { frontier.push({ anomaly: id, state: "unrouted" }); continue; }
  if (linked.length > 1) { frontier.push({ anomaly: id, state: "contradiction", reason: `${linked.length} effective tasks name this anomaly`, tasks: linked.map((task) => task.id) }); continue; }
  const task = linked[0];
  const handed = dispatches.filter((dispatch) => dispatch.task === task.id);
  if (handed.length === 0) { frontier.push({ anomaly: id, task: task.id, state: "tasked-undispatched" }); continue; }
  if (handed.length > 1) { frontier.push({ anomaly: id, task: task.id, state: "contradiction", reason: `${handed.length} dispatches name this task` }); continue; }
  const verify = spawnSync(process.execPath, [join(skills, "make-a-task.js"), "--verify", task.id, "--root", ROOT, "--pool", taskPool], { encoding: "utf8" });
  let verdict; try { verdict = JSON.parse(verify.stdout); } catch { frontier.push({ anomaly: id, task: task.id, state: "contradiction", reason: `task verification returned no JSON: ${(verify.stderr || verify.stdout || "").trim()}` }); continue; }
  if (typeof verdict.achieved !== "boolean") { frontier.push({ anomaly: id, task: task.id, state: "contradiction", reason: verdict.error ?? "task verification returned no achievement readout" }); continue; }
  frontier.push({ anomaly: id, task: task.id, dispatch: handed[0].id, office: handed[0].office, state: verdict.achieved ? "settled" : "open", ...(verdict.achieved ? {} : { gap: verdict.gap }) });
}

const contradictions = frontier.filter((entry) => entry.state === "contradiction").length;
const outstanding = frontier.filter((entry) => ["unrouted", "tasked-undispatched", "contradiction"].includes(entry.state)).length;
finish({ ok: contradictions === 0, anomalies: frontier.length, frontier }, contradictions || (process.argv.includes("--check") && outstanding) ? 1 : 0);
