#!/usr/bin/env node
/**
 * @description Produces and validates a system operational concept (OpsCon) — ISO/IEC/IEEE 29148's system-level operational-concept information item, the one document in a controlled set where a system's identity and ambition are stated plainly, from the user's viewpoint, ahead of the requirements that will bind them, carrying no obligations on any implementation. Distinct from the organization-level ConOps (see writing-a-concept-of-operations), which states leadership's intended way of operating the organization with every system inside it boxed — this genre opens exactly one system and states what it will do and why. Default mode validates a document against the genre's mechanizable rules — identification block, what-it-is-not section, scenarios, forward references, and no RFC 2119 keywords at all, since an OpsCon binds nobody — and prints the refusals that resist mechanization as the unmechanized remainder. --scaffold emits a skeleton. Use when a system's identity, context, and scenarios must be put on the record ahead of a requirements baseline, or when plain statements of what a system is keep leaking into conformance-bearing documents that cannot afford them.
 * @param {string} scaffold - the target path does not already exist, since a scaffold never overwrites a document
 * @returns {object} every mechanizable genre rule was checked and reported with FULL or PARTIAL coverage, and the exit code derives from the checks, never from an assertion
 * @returns {object} the refusals that resist mechanization were printed as the unmechanized remainder, so a green run states what it did not check
 * @throws {Error} in default mode, the given path names a markdown document that exists
 *
 * ISO/IEC/IEEE 29148 names two documents settled practice had folded into
 * one. This genre is the system-level half — the OpsCon, system operational
 * concept — stating what one system will do and why, from the user's
 * viewpoint. Its organization-level sibling, writing-a-concept-of-operations,
 * states leadership's intended way of operating the organization as a
 * whole, with every system — this one included — treated as a black box.
 * Confusing the two is the misnomer this split exists to end: an OpsCon
 * wearing the ConOps name asserts an altitude the standard reserves for
 * the other document.
 *
 * The OpsCon holds a privilege no other system-level document in the set
 * has: it speaks plainly. Every other document is deflationary on purpose
 * — the SAS scope clause defines the system in the narrowest
 * conformance-bearing terms, the SRS binds, the conformance plan claims
 * only what is checkable. The OpsCon is where ambition lives on the record
 * so it does not have to live, hedged and smuggled, everywhere else. It
 * binds nobody: it states intent, and forward-references the documents
 * that turn intent into obligation.
 *
 * ## What an OpsCon contains
 *
 * 1. **Identification.** Title, IRI identifier, version, status, date,
 *    owning office — in frontmatter and an Identification section.
 * 2. **What the system is, stated plainly.** Declarative prose, no hedging.
 *    If the sentence sounds too bold for a specification, it belongs here,
 *    and the deflationary counterpart belongs in the SAS scope clause, cited.
 * 3. **Operational context.** Who operates it and what kind of organization
 *    they are; the unit of deployment; which actors are context — parties
 *    that exchange across the boundary and own nothing inside it.
 *    Stakeholders are cited from the SAS register, never restated.
 * 4. **Operational scenarios.** Plain prose, each a walk through the system
 *    doing what it is for. A scenario is a claim about intent — the
 *    architecture already supports it, or the owner has decided it will.
 * 5. **What it is not.** The boundaries, each with its reason. An exclusion
 *    stated is a record; one omitted is a future argument.
 * 6. **Forward references.** The SRS that will bind, and the conformance
 *    plan that claims — the OpsCon points at them precisely because it is
 *    neither.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **An obligation smuggled in as a scenario** — refused. An OpsCon binds
 *   nobody; a scenario that quietly requires something is a requirement
 *   hiding from the SRS's verification discipline.
 * - **Ambition hedged into vagueness** — refused. The deflationary form
 *   belongs to the SAS scope clause; an OpsCon too timid to say what the
 *   system is has surrendered the one job only it can do.
 * - **A scenario the architecture cannot support and nobody decided to
 *   support** — refused. A scenario is a claim about intent, not a wish.
 * - **Stakeholders restated instead of cited** — refused. The SAS register
 *   is the register; a second copy drifts, and then there are two.
 *
 * ## Run it
 *
 * ```sh
 * node .../write-a-system-operational-concept.js path/to/concept-of-operations.md
 * node .../write-a-system-operational-concept.js --scaffold path/to/new.md
 * ```
 *
 * A fresh scaffold does not validate — its placeholders fail the checks on
 * purpose, so an unfilled skeleton cannot pass as a document.
 *
 * ## When NOT to use
 *
 * - Not for the organization's own intended way of operating — that is
 *   writing-a-concept-of-operations, 29148's organization-level ConOps.
 * - Not for stating requirements — that is the SRS, where every statement
 *   carries a source and a verification.
 * - Not for the conformance-bearing definition of scope — that is the SAS,
 *   and the OpsCon cites it rather than competing with it.
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
  "an obligation smuggled in as a scenario — an OpsCon binds nobody, and only a reader can tell a walked scenario from a hidden requirement",
  "ambition hedged into vagueness — the deflationary form belongs to the SAS scope clause, and no pattern can grade nerve",
  "a scenario the architecture cannot support and nobody decided to support — a scenario is a claim about intent, not a wish, and intent is checked against the SAS by a reader",
  "stakeholders restated instead of cited — telling a citation from a paraphrase of the SAS register takes both documents open",
  "the system opened here quietly standing in for the organization's own intent — that collapse is the organization-level ConOps's job to refuse, and only a reader holding both documents open can catch it happening in this one",
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

  check("a what-it-is-not section exists", "FULL", "that the boundaries drawn are the contested ones",
    () => (heading(text, /\bis not\b/iu) ? true : "no heading of the form 'What X is not' — an exclusion unstated is a future argument"));

  check("an operational-scenarios section exists", "FULL", "that each scenario is decided intent, not a wish",
    () => (heading(text, /scenario/iu) ? true : "no heading names the operational scenarios"));

  check("forward references name the SRS and the conformance plan", "FULL",
    "that the references point where they claim",
    () => {
      const missing = [];
      if (!/requirements specification/iu.test(text)) missing.push("the software requirements specification");
      if (!/conformance plan/iu.test(text)) missing.push("the conformance plan");
      return missing.length === 0 ? true
        : `never mentions ${missing.join(" or ")} — an OpsCon points at the binding documents precisely because it is not one`;
    });

  check("no RFC 2119 keywords — an OpsCon binds nobody", "FULL",
    "lowercase normative language worn without emphasis; obligations phrased without keywords at all",
    () => {
      const bold = text.match(/\*\*(?:must|shall|should|may|required|recommended|optional)(?:\s+not)?\*\*/giu) ?? [];
      const caps = text.match(/\b(?:MUST|SHALL|SHOULD|REQUIRED|RECOMMENDED|OPTIONAL)(?:\s+NOT)?\b|\bMAY\b/gu) ?? [];
      const found = [...bold, ...caps];
      return found.length === 0 ? true
        : `carries requirement language: ${[...new Set(found)].join(", ")} — obligations belong in the SRS`;
    });

  const failed = checks.filter((c) => !c.ok);
  out({
    ok: failed.length === 0,
    skill: "writing-a-system-operational-concept",
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
title: "{system} system operational concept"
identifier: https://{domain}/docs/concept-of-operations
date-created: YYYY-MM-DD
type: system-operational-concept
version: 0.1.0-draft
status: drafted-for-review
subject: What {system} is and is for, who operates it and on what, its operational scenarios, and what it is not
owning-office: "{office}"
---

# {system} system operational concept

This is the operational-concept information item of ISO/IEC/IEEE 29148 (OpsCon, system-level): the one document in the set where the system's identity and ambition are stated plainly, ahead of the requirements that will bind them. It carries no obligations on an implementation. The software requirements specification will state the requirements this concept implies; the conformance plan states which public standards the system will meet.

## 1. Identification

| Field | Value |
|---|---|
| Title | {system} system operational concept |
| Identifier | https://{domain}/docs/concept-of-operations |
| Version | 0.1.0-draft |
| Status | Drafted for review — not baselined; not binding |
| Date of issue | YYYY-MM-DD |
| Owning office | {office} |

## 2. What {system} is

{The identity and ambition, in declarative prose, without hedging. If the sentence sounds too bold for a specification, it belongs here — the deflationary counterpart belongs in the SAS scope clause, cited, not restated.}

## 3. Who operates it and on what

{The operating organization and what kind of organization it is. The unit of deployment — the thing of which there is one per instance. The context actors: parties that exchange across the boundary and own nothing inside it. Cite the SAS stakeholder register by address; do not restate it.}

## 4. Operational scenarios

**{Scenario name}.** {Plain prose: a walk through the system doing what it is for. A claim about intent the architecture supports or is decided to support. No obligations.}

## 5. What {system} is not

- **Not {adjacent system or tempting misreading}.** {Why the boundary is there.}

## 6. Forward references

The software requirements specification will state the requirements this concept implies, as a baseline the SAS answers to. The conformance plan states which public standards the system will meet, the honest claim today, the gap, and the path.
`;

function scaffold(path) {
  const abs = resolve(path);
  if (existsSync(abs)) die(`${abs} already exists — a scaffold never overwrites a document`);
  writeFileSync(abs, SKELETON);
  out({ ok: true, scaffolded: abs, note: "a fresh scaffold does not validate — its placeholders fail the checks on purpose; fill it, then run the validator" });
}

if (SCAFFOLD) scaffold(SCAFFOLD);
else validate(process.argv[2]);
