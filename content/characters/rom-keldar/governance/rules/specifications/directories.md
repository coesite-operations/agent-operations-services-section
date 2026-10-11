---
name: directories
description: Specifies §1 abstract.
title: "Directories"
status: draft
version: "2026.05.14.directories"
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

# Directories

## §1 Abstract

This document specifies the top-level directory layout of the 561 substrate as it bears on `work/governance/`.
It is the index spec — it does not redefine sibling directories like `work/`, `theories/`, `prose/`, or `tools/`, but it does declare what directories under `work/governance/` exist and which spec governs each.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 The `work/governance/` directory map

The polity's `work/governance/` directory MUST follow the layout below.
Sibling top-level directories (`work/`, `theories/`, etc.) are outside this spec's scope.

| Path | Required? | Governing spec |
|---|---|---|
| `work/governance/_index.md` | SHOULD | — |
| `work/governance/charter.md` | MUST | — (charter content not spec'd here) |
| `work/governance/conventions.md` | SHOULD | — |
| `work/governance/staff/` | MUST | [staff](./staff.md) |
| `doing/governing/characters/` | MUST | [characters](./characters.md) |
| `work/governance/staff/agents/` | MUST | [agents](./agents.md) |
| `work/governance/staff/offices/` | MUST | [offices](./offices.md) |
| `work/governance/specifications/` | SHOULD | (polity-wide specs; this rules/specifications/ set is character-scoped) |
| `work/governance/duties/` | MAY | — |
| `work/governance/decisions/` | MAY | — |
| `work/governance/questions/` | MAY | — |
| `work/governance/harnesses/` | MAY | — |
| `work/governance/personnel/` | MAY | — |
| `work/governance/templates/` | MAY | — |
| `work/governance/areas/`, `assets/`, `skills/` | MAY | — |

Other directories MAY appear under `work/governance/` as the polity grows; this spec SHOULD be updated when they do.

## §4 Removed and deprecated paths

As of 2026-05-14, the following paths are **removed** and MUST NOT be re-created:

| Removed path | Replacement |
|---|---|
| `work/governance/persona/` | `doing/governing/characters/` |
| `work/governance/personas/` | `doing/governing/characters/` |
| `work/governance/agents/` | `work/governance/staff/agents/` |
| `work/governance/offices/` | `work/governance/staff/offices/` |

Inbound references using the removed paths SHOULD be migrated as encountered.

## §5 Nested `work/governance/` directories

A character MAY carry a nested `work/governance/` at `doing/governing/characters/<slug>/work/governance/`.
The nested form is specified in [governance](./governance.md) §5.

Nested `work/governance/` directories MUST NOT contain a `staff/` subdirectory (§5 of [governance](./governance.md)).

## §6 Acceptance criteria

1. The four paths in §4 do not exist as directories.
2. The three subdirectories of `work/governance/staff/` exist and are populated per their respective specs.
3. `work/governance/charter.md` exists.

## §7 What this specification does not decide

- Top-level sibling directories of `work/governance/` (e.g., `work/`, `theories/`).
- The content of `charter.md`, `conventions.md`, or any other top-level governance file.
- Migration of inbound references to the removed paths.

This specification derives from [emsenn 2026-05-14] and supersedes the prior implicit layout that placed `agents/`, `offices/`, `persona/`, and `personas/` as direct children of `work/governance/`.
