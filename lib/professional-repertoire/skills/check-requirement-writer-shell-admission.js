#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(argValue("--root") ?? join(HERE, "../../../../.."));
const WRITER = join(ROOT, "lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/writing-a-requirement/scripts/write-a-requirement.js");
const PROJECTOR = join(ROOT, "lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/project-a-skill.js");
const SCHEMA = join(ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas/requirement.schema.json");
const RESOLVER = join(ROOT, "lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/resolve-an-identifier.js");
const BEFORE = "/* shell-admission:new-record:all-before-any */ preflightAllConditionSyntax(parsed);";
const AFTER = "/* shell-admission:new-record:all-before-any:DISABLED-BY-NEGATIVE-CONTROL */";

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i < 0 ? undefined : process.argv[i + 1];
}

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}

function check(condition, message) {
  assert.ok(condition, message);
}

function command(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", ...options });
}

check(process.version === "v24.13.1", `Node pin mismatch: ${process.version}`);
check(existsSync(WRITER), `writer absent: ${WRITER}`);

const writer = await import(`${new URL(`file://${WRITER}`).href}?harness=${Date.now()}`);
assert.deepEqual(Object.keys(writer).sort(), [
  "boundedBytes",
  "boundedText",
  "classifyConditionShellObservation",
  "isDirectExecution",
  "normalizeSpawnResult",
  "observeConditionShell",
  "refuseConditionShell",
].sort());
assert.equal(writer.isDirectExecution(undefined), false);
assert.equal(writer.isDirectExecution(null), false);
assert.equal(writer.isDirectExecution({}), false);

// ClosedNormalizationIssue: literal public sum and its two exact orders.
const RESULT_ISSUE_ORDER = [
  "status-own-check-threw", "status-read-threw", "status-buffer-discriminator-threw", "status-invalid-type",
  "signal-own-check-threw", "signal-read-threw", "signal-buffer-discriminator-threw", "signal-invalid-type",
  "error-own-check-threw", "error-read-threw", "error-buffer-discriminator-threw", "error-invalid-type",
  "error-name-own-check-threw", "error-name-read-threw", "error-name-buffer-discriminator-threw", "error-name-invalid-type",
  "error-code-own-check-threw", "error-code-read-threw", "error-code-buffer-discriminator-threw", "error-code-invalid-type",
  "error-message-own-check-threw", "error-message-read-threw", "error-message-buffer-discriminator-threw", "error-message-invalid-type",
  "error-stack-own-check-threw", "error-stack-read-threw", "error-stack-buffer-discriminator-threw", "error-stack-invalid-type",
  "stdout-own-check-threw", "stdout-read-threw", "stdout-buffer-discriminator-threw", "stdout-invalid-type",
  "stderr-own-check-threw", "stderr-read-threw", "stderr-buffer-discriminator-threw", "stderr-invalid-type",
];
const EXCEPTION_ISSUE_ORDER = [
  "exception-name-own-check-threw", "exception-name-read-threw", "exception-name-buffer-discriminator-threw", "exception-name-invalid-type",
  "exception-code-own-check-threw", "exception-code-read-threw", "exception-code-buffer-discriminator-threw", "exception-code-invalid-type",
  "exception-message-own-check-threw", "exception-message-read-threw", "exception-message-buffer-discriminator-threw", "exception-message-invalid-type",
  "exception-stack-own-check-threw", "exception-stack-read-threw", "exception-stack-buffer-discriminator-threw", "exception-stack-invalid-type",
];
const closedNormalizationIssue = ["result-not-object", ...RESULT_ISSUE_ORDER, ...EXCEPTION_ISSUE_ORDER];
assert.equal(closedNormalizationIssue.length, 53);
assert.equal(new Set(closedNormalizationIssue).size, 53);

const baseResult = () => ({
  status: 0,
  signal: null,
  error: null,
  stdout: Buffer.alloc(0),
  stderr: Buffer.alloc(0),
});
const baseError = () => ({ name: "Error", code: "EOTHER", message: "message", stack: "stack" });
const condition = { cell: "check:harness", command: "true" };

function revokedProxy() {
  const pair = Proxy.revocable({}, {});
  pair.revoke();
  return pair.proxy;
}

function throwingPrototypeProxy(marker = new Error("prototype-marker")) {
  return new Proxy({}, { getPrototypeOf() { throw marker; } });
}

function splitAtom(atom) {
  for (const suffix of ["own-check-threw", "read-threw", "buffer-discriminator-threw", "invalid-type"]) {
    if (atom.endsWith(`-${suffix}`)) return { prefix: atom.slice(0, -suffix.length - 1), fault: suffix };
  }
  throw new Error(`unknown atom ${atom}`);
}

function lawfulValue(prefix) {
  if (prefix === "status") return 0;
  if (prefix === "signal") return null;
  if (prefix === "error") return baseError();
  if (prefix === "stdout" || prefix === "stderr") return Buffer.alloc(0);
  return "field";
}

function invalidValue(prefix) {
  if (prefix === "status") return -1;
  if (prefix === "error") return Buffer.alloc(0);
  return {};
}

function proxyForProperties(target, configs) {
  return new Proxy(target, {
    getOwnPropertyDescriptor(holder, key) {
      const config = configs.get(String(key));
      if (config?.faults.has("own-check-threw")) throw config.marker;
      return Reflect.getOwnPropertyDescriptor(holder, key);
    },
    get(holder, key, receiver) {
      const config = configs.get(String(key));
      if (config?.faults.has("read-threw")) throw config.marker;
      if (config) {
        if (config.faults.has("buffer-discriminator-threw")) return config.bufferValue ?? revokedProxy();
        if (config.faults.has("invalid-type")) return invalidValue(config.prefix);
        return lawfulValue(config.prefix);
      }
      return Reflect.get(holder, key, receiver);
    },
  });
}

function configsFor(atoms, prefixFilter) {
  const map = new Map();
  for (const atom of atoms) {
    const split = splitAtom(atom);
    if (!prefixFilter(split.prefix)) continue;
    const key = split.prefix.split("-").at(-1);
    const current = map.get(key) ?? { prefix: split.prefix, faults: new Set(), marker: new Error(`marker:${atom}`) };
    current.faults.add(split.fault);
    map.set(key, current);
  }
  return map;
}

function resultForAtoms(atoms) {
  const resultAtoms = atoms.filter((atom) => !atom.startsWith("exception-"));
  const errorAtoms = resultAtoms.filter((atom) => atom.startsWith("error-") && !["error-own-check-threw", "error-read-threw", "error-buffer-discriminator-threw", "error-invalid-type"].includes(atom));
  let error = baseError();
  if (errorAtoms.length) error = proxyForProperties(error, configsFor(errorAtoms, (prefix) => prefix.startsWith("error-")));
  const result = baseResult();
  result.error = errorAtoms.length ? error : null;
  const parentAtoms = resultAtoms.filter((atom) => !errorAtoms.includes(atom));
  const configs = configsFor(parentAtoms, () => true);
  if (configs.has("error") && !configs.get("error").faults.has("read-threw")) configs.get("error").lawful = error;
  return new Proxy(result, {
    getOwnPropertyDescriptor(holder, key) {
      const config = configs.get(String(key));
      if (config?.faults.has("own-check-threw")) throw config.marker;
      return Reflect.getOwnPropertyDescriptor(holder, key);
    },
    get(holder, key, receiver) {
      const config = configs.get(String(key));
      if (config?.faults.has("read-threw")) throw config.marker;
      if (config) {
        if (config.faults.has("buffer-discriminator-threw")) return revokedProxy();
        if (config.faults.has("invalid-type")) return invalidValue(config.prefix);
        if (config.prefix === "error") return error;
        return lawfulValue(config.prefix);
      }
      return Reflect.get(holder, key, receiver);
    },
  });
}

function thrownForAtoms(atoms, bufferOverrides = new Map()) {
  const target = baseError();
  const configs = configsFor(atoms, (prefix) => prefix.startsWith("exception-"));
  for (const [key, value] of bufferOverrides) {
    const config = configs.get(key);
    if (config) config.bufferValue = value;
  }
  return proxyForProperties(target, configs);
}

function observeAtoms(atoms) {
  if (atoms.includes("result-not-object")) return writer.normalizeSpawnResult(null, { phase: "syntax", ...condition });
  if (atoms.some((atom) => atom.startsWith("exception-"))) {
    const thrown = thrownForAtoms(atoms);
    return writer.observeConditionShell(condition, "syntax", () => { throw thrown; });
  }
  return writer.normalizeSpawnResult(resultForAtoms(atoms), { phase: "syntax", ...condition });
}

const observedIssueSet = new Set();
for (const atom of closedNormalizationIssue) {
  const observation = observeAtoms([atom]);
  assert.equal(observation.normalization.state, "incomplete", atom);
  assert.equal(observation.normalization.reason, atom, atom);
  observedIssueSet.add(observation.normalization.reason);
}
assert.deepEqual([...observedIssueSet].sort(), [...closedNormalizationIssue].sort());

for (const order of [RESULT_ISSUE_ORDER, EXCEPTION_ISSUE_ORDER]) {
  for (let i = 0; i < order.length - 1; i += 1) {
    const earlier = order[i];
    const later = order[i + 1];
    assert.equal(observeAtoms([earlier, later]).normalization.reason, earlier, `${earlier} must precede ${later}`);
    assert.equal(observeAtoms([later]).normalization.reason, later, `${later} after removing ${earlier}`);
  }
}

// Exact native hostile field vectors, separate from getter failure.
for (const value of [revokedProxy(), throwingPrototypeProxy()]) {
  assert.throws(() => Buffer.isBuffer(value));
  const returnedError = baseError();
  Object.defineProperty(returnedError, "message", { value, enumerable: true, configurable: true });
  const returned = baseResult();
  returned.error = returnedError;
  const observation = writer.normalizeSpawnResult(returned, { phase: "syntax", ...condition });
  assert.equal(observation.normalization.reason, "error-message-buffer-discriminator-threw");
  assert.equal(observation.error.value.message.property.read, "ok");
  assert.equal(observation.error.value.message.property["buffer-check"], "threw");
  assert.equal(observation.error.value.message.value.bytes["source-total"].reason, "accessor-failed");
  assert.equal(writer.classifyConditionShellObservation("syntax", observation).code, "condition-shell-preflight-invalid-observation");

  const thrown = baseError();
  Object.defineProperty(thrown, "message", { value, enumerable: true, configurable: true });
  const thrownObservation = writer.observeConditionShell(condition, "syntax", () => { throw thrown; });
  assert.equal(thrownObservation.normalization.reason, "exception-message-buffer-discriminator-threw");
  assert.equal(writer.classifyConditionShellObservation("syntax", thrownObservation).code, "condition-shell-preflight-observer-threw");
}

let tagReads = 0;
let laterReads = 0;
const hostileParent = {};
Object.defineProperty(hostileParent, Symbol.toStringTag, { get() { tagReads += 1; throw new Error("tag"); } });
for (const key of ["name", "code", "message", "stack"]) Object.defineProperty(hostileParent, key, { get() { laterReads += 1; throw new Error("later"); } });
const hostileObservation = writer.observeConditionShell(condition, "syntax", () => { throw hostileParent; });
assert.equal(hostileObservation.exception.kind, "hostile-object");
assert.equal(hostileObservation.normalization.state, "complete");
assert.equal(tagReads, 1);
assert.equal(laterReads, 0);

for (const [value, kind] of [["x", "string"], [1, "number"], [true, "boolean"], [1n, "bigint"], [Symbol("x"), "symbol"], [() => {}, "function"], [null, "null"], [undefined, "undefined"]]) {
  const observation = writer.observeConditionShell(condition, "syntax", () => { throw value; });
  assert.equal(observation.exception.kind, kind);
  assert.equal(observation.exception.name.property.synthetic, "nonobject-parent");
  assert.equal(observation.exception.name.value.bytes["source-total"].reason, "field-not-applicable");
  assert.equal(observation.exception.primitive !== null, kind === "string");
}

const crossRealm = (await import("node:vm")).runInNewContext("new Error('cross')");
assert.equal(writer.observeConditionShell(condition, "syntax", () => { throw crossRealm; }).exception.kind, "error");

// Actual Node result shapes and classifier precedence.
const absentExecutable = join(tmpdir(), `absent-${randomUUID()}`);
const enoentRaw = spawnSync(absentExecutable, [], { encoding: "buffer", maxBuffer: 65_536 });
assert.deepEqual(Reflect.ownKeys(enoentRaw), ["error", "status", "signal", "output", "pid", "stdout", "stderr"]);
assert.equal(enoentRaw.error.code, "ENOENT");
assert.equal(Object.hasOwn(enoentRaw, "stdout"), true);
assert.equal(enoentRaw.stdout, undefined);
const enoent = writer.observeConditionShell(condition, "syntax", () => enoentRaw);
assert.equal(enoent.stdout.property["own-property"], true);
assert.equal(enoent.stdout.property["value-kind"], "undefined");
assert.equal(enoent.stdout.value["source-total"].reason, "value-nullish");
assert.equal(writer.classifyConditionShellObservation("syntax", enoent).code, "condition-shell-preflight-spawn-failed");

const enobufs = writer.observeConditionShell(condition, "declaration", (_shell, _argv, options) => spawnSync(
  process.execPath,
  ["-e", "process.stdout.write('x'.repeat(70000))"],
  { ...options, timeout: 5000 },
));
assert.equal(enobufs.error.value.code.value.exact, "ENOBUFS");
assert.equal(enobufs.stdout.value.observed.bytes, 70000);
assert.equal(enobufs.stdout.value["source-total"].reason, "process-overflow");
assert.equal(writer.classifyConditionShellObservation("declaration", enobufs).code, "condition-declaration-output-limit");

const timed = writer.observeConditionShell(condition, "declaration", (_shell, _argv, options) => spawnSync(
  "/bin/sh", ["-c", "sleep 2"], { ...options, timeout: 20 },
));
assert.equal(timed.error.value.code.value.exact, "ETIMEDOUT");
assert.equal(writer.classifyConditionShellObservation("declaration", timed).code, "condition-declaration-timeout");

const signaled = writer.observeConditionShell(condition, "declaration", (_shell, _argv, options) => spawnSync(
  "/bin/sh", ["-c", "kill -TERM $$"], { ...options, timeout: 1000 },
));
assert.equal(signaled.signal.value.exact, "SIGTERM");
assert.equal(writer.classifyConditionShellObservation("declaration", signaled).code, "condition-declaration-signaled");

for (const phase of ["syntax", "declaration"]) {
  const overflowRoute = writer.observeConditionShell(condition, phase, (_shell, _argv, options) => spawnSync(
    process.execPath, ["-e", "process.stdout.write('x'.repeat(70000))"], { ...options, timeout: 5000 },
  ));
  assert.equal(writer.classifyConditionShellObservation(phase, overflowRoute).code,
    phase === "syntax" ? "condition-shell-preflight-output-limit" : "condition-declaration-output-limit");
  const timeoutRoute = writer.observeConditionShell(condition, phase, (_shell, _argv, options) => spawnSync(
    "/bin/sh", ["-c", "sleep 2"], { ...options, timeout: 20 },
  ));
  assert.equal(writer.classifyConditionShellObservation(phase, timeoutRoute).code,
    phase === "syntax" ? "condition-shell-preflight-timeout" : "condition-declaration-timeout");
  const signalRoute = writer.observeConditionShell(condition, phase, (_shell, _argv, options) => spawnSync(
    "/bin/sh", ["-c", "kill -TERM $$"], { ...options, timeout: 1000 },
  ));
  assert.equal(writer.classifyConditionShellObservation(phase, signalRoute).code,
    phase === "syntax" ? "condition-shell-preflight-signaled" : "condition-declaration-signaled");
  const enoentRoute = writer.observeConditionShell(condition, phase, () => spawnSync(absentExecutable, [], { encoding: "buffer" }));
  assert.equal(writer.classifyConditionShellObservation(phase, enoentRoute).code,
    phase === "syntax" ? "condition-shell-preflight-spawn-failed" : "condition-declaration-spawn-failed");
}

const effectRoot = mkdtempSync(join(tmpdir(), "writer-effects-"));
try {
  const timeoutMarker = join(effectRoot, "timeout-marker");
  const timeoutEffect = writer.observeConditionShell(condition, "declaration", (_shell, _argv, options) => spawnSync(
    "/bin/sh", ["-c", `printf marker > '${timeoutMarker}'; sleep 2`], { ...options, timeout: 20 },
  ));
  assert.equal(writer.classifyConditionShellObservation("declaration", timeoutEffect).code, "condition-declaration-timeout");
  assert.equal(readFileSync(timeoutMarker, "utf8"), "marker");

  const descendantMarker = join(effectRoot, "descendant-marker");
  const descendant = writer.observeConditionShell(condition, "declaration", (_shell, _argv, options) => spawnSync(
    "/bin/sh",
    ["-c", `(sleep 0.05; printf child > '${descendantMarker}') >/dev/null 2>&1 & sleep 2`],
    { ...options, timeout: 20 },
  ));
  assert.equal(writer.classifyConditionShellObservation("declaration", descendant).code, "condition-declaration-timeout");
  await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  assert.equal(readFileSync(descendantMarker, "utf8"), "child");
} finally {
  rmSync(effectRoot, { recursive: true, force: true });
}

for (const status of [1, 2, 126, 127, 42]) {
  const observation = writer.observeConditionShell(condition, "declaration", () => ({ status, signal: null, error: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) }));
  const classification = writer.classifyConditionShellObservation("declaration", observation);
  assert.equal(classification.admitted, true);
  assert.equal(classification.status, status);
}
const syntaxTwo = writer.observeConditionShell(condition, "syntax", () => ({ status: 2, signal: null, error: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) }));
assert.equal(writer.classifyConditionShellObservation("syntax", syntaxTwo).code, "condition-shell-syntax-invalid");

// Nullish versus observed empty and bounded hostile identities.
for (const rawValue of [undefined, null]) {
  const raw = baseResult();
  raw.stdout = rawValue;
  const observation = writer.normalizeSpawnResult(raw, { phase: "syntax", ...condition });
  assert.equal(observation.stdout.value.availability, "unavailable");
  assert.equal(observation.stdout.value.observed.bytes, 0);
}
const missingStreamRaw = baseResult();
delete missingStreamRaw.stdout;
const missingStream = writer.normalizeSpawnResult(missingStreamRaw, { phase: "syntax", ...condition });
assert.equal(missingStream.stdout.property["own-property"], false);
assert.equal(missingStream.stdout.value["source-total"].reason, "property-absent");
const inheritedStreamRaw = Object.create({ stdout: "inherited" });
Object.assign(inheritedStreamRaw, { status: 0, signal: null, error: null, stderr: Buffer.alloc(0) });
const inheritedStream = writer.normalizeSpawnResult(inheritedStreamRaw, { phase: "syntax", ...condition });
assert.equal(inheritedStream.stdout.property["own-property"], false);
assert.equal(inheritedStream.stdout.property["value-kind"], "string");
assert.equal(inheritedStream.stdout.value.availability, "observed");
assert.equal(inheritedStream.stdout.value["source-total"].kind, "known");
const ownTrapStream = observeAtoms(["stdout-own-check-threw"]);
assert.equal(ownTrapStream.stdout.property.read, "ok");
assert.equal(ownTrapStream.stdout.value.availability, "observed");
assert.equal(ownTrapStream.stdout.value["source-total"].reason, "accessor-failed");
const observedEmpty = writer.normalizeSpawnResult(baseResult(), { phase: "syntax", ...condition });
assert.equal(observedEmpty.stdout.value.availability, "observed");
assert.equal(observedEmpty.stdout.value["source-total"].bytes, 0);
const huge = writer.boundedBytes(Buffer.alloc(70_000, 1), 4096);
assert.equal(huge.observed.bytes, 70_000);
assert.equal(huge.observed["prefix-bytes"], 4096);
assert.equal(huge.observed.sha256, sha(Buffer.alloc(70_000, 1)));
const hugeIdentity = "identity".repeat(150_000);
const hugeIdentityObservation = writer.normalizeSpawnResult(baseResult(), { phase: "syntax", cell: hugeIdentity, command: hugeIdentity });
assert.equal(hugeIdentityObservation.cell.observed.bytes, Buffer.byteLength(hugeIdentity));
assert.equal(hugeIdentityObservation.cell.observed["prefix-bytes"], 256);
assert.equal(hugeIdentityObservation.command.observed.sha256, sha(Buffer.from(hugeIdentity)));
const hugeErrorResult = baseResult();
hugeErrorResult.error = { name: hugeIdentity, code: hugeIdentity, message: hugeIdentity, stack: hugeIdentity };
const hugeError = writer.normalizeSpawnResult(hugeErrorResult, { phase: "syntax", ...condition });
assert.equal(hugeError.error.value.code.value.exact, null);
assert.equal(hugeError.error.value.code.value.bytes.observed["prefix-bytes"], 256);
assert.equal(hugeError.error.value.message.value.bytes.observed["prefix-bytes"], 1024);
const cyclic = {}; cyclic.self = cyclic;
assert.equal(writer.observeConditionShell(condition, "syntax", () => { throw cyclic; }).exception.kind, "object");

// Atomic fallback and refusal paths.
for (const phase of ["syntax", "declaration"]) {
  const normalizationFallback = writer.observeConditionShell(condition, phase, () => baseResult(), () => { throw new Error("normalizer"); });
  assert.equal(normalizationFallback.origin, "normalization-failed");
  assert.equal(Object.isFrozen(normalizationFallback), true);
  assert.equal(normalizationFallback.stdout.value["source-total"].reason, "normalization-failed");
  const finalFallback = writer.observeConditionShell(condition, phase, () => baseResult(), () => { throw new Error("normalizer"); }, () => { throw new Error("factory"); });
  assert.equal(finalFallback.origin, "final-observer-fallback");
  assert.equal(Object.isFrozen(finalFallback), true);
  assert.equal(finalFallback.stdout.value["source-total"].reason, "final-observer-fallback");
  const invalidFactory = writer.observeConditionShell(condition, phase, () => baseResult(), () => { throw new Error("normalizer"); }, () => ({}));
  assert.equal(invalidFactory.origin, "final-observer-fallback");
}
assert.equal(writer.classifyConditionShellObservation("syntax", new Proxy({}, { get() { throw new Error("hostile"); } })).code, "condition-shell-preflight-normalization-failed");
const priorExitCode = process.exitCode;
let refusalWrites = 0;
assert.doesNotThrow(() => writer.refuseConditionShell(
  { code: "test", observation: observedEmpty },
  () => { throw new Error("stringify"); },
  () => { refusalWrites += 1; throw new Error("write"); },
));
assert.equal(refusalWrites, 2);
process.exitCode = priorExitCode;
let serialized = "";
writer.refuseConditionShell({ code: "test", observation: observedEmpty }, () => ({}), (text) => { serialized += text; });
assert.match(serialized, /evidence-serialization-failed/);
process.exitCode = priorExitCode;

function scaffoldRoot(label) {
  const root = mkdtempSync(join(tmpdir(), `writer-shell-${label}-`));
  mkdirSync(join(root, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas"), { recursive: true });
  copyFileSync(SCHEMA, join(root, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas/requirement.schema.json"));
  const git = command("git", ["init", "-q"], { cwd: root });
  assert.equal(git.status, 0, git.stderr);
  return root;
}

function runWriter(root, slug, conditions, extra = [], source = WRITER) {
  const args = [source, "--root", root, "--slug", slug, "--raised-by", "harness", "--asks", `ask ${slug}`, "--by", "harness"];
  for (const cell of conditions) args.push("--met-when", cell);
  args.push(...extra);
  return command(process.execPath, args, { cwd: root, timeout: 150_000, maxBuffer: 2_000_000 });
}

function requirementRecords(root) {
  const pool = join(root, "lib/emsenn/data/records/requirements");
  if (!existsSync(pool)) return [];
  const records = [];
  for (const entry of readdirSync(pool, { recursive: true })) {
    const file = join(pool, entry);
    if (!String(entry).endsWith(".jsonl")) continue;
    for (const line of readFileSync(file, "utf8").split("\n").filter(Boolean)) records.push(JSON.parse(line));
  }
  return records;
}

function liveRequirementsDigest() {
  const pool = join(ROOT, "lib/emsenn/data/records/requirements");
  if (!existsSync(pool)) return EMPTY;
  const chunks = [];
  for (const entry of readdirSync(pool, { recursive: true }).map(String).filter((x) => x.endsWith(".jsonl")).sort()) {
    chunks.push(entry, readFileSync(join(pool, entry)));
  }
  return sha(Buffer.concat(chunks.map((x) => Buffer.isBuffer(x) ? x : Buffer.from(x))));
}
const EMPTY = sha(Buffer.alloc(0));
const liveBefore = liveRequirementsDigest();
const foreign = scaffoldRoot("foreign");
try {
  for (const [slug, cell, expected] of [
    ["pipeline", "check:pipeline|printf x | grep x", 0],
    ["or-list", "check:or-list|false || true", 0],
    ["redirection", `check:redirection|p='${join(foreign, "redirected")}'; printf x > "$p"; test "$(cat "$p")" = x`, 0],
    ["posix-trap", `check:posix-trap|p='${join(foreign, "trap-file")}'; trap 'rm -f "$p"' 0 1 2 15; printf x > "$p"`, 0],
    ["subject-two", "check:subject-two|exit 2|2", 0],
    ["subject-forty-two", "check:subject-forty-two|exit 42", 0],
    ["missing-subject", `check:missing|${join(foreign, "absent-command")}`, 0],
  ]) {
    const result = runWriter(foreign, slug, [cell]);
    assert.equal(result.status, expected, `${slug}: ${result.stderr}`);
  }
  assert.equal(requirementRecords(foreign).filter((r) => ["pipeline", "or-list", "redirection", "posix-trap", "subject-two", "subject-forty-two", "missing-subject"].includes(r.id)).length, 7);

  const marker = join(foreign, "must-not-exist");
  const allBefore = runWriter(foreign, "all-before-any", [
    `check:first|printf bad > '${marker}'`,
    "check:second|printf 'unterminated",
  ]);
  assert.equal(allBefore.status, 1);
  assert.equal(existsSync(marker), false);
  assert.equal(requirementRecords(foreign).some((r) => r.id === "all-before-any"), false);

  const bashOnly = runWriter(foreign, "bash-only", ["check:bash-only|done < <(printf x)"]);
  assert.equal(bashOnly.status, 1);
  assert.match(bashOnly.stderr, /condition-shell-syntax-invalid/);

  const amendmentMarker = join(foreign, "amendment-marker");
  const original = runWriter(foreign, "amendable", [`check:marker|printf x > '${amendmentMarker}'`]);
  assert.equal(original.status, 0, original.stderr);
  unlinkSync(amendmentMarker);
  const amendment = command(process.execPath, [WRITER, "--root", foreign, "--slug", "amendable", "--tier", "major"], { cwd: foreign, timeout: 30_000 });
  assert.equal(amendment.status, 0, amendment.stderr);
  assert.equal(existsSync(amendmentMarker), false);
  const distribution = command(process.execPath, [WRITER, "--root", foreign, "--slug", "amendable", "--distribute", "harness-work"], { cwd: foreign, timeout: 30_000 });
  assert.equal(distribution.status, 0, distribution.stderr);
  assert.equal(existsSync(amendmentMarker), false);

  const poolFiles = readdirSync(join(foreign, "lib/emsenn/data/records/requirements"), { recursive: true }).map(String).filter((x) => x.endsWith(".jsonl"));
  const seat = join(foreign, "lib/emsenn/data/records/requirements", poolFiles[0]);
  appendFileSync(seat, `${JSON.stringify({ id:"legacy-commandless", name:"legacy", kind:"requirement", "raised-by":"harness", asks:"legacy", "met-when":[{cell:"check:legacy",target:"held","expected-exit":0}] })}\n`);
  const beforeLegacy = readFileSync(seat);
  const legacy = command(process.execPath, [WRITER, "--root", foreign, "--slug", "legacy-commandless", "--tier", "major"], { cwd: foreign });
  assert.equal(legacy.status, 1);
  assert.match(legacy.stderr, /condition-commandless-legacy-amendment/);
  assert.deepEqual(readFileSync(seat), beforeLegacy);
  const successor = runWriter(foreign, "legacy-successor", ["check:successor|true"], ["--changes", "legacy-commandless"]);
  assert.equal(successor.status, 0, successor.stderr);

  appendFileSync(seat, `${JSON.stringify({ id:"legacy-syntax-invalid", name:"legacy invalid", kind:"requirement", "raised-by":"harness", asks:"legacy", "met-when":[{cell:"check:legacy-invalid",target:"held",command:"printf 'unterminated","expected-exit":0}] })}\n`);
  const invalidAmendment = command(process.execPath, [WRITER, "--root", foreign, "--slug", "legacy-syntax-invalid", "--tier", "major"], { cwd: foreign });
  assert.equal(invalidAmendment.status, 1);
  assert.match(invalidAmendment.stderr, /condition-shell-syntax-invalid/);

  const explicitHome = join(foreign, "explicit-requirements");
  const explicit = runWriter(foreign, "explicit-home", ["check:explicit|true"], ["--home", explicitHome]);
  assert.equal(explicit.status, 0, explicit.stderr);
  assert.equal(readdirSync(explicitHome, { recursive: true }).some((x) => String(x).endsWith(".jsonl")), true);

  const concurrent = (slug) => new Promise((resolveChild) => {
    const child = spawn(process.execPath, [WRITER, "--root", foreign, "--slug", slug, "--raised-by", "harness", "--asks", "same", "--met-when", "check:same|sleep 0.2"], { cwd: foreign, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (x) => { stdout += x; }); child.stderr.on("data", (x) => { stderr += x; });
    child.on("close", (status) => resolveChild({ status, stdout, stderr }));
  });
  const same = await Promise.all([concurrent("same-slug"), concurrent("same-slug")]);
  assert.equal(same.length, 2);
  const sameCount = requirementRecords(foreign).filter((r) => r.id === "same-slug").length;
  check(sameCount === 1 || sameCount === 2, `same-slug observation cardinality ${sameCount}`);
  console.log(`same-slug OBSERVATION-ONLY cardinality=${sameCount} exits=${same.map((x) => x.status).join(",")}`);
  const distinct = await Promise.all([concurrent("distinct-a"), concurrent("distinct-b")]);
  assert.deepEqual(distinct.map((x) => x.status), [0, 0]);
  assert.equal(requirementRecords(foreign).filter((r) => r.id === "distinct-a" || r.id === "distinct-b").length, 2);
} finally {
  rmSync(foreign, { recursive: true, force: true });
}
assert.equal(liveRequirementsDigest(), liveBefore, "foreign harness changed live requirements");

// Exact copied-source causal negative control.
const sourceText = readFileSync(WRITER, "utf8");
assert.equal(sourceText.split(BEFORE).length - 1, 1);
assert.equal(sourceText.split(AFTER).length - 1, 0);
const index = sourceText.indexOf(BEFORE);
const mutatedText = sourceText.slice(0, index) + AFTER + sourceText.slice(index + BEFORE.length);
assert.equal(mutatedText.split(BEFORE).length - 1, 0);
assert.equal(mutatedText.split(AFTER).length - 1, 1);

const negative = scaffoldRoot("negative");
try {
  const copiedWriter = join(negative, "lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/writing-a-requirement/scripts/write-a-requirement.js");
  mkdirSync(dirname(copiedWriter), { recursive: true });
  writeFileSync(copiedWriter, mutatedText);
  mkdirSync(join(negative, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills"), { recursive: true });
  copyFileSync(RESOLVER, join(negative, "lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/resolve-an-identifier.js"));
  symlinkSync(join(ROOT, "node_modules"), join(negative, "node_modules"), "dir");
  const fixture = "check:negative|done < <(printf x)";
  const liveControl = runWriter(negative, "negative-live", [fixture], [], WRITER);
  assert.equal(liveControl.status, 1);
  assert.equal(requirementRecords(negative).some((r) => r.id === "negative-live"), false);
  const reversed = runWriter(negative, "negative-mutated", [fixture], [], copiedWriter);
  assert.equal(reversed.status, 0, reversed.stderr);
  assert.equal(requirementRecords(negative).filter((r) => r.id === "negative-mutated").length, 1);
  assert.match(reversed.stdout, /exit 2/);
} finally {
  rmSync(negative, { recursive: true, force: true });
}
assert.equal(sha(readFileSync(WRITER)), sha(Buffer.from(sourceText)), "negative control changed live source");

const projection = command(process.execPath, [PROJECTOR, WRITER, "--from", "lib/emsenn", "--target", "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills", "--check"], { cwd: ROOT, timeout: 30_000 });
assert.equal(projection.status, 0, projection.stderr || projection.stdout);

console.log(JSON.stringify({
  ok: true,
  node: process.version,
  closedNormalizationIssue: closedNormalizationIssue.length,
  resultOrder: RESULT_ISSUE_ORDER.length,
  exceptionOrder: EXCEPTION_ISSUE_ORDER.length,
  negativeControl: "causal-reversal-observed",
  projection: "byte-identical",
}, null, 2));
