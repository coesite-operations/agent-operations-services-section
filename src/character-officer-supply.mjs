#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { queryAcademySemanticContent, recordAcademySemanticContent } from "@union-officer-academy/formation-lianqun-member-runtime-service/semantic-records";
import { diskSettlementAccount, readRecords } from "./academy.mjs";
import { ACADEMY_ROOT, rawDigest } from "./professional-repertoire.mjs";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

function digest(value) { return `sha256:${createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")}`; }
function json(path) { return JSON.parse(readFileSync(path, "utf8")); }

async function qualificationById(root, id) {
  return (await readRecords(root)).find((record) => record.type === "Qualification" && record.id === id);
}

async function qualificationIsCurrent(root, id) {
  const events = (await readRecords(root)).filter((record) => record.type === "QualificationStatusEvent");
  const statuses = events.filter((event) => event.qualification === id).sort((a, b) => String(a.recordedAt ?? a.at).localeCompare(String(b.recordedAt ?? b.at)));
  return !statuses.length || !["supersession", "revocation"].includes(statuses.at(-1).event);
}

export function verifyMarketAward(demand) {
  const lotActivity = demand?.procurement?.lot;
  const bidActivity = demand?.procurement?.bid;
  const awardActivity = demand?.procurement?.award;
  const lot = lotActivity?.object, bid = bidActivity?.object, award = awardActivity?.object;
  if (lotActivity?.type !== "Offer" || lot?.type !== "OfficerSupplyLot" || lotActivity.actor !== demand.receiver || lot.issuer !== demand.receiver) throw new Error("character supply requires the receiver's OfficerSupplyLot");
  if (lot.providerNeutral !== true || lot.selectedProvider !== null || lot.office?.id !== demand.office.id || lot.office?.digest !== demand.office.digest) throw new Error("officer-supply lot is not provider-neutral or does not bind the requested office");
  if (bidActivity?.type !== "Offer" || bidActivity.actor !== "union-officer-academy" || bid?.type !== "AcademyOfficerSupplyBid" || bid.bidder !== "union-officer-academy") throw new Error("character supply requires an Academy-authored market bid");
  if (bidActivity.inReplyTo !== lotActivity.id || bid.lot !== lot.id || bid.receiver !== demand.receiver || bid.office?.digest !== demand.office.digest) throw new Error("Academy bid does not answer the receiver's exact lot");
  if (demand.character && bid.characterCandidate !== demand.character) throw new Error("awarded Academy bid names a different character candidate");
  if (awardActivity?.type !== "Accept" || awardActivity.actor !== demand.receiver || awardActivity.target !== "union-officer-academy" || award?.type !== "OfficerSupplyAward") throw new Error("character supply requires a receiver-authored Academy award");
  if (awardActivity.inReplyTo !== bidActivity.id || award.lot !== lot.id || award.bid !== bid.id || award.provider !== "union-officer-academy") throw new Error("receiver award does not bind the exact lot and Academy bid");
  if (award.contract?.provider !== "union-officer-academy" || award.contract?.consumer !== demand.receiver || award.contract?.admittedByReceiver !== true || award.contract?.lot !== lot.id || award.contract?.bid !== bid.id) throw new Error("receiver award lacks a matching admitted Academy contract");
  if (award.conveysRecognition !== false || award.conveysInduction !== false || award.conveysIncumbency !== false) throw new Error("market award may not convey officer incumbency");
  return { lot: lot.id, bid: bid.id, award: award.id, contract: award.contract.id };
}

export async function solicitCharacter(demand, root = ACADEMY_ROOT) {
  if (!demand || demand.type !== "OfficeVacancyDemand") throw new Error("request must be an OfficeVacancyDemand");
  if (!demand.receiver || !demand.office?.id || !demand.office?.digest) throw new Error("receiver and immutable office identity are required");
  if (demand.authorityRequested?.some((item) => ["appointment", "recognition", "induction", "incumbency", "receiver-write"].includes(item))) throw new Error("Academy refuses receiver appointment or write authority");
  const procurement = verifyMarketAward(demand);

  const cohort = json(join(root, "content", "cohorts", "2026-07-union-officer-corps.json"));
  const corps = json(join(root, "content", "catalogs", "character-corps.json"));
  const candidates = cohort.members.filter((member) => member.standing === "qualified" && member.officeTrack === demand.office.id && (!demand.character || demand.character === member.character));
  if (candidates.length !== 1) return { type: "Reject", actor: "urn:ame:union-officer-academy", object: { type: "FormationRefusal", reason: "no uniquely qualified Academy character for the exact office track", office: demand.office, receiver: demand.receiver } };
  const membership = candidates[0];
  const character = corps.characters.find((item) => item.id === membership.character);
  if (!character) throw new Error(`${membership.character}: cohort character is not in the Academy corps`);
  const qualification = await qualificationById(root, membership.qualification);
  if (!qualification || !(await qualificationIsCurrent(root, qualification.id))) throw new Error(`${membership.qualification}: qualification is missing or not current`);
  const baseline = (await readRecords(root)).find((record) => record.type === "FormationBaseline" && record.id === qualification.baseline);
  if (!baseline || baseline.office?.id !== demand.office.id || baseline.office?.digest !== demand.office.digest) throw new Error("requested office snapshot differs from the character's qualified office baseline");
  if (qualification.candidate.id !== character.id || qualification.candidate.kind !== "character") throw new Error("qualification does not bind the offered Academy character");
  const characterPath = join(root, character.canonicalRoot, character.entrypoint);
  if (rawDigest(characterPath) !== qualification.candidate.identityDigest) throw new Error("Academy character identity drifted from qualification");

  const offer = {
    type: "CharacterOfficerSupplyOffer",
    provider: "union-officer-academy",
    receiver: demand.receiver,
    office: demand.office,
    character: { id: character.id, kind: character.kind, identityDigest: rawDigest(characterPath), canonicalPath: `${character.canonicalRoot}/${character.entrypoint}` },
    cohort: { id: cohort.id, formationEpoch: cohort.formationEpoch, standing: membership.standing },
    qualification: { id: qualification.id, baseline: qualification.baseline, officeDigest: baseline.office.digest, competencies: qualification.competencies, limitations: qualification.limitations, conveysAuthority: false },
    contextBundleDigest: qualification.candidate.layerBindings.formationContext,
    procurement,
    animationPlan: {
      persistence: "Academy character and chronicles",
      ephemeralAct: "one model/provider/harness/runtime call",
      modelArtifact: qualification.candidate.layerBindings.modelArtifact,
      harnessDigest: qualification.candidate.harnessDigest,
      toolSurfaceDigest: qualification.candidate.layerBindings.toolSurface,
      recordSchema: "union-officer-academy/schema/character-animation",
      identityInheritance: false
    },
    authorityWithheld: ["receiver-recognition", "receiver-induction", "incumbency", "capability-grant", "protected-context-admission", "operational-finalization"]
  };
  offer.id = `urn:${digest(offer)}`;
  return { type: "Offer", actor: "urn:ame:union-officer-academy", target: demand.receiver, object: offer };
}

function assertAnimation(record) {
  const required = ["character", "cohort", "receiver", "office", "modelArtifact", "harnessDigest", "runtimeSession", "contextDigest", "capabilityDigest", "startedAt"];
  for (const key of required) if (!record[key]) throw new Error(`CharacterAnimation.${key} is required`);
  if (record.identityInheritance !== false) throw new Error("CharacterAnimation.identityInheritance must be false");
}

export async function recordAnimation(record, root = ACADEMY_ROOT) {
  const body = { type: "CharacterAnimation", chronicleAdmission: "pending", ...record, identityInheritance: false };
  assertAnimation(body);
  body.id = body.id ?? `urn:${digest(body)}`;
  if (!Number.isFinite(Date.parse(body.startedAt))) throw new Error("animation startedAt must be an ISO timestamp");
  const category = "union-officer-academy.character-animation";
  const prior = (await queryAcademySemanticContent(category, { root })).find((item) => item.id === body.id);
  if (prior) {
    if (JSON.stringify(prior) !== JSON.stringify(body)) throw new Error(`${body.id}: animation identity collision`);
    return prior;
  }
  await recordAcademySemanticContent(root, category, body, body.startedAt);
  return body;
}

function readStdin() { return readFileSync(0, "utf8"); }

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const operation = process.argv[2] ?? "solicit-character";
    const input = JSON.parse(readStdin());
    const result = operation === "solicit-character" ? await solicitCharacter(input) : operation === "record-animation" ? await recordAnimation(input) : (() => { throw new Error(`unknown operation ${operation}`); })();
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ type: "Reject", error: error.message })}\n`);
    process.exitCode = 1;
  }
}
