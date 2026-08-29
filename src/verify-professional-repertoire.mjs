#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readRecords } from "./academy.mjs";
import { ACADEMY_ROOT, compileCatalogs, rawDigest, territoryRoot, treeDigest } from "./professional-repertoire.mjs";

function json(path) { return JSON.parse(readFileSync(path, "utf8")); }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

export function verifyProjectionEntry(entry, { academy = ACADEMY_ROOT, territory = territoryRoot() } = {}) {
  const canonical = entry.canonicalPath ? join(academy, entry.canonicalPath) : join(academy, entry.canonicalRoot);
  const projection = join(territory, entry.priorProjection);
  if (!existsSync(canonical)) throw new Error(`${entry.id}: canonical Academy carrier missing`);
  if (!existsSync(projection)) throw new Error(`${entry.id}: admitted projection missing`);
  const canonicalDigest = entry.canonicalPath ? rawDigest(canonical) : treeDigest(canonical);
  const projectionDigest = entry.canonicalPath ? rawDigest(projection) : (entry.projectionKind === "single-file" ? rawDigest(projection) : treeDigest(projection));
  const recordedCanonical = entry.digest ?? entry.canonicalDigest;
  if (canonicalDigest !== recordedCanonical) throw new Error(`${entry.id}: canonical Academy carrier drifted`);
  if (projectionDigest !== entry.projectionDigest) throw new Error(`${entry.id}: consumer projection drifted`);
  if (canonicalDigest !== projectionDigest && entry.projectionKind !== "single-file") throw new Error(`${entry.id}: projection is not digest-equal to Academy law`);
  return true;
}

export function verifyAdjudicationCoverage(stored, live) {
  const storedPaths = stored.map((entry) => entry.path);
  const livePaths = live.map((entry) => entry.path);
  if (new Set(storedPaths).size !== storedPaths.length) throw new Error("territorial adjudications duplicate a carrier path");
  const missing = livePaths.filter((path) => !storedPaths.includes(path));
  const stale = storedPaths.filter((path) => !livePaths.includes(path));
  if (missing.length) throw new Error(`unclassified live executor carriers: ${missing.join(", ")}`);
  if (stale.length) throw new Error(`adjudications name absent carriers: ${stale.join(", ")}`);
  return true;
}

async function findQualification(root, id) {
  return (await readRecords(root)).find((record) => record.type === "Qualification" && record.id === id) ?? null;
}

export async function verifyProfessionalRepertoire(root = ACADEMY_ROOT) {
  if (resolve(root) !== ACADEMY_ROOT) throw new Error("this verifier currently admits the installed Academy membrane only");
  const territory = territoryRoot(root);
  const required = [
    "content/contracts/professional-repertoire-import-and-projection.json",
    "content/contracts/character-officer-supply.json",
    "content/contracts/receiver-local-academy-necessity.json",
    "content/services/local-necessity-and-demand-gluing.json",
    "content/services/market-mediated-character-officer-supply.json",
    "content/doctrine/locally-derived-academy-constitution.json",
    "content/services/character-officer-supply.json",
    "content/cohorts/2026-07-union-officer-corps.json",
    "content/catalogs/professional-repertoire.json",
    "content/catalogs/projection-ledger.json",
    "content/catalogs/territorial-artifact-adjudications.json",
    "content/catalogs/character-corps.json",
    "lib/schemas/character-cohort-membership.schema.json",
    "lib/schemas/character-animation.schema.json"
  ];
  for (const path of required) if (!existsSync(join(root, path))) throw new Error(`${path}: required Academy carrier missing`);

  const storedCatalog = json(join(root, "content/catalogs/professional-repertoire.json"));
  const storedLedger = json(join(root, "content/catalogs/projection-ledger.json"));
  const storedAdjudications = json(join(root, "content/catalogs/territorial-artifact-adjudications.json"));
  const live = compileCatalogs({ write: false });
  verifyAdjudicationCoverage(storedAdjudications.entries, live.adjudications.entries);
  if (!same(storedCatalog, live.catalog)) throw new Error("professional repertoire catalog drifted from live canonical carriers or projections");
  if (!same(storedLedger, live.projectionLedger)) throw new Error("projection ledger drifted from live canonical carriers or projections");
  if (!same(storedAdjudications, live.adjudications)) throw new Error("territorial classification changed without explicit adjudication");
  if (storedCatalog.owner !== "union-officer-academy" || storedCatalog.appointmentAuthority !== false) throw new Error("professional repertoire ownership or appointment boundary is malformed");
  if (storedCatalog.counts.offices < 30 || storedCatalog.counts.duties < 40 || storedCatalog.counts.skillPackages < 60) throw new Error("professional repertoire has fallen below the admitted Union corpus");
  for (const entry of storedLedger.professionalRepertoire) verifyProjectionEntry(entry, { academy: root, territory });
  for (const entry of storedLedger.characters) {
    const canonical = join(root, entry.canonicalRoot);
    const projection = join(territory, entry.priorProjection);
    if (treeDigest(canonical) !== entry.canonicalDigest) throw new Error(`${entry.id}: Academy character store drifted`);
    const actualProjection = entry.projectionKind === "single-file" ? rawDigest(projection) : treeDigest(projection);
    if (actualProjection !== entry.projectionDigest) throw new Error(`${entry.id}: character projection drifted`);
    if (entry.projectionKind === "tree" && entry.canonicalDigest !== entry.projectionDigest) throw new Error(`${entry.id}: character store is not a digest-equal projection`);
  }
  for (const entry of storedAdjudications.entries) {
    if (!["academy-governance", "academy-repertoire", "service-specialization", "projection"].includes(entry.classification)) throw new Error(`${entry.path}: invalid ownership classification`);
    if (entry.classification === "academy-repertoire" && !entry.canonicalPath.includes("/union-officer-academy/")) throw new Error(`${entry.path}: Academy repertoire is not Academy-canonical`);
    if (entry.classification === "projection" && entry.digest !== entry.canonicalDigest) throw new Error(`${entry.path}: projection differs from Academy canonical carrier`);
  }

  const corps = json(join(root, "content/catalogs/character-corps.json"));
  const cohort = json(join(root, "content/cohorts/2026-07-union-officer-corps.json"));
  if (corps.notPersonnel !== true || corps.notIncumbencies !== true || corps.animationIsEphemeral !== true) throw new Error("character corps conflates personnel, incumbency, or animation");
  const corpsIds = corps.characters.map((item) => item.id).sort();
  const cohortIds = cohort.members.map((item) => item.character).sort();
  if (!same(corpsIds, cohortIds)) throw new Error("character corps and cohort membership differ");
  for (const member of cohort.members.filter((item) => item.standing === "qualified")) {
    const qualification = await findQualification(root, member.qualification);
    const character = corps.characters.find((item) => item.id === member.character);
    if (!qualification || qualification.candidate.id !== member.character) throw new Error(`${member.character}: qualification does not resolve to cohort member`);
    if (rawDigest(join(root, character.canonicalRoot, character.entrypoint)) !== qualification.candidate.identityDigest) throw new Error(`${member.character}: qualification identity does not bind Academy character`);
  }

  return { ok: true, counts: storedCatalog.counts, characters: corps.characters.length, cohort: cohort.id, adjudications: storedAdjudications.entries.length, classifications: Object.fromEntries([...new Set(storedAdjudications.entries.map((item) => item.classification))].map((kind) => [kind, storedAdjudications.entries.filter((item) => item.classification === kind).length])) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(await verifyProfessionalRepertoire())}\n`); }
  catch (error) { process.stderr.write(`${JSON.stringify({ ok: false, error: error.message })}\n`); process.exitCode = 1; }
}
