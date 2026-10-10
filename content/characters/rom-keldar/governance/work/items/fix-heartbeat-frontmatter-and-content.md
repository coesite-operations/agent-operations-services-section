---
name: fix heartbeat frontmatter and content
description: HEARTBEAT.md in the character store has no frontmatter and four vague orientation-task placeholders. It needs name and description frontmatter and specific actionable tasks drawn from the current substrate state.
raised: 2026-05-14
raised-by: rom-keldar
---

# fix-heartbeat-frontmatter-and-content

## What's wrong

`doing/governing/characters/rom-keldar/HEARTBEAT.md` currently has no frontmatter.
A file with no `name:` or `description:` is unaddressable by the theory.

The body contains four placeholder tasks of the form "Run a rom-keldar turn to orient yourself" — not actionable.

## What to do

1. Add `name: heartbeat` and `description: Current focus tasks for the rom-keldar character` to frontmatter.
  No other keys — role is expressed by the install transformer, not metadata.
2. Replace the four placeholder tasks with specific items from the current `doing/working/hacking/doing/working/planning/library/task/library/` directory and the 0.2.0 milestone plan.

## Note on typing

Do NOT add `type: surface-file` or `class: mutable`.
The surface-file role is expressed by the install transformer's SURFACE array.
Metadata keys for role are the old pattern this repo is moving away from.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
