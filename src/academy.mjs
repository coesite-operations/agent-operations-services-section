import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { queryAcademySemanticContent, recordAcademySemanticContent } from "@union-officer-academy/formation-lianqun-member-runtime-service/semantic-records";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

export const ACADEMY = "union-officer-academy";
export const ACADEMY_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const ACADEMY_RECORD_CATEGORY = "union-officer-academy.formation-record";
export const ACADEMY_ACTOR = `urn:ame:${ACADEMY}`;
const DEFAULT_ACADEMY_NETWORK = "eip155:31337";

// Tonight's storage law is disk-backed and credential-free (no R2 keys, no
// live witness-journal RDF network agent beyond a local test double, no live EVM/anvil):
// custody and category lookup come from an Academy-local filesystem
// transport (formation member semantic-records), and the settlement/actor identity
// that WRITES are recorded under is read from the same disk artifact
// client.mjs itself once resolved on-chain (content/evm/accounts/<network>.json),
// not from a live chain call. This is the account binding's own prior,
// deliberately superseded disk shape; reading it back is a filesystem read,
// never a network or credentialed act.
export function diskSettlementAccount(network = process.env.ACADEMY_NETWORK ?? DEFAULT_ACADEMY_NETWORK) {
  const accountPath = process.env.ACADEMY_EVM_ACCOUNT_PATH ?? join(ACADEMY_ROOT, "content", "evm", "accounts", `${network.replace(":", "-")}.json`);
  const account = JSON.parse(readFileSync(accountPath, "utf8"));
  if (account.enterprise?.urn !== ACADEMY_ACTOR) throw new Error(`${accountPath}: Academy EVM account declaration does not name ${ACADEMY_ACTOR}`);
  if (typeof account.account?.caip10 !== "string" || account.account.caip10.length === 0) throw new Error(`${accountPath}: Academy EVM account declaration lacks a CAIP-10 account`);
  return { settlement: account.account.caip10, actor: account.enterprise.urn };
}
export const RECORD_DIRECTORIES = Object.freeze({
  FormationRequest: "formation-requests",
  CurriculumRevision: "curriculum-revisions",
  FormationBaseline: "formation-baselines",
  Cohort: "cohorts",
  OfficeFormationBundle: "office-formation-bundles",
  AssessmentChallengeCommitment: "assessment-challenge-commitments",
  AssessmentChallengeReveal: "assessment-challenge-reveals",
  Enrollment: "enrollments",
  TrainingEvent: "training-events",
  Assessment: "assessments",
  Qualification: "qualifications",
  FormationRefusal: "formation-refusals",
  FormationRecordCorrection: "formation-record-corrections",
  RequalificationGap: "requalification-gaps",
  FormationEpochGap: "formation-epoch-gaps",
  DoctrineAdmission: "doctrine-admissions",
  QualificationStatusEvent: "qualification-status-events",
  SuccessionExercise: "succession-exercises"
});

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const ID = /^urn:sha256:[a-f0-9]{64}$/u;
const CANDIDATE_KINDS = new Set(["person", "character", "model-artifact", "runtime-session", "agent-relation"]);
const STAGES = new Set(["orientation", "simulation", "shadow-work", "supervised-practice", "independent-demonstration", "reflection", "teaching-back"]);
const FORMATION_COMPONENTS = new Set(["officeDigest", "doctrineDenominatorDigest", "curriculumDigest", "exerciseRegimeDigest", "assessmentLawDigest", "providers", "projectors"]);
const REFUSALS = new Set(["E_REQUEST_BOUNDARY", "E_BASELINE_UNRESOLVED", "E_CANDIDATE_IDENTITY", "E_TRAINING_GRANT", "E_PROTECTED_CONTEXT", "E_ASSESSOR_NOT_INDEPENDENT", "E_COMPETENCY_GAP", "E_WITNESS_MISSING", "E_PRICE_UNSETTLED", "E_AUTHORITY_REQUESTED"]);

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digest(value) {
  const bytes = typeof value === "string" ? value : canonical(value);
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function contentId(body) {
  return identifyJsonSemanticContent({ objectKind: "union-officer-academy.formation-record", value: body, witnessRoot: EMPTY_WITNESS_ROOT }).token;
}

export function withIdentity(body) {
  assert(body && typeof body === "object" && !Array.isArray(body), "record body must be an object");
  assert(body.id === undefined, "record body already carries an id");
  return { id: contentId(body), ...body };
}

function nonempty(value, owner) {
  assert(typeof value === "string" && value.length > 0, `${owner}: required non-empty string`);
}

function list(value, owner, minimum = 0) {
  assert(Array.isArray(value) && value.length >= minimum, `${owner}: required array of at least ${minimum}`);
}

function unique(value, owner) {
  list(value, owner);
  assert(new Set(value.map(canonical)).size === value.length, `${owner}: duplicates are not allowed`);
}

function sha(value, owner) {
  assert(DIGEST.test(value ?? ""), `${owner}: required sha256 digest`);
}

function urn(value, owner) {
  assert(ID.test(value ?? ""), `${owner}: required content identity`);
}

function time(value, owner) {
  nonempty(value, owner);
  assert(!Number.isNaN(Date.parse(value)), `${owner}: invalid date-time`);
}

function sameSet(left, right) {
  return canonical([...left].sort()) === canonical([...right].sort());
}

function validateOffice(office, owner) {
  assert(office && typeof office === "object", `${owner}: office snapshot missing`);
  nonempty(office.id, `${owner}.id`);
  sha(office.digest, `${owner}.digest`);
  sha(office.deonticProfileDigest, `${owner}.deonticProfileDigest`);
  unique(office.duties, `${owner}.duties`);
  assert(office.duties.length > 0, `${owner}.duties: empty`);
  for (const duty of office.duties) {
    nonempty(duty.id, `${owner}.duty.id`);
    sha(duty.digest, `${owner}.duty.digest`);
    nonempty(duty.authority, `${owner}.duty.authority`);
    nonempty(duty.claim, `${owner}.duty.claim`);
    nonempty(duty.work, `${owner}.duty.work`);
    sha(duty.workDigest, `${owner}.duty.workDigest`);
  }
  unique(office.skills, `${owner}.skills`);
  assert(office.skills.length > 0, `${owner}.skills: empty`);
  for (const skill of office.skills) {
    nonempty(skill.id, `${owner}.skill.id`);
    sha(skill.specDigest, `${owner}.skill.specDigest`);
    sha(skill.bodyDigest, `${owner}.skill.bodyDigest`);
    assert(["process", "derivation", "procedure", "inquiry"].includes(skill.closureKind), `${owner}.skill.closureKind: invalid`);
    unique(skill.requiresCapabilities, `${owner}.skill.requiresCapabilities`);
  }
  nonempty(office.jurisdiction, `${owner}.jurisdiction`);
  sha(office.protectedContextDigest, `${owner}.protectedContextDigest`);
  sha(office.appointmentLawDigest, `${owner}.appointmentLawDigest`);
  assert(office.succession && typeof office.succession === "object", `${owner}.succession: missing`);
  unique(office.succession.predecessors, `${owner}.succession.predecessors`);
  unique(office.succession.successors, `${owner}.succession.successors`);
}

export function validateRecord(record) {
  assert(record && typeof record === "object" && !Array.isArray(record), "record must be an object");
  assert(RECORD_DIRECTORIES[record.type], `${record.type ?? "untyped"}: unsupported Academy record type`);
  urn(record.id, `${record.type}.id`);
  const { id, ...body } = record;
  assert(id === contentId(body), `${record.type} ${id}: content identity mismatch`);

  switch (record.type) {
    case "FormationRequest":
      nonempty(record.customer, "FormationRequest.customer");
      time(record.receivedAt, "FormationRequest.receivedAt");
      validateOffice(record.office, "FormationRequest.office");
      assert(record.candidatePolicy && Array.isArray(record.candidatePolicy.kinds), "FormationRequest.candidatePolicy missing");
      unique(record.candidatePolicy.kinds, "FormationRequest.candidatePolicy.kinds");
      assert(record.candidatePolicy.kinds.length > 0 && record.candidatePolicy.kinds.every((kind) => CANDIDATE_KINDS.has(kind)), "FormationRequest: invalid candidate kind");
      assert(record.candidatePolicy.identityInheritance === false, "FormationRequest: candidate identity inheritance must be false");
      assert(record.trainingGrant?.customerMutation === false, "FormationRequest: customer mutation must be withheld");
      unique(record.trainingGrant?.operations, "FormationRequest.trainingGrant.operations");
      assert(record.trainingGrant.operations.length > 0, "FormationRequest: empty training grant");
      unique(record.trainingGrant.egress, "FormationRequest.trainingGrant.egress");
      unique(record.competencies, "FormationRequest.competencies");
      assert(record.competencies.length > 0, "FormationRequest: competencies missing");
      assert(record.assessmentLaw?.independentExaminer === true, "FormationRequest: independent examination is required");
      unique(record.assessmentLaw.requiredWitnessKinds, "FormationRequest.assessmentLaw.requiredWitnessKinds");
      assert(record.assessmentLaw.requiredWitnessKinds.length > 0, "FormationRequest: witness law missing");
      unique(record.assessmentLaw.requiredCases ?? [], "FormationRequest.assessmentLaw.requiredCases");
      break;
    case "CurriculumRevision":
      urn(record.request, "CurriculumRevision.request");
      time(record.compiledAt, "CurriculumRevision.compiledAt");
      list(record.stages, "CurriculumRevision.stages", 1);
      assert(record.stages.every((stage) => STAGES.has(stage)), "CurriculumRevision: invalid formation stage");
      assert(record.competencyMap && typeof record.competencyMap === "object" && Object.keys(record.competencyMap).length > 0, "CurriculumRevision: competency map missing");
      for (const [stage, competencies] of Object.entries(record.competencyMap)) {
        assert(STAGES.has(stage), `CurriculumRevision: unknown mapped stage ${stage}`);
        unique(competencies, `CurriculumRevision.competencyMap.${stage}`);
        assert(competencies.length > 0, `CurriculumRevision.competencyMap.${stage}: empty`);
      }
      list(record.doctrineSources, "CurriculumRevision.doctrineSources", 1);
      for (const source of record.doctrineSources) {
        nonempty(source.identity, "CurriculumRevision.doctrineSource.identity");
        sha(source.digest, "CurriculumRevision.doctrineSource.digest");
        nonempty(source.owner, "CurriculumRevision.doctrineSource.owner");
        assert(["current-law", "current-practice", "admitted-research", "legacy-prior-art", "customer-overlay"].includes(source.authorityClass), "CurriculumRevision.doctrineSource: authority class missing or invalid");
        unique(source.admissionTerms, "CurriculumRevision.doctrineSource.admissionTerms");
        assert(source.admissionTerms.length > 0, "CurriculumRevision.doctrineSource: admission terms missing");
      }
      list(record.omissions, "CurriculumRevision.omissions");
      unique(record.parents, "CurriculumRevision.parents");
      record.parents.forEach((item) => urn(item, "CurriculumRevision.parent"));
      if (record.customerOverlayDigest) sha(record.customerOverlayDigest, "CurriculumRevision.customerOverlayDigest");
      break;
    case "FormationBaseline":
      urn(record.request, "FormationBaseline.request");
      urn(record.curriculum, "FormationBaseline.curriculum");
      time(record.establishedAt, "FormationBaseline.establishedAt");
      validateOffice(record.office, "FormationBaseline.office");
      unique(record.competencies, "FormationBaseline.competencies");
      assert(record.competencies.length > 0, "FormationBaseline: competencies missing");
      sha(record.assessmentLawDigest, "FormationBaseline.assessmentLawDigest");
      unique(record.predecessors, "FormationBaseline.predecessors");
      record.predecessors.forEach((item) => urn(item, "FormationBaseline.predecessor"));
      break;
    case "Cohort":
      urn(record.baseline, "Cohort.baseline");
      time(record.openedAt, "Cohort.openedAt");
      nonempty(record.admissionEpoch, "Cohort.admissionEpoch");
      assert(record.progression === "asynchronous", "Cohort: progression must be asynchronous");
      assert(record.formationConfiguration && typeof record.formationConfiguration === "object", "Cohort: formation configuration missing");
      for (const field of ["officeDigest", "doctrineDenominatorDigest", "curriculumDigest", "exerciseRegimeDigest", "assessmentLawDigest"]) sha(record.formationConfiguration[field], `Cohort.formationConfiguration.${field}`);
      unique(record.formationConfiguration.providers, "Cohort.formationConfiguration.providers");
      for (const provider of record.formationConfiguration.providers) {
        nonempty(provider.id, "Cohort.formationConfiguration.provider.id");
        nonempty(provider.role, "Cohort.formationConfiguration.provider.role");
        sha(provider.digest, "Cohort.formationConfiguration.provider.digest");
        nonempty(provider.contract, "Cohort.formationConfiguration.provider.contract");
      }
      unique(record.formationConfiguration.projectors, "Cohort.formationConfiguration.projectors");
      for (const projector of record.formationConfiguration.projectors) {
        nonempty(projector.id, "Cohort.formationConfiguration.projector.id");
        sha(projector.digest, "Cohort.formationConfiguration.projector.digest");
        nonempty(projector.contract, "Cohort.formationConfiguration.projector.contract");
      }
      sha(record.formationConfigurationDigest, "Cohort.formationConfigurationDigest");
      assert(record.formationConfigurationDigest === digest(record.formationConfiguration), "Cohort: formation configuration digest mismatch");
      unique(record.parents, "Cohort.parents");
      record.parents.forEach((item) => urn(item, "Cohort.parent"));
      if (record.bridgeFrom) urn(record.bridgeFrom, "Cohort.bridgeFrom");
      break;
    case "OfficeFormationBundle":
      urn(record.enrollment, "OfficeFormationBundle.enrollment");
      urn(record.cohort, "OfficeFormationBundle.cohort");
      urn(record.baseline, "OfficeFormationBundle.baseline");
      time(record.compiledAt, "OfficeFormationBundle.compiledAt");
      sha(record.formationConfigurationDigest, "OfficeFormationBundle.formationConfigurationDigest");
      nonempty(record.candidate?.id, "OfficeFormationBundle.candidate.id");
      assert(CANDIDATE_KINDS.has(record.candidate?.kind), "OfficeFormationBundle: invalid candidate kind");
      sha(record.candidate.identityDigest, "OfficeFormationBundle.candidate.identityDigest");
      // Bundles emitted before candidate-assembly law was rectified remain
      // immutable historical evidence. verifyRecords requires a typed
      // correction before such a bundle can coexist with a green register.
      if (record.candidateAssembly === undefined) break;
      assert(record.candidateAssembly && typeof record.candidateAssembly === "object", "OfficeFormationBundle.candidateAssembly: missing");
      assert(record.candidateAssembly.appointmentLayer === "character-only", "OfficeFormationBundle.candidateAssembly: only the character layer may be appointed");
      assert(record.candidateAssembly.layerBindings && typeof record.candidateAssembly.layerBindings === "object", "OfficeFormationBundle.candidateAssembly.layerBindings: missing");
      for (const [layer, value] of Object.entries(record.candidateAssembly.layerBindings)) sha(value, `OfficeFormationBundle.candidateAssembly.layerBindings.${layer}`);
      sha(record.candidateAssembly.assemblyDigest, "OfficeFormationBundle.candidateAssembly.assemblyDigest");
      assert(record.candidateAssembly.assemblyDigest === digest({ candidate: record.candidate, layerBindings: record.candidateAssembly.layerBindings, model: record.candidateAssembly.model ?? null, provider: record.candidateAssembly.provider ?? null, harnessDigest: record.candidateAssembly.harnessDigest ?? null }), "OfficeFormationBundle.candidateAssembly: digest mismatch");
      if (record.candidateAssembly.harnessDigest) sha(record.candidateAssembly.harnessDigest, "OfficeFormationBundle.candidateAssembly.harnessDigest");
      sha(record.office?.digest, "OfficeFormationBundle.office.digest");
      nonempty(record.office?.id, "OfficeFormationBundle.office.id");
      sha(record.characterFormation?.characterDigest, "OfficeFormationBundle.characterFormation.characterDigest");
      sha(record.characterFormation?.dispositionDigest, "OfficeFormationBundle.characterFormation.dispositionDigest");
      sha(record.characterFormation?.personaDigest, "OfficeFormationBundle.characterFormation.personaDigest");
      unique(record.skillPack, "OfficeFormationBundle.skillPack");
      assert(record.skillPack.length > 0, "OfficeFormationBundle: skill pack missing");
      for (const skill of record.skillPack) {
        nonempty(skill.id, "OfficeFormationBundle.skill.id");
        sha(skill.specDigest, "OfficeFormationBundle.skill.specDigest");
        sha(skill.bodyDigest, "OfficeFormationBundle.skill.bodyDigest");
      }
      list(record.contextPlan?.materials, "OfficeFormationBundle.contextPlan.materials", 1);
      for (const material of record.contextPlan.materials) {
        nonempty(material.identity, "OfficeFormationBundle.material.identity");
        nonempty(material.owner, "OfficeFormationBundle.material.owner");
        nonempty(material.purpose, "OfficeFormationBundle.material.purpose");
        assert(["current-law", "current-practice", "admitted-research", "legacy-prior-art", "customer-overlay"].includes(material.authorityClass), "OfficeFormationBundle.material: authority class invalid");
        sha(material.digest, "OfficeFormationBundle.material.digest");
      }
      list(record.contextPlan.omissions, "OfficeFormationBundle.contextPlan.omissions");
      for (const omission of record.contextPlan.omissions) {
        nonempty(omission.identity, "OfficeFormationBundle.omission.identity");
        nonempty(omission.reason, "OfficeFormationBundle.omission.reason");
      }
      assert(record.contextPlan.denominatorCount === record.contextPlan.materials.length + record.contextPlan.omissions.length, "OfficeFormationBundle: doctrine denominator count mismatch");
      const expectedCompleteness = record.contextPlan.omissions.length === 0 ? "complete" : "bounded-with-gaps";
      assert(record.contextPlan.completeness === expectedCompleteness, "OfficeFormationBundle: completeness contradicts omissions");
      list(record.contextPlan.carriers, "OfficeFormationBundle.contextPlan.carriers", 1);
      for (const carrier of record.contextPlan.carriers) {
        assert(["doctrine-suit", "query-suit", "context-capsule", "orientation", "gap-bundle", "skill-pack", "character-surface"].includes(carrier.kind), "OfficeFormationBundle.carrier: unsupported carrier");
        nonempty(carrier.provider, "OfficeFormationBundle.carrier.provider");
        sha(carrier.digest, "OfficeFormationBundle.carrier.digest");
      }
      sha(record.exercisePackDigest, "OfficeFormationBundle.exercisePackDigest");
      sha(record.assessmentSpecDigest, "OfficeFormationBundle.assessmentSpecDigest");
      unique(record.engagementRoles, "OfficeFormationBundle.engagementRoles");
      for (const role of record.engagementRoles) {
        assert(["formation-practitioner", "current-practitioner-lecturer", "developmental-mentor", "simulation-provider", "research-provider", "projector-provider"].includes(role.role), "OfficeFormationBundle.engagementRole: unsupported role");
        nonempty(role.provider, "OfficeFormationBundle.engagementRole.provider");
        nonempty(role.accountableFor, "OfficeFormationBundle.engagementRole.accountableFor");
      }
      nonempty(record.projectionPlan?.provider, "OfficeFormationBundle.projectionPlan.provider");
      nonempty(record.projectionPlan?.projector, "OfficeFormationBundle.projectionPlan.projector");
      sha(record.projectionPlan?.projectorDigest, "OfficeFormationBundle.projectionPlan.projectorDigest");
      assert(record.projectionPlan.customerExecutes === true, "OfficeFormationBundle: customer must execute projection");
      assert(record.authority?.conveysIncumbency === false && record.authority?.grantsCapabilities === false && record.authority?.writesCustomer === false, "OfficeFormationBundle: authority boundary violated");
      assert(canonical(record.learningLoop) === canonical(["observe", "plan", "evaluate", "reflect", "procedural-memory", "skill-retrieval", "hook-feedback"]), "OfficeFormationBundle: learning loop drifted from admitted current practice");
      break;
    case "FormationRecordCorrection":
      urn(record.target, "FormationRecordCorrection.target");
      urn(record.replacement, "FormationRecordCorrection.replacement");
      time(record.recordedAt, "FormationRecordCorrection.recordedAt");
      nonempty(record.recordedBy, "FormationRecordCorrection.recordedBy");
      nonempty(record.reason, "FormationRecordCorrection.reason");
      assert(record.invalidatesPriorForUse === true, "FormationRecordCorrection: prior use must be invalidated");
      break;
    case "AssessmentChallengeCommitment":
      urn(record.enrollment, "AssessmentChallengeCommitment.enrollment");
      urn(record.bundle, "AssessmentChallengeCommitment.bundle");
      time(record.committedAt, "AssessmentChallengeCommitment.committedAt");
      nonempty(record.committedBy, "AssessmentChallengeCommitment.committedBy");
      sha(record.caseBankDigest, "AssessmentChallengeCommitment.caseBankDigest");
      sha(record.selectionCommitment, "AssessmentChallengeCommitment.selectionCommitment");
      assert(record.concealed === true, "AssessmentChallengeCommitment: selection must be concealed");
      break;
    case "AssessmentChallengeReveal":
      urn(record.commitment, "AssessmentChallengeReveal.commitment");
      time(record.revealedAt, "AssessmentChallengeReveal.revealedAt");
      unique(record.cases, "AssessmentChallengeReveal.cases");
      assert(record.cases.length > 0, "AssessmentChallengeReveal: cases missing");
      nonempty(record.nonce, "AssessmentChallengeReveal.nonce");
      sha(record.candidateArtifactDigest, "AssessmentChallengeReveal.candidateArtifactDigest");
      break;
    case "Enrollment":
      urn(record.cohort, "Enrollment.cohort");
      urn(record.baseline, "Enrollment.baseline");
      time(record.admittedAt, "Enrollment.admittedAt");
      nonempty(record.candidate?.id, "Enrollment.candidate.id");
      assert(CANDIDATE_KINDS.has(record.candidate?.kind), "Enrollment: invalid candidate kind");
      sha(record.candidate.identityDigest, "Enrollment.candidate.identityDigest");
      assert(record.candidate.appointmentLayer === "character-only", "Enrollment: only the character layer may be appointed");
      assert(record.candidate.layerBindings && typeof record.candidate.layerBindings === "object" && Object.keys(record.candidate.layerBindings).length > 0, "Enrollment: candidate layer bindings missing");
      for (const [layer, value] of Object.entries(record.candidate.layerBindings)) sha(value, `Enrollment.candidate.layerBindings.${layer}`);
      if (record.candidate.kind === "character") {
        assert(["person", "session"].includes(record.candidate.characterKind), "Enrollment: character kind must preserve person/session distinction");
        sha(record.candidate.layerBindings.character, "Enrollment.candidate.layerBindings.character");
      }
      if (["model-artifact", "runtime-session", "agent-relation"].includes(record.candidate.kind)) {
        nonempty(record.candidate.model, "Enrollment.candidate.model");
        nonempty(record.candidate.provider, "Enrollment.candidate.provider");
        sha(record.candidate.harnessDigest, "Enrollment.candidate.harnessDigest");
      }
      break;
    case "TrainingEvent":
      urn(record.enrollment, "TrainingEvent.enrollment");
      urn(record.baseline, "TrainingEvent.baseline");
      time(record.occurredAt, "TrainingEvent.occurredAt");
      assert(STAGES.has(record.stage), "TrainingEvent: invalid formation stage");
      nonempty(record.instructor, "TrainingEvent.instructor");
      urn(record.bundle, "TrainingEvent.bundle");
      sha(record.candidateAssemblyDigest, "TrainingEvent.candidateAssemblyDigest");
      assert(record.producerIdentity && typeof record.producerIdentity === "object", "TrainingEvent.producerIdentity: missing");
      for (const field of ["characterDigest", "runtimeSessionDigest", "agentRelationDigest"]) sha(record.producerIdentity[field], `TrainingEvent.producerIdentity.${field}`);
      nonempty(record.producerIdentity.office, "TrainingEvent.producerIdentity.office");
      nonempty(record.producerIdentity.providerEngagement, "TrainingEvent.producerIdentity.providerEngagement");
      if (record.mentor !== undefined) nonempty(record.mentor, "TrainingEvent.mentor");
      unique(record.competencies, "TrainingEvent.competencies");
      list(record.evidence, "TrainingEvent.evidence", 1);
      for (const evidence of record.evidence) {
        nonempty(evidence.kind, "TrainingEvent.evidence.kind");
        sha(evidence.digest, "TrainingEvent.evidence.digest");
        assert(evidence.artifact && typeof evidence.artifact === "object", "TrainingEvent.evidence.artifact: resolvable bytes missing");
        assert(evidence.digest === digest(evidence.artifact), "TrainingEvent.evidence: digest does not resolve to embedded artifact bytes");
        assert(evidence.artifact.enrollment === record.enrollment && evidence.artifact.bundle === record.bundle, "TrainingEvent.evidence: artifact lineage mismatch");
        assert(evidence.artifact.candidateAssemblyDigest === record.candidateAssemblyDigest, "TrainingEvent.evidence: candidate assembly mismatch");
        list(evidence.artifact.caseIds, "TrainingEvent.evidence.artifact.caseIds", 1);
        nonempty(evidence.artifact.witnessKind, "TrainingEvent.evidence.artifact.witnessKind");
      }
      assert(["demonstrated", "developing", "not-demonstrated", "refused"].includes(record.outcome), "TrainingEvent: invalid outcome");
      assert(record.customerMutation === false, "TrainingEvent: customer mutation is forbidden");
      break;
    case "Assessment":
      urn(record.enrollment, "Assessment.enrollment");
      urn(record.baseline, "Assessment.baseline");
      time(record.assessedAt, "Assessment.assessedAt");
      nonempty(record.assessor, "Assessment.assessor");
      urn(record.bundle, "Assessment.bundle");
      urn(record.challengeReveal, "Assessment.challengeReveal");
      assert(record.examinerIdentity && typeof record.examinerIdentity === "object", "Assessment.examinerIdentity: missing");
      for (const field of ["characterDigest", "runtimeSessionDigest", "agentRelationDigest"]) sha(record.examinerIdentity[field], `Assessment.examinerIdentity.${field}`);
      nonempty(record.examinerIdentity.office, "Assessment.examinerIdentity.office");
      nonempty(record.examinerIdentity.providerEngagement, "Assessment.examinerIdentity.providerEngagement");
      unique(record.trainerIdentities, "Assessment.trainerIdentities");
      assert(record.independent === true && !record.trainerIdentities.includes(record.assessor), "Assessment: assessor is not independent");
      list(record.coverage, "Assessment.coverage", 1);
      for (const coverage of record.coverage) {
        nonempty(coverage.competency, "Assessment.coverage.competency");
        assert(["no-admitted-evidence", "demonstrated", "refuted", "contradictory"].includes(coverage.result), "Assessment: invalid competency result");
        if (coverage.result === "demonstrated") list(coverage.witnessDigests, "Assessment.coverage.witnessDigests", 1);
        for (const witness of coverage.witnessDigests ?? []) sha(witness, "Assessment.coverage.witnessDigest");
      }
      unique(record.witnesses, "Assessment.witnesses");
      assert(record.witnesses.length > 0, "Assessment: witnesses missing");
      record.witnesses.forEach((item) => sha(item, "Assessment.witness"));
      assert(["qualified", "gaps"].includes(record.disposition), "Assessment: invalid disposition");
      if (record.disposition === "qualified") assert(record.coverage.every((item) => item.result === "demonstrated"), "Assessment: gaps cannot be qualified");
      if (record.disposition === "qualified") urn(record.controlAssessment, "Assessment.controlAssessment");
      break;
    case "Qualification":
      urn(record.assessment, "Qualification.assessment");
      urn(record.enrollment, "Qualification.enrollment");
      urn(record.baseline, "Qualification.baseline");
      time(record.issuedAt, "Qualification.issuedAt");
      nonempty(record.issuer, "Qualification.issuer");
      nonempty(record.candidate?.id, "Qualification.candidate.id");
      assert(CANDIDATE_KINDS.has(record.candidate?.kind), "Qualification: invalid candidate kind");
      sha(record.candidate.identityDigest, "Qualification.candidate.identityDigest");
      assert(record.candidate.appointmentLayer === "character-only", "Qualification: only the character layer may be appointed");
      unique(record.competencies, "Qualification.competencies");
      assert(record.competencies.length > 0, "Qualification: competencies missing");
      list(record.limitations, "Qualification.limitations");
      assert(record.conveysAuthority === false && record.customerAdmissionRequired === true, "Qualification: authority boundary missing");
      if (record.supersedes) urn(record.supersedes, "Qualification.supersedes");
      break;
    case "FormationRefusal":
      time(record.refusedAt, "FormationRefusal.refusedAt");
      assert(REFUSALS.has(record.code), "FormationRefusal: unknown refusal code");
      nonempty(record.reason, "FormationRefusal.reason");
      assert(record.authorityNotGranted === true, "FormationRefusal: authority boundary missing");
      for (const field of ["request", "cohort", "enrollment"]) if (record[field]) urn(record[field], `FormationRefusal.${field}`);
      break;
    case "RequalificationGap":
      urn(record.fromBaseline, "RequalificationGap.fromBaseline");
      urn(record.toBaseline, "RequalificationGap.toBaseline");
      if (record.qualification) urn(record.qualification, "RequalificationGap.qualification");
      time(record.derivedAt, "RequalificationGap.derivedAt");
      unique(record.addedCompetencies, "RequalificationGap.addedCompetencies");
      unique(record.removedCompetencies, "RequalificationGap.removedCompetencies");
      unique(record.changedOfficeFacts, "RequalificationGap.changedOfficeFacts");
      assert(typeof record.fullRequalificationRequired === "boolean", "RequalificationGap: full-requalification flag missing");
      if (record.reason) nonempty(record.reason, "RequalificationGap.reason");
      break;
    case "FormationEpochGap":
      urn(record.fromCohort, "FormationEpochGap.fromCohort");
      urn(record.toCohort, "FormationEpochGap.toCohort");
      time(record.derivedAt, "FormationEpochGap.derivedAt");
      unique(record.changedComponents, "FormationEpochGap.changedComponents");
      assert(record.changedComponents.length > 0, "FormationEpochGap: no configuration change");
      assert(record.changedComponents.every((component) => FORMATION_COMPONENTS.has(component)), "FormationEpochGap: unknown formation component");
      assert(typeof record.sameOfficeBaseline === "boolean", "FormationEpochGap: same-office-baseline flag missing");
      assert(record.automaticAdvancement === false && record.customerReviewRequired === true, "FormationEpochGap: review boundary missing");
      break;
    case "DoctrineAdmission":
      nonempty(record.source, "DoctrineAdmission.source");
      sha(record.digest, "DoctrineAdmission.digest");
      nonempty(record.owner, "DoctrineAdmission.owner");
      assert(["current-law", "current-practice", "admitted-research", "legacy-prior-art", "customer-overlay"].includes(record.authorityClass), "DoctrineAdmission: authority class invalid");
      nonempty(record.jurisdiction, "DoctrineAdmission.jurisdiction");
      unique(record.useGrant, "DoctrineAdmission.useGrant");
      assert(record.useGrant.length > 0, "DoctrineAdmission: use grant missing");
      assert(["binding-within-source-jurisdiction", "binding-academy-law", "illustrative", "contested", "rejected"].includes(record.reading), "DoctrineAdmission: reading invalid");
      time(record.admittedAt, "DoctrineAdmission.admittedAt");
      nonempty(record.reason, "DoctrineAdmission.reason");
      if (record.supersedes) urn(record.supersedes, "DoctrineAdmission.supersedes");
      break;
    case "QualificationStatusEvent":
      urn(record.qualification, "QualificationStatusEvent.qualification");
      assert(["correction", "suspension", "revocation", "expiry", "reinstatement", "supersession"].includes(record.event), "QualificationStatusEvent: event invalid");
      time(record.recordedAt, "QualificationStatusEvent.recordedAt");
      nonempty(record.issuer, "QualificationStatusEvent.issuer");
      nonempty(record.reason, "QualificationStatusEvent.reason");
      unique(record.evidence, "QualificationStatusEvent.evidence");
      assert(record.evidence.length > 0, "QualificationStatusEvent: evidence missing");
      record.evidence.forEach((item) => sha(item, "QualificationStatusEvent.evidence"));
      assert(record.conveysAuthority === false, "QualificationStatusEvent: cannot convey authority");
      if (record.successorQualification) urn(record.successorQualification, "QualificationStatusEvent.successorQualification");
      break;
    case "SuccessionExercise":
      assert(["incumbent-handover", "office-succession", "curriculum-bridge"].includes(record.kind), "SuccessionExercise: kind invalid");
      urn(record.enrollment, "SuccessionExercise.enrollment");
      urn(record.baseline, "SuccessionExercise.baseline");
      time(record.performedAt, "SuccessionExercise.performedAt");
      unique(record.openObligations, "SuccessionExercise.openObligations");
      list(record.contradictions, "SuccessionExercise.contradictions");
      assert(["not-required", "simulated", "receiver-controlled"].includes(record.protectedContextTransfer), "SuccessionExercise: protected-context transfer invalid");
      unique(record.witnesses, "SuccessionExercise.witnesses");
      assert(record.witnesses.length > 0, "SuccessionExercise: witnesses missing");
      record.witnesses.forEach((item) => sha(item, "SuccessionExercise.witness"));
      assert(record.customerMutation === false && record.performsReceiverAct === false, "SuccessionExercise: receiver sovereignty boundary violated");
      break;
  }
  return record;
}

function timestampOf(record) {
  for (const field of ["receivedAt", "compiledAt", "establishedAt", "openedAt", "admittedAt", "committedAt", "revealedAt", "occurredAt", "assessedAt", "issuedAt", "refusedAt", "derivedAt", "recordedAt", "performedAt"]) {
    if (record[field]) return record[field];
  }
  throw new Error(`${record.type}: no event time`);
}

export async function readRecords(nodeRoot) {
  return await queryAcademySemanticContent(ACADEMY_RECORD_CATEGORY, { root: nodeRoot });
}

function indexRecords(records) {
  const index = new Map();
  for (const record of records) {
    validateRecord(record);
    assert(!index.has(record.id), `${record.id}: duplicate content identity`);
    index.set(record.id, record);
  }
  return index;
}

export function verifyRecords(records) {
  const index = indexRecords(records);
  const get = (id, type, owner) => {
    const record = index.get(id);
    assert(record?.type === type, `${owner}: unresolved ${type} ${id}`);
    return record;
  };
  for (const record of records) {
    if (record.type === "CurriculumRevision") {
      const request = get(record.request, "FormationRequest", record.id);
      const covered = new Set(Object.values(record.competencyMap).flat());
      assert(request.competencies.every((item) => covered.has(item)), `${record.id}: curriculum omits a required competency without removing it from the baseline request`);
      record.parents.forEach((id) => get(id, "CurriculumRevision", record.id));
    } else if (record.type === "FormationBaseline") {
      const request = get(record.request, "FormationRequest", record.id);
      const curriculum = get(record.curriculum, "CurriculumRevision", record.id);
      assert(curriculum.request === request.id, `${record.id}: curriculum and request differ`);
      assert(canonical(record.office) === canonical(request.office), `${record.id}: office snapshot differs from admitted request`);
      assert(sameSet(record.competencies, request.competencies), `${record.id}: competency set differs from admitted request`);
      assert(record.assessmentLawDigest === digest(request.assessmentLaw), `${record.id}: assessment law digest mismatch`);
      record.predecessors.forEach((id) => get(id, "FormationBaseline", record.id));
    } else if (record.type === "Cohort") {
      const baseline = get(record.baseline, "FormationBaseline", record.id);
      assert(record.formationConfiguration.officeDigest === baseline.office.digest, `${record.id}: cohort office differs from baseline`);
      assert(record.formationConfiguration.assessmentLawDigest === baseline.assessmentLawDigest, `${record.id}: cohort assessment law differs from baseline`);
      record.parents.forEach((id) => get(id, "Cohort", record.id));
      if (record.bridgeFrom) get(record.bridgeFrom, "Cohort", record.id);
    } else if (record.type === "OfficeFormationBundle") {
      const enrollment = get(record.enrollment, "Enrollment", record.id);
      const cohort = get(record.cohort, "Cohort", record.id);
      const baseline = get(record.baseline, "FormationBaseline", record.id);
      assert(enrollment.cohort === cohort.id && enrollment.baseline === baseline.id && cohort.baseline === baseline.id, `${record.id}: formation bundle lineage is inconsistent`);
      assert(record.formationConfigurationDigest === cohort.formationConfigurationDigest, `${record.id}: formation bundle configuration differs from cohort`);
      assert(canonical(record.candidate) === canonical({ id: enrollment.candidate.id, kind: enrollment.candidate.kind, identityDigest: enrollment.candidate.identityDigest }), `${record.id}: formation bundle candidate differs from enrollment`);
      if (record.candidateAssembly === undefined) {
        const correction = records.find((item) => item.type === "FormationRecordCorrection" && item.target === record.id && item.invalidatesPriorForUse === true);
        assert(correction, `${record.id}: legacy bundle drops candidate assembly and has no typed correction`);
        continue;
      }
      assert(canonical(record.candidateAssembly.layerBindings) === canonical(enrollment.candidate.layerBindings), `${record.id}: formation bundle drops or changes candidate layer bindings`);
      assert(record.office.id === baseline.office.id && record.office.digest === baseline.office.digest, `${record.id}: formation bundle office differs from baseline`);
      assert(sameSet(record.skillPack, baseline.office.skills.map(({ id, specDigest, bodyDigest }) => ({ id, specDigest, bodyDigest }))), `${record.id}: formation bundle skill pack is incomplete or foreign`);
      assert(record.assessmentSpecDigest === baseline.assessmentLawDigest, `${record.id}: formation bundle assessment differs from baseline`);
    } else if (record.type === "FormationRecordCorrection") {
      const target = index.get(record.target), replacement = index.get(record.replacement);
      assert(target && replacement && target.type === replacement.type, `${record.id}: correction target or same-type replacement unresolved`);
    } else if (record.type === "AssessmentChallengeCommitment") {
      const enrollment = get(record.enrollment, "Enrollment", record.id);
      const bundle = get(record.bundle, "OfficeFormationBundle", record.id);
      assert(bundle.enrollment === enrollment.id, `${record.id}: challenge commitment bundle and enrollment differ`);
    } else if (record.type === "AssessmentChallengeReveal") {
      const commitment = get(record.commitment, "AssessmentChallengeCommitment", record.id);
      assert(record.selectionCommitment === undefined, `${record.id}: reveal must not carry a second commitment`);
      assert(commitment.selectionCommitment === digest({ cases: record.cases, nonce: record.nonce, caseBankDigest: commitment.caseBankDigest }), `${record.id}: challenge reveal does not open the prior commitment`);
      assert(Date.parse(record.revealedAt) >= Date.parse(commitment.committedAt), `${record.id}: challenge was revealed before it was committed`);
    } else if (record.type === "Enrollment") {
      const cohort = get(record.cohort, "Cohort", record.id);
      assert(cohort.baseline === record.baseline, `${record.id}: enrollment baseline differs from cohort`);
      const baseline = get(record.baseline, "FormationBaseline", record.id);
      const request = get(baseline.request, "FormationRequest", record.id);
      assert(request.candidatePolicy.kinds.includes(record.candidate.kind), `${record.id}: candidate kind was not admitted`);
    } else if (record.type === "TrainingEvent") {
      const enrollment = get(record.enrollment, "Enrollment", record.id);
      assert(enrollment.baseline === record.baseline, `${record.id}: training baseline differs from enrollment`);
      const baseline = get(record.baseline, "FormationBaseline", record.id);
      assert(record.competencies.every((item) => baseline.competencies.includes(item)), `${record.id}: training asserts an out-of-baseline competency`);
      const bundle = get(record.bundle, "OfficeFormationBundle", record.id);
      assert(bundle.enrollment === enrollment.id && bundle.baseline === baseline.id, `${record.id}: training bundle lineage differs`);
      assert(record.candidateAssemblyDigest === bundle.candidateAssembly.assemblyDigest, `${record.id}: training candidate assembly differs from bundle`);
    } else if (record.type === "Assessment") {
      const enrollment = get(record.enrollment, "Enrollment", record.id);
      assert(enrollment.baseline === record.baseline, `${record.id}: assessment baseline differs from enrollment`);
      const baseline = get(record.baseline, "FormationBaseline", record.id);
      assert(sameSet(record.coverage.map((item) => item.competency), baseline.competencies), `${record.id}: assessment does not cover the exact baseline competency set`);
      const training = records.filter((item) => item.type === "TrainingEvent" && item.enrollment === record.enrollment);
      const trainers = new Set(training.flatMap((item) => [item.instructor, item.mentor].filter(Boolean)));
      assert(!trainers.has(record.assessor), `${record.id}: assessor trained or mentored this candidate`);
      assert([...trainers].every((item) => record.trainerIdentities.includes(item)), `${record.id}: assessment did not disclose every trainer or mentor`);
      const bundle = get(record.bundle, "OfficeFormationBundle", record.id);
      assert(bundle.enrollment === enrollment.id, `${record.id}: assessment bundle differs from enrollment`);
      const reveal = get(record.challengeReveal, "AssessmentChallengeReveal", record.id);
      const commitment = get(reveal.commitment, "AssessmentChallengeCommitment", record.id);
      assert(commitment.enrollment === enrollment.id && commitment.bundle === bundle.id, `${record.id}: challenge lineage differs from assessment`);
      const evidence = new Map(training.flatMap((event) => event.evidence.map((item) => [item.digest, item])));
      assert(evidence.has(reveal.candidateArtifactDigest), `${record.id}: challenge reveal does not name a resolvable sealed candidate artifact`);
      const cited = new Set(record.coverage.flatMap((item) => item.witnessDigests ?? []));
      assert([...cited].every((item) => evidence.has(item)), `${record.id}: assessment cites a witness that does not resolve to candidate training bytes`);
      assert(record.witnesses.every((item) => cited.has(item) && evidence.has(item)), `${record.id}: assessment witness list contains an unresolved or uncited digest`);
      const witnessedCases = new Set([...cited].flatMap((item) => evidence.get(item).artifact.caseIds));
      assert(reveal.cases.every((item) => witnessedCases.has(item)), `${record.id}: assessment omits a committed case`);
      const request = get(baseline.request, "FormationRequest", record.id);
      const requiredKinds = request.assessmentLaw.requiredWitnessKinds.filter((item) => item !== "independent-examination");
      const witnessKinds = new Set([...cited].map((item) => evidence.get(item).artifact.witnessKind));
      const trainerBindings = training.map((item) => item.producerIdentity);
      for (const identity of trainerBindings) {
        assert(identity.characterDigest !== record.examinerIdentity.characterDigest, `${record.id}: examiner character trained the candidate`);
        assert(identity.runtimeSessionDigest !== record.examinerIdentity.runtimeSessionDigest, `${record.id}: examiner runtime trained the candidate`);
        assert(identity.agentRelationDigest !== record.examinerIdentity.agentRelationDigest, `${record.id}: examiner agent relation trained the candidate`);
        assert(identity.providerEngagement !== record.examinerIdentity.providerEngagement, `${record.id}: examiner engagement trained the candidate`);
      }
      if (record.disposition === "qualified") {
        assert(requiredKinds.every((item) => witnessKinds.has(item)), `${record.id}: assessment omits a required witness kind`);
        const curriculum = get(baseline.curriculum, "CurriculumRevision", record.id);
        const stages = new Set(training.map((item) => item.stage));
        assert(curriculum.stages.every((item) => stages.has(item)), `${record.id}: qualifying assessment omits a formation stage`);
        assert((request.assessmentLaw.requiredCases ?? []).every((item) => witnessedCases.has(item)), `${record.id}: qualifying assessment omits a curriculum-required case`);
        const control = get(record.controlAssessment, "Assessment", record.id);
        assert(control.disposition === "gaps" && control.baseline === baseline.id && control.enrollment !== enrollment.id, `${record.id}: qualifying assessment lacks a failing same-baseline control`);
      }
    } else if (record.type === "Qualification") {
      const assessment = get(record.assessment, "Assessment", record.id);
      const enrollment = get(record.enrollment, "Enrollment", record.id);
      assert(assessment.disposition === "qualified", `${record.id}: qualification lacks a qualifying assessment`);
      assert(assessment.enrollment === enrollment.id && assessment.baseline === record.baseline && enrollment.baseline === record.baseline, `${record.id}: qualification chain is not baseline-consistent`);
      assert(canonical(record.candidate) === canonical(enrollment.candidate), `${record.id}: qualification candidate differs from enrollment`);
      assert(sameSet(record.competencies, assessment.coverage.map((item) => item.competency)), `${record.id}: qualification competency set differs from assessment`);
      if (record.supersedes) get(record.supersedes, "Qualification", record.id);
    } else if (record.type === "RequalificationGap") {
      get(record.fromBaseline, "FormationBaseline", record.id);
      get(record.toBaseline, "FormationBaseline", record.id);
      if (record.qualification) {
        const qualification = get(record.qualification, "Qualification", record.id);
        assert(qualification.baseline === record.fromBaseline, `${record.id}: qualification does not belong to the source baseline`);
      }
    } else if (record.type === "FormationEpochGap") {
      const from = get(record.fromCohort, "Cohort", record.id), to = get(record.toCohort, "Cohort", record.id);
      assert(record.sameOfficeBaseline === (from.baseline === to.baseline), record.id + ": same-office-baseline flag is incorrect");
    } else if (record.type === "DoctrineAdmission") {
      if (record.supersedes) get(record.supersedes, "DoctrineAdmission", record.id);
    } else if (record.type === "QualificationStatusEvent") {
      get(record.qualification, "Qualification", record.id);
      if (record.successorQualification) get(record.successorQualification, "Qualification", record.id);
      assert(record.event === "supersession" ? Boolean(record.successorQualification) : true, `${record.id}: supersession event lacks successor qualification`);
    } else if (record.type === "SuccessionExercise") {
      const enrollment = get(record.enrollment, "Enrollment", record.id);
      assert(enrollment.baseline === record.baseline, `${record.id}: succession exercise baseline differs from enrollment`);
    }
  }
  return { ok: true, records: records.length, byType: Object.fromEntries([...new Set(records.map((record) => record.type))].sort().map((type) => [type, records.filter((record) => record.type === type).length])) };
}

export async function verifyNode(nodeRoot) {
  return verifyRecords(await readRecords(nodeRoot));
}

export async function appendRecord(nodeRoot, record) {
  const existing = await readRecords(nodeRoot);
  assert(!existing.some((item) => item.id === record.id), `${record.id}: record already exists`);
  verifyRecords([...existing, record]);
  const receipt = await recordAcademySemanticContent(nodeRoot, ACADEMY_RECORD_CATEGORY, record, timestampOf(record));
  return { record, networkReference: receipt.reference, semanticId: receipt.semanticId };
}

export async function appendRecords(nodeRoot, records) {
  const existing = await readRecords(nodeRoot);
  const ids = new Set(existing.map((item) => item.id));
  for (const record of records) {
    assert(!ids.has(record.id), `${record.id}: record already exists`);
    ids.add(record.id);
  }
  verifyRecords([...existing, ...records]);
  const written = [];
  for (const record of records) {
    const receipt = await recordAcademySemanticContent(nodeRoot, ACADEMY_RECORD_CATEGORY, record, timestampOf(record));
    written.push({ record, networkReference: receipt.reference, semanticId: receipt.semanticId });
  }
  return written;
}

export function admitRequest(input) {
  return withIdentity({
    type: "FormationRequest",
    customer: input.customer,
    receivedAt: input.receivedAt,
    office: input.office,
    candidatePolicy: input.candidatePolicy,
    trainingGrant: input.trainingGrant,
    competencies: input.competencies,
    assessmentLaw: input.assessmentLaw,
    ...(input.price === undefined ? {} : { price: input.price })
  });
}

export function compileCurriculum(input) {
  return withIdentity({
    type: "CurriculumRevision",
    request: input.request,
    compiledAt: input.compiledAt,
    stages: input.stages,
    competencyMap: input.competencyMap,
    doctrineSources: input.doctrineSources,
    omissions: input.omissions ?? [],
    parents: input.parents ?? [],
    ...(input.customerOverlayDigest ? { customerOverlayDigest: input.customerOverlayDigest } : {})
  });
}

export function establishBaseline(input, records) {
  const index = indexRecords(records);
  const request = index.get(input.request), curriculum = index.get(input.curriculum);
  assert(request?.type === "FormationRequest", "establish-baseline: formation request unresolved");
  assert(curriculum?.type === "CurriculumRevision" && curriculum.request === request.id, "establish-baseline: curriculum unresolved or belongs to another request");
  return withIdentity({
    type: "FormationBaseline",
    request: request.id,
    curriculum: curriculum.id,
    establishedAt: input.establishedAt,
    office: request.office,
    competencies: request.competencies,
    assessmentLawDigest: digest(request.assessmentLaw),
    predecessors: input.predecessors ?? []
  });
}

export function openCohort(input, records) {
  const index = indexRecords(records), baseline = index.get(input.baseline);
  assert(baseline?.type === "FormationBaseline", "open-cohort: formation baseline unresolved");
  const curriculum = index.get(baseline.curriculum);
  assert(curriculum?.type === "CurriculumRevision", "open-cohort: curriculum unresolved");
  const formationConfiguration = {
    officeDigest: baseline.office.digest,
    doctrineDenominatorDigest: digest(curriculum.doctrineSources),
    curriculumDigest: digest(curriculum),
    exerciseRegimeDigest: input.exerciseRegimeDigest,
    assessmentLawDigest: baseline.assessmentLawDigest,
    providers: input.providers ?? [],
    projectors: input.projectors ?? []
  };
  return withIdentity({
    type: "Cohort",
    baseline: input.baseline,
    openedAt: input.openedAt,
    admissionEpoch: input.admissionEpoch,
    progression: "asynchronous",
    formationConfiguration,
    formationConfigurationDigest: digest(formationConfiguration),
    parents: input.parents ?? [],
    ...(input.bridgeFrom ? { bridgeFrom: input.bridgeFrom } : {})
  });
}

export function compileOfficeFormationBundle(input, records) {
  const index = indexRecords(records), enrollment = index.get(input.enrollment);
  assert(enrollment?.type === "Enrollment", "compile-office-formation-bundle: enrollment unresolved");
  const cohort = index.get(enrollment.cohort), baseline = index.get(enrollment.baseline);
  assert(cohort?.type === "Cohort" && baseline?.type === "FormationBaseline", "compile-office-formation-bundle: cohort or baseline unresolved");
  const materials = input.materials ?? [], omissions = input.omissions ?? [];
  return withIdentity({
    type: "OfficeFormationBundle",
    enrollment: enrollment.id,
    cohort: cohort.id,
    baseline: baseline.id,
    compiledAt: input.compiledAt,
    formationConfigurationDigest: cohort.formationConfigurationDigest,
    candidate: { id: enrollment.candidate.id, kind: enrollment.candidate.kind, identityDigest: enrollment.candidate.identityDigest },
    candidateAssembly: {
      appointmentLayer: enrollment.candidate.appointmentLayer,
      layerBindings: enrollment.candidate.layerBindings,
      ...(enrollment.candidate.model ? { model: enrollment.candidate.model } : {}),
      ...(enrollment.candidate.provider ? { provider: enrollment.candidate.provider } : {}),
      ...(enrollment.candidate.harnessDigest ? { harnessDigest: enrollment.candidate.harnessDigest } : {}),
      assemblyDigest: digest({ candidate: { id: enrollment.candidate.id, kind: enrollment.candidate.kind, identityDigest: enrollment.candidate.identityDigest }, layerBindings: enrollment.candidate.layerBindings, model: enrollment.candidate.model ?? null, provider: enrollment.candidate.provider ?? null, harnessDigest: enrollment.candidate.harnessDigest ?? null })
    },
    office: { id: baseline.office.id, digest: baseline.office.digest },
    characterFormation: {
      characterDigest: enrollment.candidate.layerBindings.character,
      dispositionDigest: input.dispositionDigest,
      personaDigest: input.personaDigest
    },
    skillPack: baseline.office.skills.map(({ id, specDigest, bodyDigest }) => ({ id, specDigest, bodyDigest })),
    contextPlan: {
      denominatorCount: materials.length + omissions.length,
      materials,
      omissions,
      completeness: omissions.length === 0 ? "complete" : "bounded-with-gaps",
      carriers: input.carriers
    },
    exercisePackDigest: input.exercisePackDigest,
    assessmentSpecDigest: baseline.assessmentLawDigest,
    engagementRoles: input.engagementRoles ?? [],
    learningLoop: ["observe", "plan", "evaluate", "reflect", "procedural-memory", "skill-retrieval", "hook-feedback"],
    projectionPlan: input.projectionPlan,
    authority: { conveysIncumbency: false, grantsCapabilities: false, writesCustomer: false }
  });
}

export function enrollCandidate(input, records) {
  const index = indexRecords(records), cohort = index.get(input.cohort);
  assert(cohort?.type === "Cohort", "enroll: cohort unresolved");
  return withIdentity({ type: "Enrollment", cohort: cohort.id, baseline: cohort.baseline, admittedAt: input.admittedAt, candidate: input.candidate });
}

export function commitAssessmentChallenge(input, records) {
  const index = indexRecords(records), enrollment = index.get(input.enrollment), bundle = index.get(input.bundle);
  assert(enrollment?.type === "Enrollment" && bundle?.type === "OfficeFormationBundle" && bundle.enrollment === enrollment.id, "commit-assessment-challenge: enrollment or bundle unresolved");
  return withIdentity({
    type: "AssessmentChallengeCommitment",
    enrollment: enrollment.id,
    bundle: bundle.id,
    committedAt: input.committedAt,
    committedBy: input.committedBy,
    caseBankDigest: input.caseBankDigest,
    selectionCommitment: input.selectionCommitment,
    concealed: true
  });
}

export function revealAssessmentChallenge(input, records) {
  const index = indexRecords(records), commitment = index.get(input.commitment);
  assert(commitment?.type === "AssessmentChallengeCommitment", "reveal-assessment-challenge: commitment unresolved");
  return withIdentity({
    type: "AssessmentChallengeReveal",
    commitment: commitment.id,
    revealedAt: input.revealedAt,
    cases: input.cases,
    nonce: input.nonce,
    candidateArtifactDigest: input.candidateArtifactDigest
  });
}

export function recordTraining(input, records) {
  const index = indexRecords(records), enrollment = index.get(input.enrollment);
  assert(enrollment?.type === "Enrollment", "record-training: enrollment unresolved");
  return withIdentity({
    type: "TrainingEvent",
    enrollment: enrollment.id,
    baseline: enrollment.baseline,
    occurredAt: input.occurredAt,
    stage: input.stage,
    instructor: input.instructor,
    bundle: input.bundle,
    candidateAssemblyDigest: input.candidateAssemblyDigest,
    producerIdentity: input.producerIdentity,
    ...(input.mentor ? { mentor: input.mentor } : {}),
    competencies: input.competencies,
    evidence: input.evidence,
    outcome: input.outcome,
    corrections: input.corrections ?? [],
    customerMutation: false
  });
}

export function recordAssessment(input, records) {
  const index = indexRecords(records), enrollment = index.get(input.enrollment);
  assert(enrollment?.type === "Enrollment", "record-assessment: enrollment unresolved");
  const training = records.filter((item) => item.type === "TrainingEvent" && item.enrollment === enrollment.id);
  const trainers = [...new Set(training.flatMap((item) => [item.instructor, item.mentor].filter(Boolean)))].sort();
  assert(!trainers.includes(input.assessor), "record-assessment: assessor trained or mentored this candidate");
  return withIdentity({
    type: "Assessment",
    enrollment: enrollment.id,
    baseline: enrollment.baseline,
    assessedAt: input.assessedAt,
    assessor: input.assessor,
    bundle: input.bundle,
    challengeReveal: input.challengeReveal,
    examinerIdentity: input.examinerIdentity,
    trainerIdentities: trainers,
    independent: true,
    coverage: input.coverage,
    witnesses: input.witnesses,
    disposition: input.disposition,
    ...(input.controlAssessment ? { controlAssessment: input.controlAssessment } : {}),
    limitations: input.limitations ?? []
  });
}

export function issueQualification(input, records) {
  const index = indexRecords(records), assessment = index.get(input.assessment);
  assert(assessment?.type === "Assessment" && assessment.disposition === "qualified", "issue-qualification: qualifying assessment unresolved");
  const enrollment = index.get(assessment.enrollment);
  assert(enrollment?.type === "Enrollment", "issue-qualification: enrollment unresolved");
  return withIdentity({
    type: "Qualification",
    assessment: assessment.id,
    enrollment: enrollment.id,
    candidate: enrollment.candidate,
    baseline: assessment.baseline,
    issuedAt: input.issuedAt,
    issuer: input.issuer,
    competencies: assessment.coverage.map((item) => item.competency),
    limitations: [...(assessment.limitations ?? []), ...(input.limitations ?? [])],
    conveysAuthority: false,
    customerAdmissionRequired: true,
    ...(input.supersedes ? { supersedes: input.supersedes } : {})
  });
}

export function recordRefusal(input) {
  return withIdentity({
    type: "FormationRefusal",
    ...(input.request ? { request: input.request } : {}),
    ...(input.cohort ? { cohort: input.cohort } : {}),
    ...(input.enrollment ? { enrollment: input.enrollment } : {}),
    refusedAt: input.refusedAt,
    code: input.code,
    reason: input.reason,
    residualCompetencies: input.residualCompetencies ?? [],
    authorityNotGranted: true
  });
}

export function recordFormationCorrection(input) {
  return withIdentity({
    type: "FormationRecordCorrection",
    target: input.target,
    replacement: input.replacement,
    recordedAt: input.recordedAt,
    recordedBy: input.recordedBy,
    reason: input.reason,
    invalidatesPriorForUse: true
  });
}

export function deriveRequalificationGap(input, records) {
  const index = indexRecords(records), from = index.get(input.fromBaseline), to = index.get(input.toBaseline);
  assert(from?.type === "FormationBaseline" && to?.type === "FormationBaseline", "derive-requalification-gap: baseline unresolved");
  const added = to.competencies.filter((item) => !from.competencies.includes(item));
  const removed = from.competencies.filter((item) => !to.competencies.includes(item));
  const changed = [];
  if (from.office.digest !== to.office.digest) changed.push("office-digest");
  if (!sameSet(from.office.duties, to.office.duties)) changed.push("duties");
  if (!sameSet(from.office.skills, to.office.skills)) changed.push("skills");
  if (from.office.jurisdiction !== to.office.jurisdiction) changed.push("jurisdiction");
  if (from.office.protectedContextDigest !== to.office.protectedContextDigest) changed.push("protected-context");
  if (from.assessmentLawDigest !== to.assessmentLawDigest) changed.push("assessment-law");
  const full = changed.includes("jurisdiction") || changed.includes("protected-context");
  return withIdentity({
    type: "RequalificationGap",
    fromBaseline: from.id,
    toBaseline: to.id,
    ...(input.qualification ? { qualification: input.qualification } : {}),
    derivedAt: input.derivedAt,
    addedCompetencies: added,
    removedCompetencies: removed,
    changedOfficeFacts: changed,
    fullRequalificationRequired: full,
    reason: full ? "jurisdiction or protected-context sovereignty changed" : "form only the changed competency and office-fact gap"
  });
}

export function deriveFormationEpochGap(input, records) {
  const index = indexRecords(records), from = index.get(input.fromCohort), to = index.get(input.toCohort);
  assert(from?.type === "Cohort" && to?.type === "Cohort", "derive-formation-epoch-gap: cohort unresolved");
  const changed = [];
  const keys = ["officeDigest", "doctrineDenominatorDigest", "curriculumDigest", "exerciseRegimeDigest", "assessmentLawDigest", "providers", "projectors"];
  for (const key of keys) if (canonical(from.formationConfiguration[key]) !== canonical(to.formationConfiguration[key])) changed.push(key);
  assert(changed.length > 0, "derive-formation-epoch-gap: formation configurations are identical");
  return withIdentity({
    type: "FormationEpochGap",
    fromCohort: from.id,
    toCohort: to.id,
    derivedAt: input.derivedAt,
    changedComponents: changed,
    sameOfficeBaseline: from.baseline === to.baseline,
    automaticAdvancement: false,
    customerReviewRequired: true
  });
}

export function admitDoctrine(input) {
  return withIdentity({
    type: "DoctrineAdmission",
    source: input.source,
    digest: input.digest,
    owner: input.owner,
    authorityClass: input.authorityClass,
    jurisdiction: input.jurisdiction,
    useGrant: input.useGrant,
    reading: input.reading,
    admittedAt: input.admittedAt,
    reason: input.reason,
    ...(input.supersedes ? { supersedes: input.supersedes } : {})
  });
}

export function recordQualificationStatus(input, records) {
  const index = indexRecords(records);
  assert(index.get(input.qualification)?.type === "Qualification", "record-qualification-status: qualification unresolved");
  if (input.event === "supersession") assert(index.get(input.successorQualification)?.type === "Qualification", "record-qualification-status: successor qualification unresolved");
  return withIdentity({
    type: "QualificationStatusEvent",
    qualification: input.qualification,
    event: input.event,
    recordedAt: input.recordedAt,
    issuer: input.issuer,
    reason: input.reason,
    evidence: input.evidence,
    conveysAuthority: false,
    ...(input.successorQualification ? { successorQualification: input.successorQualification } : {})
  });
}

export function recordSuccessionExercise(input, records) {
  const index = indexRecords(records), enrollment = index.get(input.enrollment);
  assert(enrollment?.type === "Enrollment", "record-succession-exercise: enrollment unresolved");
  return withIdentity({
    type: "SuccessionExercise",
    kind: input.kind,
    enrollment: enrollment.id,
    baseline: enrollment.baseline,
    performedAt: input.performedAt,
    openObligations: input.openObligations ?? [],
    contradictions: input.contradictions ?? [],
    protectedContextTransfer: input.protectedContextTransfer,
    witnesses: input.witnesses,
    customerMutation: false,
    performsReceiverAct: false
  });
}
