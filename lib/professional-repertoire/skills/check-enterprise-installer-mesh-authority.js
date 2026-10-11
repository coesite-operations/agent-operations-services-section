#!/usr/bin/env node
/**
 * @description Exercises the seven acceptance cells for the shared mesh-scope authority gate, including the formerly lawful root-to-submodule installer bypass, target-local admission, exact local install and clean, every projected entrypoint, the enterprise membrane, and the single policy home. Use to derive whether enterprise installers presently enforce the adopted sovereignty boundary.
 *
 * @param {string} case - names one of the seven accepted mesh authority cases
 * @param {string} root - names this git worktree
 * @returns {object} exit 0 means the named acceptance cell was exercised and held; exit 1 names the failed assertion
 */

import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { admitEnterpriseInstall, inspectMeshScope, revalidateEnterpriseInstall } from "./mesh-scope.js";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const CASES = new Set([
  "checked-out-submodule-boundary",
  "unconsented-crossing",
  "target-local-authority",
  "operated-node",
  "every-entrypoint",
  "enterprise-membrane",
  "shared-gate-and-retired-copies",
]);

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

const ROOT = resolve(argValue("--root") ?? process.cwd());
const CASE = argValue("--case");
const RUN_ID = String(process.env.MESH_CHECK_RUN_ID ?? process.pid).replace(/[^A-Za-z0-9_-]/gu, "-");
const CHILD_TIMEOUT_MS = 30_000;
const OWNED_PATHS = new Set();

function own(path) {
  OWNED_PATHS.add(path);
  return path;
}

function cleanupOwned() {
  const removed = [];
  const failed = [];
  for (const path of [...OWNED_PATHS].sort((a, b) => b.length - a.length)) {
    try {
      rmSync(path, { recursive: true, force: true });
      removed.push(path);
      OWNED_PATHS.delete(path);
    } catch (error) {
      failed.push({ path, error: error.message });
    }
  }
  return { removed, failed };
}

function fail(message, observations = {}) {
  const cleanup = cleanupOwned();
  process.stderr.write(`${JSON.stringify({ case: CASE, held: false, message, observations, cleanup }, null, 2)}\n`);
  process.exit(1);
}

function assert(condition, message, observations = {}) {
  if (!condition) fail(message, observations);
}

function held(observations) {
  const cleanup = cleanupOwned();
  assert(cleanup.failed.length === 0, "owned fixture cleanup failed", cleanup);
  process.stdout.write(`${JSON.stringify({ case: CASE, held: true, observations: { ...observations, cleanup } }, null, 2)}\n`);
}

function run(script, args, cwd = ROOT) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
    timeout: CHILD_TIMEOUT_MS,
    killSignal: "SIGKILL",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  result.elapsedMs = Date.now() - started;
  if (result.error?.code === "ETIMEDOUT") {
    fail("installer subprocess exceeded its explicit timeout", {
      script,
      args,
      timeoutMs: CHILD_TIMEOUT_MS,
      elapsedMs: result.elapsedMs,
      status: result.status,
      signal: result.signal,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }
  if (result.error) {
    fail("installer subprocess could not be executed", {
      script,
      args,
      elapsedMs: result.elapsedMs,
      code: result.error.code,
      error: result.error.message,
      status: result.status,
      signal: result.signal,
    });
  }
  return result;
}

function gitRootFixture(prefix = "mesh-authority-") {
  const root = own(mkdtempSync(join(tmpdir(), `${prefix}${RUN_ID}-`)));
  mkdirSync(join(root, ".git"));
  return root;
}

function rootFixture(label) {
  return own(mkdtempSync(join(ROOT, `.mesh-${label}-${RUN_ID}-`)));
}

function lightweightEnterpriseFixture(label) {
  // The one-office enterprise must be visible to the sibling installers'
  // pool walk, which deliberately skips dot-prefixed harness directories.
  const node = own(mkdtempSync(join(ROOT, `mesh-check-enterprise-${label}-${RUN_ID}-`)));
  const enterprise = join(node, "lib/management");
  const skills = join(enterprise, "skills");
  const offices = join(node, "content/offices");
  const duties = join(node, "content/duties");
  const dutyId = `fixture-duty-${RUN_ID}`;
  const skillId = `fixture-skill-${RUN_ID}`;
  mkdirSync(join(node, ".git"));
  mkdirSync(skills, { recursive: true });
  mkdirSync(offices, { recursive: true });
  mkdirSync(duties, { recursive: true });
  for (const name of [
    "project-a-skill.js",
    "write-a-schema.js",
    "write-an-office.js",
    "make-a-task.js",
    "dispatch-a-task.js",
    "list-open-obligations.js",
  ]) writeFileSync(join(skills, name), "// acceptance fixture: existence is the cited-instrument contract\n");
  mkdirSync(join(skills, skillId));
  writeFileSync(join(skills, skillId, "SKILL.md"), `---\nname: ${skillId}\ndescription: Exercises one bounded fixture skill.\n---\n\nA fixture skill used only to prove a complete installer lifecycle.\n`);
  writeFileSync(join(duties, `${dutyId}.json`), `${JSON.stringify({
    id: dutyId,
    name: "fixture duty",
    skills: [skillId],
  }, null, 2)}\n`);
  writeFileSync(join(offices, "fixture-office.json"), `${JSON.stringify({
    id: "fixture-office",
    name: "fixture office",
    kind: "office",
    "normative-structure": "A bounded fixture office exercises one complete installer lifecycle.",
    "bears-duty": [`emsenn/duty/${dutyId}`],
    "deontic-profile": {},
  }, null, 2)}\n`);
  return { authorityRoot: node, enterprise };
}

function operatedTarget(authorityRoot, label) {
  return mkdtempSync(join(authorityRoot, `.target-${label}-`));
}

function marker(dir) {
  writeFileSync(join(dir, ".git"), "gitdir: fixture\n");
}

function expectRefusal(request, role) {
  try {
    admitEnterpriseInstall(request);
  } catch (error) {
    assert(error.facts?.role === role, `expected ${role} refusal`, { message: error.message, facts: error.facts });
    return error;
  }
  fail(`request unexpectedly admitted; ${role} should have refused`, request);
}

function shaPath(path) {
  const hash = createHash("sha256");
  function add(at) {
    if (!existsSync(at)) { hash.update(`absent:${at}\n`); return; }
    const st = statSync(at);
    if (st.isDirectory()) {
      hash.update(`dir:${at}\n`);
      for (const name of readdirSync(at).sort()) add(join(at, name));
    } else {
      hash.update(`file:${at}:`);
      hash.update(readFileSync(at));
    }
  }
  add(path);
  return hash.digest("hex");
}

function harnessFingerprint(node) {
  const names = ["CLAUDE.md", "AGENTS.md", ".claude", ".codex", "content", "lib"];
  return Object.fromEntries(names.map((name) => [name, shaPath(join(node, name))]));
}

function assertEmpty(dir, label) {
  const entries = readdirSync(dir);
  assert(entries.length === 0, `${label} left residue`, { entries });
}

const FLAT = {
  claude: join(HERE, "install-an-enterprise-in-claude.js"),
  codex: join(HERE, "install-an-enterprise-in-codex.js"),
};
const ENTERPRISE = join(ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management");

async function boundaryCase() {
  const root = gitRootFixture();
  try {
    const ordinary = join(root, "ordinary");
    const outer = join(root, "outer");
    const nested = join(outer, "nested");
    mkdirSync(ordinary);
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(root, ".gitmodules"), "[submodule \"stale\"]\n\tpath = ordinary\n");
    marker(outer);
    marker(nested);
    const rootScope = inspectMeshScope({ authorityRoot: root, subject: root });
    const ordinaryScope = inspectMeshScope({ authorityRoot: root, subject: ordinary });
    const nestedScope = inspectMeshScope({ authorityRoot: root, subject: nested });
    assert(rootScope.boundaries.length === 0, "authority root's own .git directory became a boundary", rootScope);
    assert(ordinaryScope.boundaries.length === 0, ".gitmodules declaration became a boundary", ordinaryScope);
    assert(nestedScope.boundaries.length === 2, "nested checked-out boundaries were not all returned", nestedScope);
    assert(nestedScope.deepestOwner === resolve(nested), "deepest nested owner was not derived", nestedScope);
    held({ boundaries: nestedScope.boundaries, staleGitmodulesIgnored: true });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

async function unconsentedCase() {
  const sovereign = join(ROOT, "lib/emsenn/services/561-group/services/lenticule-science/services/obsmetrological-services-section/src");
  assert(existsSync(join(sovereign, ".git")) && statSync(join(sovereign, ".git")).isFile(), "live regression target is not a checked-out submodule");
  const before = harnessFingerprint(sovereign);
  const results = {};
  for (const [installer, script] of Object.entries(FLAT)) {
    results[installer] = {};
    for (const [motion, flags] of [
      ["list", ["--list"]],
      ["dry-run", ["--dry-run"]],
      ["install", []],
      ["reinstall", ["--reinstall"]],
      ["clean", ["--clean"]],
    ]) {
      const result = run(script, [ENTERPRISE, sovereign, "--root", ROOT, "--authority-root", ROOT, ...flags]);
      assert(result.status !== 0, `${installer} repeated the root-to-submodule ${motion} bypass`, { stdout: result.stdout, stderr: result.stderr });
      assert(result.stderr.includes("sovereign mesh boundary"), `${installer} did not name the mesh refusal`, { motion, stderr: result.stderr });
      results[installer][motion] = result.status;
    }
  }
  assert(JSON.stringify(before) === JSON.stringify(harnessFingerprint(sovereign)), "refused dry-run changed the sovereign target");
  const local = rootFixture("no-authority");
  try {
    for (const [installer, script] of Object.entries(FLAT)) {
      const result = run(script, [ENTERPRISE, local, "--root", ROOT, "--dry-run"]);
      assert(result.status !== 0, `${installer} admitted omission of --authority-root`);
    }
    assertEmpty(local, "missing-authority refusal");
  } finally { rmSync(local, { recursive: true, force: true }); }
  held({ priorBypass: results, sentinelUnchanged: true, omissionFailsClosed: true });
}

async function targetLocalCase() {
  const root = gitRootFixture();
  try {
    const settlement = join(root, "settlement");
    const enterprise = join(settlement, "lib/management");
    const target = join(settlement, "node");
    const nested = join(settlement, "nested");
    const ordinarySource = join(root, "ordinary-source");
    mkdirSync(enterprise, { recursive: true });
    mkdirSync(target);
    mkdirSync(nested);
    mkdirSync(ordinarySource);
    marker(settlement);
    marker(nested);
    const admitted = admitEnterpriseInstall({
      authorityRoot: settlement, sourceEnterprise: enterprise, targetNode: target,
      installer: "claude", operation: "install", mode: "apply",
    });
    assert(admitted.request.authorityRoot === resolve(settlement), "settlement-local authority was not canonicalized");
    const requestHashes = new Set();
    for (const installer of ["claude", "codex"]) {
      for (const [operation, mode] of [["install", "apply"], ["reinstall", "apply"], ["clean", "dry-run"]]) {
        requestHashes.add(admitEnterpriseInstall({
          authorityRoot: settlement, sourceEnterprise: enterprise, targetNode: target,
          installer, operation, mode,
        }).requestSha256);
      }
    }
    assert(requestHashes.size === 6, "distinct installer/operation/mode requests did not bind to distinct hashes", { requestHashes: [...requestHashes] });
    marker(target);
    try {
      revalidateEnterpriseInstall(admitted);
      fail("admission survived a newly crossed target boundary");
    } catch (error) {
      assert(error.message === "mesh authority changed during operation", "torn-state refusal did not name the changed authority", { message: error.message, facts: error.facts });
    }
    rmSync(join(target, ".git"));
    expectRefusal({
      authorityRoot: settlement, sourceEnterprise: enterprise, targetNode: nested,
      installer: "claude", operation: "install", mode: "apply",
    }, "target");
    expectRefusal({
      authorityRoot: settlement, sourceEnterprise: ordinarySource, targetNode: target,
      installer: "claude", operation: "install", mode: "apply",
    }, "source");
    held({ localAdmission: admitted.requestSha256, exactRequestHashes: requestHashes.size, tornStateRefused: true, nestedRefused: true, foreignSourceRefused: true });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

async function operatedNodeCase() {
  const observations = {};
  const fixture = lightweightEnterpriseFixture("operated");
  for (const [installer, script] of Object.entries(FLAT)) {
    const node = operatedTarget(fixture.authorityRoot, `operated-${installer}`);
    try {
      const common = [fixture.enterprise, node, "--root", fixture.authorityRoot, "--authority-root", fixture.authorityRoot];
      let result = run(script, [...common, "--dry-run"]);
      assert(result.status === 0, `${installer} lawful dry-run failed`, { stderr: result.stderr, stdout: result.stdout });
      assertEmpty(node, `${installer} dry-run`);
      result = run(script, common);
      assert(result.status === 0, `${installer} lawful install failed`, { stderr: result.stderr, stdout: result.stdout });
      result = run(script, [...common, "--reinstall"]);
      assert(result.status === 0, `${installer} lawful reinstall failed`, { stderr: result.stderr, stdout: result.stdout });
      result = run(script, [...common, "--clean"]);
      assert(result.status === 0, `${installer} lawful clean failed`, { stderr: result.stderr, stdout: result.stdout });
      assertEmpty(node, `${installer} exact clean`);
      observations[installer] = ["dry-run", "install", "reinstall", "clean"];
    } finally { rmSync(node, { recursive: true, force: true }); }
  }
  held(observations);
}

function entrypoints() {
  return [
    FLAT.claude,
    join(HERE, "installing-an-enterprise-in-claude/scripts/install-an-enterprise-in-claude.js"),
    join(ROOT, ".claude/skills/installing-an-enterprise-in-claude/scripts/install-an-enterprise-in-claude.js"),
    FLAT.codex,
    join(HERE, "installing-an-enterprise-in-codex/scripts/install-an-enterprise-in-codex.js"),
    join(ROOT, ".agents/skills/installing-an-enterprise-in-codex/scripts/install-an-enterprise-in-codex.js"),
  ];
}

async function everyEntrypointCase() {
  const observed = [];
  const fixture = lightweightEnterpriseFixture("entrypoints");
  for (const script of entrypoints()) {
    assert(existsSync(script), "installer entrypoint is absent", { script });
    const text = readFileSync(script, "utf8");
    assert(text.includes("admitMeshAuthority") && text.includes("--authority-root"), "entrypoint lacks the shared authority call", { script });
    assert(text.includes("function writeFileSync(...args) { assertMeshAuthority();"), "entrypoint has an ungated write wrapper", { script });
    const node = operatedTarget(fixture.authorityRoot, "entrypoint");
    try {
      const common = [fixture.enterprise, node, "--root", fixture.authorityRoot, "--authority-root", fixture.authorityRoot];
      let result = run(script, [...common, "--list"]);
      assert(result.status === 0, "authorized list is not live at an entrypoint", { script, stdout: result.stdout, stderr: result.stderr });
      assertEmpty(node, `authorized list ${relative(ROOT, script)}`);
      result = run(script, [...common, "--dry-run"]);
      assert(result.status === 0, "authorized dry-run is not live at an entrypoint", { script, stdout: result.stdout, stderr: result.stderr });
      assertEmpty(node, `authorized dry-run ${relative(ROOT, script)}`);
      result = run(script, [ENTERPRISE, node, "--root", ROOT, "--force", "--dry-run"]);
      assert(result.status !== 0, "--force bypassed an entrypoint", { script, stdout: result.stdout, stderr: result.stderr });
      assertEmpty(node, `entrypoint refusal ${relative(ROOT, script)}`);

      // Installed entrypoints have a distinct source-location environment;
      // exercise their writes and inverse, because byte identity alone cannot
      // prove that their sibling installer resolves from a harness directory.
      const installed = script.startsWith(join(ROOT, ".claude")) || script.startsWith(join(ROOT, ".agents"));
      if (installed) {
        result = run(script, common);
        assert(result.status === 0, "authorized installed entrypoint cannot install", { script, stdout: result.stdout, stderr: result.stderr });
        result = run(script, [...common, "--reinstall"]);
        assert(result.status === 0, "authorized installed entrypoint cannot reinstall", { script, stdout: result.stdout, stderr: result.stderr });
        result = run(script, [...common, "--clean"]);
        assert(result.status === 0, "authorized installed entrypoint cannot clean", { script, stdout: result.stdout, stderr: result.stderr });
        assertEmpty(node, `installed entrypoint lifecycle ${relative(ROOT, script)}`);
      }
    } finally { rmSync(node, { recursive: true, force: true }); }
    observed.push({ entrypoint: relative(ROOT, script), authorized: ["list", "dry-run"], installedLifecycle: script.includes("/.claude/") || script.includes("/.agents/") });
  }
  held({ entrypoints: observed, forceBypass: false });
}

async function membraneCase() {
  const fixture = lightweightEnterpriseFixture("membrane");
  const foreign = join(fixture.authorityRoot, "sovereign");
  const localNode = operatedTarget(fixture.authorityRoot, "membrane");
  mkdirSync(foreign);
  marker(foreign);
  try {
    expectRefusal({
      authorityRoot: fixture.authorityRoot, sourceEnterprise: foreign, targetNode: localNode,
      installer: "claude", operation: "install", mode: "apply",
    }, "source");
    expectRefusal({
      authorityRoot: fixture.authorityRoot, sourceEnterprise: fixture.enterprise, targetNode: foreign,
      installer: "codex", operation: "install", mode: "apply",
    }, "target");
    mkdirSync(join(localNode, "content"));
    mkdirSync(join(localNode, "lib"));
    writeFileSync(join(localNode, "content/sentinel"), "content-owned\n");
    writeFileSync(join(localNode, "lib/sentinel"), "lib-owned\n");
    const protectedBefore = { content: shaPath(join(localNode, "content")), lib: shaPath(join(localNode, "lib")) };
    for (const [installer, script] of Object.entries(FLAT)) {
      const common = [fixture.enterprise, localNode, "--root", fixture.authorityRoot, "--authority-root", fixture.authorityRoot];
      const install = run(script, common);
      assert(install.status === 0, `${installer} admitted membrane fixture install failed`, { stderr: install.stderr });
      assert(protectedBefore.content === shaPath(join(localNode, "content")), `${installer} wrote the target's content governance pools`);
      assert(protectedBefore.lib === shaPath(join(localNode, "lib")), `${installer} wrote the target's lib governance pools`);
      const allowed = installer === "claude"
        ? [".claude", "CLAUDE.md", "content", "lib"]
        : [".codex", "AGENTS.md", "content", "lib"];
      const top = readdirSync(localNode).sort();
      assert(top.every((name) => allowed.includes(name)), `${installer} wrote outside harness-owned carriers`, { top });
      const clean = run(script, [...common, "--clean"]);
      assert(clean.status === 0, `${installer} membrane fixture clean failed`, { stderr: clean.stderr });
      assert(protectedBefore.content === shaPath(join(localNode, "content")), `${installer} clean changed content governance pools`);
      assert(protectedBefore.lib === shaPath(join(localNode, "lib")), `${installer} clean changed lib governance pools`);
    }
    held({ foreignSourceRefused: true, foreignTargetRefused: true, protectedPoolsUnchanged: ["claude", "codex"] });
  } finally { rmSync(localNode, { recursive: true, force: true }); }
}

async function onePolicyHomeCase() {
  const normalizer = join(HERE, "normalize-a-units-management-records.js");
  const normalizerText = readFileSync(normalizer, "utf8");
  assert(normalizerText.includes("inspectMeshScope") && normalizerText.includes("resolveMeshScopeGate"), "normalizer does not import and call the shared scope rule");
  assert(!normalizerText.includes("function isSubmoduleBoundary"), "normalizer retained its private boundary classifier");
  for (const script of entrypoints()) {
    const text = readFileSync(script, "utf8");
    assert(!/statSync\([^\n]*\.git[^\n]*\)\.isFile/u.test(text), "installer copied the .git-file classifier", { script });
  }
  const classifierSources = readdirSync(HERE)
    .filter((name) => name.endsWith(".js"))
    .map((name) => join(HERE, name))
    .filter((path) => /statSync\([^\n]*marker[^\n]*\)\.isFile/u.test(readFileSync(path, "utf8")));
  assert(classifierSources.length === 1 && classifierSources[0] === join(HERE, "mesh-scope.js"), "the .git-file rule has more than one source", { classifierSources });
  const pairs = [
    [FLAT.claude, join(HERE, "installing-an-enterprise-in-claude/scripts/install-an-enterprise-in-claude.js")],
    [FLAT.claude, join(ROOT, ".claude/skills/installing-an-enterprise-in-claude/scripts/install-an-enterprise-in-claude.js")],
    [FLAT.codex, join(HERE, "installing-an-enterprise-in-codex/scripts/install-an-enterprise-in-codex.js")],
    [FLAT.codex, join(ROOT, ".agents/skills/installing-an-enterprise-in-codex/scripts/install-an-enterprise-in-codex.js")],
    [normalizer, join(HERE, "normalizing-a-units-management-records/scripts/normalize-a-units-management-records.js")],
  ];
  for (const [source, projection] of pairs) {
    assert(readFileSync(source).equals(readFileSync(projection)), "projection drifted from its source", { source, projection });
  }
  held({ policyHome: relative(ROOT, join(HERE, "mesh-scope.js")), projections: pairs.length });
}

if (!CASES.has(CASE)) fail(`--case must name one of ${[...CASES].join(", ")}`);

const dispatch = {
  "checked-out-submodule-boundary": boundaryCase,
  "unconsented-crossing": unconsentedCase,
  "target-local-authority": targetLocalCase,
  "operated-node": operatedNodeCase,
  "every-entrypoint": everyEntrypointCase,
  "enterprise-membrane": membraneCase,
  "shared-gate-and-retired-copies": onePolicyHomeCase,
};

function cleanupAndExit(signal) {
  cleanupOwned();
  process.exit(128 + signal);
}
process.on("SIGINT", () => cleanupAndExit(2));
process.on("SIGTERM", () => cleanupAndExit(15));

try {
  await dispatch[CASE]();
} catch (error) {
  fail(error.message, { stack: error.stack });
}
