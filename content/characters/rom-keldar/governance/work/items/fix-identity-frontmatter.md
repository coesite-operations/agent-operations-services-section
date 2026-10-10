---
name: fix identity frontmatter
description: identity.md in the character store may be missing or have incorrect frontmatter. Minimal required frontmatter is name and description only — role is expressed through the install transformer, not metadata keys.
raised: 2026-05-14
raised-by: rom-keldar
---

# fix-identity-frontmatter

## What's needed

Read `identity.md`.
Confirm it has `name:` and `description:` in its frontmatter.
Remove any `type:` or `class:` keys if present — those are metadata-in-files antipatterns.
The fact that this file is a surface file is expressed by its presence in the install transformer's SURFACE array, not by a frontmatter key.

## What belongs in frontmatter

Only claims that can't be expressed positionally or relationally: `name` (slug), `description` (one-line summary).
Nothing else unless there's a specific justification grounded in the theory.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
