import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { observeRecordImprovement, ACTOR } from "../src/observe.mjs";
import { formRecordImprovementOpportunity } from "../../sovereign-improvement-board-service/src/record-opportunity.mjs";
import { ACTOR as SUPPLIER, CONTEXT, bidForGameOffer, record } from "../../../../../../../../561-group/services/red-cup-engineering/services/software-development-services-section/services/improvement-game-design-supplier/src/supplier.mjs";

const digest = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
function request(territory) { return { type: "RecordImprovementObservationRequest", customer: "urn:ame:executive-office:sovereign-improvement-board-service", territory, findingClass: "missing-description", path: "record.md", maximumBytes: 4096, expectedTicks: 8, protectedOracleEnvelope: { type: "ProtectedOracleImprovementGameEnvelope", customer: "urn:ame:executive-office:sovereign-improvement-board-service", territory, requestedChanges: ["add description"], ownedTargetRoots: ["content"], forbiddenRoots: ["test"], sourceDigests: [digest], acceptanceArtifacts: [{ path: "test/oracle.mjs", digest }], acceptanceCommands: [{ runner: "node", argv: ["--test", "test/oracle.mjs"] }], economy: { baselinePerTick: { amount: 8, unit: "premium-tokens" }, maximumAcceptedPerTick: { amount: 1, unit: "premium-tokens" }, expectedTicks: 8, baselineArtifacts: [{ path: "test/baseline.json", digest }] }, resourceCeilings: { runtimeMs: 1000, maximumFiles: 2, maximumBytes: 4096 }, productContract: { type: "RecordDescription", requiredFields: ["description"], prohibitedFields: ["network"], bindingFields: ["source"], validationChecks: ["customer-oracle"] }, requiredCapabilities: ["software-engineering", "json-schema-output"], taskClass: "record-description" } }; }

test("one exact missing field becomes an inference-free source-bound finding", () => {
  const territory = mkdtempSync(join(tmpdir(), "record-observation-")); writeFileSync(join(territory, "record.md"), "---\ntitle: Example\n---\n# Example\n");
  const finding = observeRecordImprovement(request(territory));
  assert.equal(finding.type, "RecordImprovementFinding"); assert.equal(finding.provider, ACTOR); assert.equal(finding.findingClass, "missing-description"); assert.match(finding.contentDigest, /^sha256:[0-9a-f]{64}$/u); assert.equal(finding.inferenceCalls, 0);
  const opportunity = formRecordImprovementOpportunity(finding, { denomination: "relative-resolution-milliquanta-v1", minimumBounty: 5, maximumBounty: 31, recordOpportunity: { enabled: true, inquiryBudget: { amount: 9, unit: "relative-resolution-milliquanta-v1" } } });
  assert.equal(opportunity.sensor.provider, ACTOR); assert.equal(opportunity.inquiryBudget.amount, 9);
  const lot = record({ type: "ImprovementGameDesignWorkLot", consumer: finding.customer, opportunity: opportunity.id, sourceObservation: opportunity, gameTerms: { requiredCapabilities: opportunity.requiredCapabilities, territory, customerMutationAuthorized: false, implementationAuthorized: false, oracleAuthorshipAuthorized: false, upwardEscalationAuthorized: false } });
  const quote = record({ type: "ImprovementGameBuyerQuote", lot: lot.id, tick: 1, consideration: { amount: 7, unit: "relative-resolution-milliquanta-v1" } });
  const bid = bidForGameOffer(record({ "@context": CONTEXT, type: "Offer", actor: finding.customer, target: "public", object: lot, attachment: [quote] }), { minimumAsk: { amount: 6, unit: "relative-resolution-milliquanta-v1" }, capabilities: ["software-engineering", "json-schema-output"], maximumConcurrentLots: 1 });
  assert.equal(bid?.actor, SUPPLIER);
});
test("present fields, symlinks, and path escape remain typed non-work residues", () => {
  const territory = mkdtempSync(join(tmpdir(), "record-observation-")); writeFileSync(join(territory, "record.md"), "---\ndescription: present\n---\n");
  assert.equal(observeRecordImprovement(request(territory)).reason, "declared-frontmatter-field-is-present");
  symlinkSync(join(territory, "record.md"), join(territory, "link.md")); assert.equal(observeRecordImprovement({ ...request(territory), path: "link.md" }).reason, "named-record-is-not-a-regular-markdown-file");
  assert.equal(observeRecordImprovement({ ...request(territory), path: "../outside.md" }).reason, "unsupported-or-unbounded-record-class");
});
