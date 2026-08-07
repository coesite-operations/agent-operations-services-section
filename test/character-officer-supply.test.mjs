import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { queryAcademySemanticContent } from "@union-officer-academy/formation-lianqun-member-runtime-service/semantic-records";
import { solicitCharacter, recordAnimation } from "../src/character-officer-supply.mjs";
import { deriveLocalAcademyNecessity, glueAcademyDemand } from "../src/local-academy-necessity.mjs";
import { publishOfficerSupplyLot, prepareAcademySupplyBid, admitOfficerSupplyAward } from "../src/officer-supply-market.mjs";
import { rawDigest } from "../src/professional-repertoire.mjs";
import { verifyAdjudicationCoverage, verifyProjectionEntry } from "../src/verify-professional-repertoire.mjs";

const OFFICE_DIGEST = "sha256:bf8c73fcd323933d17662fc23210a37e0a4f53034d1a698e48366f18a68d3303";
const evidence = (name) => `sha256:${Buffer.from(name).toString("hex").padEnd(64, "0").slice(0, 64)}`;

function awardedProcurement(receiver = "leader-movement-team", office = { id: "executive-officer-to-the-leader", owner: receiver, digest: OFFICE_DIGEST }) {
  const situation = { type: "ReceiverOfficerSupplySituation", actor: receiver, receiver, evidenceAuthorship: "receiver-local", office, currentIncumbencies: [], evidence: [] };
  const necessity = deriveLocalAcademyNecessity(situation);
  const lot = publishOfficerSupplyLot(necessity, { market: "urn:market:test", selectionCriteria: ["exact qualification"] });
  const bid = prepareAcademySupplyBid(lot, {
    characterCandidate: "codex-interactive-session",
    qualification: "urn:qualification:test",
    agreement: "urn:agreement:test",
    supplierContracts: [{ provider: "formation-supplier", capability: "formation", contract: "urn:contract:test" }]
  });
  const award = admitOfficerSupplyAward({ lotActivity: lot, bidActivity: bid, receiver, contract: { id: "test-award-contract", provider: "union-officer-academy", consumer: receiver, admittedByReceiver: true, lot: lot.object.id, bid: bid.object.id } });
  return { lot, bid, award };
}

test("Academy refuses character supply until current addressed qualification evidence exists", async () => {
  const result = await solicitCharacter({
    type: "OfficeVacancyDemand",
    receiver: "leader-movement-team",
    office: { id: "executive-officer-to-the-leader", digest: OFFICE_DIGEST },
    character: "codex-interactive-session",
    authorityRequested: ["bounded-execution"],
    procurement: awardedProcurement()
  });
  assert.equal(result.type, "Reject");
  assert.equal(result.object.type, "FormationRefusal");
  assert.match(result.object.reason, /no uniquely qualified Academy character/u);
});

test("Academy refuses a demand that asks it to appoint its character", async () => {
  await assert.rejects(() => solicitCharacter({
    type: "OfficeVacancyDemand",
    receiver: "leader-movement-team",
    office: { id: "executive-officer-to-the-leader", digest: OFFICE_DIGEST },
    authorityRequested: ["appointment"]
  }), /refuses receiver appointment/);
});

test("Academy refuses direct character requisitions that bypass tender, bid, and receiver award", async () => {
  await assert.rejects(() => solicitCharacter({
    type: "OfficeVacancyDemand",
    receiver: "leader-movement-team",
    office: { id: "executive-officer-to-the-leader", digest: OFFICE_DIGEST },
    character: "codex-interactive-session",
    authorityRequested: ["bounded-execution"]
  }), /OfficerSupplyLot/);
});

test("an ephemeral animation is recorded separately from character identity", async () => {
  const root = mkdtempSync(join(tmpdir(), "academy-animation-"));
  const animation = await recordAnimation({
    character: "codex-interactive-session",
    cohort: "2026-07-union-officer-corps",
    receiver: "leader-movement-team",
    office: "executive-officer-to-the-leader",
    modelArtifact: "gpt-5",
    provider: "openai",
    harnessDigest: evidence("harness"),
    runtimeSession: "test-runtime-call",
    contextDigest: evidence("context"),
    capabilityDigest: evidence("grant"),
    startedAt: "2026-07-18T12:00:00-05:00",
    cost: { inference: "unknown-not-zero" }
  }, root);
  assert.equal(animation.identityInheritance, false);
  assert.equal(animation.chronicleAdmission, "pending");
  assert.equal((await queryAcademySemanticContent("union-officer-academy.character-animation", { root }))[0].runtimeSession, "test-runtime-call");
});

test("bad incumbent: a consumer cannot drift an Academy projection", () => {
  const root = mkdtempSync(join(tmpdir(), "academy-projection-"));
  const academy = join(root, "academy"), territory = join(root, "territory");
  mkdirSync(academy, { recursive: true });
  mkdirSync(territory, { recursive: true });
  writeFileSync(join(academy, "canonical.txt"), "settled profession\n");
  writeFileSync(join(territory, "projection.txt"), "settled profession\n");
  const digest = rawDigest(join(academy, "canonical.txt"));
  const entry = { id: "profession", canonicalPath: "canonical.txt", priorProjection: "projection.txt", digest, projectionDigest: digest };
  assert.equal(verifyProjectionEntry(entry, { academy, territory }), true);
  writeFileSync(join(territory, "projection.txt"), "local silent fork\n");
  assert.throws(() => verifyProjectionEntry(entry, { academy, territory }), /consumer projection drifted/);
});

test("closed-world census rejects a newly invented executor carrier", () => {
  const stored = [{ path: "known-office.json" }];
  const live = [{ path: "known-office.json" }, { path: "unowned-agent-prompt.md" }];
  assert.throws(() => verifyAdjudicationCoverage(stored, live), /unclassified live executor carriers/);
});

const localSituation = (overrides = {}) => ({
  type: "ReceiverOfficerSupplySituation",
  actor: "receiver-a",
  receiver: "receiver-a",
  evidenceAuthorship: "receiver-local",
  office: { id: "operations-officer", owner: "receiver-a", digest: evidence("office-epoch") },
  currentIncumbencies: [],
  evidence: [{ claim: "receiver owns office epoch" }],
  ...overrides
});

test("a receiver locally derives Academy need from its office and missing qualified incumbency", () => {
  const result = deriveLocalAcademyNecessity(localSituation());
  assert.equal(result.actor, "receiver-a");
  assert.equal(result.conclusion.officerSupplyServiceNecessary, true);
  assert.equal(result.conclusion.providerSelectedByDerivation, false);
  assert.equal(result.standing, "locally-derived");
  assert.equal(result.authority.centralAssignment, false);
  assert.equal(result.authority.conveysIncumbency, false);
});

test("a current qualified receiver-recognized incumbent closes the local supply need", () => {
  const office = { id: "operations-officer", owner: "receiver-a", digest: evidence("office-epoch") };
  const result = deriveLocalAcademyNecessity(localSituation({
    office,
    currentIncumbencies: [{ office, standing: "current", receiverRecognized: true, receiverInducted: true, characterQualifiedForOfficeEpoch: true }]
  }));
  assert.equal(result.conclusion.officerSupplyServiceNecessary, false);
  assert.equal(result.standing, "not-needed");
});

test("an Academy or EO offer cannot impersonate receiver-local necessity", () => {
  assert.throws(() => deriveLocalAcademyNecessity(localSituation({ actor: "union-officer-academy" })), /only the receiver/);
  assert.throws(() => deriveLocalAcademyNecessity(localSituation({ evidenceAuthorship: "provider-observation" })), /receiver-local/);
  assert.throws(() => deriveLocalAcademyNecessity(localSituation({ contract: { provider: "union-officer-academy", consumer: "receiver-a", admittedByReceiver: false } })), /not a receiver-admitted contract/);
});

test("demand gluing counts local attestations but never upgrades provider observations", () => {
  const attestation = deriveLocalAcademyNecessity(localSituation({
    contract: { id: "receiver-a-uoa", provider: "union-officer-academy", consumer: "receiver-a", admittedByReceiver: true }
  }));
  const cover = glueAcademyDemand({
    attestations: [attestation],
    providerObservations: [{ type: "Offer", actor: "executive-office", target: "receiver-b" }]
  });
  assert.equal(cover.counts.receiverLocalAttestations, 1);
  assert.equal(cover.counts.receiverAwardedAcademy, 1);
  assert.equal(cover.counts.providerObservations, 1);
  assert.equal(cover.counts.providerObservationsCountedAsReceiverDemand, 0);
  assert.deepEqual(cover.receiversNeedingOfficerSupply, ["receiver-a"]);
});

test("local necessity publishes a provider-neutral lot before any Academy bid", () => {
  const attestation = deriveLocalAcademyNecessity(localSituation());
  const lot = publishOfficerSupplyLot(attestation, { market: "urn:market:test", selectionCriteria: ["exact qualification"] });
  assert.equal(lot.type, "Offer");
  assert.equal(lot.actor, "receiver-a");
  assert.equal(lot.object.providerNeutral, true);
  assert.equal(lot.object.selectedProvider, null);
  assert.ok(lot.object.receiverKeeps.includes("award"));
});

test("Academy earns eligibility by bidding disclosed recursively contracted capacity", () => {
  const attestation = deriveLocalAcademyNecessity(localSituation());
  const lot = publishOfficerSupplyLot(attestation, { market: "urn:market:test", selectionCriteria: ["exact qualification"] });
  const bid = prepareAcademySupplyBid(lot, {
    characterCandidate: "test-character",
    qualification: "urn:qualification:test",
    agreement: "urn:agreement:test",
    supplierContracts: [{ provider: "context-supplier", capability: "complete-context", contract: "urn:contract:test" }]
  });
  assert.equal(bid.type, "Offer");
  assert.equal(bid.object.awardStatus, "not-awarded");
  assert.equal(bid.object.recursivelyProcuredCapacity.assignedByHeadquarters, false);
  assert.equal(bid.object.recursivelyProcuredCapacity.supplierContracts.length, 1);
  const award = admitOfficerSupplyAward({
    lotActivity: lot,
    bidActivity: bid,
    receiver: "receiver-a",
    contract: { provider: "union-officer-academy", consumer: "receiver-a", admittedByReceiver: true }
  });
  assert.equal(award.type, "Accept");
  assert.equal(award.object.conveysIncumbency, false);
});

test("Academy refuses a preselected lot or a bid without recursive capacity contracts", () => {
  const attestation = deriveLocalAcademyNecessity(localSituation());
  const lot = publishOfficerSupplyLot(attestation, { market: "urn:market:test", selectionCriteria: ["exact qualification"] });
  const capacity = { characterCandidate: "character", qualification: "qualification", supplierContracts: [{ provider: "supplier", capability: "context", contract: "contract" }] };
  assert.throws(() => prepareAcademySupplyBid({ ...lot, object: { ...lot.object, selectedProvider: "union-officer-academy" } }, capacity), /provider-neutral, unawarded/);
  assert.throws(() => prepareAcademySupplyBid(lot, { characterCandidate: "character", qualification: "qualification", supplierContracts: [] }), /recursive supplier contracts/);
});
