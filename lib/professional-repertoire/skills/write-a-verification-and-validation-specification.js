#!/usr/bin/env node
/**
 * @description Produces and validates a verification and validation specification in the ISO/IEC/IEEE 29119 shape — a case register where every case names the requirement or element it verifies, its measure, and its kind (executable check, test, inspection, analysis); a coverage statement listing the requirements no case yet reaches; and the honesty rule, under which a green run reports its own blind spots. Default mode validates a document's mechanizable rules — identification block; a case register whose every row names what it verifies, a measure, and a legal kind; a coverage statement present — and prints the refusals that resist mechanization as the unmechanized remainder. --scaffold emits a skeleton. Use when a system's verification must become a register instead of folklore, or when acceptance scenarios are migrating out of an architecture document into the specification that owns them.
 * @param {string} scaffold - the target path does not already exist, since a scaffold never overwrites a document
 * @returns {object} every mechanizable genre rule was checked and reported with FULL or PARTIAL coverage, and the exit code derives from the checks, never from an assertion
 * @returns {object} the refusals that resist mechanization were printed as the unmechanized remainder, so a green run states what it did not check
 * @throws {Error} in default mode, the given path names a markdown document that exists
 *
 * The V&V specification is where "verified" gets its meaning: a register of
 * cases, each naming what it verifies, by what measure, and in what kind.
 * Its load-bearing rule is the honesty rule — a green run reports its blind
 * spots, because a check that reports success without reporting what it does
 * not cover teaches the reader that green means correct, and the gap between
 * "the mechanizable part passed" and "the rule holds" is exactly where
 * failures hide. This validator obeys the rule it checks for: its own green
 * run prints its own remainder.
 *
 * ## What a V&V specification contains
 *
 * 1. **Identification.** Title, IRI identifier, version, status, date,
 *    owning office.
 * 2. **The case register.** One row per scenario or case: the requirement or
 *    element it verifies, cited by ID; its measure — the observable that
 *    decides pass from fail; and its kind — executable check, test,
 *    inspection, or analysis. A case with no measure is pass/fail by taste;
 *    a case citing no requirement tests nothing on the record.
 * 3. **The coverage statement.** Which requirements have no case yet —
 *    recorded, not hidden. A gap listed is work owed; a gap omitted is a
 *    verification the reader believes happened.
 * 4. **The honesty rule.** Stated in the document and obeyed by its checks:
 *    a green run reports what it does not cover.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **A case with no measure** — refused. Pass/fail by taste is not
 *   verification; it is mood with a table row.
 * - **A case citing no requirement** — refused. It tests nothing on the
 *   record, so whatever it demonstrates, the baseline gains nothing.
 * - **Coverage gaps smoothed over instead of listed** — refused. The
 *   register's credibility is bought by its stated holes.
 * - **Conflating "the mechanizable part passed" with "the rule holds"** —
 *   refused. The first is a fact about the checks; the second is a claim
 *   about the world, and the document must never let one wear the other's
 *   clothes.
 *
 * ## Run it
 *
 * ```sh
 * node .../write-a-verification-and-validation-specification.js path/to/vnv.md
 * node .../write-a-verification-and-validation-specification.js --scaffold path/to/new.md
 * ```
 *
 * A fresh scaffold does not validate — its placeholders fail the checks on
 * purpose, so an unfilled skeleton cannot pass as a specification.
 *
 * ## When NOT to use
 *
 * - Not for stating the requirements themselves — that is the SRS; the
 *   register cites its IDs and adds only verification.
 * - Not for the verification approach per requirement class — the SRS names
 *   the approach; this document holds the cases that discharge it.
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
  "coverage gaps smoothed over instead of listed — an omitted gap is invisible to a check that reads only what is present",
  "conflating 'the mechanizable part passed' with 'the rule holds' — this validator is itself only the mechanizable part, and this line is its own blind spot stated",
  "whether a case's measure could actually fail — pass/fail by taste survives any column check if the taste is written down",
  "whether the cited requirement IDs resolve in the SRS — cross-document resolution takes both documents open",
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

const KINDS = /^(executable check|test|inspection|analysis)$/iu;

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

  const register = tables(text).find((t) =>
    t.header.some((h) => /verifies|requirement/iu.test(h)) && t.header.some((h) => /measure/iu.test(h)));

  check("a case register exists", "FULL",
    "cases described in prose outside the register — found by a reader",
    () => (register ? true : "no table carries a verifies/requirement column and a measure column — without the register, 'verified' has no referent"));

  if (register) {
    const col = (re) => register.header.findIndex((h) => re.test(h));
    const caseId = col(/case|id/iu);
    const verifies = col(/verifies|requirement/iu);
    const measure = col(/measure/iu);
    const kind = col(/kind/iu);
    const name = (row, i) => (caseId !== -1 && row[caseId] ? row[caseId] : `row ${i + 1}`);
    const perRow = (label, coverage, notCovered, fn) =>
      check(label, coverage, notCovered, () => {
        const bad = register.rows.map((row, i) => (fn(row) ? null : name(row, i))).filter(Boolean);
        return bad.length === 0 ? true : `fails at: ${bad.join(", ")}`;
      });

    perRow("every case names the requirement or element it verifies", "PARTIAL",
      "whether the cited ID resolves in the SRS or element register",
      (row) => verifies !== -1 && (row[verifies] ?? "").length > 0);
    perRow("every case has a measure", "PARTIAL",
      "whether the measure could actually fail — taste written down passes",
      (row) => measure !== -1 && (row[measure] ?? "").length > 0);
    perRow("every case declares a legal kind", "FULL",
      "whether the declared kind matches how the case is actually performed",
      (row) => kind !== -1 && KINDS.test(row[kind] ?? ""));
  }

  check("a coverage statement exists", "PARTIAL",
    "that the gap list is complete — an omitted gap is exactly what this check cannot see",
    () => (heading(text, /coverage/iu) ? true
      : "no coverage section — the requirements no case yet reaches are recorded, not hidden, and this is where"));

  const failed = checks.filter((c) => !c.ok);
  out({
    ok: failed.length === 0,
    skill: "writing-a-verification-and-validation-specification",
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
title: "{system} verification and validation specification"
identifier: https://{domain}/docs/verification-and-validation-specification
date-created: YYYY-MM-DD
type: verification-and-validation-specification
version: 0.1.0-draft
status: drafted-for-review
subject: The case register for {system} — every case naming what it verifies, its measure, and its kind, with the coverage gaps recorded
owning-office: "{office}"
---

# {system} verification and validation specification

This is the verification and validation specification of the {system} document set, in the ISO/IEC/IEEE 29119 shape: the register that gives "verified" its meaning. Its rule is honesty — a green run reports its blind spots, because a check that reports success without reporting what it does not cover teaches the reader that green means correct.

## 1. Identification

| Field | Value |
|---|---|
| Title | {system} verification and validation specification |
| Identifier | https://{domain}/docs/verification-and-validation-specification |
| Version | 0.1.0-draft |
| Status | Drafted for review — not baselined; not binding |
| Date of issue | YYYY-MM-DD |
| Owning office | {office} |

## 2. Case register

Kind is one of: executable check, test, inspection, analysis.

| Case | Verifies | Measure | Kind |
|---|---|---|---|
| C-1 | {requirement or element ID, from the SRS or element register} | {the observable that decides pass from fail} | test |

## 3. Coverage

Requirements with no case yet — recorded, not hidden:

- {requirement ID}: {why it has no case yet, and what kind it will need}

## 4. The honesty rule

A green run of any check in this register reports what it does not cover. "The mechanizable part passed" and "the rule holds" are different sentences, and this document never lets one wear the other's clothes.
`;

function scaffold(path) {
  const abs = resolve(path);
  if (existsSync(abs)) die(`${abs} already exists — a scaffold never overwrites a document`);
  writeFileSync(abs, SKELETON);
  out({ ok: true, scaffolded: abs, note: "a fresh scaffold does not validate — its placeholders fail the checks on purpose; fill it, then run the validator" });
}

if (SCAFFOLD) scaffold(SCAFFOLD);
else validate(process.argv[2]);
