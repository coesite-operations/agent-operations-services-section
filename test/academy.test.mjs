import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { admitDoctrine, admitRequest, appendRecord, commitAssessmentChallenge, compileCurriculum, compileOfficeFormationBundle, deriveFormationEpochGap, deriveRequalificationGap, digest, enrollCandidate, establishBaseline, issueQualification, openCohort, readRecords, recordAssessment, recordQualificationStatus, recordSuccessionExercise, recordTraining, revealAssessmentChallenge, validateRecord, verifyNode } from "../src/academy.mjs";
import { verifyAcademy } from "../src/verify-academy.mjs";

const at = (hour) => `2026-07-18T${String(hour).padStart(2, "0")}:00:00-05:00`;
const evidence = (name) => digest({ evidence: name });

async function fixture() {
  const root = mkdtempSync(join(tmpdir(), "union-officer-academy-"));
  const office = {
    id: "executive-officer-to-the-leader",
    digest: digest({ office: "executive-officer-to-the-leader", revision: 1 }),
    deonticProfileDigest: digest({ profile: "executive-officer" }),
    duties: ["translating-leader-intent", "procuring-enterprise-services", "accounting-for-interactive-execution"].map((id) => ({ id, digest: digest({ duty: id }), authority: "leader-provides-interactive-execution-resources", claim: "leader", work: id, workDigest: digest({ work: id }) })),
    skills: ["translating-leader-intent", "procuring-enterprise-services", "accounting-for-interactive-execution"].map((id) => ({ id, specDigest: digest({ skill: id }), bodyDigest: digest({ body: id }), closureKind: id === "accounting-for-interactive-execution" ? "procedure" : "inquiry", requiresCapabilities: [] })),
    jurisdiction: "leader-movement-team",
    protectedContextDigest: digest({ policy: "leader-source-remains-protected" }),
    appointmentLawDigest: digest({ law: "character-to-office-incumbency" }),
    succession: { predecessors: [], successors: [] }
  };
  const competencies = ["preserve-leader-source", "procure-a-sovereign-provider", "account-for-contributed-resources"];
  const cases = ["direct-order", "concealed-cross-settlement-write"];
  const request = admitRequest({
    customer: "leader-movement-team",
    receivedAt: at(1),
    office,
    candidatePolicy: { kinds: ["character", "person", "model-artifact", "runtime-session", "agent-relation"], identityInheritance: false },
    trainingGrant: { operations: ["read-supplied-cases", "write-academy-evidence"], customerMutation: false, egress: ["qualification-bundle"] },
    competencies,
    assessmentLaw: { requiredWitnessKinds: ["independent-demonstration", "negative-control"], requiredCases: cases, independentExaminer: true }
  });
  await appendRecord(root, request);
  const curriculum = compileCurriculum({
    request: request.id,
    compiledAt: at(2),
    stages: ["orientation", "simulation", "shadow-work", "supervised-practice", "independent-demonstration", "reflection", "teaching-back"],
    competencyMap: { orientation: [competencies[0]], "supervised-practice": [competencies[1]], "independent-demonstration": competencies },
    doctrineSources: [{ identity: "union-officer-academy/doctrine/management-thought-services", digest: evidence("management-thought"), owner: "union-officer-academy", authorityClass: "current-law", admissionTerms: ["Academy-local educational use", "source attribution preserved"] }],
    omissions: [],
    parents: []
  });
  await appendRecord(root, curriculum);
  const baseline = establishBaseline({ request: request.id, curriculum: curriculum.id, establishedAt: at(3), predecessors: [] }, await readRecords(root));
  await appendRecord(root, baseline);
  const cohort = openCohort({
    baseline: baseline.id,
    openedAt: at(4),
    admissionEpoch: "executive-officer-formation-generation-1",
    exerciseRegimeDigest: evidence("executive-officer-exercises"),
    providers: [{ id: "leader-movement-team-practitioner", role: "current-practice", digest: evidence("practitioner"), contract: "fixture/practitioner-contract" }],
    projectors: [{ id: "installing-codex-as-an-agent", digest: evidence("codex-projector"), contract: "fixture/projector-contract" }],
    parents: []
  }, await readRecords(root));
  await appendRecord(root, cohort);
  const candidate = {
    id: "codex-executive-officer-character-candidate",
    kind: "character",
    characterKind: "session",
    identityDigest: digest({ character: "codex-executive-officer-character-candidate" }),
    appointmentLayer: "character-only",
    layerBindings: {
      character: digest({ character: "codex-executive-officer-character-candidate" }),
      modelArtifact: digest({ model: "fixture-model" }),
      runtimeSession: digest({ runtime: "fixture-session" }),
      harness: digest({ harness: "fixture-harness" }),
      agentRelation: digest({ relation: "character-model-runtime-harness" })
    },
    model: "fixture-model",
    provider: "fixture-provider",
    harnessDigest: digest({ harness: "fixture-harness" })
  };
  const enrollment = enrollCandidate({ cohort: cohort.id, admittedAt: at(5), candidate }, await readRecords(root));
  await appendRecord(root, enrollment);
  const bundle = compileOfficeFormationBundle({
    enrollment: enrollment.id,
    compiledAt: at(5),
    dispositionDigest: evidence("bounded-executive-actuator"),
    personaDigest: evidence("executive-officer-current-scene"),
    materials: [
      { identity: "leader-movement-team/executive-officer", owner: "leader-movement-team", authorityClass: "current-law", digest: office.digest, purpose: "office law" },
      { identity: "academy/management-thought", owner: "union-officer-academy", authorityClass: "current-law", digest: evidence("management-thought"), purpose: "professional formation doctrine" },
      { identity: "metroplat/character-learning-loop", owner: "red-cup-engineering", authorityClass: "current-practice", digest: evidence("character-learning-loop"), purpose: "learning-loop design" }
    ],
    omissions: [],
    carriers: [
      { kind: "doctrine-suit", provider: "red-cup-engineering", digest: evidence("doctrine-suit") },
      { kind: "orientation", provider: "union-officer-academy", digest: evidence("orientation") },
      { kind: "skill-pack", provider: "leader-movement-team", digest: evidence("skill-pack") },
      { kind: "character-surface", provider: "union-officer-academy", digest: evidence("character-surface") }
    ],
    exercisePackDigest: evidence("executive-officer-exercises"),
    engagementRoles: [
      { role: "formation-practitioner", provider: "union-officer-academy", accountableFor: "formation sequence and correction" },
      { role: "current-practitioner-lecturer", provider: "leader-movement-team", accountableFor: "current executive-office practice" },
      { role: "developmental-mentor", provider: "leader-movement-team", accountableFor: "candidate growth through real cases" },
      { role: "projector-provider", provider: "executive-office", accountableFor: "customer-executed Codex projection" }
    ],
    projectionPlan: { provider: "executive-office", projector: "installing-codex-as-an-agent", projectorDigest: evidence("codex-projector"), customerExecutes: true }
  }, await readRecords(root));
  await appendRecord(root, bundle);
  const caseBankDigest = digest({ cases });
  const trainerIdentity = { office: "formation-practitioner", characterDigest: evidence("trainer-character"), runtimeSessionDigest: evidence("trainer-runtime"), agentRelationDigest: evidence("trainer-agent-relation"), providerEngagement: "fixture-practitioner-engagement" };
  const examinerIdentity = { office: "independent-examiner", characterDigest: evidence("examiner-character"), runtimeSessionDigest: evidence("examiner-runtime"), agentRelationDigest: evidence("examiner-agent-relation"), providerEngagement: "fixture-examiner-engagement" };

  const controlCandidate = {
    ...candidate,
    id: "blank-control-candidate",
    identityDigest: evidence("blank-control-candidate"),
    layerBindings: Object.fromEntries(Object.keys(candidate.layerBindings).map((key) => [key, evidence(`blank-control-${key}`)])),
  };
  const controlEnrollment = enrollCandidate({ cohort: cohort.id, admittedAt: at(5), candidate: controlCandidate }, await readRecords(root));
  await appendRecord(root, controlEnrollment);
  const controlBundle = compileOfficeFormationBundle({
    enrollment: controlEnrollment.id,
    compiledAt: at(5),
    dispositionDigest: bundle.characterFormation.dispositionDigest,
    personaDigest: evidence("blank-control-persona"),
    materials: bundle.contextPlan.materials,
    omissions: bundle.contextPlan.omissions,
    carriers: bundle.contextPlan.carriers,
    exercisePackDigest: bundle.exercisePackDigest,
    engagementRoles: bundle.engagementRoles,
    projectionPlan: bundle.projectionPlan,
  }, await readRecords(root));
  await appendRecord(root, controlBundle);
  const controlNonce = "fixture-control-nonce";
  const controlCommitment = commitAssessmentChallenge({ enrollment: controlEnrollment.id, bundle: controlBundle.id, committedAt: at(5), committedBy: "independent-examiner-a", caseBankDigest, selectionCommitment: digest({ cases, nonce: controlNonce, caseBankDigest }) }, await readRecords(root));
  await appendRecord(root, controlCommitment);
  const controlArtifact = { type: "AnswerablePerformanceArtifact", enrollment: controlEnrollment.id, bundle: controlBundle.id, candidateAssemblyDigest: controlBundle.candidateAssembly.assemblyDigest, caseIds: cases, witnessKind: "negative-control", output: { result: "failed", reason: "blank incumbent lacked Academy bundle knowledge" } };
  const controlEvidence = { kind: "resolvable-performance", digest: digest(controlArtifact), artifact: controlArtifact };
  const controlTraining = recordTraining({ enrollment: controlEnrollment.id, bundle: controlBundle.id, candidateAssemblyDigest: controlBundle.candidateAssembly.assemblyDigest, producerIdentity: trainerIdentity, occurredAt: at(6), stage: "independent-demonstration", instructor: "current-practitioner-lecturer-a", mentor: "mentor-a", competencies, evidence: [controlEvidence], outcome: "not-demonstrated", corrections: ["supply the exact bundle"] }, await readRecords(root));
  await appendRecord(root, controlTraining);
  const controlReveal = revealAssessmentChallenge({ commitment: controlCommitment.id, revealedAt: at(7), cases, nonce: controlNonce, candidateArtifactDigest: controlEvidence.digest }, await readRecords(root));
  await appendRecord(root, controlReveal);
  const controlAssessment = recordAssessment({ enrollment: controlEnrollment.id, bundle: controlBundle.id, challengeReveal: controlReveal.id, assessedAt: at(7), assessor: "independent-examiner-a", examinerIdentity, coverage: competencies.map((competency) => ({ competency, result: "refuted", witnessDigests: [controlEvidence.digest] })), witnesses: [controlEvidence.digest], disposition: "gaps", limitations: ["blank control did not acquire Academy-caused capability"] }, await readRecords(root));
  await appendRecord(root, controlAssessment);

  const nonce = "fixture-treatment-nonce";
  const commitment = commitAssessmentChallenge({ enrollment: enrollment.id, bundle: bundle.id, committedAt: at(5), committedBy: "independent-examiner-a", caseBankDigest, selectionCommitment: digest({ cases, nonce, caseBankDigest }) }, await readRecords(root));
  await appendRecord(root, commitment);
  const stages = ["orientation", "simulation", "shadow-work", "supervised-practice", "independent-demonstration", "reflection", "teaching-back"];
  const trainingEvents = [];
  for (const [index, stage] of stages.entries()) {
    const artifacts = (index === 4 ? ["independent-demonstration", "negative-control"] : ["independent-demonstration"]).map((witnessKind) => ({ type: "AnswerablePerformanceArtifact", enrollment: enrollment.id, bundle: bundle.id, candidateAssemblyDigest: bundle.candidateAssembly.assemblyDigest, caseIds: cases, witnessKind, stage, output: { result: "demonstrated", sourcePreserved: true, customerMutation: false, resources: { tokens: "unavailable" } } }));
    const event = recordTraining({ enrollment: enrollment.id, bundle: bundle.id, candidateAssemblyDigest: bundle.candidateAssembly.assemblyDigest, producerIdentity: trainerIdentity, occurredAt: at(6), stage, instructor: "current-practitioner-lecturer-a", mentor: "mentor-a", competencies, evidence: artifacts.map((artifact) => ({ kind: "resolvable-performance", digest: digest(artifact), artifact })), outcome: "demonstrated", corrections: ["report unavailable resource observations as unknown, not zero"] }, await readRecords(root));
    await appendRecord(root, event); trainingEvents.push(event);
  }
  const citedEvidence = trainingEvents.flatMap((event) => event.evidence).filter((item, index, all) => all.findIndex((other) => other.digest === item.digest) === index);
  const reveal = revealAssessmentChallenge({ commitment: commitment.id, revealedAt: at(7), cases, nonce, candidateArtifactDigest: citedEvidence[0].digest }, await readRecords(root));
  await appendRecord(root, reveal);
  const assessment = recordAssessment({
    enrollment: enrollment.id,
    bundle: bundle.id,
    challengeReveal: reveal.id,
    assessedAt: at(7),
    assessor: "independent-examiner-a",
    examinerIdentity,
    coverage: competencies.map((competency) => ({ competency, result: "demonstrated", witnessDigests: citedEvidence.map((item) => item.digest) })),
    witnesses: citedEvidence.map((item) => item.digest),
    disposition: "qualified",
    controlAssessment: controlAssessment.id,
    limitations: ["qualification is bound to formation baseline generation 1"]
  }, await readRecords(root));
  await appendRecord(root, assessment);
  const qualification = issueQualification({ assessment: assessment.id, issuedAt: at(8), issuer: "registrar-a", limitations: [] }, await readRecords(root));
  await appendRecord(root, qualification);
  return { root, request, curriculum, baseline, cohort, enrollment, bundle, training: trainingEvents.at(-1), assessment, qualification, office, competencies, examinerIdentity };
}

test("complete general officer-formation lifecycle remains Academy-local and authority-free", async (t) => {
  const value = await fixture();
  t.after(() => rmSync(value.root, { recursive: true, force: true }));
  const result = await verifyNode(value.root);
  assert.equal(result.ok, true);
  assert.equal(result.byType.Qualification, 1);
  assert.equal(result.byType.OfficeFormationBundle, 2);
  assert.equal(result.byType.Assessment, 2);
  assert.equal(value.cohort.progression, "asynchronous");
  assert.equal(value.bundle.contextPlan.completeness, "complete");
  assert.equal(value.bundle.authority.conveysIncumbency, false);
  assert.deepEqual(value.bundle.learningLoop, ["observe", "plan", "evaluate", "reflect", "procedural-memory", "skill-retrieval", "hook-feedback"]);
  assert.equal(value.training.customerMutation, false);
  assert.equal(value.qualification.conveysAuthority, false);
  assert.equal(value.qualification.customerAdmissionRequired, true);
  assert.equal(value.qualification.candidate.appointmentLayer, "character-only");
});

test("instructor or mentor cannot examine the same candidate", async (t) => {
  const value = await fixture();
  t.after(() => rmSync(value.root, { recursive: true, force: true }));
  const priorRecords = await readRecords(value.root);
  assert.throws(() => recordAssessment({
    enrollment: value.enrollment.id,
    assessedAt: at(9),
    assessor: "mentor-a",
    coverage: value.competencies.map((competency) => ({ competency, result: "demonstrated", witnessDigests: [evidence(competency)] })),
    witnesses: value.competencies.map(evidence),
    disposition: "qualified"
  }, priorRecords), /trained or mentored/);
});

test("a hash-shaped label is not a resolvable performance witness", async (t) => {
  const value = await fixture();
  t.after(() => rmSync(value.root, { recursive: true, force: true }));
  const artifact = { type: "AnswerablePerformanceArtifact", enrollment: value.enrollment.id, bundle: value.bundle.id, candidateAssemblyDigest: value.bundle.candidateAssembly.assemblyDigest, caseIds: ["direct-order"], witnessKind: "answerable-performance", output: { result: "claimed" } };
  const bad = recordTraining({
    enrollment: value.enrollment.id,
    bundle: value.bundle.id,
    candidateAssemblyDigest: value.bundle.candidateAssembly.assemblyDigest,
    producerIdentity: { office: "formation-practitioner", characterDigest: evidence("t-char"), runtimeSessionDigest: evidence("t-runtime"), agentRelationDigest: evidence("t-relation"), providerEngagement: "bad-witness-test" },
    occurredAt: at(9), stage: "simulation", instructor: "trainer-b", competencies: value.competencies,
    evidence: [{ kind: "label-hash", digest: evidence("not-the-artifact"), artifact }], outcome: "demonstrated",
  }, await readRecords(value.root));
  await assert.rejects(() => appendRecord(value.root, bad), /digest does not resolve/);
});

test("an examiner alias sharing the trainer runtime and agent relation is not independent", async (t) => {
  const value = await fixture();
  t.after(() => rmSync(value.root, { recursive: true, force: true }));
  const records = await readRecords(value.root);
  const training = records.filter((record) => record.type === "TrainingEvent" && record.enrollment === value.enrollment.id);
  const trainer = training[0].producerIdentity;
  const bad = recordAssessment({
    enrollment: value.enrollment.id,
    bundle: value.bundle.id,
    challengeReveal: value.assessment.challengeReveal,
    assessedAt: at(9),
    assessor: "renamed-examiner",
    examinerIdentity: { ...trainer, office: "independent-examiner" },
    coverage: value.assessment.coverage,
    witnesses: value.assessment.witnesses,
    disposition: "qualified",
    controlAssessment: value.assessment.controlAssessment,
  }, records);
  await assert.rejects(() => appendRecord(value.root, bad), /examiner (runtime|agent relation|character).*trained/);
});

test("a model or runtime cannot masquerade as an appointable character", () => {
  const candidate = {
    id: "bare-model",
    kind: "model-artifact",
    identityDigest: digest({ model: "bare-model" }),
    appointmentLayer: "model-artifact",
    layerBindings: { modelArtifact: digest({ model: "bare-model" }) },
    model: "bare-model",
    provider: "fixture-provider",
    harnessDigest: digest({ harness: "none" })
  };
  const body = { type: "Enrollment", cohort: `urn:${evidence("cohort")}`, baseline: `urn:${evidence("baseline")}`, admittedAt: at(5), candidate };
  const record = { id: `urn:${digest(body)}`, ...body };
  assert.throws(() => validateRecord(record), /character layer may be appointed/);
});

test("customer mutation is refused at request admission", () => {
  const request = admitRequest({
    customer: "customer",
    receivedAt: at(1),
    office: { id: "office", digest: evidence("office"), deonticProfileDigest: evidence("profile"), duties: [{ id: "duty", digest: evidence("duty"), authority: "charter", claim: "customer", work: "work", workDigest: evidence("work") }], skills: [{ id: "skill", specDigest: evidence("skill"), bodyDigest: evidence("skill-body"), closureKind: "procedure", requiresCapabilities: [] }], jurisdiction: "customer", protectedContextDigest: evidence("protected"), appointmentLawDigest: evidence("appointment-law"), succession: { predecessors: [], successors: [] } },
    candidatePolicy: { kinds: ["character"], identityInheritance: false },
    trainingGrant: { operations: ["train"], customerMutation: true, egress: [] },
    competencies: ["competency"],
    assessmentLaw: { requiredWitnessKinds: ["demonstration"], independentExaminer: true }
  });
  assert.throws(() => validateRecord(request), /customer mutation must be withheld/);
});

test("baseline drift produces a bridge gap and preserves the old qualification", async (t) => {
  const value = await fixture();
  t.after(() => rmSync(value.root, { recursive: true, force: true }));
  const nextCompetencies = [...value.competencies, "refuse-an-excess-grant"];
  const nextOffice = { ...value.office, digest: digest({ office: "executive-officer-to-the-leader", revision: 2 }), skills: [...value.office.skills, { id: "refusing-an-excess-grant", specDigest: evidence("refusing-skill"), bodyDigest: evidence("refusing-body"), closureKind: "procedure", requiresCapabilities: [] }] };
  const nextRequest = admitRequest({
    customer: "leader-movement-team",
    receivedAt: at(9),
    office: nextOffice,
    candidatePolicy: { kinds: ["character"], identityInheritance: false },
    trainingGrant: { operations: ["read-supplied-cases"], customerMutation: false, egress: ["qualification-bundle"] },
    competencies: nextCompetencies,
    assessmentLaw: { requiredWitnessKinds: ["independent-demonstration"], independentExaminer: true }
  });
  await appendRecord(value.root, nextRequest);
  const nextCurriculum = compileCurriculum({
    request: nextRequest.id,
    compiledAt: at(10),
    stages: ["independent-demonstration"],
    competencyMap: { "independent-demonstration": nextCompetencies },
    doctrineSources: [{ identity: "union-officer-academy/doctrine/management-thought-services", digest: evidence("management-thought-v2"), owner: "union-officer-academy", authorityClass: "current-law", admissionTerms: ["Academy-local educational use"] }],
    omissions: [], parents: [value.curriculum.id]
  });
  await appendRecord(value.root, nextCurriculum);
  const nextBaseline = establishBaseline({ request: nextRequest.id, curriculum: nextCurriculum.id, establishedAt: at(11), predecessors: [value.baseline.id] }, await readRecords(value.root));
  await appendRecord(value.root, nextBaseline);
  const gap = deriveRequalificationGap({ fromBaseline: value.baseline.id, toBaseline: nextBaseline.id, qualification: value.qualification.id, derivedAt: at(12) }, await readRecords(value.root));
  await appendRecord(value.root, gap);
  assert.deepEqual(gap.addedCompetencies, ["refuse-an-excess-grant"]);
  assert.equal(gap.changedOfficeFacts.includes("skills"), true);
  assert.equal(gap.fullRequalificationRequired, false);
  assert.equal((await readRecords(value.root)).some((record) => record.id === value.qualification.id), true);
});

test("provider and projector iteration opens a new formation epoch without pretending the office changed", async (t) => {
  const value = await fixture();
  t.after(() => rmSync(value.root, { recursive: true, force: true }));
  const successor = openCohort({
    baseline: value.baseline.id,
    openedAt: at(9),
    admissionEpoch: "executive-officer-formation-generation-2",
    exerciseRegimeDigest: evidence("executive-officer-exercises"),
    providers: [{ id: "leader-movement-team-practitioner", role: "current-practice", digest: evidence("practitioner-v2"), contract: "fixture/practitioner-contract-v2" }],
    projectors: [{ id: "installing-codex-as-an-agent", digest: evidence("codex-projector-v2"), contract: "fixture/projector-contract-v2" }],
    parents: [value.cohort.id]
  }, await readRecords(value.root));
  await appendRecord(value.root, successor);
  const gap = deriveFormationEpochGap({ fromCohort: value.cohort.id, toCohort: successor.id, derivedAt: at(10) }, await readRecords(value.root));
  await appendRecord(value.root, gap);
  assert.equal(gap.sameOfficeBaseline, true);
  assert.deepEqual(gap.changedComponents, ["providers", "projectors"]);
  assert.equal(gap.changedComponents.includes("officeDigest"), false);
  assert.equal(gap.automaticAdvancement, false);
});

test("doctrine authority, qualification status, and succession remain append-only evidence", async (t) => {
  const value = await fixture();
  t.after(() => rmSync(value.root, { recursive: true, force: true }));
  const doctrine = admitDoctrine({
    source: "emsenn/schema/incumbency",
    digest: evidence("incumbency-schema"),
    owner: "executive-office",
    authorityClass: "current-law",
    jurisdiction: "executive-office",
    useGrant: ["teach the character-to-office distinction", "cite exact digest"],
    reading: "binding-within-source-jurisdiction",
    admittedAt: at(9),
    reason: "receiver appointment law must constrain Academy qualification claims"
  });
  await appendRecord(value.root, doctrine);
  const status = recordQualificationStatus({ qualification: value.qualification.id, event: "suspension", recordedAt: at(10), issuer: "registrar-a", reason: "new contradictory performance evidence awaits examination", evidence: [evidence("contradiction")] }, await readRecords(value.root));
  await appendRecord(value.root, status);
  const succession = recordSuccessionExercise({ enrollment: value.enrollment.id, kind: "incumbent-handover", performedAt: at(11), openObligations: ["complete-resource-account"], contradictions: ["provider price remains unknown"], protectedContextTransfer: "receiver-controlled", witnesses: [evidence("handover")] }, await readRecords(value.root));
  await appendRecord(value.root, succession);
  const verified = await verifyNode(value.root);
  assert.equal(verified.byType.DoctrineAdmission, 1);
  assert.equal(verified.byType.QualificationStatusEvent, 1);
  assert.equal(verified.byType.SuccessionExercise, 1);
  assert.equal(status.conveysAuthority, false);
  assert.equal(succession.performsReceiverAct, false);
});

test("the Academy keeps its internal roster distinct from its formation product catalog", async () => {
  const result = await verifyAcademy();
  assert.equal(result.ok, true);
  assert.equal(result.offices, 5);
  assert.equal(result.institutionalObligations, result.offices);
  assert.equal(result.skills, 14);
  assert.equal(result.productTypes >= 7, true);
  assert.equal(result.doctrineAdmissions, 38);
});
