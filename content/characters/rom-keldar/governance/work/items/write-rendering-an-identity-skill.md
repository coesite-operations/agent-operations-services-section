---
name: write rendering an identity skill
description: IDENTITY.md is currently installed as a static copy. It should be generated from character-store data via a rendering skill, following the same pattern as rendering-a-soul-from-a-character-into-a-theory.
raised: 2026-05-14
raised-by: rom-keldar
---

# write-rendering-an-identity-skill

## What's needed

Create `work/governance/skills/rendering-an-identity-from-a-character-into-a-theory/` with: - `rendering-an-identity-from-a-character-into-a-theory.md` — the skill record - `scripts/render.js` — reads identity data from character store, renders IDENTITY.md - `scripts/IDENTITY.md.tmpl` — the template

## What identity data lives where

Currently `identity.md` in the character store is the source.
The rendering skill should read from it (or from more granular concept/structure files if the data gets split out later).
For 0.2.0, reading `identity.md` directly and rendering a clean IDENTITY.md from it is sufficient.

## Install script integration

The install script already calls `renderScript(dest)` for each surface file.
Once this skill exists at the expected path, `IDENTITY.md` will be generated automatically on install rather than statically copied.

## Reference

Pattern: `work/governance/skills/rendering-a-soul-from-a-character-into-a-theory/`

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
