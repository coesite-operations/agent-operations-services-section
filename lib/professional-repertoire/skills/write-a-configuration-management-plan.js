#!/usr/bin/env node
/**
 * @description Produces and validates a configuration management plan in the IEEE 828 shape — configuration identification (stable identity per item, version labels, baseline identities), baselining with a named canonizing authority, one change-control path with no deviation state between defect and amendment, status accounting, and audits of the record against the plan. Default mode validates a document's mechanizable rules — identification block; configuration-identification, baselining, change-control, status-accounting, and audit sections present; a baselining authority named; an amendment path stated — and prints the refusals that resist mechanization as the unmechanized remainder. --scaffold emits a skeleton. Use when a document set's identification scheme, baselining rule, and amendment path must move from folklore into one plan, or when a documentation plan is holding the identification scheme on loan and the CM plan that takes it is owed.
 *
 * @param {string} scaffold - The target path does not already exist, since a scaffold never overwrites a document.
 * @returns {object} every mechanizable genre rule was checked and reported with FULL or PARTIAL coverage, and the exit code derives from the checks, never from an assertion.
 * @returns {object} the refusals that resist mechanization were printed as the unmechanized remainder, so a green run states what it did not check.
 * @throws {Error} Refuses unless, in default mode, the given path names a markdown document that exists.
 *
 * The CM plan is where a document set's mechanics live: what a thing's name
 * is, when a draft becomes binding, through what door a change enters, where
 * the record of versions is kept, and how the record is checked against the
 * plan. IEEE 828 delegates the identification scheme here — which is why a
 * documentation plan holds it only on loan — and the plan's one enemy is the
 * exception: the renumbered section, the expedited change, the baseline
 * nobody remembers authorizing.
 *
 * ## What a CM plan contains
 *
 * 1. **Identification.** Title, IRI identifier, version, status, date,
 *    owning office.
 * 2. **Configuration identification.** The ID scheme: a stable identity per
 *    item that survives reorganization, version labels, and baseline
 *    identities — content-addressed where the substrate supports it, since
 *    a content hash cannot drift from what it names.
 * 3. **Baselining.** What makes a draft binding, and who canonizes — the
 *    authority named, not implied. A baseline nobody authorized is a draft
 *    with confidence.
 * 4. **Change control.** The amendment path: who drafts, who reviews, who
 *    baselines. No deviation state between defect and amendment — a text is
 *    right, or it is wrong and an amendment is owed; there is no third
 *    status where it is wrong but tolerated.
 * 5. **Status accounting.** Where the record of versions, baselines, and
 *    pending amendments lives, so "which version is binding?" is a lookup.
 * 6. **Audits.** How conformance of the record to this plan is checked, and
 *    on what occasions.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **An identification scheme that renumbers on reorganization** — refused.
 *   A section number is a location, not a name; a name that moves breaks
 *   every citation that used it.
 * - **A change path with an expedited lane** — refused. A process amended at
 *   the point of use is not a process; the lane exists precisely for the
 *   changes that most needed review.
 * - **Baselining authority left implicit** — refused. If nobody is named,
 *   whoever last edited the file canonized it.
 * - **Version labels that imply maturity the status field contradicts** —
 *   refused. Two fields telling two stories teach the reader to trust neither.
 *
 * ## Run it
 *
 * ```sh
 * node .../write-a-configuration-management-plan.js path/to/cm-plan.md
 * node .../write-a-configuration-management-plan.js --scaffold path/to/new.md
 * ```
 *
 * A fresh scaffold does not validate — its placeholders fail the checks on
 * purpose, so an unfilled skeleton cannot pass as a plan.
 *
 * ## When NOT to use
 *
 * - Not for which documents exist and who owns them — that is the
 *   documentation plan's inventory.
 * - Not for deciding a contested change — the plan writes the door the
 *   change goes through; it does not decide what comes through it.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SCAFFOLD = argValue("--scaffold");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}
const die = (message) => out({ ok: false, error: message }, 1);

// ── the mechanizable rules ──────────────────────────────────────────────────

const UNMECHANIZED = [
  "an identification scheme that renumbers on reorganization — a section number is a location, not a name, and only a reader can tell which the scheme hands out",
  "an expedited lane hiding in the change path — euphemisms for 'expedited' are unbounded, and a lane can be written as an exception clause anywhere in the plan",
  "version labels that imply maturity the status field contradicts — grading label against status takes reading both as claims",
  "whether the named baselining authority is a real office with the power to canonize, rather than a title nobody holds",
];

function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---/u.exec(text);
  if (!m) return null;
  const map = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([A-Za-z0-9-]+):\s*(.*)$/u.exec(line);
    if (kv) map[kv[1]] = kv[2].trim().replace(/^"(.*)"$/u, "$1");
  }
  return map;
}
const heading = (text, re) => text.split("\n").some((l) => /^#{1,6}\s/u.test(l) && re.test(l));

/** The body of the first section whose heading matches, up to the next heading of the same or higher level. */
function section(text, re) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = /^(#{1,6})\s/u.exec(lines[i]);
    if (m && re.test(lines[i])) {
      const level = m[1].length;
      const body = [];
      for (let j = i + 1; j < lines.length; j++) {
        const n = /^(#{1,6})\s/u.exec(lines[j]);
        if (n && n[1].length <= level) break;
        body.push(lines[j]);
      }
      return body.join("\n");
    }
  }
  return null;
}

function validate(path) {
  if (!path) die("name a document to validate, or pass --scaffold <path>");
  const abs = resolve(path);
  if (!existsSync(abs)) die(`no document at ${abs}`);
  const text = readFileSync(abs, "utf8");
  const fm = frontmatter(text);

  const checks = [];
  const check = (id, coverage, notCovered, fn) => {
    const r = fn();
    checks.push({ check: id, coverage, ok: r === true, ...(r === true ? {} : { failure: r }), "does-not-cover": notCovered });
  };
  const field = (key, test, why) =>
    check(`identification: ${key}`, "FULL", "that the value is true — a well-formed lie passes", () => {
      if (!fm) return "no frontmatter to read it from";
      const v = fm[key];
      if (v === undefined || v === "") return `frontmatter carries no '${key}'`;
      return test(v) ? true : `'${key}: ${v}' ${why}`;
    });

  check("identification: frontmatter block present", "FULL", "nothing — a block is present or it is not",
    () => (fm ? true : "no YAML frontmatter opens the document"));
  field("title", (v) => v.length > 0, "is empty");
  field("identifier", (v) => /^https?:\/\/\S+$/u.test(v), "is not an IRI — identity is an address, not a phrase");
  field("version", (v) => v.length > 0, "is empty");
  field("status", (v) => v.length > 0, "is empty");
  field("date-created", (v) => /^\d{4}-\d{2}-\d{2}$/u.test(v), "is not an ISO 8601 date");
  field("owning-office", (v) => v.length > 0, "is empty — an unowned document rots");
  check("identification: an Identification section exists", "FULL", "that its table agrees with the frontmatter",
    () => (heading(text, /identification/iu) ? true : "no heading names Identification"));

  const must = (label, re, why, notCovered) =>
    check(label, "FULL", notCovered, () => (heading(text, re) ? true : why));

  must("a configuration-identification section exists", /configuration identification|identification scheme/iu,
    "no configuration-identification section — the ID scheme is the plan's first job, and IEEE 828 delegates it here",
    "that the scheme's identities actually survive reorganization");
  must("a baselining section exists", /baselin/iu,
    "no baselining section — without one, a draft becomes binding by being circulated",
    "that the stated rule is the one actually practiced");
  must("a change-control section exists", /change control/iu,
    "no change-control section — changes will still happen; they will just happen wherever the editor is",
    "an expedited lane written as an exception clause elsewhere");
  must("a status-accounting section exists", /status accounting/iu,
    "no status-accounting section — 'which version is binding?' must be a lookup, and this is where the lookup lives",
    "that the named record location exists and is current");
  must("an audits section exists", /audit/iu,
    "no audits section — a plan nobody checks the record against is a preference",
    "that audits are performed, or ever have been");

  check("the baselining section names its authority", "PARTIAL",
    "that the named authority is a real office with the power — a plausible title passes",
    () => {
      const body = section(text, /baselin/iu);
      if (body === null) return "no baselining section to read";
      return /canoniz|authority/iu.test(body) ? true
        : "the baselining section never says who canonizes — authority left implicit means whoever last edited the file";
    });

  check("an amendment path is stated", "PARTIAL",
    "who actually holds each role, and whether a second path exists in practice",
    () => (/amendment/iu.test(text) ? true
      : "the plan never mentions an amendment path — a text is right, or wrong and an amendment is owed; there is no third state"));

  const failed = checks.filter((c) => !c.ok);
  out({
    ok: failed.length === 0,
    skill: "writing-a-configuration-management-plan",
    document: abs,
    verdict: failed.length === 0
      ? "the mechanizable rules hold — which is not the same as the genre holding; read the unmechanized remainder"
      : `${failed.length} mechanizable rule(s) do not hold`,
    checks,
    unmechanized: UNMECHANIZED,
  }, failed.length === 0 ? 0 : 1);
}

// ── the scaffold ────────────────────────────────────────────────────────────

const SKELETON = `---
title: "{system} configuration management plan"
identifier: https://{domain}/docs/configuration-management-plan
date-created: YYYY-MM-DD
type: plan
version: 0.1.0-draft
status: drafted-for-review
subject: The identification scheme, baselining rule, change control, status accounting, and audits for the {system} document set
owning-office: "{office}"
---

# {system} configuration management plan

This plan carries the mechanics of the {system} controlled document set, in the IEEE 828 shape: identity, baselining, change control, status accounting, and audits. The documentation plan's inventory says which documents exist; this plan says how each is named, when its text becomes binding, and through what door it changes.

## 1. Identification

| Field | Value |
|---|---|
| Title | {system} configuration management plan |
| Identifier | https://{domain}/docs/configuration-management-plan |
| Version | 0.1.0-draft |
| Status | Drafted for review — not baselined; not binding |
| Date of issue | YYYY-MM-DD |
| Owning office | {office} |

## 2. Configuration identification

{The ID scheme, taken over from the documentation plan that held it on loan: a stable identity per item that survives reorganization; version labels; baseline identities — content-addressed where the substrate supports it.}

## 3. Baselining

{What makes a draft binding. The canonizing authority, named: the office that baselines, not a circulation that hardens into one.}

## 4. Change control

{The amendment path: who drafts, who reviews, who baselines. One path, no expedited lane. No deviation state between defect and amendment — a text is right, or it is wrong and an amendment is owed.}

## 5. Status accounting

{Where the record of versions, baselines, and pending amendments lives, so "which version is binding?" is a lookup.}

## 6. Audits

{How conformance of the record to this plan is checked, and on what occasions.}
`;

function scaffold(path) {
  const abs = resolve(path);
  if (existsSync(abs)) die(`${abs} already exists — a scaffold never overwrites a document`);
  writeFileSync(abs, SKELETON);
  out({ ok: true, scaffolded: abs, note: "a fresh scaffold does not validate — its placeholders fail the checks on purpose; fill it, then run the validator" });
}

if (SCAFFOLD) scaffold(SCAFFOLD);
else validate(process.argv[2]);
