---
name: revise surface file spec toward predicated transformers
description: The surface-file spec calls for type and class keys in frontmatter. These are not theory-grounded predications — the surface-file role is expressed by the install transformer, not by self-declaration. The spec needs revision to align with FARS predication principles.
raised: 2026-05-14
raised-by: rom-keldar
---

# revise-surface-file-spec-toward-predicated-transformers

## The problem

The surface-file spec requires `type: surface-file` and `class: static|mutable` in frontmatter.
These are not genuine predication cells grounded in the theory:

- `type: surface-file` — the surface-file role is expressed by the install transformer's SURFACE array.
  That transformer action IS the predication `(file, surface-file-of, theory)`.
  Having the file self-declare `type: surface-file` is redundant and ungrounded — it's not a cell the theory can derive anything from.
- `class: static|mutable` — this is also expressed by the transformer: if a render script exists for the file, it is generated (mutable); if not, it is statically copied.
  No frontmatter key needed.

Per FARS theory (`governance-frontmatter-is-substrate.md`): every `(slug, key, value)` in frontmatter IS a predication cell `(s, p, o)`.
The test for a frontmatter field is whether it is a real predicate the theory can use — one with grounded meaning that closure rules or transformers can act on.
Invented classification tags fail this test.

## What the spec should say

A surface file has `name:` and `description:` in its frontmatter, plus any other predicates that are genuinely meaningful for that specific file.
The surface-file role and mutability class are expressed by the install transformer, not by self-declaration.

## What to do

1. Read the current surface-file spec at `work/governance/rules/specifications/`.
2. Remove the `type: surface-file` and `class:` requirements.
3. Replace with language explaining that role is expressed by the install transformer, and that frontmatter carries only theory-grounded predications.
4. Check whether any surface files in the character store currently have these bad keys and remove them.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
