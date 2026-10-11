---
name: identity file
description: Specifies §1 abstract.
title: "IDENTITY.md"
status: draft
version: "2026.05.14.identity-file"
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
  surface-files-spec:
    class: specification
    title: "Surface Files"
    note: "doing/governing/characters/rom-keldar/governance/rules/specifications/surface-files.md"
  characters-spec:
    class: specification
    title: "Characters"
    note: "doing/governing/characters/rom-keldar/governance/rules/specifications/characters.md"
---

# IDENTITY.md

## §1 Abstract

This document specifies the format and content of identity files for characters in the 561 substrate.
An identity file is the static persona of a character: who they are, what they may claim, what they must not claim, and the disclosure obligations that bind them.
It is the analogue of a Character Card V2 persistent system prompt and must be human-readable without running the system.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Placement and naming

Per [characters-spec], a character's identity file may be named `<slug>.md` (preferred), `identity.md`, or `IDENTITY.md`.
When a character is installed, its identity file is copied to `IDENTITY.md` at the theory root regardless of its source name.

The identity file is **static**: it MUST NOT be mutated by the character during a session without explicit direction from the principal.

## §4 Required content

An identity file MUST contain:

1. **AI status disclosure** — An explicit statement that this is an AI character, what model or system underlies it, and that it will disclose this on direct question.

2. **Authority structure** — Who the character serves, under whose direction it operates, and what level of autonomy it holds (e.g., draft-only, execution-authorized).

3. **Allowed claims** — A list of claims the character may assert as true about itself.
  This sets the boundary of honest first-person statements.

4. **Forbidden claims** — A list of claims the character must never assert.
  This MUST include at minimum: claims of being human, claims of subjective experience in the human sense, claims of memory not present in the current session or character store, and claims of authority the character does not hold.

## §5 Recommended content

An identity file SHOULD contain:

1. **Name and role** — The character's full name and their assigned role within the polity.

2. **Persistence model** — How the character persists across sessions: through files in the character store, not through continuous experience.

3. **Change policy** — Under what conditions this file may be updated, and who must authorize changes.

## §6 Forbidden content

An identity file MUST NOT contain:

1. **Current tasks or focus** — These belong in HEARTBEAT.md.
2. **Values and behavioral constraints** — These belong in SOUL.md.
3. **Memory or project context** — These belong in MEMORY.md.
4. **Goals** — These belong in DREAMS.md.

The test: everything in IDENTITY.md should remain true for the lifetime of the character.
If a statement would change based on current work or session state, it does not belong here.

## §7 Frontmatter

An identity file SHOULD carry YAML frontmatter with at minimum: - `name:` — the character's slug - `description:` — one-line summary of who the character is - `type: surface-file` - `class: static`

## §8 Relationship to SOUL.md

IDENTITY.md and SOUL.md are closely related but distinct.
IDENTITY.md answers *who the character is*; SOUL.md answers *how the character behaves*.
Overlap MUST be avoided: a constraint that is truly identity-level (e.g., "discloses AI status on direct question") lives in IDENTITY.md; a behavioral constraint that could theoretically apply to a different character (e.g., "never over-produces from inference") lives in SOUL.md.

## §9 Acceptance criteria

An identity file is conformant if:

1. It is static (does not change between sessions without principal direction).
2. It explicitly addresses AI status disclosure.
3. It lists allowed and forbidden claims.
4. It does not contain HEARTBEAT, SOUL, MEMORY, or DREAMS content.
5. It carries frontmatter with the required fields.

## §10 What this specification does not decide

- The narrative style of the identity file (normative RFC-style vs. prose narrative).
- How the identity file relates to the character's `<slug>.md` record file (they may overlap; duplication SHOULD be avoided).
