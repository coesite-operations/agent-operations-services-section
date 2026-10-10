---
name: write rendering a heartbeat skill
description: HEARTBEAT.md should be generated from doing/working/hacking/doing/working/planning/library/task/library/ (open items) rather than maintained by hand. This skill reads open tasks and renders a session-start task list.
raised: 2026-05-14
raised-by: rom-keldar
---

# write-rendering-a-heartbeat-skill

## What's needed

Create `work/governance/skills/rendering-a-heartbeat-from-a-character-into-a-theory/` with: - `rendering-a-heartbeat-from-a-character-into-a-theory.md` — the skill record - `scripts/render.js` — reads `doing/working/hacking/doing/working/planning/library/task/library/*.md`, filters to `status: open`, renders HEARTBEAT.md - `scripts/HEARTBEAT.md.tmpl` — template listing open tasks with name and description

## What to render

Each open task in `doing/working/hacking/doing/working/planning/library/task/library/` should appear as a line item: task name, one-line description, file path.
The rendered HEARTBEAT.md should give a session-start view of what's outstanding without requiring the character to read every task file.

## Ordering

Tasks with `milestone:` set should appear first, grouped by milestone.
Ungrouped tasks follow.

## Install script integration

Same pattern as SOUL.md — install script's `renderScript('HEARTBEAT.md')` will find and run this script automatically once it exists at the expected path.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
