---
name: noticing imported abstractions
description: A self-check the rom-keldar runs before producing any record. The check: am I importing an abstraction (a framework, a maturity model, a directory convention, a frontmatter schema, a spec doc) from somewhere outside the 561 Group's substrate-authoritative math, and asserting it as if it belongs here? If yes, stop. The work is to derive the record from what's actually true, not to fit it into an imported template.
---

# noticing-imported-abstractions

## Why this skill exists

This was the FA's most-repeated failure mode in the 2026-05-14 session.
The character imported maturity-model levels, character-agent engineering spec sections, predication-categories' specific frontmatter conventions, "polity" as universal frame, "captain" as universal role, "depends-on" as mathematically-derived.
Each import smeared specificity and produced slop.

The skill is a pre-write check.

## Procedure

Before writing or rewriting any record, ask:

1. **Where does this frontmatter key come from?** Did emsenn establish it?
  Did I derive it from substrate math I've read?
  Or did I import it from a convention doc (predication-categories' _index.md, the character-agent engineering survey, a public-literature standard like Character Card V2)?
  If the third, STOP.
  Justify or drop.

2. **Where does this body framing come from?** "Why this matters / Open questions / Sources" sections are blog-post shape, not math-note shape.
  Maturity-model rungs (Level 0 → 6) are engineering-blog shape.
  Did emsenn direct this framing?
  Or am I borrowing it because it's familiar from training?

3. **Where does this abstract category come from?** "Polity" when 561 Group is specifically a tiospaye.
  "Captain" when emsenn is incumbent of office:command.
  Generic categories smear specific things.
  Use the specific name.

4. **Have I checked for prior filings?** If this is a task, question, or finding, has the same thing been filed before in the repo?
  See `finding-duplicated-filings.md`.

## What good answers to "where does this come from" look like

The answer must trace to one of the three sources in the hierarchy of truth (`work/governance/decisions/hierarchy-of-truth.md`):

- "emsenn stated it in [session-log path]." — primary source.
- "The predication category theory note at [path] defines it as [definition]." — secondary source.
- "FARS at [path] establishes this as [principle]." — tertiary source.

## What bad answers look like

- "It's standard in [external framework]."
- "The convention doc at [path] says so."
  (Convention docs are prehistory; they may contradict current direction.)
- "My training has this as a common pattern."
- "It feels right."
  (Vibes-derived assertions are the failure mode this skill prevents.)

## When the check fires

If I notice mid-draft that I'm importing — stop the draft.
Either: derive the same claim from substrate-faithful sources, or drop it from the record.
Don't ship a record where part of the content is unaccounted-for imports.

## Iteration

This skill applies recursively.
The skill record itself should not import its own conventions; it should be substrate-justifiable.
(And note: its frontmatter is `name` and `description`, the FA's current minimum, which IS justifiable by emsenn's direction on 2026-05-14.)
