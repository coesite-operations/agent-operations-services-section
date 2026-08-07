import assert from "node:assert/strict";
import test from "node:test";
import { ACADEMY_ACTOR, CODEX_ACTOR, shopOfficeRepertoire } from "../src/office-repertoire-market.mjs";

function demand(strategySpace) {
  return { type: "OfficeRepertoireDemand", actor: CODEX_ACTOR, receiver: CODEX_ACTOR, network: "eip155:31337", demand: "urn:test:demand", move: "urn:test:move", strategySpace: { requiredDuties: [], requiredSkills: [], excludedOffices: [], ...strategySpace } };
}

test("one exact strategy-space match becomes an Academy repertoire Offer, never an appointment", async () => {
  const result = await shopOfficeRepertoire(demand({ requiredDuties: ["writing-a-software-architecture-specification"] }));
  assert.equal(result.type, "Offer");
  assert.equal(result.actor, ACADEMY_ACTOR);
  assert.equal(result.target, CODEX_ACTOR);
  assert.equal(result.object.type, "OfficeRepertoireOffer");
  assert.equal(result.object.candidate.id, "system-architect");
  assert.equal(result.object.appointmentAuthority, false);
  assert.equal(result.object.receiverAcceptanceRequired, true);
  assert.equal(result.object.moveScoped, true);
  assert.equal(result.object.incumbency, false);
  assert.ok(result.object.candidate.skills.includes("writing-an-ieee-42010-architecture-description"));
});

test("incomparable matches become an unranked Question", async () => {
  const result = await shopOfficeRepertoire(demand({ requiredDuties: ["reporting-an-anomaly"] }));
  assert.equal(result.type, "Question");
  assert.equal(result.object.type, "ProviderSelectionRequired");
  assert.equal(result.object.ranking, "none");
  assert.ok(result.object.candidates.length > 1);
  assert.equal(result.object.candidate, undefined);
});

test("an absent repertoire becomes witnessed market unavailability", async () => {
  const result = await shopOfficeRepertoire(demand({ requiredDuties: ["nonexistent-duty"] }));
  assert.equal(result.type, "Reject");
  assert.equal(result.object.type, "MarketUnavailable");
  assert.deepEqual(result.object.candidates, []);
});

test("foreign, empty, path-bearing, and free-prose demands fail closed", async () => {
  await assert.rejects(() => shopOfficeRepertoire({ ...demand({ requiredSkills: ["testing"] }), network: undefined }), /network.*customer/u);
  await assert.rejects(() => shopOfficeRepertoire({ ...demand({ requiredSkills: ["testing"] }), actor: "urn:ame:foreign" }), /Bare Cedar Fog/u);
  await assert.rejects(() => shopOfficeRepertoire(demand({})), /at least one/u);
  await assert.rejects(() => shopOfficeRepertoire(demand({ requiredSkills: ["../testing"] })), /canonical identifiers/u);
  await assert.rejects(() => shopOfficeRepertoire(demand({ requiredSkills: ["please choose an architect"] })), /canonical identifiers/u);
});
