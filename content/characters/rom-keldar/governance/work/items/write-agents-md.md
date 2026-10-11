---
name: write agents md
description: The character store has no AGENTS.md. It needs one per the agents-file spec — stating that only locally-defined agents under .claude/agents/ may be dispatched, with the generic built-ins hard-blocked by the local-agents-only hook.
raised: 2026-05-14
raised-by: rom-keldar
---

# write-agents-md

## What's needed

`doing/governing/characters/rom-keldar/AGENTS.md` does not exist.
It needs to be written and added to the install/uninstall SURFACE arrays so it gets deployed to the theory root.

## What it should contain

1. **Policy**: Only a locally-defined agent (one with a `.claude/agents/<name>.md` file) may be dispatched. Purpose-built local agents are legitimate tools; use them. The `pretool-local-agents-only.sh` hook derives the allowlist from the filesystem and hard-blocks the built-in generic agents (general-purpose, Explore, Plan, claude, the unnamed default).
2. **To add one**: create `.claude/agents/<name>.md`; it becomes dispatchable automatically.
3. **Red lines**: Never add `--skip-hooks` or modify `.claude/settings.json` to weaken the local-agents-only block without emsenn's explicit direction.

## Related

- Hook installed at: `.claude/settings.json` PreToolUse, matcher `Agent`
- Character-store hook mirror: `doing/governing/characters/rom-keldar/hooks/hooks.json`
- Install script adds AGENTS.md to SURFACE array: `work/governance/skills/installing-a-character-in-a-theory/scripts/`

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
