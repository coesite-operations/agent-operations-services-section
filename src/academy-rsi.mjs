#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exerciseRmnResidueProfile } from "./exercise-rmn-residue-profile.mjs";
import { seavt } from "@red-cup-engineering/witness-journal-entry-service";
import { appendSeavt, readSeavtAtPath } from "@red-cup-engineering/witness-journal-log-service";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { isNiUri as isCanonicalSha256NiUri, niUriDigest as sha256DigestFromNiUri } from "@red-cup-engineering/ni-services-section";
const contentId = (value) => identifyJsonSemanticContent({ objectKind: "union-officer-academy.json", value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const contentSurface = (role, token) => `semantic-content.${role}.sha256.${Buffer.from(sha256DigestFromNiUri(token),"base64url").toString("hex")}`;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PROVIDER = resolve(ROOT, "../lenticule-science/services/obsmetrological-services-section/services/typed-circuit-residue-assay");
const NI = Object.freeze({ test: isCanonicalSha256NiUri });
function option(argv, name, fallback) { const at = argv.indexOf(name); return at === -1 ? fallback : argv[at + 1]; }
function journalFiles(root) {
  const base = join(root, "data", "logs");
  if (!existsSync(base)) return [];
  function visit(path) {
    return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
      const child = join(path, entry.name);
      if (entry.isDirectory()) return visit(child);
      return entry.name.endsWith(".jsonl") ? [child] : [];
    });
  }
  return visit(base);
}
function validateAssayEvidence(assay) {
  if (!NI.test(assay?.id ?? "") || assay.type !== "TypedCircuitResidueV4CustomerAssay" || !NI.test(assay.profileCommitment ?? "") || !Array.isArray(assay.vectors) || assay.vectors.length === 0) {
    throw new Error("Academy RMN hierarchical trace assay evidence is malformed");
  }
  if (!assay.vectors.every((vector) => typeof vector.case === "string" && NI.test(vector.requestNi ?? "") && NI.test(vector.witness ?? "") && ["accepted", "refused"].includes(vector.disposition))) {
    throw new Error("Academy RMN hierarchical trace assay vectors are malformed");
  }
}
async function appendCycleEvidence(root, assay, instant, agentUrl) {
  const cycleId = contentId({assay:assay.id,profileCommitment:assay.profileCommitment}),entity=contentSurface("rsi-cycle",cycleId);
  return appendSeavt(root,"academy.rsi-cycle",[
    seavt(entity,"academy-rsi:assay",contentSurface("assay",assay.id),instant),
    seavt(entity,"academy-rsi:profile",contentSurface("profile",assay.profileCommitment),instant),
  ],instant);
}

export async function runAcademyRsiCycle({ root = ROOT, providerRoot = DEFAULT_PROVIDER, agentUrl = process.env.TYPED_CIRCUIT_RESIDUE_AGENT, witnessJournalAgentUrl = process.env.WITNESS_JOURNAL_RDF_AGENT, instant = new Date().toISOString() } = {}) {
  const assay = await exerciseRmnResidueProfile({ root, providerRoot, agentUrl, witnessJournalAgentUrl, now: instant });
  validateAssayEvidence(assay);
  const witnessJournal = await appendCycleEvidence(root, assay, instant, witnessJournalAgentUrl);
  return { type: "AcademyTypedCircuitResidueV4RsiCycle", assay, witnessJournal, centralAuthorityUsed: false };
}

export function verifyAcademyRsi(root = ROOT) {
  const dataRoot = process.env.ACADEMY_WITNESS_JOURNAL_DATA_ROOT ?? root;
  const files = journalFiles(dataRoot),rows=files.flatMap(readSeavtAtPath);
  if (!rows.some((row)=>row.a==="academy-rsi:assay") || !rows.some((row)=>row.a==="academy-rsi:profile")) throw new Error(`Academy semiotic graph RSI evidence is absent under ${dataRoot}`);
  return { ok: true, profile: "org.emsenn.semiotic-graph-trace.v1", witnessJournalFiles: files.length, centralAuthorityUsed: false };
}

async function main(argv) {
  const command = argv[0] ?? "verify", root = resolve(option(argv, "--root", ROOT));
  if (command === "run-cycle") return runAcademyRsiCycle({ root, providerRoot: resolve(option(argv, "--provider-root", DEFAULT_PROVIDER)), agentUrl: option(argv, "--agent", process.env.TYPED_CIRCUIT_RESIDUE_AGENT), witnessJournalAgentUrl: option(argv, "--witness-journal-agent", process.env.WITNESS_JOURNAL_RDF_AGENT), instant: option(argv, "--now", new Date().toISOString()) });
  if (command === "verify") return verifyAcademyRsi(root);
  throw new Error(`unknown Academy RSI command ${command}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(await main(process.argv.slice(2)), null, 2)}\n`); }
  catch (error) { process.stderr.write(`Academy RSI failed: ${error.message}\n`); process.exitCode = 1; }
}
