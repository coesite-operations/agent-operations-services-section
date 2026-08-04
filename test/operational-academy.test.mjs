import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { operationalChecks, runMape } from "../src/contract-union-formation-mape.mjs";
import { digest, runMember } from "../services/formation-lianqun/services/formation-lianqun-member-runtime-service/src/a2a-mape-member.mjs";
import { verifyOperationalAcademy } from "../src/verify-operational-academy.mjs";

test("Academy advertises its contract CLI bin entries", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.bin["solicit-service"], "./src/contract-union-formation-mape.mjs");
  assert.equal(pkg.bin["invoke-service"], "./src/contract-union-formation-mape.mjs");
  assert.equal(pkg.bin["mape-formation-territory"], "./src/contract-union-formation-mape.mjs");
  assert.equal(pkg.bin["invoke-officer-formation"], "./src/contract-officer-formation.mjs");
});

test("Academy closes a five-member Rendanheyi formation lianqun through receiver value", async () => {
  const result = await verifyOperationalAcademy();
  assert.equal(result.ok, true);
  assert.equal(result.members, 5);
  assert.match(result.qualification, /^urn:sha256:/u);
  assert.match(result.receiverReceipt, /^urn:sha256:/u);
  assert.ok(result.targetDeliveries > 0, "receiver capstone must retain at least one target delivery outcome");
});

test("a blank incumbent cannot mistake missing operating carriers for an Academy", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "non-academy-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const checks = operationalChecks(root);
  assert.equal(checks.every((item) => item.settled === false), true);
  await assert.rejects(() => verifyOperationalAcademy(root), /operational carrier gaps/);
});

test("the A2A 1.0 gate rejects the legacy message/send and kind carrier", () => {
  const legacy = { jsonrpc: "2.0", id: "legacy", method: "message/send", params: { message: { kind: "message", messageId: "legacy", role: "user", parts: [{ kind: "data", data: { type: "FormationMapeStageRequest", stage: "monitor" } }] } } };
  assert.throws(() => runMember("context-compilation-xiaowei", legacy), /A2A 1.0 JSON-RPC SendMessage/);
});

test("Union MAPE binds the exact formation demand and preserves sovereign routing", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "academy-union-mape-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const academy = join(root, "academy");
  const external = join(root, "linguistics");
  const sovereignUnadvertised = join(root, "turntide-islands");
  const unresolved = join(root, "unresolved");
  for (const settlement of [academy, external, sovereignUnadvertised, unresolved]) mkdirSync(join(settlement, "content", "offices"), { recursive: true });
  writeFileSync(join(academy, "package.json"), JSON.stringify({ "x-agentic-metro-enterprise": { "node-id": "union-officer-academy" } }));
  writeFileSync(join(external, "package.json"), JSON.stringify({ "x-agentic-metro-enterprise": { "node-id": "linguistics-services-section" } }));
  writeFileSync(join(sovereignUnadvertised, "package.json"), JSON.stringify({ name: "@turntide-islands/turntide-islands" }));
  writeFileSync(join(sovereignUnadvertised, ".git"), "gitdir: ../.git/modules/turntide-islands\n");
  writeFileSync(join(academy, "content", "offices", "academy-operator.json"), JSON.stringify({ id: "academy-operator" }));
  writeFileSync(join(external, "content", "offices", "semiote.json"), JSON.stringify({ id: "leader-message-semiote" }));
  writeFileSync(join(sovereignUnadvertised, "content", "offices", "sky-desk.json"), JSON.stringify({ id: "sky-desk" }));
  writeFileSync(join(unresolved, "content", "offices", "orphan-office.json"), JSON.stringify({ id: "orphan-office" }));

  const formationDemand = {
    type: "OfficerFormationDemand",
    customer: "urn:ame:leader-movement-team",
    office: { id: "executive-officer-to-the-leader" },
    candidate: { id: "urn:agent:herschel" },
    competencies: [{ id: "MAPE-K-the-Union" }]
  };
  const result = await runMape({
    roots: [root],
    scope: "union-readiness",
    purposes: ["receiver acceptance regression"],
    executionMode: "live"
  }, "urn:activity:receiver-acceptance", "2026-07-18T00:00:00.000Z", { formationDemand, recordTasks: false });

  assert.equal(result.formationDemandDigest, digest(formationDemand));
  assert.equal(result.loop.stages.monitor.evidence.formationDemand.digest, digest(formationDemand));
  assert.equal(result.loop.knowledge.requestDigest, result.requestDigest);
  assert.equal(result.loop.stages.analyze.evidence.findings.some((finding) => finding.office === "academy-operator"), false);
  assert.equal(result.interventionOffers.some((offer) => offer.target === "urn:ame:unowned"), false);
  assert.deepEqual(result.interventionOffers.map((offer) => offer.target), ["urn:ame:linguistics-services-section"]);
  assert.equal(result.interventionOffers[0].object.type, "ReceiverLocalOfficerSupplyNecessityInvitation");
  assert.equal(result.interventionOffers[0].object.providerPreselected, false);
  assert.equal(result.interventionOffers[0].object.authority.authorsReceiverNecessity, false);
  assert.equal(result.interventionOffers[0].object.authority.tendersForReceiver, false);
  assert.equal(result.targetDeliveryOutcomes.length, result.interventionOffers.length);
  assert.equal(result.targetDeliveryOutcomes[0].disposition, "not-deliverable-missing-provider-boundary");
  const skyDesk = result.loop.stages.monitor.evidence.offices.find((office) => office.id === "sky-desk");
  assert.equal(skyDesk.owner, "turntide-islands");
  assert.equal(skyDesk.ownerPackage, "@turntide-islands/turntide-islands");
  assert.equal(skyDesk.ownerAdvertised, false);
  assert.equal(skyDesk.ownerMeshBoundary, true);
  assert.equal(result.loop.stages.analyze.evidence.findings.find((finding) => finding.office === "sky-desk").type, "office-provider-advertisement-required");
  assert.deepEqual(result.coordinationRequired.map((item) => item.office), ["sky-desk", "orphan-office"]);
  assert.equal(result.customerTerritoryMutation, false);
});
