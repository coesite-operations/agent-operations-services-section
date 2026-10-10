#!/usr/bin/env node
/**
 * @description Reads task goals and reports every direct whole-file hash of a review carrier that already contains multiple review acts. Use --check to exercise the detector and derive the live offender register without changing task records; use --gate to refuse while an offender remains. Content-bounded section hashes and separate single-review carriers are not offenders.
 *
 * @param {string} root - names a readable tree containing one or more content/tasks or legacy lib/management/tasks pools
 * @returns {object} every finding names the task, goal index, exact goal, review carrier, and evidence that the carrier contains multiple review acts
 *
 * The checker never writes, edits, or supersedes a task or review carrier.
 *
 * A review-history document may lawfully grow by appending another review.
 * Its whole-file digest is therefore not immutable evidence for an earlier
 * task.  A bounded section digest is stable because bytes outside the selected
 * section do not enter the digest.  A separate carrier containing one review
 * act is also accepted: its file boundary is the evidence boundary.
 *
 * `--check` checks this detector and derives the register.  Findings do not
 * make that meta-check fail, because the dispatched task forbids this office
 * from editing the offending records.  `--gate` is the policy gate used when
 * admitting or sweeping task goals; it exits 3 if the register is nonempty.
 */

import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const SKIP = new Set([
  ".git", ".claude", ".codex", ".agents", "node_modules", "dist", "build",
  "coverage", "_archive", "archive", "preservation", "fixtures",
]);

function emit(value, code = 0) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  process.exit(code);
}

function misuse(message) {
  process.stderr.write(`check-task-goal-review-evidence-stability: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { root: null, mode: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) misuse("--root requires a directory");
      args.root = value;
    } else if (arg === "--check" || arg === "--gate") {
      if (args.mode) misuse("choose exactly one of --check or --gate");
      args.mode = arg.slice(2);
    } else if (arg === "--help") args.help = true;
    else misuse(`unknown argument '${arg}'`);
  }
  if (args.help) return args;
  if (!args.mode) misuse("choose exactly one of --check or --gate");
  if (!args.root) misuse("--root is required");
  return args;
}

function canonicalRoot(value) {
  let root;
  try { root = realpathSync(resolve(value)); }
  catch (error) { misuse(`--root is not a readable directory: ${error.message}`); }
  let stat;
  try { stat = lstatSync(root); }
  catch (error) { misuse(`cannot inspect --root: ${error.message}`); }
  if (!stat.isDirectory() || stat.isSymbolicLink()) misuse("--root must be a non-symlink directory");
  return root;
}

function inside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function isTaskPool(path) {
  if (basename(path) !== "tasks") return false;
  const parent = dirname(path);
  return basename(parent) === "content"
    || (basename(parent) === "management" && basename(dirname(parent)) === "lib");
}

function taskPools(root) {
  const pools = [];
  const visit = (directory) => {
    if (isTaskPool(directory)) {
      pools.push(directory);
      return;
    }
    let entries;
    try { entries = readdirSync(directory, { withFileTypes: true }); }
    catch (error) { misuse(`cannot read '${relative(root, directory)}': ${error.message}`); }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || SKIP.has(entry.name)) continue;
      visit(join(directory, entry.name));
    }
  };
  visit(root);
  if (pools.length === 0) misuse("no content/tasks or legacy lib/management/tasks pool exists below --root");
  return pools.sort();
}

function reviewShape(text) {
  const h1Reviews = text.match(/^# .*review.*$/gimu)?.length ?? 0;
  const reviewResults = text.match(/^review-result\s*:/gimu)?.length ?? 0;
  const verdicts = text.match(/^verdict\s*:/gimu)?.length ?? 0;
  const acts = Math.max(h1Reviews, reviewResults, verdicts);
  return {
    h1Reviews,
    reviewResults,
    verdicts,
    reviewActs: acts,
    mutableHistory: acts > 1,
  };
}

// Return only literal path operands given directly to sha256sum.  A bounded
// pipeline such as `sed -n 10,20p review.md | sha256sum` has no path operand
// after sha256sum and therefore cannot be mistaken for a whole-file digest.
function directSha256Paths(goal) {
  const paths = [];
  const command = /\bsha256sum\b([^|;&\n]*)/gu;
  for (const match of goal.matchAll(command)) {
    const tail = match[1].trim();
    if (!tail) continue;
    const words = tail.match(/"[^"]*"|'[^']*'|\S+/gu) ?? [];
    for (let word of words) {
      if (word === "--") continue;
      if (word.startsWith("-")) continue;
      word = word.replace(/^['"]|['"]$/gu, "");
      word = word.replace(/[),]+$/gu, "");
      if (!word || word.includes("$") || word.includes("`")) continue;
      paths.push(word);
    }
  }
  return paths;
}

function inspectGoal(root, taskPath, task, goal, goalIndex, virtualFiles = null) {
  const findings = [];
  for (const operand of directSha256Paths(goal)) {
    const carrier = isAbsolute(operand) ? resolve(operand) : resolve(root, operand);
    if (!inside(root, carrier)) continue;
    let text;
    if (virtualFiles?.has(operand)) text = virtualFiles.get(operand);
    else {
      if (!existsSync(carrier)) continue;
      let stat;
      try { stat = lstatSync(carrier); }
      catch { continue; }
      if (!stat.isFile() || stat.isSymbolicLink()) continue;
      try { text = readFileSync(carrier, "utf8"); }
      catch (error) { misuse(`cannot read review carrier '${relative(root, carrier)}': ${error.message}`); }
    }
    const shape = reviewShape(text);
    if (!shape.mutableHistory) continue;
    findings.push({
      rule: "no-whole-mutable-review-carrier-hash",
      task: typeof task.id === "string" ? task.id : basename(taskPath, ".json"),
      taskPath: relative(root, taskPath),
      goalIndex,
      goal,
      carrier: virtualFiles ? operand : relative(root, carrier),
      evidence: shape,
      refusal: "whole-file digest spans multiple review acts; use a bounded immutable section digest or a separate immutable review carrier",
    });
  }
  return findings;
}

function scan(root) {
  const offenders = [];
  let tasksExamined = 0;
  let goalsExamined = 0;
  for (const pool of taskPools(root)) {
    let names;
    try { names = readdirSync(pool).filter((name) => name.endsWith(".json")).sort(); }
    catch (error) { misuse(`cannot read task pool '${relative(root, pool)}': ${error.message}`); }
    for (const name of names) {
      const path = join(pool, name);
      let task;
      try { task = JSON.parse(readFileSync(path, "utf8")); }
      catch (error) { misuse(`task '${relative(root, path)}' is unreadable JSON: ${error.message}`); }
      if (!Array.isArray(task.goal)) continue;
      tasksExamined += 1;
      task.goal.forEach((goal, goalIndex) => {
        if (typeof goal !== "string") return;
        goalsExamined += 1;
        offenders.push(...inspectGoal(root, path, task, goal, goalIndex));
      });
    }
  }
  return { tasksExamined, goalsExamined, offenders };
}

function selfCheck(root) {
  const mutable = [
    "# First conformance review", "review-result: FAIL", "verdict: DOES NOT CONFORM",
    "# Appended conformance review", "review-result: PASS", "verdict: CONFORMS",
  ].join("\n");
  const immutable = ["# One separate review", "review-result: PASS", "verdict: CONFORMS"].join("\n");
  const files = new Map([["mutable-review.md", mutable], ["one-review.md", immutable]]);
  const fixture = { id: "fixture" };
  const path = join(root, "fixture-task.json");
  const whole = inspectGoal(root, path, fixture, "test $(sha256sum mutable-review.md | cut -c1-64) = abc", 0, files);
  const bounded = inspectGoal(root, path, fixture, "test $(sed -n 4,6p mutable-review.md | sha256sum | cut -c1-64) = abc", 1, files);
  const separate = inspectGoal(root, path, fixture, "test $(sha256sum one-review.md | cut -c1-64) = abc", 2, files);
  const held = whole.length === 1 && bounded.length === 0 && separate.length === 0;
  return {
    held,
    cases: {
      wholeMutableCarrierRefused: whole.length === 1,
      boundedSectionAllowed: bounded.length === 0,
      separateSingleReviewCarrierAllowed: separate.length === 0,
    },
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  process.stdout.write("usage: check-task-goal-review-evidence-stability.js (--check|--gate) --root DIR\n");
  process.exit(0);
}

const root = canonicalRoot(args.root);
const derived = scan(root);
if (args.mode === "check") {
  const contract = selfCheck(root);
  emit({
    ok: contract.held,
    mode: "check",
    root,
    contract,
    conformant: derived.offenders.length === 0,
    ...derived,
  }, contract.held ? 0 : 1);
}

const conformant = derived.offenders.length === 0;
emit({ ok: conformant, mode: "gate", root, conformant, ...derived }, conformant ? 0 : 3);
