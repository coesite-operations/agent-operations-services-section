import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = JSON.parse(readFileSync(new URL("../content/services/pulse-operating-cell-formation.json", import.meta.url), "utf8"));

test("actor-life verbs are optional parameters of the original Coesite service, not mandatory 4x5 staffing", () => {
  assert.equal(source.id, "pulse-operating-cell-formation");
  assert.ok(source.parameterization.optional.includes("actor-life-verb-profile"));
  assert.ok(!source.parameterization.required.includes("actor-life-verb-profile"));
  assert.ok(!Object.hasOwn(source.actorLifeVerbLens, "fourTowers"));
  assert.match(source.actorLifeVerbLens.extends, /NOT by itself an operating cell/u);
  for (const key of ["selected-verb-ref-and-tower-if-established", "favored-tactics-with-source-revision", "current-standing-and-authorization", "epistemic-output-lane", "recipient-and-assay"]) {
    assert.ok(source.actorLifeVerbLens.consumerFields.includes(key));
  }
});

test("reject dream self-certification, unknown compute quotas and forged Academy award", () => {
  const rules = source.actorLifeVerbLens.selectionRules.join("\n");
  assert.match(rules, /no Dream regime may mutate canonical knowledge/i);
  assert.match(rules, /distinct receiving office/u);
  assert.match(rules, /authentic Actor standing/u);
  assert.match(rules, /cohort registration, qualification\/examination/u);
  const refused = source.actorLifeVerbLens.refusalCases.join("\n");
  for (const qualifier of ["source tower or verb unverified", "private residue", "unmetered", "Academy certificate"]) {
    assert.ok(refused.includes(qualifier), qualifier);
  }
});

test("Science, Coesite, Engineering, instance owner and Academy retain distinct custody", () => {
  assert.deepEqual(Object.keys(source.actorLifeVerbLens.ownership), ["science", "coesite", "engineering", "instance", "academy"]);
  assert.match(source.actorLifeVerbLens.independentReceiving, /host\/Actor\/session evidence/u);
});
