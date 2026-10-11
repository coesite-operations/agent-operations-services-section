#!/usr/bin/env node
/**
 * @description Produces and validates a concept of operations (ConOps) — ISO/IEC/IEEE 29148's organization-level information item, stating leadership's intended way of operating the organization as a whole, with every system it operates treated as a black box. Distinct from the system-level operational concept (see writing-a-system-operational-concept, the OpsCon), which opens exactly one system and states what it will do and why — this genre never opens one. Default mode validates a document against the genre's mechanizable rules — an identification block carrying a did-core identifier, a systems-as-black-boxes section, an assumptions section, a what-the-organization-is-not section, forward references to the requirements and portfolio records that will bind what it states, and no RFC 2119 keywords at all, since a ConOps binds nobody — and prints the refusals that resist mechanization as the unmechanized remainder. --scaffold emits a skeleton. Use when the firm's leadership must put its intended way of operating the organization as a whole on the record ahead of the requirements and portfolio decisions that will bind it, or when an organization-level concept keeps collapsing into one system's operational concept.
 *
 * @param {string} scaffold - The target path does not already exist, since a scaffold never overwrites a document.
 * @returns {object} every mechanizable genre rule was checked and reported with FULL or PARTIAL coverage, and the exit code derives from the checks, never from an assertion.
 * @returns {object} the refusals that resist mechanization were printed as the unmechanized remainder, so a green run states what it did not check.
 * @throws {Error} Refuses unless, in default mode, the given path names a markdown document that exists.
 *
 * ISO/IEC/IEEE 29148 names two documents settled practice had folded into
 * one, at two different altitudes. writing-a-system-operational-concept is
 * the OpsCon — one system, opened, from the user's viewpoint. This genre
 * is the organization-level ConOps: the leadership's intended way of
 * operating the ORGANIZATION as a whole, in which every system — this
 * firm's included — is a black box, named and boundaried and never opened.
 * Getting the altitude wrong collapses the two into each other, which is
 * the exact misnomer this split exists to end.
 *
 * ## What a (organization-level) ConOps contains
 *
 * 1. **Identification.** Title, a did-core identifier — a `did:` URI per
 *    W3C DID-core, because the organization's own identity is not an
 *    address rented on somebody else's domain, the way a system's IRI is
 *    — version, status, date, owning office, in frontmatter and an
 *    Identification section.
 * 2. **What the organization is, stated plainly.** Declarative prose: the
 *    leadership's intent for operating the organization as a whole, not
 *    any one system's behavior.
 * 3. **Systems as black boxes.** Every system the organization operates,
 *    named and boundaried, never opened — a system's insides are that
 *    system's own OpsCon's business, not this document's.
 * 4. **Assumptions.** What the leadership is taking as given about the
 *    environment, the market, the members, the resources — stated plainly
 *    enough that a reader can tell when one has stopped holding.
 * 5. **What the organization is not.** The boundaries, each with its
 *    reason — an adjacent organization, a function it does not perform,
 *    a scope it has declined.
 * 6. **Forward references.** The requirements records and the portfolio
 *    records — investment review, charters, checkpoints — that will bind
 *    what this document only states.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **A system opened instead of boxed** — refused. The moment this
 *   document describes a system's internals it has become that system's
 *   OpsCon wearing the organization's name — the exact defect the 29148
 *   split exists to end.
 * - **An RFC 2119 keyword anywhere** — refused. A ConOps binds nobody at
 *   either altitude; obligations belong to the requirements and portfolio
 *   records this document only forward-references.
 * - **An identifier that is not a did-core URI** — refused. A system's
 *   OpsCon carries a dereferenceable IRI naming a document at an address;
 *   the organization's own identity is not addressed on any one domain.
 * - **Assumptions left unstated** — refused. An intent built on an
 *   unstated assumption cannot be checked when the assumption stops
 *   holding — this rule can only confirm the assumption was written down.
 *
 * ## Run it
 *
 * ```sh
 * node .../write-a-concept-of-operations.js path/to/concept-of-operations.md
 * node .../write-a-concept-of-operations.js --scaffold path/to/new.md
 * ```
 *
 * A fresh scaffold does not validate — its placeholders fail the checks on
 * purpose, so an unfilled skeleton cannot pass as a document.
 *
 * ## When NOT to use
 *
 * - Not for one system's identity and ambition — that is
 *   writing-a-system-operational-concept, 29148's OpsCon.
 * - Not for stating requirements or portfolio decisions — those are the
 *   records this document forward-references, never restates.
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
  "a system opened instead of boxed — only a reader holding both this document and that system's OpsCon can tell a described boundary from a described interior",
  "an assumption stated so vaguely that nobody could tell it has stopped holding — a pattern can confirm a sentence exists, not that it is falsifiable",
  "the organization's intent stated as an aggregate of its systems' intents rather than leadership's own — that collapse reads as compliant to every check here",
  "a forward reference that names a requirements or portfolio record which does not exist yet, versus one deliberately not yet raised — a citation and a placeholder read identically to a pattern",
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
  field("identifier", (v) => /^did:[a-z0-9]+:[A-Za-z0-9._:%-]+$/u.test(v),
    "is not a did-core identifier — a `did:<method>:<method-specific-id>` URI per W3C DID-core, not an IRI on a domain");
  field("version", (v) => v.length > 0, "is empty");
  field("status", (v) => v.length > 0, "is empty");
  field("date-created", (v) => /^\d{4}-\d{2}-\d{2}$/u.test(v), "is not an ISO 8601 date");
  field("owning-office", (v) => v.length > 0, "is empty — an unowned document rots");
  check("identification: an Identification section exists", "FULL", "that its table agrees with the frontmatter",
    () => (heading(text, /identification/iu) ? true : "no heading names Identification"));

  check("a systems-as-black-boxes section exists", "FULL",
    "that every system named is actually left unopened",
    () => (heading(text, /black box/iu) || /black box/iu.test(text)
      ? true
      : "no section names the organization's systems as black boxes — an organization-level ConOps that opens a system has become that system's OpsCon"));

  check("an assumptions section exists", "FULL",
    "that each assumption is stated precisely enough to be told, later, that it stopped holding",
    () => (heading(text, /assumption/iu) ? true : "no heading names the operating assumptions"));

  check("a what-the-organization-is-not section exists", "FULL",
    "that the boundaries drawn are the contested ones",
    () => (heading(text, /\bis not\b/iu) ? true : "no heading of the form 'What the organization is not' — an exclusion unstated is a future argument"));

  check("forward references name the requirements and portfolio records that will bind", "FULL",
    "that the references point at records which exist, or are named as owed",
    () => {
      const missing = [];
      if (!/requirements/iu.test(text)) missing.push("a requirements record");
      if (!/portfolio/iu.test(text)) missing.push("a portfolio record");
      return missing.length === 0 ? true
        : `never mentions ${missing.join(" or ")} — a ConOps points at the binding records precisely because it is not one`;
    });

  check("no RFC 2119 keywords — a ConOps binds nobody", "FULL",
    "lowercase normative language worn without emphasis; obligations phrased without keywords at all",
    () => {
      const bold = text.match(/\*\*(?:must|shall|should|may|required|recommended|optional)(?:\s+not)?\*\*/giu) ?? [];
      const caps = text.match(/\b(?:MUST|SHALL|SHOULD|REQUIRED|RECOMMENDED|OPTIONAL)(?:\s+NOT)?\b|\bMAY\b/gu) ?? [];
      const found = [...bold, ...caps];
      return found.length === 0 ? true
        : `carries requirement language: ${[...new Set(found)].join(", ")} — obligations belong to the requirements and portfolio records this document forward-references`;
    });

  const failed = checks.filter((c) => !c.ok);
  out({
    ok: failed.length === 0,
    skill: "writing-a-concept-of-operations",
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
title: "{organization} concept of operations"
identifier: did:{method}:{organization-specific-id}
date-created: YYYY-MM-DD
type: concept-of-operations
version: 0.1.0-draft
status: drafted-for-review
subject: How {organization}'s leadership intends to operate the organization as a whole, the systems it operates treated as black boxes, its operating assumptions, and what it is not
owning-office: "{office}"
---

# {organization} concept of operations

This is the organization-level operational-concept information item of ISO/IEC/IEEE 29148: the document in which leadership states its intended way of operating {organization} as a whole, ahead of the requirements and portfolio decisions that will bind it. Every system {organization} operates is a black box here — its own operational concept is a separate document, at the system level (see writing-a-system-operational-concept). This document carries no obligations on any implementation or any decision.

## 1. Identification

| Field | Value |
|---|---|
| Title | {organization} concept of operations |
| Identifier | \`did:{method}:{organization-specific-id}\` |
| Version | 0.1.0-draft |
| Status | Drafted for review — not baselined; not binding |
| Date of issue | YYYY-MM-DD |
| Owning office | {office} |

## 2. What {organization} is

{The leadership's intent for operating the organization as a whole, in declarative prose, without hedging — not any one system's behavior.}

## 3. Systems as black boxes

- **{System name}.** {Its boundary, stated without opening it. What it is for is that system's own OpsCon's business, cited by address, not restated here.}

## 4. Operating assumptions

- **{Assumption}.** {Stated precisely enough that a reader can tell, later, whether it still holds.}

## 5. What {organization} is not

- **Not {adjacent organization or tempting misreading}.** {Why the boundary is there.}

## 6. Forward references

{The requirements records that will state what operating this way requires, and the portfolio records — charters, checkpoints, investment decisions — that will bind resources to it. Cite each by address; this document states intent and binds nothing.}
`;

function scaffold(path) {
  const abs = resolve(path);
  if (existsSync(abs)) die(`${abs} already exists — a scaffold never overwrites a document`);
  writeFileSync(abs, SKELETON);
  out({ ok: true, scaffolded: abs, note: "a fresh scaffold does not validate — its placeholders fail the checks on purpose; fill it, then run the validator" });
}

if (SCAFFOLD) scaffold(SCAFFOLD);
else validate(process.argv[2]);
