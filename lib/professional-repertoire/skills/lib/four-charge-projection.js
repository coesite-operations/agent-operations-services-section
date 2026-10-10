/**
 * Pure projection of the academy's recorded pool rows into Obsmetrologia
 * `Charge`, definitionally `Articulating.Corner`.
 *
 * The corner names and boolean coordinates below are owned by
 * `Articulation/Articulating/Cell.lean` (`ofStatus`/`toStatus`).  The older
 * management words are deliberately confined to the explicit readout
 * bijection at the bottom of this module; they are not Charge constructors.
 */

export const CHARGES = Object.freeze(["absurd", "potential", "active", "stable"]);

const STATUS_BY_CHARGE = Object.freeze({
  absurd: Object.freeze([false, false]),
  potential: Object.freeze([true, false]),
  active: Object.freeze([false, true]),
  stable: Object.freeze([true, true]),
});

const CHARGE_BY_STATUS = new Map(CHARGES.map((charge) => [STATUS_BY_CHARGE[charge].join(","), charge]));

function requireMember(value, members, label) {
  if (!members.includes(value)) throw new TypeError(`${label} '${value}' is outside its four-element carrier`);
  return value;
}

export function statusOfCharge(charge) {
  return [...STATUS_BY_CHARGE[requireMember(charge, CHARGES, "Charge")]];
}

export function chargeOfStatus(toldTrue, toldFalse) {
  if (typeof toldTrue !== "boolean" || typeof toldFalse !== "boolean") {
    throw new TypeError("Articulating.Corner status coordinates must both be boolean");
  }
  return CHARGE_BY_STATUS.get(`${toldTrue},${toldFalse}`);
}

export function joinCharge(left, right) {
  const [lt, lf] = statusOfCharge(left);
  const [rt, rf] = statusOfCharge(right);
  return chargeOfStatus(lt || rt, lf || rf);
}

export function nonAbsurdCharges(facts) {
  return new Set(facts.map((fact) => fact.charge).filter((charge) => charge !== "absurd"));
}

function entry(value) {
  return value && Object.hasOwn(value, "record") ? value : { record: value };
}

function fact(cell, charge, source, kind, seat) {
  const projected = { cell, charge, source, kind };
  if (seat !== undefined) projected.record = seat;
  return projected;
}

/**
 * Derive the fixed ground-fact projection shared by settlement, gluing, and
 * attention allocation. Inputs are already-admitted pool records (or
 * `{record, seat}` wrappers); this function performs no I/O and mutates none.
 */
export function deriveChargingFacts({
  movements = [],
  anomalies = [],
  tasks = [],
  requirementEvents = [],
} = {}) {
  const facts = [];

  for (const raw of movements) {
    const { record: movement, seat } = entry(raw);
    if (movement.kind !== "assistant") continue;
    for (const act of movement["tool-acts"] ?? []) {
      facts.push(fact(
        `act:${movement["session-id"]}-${movement["turn-index"]}-${act.name}`,
        act.errored ? "active" : "potential",
        `session:${movement["session-id"]}`,
        "movement",
        seat,
      ));
    }
  }

  for (const raw of anomalies) {
    const { record: anomaly, seat } = entry(raw);
    facts.push(fact(
      `component:${anomaly.at}`,
      "active",
      `office:${anomaly["observed-by"]}`,
      "anomaly",
      seat,
    ));
  }

  for (const raw of tasks) {
    const { record: task, seat } = entry(raw);
    const atDeclaration = task["x-provenance"]?.["at-declaration"];
    if (!atDeclaration) continue;
    (task.goal ?? []).forEach((goal, index) => {
      if (!(goal in atDeclaration)) return;
      facts.push(fact(
        `task-goal:${task.id}-${index}`,
        atDeclaration[goal] === 0 ? "potential" : "active",
        `task:${task.id}`,
        "task-goal",
        seat,
      ));
    });
  }

  const admittedRequirementEvents = requirementEvents.map(entry);
  const attestedRequirements = new Set(
    admittedRequirementEvents
      .filter(({ record: event }) => event.kind === "attested")
      .map(({ record: event }) => event.requirement),
  );
  for (const { record: event, seat } of admittedRequirementEvents) {
    const cell = `requirement:${event.requirement}`;
    const source = `office:${event["recorded-by"]}`;
    if (event.kind === "attested") {
      facts.push(fact(cell, "potential", source, "requirement-event", seat));
    } else if (event.kind === "distributed" && !attestedRequirements.has(event.requirement)) {
      facts.push(fact(cell, "absurd", source, "requirement-event", seat));
    }
  }

  return facts.sort((left, right) => {
    const a = `${left.cell}\0${left.source}\0${left.charge}`;
    const b = `${right.cell}\0${right.source}\0${right.charge}`;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

// Compatibility vocabulary for the command-line JSON readout only. This is
// a named bijection, not a second FOUR ontology and not a SEAVT vocabulary.
export const OPERATIONAL_READOUT_NAMES = Object.freeze(["unknown", "held", "denied", "contested"]);

const OPERATIONAL_BY_CHARGE = Object.freeze({
  absurd: "unknown",
  potential: "held",
  active: "denied",
  stable: "contested",
});

const CHARGE_BY_OPERATIONAL = Object.freeze(
  Object.fromEntries(Object.entries(OPERATIONAL_BY_CHARGE).map(([charge, name]) => [name, charge])),
);

export function operationalReadoutOfCharge(charge) {
  return OPERATIONAL_BY_CHARGE[requireMember(charge, CHARGES, "Charge")];
}

export function chargeOfOperationalReadout(name) {
  requireMember(name, OPERATIONAL_READOUT_NAMES, "Operational readout");
  return CHARGE_BY_OPERATIONAL[name];
}
