#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CIRCUIT_TRACE_PROFILE } from "@lenticule-science/typed-circuit-residue-assay";
import { seavt } from "@red-cup-engineering/witness-journal-entry-service";
import { appendSeavt } from "@red-cup-engineering/witness-journal-log-service";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent, sha256DigestFromNiUri } from "@red-cup-engineering/semantic-content-identify-service";
const contentId = (value) => identifyJsonSemanticContent({ objectKind: "union-officer-academy.json", value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const contentSurface = (role, token) => `semantic-content.${role}.sha256.${Buffer.from(sha256DigestFromNiUri(token),"base64url").toString("hex")}`;

const CUSTOMER = "urn:ame:union-officer-academy";
const PROVIDER = "urn:ame:typed-circuit-residue-assay";
const PROFILE = "org.emsenn.semiotic-graph-trace.v1";
const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_PROVIDER = resolve(ROOT, "../lenticule-science/services/obsmetrological-services-section/services/typed-circuit-residue-assay");

function niText(text) { return contentId(text); }
function arg(name, fallback = null) { const at = process.argv.indexOf(name); return at < 0 ? fallback : process.argv[at + 1]; }
async function requestTypedCircuitResidueAssay(options) { return (await import("@lenticule-science/typed-circuit-residue-assay/client")).requestTypedCircuitResidueAssay(options); }

function fixture(account, label, changes = {}) {
  return {
    originatingSettlement: account, receiptId: niText(`uoa-rmn-v3-fixture:${label}`), receiptDigest: niText(`uoa-rmn-v3-fixture-bytes:${label}`),
    chain: "eip155:31337", orientation: 1,
    chu: { left: { positiveEvidence: true, negativeEvidence: true }, right: { positiveEvidence: true, negativeEvidence: true } },
    connection: { frame: niText("uoa:ambient-frame"), quarterTurns: 0, translation: ["0", "0"] }, priceErasure: { unit: "uoa-erasure", irreversibleAmount: "1", priceAmount: "1" },
    economicCurrentAffinity: { current: ["1", "1"], affinity: ["2", "1"] }, ...changes
  };
}

function traceCircuit(account) {
  const pin = (name, direction) => ({ name, direction, mode: "par", predicate: niText("uoa:evidences"), carrier: niText("uoa:FOUR") });
  const values = [
    { positiveEvidence: false, negativeEvidence: false }, { positiveEvidence: true, negativeEvidence: false },
    { positiveEvidence: false, negativeEvidence: true }, { positiveEvidence: true, negativeEvidence: true },
  ];
  const child = {
    profile: "org.emsenn.semiotic-graph.v1", law: niText("uoa:trace-child-law"),
    ports: [pin("in", "input"), pin("out", "output")], instances: [], nets: [],
    behavior: { factors: [{ inputs: ["in"], outputs: ["out"], rows: values.map((value) => ({ input: [value], output: [value] })) }] },
  };
  const circuit = {
    profile: "org.emsenn.semiotic-graph.v1", law: niText("uoa:trace-root-law"),
    ports: [], instances: [{ name: "academy", component: contentId(child) }],
    nets: [{ name: "academy-loop", driver: { instance: "academy", port: "out" }, sinks: [{ instance: "academy", port: "in" }], mode: "par", chain: "eip155:31337" }],
    behavior: { factors: [] },
  };
  const membrane = (label) => ({ account, authority: niText(`uoa:${label}-authority`), custody: niText(`uoa:${label}-custody`), territory: niText(`uoa:${label}-territory`) });
  const assembly = { profile: "org.emsenn.semiotic-graph-placement.v1", circuit: contentId(circuit), placements: [{ address: [], membrane: membrane("trace-root") }, { address: ["academy"], membrane: membrane("trace-child") }] };
  return { circuit, components: [child], assembly };
}

function step(receipt) { return { net: "academy-loop", sink: { instance: "academy", port: "in" }, receipt }; }

function appendWitnessJournal(root, assayId, vectors, now) {
  const entity=contentSurface("assay",assayId),rows=vectors.flatMap((vector)=>[
    seavt(entity,"academy-residue:case",contentSurface("case",contentId(vector.case)),now),
    seavt(entity,"academy-residue:request",contentSurface("request",vector.requestNi),now),
    seavt(entity,"academy-residue:witness",contentSurface("witness",vector.witness),now),
    seavt(entity,"academy-residue:disposition",`academy-residue.disposition.${vector.disposition}`,now),
  ]);
  return appendSeavt(root,"academy.residue-assay",rows,now);
}

export async function exerciseRmnResidueProfile({ root = ROOT, providerRoot = DEFAULT_PROVIDER, agentUrl = process.env.TYPED_CIRCUIT_RESIDUE_AGENT, now = new Date().toISOString(), requestResidue = requestTypedCircuitResidueAssay } = {}) {
  if (!agentUrl) throw new Error("TYPED_CIRCUIT_RESIDUE_AGENT must name the hired residue provider's signed A2A 1.0 Agent Card");
  const profileCommitment = contentId(CIRCUIT_TRACE_PROFILE);
  const account = JSON.parse(readFileSync(join(root, "content/evm/accounts/eip155-31337.json"), "utf8")).account.caip10;
  const q1 = fixture(account, "quarter-turn-1", { connection: { frame: niText("uoa:ambient-frame"), quarterTurns: 1, translation: ["0", "0"] } });
  const q3 = fixture(account, "quarter-turn-3", { connection: { frame: niText("uoa:ambient-frame"), quarterTurns: 3, translation: ["0", "0"] } });
  const unpriced = fixture(account, "unpriced", { priceErasure: { unit: "uoa-erasure", irreversibleAmount: "1", priceAmount: "0" } });
  const replay = fixture(account, "replay");
  const { circuit, components, assembly } = traceCircuit(account);
  const cases = [
    ["lawful-identity-holonomy", { borderClass: { type: "internal", allowedHolonomy: 0 }, trace: [step(q1), step(q3)] }, "accepted", "closed-flat"],
    ["lawful-protected-border", { borderClass: { type: "protected", allowedHolonomy: 1 }, trace: [step(q1)] }, "accepted", "rotational-protected-border"],
    ["unpriced-erasure", { borderClass: { type: "internal", allowedHolonomy: 0 }, trace: [step(unpriced)] }, "accepted", "unpriced-irreversible-defect"],
    ["receipt-replay", { borderClass: { type: "internal", allowedHolonomy: 0 }, trace: [step(replay), step(replay)] }, "refused", "receipt-replay"]
  ];
  const vectors = [];
  for (const [caseName, traceCase, expectedDisposition, expectedResult] of cases) {
    try {
      const result = await requestResidue({ agentUrl, circuit, components, assembly, ...traceCase, signal: AbortSignal.timeout(30_000) });
      if (expectedDisposition !== "accepted" || result.receipt.disposition !== expectedResult) throw new Error(`${caseName}: expected ${expectedDisposition}/${expectedResult}, received accepted/${result.receipt.disposition}`);
      vectors.push({ case: caseName, protocol: "A2A 1.0", disposition: "accepted", requestNi: result.receipt.request, witness: result.receipt.id, assay: result.receipt });
    } catch (error) {
      const reason = String(error.message).match(/(?:^|:\s)([a-z]+(?:-[a-z]+)+)(?::|\s|$)/u)?.[1] ?? error.message;
      if (expectedDisposition !== "refused" || !String(error.message).includes(expectedResult)) throw error;
      const requestNi = error.inputNi;
      if (!requestNi) throw new Error(`${caseName}: A2A refusal omitted its canonical RMN request identity`);
      vectors.push({ case: caseName, protocol: "A2A 1.0", disposition: "refused", requestNi, witness: contentId({requestNi,reason}), reason });
    }
  }
  const assayId = contentId(vectors.map(({ witness }) => witness));
  const witnessJournal = appendWitnessJournal(root, assayId, vectors, now);
  return { id: assayId, type: "TypedCircuitResidueV4CustomerAssay", customer: CUSTOMER, provider: PROVIDER, profile: PROFILE, profileCommitment, vectors, witnessJournal, centralAuthorityUsed: false };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await exerciseRmnResidueProfile({ root: resolve(arg("--root", ROOT)), providerRoot: resolve(arg("--provider-root", DEFAULT_PROVIDER)), agentUrl: arg("--agent", process.env.TYPED_CIRCUIT_RESIDUE_AGENT), witnessJournalAgentUrl: arg("--witness-journal-agent", process.env.WITNESS_JOURNAL_RDF_AGENT), now: arg("--now", new Date().toISOString()) });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
