#!/usr/bin/env node
/**
 * @description Produces and validates a documentation plan — an ISO/IEC/IEEE 15289 information-item inventory recording which documents exist or are owed in a controlled set, what each carries, which standard shapes each, who answers for it, the identification scheme they share (held only until a CM plan exists, since IEEE 828 delegates the scheme to CM planning), the migrations owed between documents, and the rule of entry. Default mode validates a document's mechanizable rules — identification block, identification scheme, an inventory whose every row names a governing standard and an owning office, a migration register, a rule of entry — and prints the refusals that resist mechanization as the unmechanized remainder. --scaffold emits a skeleton. Use when a document set needs a controlled inventory so documents enter on the record instead of by accretion, or when content has drifted into the wrong documents and the moves must be planned rather than performed silently.
 * @param {string} scaffold - the target path does not already exist, since a scaffold never overwrites a document
 * @returns {object} every mechanizable genre rule was checked and reported with FULL or PARTIAL coverage, and the exit code derives from the checks, never from an assertion
 * @returns {object} the refusals that resist mechanization were printed as the unmechanized remainder, so a green run states what it did not check
 * @throws {Error} in default mode, the given path names a markdown document that exists
 *
 * The documentation plan is the controlled set's own table of contents, in
 * the sense of ISO/IEC/IEEE 15289: an inventory of information items, each
 * with its shape, its cargo, and its owner. It makes "is this document part
 * of the set?" a lookup instead of an argument, and it is where content in
 * the wrong place is recorded as owed rather than moved quietly. It also
 * holds the set's identification scheme — but only on loan: IEEE 828
 * delegates that scheme to configuration management planning, and the plan
 * says so, holding it exactly until a CM plan exists to take it.
 *
 * ## What a documentation plan contains
 *
 * 1. **Identification.** Title, IRI identifier, version, status, date,
 *    owning office.
 * 2. **The document identification scheme.** The identity rule, version
 *    labels, date convention, and what additionally names a baselined
 *    revision — with the alternatives rejected on the record, and the
 *    hand-off to a future CM plan stated explicitly.
 * 3. **The inventory table.** One row per document: slug/IRI, governing
 *    standard or named house genre, cargo, owning office, status. The
 *    standard column keeps each document a shape instead of a bucket; the
 *    office column is who answers when it is wrong — "when seated" is an
 *    owner with a vacancy, which is enough; a blank is not.
 * 4. **The migration register.** Content in the wrong document and where it
 *    goes, one row per move. The register is the promise, the amendment is
 *    the act, and nothing moves without both.
 * 5. **The rule of entry.** A document enters the inventory by amendment to
 *    this plan first; a document not in the inventory is not in the set.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **A document with no governing standard or house genre** — refused. A
 *   shapeless document absorbs everything near it.
 * - **A document with no owning office** — refused, even provisionally. An
 *   unowned document rots; a "when seated" target is enough.
 * - **An inventory row added without an amendment row** — refused. A
 *   document that slipped in is a silent scope change to the whole set.
 * - **A migration performed without its register entry** — refused. Content
 *   that moves off the record was, as far as the record shows, never anywhere.
 *
 * ## Run it
 *
 * ```sh
 * node .../write-a-documentation-plan.js path/to/documentation-plan.md
 * node .../write-a-documentation-plan.js --scaffold path/to/new.md
 * ```
 *
 * A fresh scaffold does not validate — its placeholders fail the checks on
 * purpose, so an unfilled skeleton cannot pass as a plan.
 *
 * ## When NOT to use
 *
 * - Not for baselining, change control, or status accounting mechanics —
 *   that is the configuration management plan, and the identification
 *   scheme transfers there the day one exists.
 * - Not for the contents of any document in the inventory — the plan says
 *   what each carries, never what it says.
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
  "whether a named governing standard actually shapes the document, or is a label pasted over a bucket",
  "an inventory row added without an amendment row — a silent scope change is caught by diffing revisions, not by reading one",
  "a migration performed without its register entry — the absence of a record is invisible to a single-document check",
  "whether the 'when seated' offices are genuinely planned seats or a way of writing nobody",
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
const cellsOf = (line) => line.trim().replace(/^\|/u, "").replace(/\|$/u, "").split("|").map((c) => c.trim());

function tables(text) {
  const lines = text.split("\n");
  const found = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\s*\|/u.test(lines[i]) && /^\s*\|[\s:|-]+\|\s*$/u.test(lines[i + 1])) {
      const header = cellsOf(lines[i]);
      const rows = [];
      let j = i + 2;
      for (; j < lines.length && /^\s*\|/u.test(lines[j]); j++) rows.push(cellsOf(lines[j]));
      found.push({ header, rows });
      i = j - 1;
    }
  }
  return found;
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

  check("the identification scheme is held or its holder is cited", "PARTIAL",
    "that the scheme's rules are complete, and that the CM-plan hand-off is honored when one exists",
    () => (heading(text, /identification scheme/iu) || /configuration management plan/iu.test(text)
      ? true
      : "no identification-scheme section and no citation of a CM plan that holds it — IEEE 828 delegates the scheme somewhere, and this plan says where"));

  const inventory = tables(text).find((t) =>
    t.header.some((h) => /governing/iu.test(h)) && t.header.some((h) => /owning office/iu.test(h)));

  check("an inventory table exists", "FULL",
    "documents that exist on disk but appear in no row — found by walking the set, not the plan",
    () => (inventory ? true : "no table carries Governing standard and Owning office columns — the inventory is the plan's whole point"));

  if (inventory) {
    const col = (re) => inventory.header.findIndex((h) => re.test(h));
    const doc = col(/document/iu);
    const governing = col(/governing/iu);
    const office = col(/owning office/iu);
    const name = (row, i) => (doc !== -1 && row[doc] ? row[doc] : `row ${i + 1}`);
    const perRow = (label, notCovered, fn) =>
      check(label, "FULL", notCovered, () => {
        const bad = inventory.rows.map((row, i) => (fn(row) ? null : name(row, i))).filter(Boolean);
        return bad.length === 0 ? true : `fails at: ${bad.join(", ")}`;
      });

    perRow("every inventory row names a governing standard or house genre",
      "whether the named standard actually shapes the document",
      (row) => (row[governing] ?? "").length > 0);
    perRow("every inventory row names an owning office",
      "whether the office exists or is genuinely planned",
      (row) => (row[office] ?? "").length > 0);
  }

  check("a migration register exists", "PARTIAL",
    "that every migration listed is real, that none happening is unlisted, and that moves are performed as amendments",
    () => (heading(text, /migration register/iu) ? true : "no migration-register section — content in the wrong document moves silently or not at all without one"));

  check("a rule of entry exists", "PARTIAL",
    "that the rule is followed — amendment-first is checked across revisions, not within one",
    () => (heading(text, /rule of entry/iu) ? true : "no rule-of-entry section — without it, documents enter the set by being written"));

  const failed = checks.filter((c) => !c.ok);
  out({
    ok: failed.length === 0,
    skill: "writing-a-documentation-plan",
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
title: "{system} documentation plan"
identifier: https://{domain}/docs/documentation-plan
date-created: YYYY-MM-DD
type: plan
version: 0.1.0-draft
status: drafted-for-review
subject: The controlled document set for {system} — its identification scheme, its inventory, the migrations owed between documents, and the rule by which a document enters the set
owning-office: "{office}"
---

# {system} documentation plan

This plan records the information items of the {system} document set, in the sense of ISO/IEC/IEEE 15289: which documents exist or are owed, what each carries, which standard shapes each, and who answers for it. It also records the set's document identification scheme, because IEEE 828 delegates that scheme to configuration management planning and no CM plan yet exists; until one does, this plan holds the scheme.

## 1. Identification

| Field | Value |
|---|---|
| Title | {system} documentation plan |
| Identifier | https://{domain}/docs/documentation-plan |
| Version | 0.1.0-draft |
| Status | Drafted for review — not baselined; not binding |
| Date of issue | YYYY-MM-DD |
| Owning office | {office} |

## 2. Document identification scheme

Normative for every document in the inventory. {The identity rule; the version-label rule; the date convention; what additionally identifies a baselined revision. Record the alternatives rejected, and why.}

## 3. Document inventory

| Document | Slug/IRI | Governing standard | Carries | Owning office (target) | Status |
|---|---|---|---|---|---|
| {Document} | \`{slug}\` | {standard or house genre} | {what it carries} | {office, or "{office} when seated"} | {Planned / Drafted / Active} |

## 4. Migration register

Content that currently lives in the wrong document, and where it goes. Each migration is an amendment under the set's change path; nothing moves silently.

| Content | Currently in | Migrates to |
|---|---|---|
| {content} | {document and section} | {destination document} |

## 5. Rule of entry

A new document enters this inventory by amendment to this plan first; a document not in this inventory is not part of the controlled set.
`;

function scaffold(path) {
  const abs = resolve(path);
  if (existsSync(abs)) die(`${abs} already exists — a scaffold never overwrites a document`);
  writeFileSync(abs, SKELETON);
  out({ ok: true, scaffolded: abs, note: "a fresh scaffold does not validate — its placeholders fail the checks on purpose; fill it, then run the validator" });
}

if (SCAFFOLD) scaffold(SCAFFOLD);
else validate(process.argv[2]);
