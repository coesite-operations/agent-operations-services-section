#!/usr/bin/env node
// commission-an-office — seat or retire an office spec in the firm's pool.
//
// The pool is lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/offices, and a record in it is a
// canonical office spec conforming to emsenn/term/office. This script parses
// and emits JSON itself and depends on no experimental software: the prior
// generation drove MetroPlat's markdown codec against a roster that no longer
// exists, and an act that cannot run is not an act the firm holds.
//
// Closure-kind: process. No branching on surprise — every unmet precondition
// exits non-zero with the reason. Same inputs produce the same record.
//
// A commission is refused unless the intake articulates the office itself:
// normative-structure (what it answers for), deontic-profile (the works it
// governs, each mapped to duty | liberty | deontic-power | deontic-immunity),
// and theory-basis (what the structure is derived from). This is not
// bureaucracy; it is the term's own gate. No office can be created without
// articulating what it governs, and an office with no theory basis was not
// derived — it was asserted. A scaffold with plausible filler would pass the
// schema and still be the failure the gate exists to catch, so there is no
// scaffold: the caller supplies the spec, whole.
//
// usage:
//   cat office.json | commission-an-office.js [--root <repo-root>] [--dry-run]
//   commission-an-office.js --decommission <slug> --succeeded-by <slug>
//        [--root <repo-root>] [--dry-run]

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const REPO_ROOT = argValue("--root") ?? process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");
const POOL = join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/offices");
const TERM = join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas/office.schema.json");
const CHECKER = join(
  REPO_ROOT,
  "lib/emsenn/services/561-group/services/coesite-operations/services/coesite-agent-services-section/lib/professional-repertoire/skills/checking-the-offices-of-a-firm-conform/scripts/check-the-offices-of-a-firm-conform.mjs",
);

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function die(message) {
  console.error(`commission-an-office: ${message}`);
  process.exit(1);
}

function readPool() {
  const offices = new Map();
  for (const file of readdirSync(POOL).filter((f) => f.endsWith(".json"))) {
    try {
      offices.set(basename(file, ".json"), JSON.parse(readFileSync(join(POOL, file), "utf8")));
    } catch (e) {
      die(`${file} is unreadable (${e.message}) — the pool must be whole before it is changed`);
    }
  }
  return offices;
}

function writeRecord(id, spec) {
  writeFileSync(join(POOL, `${id}.json`), JSON.stringify(spec, null, 2) + "\n");
}

// The postcondition, checked rather than assumed: the whole pool conforms and
// every edge, borne duty, and owed work resolves. The checker is the firm's
// own instrument; if the two ever disagree, the checker is what the firm reads.
function proveTheGraph() {
  const result = execFileSync("node", [CHECKER], { cwd: REPO_ROOT, stdio: "pipe", encoding: "utf8" });
  return result.trim();
}

function commission() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) die("no spec on stdin — an office is commissioned from a spec, never from a conversation");
  let spec;
  try {
    spec = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(readFileSync(TERM, "utf8")));
  if (!validate(spec)) {
    die(
      "the spec does not conform to emsenn/term/office — refused before writing, not after:\n" +
        validate.errors.map((e) => `  ${e.instancePath || "/"} ${e.message}`).join("\n"),
    );
  }

  const id = String(spec.id ?? "");
  if (!id) die("the record carries no id — an office instance is addressed by its bare kebab id");

  const offices = readPool();
  if (offices.has(id)) die(`office '${id}' already seats in the pool — refused, never overwritten`);

  // Every office the spec names must already be seated. An edge to a seat
  // that does not exist is a claim, not a commission.
  const EDGE_KEYS = ["reports-to", "presides-over", "peer-offices", "serves", "served-by", "distinguished-from"];
  for (const key of EDGE_KEYS) {
    const raw = spec[key];
    if (raw === undefined) continue;
    for (const target of Array.isArray(raw) ? raw : [raw]) {
      if (!offices.has(target)) die(`${key} names '${target}', which is not seated in the pool`);
    }
  }

  const superiorId = typeof spec["reports-to"] === "string" ? spec["reports-to"] : null;
  const superior = superiorId ? offices.get(superiorId) : null;
  const needsEdge = superior && !(superior["presides-over"] ?? []).includes(id);

  if (DRY_RUN) {
    console.log(`--- would seat ${relative(REPO_ROOT, join(POOL, `${id}.json`))}`);
    if (needsEdge) console.log(`--- would patch ${superiorId}: presides-over += ${id}`);
    return;
  }

  writeRecord(id, spec);
  // The reciprocal edge is half of what makes this a seat: an office nobody
  // presides over is a claim. Patched here, never left for someone careful.
  if (needsEdge) {
    superior["presides-over"] = [...(superior["presides-over"] ?? []), id];
    writeRecord(superiorId, superior);
  }

  console.log(proveTheGraph());
  console.log(`commissioned ${id}${superiorId ? ` under ${superiorId}${needsEdge ? ` (presides-over += ${id})` : " (already named it)"}` : ""}`);
}

function decommission(id) {
  const offices = readPool();
  const spec = offices.get(id);
  if (!spec) die(`office '${id}' is not in the pool — nothing to decommission`);
  if (spec.status === "decommissioned") die(`office '${id}' is already decommissioned`);

  const successor = argValue("--succeeded-by")
    ?? die("--succeeded-by <slug> is required — an office is not retired until what it held has somewhere to go");
  if (!offices.has(successor)) die(`--succeeded-by '${successor}' names no seated office`);

  // Refuse while anything still points at it, naming each referrer. An office
  // deleted while records name it has not been decommissioned — it is hidden.
  const EDGE_KEYS = ["reports-to", "presides-over", "peer-offices", "serves", "served-by", "distinguished-from"];
  const referrers = [];
  for (const [otherId, other] of offices) {
    if (otherId === id) continue;
    for (const key of EDGE_KEYS) {
      const raw = other[key];
      if (raw === undefined) continue;
      const targets = Array.isArray(raw) ? raw : [raw];
      if (targets.includes(id)) referrers.push(`${otherId}.${key}`);
    }
  }
  if (referrers.length) {
    die(`refused: ${referrers.length} edge(s) still name '${id}' — retract them first:\n  ${referrers.join("\n  ")}`);
  }

  if (DRY_RUN) {
    console.log(`--- would mark ${id}: status decommissioned, succeeded-by ${successor}`);
    return;
  }

  // Decommissioning does not delete. The record persists and says what became
  // of what it held; a roster that forgets its retired offices cannot say why
  // the work moved. The record is what persists; the incumbency is what ends.
  spec.status = "decommissioned";
  spec["succeeded-by"] = successor;
  writeRecord(id, spec);

  console.log(proveTheGraph());
  console.log(`decommissioned ${id}, succeeded by ${successor}`);
}

const target = argValue("--decommission");
if (target) decommission(target);
else commission();
