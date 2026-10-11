---
name: heartbeat file
description: Specifies §1 abstract.
title: "HEARTBEAT.md"
status: draft
version: "2026.05.14.heartbeat-file"
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
  theory-openclaw-heartbeat:
    class: theory-term
    title: "openclaw-heartbeat"
    note: "theories/.../artificial-intelligence/openclaw-heartbeat.md"
  surface-files-spec:
    class: specification
    title: "Surface Files"
    note: "doing/governing/characters/rom-keldar/governance/rules/specifications/surface-files.md"
---

# HEARTBEAT.md

## §1 Abstract

This document specifies the format and content of `HEARTBEAT.md` files for characters in the 561 substrate.
HEARTBEAT.md is the character's current-focus task list: a short, mutable checklist of recurring or opportunistic awareness tasks the character should carry out when conditions permit.
It is not a full todo list and not a project plan.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Purpose

Per [theory-openclaw-heartbeat]: HEARTBEAT.md defines low-frequency proactive behavior — things the character should check or do opportunistically, not on a fixed schedule.
It is the character's standing orientation, read regularly but not exhaustively.

The distinction from `work/`: HEARTBEAT.md items are recurring or standing awareness tasks.
In-flight, one-time tasks belong in `work/`.

## §4 Mutable class

HEARTBEAT.md is **mutable**.
The character MAY update it during a session when: a standing task is completed and should be removed, a new standing task is added by principal direction, or priorities shift.
The character MUST NOT add items to HEARTBEAT.md based solely on its own inference about what would be useful — items require principal direction or completion of an existing task that reveals a follow-on.

## §5 Required content

A HEARTBEAT.md MUST contain:

1. **A heading** — Identifying whose heartbeat this is and its general focus area.
2. **A checklist** — Markdown task items (`- [ ] ...
  `).
  Items MUST be actionable: specific enough that the character knows when it has done them.

## §6 Length constraint

A HEARTBEAT.md SHOULD contain no more than 20 items.
If it grows beyond 20, the oldest or least-current items SHOULD be moved to `work/` records or removed.

The intent per [theory-openclaw-heartbeat]: HEARTBEAT.md should stay short.
A long heartbeat is a sign that it has become a general todo list.

## §7 Item format

Each item MUST be a markdown task item: `- [ ] <action>` or `- [x] <action>` (completed).

Items SHOULD include enough context to be understood by a future session that has not read the current session's chat history.
They MUST NOT assume knowledge of this session.

Completed items (`- [x]`) SHOULD be removed or archived rather than accumulating.

## §8 Forbidden content

A HEARTBEAT.md MUST NOT contain:

1. **Identity or disclosure rules** — IDENTITY.md.
2. **Values or behavioral constraints** — SOUL.md.
3. **Project context, key paths, or spec listings** — MEMORY.md.
4. **Goals** — DREAMS.md.
5. **Detailed task plans or multi-step procedures** — `work/` records.
6. **Secrets or credentials** — Never.

## §9 Frontmatter

A HEARTBEAT.md SHOULD carry a plain heading or YAML frontmatter.
If frontmatter is used, it SHOULD include `name:` and `description:`.
The `type:` SHOULD be `surface-file` and `class:` SHOULD be `mutable`.
Frontmatter is OPTIONAL on HEARTBEAT.md given its mutable nature; the heading alone suffices.

## §10 Acceptance criteria

A HEARTBEAT.md is conformant if:

1. It contains only markdown task items (plus the heading).
2. It has 20 or fewer items.
3. Items are actionable and session-independent.
4. It contains no SOUL, MEMORY, IDENTITY, or DREAMS content.

## §11 What this specification does not decide

- How often a session should check HEARTBEAT.md (that is the character's judgment).
- Whether completed items are archived or deleted (either is acceptable).
- Whether items have priorities, deadlines, or assignees (these are optional extensions).
