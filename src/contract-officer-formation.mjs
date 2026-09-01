#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { academySemanticRecordStore, queryAcademySemanticContent } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/semantic-records";
import {
  admitRequest,
  appendRecord,
  compileCurriculum,
  compileOfficeFormationBundle,
  digest as academyDigest,
  enrollCandidate,
  establishBaseline,
  openCohort,
  readRecords,
  recordRefusal,
} from "./academy.mjs";
import { contentId, digest } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/a2a";
import { currentFormationLianqun, formationProviders } from "@coesite-operations/rendanheyi-enterprise-services-section/formation-lianqun";
import { walkPosixPathsSync } from "@red-cup-engineering/path-walking-service";

const CONTEXT = "https://www.w3.org/ns/activitystreams";
const ACTOR = "urn:ame:union-officer-academy";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPOSITORY_ROOT = resolve(NODE_ROOT, "../../../../../..");
const RENDANHEYI_ROOT = resolve(NODE_ROOT, "../enterprise-services-section/services/enterprise-systems-services-section/services/rendanheyi-enterprise-services-section");

function arg(flag) { const index = process.argv.indexOf(flag); return index < 0 ? undefined : process.argv[index + 1]; }
function at() { return arg("--now") ?? new Date().toISOString(); }
function input() { return JSON.parse(readFileSync(0, "utf8")); }
function response(type, source, object) {
  return { "@context": CONTEXT, id: contentId({ actor: ACTOR, type, inReplyTo: source?.id ?? null, object }), type, actor: ACTOR, target: source?.actor ?? "urn:actor:unidentified", inReplyTo: source?.id ?? "urn:activity:unidentified", object };
}
function store() {
  return academySemanticRecordStore(NODE_ROOT);
}
async function witness(activity, outcome, instant, details) {
  const body = { source: ACTOR, type: `org.emsenn.union-officer-academy.${outcome}`, subject: activity?.id ?? "urn:activity:unidentified", time: instant, data: { activityDigest: digest(activity ?? null), ...details } };
  const event = { specversion: "1.0", id: contentId(body), ...body, datacontenttype: "application/json" };
  const assertions = [["activity/outcome", outcome], ...Object.entries(details).filter(([, value]) => typeof value === "string")]
    .map(([attribute, value]) => ({ subject: body.subject, predicate: `urn:emsenn:academy:${attribute}`, object: { kind: "literal", value } }));
  await store().record({ category: "union-officer-academy.boundary-event", recordedAt: instant, record: event, assertions });
  return event;
}
function invalid(activity) {
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Accept" || activity.target !== ACTOR) return "officer formation invocation must be an ActivityStreams Accept addressed to the Academy";
  const accepted = activity.object;
  if (accepted?.type !== "ServiceContract") return "accepted contract must be a ServiceContract";
  const offer = accepted.offer;
  if (offer?.type !== "Offer" || offer.actor !== ACTOR || offer.object?.type !== "ExecutableServiceOffer") return "ServiceContract must carry the Academy's officer-formation Offer";
  const demand = offer.object.request;
  if (demand?.type !== "OfficerFormationDemand" || offer.object.requestDigest !== digest(demand)) return "officer formation demand is absent or changed";
  const capability = accepted.capability;
  if (capability?.type !== "Capability" || capability.holder !== ACTOR || capability.invocationTarget !== ACTOR || capability.parentOffer !== offer.id) return "accepted contract lacks the Academy-held invocation capability";
  if (capability.capTP?.target !== ACTOR || capability.capTP.method !== "invoke-officer-formation") return "CapTP attenuation does not name invoke-officer-formation";
  if (!(capability.allowedActions ?? []).includes("invoke-service")) return "capability omits invoke-service";
  if (capability.attenuation?.requestDigest !== offer.object.requestDigest) return "capability is not bound to the exact OfficerFormationDemand";
  return null;
}
async function retain(record) {
  const existing = (await readRecords(NODE_ROOT)).find((item) => item.id === record.id);
  return existing ?? (await appendRecord(NODE_ROOT, record)).record;
}

function rawDigest(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
function json(path) { return JSON.parse(readFileSync(path, "utf8")); }
function filesBelow(path) {
  return walkPosixPathsSync({ root: path, missing: "empty", unreadable: "skip", paths: "absolute", result: "paths" }).files;
}
function sourceOwner(path) {
  if (path.startsWith("services/management-thought/")) return "union-officer-academy";
  if (path.includes("/leader-movement-team/")) return "leader-movement-team";
  if (path.includes("/executive-office/")) return "executive-office";
  if (path.includes("/red-cup-engineering/")) return "red-cup-engineering";
  if (path.startsWith(".agents/")) return "executive-office-projector-provider";
  return "561-group-union";
}
function verifySource(source) {
  const academyRelative = source.path.startsWith("content/") || source.path.startsWith("services/management-thought/");
  const base = academyRelative ? NODE_ROOT : REPOSITORY_ROOT;
  const path = resolve(base, source.path);
  if (!(path === base || path.startsWith(`${base}/`))) throw new Error(`source escapes admitted settlement: ${source.path}`);
  if (!existsSync(path)) throw new Error(`source is absent: ${source.path}`);
  const observed = rawDigest(readFileSync(path));
  if (observed !== (source.sha256 ?? source.digest)) throw new Error(`source drift: ${source.path}`);
  return {
    identity: source.path,
    owner: source.owner ?? sourceOwner(source.path),
    authorityClass: source.authorityClass ?? "current-law",
    digest: observed,
    purpose: source.purpose ?? "exact formation source",
  };
}
function completeDenominator(demand) {
  const offer = json(join(NODE_ROOT, "content/formation-offers/executive-officer-to-the-leader.json"));
  const curriculum = json(join(NODE_ROOT, "content/curricula/executive-officer-to-the-leader.json"));
  const academyLocal = [
    ...filesBelow(join(NODE_ROOT, "content/doctrine")),
    ...filesBelow(join(NODE_ROOT, "content/curricula")),
    ...filesBelow(join(NODE_ROOT, "content/formation-offers")),
    ...filesBelow(join(NODE_ROOT, "content/assessment-case-banks")),
    ...filesBelow(join(NODE_ROOT, "content/independence")),
    ...filesBelow(join(NODE_ROOT, "services/management-thought/huidu-guanli/content/glossary/terms")),
  ].filter((path) => path.endsWith(".json") || path.endsWith(".md")).map((path) => ({
    path: path.slice(NODE_ROOT.length + 1),
    digest: rawDigest(readFileSync(path)),
    owner: "union-officer-academy",
    purpose: "Academy formation law or owned Management Thought doctrine",
    authorityClass: "current-law",
  }));
  const rendanheyiSystem = filesBelow(join(RENDANHEYI_ROOT, "content/glossary/terms"))
    .filter((path) => path.endsWith(".md"))
    .map((path) => ({
      path: relative(REPOSITORY_ROOT, path),
      digest: rawDigest(readFileSync(path)),
      owner: "rendanheyi-enterprise-services-section",
      purpose: "Rendanheyi enterprise-system doctrine",
      authorityClass: "current-law",
    }));
  const admittedResearchPaths = [
    "lib/emsenn/services/561-group/services/science-services-section/content/text/documents/articles/notes/2026/07/11/2026-07-11-research-on-mape-k.md",
    "lib/emsenn/services/561-group/services/public-services-section/services/personal-services-section/emsenn-services-section/content/text/documents/articles/notes/2026/07/01/2026-07-01-research-on-agent-run-as-charge.md",
    "lib/emsenn/services/561-group/services/public-services-section/services/personal-services-section/emsenn-services-section/content/text/documents/articles/notes/2026/07/05/2026-07-05-research-on-charge-settled-development-a-verification-paradigm-for-agentic-programming.md",
    "lib/emsenn/services/561-group/services/science-services-section/services/social-science-services-section/services/sociology-science-services-section/services/cybernetic-postliberalism-services-section/content/text/documents/articles/notes/2026/07/09/2026-07-09-explanation-as-affective-governance.md",
    "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/semiotic-computer-system-services-section/content/text/documents/articles/notes/2026/07/09/2026-07-09-readiness-study.md",
    "lib/emsenn/services/561-group/services/public-services-section/services/personal-services-section/emsenn-services-section/content/text/documents/articles/notes/2026/07/13/2026-07-13-research-on-orientation-maps.md",
  ].map((path) => ({ path, digest: rawDigest(readFileSync(join(REPOSITORY_ROOT, path))), owner: path.includes("lenticule-science") ? "lenticule-science" : "board-of-directors-research", purpose: "admitted formation and MAPE-K research", authorityClass: "admitted-research" }));
  const sources = [
    ...rendanheyiSystem,
    ...(demand.sourceEvidence ?? []),
    ...offer.sourceDenominator,
    ...curriculum.sourceDoctrine.map((item) => ({ ...item, purpose: "curriculum Management Thought doctrine", authorityClass: "current-law" })),
    ...academyLocal,
    ...admittedResearchPaths,
  ].map(verifySource);
  const byIdentity = new Map();
  for (const source of sources) {
    const prior = byIdentity.get(source.identity);
    if (prior && prior.digest !== source.digest) throw new Error(`denominator contradicts itself: ${source.identity}`);
    byIdentity.set(source.identity, prior ?? source);
  }
  return { curriculum, offer, materials: [...byIdentity.values()].sort((a, b) => a.identity.localeCompare(b.identity)) };
}
async function admittedValueAgreement(demand) {
  const agreement = demand.valueAgreement;
  const warrants = await queryAcademySemanticContent("union-officer-academy.formation-warrant", { root: NODE_ROOT });
  return agreement?.type === "IncubationCapitalContribution"
    && agreement.acceptedByCustomer === demand.customer
    && /^sha256:[a-f0-9]{64}$/u.test(agreement.receipt ?? "")
    && agreement.authority === "leader-directs-full-union-officer-academy"
    && warrants.some((warrant) => warrant.id === agreement.authority);
}
async function openFormation(demand, instant) {
  await store().record({
    category: "union-officer-academy.officer-formation-demand",
    recordedAt: instant,
    record: { receivedAt: instant, demand },
  });
  const { curriculum: program, materials } = completeDenominator(demand);
  const priorRecords = await readRecords(NODE_ROOT);
  const priorQualification = priorRecords.filter((record) => record.type === "Qualification" && record.candidate.id === demand.candidate.id)
    .sort((left, right) => Date.parse(left.issuedAt) - Date.parse(right.issuedAt) || left.id.localeCompare(right.id)).at(-1);
  const priorBaseline = priorRecords.find((record) => record.type === "FormationBaseline" && record.id === priorQualification?.baseline);
  const priorBundle = priorRecords.find((record) => record.type === "OfficeFormationBundle" && record.enrollment === priorQualification?.enrollment && record.baseline === priorQualification?.baseline);
  const priorCohort = priorRecords.find((record) => record.type === "Cohort" && record.id === priorBundle?.cohort);
  const agreement = currentFormationLianqun(NODE_ROOT);
  const providers = formationProviders(agreement);
  const expectedCompetencies = program.competencies.map((item) => item.id);
  if (academyDigest([...demand.competencies].sort()) !== academyDigest([...expectedCompetencies].sort())) throw new Error("formation demand does not carry the exact EO curriculum competency denominator");
  const request = await retain(admitRequest({
    customer: demand.customer,
    receivedAt: instant,
    office: demand.office,
    candidatePolicy: demand.candidatePolicy,
    trainingGrant: demand.trainingGrant,
    competencies: demand.competencies,
    assessmentLaw: { ...demand.assessmentLaw, requiredCases: program.assessment.requiredCases },
    price: demand.valueAgreement,
  }));
  const stages = program.formationStages.map((item) => item.stage);
  const curriculum = await retain(compileCurriculum({
    request: request.id,
    compiledAt: instant,
    stages,
    competencyMap: Object.fromEntries(stages.map((stage) => [stage, stage === "independent-demonstration" ? demand.competencies : [demand.competencies[stages.indexOf(stage) % demand.competencies.length]]])),
    doctrineSources: materials.map((item) => ({ identity: item.identity, digest: item.digest, owner: item.owner, authorityClass: item.authorityClass, admissionTerms: ["formation use for this exact cohort", "preserve source ownership and digest"] })),
    omissions: [],
    parents: priorBaseline ? [priorBaseline.curriculum] : [],
  }));
  const baseline = await retain(establishBaseline({ request: request.id, curriculum: curriculum.id, establishedAt: instant, predecessors: priorBaseline ? [priorBaseline.id] : [] }, await readRecords(NODE_ROOT)));
  const projectorPath = "lib/emsenn/services/561-group/services/operations-services-section/services/agent-services-section/lib/professional-repertoire/skills/installing-claude-as-an-agent/scripts/install-claude-as-an-agent.js";
  const projectorDigest = rawDigest(readFileSync(join(REPOSITORY_ROOT, projectorPath)));
  const cohort = await retain(openCohort({
    baseline: baseline.id,
    openedAt: instant,
    admissionEpoch: `eo-${baseline.id.slice(-16)}-${agreement.id.slice(-12)}`,
    exerciseRegimeDigest: academyDigest({ requiredCases: program.assessment.requiredCases, stages: program.formationStages, lianqunAgreement: agreement.id, providerConfigurations: agreement.providerConfigurations }),
    providers,
    projectors: [{ id: "executive-office#installing-codex-as-an-agent", digest: projectorDigest, contract: "customer-executes-projector" }],
    parents: priorCohort ? [priorCohort.id] : [],
    ...(priorCohort ? { bridgeFrom: priorCohort.id } : {}),
  }, await readRecords(NODE_ROOT)));
  const enrollment = await retain(enrollCandidate({ cohort: cohort.id, admittedAt: instant, candidate: demand.candidate }, await readRecords(NODE_ROOT)));
  const bundle = await retain(compileOfficeFormationBundle({
    enrollment: enrollment.id,
    compiledAt: instant,
    dispositionDigest: academyDigest(json(join(REPOSITORY_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/characters/codex-interactive-session.json"))),
    personaDigest: academyDigest({ office: demand.office.id, customer: demand.customer, scene: "Academy formation and held-out Union MAPE-K" }),
    materials,
    omissions: [],
    carriers: [
      { kind: "doctrine-suit", provider: "context-compilation-xiaowei", digest: academyDigest(materials) },
      { kind: "orientation", provider: "context-compilation-xiaowei", digest: academyDigest({ stages: program.formationStages, modules: program.modules }) },
      { kind: "skill-pack", provider: "leader-movement-team", digest: academyDigest(demand.office.skills) },
      { kind: "character-surface", provider: "leader-movement-team", digest: demand.candidate.layerBindings.character },
      { kind: "context-capsule", provider: "leader-movement-team", digest: demand.candidate.layerBindings.formationContext },
    ],
    exercisePackDigest: academyDigest({ requiredCases: program.assessment.requiredCases, stages: program.formationStages }),
    engagementRoles: [
      { role: "formation-practitioner", provider: "situated-practice-xiaowei", accountableFor: "training sequence and correction" },
      { role: "current-practitioner-lecturer", provider: "leader-movement-team#executive-officer-to-the-leader", accountableFor: "current office practice" },
      { role: "developmental-mentor", provider: "leader-movement-team", accountableFor: "customer-local practicum" },
      { role: "simulation-provider", provider: "independent-examination-xiaowei", accountableFor: "sealed assessment cases" },
      { role: "projector-provider", provider: "executive-office", accountableFor: "customer-executed Codex projection" },
    ],
    projectionPlan: { provider: "executive-office", projector: projectorPath, projectorDigest, customerExecutes: true },
  }, await readRecords(NODE_ROOT)));
  return { request, curriculum, baseline, cohort, enrollment, bundle, valueAgreement: demand.valueAgreement };
}

export async function invokeOfficerFormation(activity, instant = at()) {
  const problem = invalid(activity);
  if (problem) { await witness(activity, "formation.rejected", instant, { reason: problem }); return response("Reject", activity, { type: "Refusal", reason: problem }); }
  const offer = activity.object.offer; const demand = offer.object.request;
  if (!(await admittedValueAgreement(demand))) {
    const refusal = await retain(recordRefusal({ refusedAt: instant, code: "E_PRICE_UNSETTLED", reason: "officer formation requires a customer-accepted price or internal value agreement and a verifiable receipt before a cohort is opened" }));
    await witness(activity, "formation.refused", instant, { refusal: refusal.id, formationDemandDigest: offer.object.requestDigest });
    return response("Reject", activity, { ...refusal, formationDemandDigest: offer.object.requestDigest, customerTerritoryMutation: false });
  }
  try {
    const formation = await openFormation(demand, instant);
    await witness(activity, "formation.opened", instant, { formationDemandDigest: offer.object.requestDigest, request: formation.request.id, cohort: formation.cohort.id, enrollment: formation.enrollment.id, bundle: formation.bundle.id });
    return response("Accept", activity, {
      type: "OfficerFormationEngagement",
      status: "opened-awaiting-witnessed-performance",
      formationDemandDigest: offer.object.requestDigest,
      lineage: Object.fromEntries(["request", "curriculum", "baseline", "cohort", "enrollment", "bundle"].map((name) => [name, formation[name].id])),
      bundle: formation.bundle,
      valueAgreement: formation.valueAgreement,
      customerTerritoryMutation: false,
      authorityGranted: false,
    });
  } catch (error) {
    const refusal = await retain(recordRefusal({ refusedAt: instant, code: "E_BASELINE_UNRESOLVED", reason: error instanceof Error ? error.message : String(error) }));
    await witness(activity, "formation.refused", instant, { refusal: refusal.id, formationDemandDigest: offer.object.requestDigest });
    return response("Reject", activity, { ...refusal, formationDemandDigest: offer.object.requestDigest, customerTerritoryMutation: false });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const result = await invokeOfficerFormation(input()); process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); if (result.type === "Reject") process.exitCode = 2; }
  catch (error) { process.stderr.write(`invoke-officer-formation: ${error.message}\n`); process.exitCode = 1; }
}
