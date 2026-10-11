---
name: convention-duplication-finding-2026-05-14
description: The objects-vs-terms convention migration is filed in at least seven places across the 561 repo (a spec, a decision, an implementation plan, a survey, multiple memory notes, a narrative, a skill). The filings contradict each other on direction. The duplication itself is the failure-mode the FA is supposed to surface. Captured 2026-05-14.
---

# 2026-05-14: convention duplication finding

## What was found

emsenn told the rom-keldar on 2026-05-14: "objects is old, terms is new."
This is a structural convention change for the typed-record decomposition (objects/concepts/morphisms → terms/).

Searching the repo turned up at least seven places where this migration is filed:

- `theories/.../predicated-markdown-vault-knowledge-system/specifications/term-to-typed-migration.md` — a spec that has the direction REVERSED from current (claims terms are old, typed is new).
- `tools/platform/pypredcomp/docs/dev/decisions/adopt-predcat-vocabulary.md` — a decision in PredCat vocabulary direction.
- `tools/platform/pypredcomp/docs/dev/implementation/predicate-shape-refactor-plan.md`.
- `tools/platform/pypredcomp/docs/dev/surveys/theory-side-research-notes-2026-05-03.md` and `-round-2.md`.
- Memory notes from 2026-05-12: `-1426.md`, `-1436.md`, `-1441.md`, `-2017.md`, `-2029.md`, `-2109.md`, `-2339.md`.
- `prose/narratives/unfolding-the-theory-behind-the-561-group.md`.
- `tools/platform/pyfars/work/governance/skills/authoring-foundational-self-theory-concept.md`.

## Why this finding matters

emsenn's framing: this is the kind of duplication-of-effort the rom-keldar is supposed to find.
Each session that approaches the convention question without seeing the prior filings re-derives the same answer, burns work, and produces yet another filing.

The fail-state isn't "wrong direction."
The fail-state is "many filings, none of them visibly canonical."

A model like Opus is capable of NOTICING this pattern across the corpus.
A smaller model would just file an eighth task without seeing the prior seven.
The FA's value here is the cross-corpus pattern-detection, not the per-record curation.

## Implication for the FA

When a question or task arises, the FA's first move should be: grep the repo for prior filings of the same question.
Surface them.
Then consolidate, not duplicate.

This generalizes beyond the objects/terms migration.
The 561 repo has many such repeatedly-filed unresolved questions; finding them is the FA's high-leverage work.

## Next iterations

The task `work/tasks/auditing-terms-vs-objects-inconsistency.md` (renamed in body to `consolidating-duplicate-filings-of-objects-to-terms-migration`) captures the consolidation work.
Filed today.

Future sessions should: 1.
Confirm whether other repeatedly-filed task patterns exist (likely yes).
2.
Build a skill for "finding repeated filings before adding new ones" that the FA executes before filing any task.
