#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonical, digest, readRecords, verifyNode } from "./academy.mjs";

const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED_SCHEMAS = ["formation-request", "curriculum-revision", "formation-baseline", "cohort", "assessment-challenge-commitment", "assessment-challenge-reveal", "enrollment", "training-event", "assessment", "qualification", "formation-refusal", "formation-record-correction", "requalification-gap", "formation-epoch-gap", "doctrine-admission", "qualification-status-event", "succession-exercise", "curriculum-program", "character-cohort-membership", "character-animation"];
const REQUIRED_PATHS = ["README.md", "package.json", "lib/ownership.json", "lib/management/roster.json", "content/contracts/character-officer-supply.json", "content/contracts/receiver-local-academy-necessity.json", "content/contracts/professional-repertoire-import-and-projection.json", "content/books/academy-ledger.json", "content/doctrine/agency-office-formation.json", "content/doctrine/character-corps-and-professional-repertoire.json", "content/doctrine/locally-derived-academy-constitution.json", "content/doctrine/management-thought-services.json", "content/doctrine/corpus-led-institutional-obligations.json", "content/curricula/union-officer-common-core.json", "content/curricula/executive-officer-to-the-leader.json", "content/services/officer-formation.json", "content/services/character-officer-supply.json", "content/services/local-necessity-and-demand-gluing.json", "content/services/market-mediated-character-officer-supply.json", "content/services/doctrine-stewardship.json", "content/services/office-context-on-demand.json", "content/services/qualification-and-requalification.json", "content/catalogs/formation-products.json", "content/catalogs/professional-repertoire.json", "content/catalogs/projection-ledger.json", "content/catalogs/territorial-artifact-adjudications.json", "content/catalogs/character-corps.json", "content/cohorts/2026-07-union-officer-corps.json", "content/catalogs/provider-adapters.json", "content/independence/examination-and-appeal-boundary.json", "content/formation-offers/executive-officer-to-the-leader.json", "services/management-thought/huidu-guanli/package.json"];

function rawDigest(path) {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function territoryRoot(start) {
  let cursor = resolve(start);
  while (dirname(cursor) !== cursor) {
    if (existsSync(join(cursor, "lib", "emsenn", "services", "561-group"))) return cursor;
    cursor = dirname(cursor);
  }
  throw new Error(`${start}: territory root not found`);
}

function filesBelow(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? filesBelow(join(path, entry.name)) : [join(path, entry.name)]);
}

function assertDigest(root, path, expected, owner) {
  const target = resolve(root, path);
  if (!target.startsWith(`${resolve(root)}/`) || !existsSync(target)) throw new Error(`${owner}: source path unresolved`);
  if (rawDigest(target) !== expected) throw new Error(`${owner}: source drifted from curriculum digest`);
}

export async function verifyAcademy(root = NODE_ROOT) {
  const territory = territoryRoot(root);
  for (const path of REQUIRED_PATHS) if (!existsSync(join(root, path))) throw new Error(`${path}: required Academy carrier missing`);
  for (const name of REQUIRED_SCHEMAS) {
    const path = join(root, "lib", "schemas", `${name}.schema.json`), schema = JSON.parse(readFileSync(path, "utf8"));
    if (schema.$id !== `union-officer-academy/schema/${name}` || schema.$schema !== "https://json-schema.org/draft/2020-12/schema") throw new Error(`${path}: schema identity mismatch`);
  }
  const roster = JSON.parse(readFileSync(join(root, "lib", "management", "roster.json"), "utf8"));
  for (const group of ["offices", "duties", "skills"]) for (const path of roster[group]) if (!existsSync(join(root, path))) throw new Error(`${path}: roster member missing`);
  if (readdirSync(join(root, "content", "offices")).filter((name) => name.endsWith(".json")).length !== roster.offices.length) throw new Error("office roster does not cover the complete office pool");
  const officeRecords = roster.offices.map((path) => JSON.parse(readFileSync(join(root, path), "utf8")));
  const officeIds = new Set(officeRecords.map((office) => office.id));
  if (officeIds.size !== officeRecords.length) throw new Error("office roster contains duplicate office identities");
  const dutyRecords = roster.duties.map((path) => JSON.parse(readFileSync(join(root, path), "utf8")));
  const dutyIds = new Set(dutyRecords.map((duty) => duty.id));
  const skillRecords = roster.skills.map((path) => JSON.parse(readFileSync(join(root, path), "utf8")));
  const skillIds = new Set(skillRecords.map((skill) => skill.name));
  if (dutyIds.size !== dutyRecords.length || skillIds.size !== skillRecords.length) throw new Error("duty or skill roster contains duplicate identities");
  if (readdirSync(join(root, "content", "duties")).filter((name) => name.endsWith(".json")).length !== dutyRecords.length) throw new Error("duty roster does not cover the complete duty pool");
  for (const duty of dutyRecords) {
    for (const skill of duty.skills ?? []) if (!skillIds.has(skill)) throw new Error(`${duty.id}: skill ${skill} does not resolve`);
  }
  for (const [index, skill] of skillRecords.entries()) {
    const directory = dirname(join(root, roster.skills[index]));
    const bodyPath = join(directory, "SKILL.md");
    if (!existsSync(bodyPath)) throw new Error(`${skill.name}: skill body missing`);
    const body = readFileSync(bodyPath, "utf8");
    if (!body.startsWith(`---\nname: ${skill.name}\ndescription:`)) throw new Error(`${skill.name}: canonical skill frontmatter missing or drifted`);
  }
  for (const office of officeRecords) {
    if (office.kind !== "office" || !office.name || !office["normative-structure"] || !Object.keys(office["deontic-profile"] ?? {}).length || !office["theory-basis"]?.length) throw new Error(`${office.id ?? "unknown-office"}: incomplete office law`);
    for (const peer of office["distinguished-from"] ?? []) if (!officeIds.has(peer) && peer !== "character-resources") throw new Error(`${office.id}: distinguished office ${peer} does not resolve`);
    if (office["reports-to"] !== "none" && !officeIds.has(office["reports-to"])) throw new Error(`${office.id}: superior office ${office["reports-to"]} does not resolve`);
    for (const duty of office["bears-duty"] ?? []) if (!dutyIds.has(duty.replace(/^emsenn\/duty\//u, ""))) throw new Error(`${office.id}: borne duty ${duty} does not resolve`);
    for (const skill of office["provides-skill"] ?? []) if (!skillIds.has(skill)) throw new Error(`${office.id}: provided skill ${skill} does not resolve`);
  }
  for (const path of filesBelow(join(root, "content", "services")).filter((item) => item.endsWith(".json"))) {
    const service = JSON.parse(readFileSync(path, "utf8"));
    for (const office of service.offices ?? []) if (!officeIds.has(office)) throw new Error(`${service.id}: service office ${office} does not resolve`);
  }
  const products = JSON.parse(readFileSync(join(root, "content", "catalogs", "formation-products.json"), "utf8"));
  if (products.notInternalRoster !== true || products.primaryProduct !== "CharacterOfficerSupplyOffer" || products.productTypes.length < 11) throw new Error("formation product catalog is missing, lacks character supply, or is conflated with the internal roster");
  for (const product of products.productTypes) if (officeIds.has(product.id)) throw new Error(product.id + ": product type appears in Academy office roster");
  const adapters = JSON.parse(readFileSync(join(root, "content", "catalogs", "provider-adapters.json"), "utf8"));
  if (adapters.notInternalRoster !== true || adapters.providers.some((provider) => officeIds.has(provider.id))) throw new Error("provider adapter catalog is conflated with the internal roster");
  const obligations = JSON.parse(readFileSync(join(root, "content", "doctrine", "corpus-led-institutional-obligations.json"), "utf8"));
  if (obligations.officesCovered !== officeRecords.length || obligations.obligations.length !== officeRecords.length) throw new Error("institutional obligation audit does not cover the complete office roster");
  const covered = new Set();
  for (const obligation of obligations.obligations) {
    if (!officeIds.has(obligation.office) || covered.has(obligation.office)) throw new Error(`${obligation.office}: institutional obligation office is missing or duplicated`);
    covered.add(obligation.office);
    if (!obligation.sourceDenominator?.length) throw new Error(`${obligation.office}: source denominator is empty`);
    for (const source of obligation.sourceDenominator) {
      if (!["current-law", "current-practice", "admitted-research", "legacy-prior-art"].includes(source.authorityClass)) throw new Error(`${obligation.office}: invalid source authority class`);
      const sourcePath = resolve(territory, source.path);
      if (!sourcePath.startsWith(`${territory}/`) || !existsSync(sourcePath)) throw new Error(`${obligation.office}: source denominator path unresolved: ${source.path}`);
    }
  }
  const common = JSON.parse(readFileSync(join(root, "content", "curricula", "union-officer-common-core.json"), "utf8"));
  const executive = JSON.parse(readFileSync(join(root, "content", "curricula", "executive-officer-to-the-leader.json"), "utf8"));
  for (const program of [common, executive]) {
    if (program.owner !== "union-officer-academy" || !Array.isArray(program.competencies) || program.competencies.length === 0) throw new Error(`${program.id ?? "curriculum"}: malformed Academy curriculum program`);
  }
  assertDigest(territory, executive.targetOffice.path, executive.targetOffice.digest, "executive-officer target office");
  const office = JSON.parse(readFileSync(resolve(territory, executive.targetOffice.path), "utf8"));
  if (digest(office["deontic-profile"]) !== executive.targetOffice.deonticProfileDigest) throw new Error("executive-officer deontic profile drifted");
  assertDigest(territory, executive.targetOffice.appointmentLawPath, executive.targetOffice.appointmentLawDigest, "executive-officer appointment law");
  for (const duty of executive.targetOffice.duties) {
    assertDigest(territory, duty.path, duty.digest, `duty ${duty.id}`);
    assertDigest(territory, duty.workPath, duty.workDigest, `work ${duty.work}`);
  }
  for (const skill of executive.targetOffice.skills) {
    assertDigest(territory, skill.specPath, skill.specDigest, `skill ${skill.id}`);
    assertDigest(territory, skill.bodyPath, skill.bodyDigest, `skill body ${skill.id}`);
  }
  for (const source of executive.sourceDoctrine) assertDigest(root, source.path, source.digest, `curriculum doctrine ${source.path}`);
  const offer = JSON.parse(readFileSync(join(root, "content", "formation-offers", "executive-officer-to-the-leader.json"), "utf8"));
  if (offer.notAPilot !== true || offer.primaryProduct !== "OfficeFormationBundle" || offer.sourceDenominator.length < 10) throw new Error("executive officer formation offer is incomplete");
  for (const source of offer.sourceDenominator) {
    if (!["current-law", "current-practice", "admitted-research", "legacy-prior-art"].includes(source.authorityClass)) throw new Error(source.path + ": formation offer authority class invalid");
    assertDigest(territory, source.path, source.digest, "formation offer source " + source.path);
  }
  for (const name of ["huidu-guanli", "rendanheyi"]) {
    const manifest = JSON.parse(readFileSync(join(root, "services", "management-thought", name, "package.json"), "utf8"));
    if (manifest["x-owner"] !== "union-officer-academy") throw new Error(`${name}: doctrine service owner mismatch`);
  }
  const journal = await verifyNode(root), admissions = (await readRecords(root)).filter((record) => record.type === "DoctrineAdmission");
  const classes = new Set(admissions.map((record) => record.authorityClass));
  for (const required of ["current-law", "current-practice", "admitted-research", "legacy-prior-art"]) if (!classes.has(required)) throw new Error(`doctrine register lacks ${required}`);
  const requiredForeignDoctrine = [
    {
      source: "lib/emsenn/services/561-group/services/561-group-services-section/content/text/glossary/terms/561-group.md",
      digest: "sha256:11ed46fbc3a7a4d81033d642109e99aaeec1f63bf043e78f9e635221b72bfb9d",
      owner: "561-group",
      jurisdiction: "561-group"
    },
    {
      source: "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas/office.schema.json",
      digest: "sha256:c176fd97803f0390c612a44b8476e87df152a2854bfdbda5fcd40ed1ede4c7a3",
      owner: "executive-office",
      jurisdiction: "executive-office"
    }
  ];
  for (const required of requiredForeignDoctrine) {
    const admission = admissions.find((record) => record.source === required.source && record.digest === required.digest);
    if (!admission || admission.owner !== required.owner || admission.jurisdiction !== required.jurisdiction || admission.reading !== "binding-within-source-jurisdiction") {
      throw new Error(`foreign doctrine is not digest-bound to its owning jurisdiction: ${required.source}`);
    }
  }
  return { ok: true, schemas: REQUIRED_SCHEMAS.length, offices: roster.offices.length, skills: roster.skills.length, curricula: 2, productTypes: products.productTypes.length, providerAdapters: adapters.providers.length, institutionalObligations: obligations.obligations.length, doctrineAdmissions: admissions.length, journal };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(await verifyAcademy(process.argv[2] ? resolve(process.argv[2]) : NODE_ROOT))}\n`); }
  catch (error) { process.stderr.write(`${JSON.stringify({ ok: false, error: error.message })}\n`); process.exitCode = 1; }
}
