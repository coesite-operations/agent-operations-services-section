#!/usr/bin/env node
/**
 * @description Produces and validates a software requirements specification (SRS) per ISO/IEC/IEEE 29148 — the baseline the SAS answers to, every requirement singular, unambiguous, and verifiable, every requirement carrying a Source (the citation that forced it or the ruling that chose it), an allocation, and a trace, with derived requirements distinguished from stakeholder requirements by what forces them. Default mode validates a document's mechanizable rules — identification block, references section, a requirements register whose every row has a Source, an allocation, a trace, a derived-or-stakeholder kind, and exactly one shall — and prints the refusals that resist mechanization as the unmechanized remainder. --scaffold emits a skeleton. Use when a system needs the baseline its design set is answerable to, or when requirement-shaped statements must be normalized into requirements that can actually be checked.
 * @param {string} scaffold - the target path does not already exist, since a scaffold never overwrites a document
 * @returns {object} every mechanizable genre rule was checked and reported with FULL or PARTIAL coverage, and the exit code derives from the checks, never from an assertion
 * @returns {object} the refusals that resist mechanization were printed as the unmechanized remainder, so a green run states what it did not check
 * @throws {Error} in default mode, the given path names a markdown document that exists
 *
 * The SRS is the baseline: the document the SAS answers to, the trace target
 * for every design element, and the gating item for everything downstream —
 * the house SAS discipline refuses a SAS with no named baseline. Its
 * discipline is 29148's nine well-formedness characteristics — necessary,
 * appropriate, unambiguous, complete, singular, feasible, verifiable,
 * correct, conforming — applied as checks, not aspirations. The load-bearing
 * column is the Source: a requirement exists because something forced it or
 * someone chose it, and the SRS says which, per requirement, by citation.
 *
 * ## What an SRS contains
 *
 * 1. **Identification.** Title, IRI identifier, version, status, date,
 *    owning office, change history.
 * 2. **References.** The glossary and the element register, cited by address
 *    and never restated — the SRS uses the set's vocabulary; it does not
 *    keep a private copy of it.
 * 3. **The requirements.** Each with a stable ID, stated once, singular —
 *    one obligation, one shall — and each carrying a Source (a named formal
 *    declaration, a corpus concept, or an owner ruling), an allocation, and
 *    a trace to what verifies it.
 * 4. **The derived/stakeholder distinction.** Derived is forced by the
 *    mathematics — cite the theorem; it could not honestly be otherwise.
 *    Stakeholder is chosen — cite the ruling; it could. The two carry
 *    different assurance and are renegotiated through different doors.
 * 5. **Verification approach.** Per requirement class: executable check,
 *    test, inspection, or analysis — so "verifiable" has a concrete meaning
 *    in this set.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **A requirement with no source** — refused. Nothing forced it and nobody
 *   chose it, so nothing can falsify it, so it is not a requirement.
 * - **A requirement restating another document** — refused. Copies drift;
 *   cite the address and let the baseline be in one place.
 * - **A compound requirement** — refused. An "and" hiding two obligations is
 *   two requirements sharing one verification, and one is not getting verified.
 * - **A requirement whose verification nobody can name** — refused.
 *   Unverifiable is 29148's word for decorative.
 * - **A chosen requirement presented as math-forced** — refused, the worse
 *   error: it mints assurance the mathematics never issued, and the reader
 *   spends it.
 *
 * ## Run it
 *
 * ```sh
 * node .../write-a-software-requirements-specification.js path/to/srs.md
 * node .../write-a-software-requirements-specification.js --scaffold path/to/new.md
 * ```
 *
 * A fresh scaffold does not validate — its placeholders fail the checks on
 * purpose, so an unfilled skeleton cannot pass as a baseline.
 *
 * ## When NOT to use
 *
 * - Not for stating what the system is or is for — that is the ConOps, which
 *   binds nobody.
 * - Not for deciding how requirements are satisfied — that is the SAS and
 *   the designs below it.
 * - Not for the verification cases themselves — those live in the
 *   verification and validation specification; the SRS names the approach.
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
  "a requirement restating another document — copies drift, and detecting a paraphrase takes both texts open",
  "a chosen requirement presented as math-forced — the worse error; whether the cited Source genuinely forces the text is a reading of the theorem, not of the row",
  "a compound obligation hiding behind a single shall — an 'and' between two duties is graded by a reader, not by keyword count",
  "whether the named verification could actually falsify the requirement",
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

  check("a references section cites the vocabulary", "PARTIAL",
    "that citations are by address and nothing is restated — a paraphrase passes this check",
    () => (heading(text, /references/iu) ? true : "no References section — the SRS uses the set's vocabulary by citation, never by copy"));

  // The register: a table whose header carries Source, Allocation, Trace, Kind.
  const register = tables(text).find((t) =>
    t.header.some((h) => /source/iu.test(h))
    && t.header.some((h) => /allocation/iu.test(h))
    && t.header.some((h) => /trace/iu.test(h)));

  check("a requirements register exists", "FULL",
    "requirements stated outside the register — prose obligations are found by a reader",
    () => (register ? true : "no table carries Source, Allocation, and Trace columns — a requirement without those three fields is unfalsifiable"));

  if (register) {
    const col = (re) => register.header.findIndex((h) => re.test(h));
    const id = col(/id/iu);
    const req = col(/requirement/iu);
    const kind = col(/kind/iu);
    const source = col(/source/iu);
    const alloc = col(/allocation/iu);
    const trace = col(/trace/iu);
    const name = (row, i) => (id !== -1 && row[id] ? row[id] : `row ${i + 1}`);
    const perRow = (label, coverage, notCovered, fn) =>
      check(label, coverage, notCovered, () => {
        const bad = register.rows.map((row, i) => (fn(row) ? null : name(row, i))).filter(Boolean);
        return bad.length === 0 ? true : `fails at: ${bad.join(", ")}`;
      });

    perRow("every requirement has a Source", "PARTIAL",
      "whether the citation resolves, and whether what it names actually forces or chooses the text",
      (row) => source !== -1 && (row[source] ?? "").length > 0);
    perRow("every requirement has an allocation", "FULL",
      "whether the allocated element exists in the element register",
      (row) => alloc !== -1 && (row[alloc] ?? "").length > 0);
    perRow("every requirement has a trace", "PARTIAL",
      "whether the traced verification exists and could fail",
      (row) => trace !== -1 && (row[trace] ?? "").length > 0);
    perRow("every requirement is declared derived or stakeholder", "PARTIAL",
      "whether the Source's genre matches — a theorem for derived, a ruling for stakeholder",
      (row) => kind !== -1 && /^(derived|stakeholder)$/iu.test(row[kind] ?? ""));
    perRow("every requirement carries exactly one shall", "PARTIAL",
      "compound obligations that share one shall, and obligations phrased without shall at all",
      (row) => req !== -1 && ((row[req] ?? "").match(/\bshall\b/giu) ?? []).length === 1);
  }

  check("a verification-approach section exists", "PARTIAL",
    "that every requirement class actually appears under it",
    () => (heading(text, /verification/iu) ? true : "no heading names the verification approach — 'verifiable' has no concrete meaning in this set without it"));

  const failed = checks.filter((c) => !c.ok);
  out({
    ok: failed.length === 0,
    skill: "writing-a-software-requirements-specification",
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
title: "{system} software requirements specification"
identifier: https://{domain}/docs/software-requirements-specification
date-created: YYYY-MM-DD
type: software-requirements-specification
version: 0.1.0-draft
status: drafted-for-review
subject: The requirements baseline the design set answers to — every requirement sourced, allocated, and traced
owning-office: "{office}"
---

# {system} software requirements specification

This is the requirements baseline of ISO/IEC/IEEE 29148: the document the SAS answers to and every design element traces into. Every requirement is singular, unambiguous, and verifiable, and carries the citation that forced it or the ruling that chose it.

## 1. Identification

| Field | Value |
|---|---|
| Title | {system} software requirements specification |
| Identifier | https://{domain}/docs/software-requirements-specification |
| Version | 0.1.0-draft |
| Status | Drafted for review — not baselined; not binding |
| Date of issue | YYYY-MM-DD |
| Owning office | {office} |

## 2. References

{The glossary and the element register, cited by address. Never restated: the SRS uses the set's vocabulary; it does not keep a private copy of it.}

## 3. Requirements

Each requirement is one obligation, one shall. Kind is \`derived\` (forced by the mathematics — Source cites the theorem) or \`stakeholder\` (chosen — Source cites the ruling).

| ID | Requirement | Kind | Source | Allocation | Trace |
|---|---|---|---|---|---|
| R-1 | {The element} shall {one obligation, unambiguous and verifiable}. | derived | {theorem, corpus concept, or ruling — by address} | {the element that carries it} | {the case or check that verifies it — by address} |

## 4. Verification approach

{Per requirement class: how requirements of that class are verified — executable check, test, inspection, or analysis.}
`;

function scaffold(path) {
  const abs = resolve(path);
  if (existsSync(abs)) die(`${abs} already exists — a scaffold never overwrites a document`);
  writeFileSync(abs, SKELETON);
  out({ ok: true, scaffolded: abs, note: "a fresh scaffold does not validate — its placeholders fail the checks on purpose; fill it, then run the validator" });
}

if (SCAFFOLD) scaffold(SCAFFOLD);
else validate(process.argv[2]);
