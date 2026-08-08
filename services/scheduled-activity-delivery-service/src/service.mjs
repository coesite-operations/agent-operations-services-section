#!/usr/bin/env node

import { spawn } from "node:child_process";
import { closeSync, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { makeNiUri } from "@red-cup-engineering/ni-uri-services-section";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { CONTRACT, RETIREMENT_CONTRACT } from "./law.mjs";
import { RECORD_KIND, admit, identify } from "./semantic-content.mjs";

const CONTEXT = "https://www.w3.org/ns/activitystreams";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export { CONTRACT, RETIREMENT_CONTRACT } from "./law.mjs";
// The portable service account is the default provider identity. A colony
// deployment may seat the service under its own already-contracted actor; the
// systemd unit carries that explicit incumbency rather than making it ambient.
export const ACTOR = process.env.SCHEDULED_ACTIVITY_DELIVERY_ACTOR ?? "urn:ame:scheduled-activity-delivery-service";
// The current law tightened schedule transition and delivery settlement without
// invalidating registrations admitted by its immediate predecessor.  Reads
// therefore project both append-only histories; all new writes use CONTRACT.
export const PREDECESSOR_CONTRACTS = Object.freeze([
  "ni:///sha-256;jG8aEkjcH4_x_sMyKHE6-eEIgWcaVmTTTHs6qlehW2E",
]);
const EFFECTS = Object.freeze([
  "provider-local-append-only-schedule",
  "provider-local-occurrence-reservation",
  "exact-advertised-target-operation-invocation",
]);
const MAX_TEMPLATE_BYTES = 128 * 1024;
const MAX_DELIVERY_TIMEOUT_MS = 3_600_000;
const MAX_CONCURRENT_TARGETS = 3;

function canonical(value) { return identify(value, RECORD_KIND).bytes; }
export function digest(value) { return identify(value, RECORD_KIND).id; }
function id(value) { return digest(value); }
function response(type, source, object) {
  return { "@context": CONTEXT, id: id({ actor: ACTOR, type, inReplyTo: source?.id ?? null, object }), type, actor: ACTOR,
    target: source?.actor ?? "urn:actor:unidentified", inReplyTo: source?.id ?? "urn:activity:unidentified", object };
}
function refusal(source, code, reason, contract = CONTRACT) { return response("Reject", source, { type: "Refusal", contract, code, reason, customerTerritoryMutation: false }); }
function dataRoot(options = {}) { return resolve(options.dataRoot ?? process.env.SCHEDULED_ACTIVITY_DELIVERY_DATA_ROOT ?? join(ROOT, "data")); }
function store(options = {}) {
  const journal = createSemanticRecordJournal({ root: dataRoot(options), objectKind: "scheduled-activity-delivery.record" });
  return Object.freeze({
    records: (category) => journal.query({ category }).map(({ record: value }) => value),
    record: ({ category, recordedAt, record: value }) => journal.record({ category, recordedAt, record: value, charge: { support: true, refutation: false } }),
  });
}
function records(ledger, kind) {
  return [CONTRACT, ...PREDECESSOR_CONTRACTS].flatMap((contract) => ledger.records(`${contract}.${kind}`));
}
async function append(ledger, kind, value, at) { return ledger.record({ category: `${CONTRACT}.${kind}`, recordedAt: at, record: value }); }
async function tickLedger(options = {}) {
  const durable = store(options);
  const categories = [CONTRACT, ...PREDECESSOR_CONTRACTS]
    .flatMap((contract) => ["schedules", "schedule-transitions", "delivery-receipts", "schedule-retirements", "events"].map((kind) => `${contract}.${kind}`));
  const snapshot = new Map(categories.map((category) => [category, durable.records(category)]));
  return Object.freeze({
    records(category) { return [...(snapshot.get(category) ?? [])]; },
    async record(input) {
      const receipt = await durable.record(input);
      if (!snapshot.has(input.category)) snapshot.set(input.category, []);
      snapshot.get(input.category).push(input.record);
      return receipt;
    },
  });
}
function eventRecord(source, outcome, at, details = {}) { return { specversion: "1.0", id: id({ source: source?.id, outcome, at, details }), source: ACTOR, type: `org.emsenn.scheduled-activity-delivery.${outcome}`, subject: source?.id ?? "urn:activity:unidentified", time: at, datacontenttype: "application/rmn+cbor", data: { contract: CONTRACT, sourceDigest: digest(source ?? null), ...details } }; }
async function witness(ledger, source, outcome, at, details = {}) { return append(ledger, "events", eventRecord(source, outcome, at, details), at); }
function validInstant(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function attachment(activity) { const value = activity?.object?.sourceActivity?.object?.attachment; return (Array.isArray(value) ? value : [value]).find((item) => item?.type === "ScheduledActivityDeliveryRequest"); }
function inside(root, path) { const rel = relative(root, path); return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); }
function scheduleIdentity(customer, requestDigest, targetBinding) { return id({ provider: ACTOR, customer, requestDigest, targetBinding }); }
function targetBindingFor(request, target) { return { packageDigest: target.packageDigest, entryDigest: target.entryDigest, runtimeDigest: target.runtimeDigest, runtimeFileCount: target.runtimeFileCount, operation: request.target.operation, contract: request.target.contract }; }
function sameSemantic(left, right) { return canonical(left).equals(canonical(right)); }
function registrations(ledger) { return [...records(ledger, "schedules"), ...records(ledger, "schedule-transitions").map((item) => item.successorRegistration)]; }
function retirements(ledger) { return [...records(ledger, "schedule-retirements"), ...records(ledger, "schedule-transitions").map((item) => item.predecessorRetirement)]; }
function transitionIntentPath(root, predecessorSchedule) { return join(root, "schedule-transition-intents", `${digest(predecessorSchedule).slice("ni:///sha-256;".length)}.rmn.cbor`); }
function fsyncDirectory(path) { const fd = openSync(path, "r"); try { fsyncSync(fd); } finally { closeSync(fd); } }
function ensureDurableDirectory(directory) {
  if (existsSync(directory)) {
    if (!lstatSync(directory).isDirectory()) throw new Error(`durable cell parent is not a directory: ${directory}`);
    return;
  }
  const missing = []; let cursor = directory;
  while (!existsSync(cursor)) {
    missing.push(cursor);
    const parent = dirname(cursor);
    if (parent === cursor) throw new Error(`durable cell has no existing ancestor: ${directory}`);
    cursor = parent;
  }
  for (const path of missing.reverse()) {
    try { mkdirSync(path); }
    catch (error) { if (error?.code !== "EEXIST") throw error; }
    if (!lstatSync(path).isDirectory()) throw new Error(`durable cell parent is not a directory: ${path}`);
    fsyncDirectory(dirname(path));
  }
}
let durableCellSequence = 0;
function publishDurableCell(path, bytes) {
  const directory = dirname(path); ensureDurableDirectory(directory);
  const temporary = `${path}.${process.pid}.${Date.now()}.${durableCellSequence += 1}.tmp`; let published = false;
  try {
    const fd = openSync(temporary, "wx", 0o600); try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
    try { linkSync(temporary, path); published = true; }
    catch (error) { if (error?.code !== "EEXIST") throw error; }
    if (published) { fsyncDirectory(directory); return true; }
  } finally { try { unlinkSync(temporary); } catch (error) { if (error?.code !== "ENOENT") throw error; } }
  if (!readFileSync(path).equals(bytes)) throw new Error(`durable cell conflicts with existing bytes: ${path}`);
  return false;
}
function decodeRelationalDocument(bytes) { return admit(bytes, RECORD_KIND); }
function readPreparedTransition(root, predecessorSchedule) {
  if (typeof predecessorSchedule !== "string") return null;
  const path = transitionIntentPath(root, predecessorSchedule); if (!existsSync(path)) return null;
  const prepared = decodeRelationalDocument(readFileSync(path));
  if (prepared?.type !== "ScheduleTransition" || prepared.id !== id(Object.fromEntries(Object.entries(prepared).filter(([key]) => key !== "id"))) || prepared.predecessorSchedule !== predecessorSchedule || typeof prepared.transitionRequestDigest !== "string") throw new Error("invalid prepared schedule transition");
  return prepared;
}
function preparedTransitionForSuccessor(root, successorSchedule) {
  const intentRoot = join(root, "schedule-transition-intents"); if (!existsSync(intentRoot)) return null;
  for (const name of readdirSync(intentRoot).filter((item) => item.endsWith(".rmn.cbor")).sort()) {
    const prepared = decodeRelationalDocument(readFileSync(join(intentRoot, name)));
    if (prepared?.type !== "ScheduleTransition" || prepared.id !== id(Object.fromEntries(Object.entries(prepared).filter(([key]) => key !== "id"))) || typeof prepared.transitionRequestDigest !== "string") throw new Error("invalid prepared schedule transition");
    if (prepared.successorSchedule === successorSchedule) return prepared;
  }
  return null;
}
function prepareTransition(root, candidate) {
  const path = transitionIntentPath(root, candidate.predecessorSchedule), bytes = canonical(candidate), directory = dirname(path);
  if (publishDurableCell(path, bytes)) return candidate;
  return readPreparedTransition(root, candidate.predecessorSchedule);
}

async function withScheduleMutationLock(root, action) {
  const path = join(root, "locks", "schedule-mutation.lock"); mkdirSync(dirname(path), { recursive: true });
  const holder = spawn("/usr/bin/flock", ["--exclusive", path, process.execPath, "-e", "process.stdout.write('acquired\\n'); process.stdin.resume();"], { stdio: ["pipe", "pipe", "pipe"] });
  let stderr = ""; holder.stderr.setEncoding("utf8"); holder.stderr.on("data", (chunk) => { stderr += chunk; });
  await new Promise((accept, reject) => {
    let stdout = "";
    const fail = (code, signal) => reject(new Error(`schedule mutation lock failed: code=${code ?? "none"} signal=${signal ?? "none"}${stderr ? ` ${stderr.trim()}` : ""}`));
    holder.once("error", reject); holder.once("exit", fail); holder.stdout.setEncoding("utf8");
    holder.stdout.on("data", (chunk) => { stdout += chunk; if (stdout.includes("acquired\n")) { holder.off("exit", fail); accept(); } });
  });
  try { return await action(); }
  finally { const exited = new Promise((accept) => holder.once("exit", accept)); holder.stdin.end(); await exited; }
}

function rawFileDigest(path) { return makeNiUri(readFileSync(path)); }
function rawBytesDigest(bytes) { return makeNiUri(Buffer.from(bytes)); }
function runtimeFiles(packageRoot, declaredRuntimeFiles) {
  const admitted = [];
  if (!Array.isArray(declaredRuntimeFiles) || new Set(declaredRuntimeFiles).size !== declaredRuntimeFiles.length) throw new Error("advertised runtimeFiles must be an explicit unique array");
  for (const relativePath of declaredRuntimeFiles) {
    if (typeof relativePath !== "string" || !relativePath || isAbsolute(relativePath)) throw new Error("advertised runtime file must be a relative path");
    const path = resolve(packageRoot, relativePath);
    if (!inside(packageRoot, path) || !existsSync(path) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw new Error(`advertised runtime file is absent, foreign, or not regular: ${relativePath}`);
    admitted.push({ path: relativePath.split(sep).join("/"), digest: rawFileDigest(path) });
  }
  return admitted.sort((left, right) => left.path.localeCompare(right.path));
}

function inspectTarget(target) {
  if (!target || !isAbsolute(target.packageRoot ?? "") || typeof target.nodeId !== "string" || typeof target.actor !== "string" || typeof target.operation !== "string" || typeof target.contract !== "string") return { problem: "target must name absolute packageRoot, nodeId, actor, operation, and contract" };
  if (Object.keys(target).some((key) => !["packageRoot", "nodeId", "actor", "operation", "contract"].includes(key))) return { problem: "target may name only its advertised package, actor, operation, and contract; executable, argv, environment, and shell input are forbidden" };
  const packageRoot = resolve(target.packageRoot); const packagePath = join(packageRoot, "package.json");
  if (!existsSync(packagePath) || !lstatSync(packagePath).isFile() || lstatSync(packagePath).isSymbolicLink()) return { problem: "target package.json is not a regular file" };
  let pkg; try { pkg = JSON.parse(readFileSync(packagePath, "utf8")); } catch { return { problem: "target package.json is invalid JSON" }; }
  const catalog = pkg?.["x-agentic-metro-enterprise"]?.["operation-catalog"];
  if (pkg?.["x-agentic-metro-enterprise"]?.["node-id"] !== target.nodeId) return { problem: "target node-id does not match its package advertisement" };
  if (catalog?.[target.operation]?.contract !== target.contract) return { problem: "target operation and contract are not advertised together" };
  const advertisedTimeoutMs = catalog[target.operation].timeoutMs;
  if (!Number.isSafeInteger(advertisedTimeoutMs) || advertisedTimeoutMs < 1 || advertisedTimeoutMs > MAX_DELIVERY_TIMEOUT_MS) return { problem: `target operation must advertise timeoutMs 1..${MAX_DELIVERY_TIMEOUT_MS}` };
  const bin = pkg?.bin?.[target.operation];
  if (typeof bin !== "string") return { problem: "target operation has no package bin entry" };
  const entry = resolve(packageRoot, bin);
  if (!inside(packageRoot, entry) || !existsSync(entry) || !lstatSync(entry).isFile() || lstatSync(entry).isSymbolicLink()) return { problem: "advertised target entry is absent, outside its package, or not a regular file" };
  let runtimeEntries; try { runtimeEntries = runtimeFiles(packageRoot, catalog[target.operation].runtimeFiles); } catch (error) { return { problem: error instanceof Error ? error.message : String(error) }; }
  return { packageRoot, packagePath, packageDigest: digest(readFileSync(packagePath)), entry, entryRelative: relative(packageRoot, entry).split(sep).join("/"), entryDigest: digest(readFileSync(entry)), runtimeEntries, runtimeDigest: digest(runtimeEntries), runtimeFileCount: runtimeEntries.length, advertisedTimeoutMs };
}

function immutableRuntimeImage(registration, inspected, options = {}) {
  const imageRoot = join(dataRoot(options), "runtime-images", digest({ target: registration.request.target, binding: registration.targetBinding }).slice("ni:///sha-256;".length));
  const descriptors = [
    { relativePath: "package.json", source: inspected.packagePath, expected: inspected.packageDigest, assay: digest },
    { relativePath: inspected.entryRelative, source: inspected.entry, expected: inspected.entryDigest, assay: digest },
    ...inspected.runtimeEntries.map((item) => ({ relativePath: item.path, source: resolve(inspected.packageRoot, item.path), expected: item.digest, assay: rawBytesDigest })),
  ];
  const unique = new Map();
  for (const descriptor of descriptors) {
    const prior = unique.get(descriptor.relativePath);
    if (prior && prior.expected !== descriptor.expected) throw new Error(`runtime image has conflicting commitments for ${descriptor.relativePath}`);
    unique.set(descriptor.relativePath, descriptor);
  }
  const mounts = [];
  for (const descriptor of [...unique.values()].sort((left, right) => left.relativePath.localeCompare(right.relativePath))) {
    if (!existsSync(descriptor.source) || !lstatSync(descriptor.source).isFile() || lstatSync(descriptor.source).isSymbolicLink()) throw new Error(`runtime image source is no longer a regular file: ${descriptor.relativePath}`);
    const bytes = readFileSync(descriptor.source);
    if (descriptor.assay(bytes) !== descriptor.expected) throw new Error(`runtime image source changed before capture: ${descriptor.relativePath}`);
    const imagePath = resolve(imageRoot, descriptor.relativePath);
    if (!inside(imageRoot, imagePath)) throw new Error(`runtime image path escapes its provider plate: ${descriptor.relativePath}`);
    publishDurableCell(imagePath, bytes);
    mounts.push({ source: imagePath, target: descriptor.source });
  }
  const after = inspectTarget(registration.request.target);
  if (after.problem || !sameSemantic(targetBindingFor(registration.request, after), registration.targetBinding)) throw new Error("target runtime closure changed while its immutable image was captured");
  return { imageRoot, mounts };
}

const IMMUTABLE_TARGET_SCRIPT = `
set -eu
node_binary=$1
entry=$2
image_root=$3
shift 3
/usr/bin/mount --bind "$image_root" "$image_root"
/usr/bin/mount -o remount,bind,ro "$image_root"
while [ "$#" -gt 0 ]; do
  source_file=$1
  target_file=$2
  shift 2
  /usr/bin/mount --bind "$source_file" "$target_file"
  /usr/bin/mount -o remount,bind,ro "$target_file"
done
exec /usr/bin/setpriv --bounding-set=-all --inh-caps=-all --ambient-caps=-all --no-new-privs "$node_binary" "$entry"
`;

function inspectRequest(request, at) {
  const problems = [];
  if (request?.type !== "ScheduledActivityDeliveryRequest") problems.push("request type");
  if (!request || !["dry-run", "live"].includes(request.executionMode)) problems.push("executionMode dry-run|live");
  if (!Number.isInteger(request?.schedule?.intervalSeconds) || request.schedule.intervalSeconds < 60 || request.schedule.intervalSeconds > 31_536_000) problems.push("schedule.intervalSeconds 60..31536000");
  if (!validInstant(request?.schedule?.firstDueAt)) problems.push("schedule.firstDueAt");
  if (request?.schedule?.maxDeliveries !== null && (!Number.isInteger(request?.schedule?.maxDeliveries) || request.schedule.maxDeliveries < 1 || request.schedule.maxDeliveries > 10000)) problems.push("schedule.maxDeliveries null|1..10000");
  if (!Number.isInteger(request?.timeoutMilliseconds) || request.timeoutMilliseconds < 1 || request.timeoutMilliseconds > MAX_DELIVERY_TIMEOUT_MS) problems.push(`timeoutMilliseconds 1..${MAX_DELIVERY_TIMEOUT_MS}`);
  if (request?.retry?.maxAttempts !== 1) problems.push("retry.maxAttempts must equal 1");
  if (typeof request?.deliveryCapabilityId !== "string" || !request.deliveryCapabilityId.startsWith("urn:")) problems.push("deliveryCapabilityId");
  if (!request?.activityTemplate || request.activityTemplate["@context"] !== CONTEXT || request.activityTemplate.type !== "Create" || request.activityTemplate.target !== request?.target?.actor || !request.activityTemplate.object || typeof request.activityTemplate.object !== "object") problems.push("finite ActivityStreams Create template addressed to target actor");
  if (request?.activityTemplate && ["id", "actor", "published", "capability"].some((key) => Object.hasOwn(request.activityTemplate, key))) problems.push("template must leave provider-authored envelope fields absent");
  if (canonical(request?.activityTemplate ?? null).byteLength > MAX_TEMPLATE_BYTES) problems.push("activity template byte bound");
  const target = inspectTarget(request?.target);
  if (target.problem) problems.push(target.problem);
  else if (Number.isSafeInteger(request?.timeoutMilliseconds) && request.timeoutMilliseconds > target.advertisedTimeoutMs) problems.push(`timeoutMilliseconds exceeds target operation timeoutMs ${target.advertisedTimeoutMs}`);
  if (!validInstant(at)) problems.push("provider instant");
  return { problems, target };
}

function offerObject(activity, request, target) {
  const requestDigest = digest(request); const targetBinding = targetBindingFor(request, target);
  const scheduleId = scheduleIdentity(activity.actor, requestDigest, targetBinding);
  return { type: "ExecutableServiceOffer", contract: CONTRACT, sourceActivity: activity.object.sourceActivity.id, customer: activity.actor,
    request, requestDigest, scheduleId, targetBinding,
    effects: EFFECTS, operation: "invoke-service", evidence: ["provider-owned-schedule", "one-occurrence-one-attempt-reservation", "exact-target-response-or-transport-failure"],
    nonclaims: ["HTTP-Signature-authentication", "ActivityPub-federation", "customer-work-success", "customer-territory-mutation"] };
}

function sameSet(left, right) { return Array.isArray(left) && left.length === new Set(left).size && left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]); }
function providerEmittedOffer(ledger, offer) {
  const offerDigest = digest(offer);
  return records(ledger, "events").some((event) => event?.type === "org.emsenn.scheduled-activity-delivery.offer.emitted" && event.data?.sourceDigest === offerDigest && event.data?.scheduleId === offer?.object?.scheduleId && event.data?.requestDigest === offer?.object?.requestDigest);
}
function validInvocation(activity, at, ledger) {
  const contract = activity?.object; const offer = contract?.offer; const body = offer?.object; const cap = contract?.capability;
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Accept" || activity.target !== ACTOR) return "invocation must be an ActivityStreams Accept addressed to this provider";
  if (contract?.type !== "ServiceContract" || contract.contract !== CONTRACT || offer?.type !== "Offer" || offer.actor !== ACTOR || body?.type !== "ExecutableServiceOffer" || body.contract !== CONTRACT) return "exact provider-authored offer is required";
  if (!providerEmittedOffer(ledger, offer)) return "provider has no witnessed emission of the accepted offer";
  if (activity.actor !== body.customer || body.requestDigest !== digest(body.request)) return "customer or request binding changed";
  const inspected = inspectRequest(body.request, at); if (inspected.problems.length) return `accepted request is no longer admissible: ${inspected.problems.join(", ")}`;
  const targetBinding = targetBindingFor(body.request, inspected.target);
  if (!sameSemantic(body.targetBinding, targetBinding) || body.scheduleId !== scheduleIdentity(body.customer, body.requestDigest, targetBinding)) return "target binding is not the provider-inspected canonical runtime closure";
  if (cap?.type !== "Capability" || cap.issuer !== activity.actor || cap.holder !== ACTOR || cap.invocationTarget !== ACTOR || cap.parentOffer !== offer.id || cap.attenuation?.requestDigest !== body.requestDigest || cap.attenuation?.scheduleId !== body.scheduleId || cap.singleUse !== true || !validInstant(cap.expiresAt) || Date.parse(cap.expiresAt) < Date.parse(at)) return "exact unexpired single-use registration capability is required";
  if (!sameSet(cap.allowedActions, ["invoke-service", ...EFFECTS])) return "registration capability grants inexact effects";
  return null;
}

function validTransition(activity, at, ledger) {
  const request = activity?.object; const offer = request?.offer; const body = offer?.object; const cap = request?.capability;
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Update" || activity.target !== ACTOR || request?.type !== "ScheduleTransitionRequest" || request.contract !== CONTRACT) return "transition must be an ActivityStreams Update<ScheduleTransitionRequest> addressed to this provider";
  const predecessor = registrations(ledger).find((item) => item.scheduleId === request.predecessorSchedule);
  if (!predecessor || retirements(ledger).some((item) => item.scheduleId === request.predecessorSchedule)) return "transition predecessor is absent or already retired";
  if (predecessor.customer !== activity.actor) return "only the registered customer may transition its schedule";
  if (offer?.type !== "Offer" || offer.actor !== ACTOR || body?.type !== "ExecutableServiceOffer" || body.contract !== CONTRACT || body.customer !== activity.actor) return "exact provider-authored successor offer is required";
  if (!providerEmittedOffer(ledger, offer)) return "provider has no witnessed emission of the successor offer";
  if (body.requestDigest !== digest(body.request) || body.scheduleId === request.predecessorSchedule) return "successor identity must bind a changed exact runtime closure";
  const inspected = inspectRequest(body.request, at); if (inspected.problems.length) return `successor request is no longer admissible: ${inspected.problems.join(", ")}`;
  const targetBinding = targetBindingFor(body.request, inspected.target);
  if (!sameSemantic(body.targetBinding, targetBinding) || body.scheduleId !== scheduleIdentity(body.customer, body.requestDigest, targetBinding)) return "successor target binding is not the provider-inspected canonical runtime closure";
  if (registrations(ledger).some((item) => item.scheduleId === body.scheduleId)) return "successor is already registered and cannot be introduced atomically";
  if (cap?.type !== "Capability" || cap.issuer !== activity.actor || cap.holder !== ACTOR || cap.invocationTarget !== ACTOR || cap.parentOffer !== offer.id || cap.attenuation?.predecessorSchedule !== request.predecessorSchedule || cap.attenuation?.successorSchedule !== body.scheduleId || cap.attenuation?.requestDigest !== body.requestDigest || cap.singleUse !== true || !validInstant(cap.expiresAt) || Date.parse(cap.expiresAt) < Date.parse(at)) return "exact unexpired single-use transition capability is required";
  if (!sameSet(cap.allowedActions, ["renew-schedule", ...EFFECTS])) return "transition capability grants inexact effects";
  return null;
}

export async function settle(activity, operation = "solicit-service", at = new Date().toISOString(), options = {}) {
  const ledger = options.ledger ?? store(options);
  if (operation === "solicit-service") {
    await witness(ledger, activity, "solicitation.received", at);
    if (activity?.["@context"] !== CONTEXT || activity.type !== "Offer" || activity.target !== ACTOR || activity.object?.type !== "ServiceSolicitation") return refusal(activity, "wrong-boundary", "solicitation must be an ActivityStreams Offer<ServiceSolicitation> addressed to this provider");
    const request = attachment(activity); const inspected = inspectRequest(request, at);
    if (inspected.problems.length) return response("Question", activity, { type: "ServiceTermsRequired", contract: CONTRACT, missing: inspected.problems });
    const result = response("Offer", activity, offerObject(activity, request, inspected.target)); await witness(ledger, result, "offer.emitted", at, { scheduleId: result.object.scheduleId, requestDigest: result.object.requestDigest }); return result;
  }
  if (operation === "invoke-service") {
    return withScheduleMutationLock(dataRoot(options), async () => {
      await witness(ledger, activity, "invocation.received", at); const invalid = validInvocation(activity, at, ledger); if (invalid) return refusal(activity, "invalid-contract", invalid);
      const offered = activity.object.offer.object; const prior = registrations(ledger).find((item) => item.scheduleId === offered.scheduleId);
      if (prior) return prior.requestDigest === offered.requestDigest ? response("Accept", activity, prior) : refusal(activity, "conflicting-schedule", "schedule identity was already registered with different bytes");
      if (preparedTransitionForSuccessor(dataRoot(options), offered.scheduleId)) return refusal(activity, "transition-prepared", "schedule is reserved as an atomic transition successor and cannot be registered independently");
      const registration = { type: "ScheduleRegistration", id: offered.scheduleId, scheduleId: offered.scheduleId, provider: ACTOR, customer: activity.actor, request: offered.request, requestDigest: offered.requestDigest, targetBinding: offered.targetBinding, acceptedOffer: activity.object.offer.id, registrationCapabilityDigest: digest(activity.object.capability), status: "active", registeredAt: at, customerTerritoryMutation: false };
      await append(ledger, "schedules", registration, at); await witness(ledger, registration, "schedule.registered", at, { scheduleId: registration.scheduleId }); return response("Accept", activity, registration);
    });
  }
  if (operation === "renew-schedule") {
    return withScheduleMutationLock(dataRoot(options), async () => {
      await witness(ledger, activity, "transition.received", at);
      const request = activity?.object; const offered = request?.offer?.object; const requestDigest = digest(activity);
      const prior = records(ledger, "schedule-transitions").find((item) => item.predecessorSchedule === request?.predecessorSchedule);
      if (prior) return prior.transitionRequestDigest === requestDigest ? response("Accept", activity, prior) : refusal(activity, "conflicting-transition", "predecessor already names a different authenticated successor");
      const prepared = readPreparedTransition(dataRoot(options), request?.predecessorSchedule);
      if (prepared) {
        if (prepared.transitionRequestDigest !== requestDigest) return refusal(activity, "conflicting-transition", "predecessor already has a different prepared successor");
        await append(ledger, "schedule-transitions", prepared, prepared.settledAt); await witness(ledger, prepared, "schedule.transitioned", prepared.settledAt, { predecessorSchedule: prepared.predecessorSchedule, successorSchedule: prepared.successorSchedule }); return response("Accept", activity, prepared);
      }
      const invalid = validTransition(activity, at, ledger); if (invalid) return refusal(activity, "invalid-transition", invalid);
      const successorRegistration = { type: "ScheduleRegistration", id: offered.scheduleId, scheduleId: offered.scheduleId, provider: ACTOR, customer: activity.actor, request: offered.request, requestDigest: offered.requestDigest, targetBinding: offered.targetBinding, acceptedOffer: request.offer.id, registrationCapabilityDigest: digest(request.capability), status: "active", registeredAt: at, customerTerritoryMutation: false };
      const predecessor = registrations(ledger).find((item) => item.scheduleId === request.predecessorSchedule);
      const predecessorRetirement = { type: "ScheduleRetirement", id: id({ scheduleId: predecessor.scheduleId, transition: offered.scheduleId }), scheduleId: predecessor.scheduleId, provider: ACTOR, customer: activity.actor, contract: CONTRACT, requestDigest, registrationDigest: digest(predecessor), status: "retired", retiredAt: at, customerTerritoryMutation: false };
      const body = { type: "ScheduleTransition", provider: ACTOR, customer: activity.actor, predecessorSchedule: predecessor.scheduleId, successorSchedule: successorRegistration.scheduleId, successorRegistration, predecessorRetirement, transitionRequestDigest: requestDigest, status: "settled", settledAt: at, customerTerritoryMutation: false };
      const candidate = { id: id(body), ...body }, transition = prepareTransition(dataRoot(options), candidate);
      if (transition.transitionRequestDigest !== requestDigest) return refusal(activity, "conflicting-transition", "predecessor already has a different prepared successor");
      await append(ledger, "schedule-transitions", transition, transition.settledAt); await witness(ledger, transition, "schedule.transitioned", transition.settledAt, { predecessorSchedule: transition.predecessorSchedule, successorSchedule: transition.successorSchedule }); return response("Accept", activity, transition);
    });
  }
  if (operation === "retire-schedule") {
    return withScheduleMutationLock(dataRoot(options), async () => {
      const rejectRetirement = (code, reason) => refusal(activity, code, reason, RETIREMENT_CONTRACT);
      await witness(ledger, activity, "retirement.received", at);
      const request = activity?.object;
      const scheduleId = request?.scheduleId;
      const registration = registrations(ledger).find((item) => item.scheduleId === scheduleId);
      if (activity?.["@context"] !== CONTEXT || activity.type !== "Undo" || activity.target !== ACTOR || request?.type !== "ScheduleRetirementRequest" || request.contract !== RETIREMENT_CONTRACT || typeof scheduleId !== "string") return rejectRetirement("wrong-retirement-boundary", "retirement must be an ActivityStreams Undo<ScheduleRetirementRequest> addressed to this provider");
      if (!registration) return rejectRetirement("unknown-schedule", "retirement names no provider-owned schedule");
      if (activity.actor !== registration.customer) return rejectRetirement("wrong-customer", "only the registered customer may retire its schedule");
      const cap = request.capability;
      if (cap?.type !== "Capability" || cap.issuer !== activity.actor || cap.holder !== ACTOR || cap.invocationTarget !== ACTOR || cap.attenuation?.scheduleId !== scheduleId || cap.singleUse !== true || !validInstant(cap.expiresAt) || Date.parse(cap.expiresAt) < Date.parse(at) || !sameSet(cap.allowedActions, ["retire-schedule"])) return rejectRetirement("invalid-retirement-capability", "exact unexpired single-use schedule retirement capability is required");
      const requestDigest = digest(activity);
      const prior = retirements(ledger).find((item) => item.scheduleId === scheduleId);
      if (prior) return response("Accept", activity, prior);
      const retirement = { type: "ScheduleRetirement", id: id({ scheduleId, requestDigest }), scheduleId, provider: ACTOR, customer: activity.actor, contract: RETIREMENT_CONTRACT, requestDigest, registrationDigest: digest(registration), status: "retired", retiredAt: at, customerTerritoryMutation: false };
      await append(ledger, "schedule-retirements", retirement, at); await witness(ledger, retirement, "schedule.retired", at, { scheduleId }); return response("Accept", activity, retirement);
    });
  }
  return refusal(activity, "unknown-operation", `unknown operation ${operation}`);
}

function pendingSettlementPath(root, scheduleId, occurrence) { return join(root, "pending-delivery-settlements", digest(scheduleId).slice("ni:///sha-256;".length), `${occurrence}.rmn.cbor`); }
function confirmedSettlementPath(root, scheduleId, occurrence) { return join(root, "confirmed-delivery-settlements", digest(scheduleId).slice("ni:///sha-256;".length), `${occurrence}.rmn.cbor`); }
function attemptDirectory(root, scheduleId) { return join(root, "pending-delivery-attempts", digest(scheduleId).slice("ni:///sha-256;".length)); }
function attemptPath(root, scheduleId, occurrence) { return join(attemptDirectory(root, scheduleId), `${occurrence}.rmn.cbor`); }
function readDeliveryAttempt(path) {
  const attempt = decodeRelationalDocument(readFileSync(path));
  const body = Object.fromEntries(Object.entries(attempt ?? {}).filter(([key]) => key !== "id"));
  if (attempt?.type !== "ScheduledDeliveryAttempt" || attempt.id !== id(body) || typeof attempt.scheduleId !== "string" || !Number.isSafeInteger(attempt.occurrence) || !validInstant(attempt.scheduledFor) || !validInstant(attempt.attemptedAt) || !validInstant(attempt.recoverAfter) || attempt.activityDigest !== digest(attempt.activity)) throw new Error("invalid durable delivery attempt");
  return attempt;
}
function writeDeliveryAttempt(root, attempt) {
  const path = attemptPath(root, attempt.scheduleId, attempt.occurrence); if (existsSync(path)) { readDeliveryAttempt(path); return false; }
  try { return publishDurableCell(path, canonical(attempt)); }
  catch (error) { if (!existsSync(path)) throw error; readDeliveryAttempt(path); return false; }
}
function durableAttemptOccurrences(root, scheduleId) {
  const directory = attemptDirectory(root, scheduleId); if (!existsSync(directory)) return [];
  if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) throw new Error("schedule attempt cell is not a provider-owned directory");
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const match = /^(0|[1-9][0-9]*)\.rmn\.cbor$/u.exec(entry.name); if (!match) return [];
    const occurrence = Number(match[1]); if (!Number.isSafeInteger(occurrence)) throw new Error("schedule attempt occurrence is outside the safe integer bound");
    readDeliveryAttempt(join(directory, entry.name)); return [occurrence];
  });
}
function deliveryAttemptFiles(root) {
  const found = [];
  const visit = (path) => {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child); else if (entry.isFile() && entry.name.endsWith(".rmn.cbor")) found.push(child);
    }
  };
  visit(join(root, "pending-delivery-attempts")); return found.sort();
}
function readDeliveryAttempts(root) {
  return deliveryAttemptFiles(root).map((path) => {
    try {
      const attempt = readDeliveryAttempt(path);
      return { path, attempt, error: null };
    } catch (error) { return { path, attempt: null, error }; }
  });
}
function pendingSettlementFiles(root) {
  const found = [];
  const visit = (path) => {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child); else if (entry.isFile() && entry.name.endsWith(".rmn.cbor")) found.push(child);
    }
  };
  visit(join(root, "pending-delivery-settlements")); return found.sort();
}
function writePendingSettlement(root, receipt, recordedAt) {
  const path = pendingSettlementPath(root, receipt.scheduleId, receipt.occurrence);
  const bytes = canonical({ type: "PendingDeliverySettlement", receipt, recordedAt });
  publishDurableCell(path, bytes);
}
function confirmPendingSettlement(root, receipt) {
  const path = confirmedSettlementPath(root, receipt.scheduleId, receipt.occurrence), bytes = canonical({ type: "DeliverySettlementProjectionConfirmed", receipt: receipt.id, scheduleId: receipt.scheduleId, occurrence: receipt.occurrence, appendOnly: true });
  publishDurableCell(path, bytes);
}
function readPendingSettlements(root) {
  return pendingSettlementFiles(root).filter((path) => {
    const occurrence = Number(path.split(sep).at(-1).replace(/\.rmn\.cbor$/u, "")), scheduleDigest = path.split(sep).at(-2);
    return !existsSync(join(root, "confirmed-delivery-settlements", scheduleDigest, `${occurrence}.rmn.cbor`));
  }).map((path) => {
    try {
      const pending = decodeRelationalDocument(readFileSync(path));
      if (pending?.type !== "PendingDeliverySettlement" || pending.receipt?.type !== "ScheduledDeliveryReceipt" || !validInstant(pending.recordedAt)) throw new Error("invalid pending delivery settlement");
      return { path, pending, error: null };
    } catch (error) { return { path, pending: null, error }; }
  });
}
async function ensureDeliverySettlement(ledger, pending, state = null) {
  const receipt = pending.receipt; const details = { scheduleId: receipt.scheduleId, occurrence: receipt.occurrence, disposition: receipt.disposition };
  const receiptIds = state?.receiptIds ?? new Set(records(ledger, "delivery-receipts").map((item) => item.id));
  const eventIds = state?.eventIds ?? new Set(records(ledger, "events").map((item) => item.id));
  if (!receiptIds.has(receipt.id)) { await append(ledger, "delivery-receipts", receipt, pending.recordedAt); receiptIds.add(receipt.id); }
  const event = eventRecord(receipt, "delivery.settled", pending.recordedAt, details);
  if (!eventIds.has(event.id)) { await append(ledger, "events", event, pending.recordedAt); eventIds.add(event.id); }
  return receipt;
}
async function reconcilePendingSettlements(root, ledger) {
  const recovered = []; const failures = [], state = { receiptIds: new Set(records(ledger, "delivery-receipts").map((item) => item.id)), eventIds: new Set(records(ledger, "events").map((item) => item.id)) };
  for (const candidate of readPendingSettlements(root)) {
    if (candidate.error) { failures.push({ type: "PendingDeliverySettlementResidue", receipt: null, scheduleId: null, occurrence: null, sourceDigest: digest(candidate.path), errorDigest: digest(candidate.error instanceof Error ? candidate.error.message : String(candidate.error)), customerTerritoryMutation: false }); continue; }
    const pending = candidate.pending;
    const receiptPresent = state.receiptIds.has(pending.receipt.id);
    const details = { scheduleId: pending.receipt.scheduleId, occurrence: pending.receipt.occurrence, disposition: pending.receipt.disposition };
    const eventPresent = state.eventIds.has(eventRecord(pending.receipt, "delivery.settled", pending.recordedAt, details).id);
    if (receiptPresent && eventPresent) { confirmPendingSettlement(root, pending.receipt); continue; }
    try { await ensureDeliverySettlement(ledger, pending, state); confirmPendingSettlement(root, pending.receipt); recovered.push(pending.receipt.id); }
    catch (error) { failures.push({ type: "PendingDeliverySettlementResidue", receipt: pending.receipt.id, scheduleId: pending.receipt.scheduleId, occurrence: pending.receipt.occurrence, errorDigest: digest(error instanceof Error ? error.message : String(error)), customerTerritoryMutation: false }); }
  }
  return { recovered, failures };
}
async function reconcileInterruptedAttempts(root, ledger, at) {
  const recovered = [], failures = []; const receiptOccurrences = new Set(records(ledger, "delivery-receipts").map((item) => `${item.scheduleId}\n${item.occurrence}`));
  for (const candidate of readDeliveryAttempts(root)) {
    if (candidate.error) { failures.push({ type: "InterruptedDeliveryAttemptResidue", attempt: null, errorDigest: digest(candidate.error instanceof Error ? candidate.error.message : String(candidate.error)), customerTerritoryMutation: false }); continue; }
    const attempt = candidate.attempt, key = `${attempt.scheduleId}\n${attempt.occurrence}`;
    if (receiptOccurrences.has(key) || existsSync(confirmedSettlementPath(root, attempt.scheduleId, attempt.occurrence)) || existsSync(pendingSettlementPath(root, attempt.scheduleId, attempt.occurrence)) || Date.parse(at) < Date.parse(attempt.recoverAfter)) continue;
    const body = { type: "ScheduledDeliveryReceipt", attempt: attempt.id, scheduleId: attempt.scheduleId, occurrence: attempt.occurrence, scheduledFor: attempt.scheduledFor, attemptedAt: attempt.attemptedAt, activity: attempt.activity, activityDigest: attempt.activityDigest, disposition: "outcome-unknown-after-interruption", targetResponse: null, targetResponseDigest: null, process: { status: null, signal: null, stderrDigest: digest("provider-interrupted-after-attempt-intent"), wallTimeMilliseconds: null }, retryAuthorized: false, customerTerritoryMutation: false };
    const receipt = { id: id({ scheduleId: attempt.scheduleId, occurrence: attempt.occurrence, attempt: attempt.id, activity: attempt.activity, disposition: body.disposition, response: null }), ...body };
    const pending = { type: "PendingDeliverySettlement", receipt, recordedAt: at }; writePendingSettlement(root, receipt, at);
    try { await ensureDeliverySettlement(ledger, pending); confirmPendingSettlement(root, receipt); receiptOccurrences.add(key); recovered.push(receipt.id); }
    catch (error) { failures.push({ type: "InterruptedDeliveryAttemptResidue", attempt: attempt.id, receipt: receipt.id, scheduleId: attempt.scheduleId, occurrence: attempt.occurrence, errorDigest: digest(error instanceof Error ? error.message : String(error)), customerTerritoryMutation: false }); }
  }
  return { recovered, failures };
}
function deliveredActivity(registration, occurrence, scheduledFor, at) {
  const template = registration.request.activityTemplate;
  const { object: _templateObject, ...templateEnvelope } = template;
  const demand = { ...template.object, pulseId: `${registration.scheduleId}#${occurrence}` };
  // ActivityPub only standardizes its public carrier.  A customer's private
  // capability and demand vocabulary belongs inside a typed document; putting
  // unknown terms directly on an Activity causes conforming JSON-LD processors
  // to discard them before the customer can inspect the work order.
  const activityPubDelivery = registration.request.target.contract === "activitypub-services-section/signed-delivery/v1";
  const object = activityPubDelivery
    ? {
        type: "Document",
        mediaType: "application/vnd.emsenn.rmn+json",
        content: JSON.stringify({
          type: "ScheduledActivityWorkOrder",
          capability: registration.request.deliveryCapabilityId,
          demand,
        }),
      }
    : demand;
  const body = {
    ...templateEnvelope,
    actor: ACTOR,
    target: template.target,
    ...(activityPubDelivery ? {} : { capability: registration.request.deliveryCapabilityId }),
    published: at,
    object,
  };
  return { id: id(body), ...body };
}
function admittedTargetEnvironment() {
  const names = String(process.env.SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => /^[A-Z][A-Z0-9_]*$/u.test(name));
  return Object.fromEntries(names.flatMap((name) => process.env[name] === undefined ? [] : [[name, process.env[name]]]));
}
async function invokeTarget(registration, activity, options = {}) {
  if (registration.request.executionMode === "dry-run") return { status: 0, signal: null, stdout: "", stderr: "", response: null, problem: null, dryRun: true };
  if (typeof options.targetInvoker === "function") return await options.targetInvoker(registration, activity);
  const inspected = inspectTarget(registration.request.target); if (inspected.problem) return { status: null, signal: null, stdout: "", stderr: inspected.problem, response: null, problem: "target-runtime-inspection-failed", dryRun: false };
  if (registration.targetBinding?.packageDigest !== inspected.packageDigest || registration.targetBinding?.entryDigest !== inspected.entryDigest || registration.targetBinding?.runtimeDigest !== inspected.runtimeDigest) return { status: null, signal: null, stdout: "", stderr: "target runtime closure changed after schedule registration", response: null, problem: "target-runtime-closure-changed", dryRun: false };
  // Own the complete target process tree. Node's spawnSync timeout only
  // terminates its immediate child; a target can launch inference clients or
  // deployment tools which would otherwise survive it and starve the colony.
  // GNU timeout creates and terminates the foreground process group, while
  // nice keeps an admitted long-running issue below interactive recovery work.
  const timeoutExecutable = "/usr/bin/timeout";
  const niceExecutable = "/usr/bin/nice";
  const unshareExecutable = "/usr/bin/unshare";
  const mountExecutable = "/usr/bin/mount";
  const setprivExecutable = "/usr/bin/setpriv";
  if (![timeoutExecutable, niceExecutable, unshareExecutable, mountExecutable, setprivExecutable].every(existsSync)) return { status: null, signal: null, stdout: "", stderr: "bounded immutable delivery requires /usr/bin/timeout, /usr/bin/nice, /usr/bin/unshare, /usr/bin/mount, and /usr/bin/setpriv", response: null, problem: "target-runtime-isolation-unavailable", dryRun: false };
  let image;
  try { image = immutableRuntimeImage(registration, inspected, options); }
  catch (error) { return { status: null, signal: null, stdout: "", stderr: error instanceof Error ? error.message : String(error), response: null, problem: "target-runtime-image-failed", dryRun: false }; }
  const timeoutSeconds = (registration.request.timeoutMilliseconds / 1000).toFixed(3).replace(/\.?0+$/u, "");
  const hardStopGraceMilliseconds = options.hardStopGraceMilliseconds ?? 20_000;
  if (!Number.isSafeInteger(hardStopGraceMilliseconds) || hardStopGraceMilliseconds < 0 || hardStopGraceMilliseconds > 20_000) throw new Error("ScheduleDelivery hard-stop grace is outside the provider bound");
  // Use the timeout option subset shared by GNU coreutils and the uutils
  // coreutils installed on Cold Red Gate. uutils 0.2.2 returns 125 for
  // --kill-after; the service cgroup remains the hard-stop boundary.
  const result = await new Promise((resolveInvocation) => {
    const namespaceArguments = ["--user", "--map-root-user", "--mount", "--propagation", "private", "/bin/sh", "-c", IMMUTABLE_TARGET_SCRIPT, "scheduled-activity-delivery-immutable-target", process.execPath, inspected.entry, image.imageRoot, ...image.mounts.flatMap(({ source, target }) => [source, target])];
    const child = spawn(timeoutExecutable, ["--signal=TERM", `${timeoutSeconds}s`, niceExecutable, "-n", "10", unshareExecutable, ...namespaceArguments], {
      cwd: registration.request.target.packageRoot,
      stdio: ["pipe", "pipe", "pipe"],
      detached: true,
    // Target resources remain denied by default. A colony deployment may grant
    // named, non-secret service addresses through one explicit allowlist; this
    // makes a scheduled contract capable of hiring its declared providers
    // without leaking the ScheduleDelivery's ambient process environment.
      env: { PATH: process.env.PATH, NODE_PATH: process.env.NODE_PATH, NO_COLOR: "1", ...admittedTargetEnvironment() },
    });
    const maximum = 16 * 1024 * 1024; const stdout = []; const stderr = []; let stdoutBytes = 0; let stderrBytes = 0; let overflow = false; let spawnError = null;
    const collect = (chunks, key) => (chunk) => {
      if (key === "stdout") stdoutBytes += chunk.length; else stderrBytes += chunk.length;
      if (stdoutBytes > maximum || stderrBytes > maximum) { overflow = true; child.kill("SIGTERM"); return; }
      chunks.push(chunk);
    };
    child.stdout.on("data", collect(stdout, "stdout")); child.stderr.on("data", collect(stderr, "stderr")); child.on("error", (error) => { spawnError = error; }); child.stdin.on("error", (error) => { spawnError ??= error; });
    const hardStop = setTimeout(() => {
      try { process.kill(-child.pid, "SIGKILL"); }
      catch (error) { if (error?.code !== "ESRCH") { spawnError ??= error; child.kill("SIGKILL"); } }
    }, registration.request.timeoutMilliseconds + hardStopGraceMilliseconds);
    child.on("close", (status, signal) => { clearTimeout(hardStop); resolveInvocation({ status, signal, stdout: Buffer.concat(stdout).toString("utf8"), stderr: overflow ? "target output exceeded 16 MiB" : spawnError?.stack ?? Buffer.concat(stderr).toString("utf8") }); });
    child.stdin.end(`${JSON.stringify(activity)}\n`);
  });
  let parsed = null; try { parsed = JSON.parse(result.stdout); } catch { /* recorded as transport failure */ }
  return { status: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr, response: parsed, problem: parsed === null ? "target-response-unparseable" : null, dryRun: false };
}

async function invokeFairly(attempts, maximum = MAX_CONCURRENT_TARGETS) {
  const completed = new Array(attempts.length); let cursor = 0;
  const worker = async () => {
    while (cursor < attempts.length) {
      const index = cursor; cursor += 1; const attempt = attempts[index], started = Date.now();
      const invoked = await invokeTarget(attempt.registration, attempt.activity, attempt.options).catch((error) => ({ status: null, signal: null, stdout: "", stderr: error instanceof Error ? error.stack ?? error.message : String(error), response: null, problem: "target-invocation-failed", dryRun: false }));
      completed[index] = { ...attempt, started, invoked };
    }
  };
  await Promise.all(Array.from({ length: Math.min(maximum, attempts.length) }, () => worker())); return completed;
}

export function targetResponseProblem(response, registration, activity) {
  const object = response?.object;
  if (response?.["@context"] !== CONTEXT) return "foreign-context";
  if (response?.actor !== registration?.request?.target?.actor) return "foreign-target-actor";
  if (response?.target !== ACTOR) return "foreign-provider-target";
  if (response?.inReplyTo !== activity?.id) return "foreign-reply";
  if (typeof object?.type !== "string") return "missing-target-response-type";
  if (object.contract !== registration?.request?.target?.contract) return "foreign-target-contract";
  if (object.customerTerritoryMutation !== false) return "target-mutation-claim";
  if (response.type === "Accept") return null;
  if (response.type === "Reject" && /Refusal$/u.test(object.type) && typeof object.reason === "string" && object.reason) return null;
  return "unsupported-target-decision";
}
function targetDecisionType(response, registration, activity) {
  if (targetResponseProblem(response, registration, activity)) return null;
  if (response.type === "Accept") return "accept";
  if (response.type === "Reject") return "reject";
  return null;
}

export async function runDue(at = new Date().toISOString(), options = {}) {
  if (!validInstant(at)) throw new Error("run-due requires an explicit valid instant");
  const root = dataRoot(options), ledger = options.ledger ?? tickLedger(options); const reconciliation = await reconcilePendingSettlements(root, ledger); const interruption = await reconcileInterruptedAttempts(root, ledger, at); const receipts = records(ledger, "delivery-receipts"); const retired = new Set(retirements(ledger).map((item) => item.scheduleId)); const attempts = []; const results = []; const settlementFailures = [...reconciliation.failures, ...interruption.failures];
  for (const registration of registrations(ledger)) {
    if (registration.status !== "active" || retired.has(registration.scheduleId)) continue;
    const first = Date.parse(registration.request.schedule.firstDueAt); const now = Date.parse(at); if (now < first) continue;
    const occurrence = Math.floor((now - first) / (registration.request.schedule.intervalSeconds * 1000));
    const attemptedOccurrences = new Set([...receipts.filter((item) => item.scheduleId === registration.scheduleId).map((item) => item.occurrence), ...durableAttemptOccurrences(root, registration.scheduleId)]);
    if (registration.request.schedule.maxDeliveries !== null && attemptedOccurrences.size >= registration.request.schedule.maxDeliveries) continue;
    if (receipts.some((item) => item.scheduleId === registration.scheduleId && item.occurrence === occurrence)) continue;
    const scheduledFor = new Date(first + occurrence * registration.request.schedule.intervalSeconds * 1000).toISOString(); const activity = deliveredActivity(registration, occurrence, scheduledFor, at);
    const attemptBody = { type: "ScheduledDeliveryAttempt", scheduleId: registration.scheduleId, occurrence, scheduledFor, attemptedAt: at, recoverAfter: new Date(Date.parse(at) + registration.request.timeoutMilliseconds + 20_000).toISOString(), activity, activityDigest: digest(activity), targetBinding: registration.targetBinding, retryAuthorized: false, customerTerritoryMutation: false };
    const attempt = { id: id(attemptBody), ...attemptBody }; if (!writeDeliveryAttempt(root, attempt)) continue;
    attempts.push({ registration, occurrence, scheduledFor, activity, attempt, options });
  }
  const completed = await invokeFairly(attempts);
  // Target work is concurrent, but append-only settlement remains serialized
  // so a slow enterprise cannot monopolize the clock and a flaky WitnessJournal carrier
  // is not needlessly flooded by simultaneous projections.
  for (const { registration, occurrence, scheduledFor, activity, attempt, started, invoked } of completed) {
    const targetProblem = invoked.dryRun ? null : invoked.problem ?? targetResponseProblem(invoked.response, registration, activity);
    const targetDecision = invoked.dryRun ? null : targetDecisionType(invoked.response, registration, activity);
    const disposition = invoked.dryRun ? "dry-run" : targetDecision ? `target-${targetDecision}` : "transport-failure";
    const receipt = { type: "ScheduledDeliveryReceipt", id: id({ scheduleId: registration.scheduleId, occurrence, attempt: attempt.id, activity, disposition, response: invoked.response }), attempt: attempt.id, scheduleId: registration.scheduleId, occurrence, scheduledFor, attemptedAt: at, activity, activityDigest: digest(activity), disposition, targetResponse: invoked.response, targetResponseDigest: invoked.response ? digest(invoked.response) : null, targetResponseProblem: targetProblem, process: { status: invoked.status, signal: invoked.signal, stderrDigest: digest(invoked.stderr ?? ""), wallTimeMilliseconds: Date.now() - started }, retryAuthorized: false, customerTerritoryMutation: false };
    const pending = { type: "PendingDeliverySettlement", receipt, recordedAt: at }; writePendingSettlement(root, receipt, at);
    try { await ensureDeliverySettlement(ledger, pending); confirmPendingSettlement(root, receipt); }
    catch (error) { settlementFailures.push({ type: "PendingDeliverySettlementResidue", receipt: receipt.id, scheduleId: registration.scheduleId, occurrence, errorDigest: digest(error instanceof Error ? error.message : String(error)), customerTerritoryMutation: false }); }
    results.push(receipt);
  }
  return { type: "ScheduledDeliveryTickResult", actor: ACTOR, at, attempted: results.length, receipts: results, recoveredSettlements: reconciliation.recovered, recoveredInterruptedAttempts: interruption.recovered, pendingSettlements: settlementFailures, concurrentTargetIsolation: true, maximumConcurrentTargets: MAX_CONCURRENT_TARGETS, perScheduleFailureIsolation: true, noCatchUpCascade: true };
}

function arg(name, fallback) { const index = process.argv.indexOf(name); return index < 0 ? fallback : process.argv[index + 1]; }
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const operation = arg("--operation", "solicit-service"); const at = arg("--now", new Date().toISOString());
  try { const output = operation === "run-due" ? await runDue(at) : await settle(JSON.parse(readFileSync(0, "utf8")), operation, at); process.stdout.write(`${JSON.stringify(output, null, 2)}\n`); if (output.type === "Reject") process.exitCode = 2; }
  catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; }
}
