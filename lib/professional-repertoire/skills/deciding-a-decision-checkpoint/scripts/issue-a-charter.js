#!/usr/bin/env node
// issue-a-charter — instantiate a charter (任务书): the record of what a go
// decision at the concept checkpoint commits the firm to.
//
// The record shape is the glossary's (emsenn/term/charter), not this script's:
// four commitments — target, boundary, allocation, appraisal — issued to an
// office that must resolve. The whole content of this script is the REFUSAL:
// emitting a charter is trivial; what makes it a charter rather than a wish is
// that its boundary is non-empty, its allocation is bounded, its appraisal is
// stated before anyone knows who it favours, and the office it names exists.
//
// Closure-kind: process. No branching on surprise — every unmet precondition
// exits non-zero with the reason. Same intake produces the same charter.
//
// usage:
//   echo '{"id":"…","name":"…","target":"…","boundary":["…"],
//          "allocation":"…","appraisal":"…","issued-to":"module-lead"}' \
//     | node .../issue-a-charter.js [--dry-run]
//
//   node .../issue-a-charter.js --read <id>     # print a charter, following no chain
//   node .../issue-a-charter.js --in-force <id> # walk the amendment chain to the end
//   node .../issue-a-charter.js --list
//
// Amendment: an intake carrying "amends": "<id>" issues a NEW charter naming
// the old one. Nothing edits a charter in place — a charter edited in place is
// a commitment nobody can afterward prove was made.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const REPO_ROOT = argValue("--root") ?? process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");
const CHARTER_POOL = argValue("--pool") ?? join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/charters");
const TERMS = join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas");

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

function die(message) {
  out({ ok: false, error: message }, 1);
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateCharter = ajv.compile(JSON.parse(readFileSync(join(TERMS, "charter.schema.json"), "utf8")));

// A boundary item that promises instead of excluding. A boundary says what the
// delivery will NOT do; an item that reads as a feature is a target hiding in
// the exclusion list, and a charter whose boundary is secretly more target
// commits the firm to everything twice.
const PROMISE_TELLS = [
  /^(also|additionally|plus|and)\b/iu,
  /\b(will|shall|must|should)\s+(support|provide|include|handle|deliver)\b/iu,
];

// An allocation that does not bound. "Whatever it takes" is the sentence this
// field exists to make impossible to record.
const UNBOUNDED_TELLS = [
  /\b(whatever|unlimited|as (long|much|many) as (it takes|needed|necessary)|open.ended|ongoing|indefinite)\b/iu,
];

// Offices seat in rosters — any offices/ directory in the tree. The same walk
// as the installers', minimal: the charter only needs the office to EXIST.
const SKIP_DIRS = new Set(["node_modules", ".git", ".claude", "dist", "build", "archive", "_archive", "triage", "preservation"]);

function officeSeats(id) {
  const seats = [];
  (function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const child = join(dir, entry.name);
      if (entry.name === "offices") {
        for (const form of [join(child, `${id}.json`), join(child, `${id}.schema.json`), join(child, `${id}.md`), join(child, id, `${id}.md`)]) {
          if (existsSync(form)) seats.push(form);
        }
      } else walk(child);
    }
  })(REPO_ROOT);
  return seats;
}

function charterPath(id) {
  return join(CHARTER_POOL, `${id}.json`);
}

function readCharter(id) {
  const path = charterPath(id);
  if (!existsSync(path)) die(`charter '${id}' seats nowhere in ${relative(REPO_ROOT, CHARTER_POOL)}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function issue() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) die("no data on stdin — a charter is issued from data, never from a conversation");
  let intake;
  try {
    intake = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }

  if (!ID.test(String(intake.id))) die(`id '${intake.id}' is not kebab-case`);

  // The gates, before the schema: the schema checks shape, these check honesty.
  for (const [i, item] of (Array.isArray(intake.boundary) ? intake.boundary : []).entries()) {
    for (const tell of PROMISE_TELLS) {
      if (tell.test(String(item).trim())) {
        die(`boundary[${i}] reads as a promise, not an exclusion: ${JSON.stringify(item)}. `
          + `A boundary says what the delivery will NOT do; a feature hiding in the boundary is a second target.`);
      }
    }
  }
  for (const tell of UNBOUNDED_TELLS) {
    if (tell.test(String(intake.allocation ?? ""))) {
      die(`allocation reads as unbounded: ${JSON.stringify(intake.allocation)}. `
        + `An allocation states what may be spent before the next checkpoint; "whatever it takes" is the sentence this field exists to refuse.`);
    }
  }

  // The office must exist. A charter issued to nobody is a wish.
  const seats = officeSeats(String(intake["issued-to"] ?? ""));
  if (seats.length === 0) {
    die(`issued-to names office '${intake["issued-to"]}', which seats in no roster — a charter issued to nobody is a wish.`);
  }

  // An amendment names a charter that exists, and issues a NEW record.
  if (intake.amends !== undefined) {
    const amendedId = String(intake.amends).replace(/^emsenn\/charter\//, "");
    if (!existsSync(charterPath(amendedId))) {
      die(`amends names charter '${amendedId}', which seats nowhere — an amendment of nothing is an original wearing an amendment's name.`);
    }
    intake.amends = `emsenn/charter/${amendedId}`;
  }

  const record = {
    id: intake.id,
    name: intake.name ?? intake.id.replace(/-/gu, " "),
    target: intake.target,
    boundary: intake.boundary,
    allocation: intake.allocation,
    appraisal: intake.appraisal,
    "issued-to": intake["issued-to"],
    ...(intake.amends ? { amends: intake.amends } : {}),
    "x-provenance": {
      "recorded-by": intake["recorded-by"] ?? "claude/integrated-portfolio-management-team",
      "recorded-on": new Date().toISOString().slice(0, 10),
      ...(intake["decided-at"] ? { "decided-at": intake["decided-at"] } : {}),
    },
  };
  if (!validateCharter(record)) {
    die(`charter does not conform to emsenn/term/charter: `
      + validateCharter.errors.map((e) => `${e.instancePath || "/"} ${e.message}`).join("; "));
  }

  const path = charterPath(intake.id);
  if (existsSync(path)) die(`charter '${intake.id}' already seats at ${relative(REPO_ROOT, path)} — refused, never overwritten. To change it, amend it.`);

  const witness = {
    ok: true,
    issued: { id: intake.id, path: relative(REPO_ROOT, path), "issued-to": intake["issued-to"], "office-record": relative(REPO_ROOT, seats[0]) },
    ...(intake.amends ? { amends: intake.amends } : {}),
  };
  if (DRY_RUN) out({ ...witness, dryRun: true });

  mkdirSync(CHARTER_POOL, { recursive: true });
  writeFileSync(path, JSON.stringify(record, null, 2) + "\n");
  out(witness);
}

function read() {
  out({ ok: true, charter: readCharter(argValue("--read")) });
}

// The newest charter in an amendment chain is the one in force. Walked from
// the named charter FORWARD: any charter whose `amends` points at the current
// head supersedes it. Two charters amending the same head is a contradiction,
// named rather than resolved.
function inForce() {
  const start = argValue("--in-force");
  readCharter(start); // must exist
  let head = `emsenn/charter/${start}`;
  const chain = [head];
  for (;;) {
    const successors = readdirSync(CHARTER_POOL)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(join(CHARTER_POOL, f), "utf8")))
      .filter((c) => c.amends === head);
    if (successors.length === 0) break;
    if (successors.length > 1) {
      die(`charters ${successors.map((c) => `emsenn/charter/${c.id}`).join(" and ")} both amend ${head} — two commitments in force at once is a contradiction to route, not a tie to break.`);
    }
    head = `emsenn/charter/${successors[0].id}`;
    chain.push(head);
  }
  out({ ok: true, "in-force": readCharter(basename(head)), chain });
}

function list() {
  if (!existsSync(CHARTER_POOL)) out({ ok: true, charters: [] });
  out({
    ok: true,
    charters: readdirSync(CHARTER_POOL)
      .filter((f) => f.endsWith(".json"))
      .map((f) => basename(f, ".json")),
  });
}

if (argValue("--read")) read();
else if (argValue("--in-force")) inForce();
else if (process.argv.includes("--list")) list();
else issue();
