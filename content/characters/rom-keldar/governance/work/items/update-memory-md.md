---
name: update memory md
description: MEMORY.md is stale — spec index doesn't include specs written in the 2026-05-14 session, skills table is outdated, and there is noise from the previous character (Karen Wiener Chinese aerophone note).
raised: 2026-05-14
raised-by: rom-keldar
---

# update-memory-md

## What's wrong

`MEMORY.md` serves as the session-start spec index.
It is stale in three ways:

1. **Spec index missing new specs** — the following specs were written or significantly revised on 2026-05-14 and are not listed:
   - `structures/version-record.md`
   - `structures/soul.md`
   - `transformers/cut-version.md`
   - `work/governance/skills/releasing-a-theory/releasing-a-theory.md`
   - `work/governance/skills/rendering-a-soul-from-a-character-into-a-theory/`
   - `work/governance/skills/installing-a-character-in-a-theory/`
   - `work/governance/skills/uninstalling-a-character-in-a-theory/`

2. **Skills table outdated** — same skills missing; also the render-script approach for SOUL.md is not documented.

3. **Karen Wiener Chinese aerophone note** — there is a stray note about a Chinese aerophone that belongs to the previous character's memory.
  Remove it.

## What to do

Read `MEMORY.md`, identify each stale section, and rewrite it.
Do not add padding — each spec entry should be `path — one-line description`.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
