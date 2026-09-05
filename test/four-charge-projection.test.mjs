import test from "node:test";
import assert from "node:assert/strict";

import {
  CHARGES,
  OPERATIONAL_READOUT_NAMES,
  chargeOfOperationalReadout,
  chargeOfStatus,
  deriveChargingFacts,
  joinCharge,
  operationalReadoutOfCharge,
  statusOfCharge,
} from "../lib/professional-repertoire/skills/lib/four-charge-projection.js";

test("Articulating.Corner/Charge has the exact Lean-owned four statuses", () => {
  const expected = {
    absurd: [false, false],
    potential: [true, false],
    active: [false, true],
    stable: [true, true],
  };
  assert.deepEqual(CHARGES, Object.keys(expected));
  for (const charge of CHARGES) {
    assert.deepEqual(statusOfCharge(charge), expected[charge]);
    assert.equal(chargeOfStatus(...expected[charge]), charge);
  }
});

test("the operational vocabulary is an explicit bijection in both directions", () => {
  assert.equal(OPERATIONAL_READOUT_NAMES.length, CHARGES.length);
  assert.equal(new Set(OPERATIONAL_READOUT_NAMES).size, CHARGES.length);
  for (const charge of CHARGES) {
    assert.equal(chargeOfOperationalReadout(operationalReadoutOfCharge(charge)), charge);
  }
  for (const name of OPERATIONAL_READOUT_NAMES) {
    assert.equal(operationalReadoutOfCharge(chargeOfOperationalReadout(name)), name);
  }
  assert.throws(() => operationalReadoutOfCharge("unknown"), /outside its four-element carrier/);
  assert.throws(() => chargeOfOperationalReadout("absurd"), /outside its four-element carrier/);
});

test("knowledge join is pairwise boolean OR with its finite semilattice laws", () => {
  for (const a of CHARGES) {
    assert.equal(joinCharge("absurd", a), a);
    assert.equal(joinCharge(a, a), a);
    for (const b of CHARGES) {
      assert.equal(joinCharge(a, b), joinCharge(b, a));
      for (const c of CHARGES) {
        assert.equal(joinCharge(joinCharge(a, b), c), joinCharge(a, joinCharge(b, c)));
      }
    }
  }
  assert.equal(joinCharge("potential", "active"), "stable");
});

test("all three readouts share one canonical ground-fact derivation", () => {
  const facts = deriveChargingFacts({
    movements: [
      { kind: "assistant", "session-id": "s", "turn-index": 2, "tool-acts": [{ name: "ok" }, { name: "bad", errored: true }] },
      { kind: "user", "session-id": "ignored", "turn-index": 0, "tool-acts": [{ name: "ignored" }] },
    ],
    anomalies: [{ at: "c", "observed-by": "o" }],
    tasks: [{ id: "t", goal: ["pass", "fail", "unrecorded"], "x-provenance": { "at-declaration": { pass: 0, fail: 1 } } }],
    requirementEvents: [
      { kind: "distributed", requirement: "pending", "recorded-by": "d" },
      { kind: "distributed", requirement: "done", "recorded-by": "d" },
      { kind: "attested", requirement: "done", "recorded-by": "a" },
    ],
  });

  assert.deepEqual(facts.map(({ cell, charge, source }) => ({ cell, charge, source })), [
    { cell: "act:s-2-bad", charge: "active", source: "session:s" },
    { cell: "act:s-2-ok", charge: "potential", source: "session:s" },
    { cell: "component:c", charge: "active", source: "office:o" },
    { cell: "requirement:done", charge: "potential", source: "office:a" },
    { cell: "requirement:pending", charge: "absurd", source: "office:d" },
    { cell: "task-goal:t-0", charge: "potential", source: "task:t" },
    { cell: "task-goal:t-1", charge: "active", source: "task:t" },
  ]);
  assert.equal(facts.some(({ charge }) => OPERATIONAL_READOUT_NAMES.includes(charge)), false);
});
