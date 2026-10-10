#!/usr/bin/env node
/**
 * @skill writing-a-requirement
 * @verb-phrase writing a requirement
 * @closure-kind process
 * @description Records what a party asked for as a requirement whose conditions are commands a machine runs, refusing any whose conditions are prose; records a change to an accepted requirement as a new requirement naming the one it changes, never as an edit. Use when a requirement is received, when it is decided at a tier, when it is distributed to work items, and when what was asked for moves. Prose conditions are refused because a requirement that cannot fail is satisfied by whatever gets built.
 *
 * @precondition the requirement names who raised it and what they asked, in the raiser's own words
 * @precondition at least one condition is stated, and every condition carries a command and the exit code that means settled
 * @precondition every condition can be spawned, so it can settle rather than merely be hoped for
 * @precondition a change names the accepted requirement it changes, and that requirement resolves
 * @precondition no requirement of this id is already recorded, unless --distribute or --tier is amending one
 * @precondition a from-idea, when given, names an idea that resolves in the ideas pool
 * @postcondition a requirement spec exists that validates against emsenn/term/requirement
 * @postcondition every condition ran at declaration, so a session that was not there can re-run it
 * @postcondition whether the requirement is met is asserted nowhere in the spec and is derivable by re-running its conditions
 * @postcondition an accepted requirement's ask and conditions are never edited in place; a change is a new spec pointing at the old one
 * @witness the id, raiser, and tier of the requirement written, and the path it was written to
 * @witness each condition, its command, its expected exit code, and its exit code at declaration
 * @witness on refusal, which precondition failed and the exact condition that failed it
 * @witness on a change, the requirement changed and the new requirement replacing it
 *
 * The whole content of this script is the REFUSAL, and the refusal is the same
 * one make-a-task makes one layer down: emitting a requirement is trivial,
 * and what makes it a requirement rather than a wish is that the conditions
 * under which the raiser would agree it was met are commands, so it is met when
 * they exit 0 and not when a builder says so.
 *
 * "the office DAG should render" cannot fail. Every output satisfies it. A
 * worker handed it will substitute a task it can finish for the task it was
 * given — confidently, in a shape indistinguishable from progress — and nobody
 * will be able to point at the moment it happened.
 *
 * The second refusal is the edit. An accepted requirement is never rewritten:
 * a change is a new requirement naming what it changes. Rewriting in place
 * destroys the only evidence that the ask moved, and a firm that cannot see its
 * requirements moving will believe it hit a target it repainted.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { appendDataRecord, dataDir, findDataRecord, findUnit } from "../../resolve-an-identifier.js";

const CONDITION_SHELL = "/bin/sh";
const SYNTAX_TIMEOUT_MS = 10_000;
const DECLARATION_TIMEOUT_MS = 120_000;
const PROCESS_MAX_BUFFER_BYTES = 65_536;
const STREAM_PREFIX_BYTES = 4096;
const IDENTITY_PREFIX_BYTES = 256;
const ERROR_TEXT_PREFIX_BYTES = 1024;
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const CAPTURED_HAS_OWN = Object.prototype.hasOwnProperty;
const CAPTURED_REFLECT_GET = Reflect.get;
const CAPTURED_OBJECT_TO_STRING = Object.prototype.toString;
const CAPTURED_BUFFER_IS_BUFFER = Buffer.isBuffer;

const REPO_ROOT = argValue("--root") ?? "/home/emsenn/info";
const UNIT = findUnit(dirname(fileURLToPath(import.meta.url)));
if (!UNIT) throw new Error("write-a-requirement: cannot resolve the owning unit");
const TERM = join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas/requirement.schema.json");
const HOME = argValue("--home") ?? dataDir(UNIT, "requirements");
const IDEAS_HOME = argValue("--ideas-home") ?? dataDir(UNIT, "ideas");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function argValues(flag) {
  const out = [];
  for (let i = 0; i < process.argv.length; i += 1) {
    if (process.argv[i] === flag && process.argv[i + 1] !== undefined) out.push(process.argv[i + 1]);
  }
  return out;
}

function has(flag) {
  return process.argv.includes(flag);
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

function sourceTotalKnown(bytes) {
  return { kind: "known", reason: "observed-complete", bytes };
}

function sourceTotalUnknown(reason) {
  return { kind: "unknown", reason };
}

function emptyObserved(prefixLimit) {
  return {
    bytes: 0,
    sha256: EMPTY_SHA256,
    "prefix-limit": prefixLimit,
    "prefix-bytes": 0,
    "prefix-base64": "",
    "evidence-truncation": "none",
  };
}

export function boundedBytes(value, prefixLimit, availability = "observed", sourceTotal = null) {
  let bytes;
  if (CAPTURED_BUFFER_IS_BUFFER(value)) bytes = value;
  else if (typeof value === "string") bytes = Buffer.from(value, "utf8");
  else bytes = Buffer.alloc(0);
  const prefixBytes = Math.min(bytes.length, prefixLimit);
  const observed = bytes.length === 0
    ? emptyObserved(prefixLimit)
    : {
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        "prefix-limit": prefixLimit,
        "prefix-bytes": prefixBytes,
        "prefix-base64": bytes.subarray(0, prefixBytes).toString("base64"),
        "evidence-truncation": bytes.length > prefixLimit ? "prefix" : "none",
      };
  return {
    availability,
    observed,
    "source-total": sourceTotal ?? sourceTotalKnown(observed.bytes),
  };
}

export function boundedText(value, prefixLimit, retainExact = false, availability = "observed", sourceTotal = null) {
  const type = availability === "observed" ? "string" : availability;
  const exact = type === "string" && retainExact && Buffer.byteLength(value, "utf8") <= prefixLimit ? value : null;
  return { type, exact, bytes: boundedBytes(value, prefixLimit, availability, sourceTotal) };
}

function unavailableBytes(prefixLimit, reason) {
  return boundedBytes(Buffer.alloc(0), prefixLimit, "unavailable", sourceTotalUnknown(reason));
}

function invalidBytes(prefixLimit) {
  return boundedBytes(Buffer.alloc(0), prefixLimit, "invalid", sourceTotalUnknown("invalid-source-type"));
}

function unavailableText(prefixLimit, reason) {
  return { type: "unavailable", exact: null, bytes: unavailableBytes(prefixLimit, reason) };
}

function invalidText(prefixLimit) {
  return { type: "invalid", exact: null, bytes: invalidBytes(prefixLimit) };
}

function syntheticProperty(reason) {
  return {
    "own-property": null,
    "own-check": "not-attempted",
    read: "not-attempted",
    "value-kind": "unavailable",
    "buffer-check": "not-attempted",
    synthetic: reason,
  };
}

function inspectProperty(holder, key) {
  let own = null;
  let ownCheck = "ok";
  try {
    own = CAPTURED_HAS_OWN.call(holder, key);
  } catch {
    ownCheck = "hasOwn-threw";
  }

  let raw;
  let read = "ok";
  try {
    raw = CAPTURED_REFLECT_GET(holder, key);
  } catch {
    read = "get-threw";
  }

  let valueKind = "unavailable";
  let bufferCheck = "not-applicable";
  if (read === "ok") {
    if (raw === undefined) valueKind = "undefined";
    else if (raw === null) valueKind = "null";
    else {
      const primitiveKind = typeof raw;
      if (primitiveKind === "object") {
        try {
          if (CAPTURED_BUFFER_IS_BUFFER(raw)) {
            valueKind = "buffer";
            bufferCheck = "is-buffer";
          } else {
            valueKind = "object";
            bufferCheck = "not-buffer";
          }
        } catch {
          valueKind = "unavailable";
          bufferCheck = "threw";
        }
      } else {
        valueKind = primitiveKind;
      }
    }
  }

  return {
    property: {
      "own-property": own,
      "own-check": ownCheck,
      read,
      "value-kind": valueKind,
      "buffer-check": bufferCheck,
      synthetic: null,
    },
    raw,
  };
}

function localIssue(prefix, inspected, lawful) {
  const p = inspected.property;
  if (p["own-check"] === "hasOwn-threw") return `${prefix}-own-check-threw`;
  if (p.read === "get-threw") return `${prefix}-read-threw`;
  if (p["buffer-check"] === "threw") return `${prefix}-buffer-discriminator-threw`;
  if (!lawful(inspected.raw, p["value-kind"])) return `${prefix}-invalid-type`;
  return null;
}

const nullish = (raw) => raw === undefined || raw === null;
const lawfulStatus = (raw, kind) => nullish(raw) || (kind === "number" && Number.isInteger(raw) && raw >= 0 && Number.isFinite(raw));
const lawfulSignal = (raw, kind) => nullish(raw) || kind === "string";
const lawfulError = (raw, kind) => nullish(raw) || kind === "object";
const lawfulStream = (raw, kind) => nullish(raw) || kind === "buffer" || kind === "string";
const lawfulText = (raw, kind) => nullish(raw) || kind === "string";

function propertyText(inspected, prefixLimit, retainExact, issue) {
  const p = inspected.property;
  let value;
  if (p.read === "get-threw" || p["buffer-check"] === "threw") {
    value = unavailableText(prefixLimit, "accessor-failed");
  } else if (p["own-property"] === false && p["value-kind"] === "undefined") {
    value = unavailableText(prefixLimit, "property-absent");
  } else if (p["value-kind"] === "undefined" || p["value-kind"] === "null") {
    value = unavailableText(prefixLimit, "value-nullish");
  } else if (issue?.endsWith("invalid-type")) {
    value = invalidText(prefixLimit);
  } else if (p["own-check"] === "hasOwn-threw") {
    if (p["value-kind"] === "string") {
      value = boundedText(inspected.raw, prefixLimit, retainExact, "observed", sourceTotalUnknown("accessor-failed"));
    } else {
      value = { type: "invalid", exact: null, bytes: boundedBytes(Buffer.alloc(0), prefixLimit, "invalid", sourceTotalUnknown("accessor-failed")) };
    }
  }
  else value = boundedText(inspected.raw, prefixLimit, retainExact);
  return { property: inspected.property, value };
}

function syntheticTextField(prefixLimit, synthetic, sourceReason) {
  return { property: syntheticProperty(synthetic), value: unavailableText(prefixLimit, sourceReason) };
}

function normalizeErrorFields(rawError) {
  const specs = [
    ["name", IDENTITY_PREFIX_BYTES, true],
    ["code", IDENTITY_PREFIX_BYTES, true],
    ["message", ERROR_TEXT_PREFIX_BYTES, false],
    ["stack", ERROR_TEXT_PREFIX_BYTES, false],
  ];
  const error = {};
  const issues = [];
  for (const [key, limit, exact] of specs) {
    const inspected = inspectProperty(rawError, key);
    const issue = localIssue(`error-${key}`, inspected, lawfulText);
    if (issue) issues.push(issue);
    error[key] = propertyText(inspected, limit, exact, issue);
  }
  return { error, issues };
}

function syntheticErrorFields(synthetic, sourceReason) {
  return {
    name: syntheticTextField(IDENTITY_PREFIX_BYTES, synthetic, sourceReason),
    code: syntheticTextField(IDENTITY_PREFIX_BYTES, synthetic, sourceReason),
    message: syntheticTextField(ERROR_TEXT_PREFIX_BYTES, synthetic, sourceReason),
    stack: syntheticTextField(ERROR_TEXT_PREFIX_BYTES, synthetic, sourceReason),
  };
}

function classifyThrownValue(value) {
  if (value === null) return "null";
  const kind = typeof value;
  if (kind !== "object") return kind;
  try {
    return CAPTURED_OBJECT_TO_STRING.call(value) === "[object Error]" ? "error" : "object";
  } catch {
    return "hostile-object";
  }
}

function normalizeException(thrown) {
  const kind = classifyThrownValue(thrown);
  if (kind === "error" || kind === "object") {
    const specs = [
      ["name", IDENTITY_PREFIX_BYTES, true],
      ["code", IDENTITY_PREFIX_BYTES, true],
      ["message", ERROR_TEXT_PREFIX_BYTES, false],
      ["stack", ERROR_TEXT_PREFIX_BYTES, false],
    ];
    const fields = {};
    const issues = [];
    for (const [key, limit, exact] of specs) {
      const inspected = inspectProperty(thrown, key);
      const issue = localIssue(`exception-${key}`, inspected, lawfulText);
      if (issue) issues.push(issue);
      fields[key] = propertyText(inspected, limit, exact, issue);
    }
    return { exception: { kind, ...fields, primitive: null }, issues };
  }
  const synthetic = kind === "hostile-object" ? "hostile-parent" : "nonobject-parent";
  const sourceReason = kind === "hostile-object" ? "accessor-failed" : "field-not-applicable";
  const fields = syntheticErrorFields(synthetic, sourceReason);
  const primitive = kind === "string" ? boundedText(thrown, ERROR_TEXT_PREFIX_BYTES, false) : null;
  return { exception: { kind, ...fields, primitive }, issues: [] };
}

function directIdentity(text, limit = IDENTITY_PREFIX_BYTES) {
  return boundedBytes(Buffer.from(typeof text === "string" ? text : "", "utf8"), limit);
}

function rawErrorCode(errorValue) {
  return errorValue?.code?.value?.exact ?? null;
}

function streamPropertyValue(inspected, issue, observationIncomplete, errorValue, signalValue, statusValue) {
  const p = inspected.property;
  let sourceTotal;
  let availability = "observed";
  let bytes = inspected.raw;
  if (p.read === "get-threw" || p["buffer-check"] === "threw") {
    sourceTotal = sourceTotalUnknown("accessor-failed");
    availability = "unavailable";
    bytes = Buffer.alloc(0);
  } else if (p["own-property"] === false && p["value-kind"] === "undefined") {
    sourceTotal = sourceTotalUnknown("property-absent");
    availability = "unavailable";
    bytes = Buffer.alloc(0);
  } else if (p["value-kind"] === "undefined" || p["value-kind"] === "null") {
    sourceTotal = sourceTotalUnknown("value-nullish");
    availability = "unavailable";
    bytes = Buffer.alloc(0);
  } else if (issue?.endsWith("invalid-type")) {
    sourceTotal = sourceTotalUnknown("invalid-source-type");
    availability = "invalid";
    bytes = Buffer.alloc(0);
  } else if (p["own-check"] === "hasOwn-threw") {
    sourceTotal = sourceTotalUnknown("accessor-failed");
    if (p["value-kind"] !== "buffer" && p["value-kind"] !== "string") {
      availability = "invalid";
      bytes = Buffer.alloc(0);
    }
  } else if (observationIncomplete) sourceTotal = sourceTotalUnknown("incomplete-normalization");
  else if (rawErrorCode(errorValue) === "ETIMEDOUT") sourceTotal = sourceTotalUnknown("process-timeout");
  else if (rawErrorCode(errorValue) === "ENOBUFS") sourceTotal = sourceTotalUnknown("process-overflow");
  else if (errorValue !== null) sourceTotal = sourceTotalUnknown("spawn-unavailable");
  else if (signalValue?.type === "string") sourceTotal = sourceTotalUnknown("signal-killed");
  else if (Number.isInteger(statusValue)) sourceTotal = null;
  else sourceTotal = sourceTotalUnknown("incomplete-normalization");
  return { property: inspected.property, value: boundedBytes(bytes, STREAM_PREFIX_BYTES, availability, sourceTotal) };
}

function resultNotObjectObservation(rawResult, context) {
  const property = syntheticProperty("nonobject-parent");
  const sourceReason = "field-not-applicable";
  return {
    version: 1,
    phase: context.phase,
    origin: "spawn-result",
    normalization: { state: "incomplete", reason: "result-not-object" },
    cell: directIdentity(context.cell),
    command: directIdentity(context.command),
    shell: CONDITION_SHELL,
    "argv-prefix": context.phase === "syntax" ? ["-n", "-c"] : ["-c"],
    "timeout-ms": context.phase === "syntax" ? SYNTAX_TIMEOUT_MS : DECLARATION_TIMEOUT_MS,
    "max-buffer-bytes": PROCESS_MAX_BUFFER_BYTES,
    status: { property, value: null },
    signal: { property: syntheticProperty("nonobject-parent"), value: unavailableText(IDENTITY_PREFIX_BYTES, sourceReason) },
    error: { property: syntheticProperty("nonobject-parent"), value: null },
    exception: null,
    stdout: { property: syntheticProperty("nonobject-parent"), value: unavailableBytes(STREAM_PREFIX_BYTES, sourceReason) },
    stderr: { property: syntheticProperty("nonobject-parent"), value: unavailableBytes(STREAM_PREFIX_BYTES, sourceReason) },
  };
}

export function normalizeSpawnResult(rawResult, context) {
  if (rawResult === null || (typeof rawResult !== "object")) return resultNotObjectObservation(rawResult, context);

  const issues = [];
  const statusI = inspectProperty(rawResult, "status");
  const statusIssue = localIssue("status", statusI, lawfulStatus);
  if (statusIssue) issues.push(statusIssue);
  const statusValue = statusIssue || nullish(statusI.raw) ? null : statusI.raw;

  const signalI = inspectProperty(rawResult, "signal");
  const signalIssue = localIssue("signal", signalI, lawfulSignal);
  if (signalIssue) issues.push(signalIssue);
  const signal = propertyText(signalI, IDENTITY_PREFIX_BYTES, true, signalIssue);

  const errorI = inspectProperty(rawResult, "error");
  const errorIssue = localIssue("error", errorI, lawfulError);
  if (errorIssue) issues.push(errorIssue);
  let errorValue = null;
  if (errorIssue) {
    const synthetic = errorIssue.endsWith("invalid-type") ? "nonobject-parent" : "hostile-parent";
    errorValue = syntheticErrorFields(synthetic, synthetic === "hostile-parent" ? "accessor-failed" : "field-not-applicable");
  } else if (!nullish(errorI.raw)) {
    const normalized = normalizeErrorFields(errorI.raw);
    errorValue = normalized.error;
    issues.push(...normalized.issues);
  }

  const stdoutI = inspectProperty(rawResult, "stdout");
  const stdoutIssue = localIssue("stdout", stdoutI, lawfulStream);
  if (stdoutIssue) issues.push(stdoutIssue);
  const stderrI = inspectProperty(rawResult, "stderr");
  const stderrIssue = localIssue("stderr", stderrI, lawfulStream);
  if (stderrIssue) issues.push(stderrIssue);

  const incomplete = issues.length > 0;
  const stdout = streamPropertyValue(stdoutI, stdoutIssue, incomplete, errorValue, signal.value, statusValue);
  const stderr = streamPropertyValue(stderrI, stderrIssue, incomplete, errorValue, signal.value, statusValue);

  return {
    version: 1,
    phase: context.phase,
    origin: "spawn-result",
    normalization: incomplete ? { state: "incomplete", reason: issues[0] } : { state: "complete", reason: null },
    cell: directIdentity(context.cell),
    command: directIdentity(context.command),
    shell: CONDITION_SHELL,
    "argv-prefix": context.phase === "syntax" ? ["-n", "-c"] : ["-c"],
    "timeout-ms": context.phase === "syntax" ? SYNTAX_TIMEOUT_MS : DECLARATION_TIMEOUT_MS,
    "max-buffer-bytes": PROCESS_MAX_BUFFER_BYTES,
    status: { property: statusI.property, value: statusValue },
    signal,
    error: { property: errorI.property, value: errorValue },
    exception: null,
    stdout,
    stderr,
  };
}

function normalizeSpawnThrown(thrown, context) {
  const normalized = normalizeException(thrown);
  const property = syntheticProperty("spawn-threw");
  return {
    version: 1,
    phase: context.phase,
    origin: "spawn-threw",
    normalization: normalized.issues.length
      ? { state: "incomplete", reason: normalized.issues[0] }
      : { state: "complete", reason: null },
    cell: directIdentity(context.cell),
    command: directIdentity(context.command),
    shell: CONDITION_SHELL,
    "argv-prefix": context.phase === "syntax" ? ["-n", "-c"] : ["-c"],
    "timeout-ms": context.phase === "syntax" ? SYNTAX_TIMEOUT_MS : DECLARATION_TIMEOUT_MS,
    "max-buffer-bytes": PROCESS_MAX_BUFFER_BYTES,
    status: { property, value: null },
    signal: { property: syntheticProperty("spawn-threw"), value: unavailableText(IDENTITY_PREFIX_BYTES, "spawn-unavailable") },
    error: { property: syntheticProperty("spawn-threw"), value: null },
    exception: normalized.exception,
    stdout: { property: syntheticProperty("spawn-threw"), value: unavailableBytes(STREAM_PREFIX_BYTES, "spawn-unavailable") },
    stderr: { property: syntheticProperty("spawn-threw"), value: unavailableBytes(STREAM_PREFIX_BYTES, "spawn-unavailable") },
  };
}

function fallbackObservation(phase, tier) {
  const property = () => syntheticProperty(tier);
  return deepFreeze({
    version: 1,
    phase,
    origin: tier,
    normalization: { state: "failed", reason: tier },
    cell: unavailableBytes(IDENTITY_PREFIX_BYTES, tier),
    command: unavailableBytes(IDENTITY_PREFIX_BYTES, tier),
    shell: CONDITION_SHELL,
    "argv-prefix": phase === "syntax" ? ["-n", "-c"] : ["-c"],
    "timeout-ms": phase === "syntax" ? SYNTAX_TIMEOUT_MS : DECLARATION_TIMEOUT_MS,
    "max-buffer-bytes": PROCESS_MAX_BUFFER_BYTES,
    status: { property: property(), value: null },
    signal: { property: property(), value: unavailableText(IDENTITY_PREFIX_BYTES, tier) },
    error: { property: property(), value: null },
    exception: null,
    stdout: { property: property(), value: unavailableBytes(STREAM_PREFIX_BYTES, tier) },
    stderr: { property: property(), value: unavailableBytes(STREAM_PREFIX_BYTES, tier) },
  });
}

const NORMALIZATION_FALLBACKS = deepFreeze({
  syntax: fallbackObservation("syntax", "normalization-failed"),
  declaration: fallbackObservation("declaration", "normalization-failed"),
});
const FINAL_OBSERVER_FALLBACKS = deepFreeze({
  syntax: fallbackObservation("syntax", "final-observer-fallback"),
  declaration: fallbackObservation("declaration", "final-observer-fallback"),
});

function defaultNormalizationFailureFactory(phase) {
  return NORMALIZATION_FALLBACKS[phase];
}

export function observeConditionShell(
  condition,
  phase,
  spawn = spawnSync,
  normalizer = normalizeSpawnResult,
  normalizationFailureFactory = defaultNormalizationFailureFactory,
) {
  const command = condition.command;
  const context = { phase, cell: condition.cell, command };
  const argv = phase === "syntax" ? ["-n", "-c", command] : ["-c", command];
  const options = {
    cwd: REPO_ROOT,
    encoding: "buffer",
    timeout: phase === "syntax" ? SYNTAX_TIMEOUT_MS : DECLARATION_TIMEOUT_MS,
    maxBuffer: PROCESS_MAX_BUFFER_BYTES,
    shell: false,
  };

  try {
    let raw;
    try {
      raw = spawn(CONDITION_SHELL, argv, options);
    } catch (thrown) {
      try {
        return normalizeSpawnThrown(thrown, context);
      } catch {
        try {
          const fallback = normalizationFailureFactory(phase);
          if (fallback !== NORMALIZATION_FALLBACKS[phase]) throw new TypeError("invalid normalization fallback");
          return fallback;
        } catch {
          return FINAL_OBSERVER_FALLBACKS[phase];
        }
      }
    }
    try {
      return normalizer(raw, context);
    } catch {
      try {
        const fallback = normalizationFailureFactory(phase);
        if (fallback !== NORMALIZATION_FALLBACKS[phase]) throw new TypeError("invalid normalization fallback");
        return fallback;
      } catch {
        return FINAL_OBSERVER_FALLBACKS[phase];
      }
    }
  } catch {
    return FINAL_OBSERVER_FALLBACKS[phase];
  }
}

function refusalCode(phase, suffix) {
  return phase === "syntax" ? `condition-shell-preflight-${suffix}` : `condition-declaration-${suffix}`;
}

export function classifyConditionShellObservation(phase, observation) {
  try {
    if (observation.origin === "spawn-threw") return { admitted: false, code: refusalCode(phase, "observer-threw"), observation };
    if (observation.origin === "normalization-failed" || observation.origin === "final-observer-fallback") {
      return { admitted: false, code: refusalCode(phase, "normalization-failed"), observation };
    }
    if (observation.normalization.state !== "complete") return { admitted: false, code: refusalCode(phase, "invalid-observation"), observation };
    const error = observation.error.value;
    const errorCode = rawErrorCode(error);
    if (errorCode === "ETIMEDOUT") return { admitted: false, code: refusalCode(phase, "timeout"), observation };
    if (errorCode === "ENOBUFS") return { admitted: false, code: refusalCode(phase, "output-limit"), observation };
    if (error !== null) return { admitted: false, code: refusalCode(phase, "spawn-failed"), observation };
    const status = observation.status.value;
    const signal = observation.signal.value.type === "string";
    if (signal && status === null) return { admitted: false, code: refusalCode(phase, "signaled"), observation };
    if (status === null || signal) return { admitted: false, code: refusalCode(phase, "invalid-observation"), observation };
    if (phase === "syntax") {
      return status === 0
        ? { admitted: true, code: null, status, observation }
        : { admitted: false, code: "condition-shell-syntax-invalid", status, observation };
    }
    return { admitted: true, code: null, status, observation };
  } catch {
    const fallback = FINAL_OBSERVER_FALLBACKS[phase];
    return { admitted: false, code: refusalCode(phase, "normalization-failed"), observation: fallback };
  }
}

export function refuseConditionShell(
  refusal,
  stringify = JSON.stringify,
  writeStderr = process.stderr.write.bind(process.stderr),
) {
  let payload;
  try {
    payload = stringify({ kind: "requirement-shell-refusal", version: 1, code: refusal.code, observation: refusal.observation });
    if (typeof payload !== "string") throw new TypeError("serializer returned non-string");
  } catch {
    payload = '{"kind":"requirement-shell-refusal","version":1,"code":"evidence-serialization-failed"}';
  }
  const digest = refusal.observation?.cell?.observed?.sha256 ?? EMPTY_SHA256;
  try { writeStderr(`write-a-requirement: REFUSED — ${refusal.code} cell-sha256=${digest}\n`); } catch {}
  try { writeStderr(`${payload}\n`); } catch {}
  process.exitCode = 1;
}

export function isDirectExecution(argv1) {
  if (typeof argv1 !== "string") return false;
  try {
    return import.meta.url === pathToFileURL(resolve(argv1)).href;
  } catch {
    return false;
  }
}

function die(message, detail) {
  console.error(`write-a-requirement: REFUSED — ${message}`);
  if (detail) console.error(`  ${detail}`);
  process.exit(1);
}

function readRequirement(slug) {
  try {
    return findDataRecord(HOME, "requirements", slug)?.record ?? null;
  } catch (error) {
    die(`the requirement '${slug}' is recorded but unreadable`, error.message);
  }
}

function readIdea(slug) {
  try {
    return findDataRecord(IDEAS_HOME, "ideas", slug)?.record ?? null;
  } catch (error) {
    die(`the idea '${slug}' is recorded but unreadable`, error.message);
  }
}

function parseCondition(raw) {
  const firstPipe = raw.indexOf("|");
  if (firstPipe === -1) {
    die("a condition must carry a command, not prose", "expected 'cell:name|command' so the condition can settle");
  }
  const cell = raw.slice(0, firstPipe);
  if (!/^[a-z0-9-]+:[^\s]+$/.test(cell)) die("a condition's cell is malformed", `got '${cell}'`);
  const rest = raw.slice(firstPipe + 1);
  let command = rest;
  let expected;
  const lastPipe = rest.lastIndexOf("|");
  if (lastPipe !== -1) {
    const introducedByPipe = lastPipe > 0 && rest[lastPipe - 1] === "|";
    const tail = rest.slice(lastPipe + 1).trim();
    if (!introducedByPipe && /^-?\d+$/.test(tail)) {
      command = rest.slice(0, lastPipe);
      expected = tail;
    }
  }
  if (!command.trim()) die("a condition carries an empty command", `cell '${cell}'`);
  const expectedExit = expected === undefined ? 0 : Number(expected);
  if (!Number.isInteger(expectedExit)) die("a condition's expected exit code is not an integer", `cell '${cell}' got '${expected}'`);
  return { cell, target: "held", command: command.trim(), "expected-exit": expectedExit };
}

function validate(spec) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const check = ajv.compile(JSON.parse(readFileSync(TERM, "utf8")));
  if (check(spec)) return;
  const detail = check.errors.map((error) => `${error.instancePath || "/"} ${error.message}`).join("; ");
  die("the requirement does not validate against emsenn/term/requirement", detail);
}

function write(spec) {
  const { file } = appendDataRecord(HOME, "requirements", spec);
  spawnSync("git", ["add", file], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PATH: `/home/emsenn/.local/bin:${process.env.PATH ?? "/usr/bin:/bin"}`,
      GIT_ANT_CUSTOMER: "urn:ame:executive-office-requirement-writer",
      GIT_ANT_POLICY_FILE: join(REPO_ROOT, "lib/emsenn/services/561-group/services/red-cup-engineering/services/software-development-services-section/services/version-control-services-section/services/git-services-section/content/authorizations/executive-office-requirement-writer.json"),
    },
  });
  return file;
}

function shellObservation(condition, phase) {
  const observation = observeConditionShell(condition, phase);
  const classification = classifyConditionShellObservation(phase, observation);
  if (!classification.admitted) {
    refuseConditionShell(classification);
    return null;
  }
  return classification.status;
}

let lastPreflightAdmitted = true;
function preflightAllConditionSyntax(conditions) {
  lastPreflightAdmitted = true;
  for (const condition of conditions) {
    if (shellObservation(condition, "syntax") === null) {
      lastPreflightAdmitted = false;
      return;
    }
  }
}

function refuseCommandlessLegacy(condition) {
  const observation = {
    version: 1,
    phase: "amendment-admission",
    cell: directIdentity(typeof condition.cell === "string" ? condition.cell : ""),
    reason: "commandless",
  };
  refuseConditionShell({ code: "condition-commandless-legacy-amendment", observation });
}

function usage() {
  console.error(`usage:
  write-a-requirement.js --slug <slug> --raised-by <party> --name "<name>" --asks "<their words>" \\
      --met-when 'cell:name|command[|expected-exit]' [--met-when ...] [--tier routine|major|strategic] [--from-idea <idea-slug>]

  write-a-requirement.js --slug <slug> --tier <tier>
  write-a-requirement.js --slug <slug> --distribute <work-item>
  write-a-requirement.js --slug <new> --changes <accepted-slug> --raised-by ... --asks ... --met-when ...
flags: [--home <dir>] [--ideas-home <dir>] [--root <repo-root>]`);
  process.exit(1);
}

function main() {
  const slug = argValue("--slug");
  if (!slug) usage();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) die("the slug is not kebab-case", `got '${slug}'`);
  const existing = readRequirement(slug);
  const tier = argValue("--tier");
  const distribute = argValues("--distribute");

  if (existing && (tier || distribute.length) && !has("--changes")) {
    const inherited = existing["met-when"] ?? [];
    for (const condition of inherited) {
      if (typeof condition.command !== "string" || condition.command.length === 0) {
        refuseCommandlessLegacy(condition);
        return;
      }
    }
    preflightAllConditionSyntax(inherited);
    if (!lastPreflightAdmitted) return;
    const spec = { ...existing };
    if (tier) {
      if (!["routine", "major", "strategic"].includes(tier)) die("tier must be routine, major, or strategic", `got '${tier}'`);
      spec.tier = tier;
    }
    if (distribute.length) spec["realized-by"] = [...new Set([...(existing["realized-by"] ?? []), ...distribute])];
    validate(spec);
    const amendedFile = write(spec);
    console.log(`amended ${slug}`);
    if (tier) console.log(`  tier: ${tier}`);
    for (const workItem of distribute) console.log(`  realized-by: ${workItem}`);
    console.log(`  ${amendedFile}`);
    return;
  }

  if (existing) die(`the requirement '${slug}' is already recorded`, `use --changes ${slug} to change the ask`);
  const raisedBy = argValue("--raised-by");
  const asks = argValue("--asks");
  const name = argValue("--name") ?? slug.replace(/-/g, " ");
  const conditionArgs = argValues("--met-when");
  if (!raisedBy) die("no raiser", "Pass --raised-by.");
  if (!asks) die("no ask", "Pass --asks in the raiser's own words.");
  if (conditionArgs.length === 0) die("no conditions", "Pass --met-when 'cell:name|command'.");

  const changes = argValue("--changes");
  if (changes && !readRequirement(changes)) die(`this change names '${changes}', which is not recorded`);
  const fromIdea = argValue("--from-idea");
  if (fromIdea && !readIdea(fromIdea)) die(`this requirement names --from-idea '${fromIdea}', which is not recorded`);

  const parsed = conditionArgs.map(parseCondition);
  const core = {
    id: slug,
    name,
    kind: "requirement",
    "raised-by": raisedBy,
    asks,
    "met-when": parsed.map(({ cell, target, command, "expected-exit": expectedExit }) => ({ cell, target, command, "expected-exit": expectedExit })),
  };
  if (changes) core.changes = `emsenn/requirement/${changes}`;
  if (fromIdea) core["from-idea"] = `emsenn/idea/${fromIdea}`;
  validate(core);

  /* shell-admission:new-record:all-before-any */ preflightAllConditionSyntax(parsed);
  if (!lastPreflightAdmitted) return;

  const declarationResults = [];
  for (const condition of parsed) {
    const exit = shellObservation(condition, "declaration");
    if (exit === null) return;
    declarationResults.push(exit);
  }

  const spec = { ...core };
  if (tier) {
    if (!["routine", "major", "strategic"].includes(tier)) die("tier must be routine, major, or strategic", `got '${tier}'`);
    spec.tier = tier;
  }
  spec["x-provenance"] = { "recorded-by": argValue("--by") ?? "unrecorded", "recorded-on": new Date().toISOString().slice(0, 10) };
  validate(spec);

  console.log(`requirement ${slug}`);
  console.log(`  raised-by: ${raisedBy}`);
  console.log(`  asks: ${asks}`);
  for (let i = 0; i < parsed.length; i += 1) {
    const condition = parsed[i];
    const exit = declarationResults[i];
    console.log(`    ${condition.cell}  exit ${exit} (expected ${condition["expected-exit"]})  ${exit === condition["expected-exit"] ? "settles" : "does not settle yet"}`);
    console.log(`      $ ${condition.command}`);
  }
  const written = write(spec);
  console.log(`wrote ${written}`);
}

if (isDirectExecution(process.argv[1])) main();
