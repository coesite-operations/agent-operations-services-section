#!/usr/bin/env node
import { join, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { academySemanticRecordStore } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/semantic-records";
import { appendRecords, digest, readRecords, recordAssessment, verifyNode } from "./academy.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function arg(name) { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; }
const cohortId = arg("--cohort"), predecessorQualificationId = arg("--predecessor-qualification"), at = arg("--now") ?? new Date().toISOString();
if (!cohortId || !predecessorQualificationId) throw new TypeError("--cohort and --predecessor-qualification are required");
const records = await readRecords(ROOT);
const predecessorQualification = records.find((record) => record.type === "Qualification" && record.id === predecessorQualificationId);
const predecessorFinal = records.find((record) => record.type === "Assessment" && record.id === predecessorQualification?.assessment);
const predecessorFormed = records.filter((record) => record.type === "Assessment" && record.enrollment === predecessorFinal?.enrollment && record.disposition === "gaps")
  .sort((left, right) => Date.parse(left.assessedAt) - Date.parse(right.assessedAt) || left.id.localeCompare(right.id)).at(-1);
const predecessorControl = records.find((record) => record.type === "Assessment" && record.id === predecessorFinal?.controlAssessment);
if (!predecessorQualification || !predecessorFinal || !predecessorFormed || !predecessorControl) throw new Error("the predecessor qualification does not resolve to independently examined formed and control assessments");
if (predecessorFormed.coverage.filter((item) => item.result !== "demonstrated").map((item) => item.competency).join(",") !== "prove-the-stitched-service-loop") throw new Error("predecessor behavior is not the admitted one-gap pre-capstone state");

const enrollments = records.filter((record) => record.type === "Enrollment" && record.cohort === cohortId);
const formedEnrollment = enrollments.find((record) => record.candidate.id === predecessorQualification.candidate.id);
const controlEnrollment = enrollments.find((record) => record.candidate.id.includes("blank-control"));
const bundleFor = (enrollment) => records.find((record) => record.type === "OfficeFormationBundle" && record.enrollment === enrollment?.id && record.candidateAssembly);
const formedBundle = bundleFor(formedEnrollment), controlBundle = bundleFor(controlEnrollment);
if (!formedEnrollment || !controlEnrollment || !formedBundle || !controlBundle) throw new Error("current formed/control enrollment and bundle pair is unresolved");
const revealFor = (enrollment, bundle) => {
  const commitment = records.find((record) => record.type === "AssessmentChallengeCommitment" && record.enrollment === enrollment.id && record.bundle === bundle.id);
  return records.find((record) => record.type === "AssessmentChallengeReveal" && record.commitment === commitment?.id);
};
const formedReveal = revealFor(formedEnrollment, formedBundle), controlReveal = revealFor(controlEnrollment, controlBundle);
if (!formedReveal || !controlReveal) throw new Error("independent challenge reveals are unresolved");

function witnessMap(priorAssessment, currentEnrollment) {
  const prior = new Set(priorAssessment.witnesses), mapping = new Map();
  const priorEvents = records.filter((record) => record.type === "TrainingEvent" && record.enrollment === priorAssessment.enrollment);
  const currentEvents = records.filter((record) => record.type === "TrainingEvent" && record.enrollment === currentEnrollment.id);
  for (const event of priorEvents) for (const evidence of event.evidence) if (prior.has(evidence.digest)) {
    const current = currentEvents.find((candidate) => candidate.stage === event.stage && candidate.evidence.some((item) => item.kind === evidence.kind));
    if (!current) throw new Error(`current ${event.stage} witness corresponding to ${evidence.digest} is absent`);
    mapping.set(evidence.digest, current.evidence.find((item) => item.kind === evidence.kind).digest);
  }
  if ([...prior].some((digestValue) => !mapping.has(digestValue))) throw new Error("not every predecessor witness has a current stage refinement");
  return mapping;
}
function refineCoverage(priorAssessment, mapping) {
  return priorAssessment.coverage.map((item) => ({
    ...item,
    ...(item.witnessDigests ? { witnessDigests: item.witnessDigests.map((value) => {
      const current = mapping.get(value); if (!current) throw new Error(`coverage witness ${value} has no current refinement`); return current;
    }) } : {}),
  }));
}
const controlMap = witnessMap(predecessorControl, controlEnrollment), formedMap = witnessMap(predecessorFormed, formedEnrollment);
const examinerIdentity = {
  office: "independent-examination-xiaowei",
  characterDigest: digest({ office: "independent-examination-xiaowei", cohort: cohortId }),
  runtimeSessionDigest: digest({ operation: "refinement-examination", cohort: cohortId, at }),
  agentRelationDigest: digest({ predecessorQualification: predecessorQualificationId, cohort: cohortId, at }),
  providerEngagement: `formation-lianqun-independent-examination:${cohortId}`,
};
const controlAssessment = recordAssessment({
  enrollment: controlEnrollment.id, assessedAt: at, assessor: "union-officer-academy#independent-examiner", bundle: controlBundle.id,
  challengeReveal: controlReveal.id, examinerIdentity, coverage: refineCoverage(predecessorControl, controlMap), witnesses: [...controlMap.values()], disposition: "gaps",
  limitations: [...predecessorControl.limitations, `predecessor judgment ${predecessorControl.id} refined through current stage witnesses; qualification is not inherited`],
}, records);
records.push(controlAssessment);
const formedAssessment = recordAssessment({
  enrollment: formedEnrollment.id, assessedAt: at, assessor: "union-officer-academy#independent-examiner", bundle: formedBundle.id,
  challengeReveal: formedReveal.id, examinerIdentity, coverage: refineCoverage(predecessorFormed, formedMap), witnesses: [...formedMap.values()], disposition: "gaps", controlAssessment: controlAssessment.id,
  limitations: [...predecessorFormed.limitations, `predecessor judgment ${predecessorFormed.id} refined through current stage witnesses`, "the stitched-loop competency remains open until a new receiver-owned capstone closes it"],
}, records);
await appendRecords(ROOT, [controlAssessment, formedAssessment]);
const report = {
  type: "IndependentRefinementExamination",
  id: `urn:${digest({ predecessorQualification: predecessorQualificationId, cohort: cohortId, controlAssessment: controlAssessment.id, formedAssessment: formedAssessment.id })}`,
  predecessorQualification: predecessorQualificationId, cohort: cohortId, examinedAt: at,
  formed: { enrollment: formedEnrollment.id, bundle: formedBundle.id, reveal: formedReveal.id, assessment: formedAssessment.id, witnessRefinements: Object.fromEntries(formedMap) },
  control: { enrollment: controlEnrollment.id, bundle: controlBundle.id, reveal: controlReveal.id, assessment: controlAssessment.id, witnessRefinements: Object.fromEntries(controlMap) },
  disposition: "gaps", openCompetencies: ["prove-the-stitched-service-loop"], qualificationInherited: false,
};
const store = academySemanticRecordStore(ROOT);
await store.record({ category: "union-officer-academy.examination-report-admission", recordedAt: at, record: report });
process.stdout.write(`${JSON.stringify({ report, verification: await verifyNode(ROOT) }, null, 2)}\n`);
