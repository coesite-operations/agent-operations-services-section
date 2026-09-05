#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { queryAcademySemanticContent } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/semantic-records";
import { appendRecord, readRecords, revealAssessmentChallenge, verifyNode } from "./academy.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const at = process.argv[2] ?? new Date().toISOString();
const cohortId = process.argv[3];
if (!cohortId) throw new TypeError("independent examiner must supply the exact cohort id");
const records = await readRecords(ROOT);
const caseBank = JSON.parse(readFileSync(join(ROOT, "content/assessment-case-banks/executive-officer-to-the-leader.json"), "utf8"));
const cases = caseBank.cases.map((item) => item.id);
const secrets = await queryAcademySemanticContent("union-officer-academy.assessment-secret", { root: ROOT });
const enrollments = records.filter((record) => record.type === "Enrollment" && record.cohort === cohortId);
const reveals = [];
for (const enrollment of enrollments) {
  const bundle = records.find((record) => record.type === "OfficeFormationBundle" && record.enrollment === enrollment.id && record.candidateAssembly);
  const commitment = records.find((record) => record.type === "AssessmentChallengeCommitment" && record.enrollment === enrollment.id && record.bundle === bundle?.id);
  if (!bundle || !commitment || records.some((record) => record.type === "AssessmentChallengeReveal" && record.commitment === commitment.id)) continue;
  const secret = secrets.find((item) => item.commitment === commitment.id);
  if (!secret) throw new Error(`examiner-local secret missing for ${commitment.id}`);
  const training = records.filter((record) => record.type === "TrainingEvent" && record.enrollment === enrollment.id);
  const selected = enrollment.candidate.id.includes("blank-control") ? training[0] : training.find((record) => record.stage === "independent-demonstration");
  if (!selected?.evidence?.[0]) throw new Error(`sealed candidate artifact missing for ${enrollment.id}`);
  const reveal = revealAssessmentChallenge({ commitment: commitment.id, revealedAt: at, cases, nonce: secret.nonce, candidateArtifactDigest: selected.evidence[0].digest }, records);
  await appendRecord(ROOT, reveal); records.push(reveal); reveals.push(reveal.id);
}
process.stdout.write(`${JSON.stringify({ type: "IndependentChallengeReveals", cohort: cohortId, reveals, performedBy: "union-officer-academy#independent-examiner", verification: await verifyNode(ROOT) }, null, 2)}\n`);
