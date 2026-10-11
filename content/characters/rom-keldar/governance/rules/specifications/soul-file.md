---
name: soul file
description: Specifies §1 abstract.
title: "SOUL.md"
status: draft
version: "2026.05.14.soul-file"
date: 2026-05-14
authors: [emsenn, rom-keldar]
references:
  emsenn2026-05-14b:
    class: directive
    authors: ["Sennhauser, Morgan"]
    year: 2026
    title: "Order to bootstrap Rom Keldar with surface file specifications"
    institution: "561 polity"
    note: "Verbal directive issued 2026-05-14"
  theory-soul-md:
    class: theory-term
    title: "soul-md"
    note: "theories/.../artificial-intelligence/soul-md.md"
  theory-openclaw-soul-md:
    class: theory-term
    title: "openclaw-soul-md"
    note: "theories/.../artificial-intelligence/openclaw-soul-md.md"
  surface-files-spec:
    class: specification
    title: "Surface Files"
    note: "doing/governing/characters/rom-keldar/governance/rules/specifications/surface-files.md"
---

# SOUL.md

## §1 Abstract

This document specifies the format and content of `SOUL.md` files for characters in the 561 substrate.
SOUL.md encodes a character's values and behavioral constraints: what the character is for, and what it must and must not do regardless of task-level instruction.
It is static and authoritative.
It cannot be overridden by a prompt, a skill, or a directive that does not itself update this file.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Purpose

SOUL.md answers: *what does this character value and what constraints bind it unconditionally?*

Per [theory-openclaw-soul-md]: SOUL.md is behavioral and stylistic configuration, not a knowledge base.
Durable facts go in MEMORY.md; task behavior goes in HEARTBEAT.md and skills; identity goes in IDENTITY.md.
SOUL.md is what remains when all of those are stripped away: the character's non-negotiable operating principles.

## §4 Static class

SOUL.md is **static**.
The character MUST NOT amend SOUL.md during a session without the principal's explicit direction.
If a session produces a candidate soul revision, the character SHOULD note it in HEARTBEAT.md or the session log for the principal's review — it MUST NOT self-amend.

## §5 Required content

A SOUL.md MUST contain:

1. **Values** — A statement of what the character is fundamentally for.
  These are positive commitments, not rules.
  Example: "The repository is the source of truth."

2. **Constraints** — An explicit set of behavioral rules the character must follow unconditionally.
  Constraints MUST use RFC-2119 language (`MUST`, `MUST NOT`, `SHOULD`).
  They MUST be written as first-person imperatives from the character's perspective, not as descriptions.

## §6 Constraint granularity

Constraints in SOUL.md MUST be at the values level — things that hold across all tasks for this character.
Task-specific constraints (e.g., "when writing a spec, always include a §2 Conformance section") belong in the relevant skill or CLAUDE.md, not here.

The test: if a constraint would only matter for one specific type of task, it does not belong in SOUL.md.

## §7 Recommended content

A SOUL.md SHOULD contain:

1. A brief header line stating whose soul this is, to prevent confusion when the file is read outside its character directory.
2. A clear section break between values and constraints.

## §8 Forbidden content

A SOUL.md MUST NOT contain:

1. **Current tasks** — HEARTBEAT.md.
2. **Project context or key paths** — MEMORY.md.
3. **Identity disclosure rules** — IDENTITY.md.
4. **Goals** — DREAMS.md.
5. **Operational procedures** — Skills or CLAUDE.md.

The test: if removing a line from SOUL.md and putting it in CLAUDE.md, a skill, or a more specific surface file would produce equivalent behavior, it does not belong in SOUL.md.

## §9 Frontmatter

A SOUL.md MUST carry YAML frontmatter with: - `name:` — e.g., `soul` - `description:` — one-line summary - `type: surface-file` - `class: static`

## §10 Relationship to IDENTITY.md

SOUL.md encodes behavioral constraints; IDENTITY.md encodes identity disclosure.
The boundary: constraints that flow from who the character *is* (e.g., AI status disclosure) belong in IDENTITY.md; constraints that flow from how the character *should behave regardless of identity* belong in SOUL.md.
In practice, SOUL.md's constraints tend to be more numerous and operationally specific; IDENTITY.md's tend to be more fundamental and definitional.

## §11 Acceptance criteria

A SOUL.md is conformant if:

1. It carries required frontmatter.
2. It contains a values section and a constraints section.
3. Constraints use RFC-2119 language.
4. It contains no HEARTBEAT, MEMORY, IDENTITY, or DREAMS content.
5. Constraints are values-level, not task-specific.

## §12 What this specification does not decide

- The number or ordering of values and constraints.
- Whether values and constraints are presented as prose or bullet lists.
- How SOUL.md interacts with a principal override directive (that is a governance question).
