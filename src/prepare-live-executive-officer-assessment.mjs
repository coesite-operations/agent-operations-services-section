#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { academySemanticRecordStore } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/semantic-records";
import {
  appendRecord,
  commitAssessmentChallenge,
  compileOfficeFormationBundle,
  deriveFormationEpochGap,
  digest,
  enrollCandidate,
  readRecords,
} from "./academy.mjs";
import { currentFormationLianqun } from "@coesite-operations/rendanheyi-enterprise-services-section/formation-lianqun";
import { queryAcademySemanticContent } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/semantic-records";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const at = process.argv[2] ?? new Date().toISOString();
const rawDigest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const records = await readRecords(ROOT);
const demandAdmissions = await queryAcademySemanticContent("union-officer-academy.officer-formation-demand", { root: ROOT });
const currentDemand = demandAdmissions.sort((left, right) => left.receivedAt.localeCompare(right.receivedAt)).at(-1)?.demand;
if (currentDemand?.type !== "OfficerFormationDemand") throw new Error("no addressed OfficerFormationDemand has crossed the Academy admission boundary");
const caseBankPath = join(ROOT, "content/assessment-case-banks/executive-officer-to-the-leader.json");
const caseBank = JSON.parse(readFileSync(caseBankPath, "utf8"));
const caseBankDigest = rawDigest(readFileSync(caseBankPath));
const lianqunAgreement = currentFormationLianqun(ROOT);

const correctedTargets = new Set(records.filter((record) => record.type === "FormationRecordCorrection").map((record) => record.target));
const priorQualification = records.filter((record) => record.type === "Qualification" && record.candidate.id === currentDemand.candidate.id)
  .sort((left, right) => Date.parse(left.issuedAt) - Date.parse(right.issuedAt) || left.id.localeCompare(right.id)).at(-1);
if (!priorQualification) throw new Error("the successor formation epoch requires an exact prior qualification bridge");
const priorBundle = records.find((record) => record.type === "OfficeFormationBundle" && record.enrollment === priorQualification.enrollment && record.baseline === priorQualification.baseline);
const priorCohort = records.find((record) => record.type === "Cohort" && record.id === priorBundle?.cohort);
if (!priorBundle || !priorCohort) throw new Error("the prior qualification does not resolve to its exact cohort");
const currentBundles = records.filter((record) => {
  if (record.type !== "OfficeFormationBundle" || !record.candidateAssembly || record.candidate.id !== currentDemand.candidate.id || correctedTargets.has(record.id)) return false;
  const cohort = records.find((item) => item.type === "Cohort" && item.id === record.cohort);
  const baseline = records.find((item) => item.type === "FormationBaseline" && item.id === record.baseline);
  return baseline?.office.digest === currentDemand.office.digest
    && record.candidateAssembly.harnessDigest === currentDemand.candidate.harnessDigest
    && cohort?.bridgeFrom === priorCohort.id
    && lianqunAgreement.parties.every((id) => cohort.formationConfiguration.providers.some((provider) => provider.id === id && provider.contract === lianqunAgreement.id && provider.serviceConfigurationDigest === lianqunAgreement.providerConfigurations[id]));
}).sort((left, right) => Date.parse(left.compiledAt) - Date.parse(right.compiledAt) || left.id.localeCompare(right.id));
const bundle = currentBundles.at(-1);
const cohort = records.find((record) => record.type === "Cohort" && record.id === bundle?.cohort);
const enrollment = records.find((record) => record.type === "Enrollment" && record.id === bundle?.enrollment);
if (!bundle || !cohort || !enrollment) throw new Error("the current contract-formed EO bundle is absent; invoke the Academy formation contract first");
let epochGap = records.find((record) => record.type === "FormationEpochGap" && record.fromCohort === priorCohort.id && record.toCohort === cohort.id);
if (!epochGap) {
  epochGap = deriveFormationEpochGap({ fromCohort: priorCohort.id, toCohort: cohort.id, derivedAt: at }, records);
  await appendRecord(ROOT, epochGap); records.push(epochGap);
}

const controlCandidate = {
  ...currentDemand.candidate,
  id: "codex-interactive-session-blank-control",
  identityDigest: digest({ control: "blank", model: currentDemand.candidate.model, harness: currentDemand.candidate.harnessDigest }),
  layerBindings: {
    ...currentDemand.candidate.layerBindings,
    character: digest({ control: "blank-character" }),
    runtimeSession: digest({ control: "blank-runtime" }),
    agentRelation: digest({ control: "blank-agent-relation" }),
  },
};
const controlEnrollment = enrollCandidate({ cohort: cohort.id, admittedAt: at, candidate: controlCandidate }, records);
await appendRecord(ROOT, controlEnrollment); records.push(controlEnrollment);
const controlBundle = compileOfficeFormationBundle({
  enrollment: controlEnrollment.id,
  compiledAt: at,
  dispositionDigest: bundle.characterFormation.dispositionDigest,
  personaDigest: digest({ control: "blank-persona" }),
  materials: bundle.contextPlan.materials,
  omissions: [],
  carriers: bundle.contextPlan.carriers,
  exercisePackDigest: bundle.exercisePackDigest,
  engagementRoles: bundle.engagementRoles,
  projectionPlan: bundle.projectionPlan,
}, records);
await appendRecord(ROOT, controlBundle); records.push(controlBundle);

const cases = caseBank.cases.map((item) => item.id);
const secrets = [];
for (const [kind, targetEnrollment, targetBundle] of [["formed", enrollment, bundle], ["blank-control", controlEnrollment, controlBundle]]) {
  const nonce = randomBytes(24).toString("hex");
  const commitment = commitAssessmentChallenge({
    enrollment: targetEnrollment.id,
    bundle: targetBundle.id,
    committedAt: at,
    committedBy: "union-officer-academy#independent-examiner",
    caseBankDigest,
    selectionCommitment: digest({ cases, nonce, caseBankDigest }),
  }, records);
  await appendRecord(ROOT, commitment); records.push(commitment);
  secrets.push({ kind, commitment: commitment.id, nonce, cases, caseBankDigest });
}

const settlementStore = academySemanticRecordStore(ROOT);
for (const secret of secrets) await settlementStore.record({ category: "union-officer-academy.assessment-secret", recordedAt: at, record: { ...secret, recordedAt: at, access: "independent-examiner-only-until-output-sealed" } });

process.stdout.write(`${JSON.stringify({
  type: "LiveExecutiveOfficerAssessmentPacket",
  cohort: cohort.id,
  formationEpochGap: epochGap.id,
  formed: { enrollment: enrollment.id, bundle: bundle.id, commitment: secrets[0].commitment },
  control: { enrollment: controlEnrollment.id, bundle: controlBundle.id, commitment: secrets[1].commitment },
  caseBank: { id: caseBank.id, digest: caseBankDigest, instructions: caseBank.candidateInstructions, cases: caseBank.cases },
  concealment: "nonce and oracle remain in the examiner-owned secret journal until output is sealed",
}, null, 2)}\n`);
