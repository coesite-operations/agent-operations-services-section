---
name: staff
description: Specifies §1 abstract.
title: "Staff"
status: draft
version: "2026.05.14.staff"
date: 2026-05-14
authors: [emsenn, claude-opus-4-7]
references:
  emsenn2026-05-14:
    class: report
    authors: ["Sennhauser, Morgan"]
    year: 2026
    title: "Order to restructure work/governance/ staff and encode preferences as RFC specifications"
    institution: "561 polity"
    note: "Verbal directive issued 2026-05-14"
---

# Staff

## §1 Abstract

This document specifies what `work/governance/staff/` is within the 561 substrate.
`staff/` is the parent directory grouping the three kinds of identity-bearing principal: **characters**, **agents**, and **offices**.
The grouping reflects that all three are roles a session, process, or person may occupy; they differ in persistence, autonomy, and personhood.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Placement

The `staff/` directory MUST be a direct child of `work/governance/`.
There MUST be exactly one `staff/` directory per polity at `work/governance/staff/`.

## §4 Contents

`work/governance/staff/` MUST contain exactly three subdirectories:

| Subdirectory | What it holds | Spec |
|---|---|---|
| `characters/` | Character records (persistent identities with optional memory, skills, work, governance) | [characters](./characters.md) |
| `agents/` | Agent records (dispatchable executables: subagents, slash-commands, automation) | [agents](./agents.md) |
| `offices/` | Office records (roles with charters and duties that incumbents occupy) | [offices](./offices.md) |

`work/governance/staff/` MAY contain an `_index.md` summarizing the staff layout.
It MUST NOT contain other loose files or subdirectories.

## §5 Why these three categories

Following the AI-characters survey of May 2026, the substrate distinguishes:

- **Characters** carry persistent identity *and* persistent memory across sessions.
  They have a stable persona that does not collapse into a single tool invocation.
- **Agents** are dispatchable execution units.
  They MAY carry skills and instructions, but they are stateless across invocations except through what they write back to the substrate.
- **Offices** are roles independent of any incumbent.
  An office persists even when no character or agent currently occupies it; an incumbent record (see `work/governance/incumbents/` if present) joins a principal to an office at a moment in time.

A single principal MAY be a character that occupies an office and dispatches agents; the three categories are not mutually exclusive at the level of behavior, only at the level of record type.

## §6 What this specification does not decide

- The internal structure of each of the three subdirectories — see [characters](./characters.md), [agents](./agents.md), [offices](./offices.md).
- How incumbents are recorded.
- How a session at runtime resolves which character/agent/office is active.

This specification derives from [emsenn 2026-05-14].
