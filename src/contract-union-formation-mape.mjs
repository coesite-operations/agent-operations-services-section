#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { academySemanticRecordStore } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/semantic-records";
import { canonical, contentId, digest } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/a2a";
import { inspectMeshScope } from "../lib/management/skills/enforcing-mesh-scope/scripts/mesh-scope.js";

const CONTEXT = "https://www.w3.org/ns/activitystreams";
const NODE_ID = "union-officer-academy";
const ACTOR = `urn:ame:${NODE_ID}`;
const LMT = "urn:ame:leader-movement-team";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MEMBERS = {
  monitor: { id: "context-compilation-xiaowei", package: "@coesite-operations/rendanheyi-context-compilation-xiaowei" },
  analyze: { id: "independent-examination-xiaowei", package: "@coesite-operations/rendanheyi-independent-examination-xiaowei" },
  plan: { id: "formation-market-xiaowei", package: "@coesite-operations/rendanheyi-formation-market-xiaowei" },
  execute: { id: "situated-practice-xiaowei", package: "@coesite-operations/rendanheyi-situated-practice-xiaowei" },
  knowledge: { id: "qualification-registry-xiaowei", package: "@coesite-operations/rendanheyi-qualification-registry-xiaowei" }
};
const OPERATIONAL_PATHS = [
  "content/constitutions/formation-lianqun.json",
  "content/services/enterprise-formation-mape.json",
  "lib/schemas/a2a-message-send.schema.json",
  "lib/schemas/mape-stage.schema.json",
  "content/protocols/a2a-stdio-jsonrpc-v1.json",
  "lib/management/skills/enforcing-mesh-scope/scripts/mesh-scope.js",
  "src/verify-operational-academy.mjs",
  "src/contract-officer-formation.mjs",
  "test/operational-academy.test.mjs"
];

function arg(flag) { const index = process.argv.indexOf(flag); return index < 0 ? undefined : process.argv[index + 1]; }
function operation() { return arg("--operation") ?? "mape-formation-territory"; }
function instant() { return arg("--now") ?? new Date().toISOString(); }
function input() { return JSON.parse(readFileSync(0, "utf8")); }
function response(type, source, object) {
  return { "@context": CONTEXT, id: contentId({ actor: ACTOR, type, inReplyTo: source?.id ?? null, object }), type, actor: ACTOR, target: source?.actor ?? LMT, inReplyTo: source?.id ?? "urn:activity:unidentified", object };
}
function settlementStore() { return academySemanticRecordStore(NODE_ROOT); }
function append(type, value, at, assertions = []) { return settlementStore().record({ category: `union-officer-academy.${type}`, recordedAt: at, record: value, assertions }); }
async function witness(activity, outcome, at, details = {}) {
  const body = { source: ACTOR, type: `org.emsenn.${NODE_ID}.${outcome}`, subject: activity?.id ?? "urn:activity:unidentified", time: at, data: { activityDigest: digest(activity ?? null), ...details } };
  const event = { specversion: "1.0", id: contentId(body), ...body, datacontenttype: "application/json" };
  const assertions = [["activity/outcome", outcome], ...Object.entries(details).filter(([, v]) => typeof v === "string")]
    .map(([attribute, value]) => ({ subject: body.subject, predicate: `urn:emsenn:academy:${attribute}`, object: { kind: "literal", value } }));
  await append("boundary-event", event, at, assertions);
  return event;
}
async function reject(source, reason, at, details = {}) { const value = response("Reject", source, { type: "Refusal", reason, ...details }); await witness(source, "activity.rejected", at, { reason }); return value; }
function attachments(note) { return Array.isArray(note?.attachment) ? note.attachment : note?.attachment === undefined ? [] : [note.attachment]; }
function formationDemand(source) { return attachments(source?.object).find((item) => item?.type === "OfficerFormationDemand") ?? null; }

function normalizedRequest(source) {
  const supplied = attachments(source?.object).find((item) => item?.type === "EnterpriseFormationMapeRequest");
  if (!supplied) return null;
  return {
    roots: Array.isArray(supplied.roots) ? [...new Set(supplied.roots.map((item) => typeof item === "string" ? resolve(item) : item))] : supplied.roots,
    scope: supplied.scope ?? "union-readiness",
    purposes: Array.isArray(supplied.purposes) ? [...new Set(supplied.purposes)] : supplied.purposes,
    executionMode: supplied.executionMode ?? "live"
  };
}
function requestProblems(request, checkFilesystem = false) {
  const problems = [];
  if (!request || !Array.isArray(request.roots) || request.roots.length === 0 || request.roots.some((item) => typeof item !== "string" || !isAbsolute(item))) problems.push("roots(absolute paths)");
  if (!request || !["academy-operability", "union-readiness"].includes(request.scope)) problems.push("scope(academy-operability|union-readiness)");
  if (!request || !Array.isArray(request.purposes) || request.purposes.length === 0 || request.purposes.some((item) => typeof item !== "string" || !item)) problems.push("purposes(nonempty strings)");
  if (!request || !["dry-run", "live"].includes(request.executionMode)) problems.push("executionMode(dry-run|live)");
  if (checkFilesystem && Array.isArray(request?.roots)) for (const root of request.roots) if (!existsSync(root)) problems.push(`unreadable-root:${root}`);
  return problems;
}
function recognizes(source) {
  if (normalizedRequest(source)) return true;
  const content = source?.object?.content;
  return typeof content === "string" && /academy|officer formation|curricul|professionaliz/iu.test(content) && /MAPE|map the union|readiness|self.improv/iu.test(content);
}
async function solicit(activity, at) {
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Offer" || activity.target !== ACTOR || activity.object?.type !== "ServiceSolicitation") return reject(activity, "solicitation must be an ActivityStreams Offer<ServiceSolicitation> addressed to the Academy", at);
  const source = activity.object.sourceActivity;
  const exactFormationDemand = formationDemand(source);
  // An exact officer demand is the prerequisite intervention, not evidence that
  // the same unformed incumbent may skip ahead to a Union readiness map.  The
  // formed officer returns through a later, distinct MAPE-K procurement.
  if (exactFormationDemand) {
    const requestDigest = digest(exactFormationDemand);
    const object = {
      type: "ExecutableServiceOffer", sourceActivity: source.id,
      intentSignature: "urn:service-intent:compile-exact-office-formation-bundle",
      request: exactFormationDemand, requestDigest, scope: { formationDemandDigest: requestDigest, customer: exactFormationDemand.customer, office: exactFormationDemand.office?.id },
      operation: "invoke-officer-formation", effects: ["filesystem-read"], requirements: [
        { type: "ResourceGrant", effect: "filesystem-read" },
        { type: "ServiceTerm", term: "price-or-internal-value-agreement", suppliedBy: "OfficerFormationDemand.valueAgreement" }
      ],
      evidence: ["digest-bound-formation-request", "office-formation-bundle-or-typed-refusal", "provider-local-records", "no-customer-write"]
    };
    const offer = response("Offer", activity, object); await witness(activity, "formation.offer.emitted", at, { offer: offer.id, requestDigest }); return offer;
  }
  if (!recognizes(source)) return reject(activity, "source intent does not request Academy formation MAPE-K", at);
  const request = normalizedRequest(source); const missing = requestProblems(request);
  if (missing.length) return response("Question", activity, { type: "ServiceTermsRequired", sourceActivity: source?.id, missing });
  const object = {
    type: "ExecutableServiceOffer", sourceActivity: source.id,
    intentSignature: "urn:service-intent:mape-enterprise-formation-readiness",
    request, requestDigest: digest(request),
    ...(exactFormationDemand ? { formationDemand: exactFormationDemand, formationDemandDigest: digest(exactFormationDemand) } : {}),
    scope: { roots: request.roots, formationScope: request.scope, ...(exactFormationDemand ? { formationDemandDigest: digest(exactFormationDemand) } : {}) },
    operation: "invoke-service", effects: request.executionMode === "live" ? ["filesystem-read"] : [],
    requirements: request.executionMode === "live" ? [{ type: "ResourceGrant", effect: "filesystem-read" }] : [],
    evidence: ["predecessor-linked-mape-stages", "A2A-member-tasks", "knowledge-commit", "formation-intervention-offers", "no-customer-write"]
  };
  const offer = response("Offer", activity, object); await witness(activity, "offer.emitted", at, { offer: offer.id, requestDigest: object.requestDigest }); return offer;
}
function invocationProblem(activity) {
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Accept" || activity.target !== ACTOR) return "invocation must be an ActivityStreams Accept addressed to the Academy";
  const contract = activity.object;
  if (contract?.type !== "ServiceContract") return "invocation must accept a ServiceContract";
  const offer = contract.offer;
  if (offer?.type !== "Offer" || offer.actor !== ACTOR || offer.object?.type !== "ExecutableServiceOffer") return "ServiceContract must carry the Academy's provider Offer";
  const request = offer.object.request;
  if (offer.object.requestDigest !== digest(request)) return "accepted request differs from provider-authored bytes";
  const changed = requestProblems(request, request.executionMode === "live"); if (changed.length) return `accepted request no longer satisfies terms: ${changed.join(", ")}`;
  const capability = contract.capability;
  if (capability?.type !== "Capability" || capability.holder !== ACTOR || capability.invocationTarget !== ACTOR) return "invocation requires a capability held by the Academy";
  if (capability.parentOffer !== offer.id || capability.attenuation?.requestDigest !== offer.object.requestDigest) return "capability is not attenuated to the accepted offer";
  if (canonical(capability.attenuation?.providerScope) !== canonical(offer.object.scope)) return "capability scope differs from provider-authored roots";
  if (capability.capTP?.target !== ACTOR || capability.capTP.method !== "invoke-service") return "capability requires exact CapTP target and method";
  if (!(capability.allowedActions ?? []).includes("invoke-service")) return "capability omits invoke-service";
  for (const effect of offer.object.effects) if (!capability.allowedActions.includes(effect)) return `capability omits ${effect}`;
  return null;
}

function filesBelow(root, stop = new Set([".git", "node_modules", "data", "assets", "_archive"])) {
  const output = []; let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return output; }
  for (const entry of entries) {
    if (stop.has(entry.name)) continue;
    const path = join(root, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) output.push(...filesBelow(path, stop)); else output.push(path);
  }
  return output;
}
function fileDigest(path) { return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`; }
function runJsonProcess(runner, cwd, args, value, timeout = 30_000) {
  const transportRoot = mkdtempSync(join(tmpdir(), "academy-mape-stdio-"));
  const stdinPath = join(transportRoot, "stdin");
  const stdoutPath = join(transportRoot, "stdout");
  const stderrPath = join(transportRoot, "stderr");
  writeFileSync(stdinPath, JSON.stringify(value));
  const stdinFd = openSync(stdinPath, "r");
  const stdoutFd = openSync(stdoutPath, "w");
  const stderrFd = openSync(stderrPath, "w");
  const result = spawnSync(process.execPath, [runner, ...args], { cwd, stdio: [stdinFd, stdoutFd, stderrFd], timeout });
  closeSync(stdinFd); closeSync(stdoutFd); closeSync(stderrFd);
  const stdout = readFileSync(stdoutPath, "utf8"); const stderr = readFileSync(stderrPath, "utf8");
  rmSync(transportRoot, { recursive: true, force: true });
  let output; try { output = JSON.parse(stdout); } catch { throw new Error(`${runner} returned no JSON (exit=${result.status}, signal=${result.signal}): ${stderr || stdout}`); }
  return { output, status: result.status, signal: result.signal, stderr };
}
function localPackageId(name) {
  if (typeof name !== "string" || name.length === 0) return null;
  const id = name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name;
  return id.length > 0 ? id : null;
}
function containingRoot(path, roots) {
  return roots.find((root) => path === root || path.startsWith(`${root}${sep}`)) ?? null;
}
function meshScope(authorityRoot, subject) {
  if (!authorityRoot) return { boundary: false, boundaries: [] };
  try {
    const scope = inspectMeshScope({ authorityRoot, subject });
    return { boundary: scope.deepestOwner === resolve(subject), boundaries: scope.boundaries };
  } catch {
    return { boundary: false, boundaries: [] };
  }
}
function nearestMembrane(path, roots, cache) {
  let cursor = dirname(path);
  while (true) {
    if (cache.has(cursor)) return cache.get(cursor);
    const pkgPath = join(cursor, "package.json");
    if (existsSync(pkgPath)) try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      const advertisedNodeId = pkg?.["x-agentic-metro-enterprise"]?.["node-id"] ?? null;
      const packageId = localPackageId(pkg?.name);
      if (advertisedNodeId || packageId) {
        const scope = meshScope(containingRoot(cursor, roots), cursor);
        const owner = {
          root: cursor,
          nodeId: advertisedNodeId ?? packageId,
          packageName: pkg.name ?? null,
          advertised: advertisedNodeId !== null,
          meshBoundary: scope.boundary,
          meshBoundaries: scope.boundaries
        };
        cache.set(cursor, owner);
        return owner;
      }
    } catch {}
    const parent = dirname(cursor); if (parent === cursor || roots.includes(cursor)) break; cursor = parent;
  }
  return { root: containingRoot(path, roots), nodeId: "unowned", packageName: null, advertised: false, meshBoundary: false, meshBoundaries: [] };
}
export function operationalChecks(root = NODE_ROOT) {
  return OPERATIONAL_PATHS.map((path) => {
    const absolute = join(root, path); const settled = existsSync(absolute);
    return { id: `path:${path}`, settled, evidence: settled ? fileDigest(absolute) : "absent", explanation: settled ? "required operational carrier is present" : "required operational carrier is absent" };
  });
}
function observe(request) {
  const paths = request.roots.flatMap((root) => filesBelow(root)).filter((path) => !path.includes(`${sep}services${sep}formation-mape-chain${sep}`)); const packages = paths.filter((path) => path.endsWith(`${sep}package.json`));
  const nodes = packages.flatMap((path) => { try {
    const pkg = JSON.parse(readFileSync(path, "utf8")); const metro = pkg?.["x-agentic-metro-enterprise"];
    const root = dirname(path); const packageId = localPackageId(pkg?.name); const hasOffices = existsSync(join(root, "content", "offices"));
    if (!metro?.["node-id"] && !(packageId && hasOffices)) return [];
    const bins = Object.keys(pkg.bin ?? {}); const scope = meshScope(containingRoot(root, request.roots), root);
    return [{
      id: metro?.["node-id"] ?? packageId,
      packageName: pkg.name ?? null,
      root,
      digest: fileDigest(path),
      contracts: filesBelow(join(root, "content", "contracts")).filter((item) => item.endsWith(".json")).length,
      operations: bins,
      advertised: Boolean(metro?.["node-id"]),
      meshBoundary: scope.boundary,
      directlyContractable: bins.includes("solicit-service") && bins.includes("invoke-service"),
      solicitEntrypoint: pkg.bin?.["solicit-service"] ?? null
    }];
  } catch { return []; } });
  const cache = new Map(); const officePaths = paths.filter((path) => path.endsWith(".json") && (path.includes(`${sep}content${sep}offices${sep}`) || path.includes(`${sep}lib${sep}management${sep}offices${sep}`)));
  const offices = officePaths.flatMap((path) => { try {
    const value = JSON.parse(readFileSync(path, "utf8")); const owner = nearestMembrane(path, request.roots, cache);
    return [{
      id: value.id,
      owner: owner.nodeId,
      ownerPackage: owner.packageName,
      ownerAdvertised: owner.advertised,
      ownerMeshBoundary: owner.meshBoundary,
      path,
      digest: fileDigest(path)
    }];
  } catch { return []; } });
  const operational = request.scope === "academy-operability" ? operationalChecks() : [];
  const corpus = { nodes: nodes.map((item) => ({ ...item, root: relative(NODE_ROOT, item.root) })), offices: offices.map((item) => ({ ...item, path: relative(NODE_ROOT, item.path) })), operational };
  return { roots: request.roots, corpusDigest: digest(corpus), nodes: corpus.nodes, offices: corpus.offices, academyOperationalChecks: operational, uncertainty: ["filesystem observation cannot establish off-repository runtime availability", "value capture awaits customer receipts"] };
}
function coveredOfficeIds() {
  const dirs = [join(NODE_ROOT, "content", "curricula"), join(NODE_ROOT, "content", "formation-offers")];
  return [...new Set(dirs.flatMap((dir) => filesBelow(dir)).filter((path) => path.endsWith(".json")).flatMap((path) => { try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    return [value.office, value.targetOffice?.id, value.primaryProduct === "OfficeFormationBundle" ? value.customerOffice : null, value.id].filter(Boolean);
  } catch { return []; } }))];
}
async function a2a(stage, data, at, recordTasks = true) {
  const member = MEMBERS[stage]; const message = { messageId: contentId({ member: member.id, stage, data }), role: "ROLE_USER", parts: [{ data: { type: "FormationMapeStageRequest", stage, ...data }, mediaType: "application/json" }] };
  const request = { jsonrpc: "2.0", id: contentId(message), method: "SendMessage", params: { message } };
  const runner = fileURLToPath(import.meta.resolve(member.package));
  const { output, status } = runJsonProcess(runner, dirname(runner), ["--operation", "a2a-message", "--now", at], request);
  if (status !== 0 || output.error) throw new Error(`${member.id} refused A2A stage ${stage}`);
  const artifact = output.result?.task?.artifacts?.[0]?.parts?.find((part) => part.mediaType === "application/json")?.data;
  if (!artifact) throw new Error(`${member.id} completed no artifact`);
  if (recordTasks) await append("a2a-task", { request, response: output }, at); return artifact;
}
function marketBoundaryIntervention(intervention, observation) {
  if (intervention.type !== "OfficeFormationDemand") return intervention;
  const office = observation.offices.find((item) => item.id === intervention.office && `urn:ame:${item.owner}` === intervention.target);
  return {
    type: "ReceiverLocalOfficerSupplyNecessityInvitation",
    target: intervention.target,
    office: { id: intervention.office, digest: office?.digest ?? "unresolved" },
    observation: "Academy coverage for this exact office carrier was not observed; this does not establish a vacancy or select a provider",
    proofObligation: "receiver inventories its recognized and induced qualified incumbencies; if the exact office remains uncovered, receiver authors LocalOfficerSupplyNecessity and tenders a provider-neutral OfficerSupplyLot",
    providerPreselected: false,
    customerMutation: false
  };
}
function projectMarketBoundaryOffers(offers, observation) {
  return offers.map((offer) => {
    const intervention = marketBoundaryIntervention(offer.object, observation);
    const object = {
      ...intervention,
      sourcePlan: offer.object.sourcePlan,
      boundaryProjectionOf: offer.id,
      authority: {
        writesCustomer: false,
        authorsReceiverNecessity: false,
        tendersForReceiver: false,
        awardsProvider: false,
        appointsOfficer: false,
        receiverAdmissionRequired: true
      }
    };
    return { "@context": CONTEXT, id: contentId({ actor: offer.actor, target: offer.target, object }), type: "Offer", actor: offer.actor, target: offer.target, object };
  });
}
function deliverInterventions(plan, observation, at) {
  const actor = `urn:ame:${MEMBERS.execute.id}`;
  return plan.evidence.interventions.filter((item) => typeof item.target === "string").map((plannedIntervention) => {
    const intervention = marketBoundaryIntervention(plannedIntervention, observation);
    const nodeId = intervention.target.replace(/^urn:ame:/u, "");
    const node = observation.nodes.find((item) => item.id === nodeId);
    const delivery = { type: "FormationInterventionDeliveryOutcome", id: contentId({ plan: plan.id, intervention, target: intervention.target }), interventionDigest: digest(intervention), target: intervention.target, targetNode: nodeId, sourcePlan: plan.id, performedBy: actor, attemptedAt: at };
    if (!node || !node.directlyContractable || !node.solicitEntrypoint) return { ...delivery, invoked: false, disposition: "not-deliverable-missing-provider-boundary", responseType: null };
    if (node.id === NODE_ID) return { ...delivery, invoked: false, disposition: "not-deliverable-self-recursion-refused", responseType: null };
    const targetRoot = resolve(NODE_ROOT, node.root);
    const runner = resolve(targetRoot, node.solicitEntrypoint);
    const sourceActivity = { "@context": CONTEXT, id: contentId({ actor, target: intervention.target, intervention }), type: "Offer", actor, target: intervention.target, object: { ...intervention, authority: { writesCustomer: false, authorsReceiverNecessity: false, tendersForReceiver: false, awardsProvider: false, appointsOfficer: false, receiverAdmissionRequired: true } } };
    const solicitation = { "@context": CONTEXT, id: contentId({ actor, target: intervention.target, sourceActivity }), type: "Offer", actor, target: intervention.target, object: { type: "ServiceSolicitation", sourceActivity } };
    try {
      const { output, status } = runJsonProcess(runner, targetRoot, ["--operation", "solicit-service", "--now", at], solicitation, 10_000);
      return { ...delivery, invoked: true, solicitation: solicitation.id, transportStatus: status, disposition: ["Offer", "Reject", "Question", "Accept"].includes(output.type) ? "target-responded" : "target-returned-nonstandard-value", responseType: output.type ?? null, responseId: output.id ?? null, responseDigest: digest(output) };
    } catch (error) {
      return { ...delivery, invoked: true, solicitation: solicitation.id, disposition: "target-transport-failed", responseType: null, diagnostic: error.message };
    }
  });
}
export async function runMape(request, sourceActivity, at, options = {}) {
  const observation = observe(request);
  if (options.formationDemand) observation.formationDemand = {
    digest: digest(options.formationDemand),
    office: options.formationDemand.office?.id,
    candidate: options.formationDemand.candidate?.id,
    competencyCount: options.formationDemand.competencies?.length ?? 0
  };
  const requestDigest = digest(request); const loopId = contentId({ sourceActivity, requestDigest, formationDemandDigest: observation.formationDemand?.digest ?? null, corpusDigest: observation.corpusDigest });
  const knowledgeRefs = [sourceActivity, requestDigest, observation.corpusDigest, ...(observation.formationDemand ? [observation.formationDemand.digest] : [])];
  const recordTasks = options.recordTasks !== false;
  const monitor = await a2a("monitor", { loopId, requestDigest, knowledgeRefs, observation }, at, recordTasks);
  const analyze = await a2a("analyze", { loopId, requestDigest, knowledgeRefs, predecessor: monitor, scope: request.scope, coveredOfficeIds: coveredOfficeIds() }, at, recordTasks);
  const plan = await a2a("plan", { loopId, requestDigest, knowledgeRefs, predecessor: analyze }, at, recordTasks);
  const deliveryOutcomes = deliverInterventions(plan, observation, at);
  const execute = await a2a("execute", { loopId, requestDigest, knowledgeRefs, predecessor: plan, deliveryOutcomes }, at, recordTasks);
  const stages = [monitor, analyze, plan, execute];
  const knowledge = await a2a("knowledge", { loopId, requestDigest, knowledgeRefs, stages, corpusDigest: observation.corpusDigest }, at, recordTasks);
  return { type: "EnterpriseFormationMapeResult", scope: request.scope, requestDigest, ...(observation.formationDemand ? { formationDemandDigest: observation.formationDemand.digest } : {}), corpusDigest: observation.corpusDigest, disposition: analyze.evidence.findingCount === 0 ? "settled" : "intervention-delivered", loop: { id: loopId, stages: { monitor, analyze, plan, execute }, knowledge }, interventionOffers: projectMarketBoundaryOffers(execute.evidence.offers, observation), targetDeliveryOutcomes: deliveryOutcomes, coordinationRequired: execute.evidence.coordinationRequired ?? [], boundaryProjection: { internalFormationPlanPreserved: true, receiverMarketAuthorityPreserved: true, providerObservationsCountedAsReceiverDemand: 0 }, customerTerritoryMutation: false };
}
async function invoke(activity, at) {
  const invalid = invocationProblem(activity); if (invalid) return reject(activity, invalid, at);
  const offer = activity.object.offer; const request = offer.object.request;
  if (request.executionMode === "dry-run") return response("Accept", activity, { type: "EnterpriseFormationMapeResult", disposition: "ready", requestDigest: offer.object.requestDigest, dryRun: true, customerTerritoryMutation: false });
  let result; try { result = await runMape(request, offer.object.sourceActivity, at, { formationDemand: offer.object.formationDemand ?? null }); } catch (error) { return reject(activity, "Academy formation chain could not close", at, { diagnostic: error.message }); }
  const record = { id: contentId(result), ...result, completedAt: at }; await append("formation-mape-result", record, at); await witness(activity, "contract.completed", at, { result: record.id, loop: result.loop.id, corpusDigest: result.corpusDigest });
  return response("Accept", activity, { ...record, dryRun: false });
}

export async function run(activity, op = operation(), at = instant()) {
  if (op === "solicit-service") return solicit(activity, at);
  if (["invoke-service", "mape-formation-territory"].includes(op)) return invoke(activity, at);
  return reject(activity, `unknown provider operation ${op}`, at);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const activity = input(); const output = await run(activity); process.stdout.write(`${JSON.stringify(output, null, 2)}\n`); if (output.type === "Reject") process.exitCode = 2; }
  catch (error) { process.stderr.write(`union-officer-academy: ${error.message}\n`); process.exitCode = 1; }
}
