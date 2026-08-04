#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { queryAcademySemanticContent } from "@union-officer-academy/formation-lianqun-member-runtime-service/semantic-records";
import { contentId, readRecords } from "./academy.mjs";

const CONTEXT = "https://www.w3.org/ns/activitystreams";
const ACTOR = "urn:ame:union-officer-academy";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function reply(type, request, object) {
  return { "@context": CONTEXT, id: contentId({ actor: ACTOR, type, inReplyTo: request?.id ?? null, object }), type, actor: ACTOR, target: request?.actor ?? "urn:actor:unidentified", inReplyTo: request?.id ?? "urn:activity:unidentified", object };
}

export async function resolveFormationEvidence(request, root = ROOT) {
  const query = request?.object;
  if (request?.["@context"] !== CONTEXT || request.type !== "Question" || request.target !== ACTOR || query?.type !== "FormationEvidenceQuery") return reply("Reject", request, { type: "Refusal", code: "E_QUERY", reason: "ActivityStreams Question<FormationEvidenceQuery> addressed to the Academy is required" });
  const records = await readRecords(root);
  const qualification = query.qualification ? records.find((item) => item.type === "Qualification" && item.id === query.qualification) : null;
  const assessmentId = query.assessment ?? qualification?.assessment;
  const assessment = records.find((item) => item.type === "Assessment" && item.id === assessmentId);
  const bundleId = query.bundle ?? assessment?.bundle;
  const bundle = records.find((item) => item.type === "OfficeFormationBundle" && item.id === bundleId && item.candidateAssembly);
  const cohort = records.find((item) => item.type === "Cohort" && item.id === bundle?.cohort);
  const controlAssessment = records.find((item) => item.type === "Assessment" && item.id === assessment?.controlAssessment);
  const agreementId = [...new Set((cohort?.formationConfiguration?.providers ?? []).map((provider) => provider.contract).filter((contract) => typeof contract === "string" && contract.startsWith("urn:sha256:")))].at(0);
  const agreement = (await queryAcademySemanticContent("union-officer-academy.formation-lianqun-agreement", { root })).find((item) => item.id === agreementId);
  if (!bundle || !cohort || (query.assessment && !assessment) || (query.qualification && (!qualification || !assessment))) return reply("Reject", request, { type: "Refusal", code: "E_UNRESOLVED", reason: "the exact requested formation evidence chain is unresolved" });
  const witnessDigests = new Set([...(assessment?.witnesses ?? []), ...(controlAssessment?.witnesses ?? [])]);
  const training = query.includeTraining === true ? records.filter((item) => item.type === "TrainingEvent"
    && [assessment?.enrollment, controlAssessment?.enrollment].includes(item.enrollment)
    && item.evidence.some((evidence) => witnessDigests.has(evidence.digest))) : undefined;
  return reply("Create", request, { type: "FormationEvidenceBundle", qualification, assessment: assessment ?? null, bundle, cohort, agreement: agreement ?? null, ...(controlAssessment ? { controlAssessment } : {}), ...(training ? { training } : {}), interiorDisclosed: false });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await resolveFormationEvidence(JSON.parse(readFileSync(0, "utf8")));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.type === "Reject") process.exitCode = 2;
}
