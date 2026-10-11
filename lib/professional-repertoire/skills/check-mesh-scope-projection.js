#!/usr/bin/env node
/**
 * @description Exercises the five acceptance cells for the projectable shared mesh-scope carrier: its declared contract and exports, canonical projection and single policy home, prior consumer regressions, import by isolated projected consumers with no flat-source fallback, and byte and syntax integrity across canonical and installed copies. Use to re-derive whether mesh-scope remains one policy carried lawfully to every consumer.
 *
 * @param {string} case - names one accepted mesh-scope projection case
 * @param {string} root - names this worktree
 * @returns {object} exit 0 means the named acceptance cell was exercised from current files and held; exit 1 names the failed assertion and observations
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CASES = new Set([
  "flat-contract-and-exports",
  "canonical-projection-and-policy-home",
  "consumer-mesh-consent-regression",
  "isolated-projected-consumer",
  "projection-and-diff-integrity",
]);

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

const ROOT = resolve(argValue("--root") ?? process.cwd());
const CASE = argValue("--case");
const SKILLS = join(ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills");
const SOURCE = join(SKILLS, "mesh-scope.js");
const PROJECTOR = join(SKILLS, "project-a-skill.js");
const PROJECTED_NAME = "enforcing-mesh-scope";
const EXPECTED_EXPORTS = [
  "MeshScopeError",
  "admitEnterpriseInstall",
  "inspectMeshScope",
  "revalidateEnterpriseInstall",
];
const TARGETS = [
  SKILLS,
  join(ROOT, ".claude/skills"),
  join(ROOT, ".agents/skills"),
];
const PROJECTED_SCRIPTS = TARGETS.map((target) => join(target, PROJECTED_NAME, "scripts/mesh-scope.js"));
const CONSUMERS = [
  {
    name: "normalizer",
    source: join(SKILLS, "normalize-a-units-management-records.js"),
    projections: [join(SKILLS, "normalizing-a-units-management-records/scripts/normalize-a-units-management-records.js")],
  },
  {
    name: "claude-installer",
    source: join(SKILLS, "install-an-enterprise-in-claude.js"),
    projections: [
      join(SKILLS, "installing-an-enterprise-in-claude/scripts/install-an-enterprise-in-claude.js"),
      join(ROOT, ".claude/skills/installing-an-enterprise-in-claude/scripts/install-an-enterprise-in-claude.js"),
    ],
  },
  {
    name: "codex-installer",
    source: join(SKILLS, "install-an-enterprise-in-codex.js"),
    projections: [
      join(SKILLS, "installing-an-enterprise-in-codex/scripts/install-an-enterprise-in-codex.js"),
      join(ROOT, ".agents/skills/installing-an-enterprise-in-codex/scripts/install-an-enterprise-in-codex.js"),
    ],
  },
];

function fail(message, observations = {}) {
  process.stderr.write(`${JSON.stringify({ case: CASE, held: false, message, observations }, null, 2)}\n`);
  process.exit(1);
}

function assert(condition, message, observations = {}) {
  if (!condition) fail(message, observations);
}

function held(observations) {
  process.stdout.write(`${JSON.stringify({ case: CASE, held: true, observations }, null, 2)}\n`);
}

function run(script, args, cwd = ROOT, options = {}) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: options.timeout,
    killSignal: options.killSignal ?? "SIGKILL",
    env: { ...process.env, NODE_NO_WARNINGS: "1", ...(options.env ?? {}) },
  });
  result.elapsedMs = Date.now() - started;
  return result;
}

function resultFacts(result) {
  return {
    status: result.status,
    signal: result.signal,
    elapsedMs: result.elapsedMs,
    error: result.error ? { code: result.error.code, message: result.error.message } : null,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function parseJson(result, label) {
  assert(result.status === 0, `${label} failed`, resultFacts(result));
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    fail(`${label} returned no JSON witness`, { stdout: result.stdout, stderr: result.stderr, cause: error.message });
  }
}

function skillRecord() {
  const result = run(PROJECTOR, [SOURCE, "--record", "--from", ROOT]);
  const witness = parseJson(result, "project-a-skill --record");
  const record = witness.results?.[0]?.record;
  assert(record, "project-a-skill did not return the flat carrier's record", { witness });
  return record;
}

function projectionPath(target) {
  return join(target, PROJECTED_NAME, "scripts/mesh-scope.js");
}

function checkProjection(target) {
  const result = run(PROJECTOR, [SOURCE, "--target", target, "--check", "--from", ROOT]);
  parseJson(result, `project-a-skill --check ${relative(ROOT, target)}`);
}

async function exportsOf(path) {
  const carrier = await import(`${pathToFileURL(path).href}?projection-check=${Date.now()}-${Math.random()}`);
  return Object.keys(carrier).sort();
}

async function flatContractCase() {
  const record = skillRecord();
  assert(record.name === PROJECTED_NAME, "flat source declared an unexpected projected skill name", { name: record.name });
  assert(record["verb-phrase"] === "enforcing mesh scope", "flat source lacks the ruled gerund verb phrase", { record });
  assert(record["closure-kind"] === "process", "shared policy carrier is not declared as a deterministic process", { record });
  assert(record.preconditions?.length >= 2, "flat source lacks an explicit precondition contract", { record });
  assert(record.postconditions?.length >= 3, "flat source lacks an explicit postcondition contract", { record });
  assert(record.witness?.records?.length >= 2, "flat source lacks explicit witnesses", { record });
  const exports = await exportsOf(SOURCE);
  assert(JSON.stringify(exports) === JSON.stringify(EXPECTED_EXPORTS), "flat carrier exports changed", { expected: EXPECTED_EXPORTS, actual: exports });
  held({ source: relative(ROOT, SOURCE), record, exports });
}

async function canonicalProjectionCase() {
  const record = skillRecord();
  assert(record.name === PROJECTED_NAME, "checker and declared projection name disagree", { declared: record.name, expected: PROJECTED_NAME });
  const projected = projectionPath(SKILLS);
  assert(existsSync(projected), "canonical projected carrier is absent", { projected: relative(ROOT, projected) });
  checkProjection(SKILLS);
  assert(readFileSync(projected).equals(readFileSync(SOURCE)), "canonical projection is not byte-identical to the one policy home");
  const classifierSources = readdirSync(SKILLS)
    .filter((name) => name.endsWith(".js"))
    .map((name) => join(SKILLS, name))
    .filter((path) => /statSync\([^\n]*marker[^\n]*\)\.isFile/u.test(readFileSync(path, "utf8")));
  assert(classifierSources.length === 1 && classifierSources[0] === SOURCE, "the flat skills pool has more than one mesh boundary classifier", {
    classifierSources: classifierSources.map((path) => relative(ROOT, path)),
  });
  const exports = await exportsOf(projected);
  assert(JSON.stringify(exports) === JSON.stringify(EXPECTED_EXPORTS), "canonical projected exports differ from the flat carrier", { exports });
  held({ policyHome: relative(ROOT, SOURCE), canonicalProjection: relative(ROOT, projected), classifierHomes: 1, exports });
}

function consumerRegressionCase() {
  const checker = join(SKILLS, "check-enterprise-installer-mesh-authority.js");
  const timeoutMs = 45_000;
  const cases = [
    "checked-out-submodule-boundary",
    "unconsented-crossing",
    "target-local-authority",
    "operated-node",
    "every-entrypoint",
    "enterprise-membrane",
    "shared-gate-and-retired-copies",
  ];
  const witnesses = [];
  for (const meshCase of cases) {
    const runId = `projection-${process.pid}-${meshCase}`;
    const tempRoot = mkdtempSync(join(tmpdir(), `mesh-regression-${runId}-`));
    const result = run(checker, ["--case", meshCase, "--root", ROOT], ROOT, {
      timeout: timeoutMs,
      env: { MESH_CHECK_RUN_ID: runId, TMPDIR: tempRoot },
    });
    const rootResidue = readdirSync(ROOT)
      .filter((name) => (name.startsWith(".mesh-") || name.startsWith("mesh-check-")) && name.includes(runId))
      .map((name) => join(ROOT, name));
    const tempResidue = readdirSync(tempRoot).map((name) => join(tempRoot, name));
    const cleanup = { removed: [], failed: [] };
    for (const path of [...rootResidue, ...tempResidue, tempRoot]) {
      try {
        rmSync(path, { recursive: true, force: true });
        cleanup.removed.push(path);
      } catch (error) {
        cleanup.failed.push({ path, error: error.message });
      }
    }
    assert(!result.error, `prior mesh-consent cell ${meshCase} did not settle within its subprocess bound`, {
      timeoutMs,
      result: resultFacts(result),
      residue: { root: rootResidue, temp: tempResidue },
      cleanup,
    });
    assert(rootResidue.length === 0 && tempResidue.length === 0 && cleanup.failed.length === 0, `prior mesh-consent cell ${meshCase} left owned fixture residue`, {
      residue: { root: rootResidue, temp: tempResidue },
      cleanup,
    });
    const witness = parseJson(result, `prior mesh-consent cell ${meshCase}`);
    assert(witness.held === true, `prior mesh-consent cell ${meshCase} did not hold`, { witness });
    witnesses.push({ case: meshCase, elapsedMs: result.elapsedMs, timeoutMs, cleanup: "clean" });
  }
  const normalizer = join(SKILLS, "normalizing-a-units-management-records/scripts/normalize-a-units-management-records.js");
  const fixture = join(SKILLS, "normalizing-a-units-management-records/fixtures/conforming");
  const normalized = run(normalizer, ["--check", fixture, "--root", ROOT]);
  assert(normalized.status === 0, "normalizer's achieved conforming case regressed", {
    status: normalized.status,
    stdout: normalized.stdout,
    stderr: normalized.stderr,
  });
  held({ priorMeshConsentCells: witnesses, normalizerConformingFixture: relative(ROOT, fixture) });
}

function projectInto(source, target) {
  const result = run(PROJECTOR, [source, "--target", target, "--from", ROOT]);
  const witness = parseJson(result, `project ${basename(source)} into isolated skills root`);
  assert(witness.projected === 1, "isolated projection did not produce exactly one carrier", { source, witness });
}

function isolatedProjectedConsumerCase() {
  const temp = mkdtempSync(join(tmpdir(), "mesh-scope-projection-"));
  try {
    const target = join(temp, "skills");
    mkdirSync(target);
    projectInto(SOURCE, target);
    for (const consumer of CONSUMERS) projectInto(consumer.source, target);
    assert(!existsSync(join(target, "mesh-scope.js")), "isolated target unexpectedly contains the canonical flat policy source");
    assert(!resolve(target).startsWith(`${ROOT}/`), "isolated target accidentally sits below the canonical source tree", { target });

    const projectedNormalizer = join(target, "normalizing-a-units-management-records/scripts/normalize-a-units-management-records.js");
    const fixture = join(SKILLS, "normalizing-a-units-management-records/fixtures/conforming");
    const normalized = run(projectedNormalizer, ["--check", fixture, "--root", ROOT], temp);
    assert(normalized.status === 0, "isolated projected normalizer could not import and apply the projected gate", {
      status: normalized.status,
      stdout: normalized.stdout,
      stderr: normalized.stderr,
    });

    const authority = join(temp, "authority");
    const enterprise = join(authority, "lib/management");
    const targetNode = join(authority, "sovereign");
    mkdirSync(join(authority, ".git"), { recursive: true });
    mkdirSync(join(authority, "content/offices"), { recursive: true });
    mkdirSync(enterprise, { recursive: true });
    mkdirSync(targetNode);
    writeFileSync(join(targetNode, ".git"), "gitdir: fixture\n");
    const installerObservations = [];
    for (const [name, script] of [
      ["claude", join(target, "installing-an-enterprise-in-claude/scripts/install-an-enterprise-in-claude.js")],
      ["codex", join(target, "installing-an-enterprise-in-codex/scripts/install-an-enterprise-in-codex.js")],
    ]) {
      const result = run(script, [enterprise, targetNode, "--root", authority, "--authority-root", authority, "--list"], temp);
      assert(result.status === 1 && /target crosses a sovereign mesh boundary/u.test(result.stderr), `isolated projected ${name} installer did not apply the projected gate`, {
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
      });
      assert(!/cannot find the shared mesh-scope/u.test(result.stderr), `isolated projected ${name} installer fell back to an absent canonical source`, { stderr: result.stderr });
      installerObservations.push({ installer: name, refusedAtProjectedGate: true });
    }
    held({
      isolatedRoot: temp,
      flatCanonicalPresent: false,
      projectedGate: relative(temp, projectionPath(target)),
      normalizerImported: true,
      installers: installerObservations,
    });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

async function projectionIntegrityCase() {
  const sourceBytes = readFileSync(SOURCE);
  const checkedTargets = [];
  for (const target of TARGETS) {
    checkProjection(target);
    const path = projectionPath(target);
    assert(readFileSync(path).equals(sourceBytes), "mesh-scope copy differs from its source", { path: relative(ROOT, path) });
    const exports = await exportsOf(path);
    assert(JSON.stringify(exports) === JSON.stringify(EXPECTED_EXPORTS), "mesh-scope copy exports differ from its source", { path, exports });
    checkedTargets.push(relative(ROOT, path));
  }

  const checkedConsumers = [];
  for (const consumer of CONSUMERS) {
    const bytes = readFileSync(consumer.source);
    for (const projection of consumer.projections) {
      assert(existsSync(projection), "consumer projection is absent", { consumer: consumer.name, projection: relative(ROOT, projection) });
      assert(readFileSync(projection).equals(bytes), "consumer projection differs from its source", {
        consumer: consumer.name,
        projection: relative(ROOT, projection),
      });
      checkedConsumers.push(relative(ROOT, projection));
    }
  }

  const syntaxPaths = [SOURCE, ...PROJECTED_SCRIPTS, ...CONSUMERS.flatMap((consumer) => [consumer.source, ...consumer.projections])];
  for (const path of syntaxPaths) {
    const syntax = spawnSync(process.execPath, ["--check", path], { cwd: ROOT, encoding: "utf8" });
    assert(syntax.status === 0, "Node syntax check failed", { path: relative(ROOT, path), stderr: syntax.stderr });
  }
  held({ meshScopeCopies: checkedTargets, consumerCopies: checkedConsumers, syntaxChecked: syntaxPaths.length });
}

if (!CASES.has(CASE)) fail(`--case must name one of ${[...CASES].join(", ")}`);

const dispatch = {
  "flat-contract-and-exports": flatContractCase,
  "canonical-projection-and-policy-home": canonicalProjectionCase,
  "consumer-mesh-consent-regression": consumerRegressionCase,
  "isolated-projected-consumer": isolatedProjectedConsumerCase,
  "projection-and-diff-integrity": projectionIntegrityCase,
};

await dispatch[CASE]();
