#!/usr/bin/env node
/**
 * @description Produces and validates a conformance plan — the standards program for a system, recording per target family the honest claim today, the gap to the named target, and the path between them, under the rule that the plan itself asserts no conformance, every claim is a checkable relation to a designation-edition-clause, evidence is a projection from the system's record, and a stalled target transfers to the gap register as debt. Default mode validates a document's mechanizable rules — identification block, the asserts-no-conformance rule, a ladder whose every rung states honest claim today, gap, and path (or is an explicit out-of-scope record), an ordering, an amendment section with a change history — and prints the refusals that resist mechanization as the unmechanized remainder. --scaffold emits a skeleton. Use when a system's relationship to public standards must be put on the record as a program rather than as labels, or when scattered conformance claims must be consolidated into one document that separates what is true today from what is intended.
 *
 * @param {string} scaffold - The target path does not already exist, since a scaffold never overwrites a document.
 * @returns {object} every mechanizable genre rule was checked and reported with FULL or PARTIAL coverage, and the exit code derives from the checks, never from an assertion.
 * @returns {object} the refusals that resist mechanization were printed as the unmechanized remainder, so a green run states what it did not check.
 * @throws {Error} Refuses unless, in default mode, the given path names a markdown document that exists.
 *
 * The conformance plan is the standards program: not a claim of conformance
 * but the record of the distance to each claim and the route across it. Its
 * entire value is the separation it enforces between three things documents
 * love to blur — what is honestly true today, what the target is, and what
 * the next step is. A plan that keeps those columns apart can be audited; a
 * plan that blends them is a brochure.
 *
 * ## What a conformance plan contains
 *
 * 1. **Identification and the rule.** The plan asserts no conformance; a
 *    conformance statement is a checkable relation to a named target — a
 *    designation, an edition, and a clause — never a declared label;
 *    evidence is produced as a projection from the system's own record, not
 *    hand-edited beside it; a target whose path stops moving transfers to
 *    the gap register as recorded debt.
 * 2. **The ladder.** One subsection per standards family, each with the same
 *    parts: governs; honest claim today — the strongest sentence true right
 *    now, including "nothing"; gap; path, its first step small; and every
 *    category-mismatch warning stated plainly. A family deliberately out of
 *    scope gets a subsection saying so and why — an exclusion is a record.
 * 3. **Ordering.** The critical path across the ladder: what gates what,
 *    what runs in parallel, what is cheap enough to do first.
 * 4. **Amendment.** Rows are added or moved by amendment, each carrying a
 *    change-history row.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **A target with no honest-claim-today** — refused. Ambition without a
 *   baseline is a label, and this plan deals in relations, not labels.
 * - **A claim naming a body instead of a designation and edition** —
 *   refused. "IETF conformance" is a category error; RFC 9110 is a claim.
 * - **An out-of-scope standard left unmentioned** — refused. An exclusion is
 *   a record; an omission is a future accusation.
 * - **A path with no first step an office could take this quarter** —
 *   refused. A path that starts beyond reach is an aspiration, and
 *   aspirations belong in the gap register as debt.
 *
 * ## Run it
 *
 * ```sh
 * node .../write-a-conformance-plan.js path/to/conformance-plan.md
 * node .../write-a-conformance-plan.js --scaffold path/to/new.md
 * ```
 *
 * A fresh scaffold does not validate — its placeholders fail the checks on
 * purpose, so an unfilled skeleton cannot pass as a program.
 *
 * ## When NOT to use
 *
 * - Not for asserting conformance — the finished plan asserts none, by its
 *   own first rule; conformance statements live in the per-standard evidence
 *   its paths produce.
 * - Not for requirements the system must meet regardless of any standard —
 *   those are the SRS's, with sources and traces.
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
  "a claim naming a body instead of a designation and edition — quoting the error to warn against it is legal, so only a reader can tell a warning from a claim",
  "an out-of-scope standard left unmentioned — an omission is invisible to a check that reads only what is present",
  "whether each path's first step is genuinely something an office could take this quarter",
  "whether evidence is a projection from the system's record rather than a hand-edited artifact beside it",
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

/** The H3 rungs under the ladder H2, each with its title and body. */
function ladderRungs(text) {
  const lines = text.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s/u.test(lines[i]) && /ladder/iu.test(lines[i])) { start = i + 1; break; }
  }
  if (start === -1) return null;
  const rungs = [];
  let current = null;
  for (let i = start; i < lines.length; i++) {
    if (/^##\s/u.test(lines[i])) break;
    const m = /^###\s+(.+)$/u.exec(lines[i]);
    if (m) { current = { title: m[1].trim(), body: [] }; rungs.push(current); continue; }
    if (current) current.body.push(lines[i]);
  }
  return rungs.map((r) => ({ title: r.title, body: r.body.join("\n") }));
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

  check("the plan asserts no conformance, in those words", "FULL",
    "whether the rest of the document keeps the promise",
    () => (/asserts no conformance/iu.test(text) ? true
      : "never states that it asserts no conformance — the plan's first rule, stated before any target"));

  const rungs = ladderRungs(text);
  check("a ladder section exists with at least one rung", "FULL",
    "families the system touches that have no rung at all",
    () => (rungs === null ? "no heading names the ladder"
      : rungs.length === 0 ? "the ladder section carries no subsections" : true));

  if (rungs && rungs.length > 0) {
    const exclusion = (r) => /out of scope/iu.test(`${r.title}\n${r.body}`);
    const perRung = (label, re, why) =>
      check(label, "FULL", "that the sentence under the keyword is honest — 'nothing' is a passing claim, a boast is too", () => {
        const bad = rungs.filter((r) => !exclusion(r) && !re.test(r.body)).map((r) => r.title);
        return bad.length === 0 ? true : `${why} at: ${bad.join("; ")}`;
      });

    perRung("every rung states its honest claim today", /honest claim/iu, "no honest-claim-today");
    perRung("every rung states its gap", /\bgap\b/iu, "no gap stated");
    perRung("every rung states its path", /\bpath\b/iu, "no path stated");
    check("exclusion rungs are records, not omissions", "PARTIAL",
      "standards excluded by not being mentioned at all",
      () => {
        const excl = rungs.filter(exclusion).filter((r) => r.body.trim().length === 0).map((r) => r.title);
        return excl.length === 0 ? true : `out-of-scope rung with no stated reason at: ${excl.join("; ")}`;
      });
  }

  check("an ordering section exists", "PARTIAL",
    "whether the ordering is actually the critical path",
    () => (heading(text, /ordering/iu) ? true : "no ordering section — a program with no ordering is a wish list with subsections"));

  check("an amendment section with a change history exists", "FULL",
    "whether every past change actually got its row",
    () => {
      if (!heading(text, /amendment/iu)) return "no amendment section";
      const history = tables(text).find((t) =>
        t.header.some((h) => /version/iu.test(h)) && t.header.some((h) => /change/iu.test(h)));
      if (!history) return "no change-history table with Version and Change columns";
      if (history.rows.length === 0) return "the change-history table has no rows — even the initial issue is a change";
      return true;
    });

  const failed = checks.filter((c) => !c.ok);
  out({
    ok: failed.length === 0,
    skill: "writing-a-conformance-plan",
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
title: "{system} conformance plan"
identifier: https://{domain}/docs/conformance-plan
date-created: YYYY-MM-DD
type: plan
version: 0.1.0-draft
status: drafted-for-review
subject: The standards {system} intends to meet — per target, the honest claim today, the gap, and the path
owning-office: "{office}"
---

# {system} conformance plan

## 1. Identification and rule

| Field | Value |
|---|---|
| Title | {system} conformance plan |
| Identifier | https://{domain}/docs/conformance-plan |
| Version | 0.1.0-draft |
| Status | Drafted for review — not baselined; not binding |
| Date of issue | YYYY-MM-DD |
| Owning office | {office} |

**This plan asserts no conformance.** It records the program: for each target standard, the honest claim today, the gap, and the path from one to the other.

The rule of the plan:

1. A conformance statement is a checkable relation to a named target — a designation, an edition, and a clause the claim can be audited against — never a declared label.
2. Conformance evidence is produced as a projection from the system's own record, not maintained as a hand-edited artifact beside it.
3. A target whose Path stops moving transfers to the gap register as recorded debt, not carried here as an aspiration.

## 2. The ladder

One subsection per standards family. Each states what the family governs, the honest claim today, the gap, the path, and any category-mismatch warning. A family deliberately out of scope gets a subsection saying so and why.

### 2.1 {designation and edition} — {what the family is}

**Governs.** {What of ours this family shapes.}

**Honest claim today.** {The strongest sentence that is true right now — including "Nothing."}

**Gap.** {The named target — designation, edition, clause — and what stands between.}

**Path.** {The steps in order; the first one small enough for an office to take this quarter.}

## 3. Ordering

{The critical path across the ladder: what gates what, what runs in parallel, what is cheap enough to do first.}

## 4. Amendment

Rows are added or moved by amendment of this plan. Each amendment carries a change-history row.

| Version | Date | Change |
|---|---|---|
| 0.1.0-draft | YYYY-MM-DD | Initial issue. |
`;

function scaffold(path) {
  const abs = resolve(path);
  if (existsSync(abs)) die(`${abs} already exists — a scaffold never overwrites a document`);
  writeFileSync(abs, SKELETON);
  out({ ok: true, scaffolded: abs, note: "a fresh scaffold does not validate — its placeholders fail the checks on purpose; fill it, then run the validator" });
}

if (SCAFFOLD) scaffold(SCAFFOLD);
else validate(process.argv[2]);
