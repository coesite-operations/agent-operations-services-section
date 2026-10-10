---
name: consolidating-duplicate-filings-of-objects-to-terms-migration
description: The objects→terms direction recorded here is STALE. emsenn corrected this on 2026-05-14 (later in the same session): the current direction is structures/transformers/concepts, NOT terms/. This task needs to be closed and the contradicting filings noted below need "superseded by 2026-05-14 correction" annotations.
raised: 2026-05-14
raised-by: rom-keldar
supersedes: the prior framing "audit terms-vs-objects" — there is no audit, the direction is known
---

## Correction (2026-05-14, same session)

emsenn corrected mid-session: the move is NOT toward `terms/`.
The current direction is: - `structures/` = formal entity-forms and named theory entities (was `objects/`) - `transformers/` = operations between structures (was `morphisms/`) - `concepts/` = semantic anchors and recurring roles (unchanged)

`terms/` was an even-older convention.
The typed split (objects/morphisms/concepts) was an intermediate step; the current step is the rename to structures/transformers/concepts.
The rom-keldar character store has already been migrated.

The contradicting filings listed below still need "superseded" annotations added to them — but the body of those filings should point to `structures/transformers/concepts` as the current direction, not `terms/`.

# consolidating-duplicate-filings-of-objects-to-terms-migration

## The actual situation (per emsenn 2026-05-14)

emsenn's current direction: objects/concepts/morphisms (the typed-vocabulary split that the predication-categories tradition uses) is OLD. terms/ is the NEW unified canonical record type.
Things that used to be split into separate typed directories should consolidate under terms/.

## The duplication finding

This migration is filed REPEATEDLY across the repo in different forms, some of which contradict the current direction:

1. **`theories/.../predicated-markdown-vault-knowledge-system/specifications/term-to-typed-migration.md`** — a draft specification that says the OPPOSITE direction: it claims `type: term` notes (2054 of them) are old encyclopedic anchors, and the typed vocabulary (concepts, objects, morphisms) is the NEW discipline they should migrate INTO.
  This is prehistory; emsenn's current direction reverses it.

2. **`tools/platform/pypredcomp/docs/dev/decisions/adopt-predcat-vocabulary.md`** — a decision adopting "PredCat" (predication-categories) vocabulary; absorbs older FARS/FAOH/MASH/CCE/CDS/RTL terms into the new typed vocabulary.
  Treats the typed split (concepts, objects, morphisms) as current.

3. **`tools/platform/pypredcomp/docs/dev/implementation/predicate-shape-refactor-plan.md`** — implementation plan touching the same migration.

4. **`tools/platform/pypredcomp/docs/dev/surveys/theory-side-research-notes-2026-05-03.md`** (and a round-2 followup) — research surveys discussing the convention.

5. **Memory notes from 2026-05-12** (`memory/2026-05-12-1426.md`, `-1436.md`, `-1441.md`, `-2017.md`, `-2029.md`, `-2109.md`, `-2339.md`) — multiple session memories from earlier work touching the convention question.

6. **`prose/teaching/explanations/unfolding-the-theory-behind-the-561-group.md`** — narrative referencing the convention.

7. **`tools/platform/pyfars/work/governance/skills/authoring-foundational-self-theory-concept.md`** — skill about authoring under the convention.

## Why this is the actual finding

Across many sessions and many records, the convention question has been re-filed without consolidation.
Each new filing burns work because the prior filings aren't surfaced and resolved.
This is the kind of duplication-of-effort the rom-keldar is supposed to FIND and surface — it's exactly the failure mode emsenn's repeated cycles have been about.

## What to do (next iteration)

1. Read the records listed above; identify which one most-closely captures the current direction.
2. Update or supersede the contradicting ones (the term-to-typed-migration spec has the reverse direction; needs an explicit "superseded by current direction" note).
3. Consolidate into one canonical record under emsenn's authority that names: (a) the current direction, (b) the migration scope, (c) the records that previously filed this work.
4. Update the rom-keldar's own directory structure to use terms/ instead of objects/concepts/morphisms (this is structural and downstream of the consolidation).

## Out of scope

Actually executing the migration of all theory records from objects/ to terms/.
That's downstream of the consolidation; the consolidation is what unblocks it.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: deferred` — explicitly parked; carried forward as settled-by-parking at migration to the work-item shape.
