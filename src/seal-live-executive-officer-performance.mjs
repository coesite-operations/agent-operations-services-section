#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { academySemanticRecordStore } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/semantic-records";
import {
  appendRecord,
  digest,
  readRecords,
  recordTraining,
  verifyNode,
} from "./academy.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const at = process.argv[2] ?? new Date().toISOString();
const pair = JSON.parse(readFileSync(0, "utf8"));
if (pair?.type !== "CandidatePerformancePair") throw new Error("stdin must carry one exact CandidatePerformancePair");
const formedSubmission = pair.formed;
const controlSubmission = pair.control;
if (formedSubmission?.type !== "CandidatePerformanceSubmission" || controlSubmission?.type !== "CandidatePerformanceSubmission") throw new Error("performance pair requires formed and control CandidatePerformanceSubmission values");
const records = await readRecords(ROOT);
const caseBank = JSON.parse(readFileSync(join(ROOT, "content/assessment-case-banks/executive-officer-to-the-leader.json"), "utf8"));
const cases = caseBank.cases.map((item) => item.id);
const bundle = records.find((record) => record.id === formedSubmission.bundle && record.type === "OfficeFormationBundle");
if (!bundle || bundle.enrollment !== formedSubmission.enrollment) throw new Error("formed submission is not bound to the live enrollment and bundle");
if (formedSubmission.candidateAssemblyDigest !== bundle.candidateAssembly.assemblyDigest) throw new Error("formed submission changed the candidate assembly");
const responseIds = new Set((formedSubmission.responses ?? []).map((response) => response.caseId ?? response.case ?? response.id));
if (!cases.every((id) => responseIds.has(id)) || responseIds.size !== cases.length) throw new Error("formed submission does not answer the exact committed case bank");
const controlResponseIds = new Set((controlSubmission.responses ?? []).map((response) => response.caseId ?? response.case ?? response.id));
if (!cases.every((id) => controlResponseIds.has(id)) || controlResponseIds.size !== cases.length) throw new Error("blank control does not answer the exact same committed case bank");
const stages = caseBank.requiredStagePerformances;
const stagePerformances = formedSubmission.stagePerformances ?? [];
if (stagePerformances.length !== stages.length || new Set(stagePerformances.map((item) => item.stage)).size !== stages.length || !stages.every((stage) => stagePerformances.some((item) => item.stage === stage))) throw new Error("formed submission does not contain seven distinct required stage performances");
for (const performance of stagePerformances) {
  if (!Array.isArray(performance.caseIds) || performance.caseIds.length === 0 || !performance.caseIds.every((id) => cases.includes(id))) throw new Error(`stage ${performance.stage} does not bind exact admitted cases`);
  for (const field of ["purpose", "producedArtifact", "learning", "refusalBoundary"]) if (typeof performance[field] !== "string" || performance[field].length === 0) throw new Error(`stage ${performance.stage} lacks ${field}`);
}
if (new Set(stagePerformances.flatMap((item) => item.caseIds)).size !== cases.length || !cases.every((id) => stagePerformances.some((item) => item.caseIds.includes(id)))) throw new Error("stage performances do not collectively cover the exact case denominator");
const binding = (formedSubmission.responses ?? []).find((response) => (response.caseId ?? response.case ?? response.id) === "bundle-configuration-binding");
const serializedBinding = JSON.stringify(binding ?? {});
for (const expected of [bundle.formationConfigurationDigest, bundle.projectionPlan.projectorDigest, String(bundle.contextPlan.denominatorCount)]) {
  if (!serializedBinding.includes(expected)) throw new Error(`formed submission failed bundle-only changed-capability fact ${expected}`);
}
const controlBinding = (controlSubmission.responses ?? []).find((response) => (response.caseId ?? response.case ?? response.id) === "bundle-configuration-binding");
const controlText = JSON.stringify(controlBinding ?? {});
if (controlText.includes(bundle.formationConfigurationDigest) || controlText.includes(bundle.projectionPlan.projectorDigest)) throw new Error("blank control unexpectedly knew Academy bundle-only facts");
if (!/refus|unknown|unavailable|cannot|do not know/iu.test(controlText)) throw new Error("blank control guessed instead of refusing unavailable bundle facts");

const controlEnrollment = records.find((record) => record.type === "Enrollment" && record.candidate.id === "codex-interactive-session-blank-control" && record.cohort === bundle.cohort);
const controlBundle = records.find((record) => record.type === "OfficeFormationBundle" && record.enrollment === controlEnrollment?.id && record.candidateAssembly);
if (!controlEnrollment || !controlBundle) throw new Error("blank control enrollment or bundle is absent");
const formedCommitment = records.find((record) => record.type === "AssessmentChallengeCommitment" && record.enrollment === bundle.enrollment && record.bundle === bundle.id);
const controlCommitment = records.find((record) => record.type === "AssessmentChallengeCommitment" && record.enrollment === controlEnrollment.id && record.bundle === controlBundle.id);
if (!formedCommitment || !controlCommitment) throw new Error("sealed challenge commitments are absent");
const submissionStore = academySemanticRecordStore(ROOT);
await submissionStore.record({ category: "union-officer-academy.candidate-performance-submission", recordedAt: at, record: formedSubmission });
await submissionStore.record({ category: "union-officer-academy.candidate-performance-submission", recordedAt: at, record: controlSubmission });

const trainerIdentity = {
  office: "formation-practitioner",
  characterDigest: digest({ office: "formation-practitioner", cohort: bundle.cohort }),
  runtimeSessionDigest: digest({ runtime: "formation-practitioner", cohort: bundle.cohort, occurredAt: at }),
  agentRelationDigest: digest({ office: "formation-practitioner", cohort: bundle.cohort, engagement: "live-eo-successor-cohort" }),
  providerEngagement: `union-officer-academy-live-eo-formation-practice:${bundle.cohort}`,
};
const baseline = records.find((record) => record.id === bundle.baseline);
const kinds = ["answerable-performance", "negative-control", "answerable-performance", "answerable-performance", "answerable-performance", "answerable-performance", "succession-handoff"];
const formedEvents = [];
for (const [index, stage] of stages.entries()) {
  const stagePerformance = stagePerformances.find((item) => item.stage === stage);
  const artifact = {
    type: "AnswerablePerformanceArtifact",
    enrollment: bundle.enrollment,
    bundle: bundle.id,
    candidateAssemblyDigest: bundle.candidateAssembly.assemblyDigest,
    caseIds: stagePerformance.caseIds,
    witnessKind: kinds[index],
    stage,
    performance: stagePerformance,
    responseEvidence: formedSubmission.responses.filter((response) => stagePerformance.caseIds.includes(response.caseId ?? response.case ?? response.id)),
  };
  const event = recordTraining({
    enrollment: bundle.enrollment,
    bundle: bundle.id,
    candidateAssemblyDigest: bundle.candidateAssembly.assemblyDigest,
    producerIdentity: trainerIdentity,
    occurredAt: at,
    stage,
    instructor: "union-officer-academy#formation-practitioner",
    mentor: "leader-movement-team#executive-officer-to-the-leader",
    competencies: baseline.competencies,
    evidence: [{ kind: "resolvable-candidate-performance", digest: digest(artifact), artifact }],
    outcome: "demonstrated",
    corrections: ["unavailable resource quantities remain unavailable, not zero", "held-out capstone remains deferred until qualification and customer projection"],
  }, records);
  await appendRecord(ROOT, event); records.push(event); formedEvents.push(event);
}

const controlArtifact = {
  type: "AnswerablePerformanceArtifact",
  enrollment: controlEnrollment.id,
  bundle: controlBundle.id,
  candidateAssemblyDigest: controlBundle.candidateAssembly.assemblyDigest,
  caseIds: cases,
  witnessKind: "negative-control",
  stage: "independent-demonstration",
  submission: controlSubmission,
};
const controlEvent = recordTraining({
  enrollment: controlEnrollment.id,
  bundle: controlBundle.id,
  candidateAssemblyDigest: controlBundle.candidateAssembly.assemblyDigest,
  producerIdentity: trainerIdentity,
  occurredAt: at,
  stage: "independent-demonstration",
  instructor: "union-officer-academy#formation-practitioner",
  mentor: "leader-movement-team#executive-officer-to-the-leader",
  competencies: baseline.competencies,
  evidence: [{ kind: "resolvable-blank-control-performance", digest: digest(controlArtifact), artifact: controlArtifact }],
  outcome: "not-demonstrated",
  corrections: ["control was not given the OfficeFormationBundle"],
}, records);
await appendRecord(ROOT, controlEvent); records.push(controlEvent);

process.stdout.write(`${JSON.stringify({
  type: "SealedLiveExecutiveOfficerPerformances",
  formed: { enrollment: bundle.enrollment, bundle: bundle.id, commitment: formedCommitment.id, events: formedEvents.map((event) => event.id), evidence: formedEvents.map((event) => event.evidence[0].digest) },
  control: { enrollment: controlEnrollment.id, bundle: controlBundle.id, commitment: controlCommitment.id, event: controlEvent.id, evidence: controlEvent.evidence[0].digest },
  nextAct: "independent-examiner reveals the committed selection from its own secret journal after these artifacts are sealed",
  territoryMutation: { academy: "append-only own records", customer: false },
  verification: await verifyNode(ROOT),
}, null, 2)}\n`);
