#!/usr/bin/env node
import { join, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { academySemanticRecordStore } from "@union-officer-academy/formation-lianqun-member-runtime-service/semantic-records";
import {
  appendRecords,
  digest,
  issueQualification,
  readRecords,
  recordAssessment,
  recordQualificationStatus,
  verifyNode,
} from "./academy.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function arg(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

const cohortId = arg("--cohort");
const preCapstoneAssessmentId = arg("--pre-capstone-assessment");
const capstoneReceiptId = arg("--capstone-receipt");
const predecessorQualificationId = arg("--predecessor-qualification");
const at = arg("--now") ?? new Date().toISOString();
if (!cohortId || !preCapstoneAssessmentId || !capstoneReceiptId || !predecessorQualificationId) {
  throw new TypeError("--cohort, --pre-capstone-assessment, --capstone-receipt, and --predecessor-qualification are required");
}

const records = await readRecords(ROOT);
const predecessorQualification = records.find((record) => record.type === "Qualification" && record.id === predecessorQualificationId);
const preCapstone = records.find((record) => record.type === "Assessment" && record.id === preCapstoneAssessmentId);
const enrollment = records.find((record) => record.type === "Enrollment" && record.id === preCapstone?.enrollment && record.cohort === cohortId);
const bundle = records.find((record) => record.type === "OfficeFormationBundle" && record.id === preCapstone?.bundle && record.enrollment === enrollment?.id && record.candidateAssembly);
const controlAssessment = records.find((record) => record.type === "Assessment" && record.id === preCapstone?.controlAssessment);
if (!predecessorQualification) throw new Error("the exact predecessor qualification is unresolved");
if (!preCapstone || preCapstone.disposition !== "gaps") throw new Error("the exact independently examined pre-capstone assessment is unresolved");
if (!enrollment || !bundle) throw new Error("the pre-capstone assessment is not bound to the exact current cohort and candidate assembly");
if (!controlAssessment || controlAssessment.disposition !== "gaps" || controlAssessment.baseline !== preCapstone.baseline) throw new Error("same-baseline independently examined control assessment is unresolved");

const gaps = preCapstone.coverage.filter((item) => item.result !== "demonstrated");
if (gaps.length !== 1 || gaps[0].competency !== "prove-the-stitched-service-loop") {
  throw new Error("the admitted pre-capstone judgment is not the exact one-gap state");
}

const capstoneEvent = records.find((record) => record.type === "TrainingEvent"
  && record.enrollment === enrollment.id
  && record.bundle === bundle.id
  && record.evidence.some((evidence) => evidence.kind === "receiver-owned-live-capstone" && evidence.artifact?.receiverReceipt?.id === capstoneReceiptId));
const capstoneEvidence = capstoneEvent?.evidence.find((evidence) => evidence.kind === "receiver-owned-live-capstone" && evidence.artifact?.receiverReceipt?.id === capstoneReceiptId);
if (!capstoneEvent || capstoneEvent.outcome !== "demonstrated" || !capstoneEvidence || capstoneEvidence.artifact.receiverReceipt.disposition !== "accepted") {
  throw new Error("receiver-owned capstone performance is unresolved");
}

const coverage = preCapstone.coverage.map((item) => item.competency === "prove-the-stitched-service-loop"
  ? { competency: item.competency, result: "demonstrated", witnessDigests: [capstoneEvidence.digest] }
  : item);
const witnesses = [...new Set([...preCapstone.witnesses, capstoneEvidence.digest])];
const examinerIdentity = {
  office: preCapstone.examinerIdentity.office,
  characterDigest: preCapstone.examinerIdentity.characterDigest,
  runtimeSessionDigest: digest({ operation: "capstone-final-examination", cohort: cohortId, preCapstoneAssessment: preCapstone.id, capstoneReceipt: capstoneReceiptId, at }),
  agentRelationDigest: digest({ provider: preCapstone.examinerIdentity.providerEngagement, cohort: cohortId, capstoneEvent: capstoneEvent.id, at }),
  providerEngagement: preCapstone.examinerIdentity.providerEngagement,
};
const assessment = recordAssessment({
  enrollment: enrollment.id,
  assessedAt: at,
  assessor: "union-officer-academy#independent-examiner",
  bundle: bundle.id,
  challengeReveal: preCapstone.challengeReveal,
  examinerIdentity,
  coverage,
  witnesses,
  disposition: "qualified",
  controlAssessment: controlAssessment.id,
  limitations: [
    ...preCapstone.limitations,
    `pre-capstone independent judgment ${preCapstone.id} retained without reinterpretation`,
    `receiver-owned capstone evidence ${capstoneEvidence.digest} closes only prove-the-stitched-service-loop`,
    `receiver capstone receipt ${capstoneReceiptId} proves performance but conveys no appointment`,
  ],
}, records);
records.push(assessment);
const qualification = issueQualification({
  assessment: assessment.id,
  issuedAt: at,
  issuer: "union-officer-academy#registrar",
  limitations: [
    "qualification conveys no customer authority or incumbency",
    "valid only for the exact candidate assembly and formation configuration",
    "material drift opens requalification",
  ],
  supersedes: predecessorQualification.id,
}, records);
records.push(qualification);
const supersession = recordQualificationStatus({
  qualification: predecessorQualification.id,
  event: "supersession",
  recordedAt: at,
  issuer: "union-officer-academy#registrar",
  reason: "a successor cohort independently qualified the current candidate assembly, harness, and provider configuration",
  evidence: [digest({ preCapstoneAssessment: preCapstone.id, capstoneEvidence: capstoneEvidence.digest }), bundle.candidateAssembly.assemblyDigest],
  successorQualification: qualification.id,
}, records);

await appendRecords(ROOT, [assessment, qualification, supersession]);
const admission = {
  type: "FinalIndependentExaminationAdmission",
  id: `urn:${digest({ cohort: cohortId, preCapstoneAssessment: preCapstone.id, capstoneEvent: capstoneEvent.id, assessment: assessment.id, qualification: qualification.id })}`,
  cohort: cohortId,
  admittedAt: at,
  predecessorQualification: predecessorQualification.id,
  preCapstoneAssessment: preCapstone.id,
  capstoneEvent: capstoneEvent.id,
  capstoneEvidence: capstoneEvidence.digest,
  capstoneReceipt: capstoneReceiptId,
  assessment: assessment.id,
  qualification: qualification.id,
  supersession: supersession.id,
  reportCarrier: "derived-from-admitted-witness-journal-evidence",
  independentJudgmentInherited: false,
};
const store = academySemanticRecordStore(ROOT);
await store.record({ category: "union-officer-academy.examination-report-admission", recordedAt: at, record: admission });
process.stdout.write(`${JSON.stringify({ admission: admission.id, assessment: assessment.id, qualification: qualification.id, supersession: supersession.id, supersedes: predecessorQualification.id, controlAssessment: controlAssessment.id, capstoneReceipt: capstoneReceiptId, verification: await verifyNode(ROOT) }, null, 2)}\n`);
