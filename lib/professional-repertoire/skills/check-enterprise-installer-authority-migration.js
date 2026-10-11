#!/usr/bin/env node
/**
 * Five-cell acceptance checker for the enterprise-installer authority
 * migration.  This is deliberately a reader: task changes are made through
 * supersede-a-task.js, projections through project-a-skill.js, and this file
 * only re-derives whether those acts settled the accepted requirement.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(argValue("--root") ?? process.cwd());
const CASE = argValue("--case");
const TASKS = join(ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/state/tasks");
const DISPATCHES = join(ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/state/dispatches");
const TASK_ARCHIVE = join(TASKS, "_archive");
const DISPATCH_ARCHIVE = join(DISPATCHES, "_archive");

const INSTALLER = "node lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills/install-an-enterprise-in-claude.js";
const TEMP = "d=$(mktemp -d .enterprise-install-authority-XXXXXX)";
const DRY = `bash -c 'set -e; ${TEMP}; trap "rm -rf $d" EXIT; ${INSTALLER} lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management "$d" --dry-run --root . --authority-root . >/dev/null 2>&1'`;
const INSTALL_CLEAN = `bash -c 'set -e; ${TEMP}; trap "rm -rf $d" EXIT; ${INSTALLER} lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management "$d" --root . --authority-root . >/dev/null 2>&1; ${INSTALLER} lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management "$d" --clean --root . --authority-root . >/dev/null 2>&1; [ -z "$(ls -A "$d")" ]'`;
const NEGATIVE = `bash -c 'set -e; ${TEMP}; trap "rm -rf $d" EXIT; out=$(${INSTALLER} lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management "$d" --dry-run --root . --authority-root . 2>&1); printf "%s\\n" "$out" | grep -qF "install-an-enterprise-in-claude: dry run — would splice"; ! printf "%s\\n" "$out" | grep -qF "install-an-enterprise-in-claude: installed enterprise"'`;

const MIGRATIONS = [
  {
    old: "commission-the-red-army-office",
    successor: "commission-the-red-army-office-with-explicit-authority",
    office: "strategy-and-development-committee",
    discharges: "commissioning-an-office",
    workItems: ["decide-the-red-armys-role-in-the-open", "design-the-red-army-office", "verify-red-army-seating-breaks-no-installer"],
    goals: [
      "bash -c 'test -f lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/offices/red-army.json'",
      "bash -c 'test -f lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/records/decision-records/assign-the-red-army-a-role.json'",
      DRY,
    ],
  },
  {
    old: "make-the-install-witness-honest",
    successor: "make-the-install-witness-honest-with-explicit-authority",
    office: "module-developer",
    discharges: "realizing-a-requirement",
    workItems: ["fix-the-dry-run-tense", "make-clean-remove-residue", "enrich-the-manifest", "fix-the-failure-banner"],
    goals: [INSTALL_CLEAN, NEGATIVE],
  },
  {
    old: "repair-the-enterprise-installing-its-own-roster",
    successor: "repair-the-enterprise-roster-with-explicit-authority",
    office: "engineering-process-group",
    discharges: "normalizing-a-units-management-records",
    workItems: ["align-the-conops-duty-and-skill-names", "reinstall-the-enterprise-roster"],
    goals: [
      DRY,
      "bash -c 'grep -q strategy-and-development-committee CLAUDE.md && ! grep -q chief-of-staff CLAUDE.md'",
    ],
  },
  {
    old: "repin-commission-the-army-offices-goal-to-the-content-pool",
    successor: "commission-the-army-offices-from-content-with-explicit-authority",
    office: "strategy-and-development-committee",
    discharges: "commissioning-an-office",
    workItems: [
      "design-the-blue-army-office",
      "design-the-white-army-office",
      "design-the-black-army-office",
      "ground-each-theory-basis-in-historical-office-and-modern-standard",
      "verify-seating-breaks-no-installer",
    ],
    goals: [
      "bash -c 'for o in blue-army white-army black-army; do test -f lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/offices/$o.json || exit 1; done'",
      DRY,
    ],
  },
];

const HISTORICAL = [
  {
    path: join(TASK_ARCHIVE, "commission-the-army-offices.json"),
    sha256: "bc84df807c1f1ad7f0b79ecf41bd6b2df57adf4edaa6ba2a26ce47cfddc40193",
  },
  {
    path: join(DISPATCH_ARCHIVE, "commission-the-army-offices.json"),
    sha256: "9bdc0127d836dd7a73e81437daf31c130ef299c35aeddeaff40f1f2710024b5c",
  },
];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

function result(cell, checks) {
  const gap = checks.filter((check) => !check.held);
  return { ok: gap.length === 0, cell, checks, gap };
}

function activeTaskAcceptance() {
  const checks = [];
  const decisions = new Set();
  for (const item of MIGRATIONS) {
    const liveOldTask = join(TASKS, `${item.old}.json`);
    const liveOldDispatch = join(DISPATCHES, `${item.old}.json`);
    const archivedTask = join(TASK_ARCHIVE, `${item.old}.json`);
    const archivedDispatch = join(DISPATCH_ARCHIVE, `${item.old}.json`);
    const successorTask = join(TASKS, `${item.successor}.json`);
    const successorDispatch = join(DISPATCHES, `${item.successor}.json`);

    checks.push({ id: `${item.old}:old-not-live`, held: !existsSync(liveOldTask) && !existsSync(liveOldDispatch) });
    checks.push({ id: `${item.old}:archived`, held: existsSync(archivedTask) && existsSync(archivedDispatch) });
    checks.push({ id: `${item.successor}:live`, held: existsSync(successorTask) && existsSync(successorDispatch) });
    if (![archivedTask, archivedDispatch, successorTask, successorDispatch].every(existsSync)) continue;

    const oldTask = readJson(archivedTask);
    const oldDispatch = readJson(archivedDispatch);
    const task = readJson(successorTask);
    const dispatch = readJson(successorDispatch);
    const per = oldTask["x-provenance"]?.per;
    decisions.add(per);
    checks.push({
      id: `${item.old}:history`,
      held: oldTask["x-provenance"]?.["superseded-by"] === item.successor
        && oldDispatch["x-provenance"]?.["superseded-by"] === item.successor
        && oldDispatch["x-provenance"]?.per === per
        && typeof per === "string",
      observed: { per },
    });
    checks.push({
      id: `${item.successor}:preserved-acceptance`,
      held: task.id === item.successor
        && task.discharges === item.discharges
        && same(task["work-items"], item.workItems)
        && same(task.goal, item.goals)
        && task["x-provenance"]?.supersedes === item.old
        && dispatch.task === item.successor
        && dispatch.office === item.office,
    });
    for (const [index, goal] of task.goal.entries()) {
      const invocations = count(goal, "install-an-enterprise-in-claude.js");
      if (!invocations) continue;
      checks.push({
        id: `${item.successor}:goal-${index + 1}-authority`,
        held: count(goal, "--authority-root .") === invocations
          && count(goal, "--root .") === invocations
          && goal.includes(TEMP)
          && !goal.includes("mktemp -d)"),
        observed: { invocations, authorityFlags: count(goal, "--authority-root ."), rootFlags: count(goal, "--root .") },
      });
    }
  }
  checks.push({ id: "one-decided-change-covers-four-supersessions", held: decisions.size === 1 && !decisions.has(undefined), observed: [...decisions] });
  if (decisions.size === 1) {
    const id = [...decisions][0];
    const path = join(ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/records/decision-records", `${id}.json`);
    checks.push({ id: "authorizing-change-is-decided", held: existsSync(path) && readJson(path).status === "decided", observed: relative(ROOT, path) });
  }
  return result("migration:active-task-acceptance", checks);
}

function negativeWitness() {
  const item = MIGRATIONS.find((entry) => entry.old === "make-the-install-witness-honest");
  const path = join(TASKS, `${item.successor}.json`);
  const checks = [{ id: "successor-seats", held: existsSync(path) }];
  if (!existsSync(path)) return result("migration:negative-witness-non-vacuous", checks);
  const task = readJson(path);
  const command = task.goal?.[1];
  checks.push({
    id: "negative-command-is-the-reviewed-fixture",
    held: command === NEGATIVE,
  });
  if (command === NEGATIVE) {
    const run = spawnSync("bash", ["-c", command], { cwd: ROOT, encoding: "utf8" });
    checks.push({
      id: "authorized-dry-run-positive-before-completed-witness-absence",
      held: run.status === 0,
      observed: { exit: run.status, stderr: run.stderr.trim().slice(-1000) },
    });
  }
  return result("migration:negative-witness-non-vacuous", checks);
}

function documentationProjections() {
  const checks = [];
  const sources = [
    {
      flat: join(HERE, "install-an-enterprise-in-claude.js"),
      gerund: "installing-an-enterprise-in-claude",
      copies: [join(HERE, "installing-an-enterprise-in-claude"), join(ROOT, ".claude/skills/installing-an-enterprise-in-claude")],
    },
    {
      flat: join(HERE, "install-an-enterprise-in-codex.js"),
      gerund: "installing-an-enterprise-in-codex",
      copies: [join(HERE, "installing-an-enterprise-in-codex"), join(ROOT, ".agents/skills/installing-an-enterprise-in-codex")],
    },
  ];
  const scratch = mkdtempSync(join(tmpdir(), "enterprise-installer-projections-"));
  try {
    for (const source of sources) {
      const text = readFileSync(source.flat, "utf8");
      const runBlock = /## Run it[\s\S]*?```sh\n([\s\S]*?)\n \* ```/u.exec(text)?.[1] ?? "";
      const examples = runBlock.split("\n").map((line) => line.replace(/^ \* ?/u, "")).filter((line) => line.startsWith("node "));
      checks.push({
        id: `${source.gerund}:runnable-examples-name-authority`,
        held: examples.length === 5 && examples.every((line) => count(line, "--authority-root") === 1 && count(line, "--root") === 1),
        observed: examples,
      });
      const projection = spawnSync(process.execPath, [
        join(HERE, "project-a-skill.js"), source.flat,
        "--from", join(ROOT, "lib/emsenn"),
        "--target", scratch,
      ], { cwd: ROOT, encoding: "utf8" });
      checks.push({ id: `${source.gerund}:fresh-projection`, held: projection.status === 0, observed: projection.stderr.trim().slice(-1000) });
      if (projection.status !== 0) continue;
      const fresh = join(scratch, source.gerund);
      for (const copy of source.copies) {
        checks.push({
          id: `${source.gerund}:${relative(ROOT, copy)}`,
          held: existsSync(join(copy, "SKILL.md"))
            && existsSync(join(copy, "scripts", source.flat.endsWith("claude.js") ? "install-an-enterprise-in-claude.js" : "install-an-enterprise-in-codex.js"))
            && readFileSync(join(copy, "SKILL.md"), "utf8") === readFileSync(join(fresh, "SKILL.md"), "utf8")
            && readFileSync(join(copy, "scripts", source.flat.endsWith("claude.js") ? "install-an-enterprise-in-claude.js" : "install-an-enterprise-in-codex.js"), "utf8")
              === readFileSync(join(fresh, "scripts", source.flat.endsWith("claude.js") ? "install-an-enterprise-in-claude.js" : "install-an-enterprise-in-codex.js"), "utf8"),
        });
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  return result("migration:documentation-one-source", checks);
}

function archiveHistory() {
  const checks = HISTORICAL.map((item) => ({
    id: relative(ROOT, item.path),
    held: existsSync(item.path) && sha256(item.path) === item.sha256,
    expected: item.sha256,
    observed: existsSync(item.path) ? sha256(item.path) : null,
  }));
  for (const item of HISTORICAL) {
    if (!existsSync(item.path)) continue;
    const record = readJson(item.path);
    checks.push({
      id: `${relative(ROOT, item.path)}:historical-status`,
      held: record["x-provenance"]?.["superseded-by"] === "repin-commission-the-army-offices-goal-to-the-content-pool"
        && record["x-provenance"]?.per === "repin-five-goals-stale-since-the-class-instance-migration",
    });
  }
  return result("migration:archive-historical-and-immutable", checks);
}

function affectedTaskReverification() {
  const checks = [];
  for (const item of MIGRATIONS) {
    const task = join(TASKS, `${item.successor}.json`);
    if (!existsSync(task)) {
      checks.push({ id: item.successor, held: false, observed: "successor does not seat" });
      continue;
    }
    const run = spawnSync(process.execPath, [join(HERE, "make-a-task.js"), "--verify", item.successor, "--pool", TASKS, "--root", ROOT], { cwd: ROOT, encoding: "utf8" });
    let witness;
    try { witness = JSON.parse(run.stdout); } catch { witness = { stdout: run.stdout.trim(), stderr: run.stderr.trim() }; }
    checks.push({ id: item.successor, held: run.status === 0 && witness.achieved === true, observed: witness });
  }
  return result("migration:affected-task-reverification", checks);
}

const cases = {
  "active-task-acceptance": activeTaskAcceptance,
  "negative-witness": negativeWitness,
  "documentation-projections": documentationProjections,
  "archive-history": archiveHistory,
  "affected-task-reverification": affectedTaskReverification,
};

if (!CASE || !cases[CASE]) {
  process.stderr.write(`usage: ${relative(ROOT, fileURLToPath(import.meta.url))} --case ${Object.keys(cases).join("|")} --root <repo>\n`);
  process.exit(2);
}

const answer = cases[CASE]();
process.stdout.write(`${JSON.stringify(answer, null, 2)}\n`);
process.exit(answer.ok ? 0 : 1);
