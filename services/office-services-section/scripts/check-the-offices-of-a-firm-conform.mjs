#!/usr/bin/env node
// Checks every office spec in a pool against emsenn/term/office, and checks the
// edges between them resolve. An office whose superior does not name it back in
// presides-over is a claim, not a seat, so the graph check is not decoration:
// it is the half of conformance that validation alone cannot see.

import { readFileSync, readdirSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

// Resolve from the settlement membrane this projected skill sits beneath.
// The old fixed seven-level climb now lands at board-of-directors/ after the
// skill gained its directory projection, causing every canonical path below
// to be duplicated. Five levels reach executive-office; six more reach the
// repository root that contains lib/emsenn.
const EXECUTIVE_OFFICE = new URL("../../../../../", import.meta.url).pathname;
const REPO = resolve(EXECUTIVE_OFFICE, "../../../../../..");
const TERM = join(REPO, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas/office.schema.json");
const DUTY_TERM = join(REPO, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas/duty.schema.json");
const WORK_TERM = join(REPO, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas/work.schema.json");
const POOL = process.argv[2] ?? join(REPO, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/offices");
const DUTY_POOL = join(REPO, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/duties");
const WORK_POOL = join(REPO, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/records/works");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(TERM, "utf8")));
const validateDuty = ajv.compile(JSON.parse(readFileSync(DUTY_TERM, "utf8")));
const validateWork = ajv.compile(JSON.parse(readFileSync(WORK_TERM, "utf8")));

const files = readdirSync(POOL).filter((f) => f.endsWith(".json"));
const offices = new Map();
const failures = [];

for (const file of files) {
  const path = join(POOL, file);
  let spec;
  try {
    spec = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    failures.push(`${file}: unreadable — ${e.message}`);
    continue;
  }
  const id = basename(file, ".json");
  offices.set(id, spec);

  if (!validate(spec)) {
    for (const e of validate.errors) {
      failures.push(`${file}: ${e.instancePath || "/"} ${e.message}`);
    }
  }
  // The address carries the id, so a rename that misses one of the two is caught here
  // rather than by a reader noticing.
  if (spec.id !== id) {
    failures.push(`${file}: id is ${spec.id}, expected ${id}`);
  }
}

// Edges must reach a seated office. A dangling edge is the record naming
// something that is not there, which is the disease the apparatus exists against.
const EDGE_KEYS = ["reports-to", "presides-over", "peer-offices", "serves", "served-by", "distinguished-from"];
for (const [id, spec] of offices) {
  for (const key of EDGE_KEYS) {
    const raw = spec[key];
    if (raw === undefined) continue;
    for (const target of Array.isArray(raw) ? raw : [raw]) {
      if (!offices.has(target)) {
        failures.push(`${id}.json: ${key} names '${target}', which is not seated in this pool`);
      }
    }
  }
}

// Every duty an office bears must resolve to a conforming duty spec. An office
// bearing an address that reaches nothing has taken up no obligation, which by
// commissioning-an-office's own standard makes it a claim rather than a seat.
// The works a duty may owe. A duty's `work` names a work and must resolve to
// one: an obligation to do something nobody has defined is an obligation nobody
// can meet.
const works = new Map();
for (const file of readdirSync(WORK_POOL).filter((f) => f.endsWith(".json"))) {
  const path = join(WORK_POOL, file);
  let spec;
  try {
    spec = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    failures.push(`works/${file}: unreadable — ${e.message}`);
    continue;
  }
  const id = basename(file, ".json");
  works.set(id, spec);
  if (!validateWork(spec)) {
    for (const e of validateWork.errors) {
      failures.push(`works/${file}: ${e.instancePath || "/"} ${e.message}`);
    }
  }
  if (spec.id !== id) {
    failures.push(`works/${file}: id is ${spec.id}, expected ${id}`);
  }
}

const duties = new Map();
for (const file of readdirSync(DUTY_POOL).filter((f) => f.endsWith(".json"))) {
  const path = join(DUTY_POOL, file);
  let spec;
  try {
    spec = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    failures.push(`duties/${file}: unreadable — ${e.message}`);
    continue;
  }
  duties.set(`emsenn/duty/${spec.id}`, spec);
  if (!validateDuty(spec)) {
    for (const e of validateDuty.errors) {
      failures.push(`duties/${file}: ${e.instancePath || "/"} ${e.message}`);
    }
  }
  const id = basename(file, ".json");
  if (spec.id !== id) {
    failures.push(`duties/${file}: id is ${spec.id}, expected ${id}`);
  }
  if (spec.work && !works.has(spec.work)) {
    failures.push(`duties/${file}: work names '${spec.work}', which resolves to no work spec`);
  }
}

for (const [id, spec] of offices) {
  for (const address of spec["bears-duty"] ?? []) {
    if (!duties.has(address)) {
      failures.push(`${id}.json: bears-duty names '${address}', which resolves to no duty spec`);
    }
  }
}

// The superior must name the subordinate back. One-way hierarchy is how a
// roster comes out correct only because someone chose to be careful.
for (const [id, spec] of offices) {
  const up = spec["reports-to"];
  if (typeof up !== "string") continue;
  const superior = offices.get(up);
  if (!superior) continue;
  if (!(superior["presides-over"] ?? []).includes(id)) {
    failures.push(`${id}.json: reports-to '${up}', but ${up} does not name it in presides-over`);
  }
}

if (failures.length) {
  console.error(`FAIL — ${failures.length} finding(s) across ${files.length} office(s) and ${duties.size} duty(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`PASS — ${files.length} office(s), ${duties.size} duty(s), ${works.size} work(s) conform; every edge, borne duty, and owed work resolves.`);
