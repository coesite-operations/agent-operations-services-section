---
name: skills
description: Specifies §1 abstract.
title: "Skills"
status: draft
version: "2026.05.14.skills"
date: 2026-05-14
authors: [emsenn, rom-keldar]
references:
  emsenn2026-05-14b:
    class: directive
    authors: ["Sennhauser, Morgan"]
    year: 2026
    title: "Order to bootstrap Rom Keldar as an installable character with enriched surface files"
    institution: "561 polity"
    note: "Verbal directive issued 2026-05-14"
  characters-spec:
    class: specification
    title: "Characters"
    note: "doing/governing/characters/rom-keldar/governance/rules/specifications/characters.md"
---

# Skills

## §1 Abstract

This document specifies the structure of a *skill* record within the 561 substrate.
A skill is a reusable procedural unit: a combination of a record file (what the skill is), an optional script directory (how it executes), and a Claude Code projection (how it is invoked).
Skills are the primary mechanism by which characters extend Claude Code's behavior.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Placement

A skill MUST live at `work/governance/skills/<slug>/` within a character's store, where `<slug>` is a kebab-case identifier unique within that character's skills.
The canonical path is therefore:

```
doing/governing/characters/<character>/work/governance/skills/<skill-slug>/
```

## §4 Required contents

A skill directory MUST contain:

1. A **record file** at `<skill-slug>.md` that documents the skill: what it does, when to use it, what it requires.

2. A **SKILL.md** file suitable for projection to `.claude/skills/<skill-slug>/SKILL.md`.
  This file is what Claude Code reads when the skill is invoked as a slash command.
  It MUST contain frontmatter with `name:` and `description:` fields, and a body that tells Claude Code exactly how to execute the skill (typically: run a script with `$ARGUMENTS`).

## §5 Optional contents

A skill directory MAY contain:

| Path | Purpose |
|---|---|
| `scripts/` | Executable scripts that implement the skill's logic |
| `scripts/package.json` | Node.js package config; MUST contain `{"type":"module"}` if scripts use ESM |

Scripts SHOULD be written in Node.js (ESM) or POSIX shell.
Scripts MUST be idempotent where the operation permits it.

## §6 Projection to Claude Code

Skills are made invocable by projecting `SKILL.md` to `.claude/skills/<skill-slug>/SKILL.md` at the theory root.
This projection SHOULD happen as part of character installation or as a dedicated skill-projection step.

The SKILL.md body MUST instruct Claude Code to invoke the skill's script (if any) with `$ARGUMENTS` passed through.
If the skill has no script, SKILL.md MUST describe the manual procedure Claude Code should follow.

## §7 Acceptance criteria

1. Every skill directory carries both a record file (`<slug>.md`) and a `SKILL.md`.
2. Every `SKILL.md` has frontmatter with `name:` and `description:`.
3. Every ESM script directory carries `package.json` with `{"type":"module"}`.
4. Scripts invoked by SKILL.md accept `$ARGUMENTS` as their argument string.

## §8 What this specification does not decide

- The language or runtime of skill scripts (Node.js, shell, Python, etc.).
- How skills are versioned or deprecated.
- Whether a skill requires network access or filesystem permissions beyond the theory root.
