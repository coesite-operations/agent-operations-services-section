#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isNiUri as isCanonicalSha256NiUri } from "@red-cup-engineering/ni-services-section";
import { academySemanticRecordStore } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/semantic-records";
import { appendRecord, digest, readRecords, recordTraining, verifyNode } from "./academy.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const at = process.argv[2] ?? new Date().toISOString();
const activity = JSON.parse(readFileSync(0, "utf8"));
if (activity?.["@context"] !== "https://www.w3.org/ns/activitystreams" || activity.type !== "Offer" || activity.actor !== "urn:ame:leader-movement-team" || activity.target !== "urn:ame:union-officer-academy" || activity.object?.type !== "CustomerCapstonePracticumEvidence") throw new Error("ActivityStreams Offer<CustomerCapstonePracticumEvidence> from LMT is required");
const { receipt, receiptSemanticId, provisionalProjectionReceipt } = activity.object;
if (!isCanonicalSha256NiUri(receiptSemanticId)) throw new Error("capstone evidence lacks its canonical LMT semantic identity");
if (receipt?.type !== "ExecutiveOfficerUnionMapeCapstoneReceipt" || receipt.disposition !== "accepted" || !Object.values(receipt.checks ?? {}).every(Boolean)) throw new Error("receiver-accepted exact capstone receipt unresolved");
if (!receipt.mapeEvidence?.knowledge || !(receipt.targetDeliveryOutcomes ?? []).some((item) => item.invoked === true)) throw new Error("receipt lacks retained knowledge or actual target boundary delivery");
if (provisionalProjectionReceipt?.id !== receipt.provisionalProjection || provisionalProjectionReceipt.candidateAssemblyDigest !== receipt.candidateAssemblyDigest) throw new Error("capstone evidence lacks the exact customer-owned provisional projection receipt");
const records = await readRecords(ROOT);
const bundle = records.find((item) => item.type === "OfficeFormationBundle" && item.id === receipt.bundle && item.candidateAssembly);
if (!bundle || bundle.candidateAssembly.assemblyDigest !== receipt.candidateAssemblyDigest) throw new Error("receipt differs from Academy candidate assembly");
const artifact = {
  type: "CustomerPracticumPerformanceArtifact",
  enrollment: bundle.enrollment,
  bundle: bundle.id,
  candidateAssemblyDigest: bundle.candidateAssembly.assemblyDigest,
  stage: "independent-demonstration",
  witnessKind: "answerable-performance",
  caseIds: ["held-out-union-mape-capstone"],
  receiverReceipt: { id: receipt.id, semanticId: receiptSemanticId, disposition: receipt.disposition, mapeResult: receipt.mapeResult, provisionalProjection: receipt.provisionalProjection },
  admittedUnder: "admitting-leader-movement-team-capstone-evidence",
};
const event = recordTraining({
  enrollment: bundle.enrollment,
  bundle: bundle.id,
  candidateAssemblyDigest: bundle.candidateAssembly.assemblyDigest,
  producerIdentity: {
    office: "executive-officer-to-the-leader",
    characterDigest: bundle.candidateAssembly.layerBindings.character,
    runtimeSessionDigest: bundle.candidateAssembly.layerBindings.runtimeSession,
    agentRelationDigest: bundle.candidateAssembly.layerBindings.agentRelation,
    providerEngagement: receipt.provisionalProjection,
  },
  occurredAt: at,
  stage: "independent-demonstration",
  instructor: "leader-movement-team#executive-officer-to-the-leader",
  mentor: "union-officer-academy#formation-practitioner",
  competencies: ["prove-the-stitched-service-loop"],
  evidence: [{ kind: "receiver-owned-live-capstone", digest: digest(artifact), artifact }],
  outcome: "demonstrated",
  corrections: ["customer projection remained provisional and non-appointing", "qualification remains an independent Academy act after this evidence import"],
}, records);
const store = academySemanticRecordStore(ROOT);
await store.record({ category: "union-officer-academy.customer-capstone-receipt", recordedAt: at, record: { activity, receiptSemanticId, receipt, provisionalProjectionReceipt } });
await appendRecord(ROOT, event);
process.stdout.write(`${JSON.stringify({ type: "CustomerCapstonePracticumAdmission", receiverReceipt: receipt.id, trainingEvent: event.id, evidenceDigest: event.evidence[0].digest, verification: await verifyNode(ROOT) }, null, 2)}\n`);
