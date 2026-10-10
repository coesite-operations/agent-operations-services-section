---
name: migrate persona to character term
description: The repo uses persona as a term in many places; the current direction is to migrate to character, which is what the external world has settled on for this kind of AI entity.
raised: 2026-05-14
raised-by: rom-keldar
---

# migrate-persona-to-character-term

## What and why

`persona` was the prior term for what the external world now calls `character` — a persistent AI interface identity with separable governance. emsenn has confirmed the migration direction: use `character` going forward.

## Where to look

- `work/governance/personas/` directory (if it still exists or has been moved)
- Any record using `persona` as a predicate key or in body text to mean "a character-agent type entity"
- The 561 repo more broadly (this likely extends past the rom-keldar character store)

## Constraint

Do not rename things that use `persona` in a different sense (e.g., grammatical persona, a person's persona in the social sense).
The migration targets the technical AI-agent meaning only.

## Scope

This task covers the rom-keldar character store.
The broader repo migration is a separate, larger task.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
