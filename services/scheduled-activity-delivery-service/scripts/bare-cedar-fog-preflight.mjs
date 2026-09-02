#!/usr/bin/env node

import { accessSync, constants, existsSync, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectAcceptedSchedules, inspectTarget } from "../src/service.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, "..");
const TIMER = "scheduled-activity-delivery-run-due.timer";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

function isFile(path) {
  try { return lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(); }
  catch { return false; }
}

function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return statSync(realpathSync(path)).isFile();
  } catch { return false; }
}

function unitValue(unit, name) {
  return unit.match(new RegExp(`^${name}=(.+)$`, "mu"))?.[1] ?? null;
}

function repositoryRoot(from) {
  let directory = resolve(from);
  while (!existsSync(join(directory, "lib", "emsenn"))) {
    const parent = dirname(directory);
    if (parent === directory) throw new Error("no repository root exists above the service root");
    directory = parent;
  }
  return directory;
}

export function preflight({
  serviceRoot = DEFAULT_ROOT,
  home = homedir(),
  structuralOnly = false,
  inspectSchedules = inspectAcceptedSchedules,
  inspectTargetRuntime = inspectTarget,
  spawnProcess = spawnSync,
} = {}) {
  const root = resolve(serviceRoot);
  const deployment = join(root, "content", "deployments", "bare-cedar-fog");
  const servicePath = join(deployment, "scheduled-activity-delivery-run-due.service");
  const timerPath = join(deployment, TIMER);
  const problems = [];
  const check = (condition, problem) => { if (!condition) problems.push(problem); };

  check(isFile(join(root, "package.json")), "service package.json is absent or unsafe");
  check(isFile(join(root, "src", "service.mjs")), "service entrypoint is absent or unsafe");
  check(isFile(servicePath) && isFile(timerPath), "Bare Cedar Fog unit or timer is absent or unsafe");

  let service = "";
  let timer = "";
  if (isFile(servicePath)) service = readFileSync(servicePath, "utf8");
  if (isFile(timerPath)) timer = readFileSync(timerPath, "utf8");

  try {
    const repoRoot = repositoryRoot(root);
    const expectedWorkingDirectory = `%h/info/${relative(repoRoot, root).split(sep).join("/")}`;
    check(unitValue(service, "WorkingDirectory") === expectedWorkingDirectory, "unit WorkingDirectory is not the current repository service root");
    const installedWorkingDirectory = unitValue(service, "WorkingDirectory");
    const installedRoot = installedWorkingDirectory?.startsWith("%h/")
      ? resolve(home, installedWorkingDirectory.slice(3))
      : null;
    check(installedRoot === root, "preflight service root is not the exact tree the installed unit will execute");
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error));
  }
  check(unitValue(service, "ExecStart") === "%h/.local/bin/node src/service.mjs --operation run-due", "unit does not use the admitted host Node carrier for run-due");
  check(/^Environment=SCHEDULED_ACTIVITY_DELIVERY_ACTOR=urn:ame:scheduled-activity-delivery-service$/mu.test(service), "unit does not carry the admitted provider actor");
  check(/^Environment=SCHEDULED_ACTIVITY_DELIVERY_ROOT=%h\/info\/lib\/emsenn\/services\/561-group\/services\/operations-services-section\/services\/agent-services-section\/services\/scheduled-activity-delivery-service$/mu.test(service), "unit does not carry the admitted section root");
  check(unitValue(timer, "Unit") === "scheduled-activity-delivery-run-due.service", "timer does not target the admitted service unit");
  check(/^OnUnitActiveSec=1min$/mu.test(timer), "timer cadence is not the admitted one-minute pulse");

  const nodePath = join(home, ".local", "bin", "node");
  check(isExecutable(nodePath), "host Node carrier is absent, unsafe, or not executable");
  if (isExecutable(nodePath) && isFile(join(root, "package.json"))) {
    try {
      const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
      check(pkg?.bin?.["run-due"] === "./src/service.mjs", "package does not advertise run-due at the inspected service entrypoint");
      const dependencies = Object.keys(pkg.dependencies ?? {});
      const resolution = spawnProcess(nodePath, ["--input-type=module", "--eval", `for (const dependency of ${JSON.stringify(dependencies)}) import.meta.resolve(dependency);`], { cwd: root, encoding: "utf8" });
      if (resolution.status !== 0) problems.push(`required dependency closure is not resolvable by the host Node carrier${resolution.stderr?.trim() ? `: ${resolution.stderr.trim().split("\n").at(-1)}` : ""}`);
    } catch { problems.push("service package.json is invalid JSON"); }
  }

  let schedules = [];
  if (!structuralOnly) {
    try { schedules = inspectSchedules({ root }); }
    catch (error) { problems.push(`accepted schedules cannot be inspected: ${error instanceof Error ? error.message : String(error)}`); }
  }
  const liveSchedules = schedules.filter((schedule) => schedule.executionMode === "live");
  const staleTargetSchedules = liveSchedules.filter((schedule) => {
    const current = inspectTargetRuntime(schedule.target);
    const binding = schedule.targetBinding;
    return current.problem || binding?.packageDigest !== current.packageDigest
      || binding.selectedBinDigest !== current.selectedBinDigest
      || binding.runtimeClosureDigest !== current.runtimeClosureDigest;
  });
  const activationProblems = structuralOnly
    ? ["structural-only preflight does not establish accepted schedule authority"]
    : [
      ...(liveSchedules.length === 0 ? ["no accepted active live schedule permits enabling the timer"] : []),
      ...(staleTargetSchedules.length > 0 ? ["one or more accepted live schedules no longer match their inspected target runtime closure"] : []),
      ...problems,
    ];

  return Object.freeze({
    type: "BareCedarFogScheduleDeliveryPreflight",
    ready: problems.length === 0,
    activationReady: activationProblems.length === 0,
    structuralOnly,
    serviceRoot: root,
    nodeCarrier: nodePath,
    acceptedSchedules: schedules,
    acceptedLiveSchedules: liveSchedules,
    staleTargetSchedules: staleTargetSchedules.map((schedule) => schedule.scheduleId),
    problems,
    activationProblems,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const structuralOnly = process.argv.includes("--structural-only");
  const result = preflight({
    serviceRoot: option("--service-root", DEFAULT_ROOT),
    structuralOnly,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (structuralOnly ? !result.ready : !result.activationReady) process.exitCode = 2;
}
