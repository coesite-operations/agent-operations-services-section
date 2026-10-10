---
name: making per class crud skills
description: Build making-a-concept, making-a-structure, making-a-transformer, making-a-memory, and making-a-skill skills, each calling making-a-resource with class-specific path defaults and frontmatter.
raised: 2026-05-14
raised-by: rom-keldar
depends-on:
  - making-a-resource
---

# making-per-class-crud-skills

## What to build

Each skill follows the same shape as making-a-task: 1.
A skill record `.md` documenting usage and what it does.
2.
A `scripts/make.js` that calls making-a-resource logic with class-specific path defaults.

| Skill | Target path | Extra frontmatter defaults |
|---|---|---|
| `making-a-concept` | `concepts/<slug>.md` | none beyond name/description |
| `making-a-structure` | `structures/<slug>.md` | none |
| `making-a-transformer` | `transformers/<slug>.md` | none |
| `making-a-memory` | `memory/<YYYY-MM-DD>-<slug>.md` | none |
| `making-a-skill` | `work/governance/skills/<slug>/` | scaffolds record + scripts/ directory |

`making-a-skill` is the most complex: it should scaffold the full skill directory (record .md + empty `scripts/` with a placeholder `make.js`).

## Why

Each session that needs a new concept currently has to remember the correct path and frontmatter format.
These skills make that mechanical and lint-clean by default.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
