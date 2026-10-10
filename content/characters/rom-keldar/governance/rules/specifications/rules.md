---
name: rules
description: Specifies §1 abstract.
title: "Rules"
status: draft
version: "2026.05.14.rules"
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

# Rules

## §1 Abstract

This document specifies what a `rules/` directory is within the 561 substrate.
A `rules/` directory is the container, scoped to a single principal (a polity, a character, an office), holding the normative documents that govern that principal's conduct and the structure of records under its control.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Placement

A `rules/` directory MUST be a child of a `work/governance/` directory belonging to the principal it scopes.
For example, Rom Keldar's rules live at `doing/governing/characters/rom-keldar/governance/rules/`.

A `rules/` directory MUST NOT be placed outside a `work/governance/` directory.

## §4 Contents

A `rules/` directory:

1. MUST contain a `specifications/` subdirectory holding RFC-style specifications (see [specifications](./specifications.md)).
2. MAY contain additional subdirectories for related normative artifacts (e.g., `policies/`, `procedures/`, `decisions/`) where those artifacts are distinct from specifications.
3. SHOULD NOT contain loose top-level files other than an optional `_index.md` summarizing the rules.

## §5 Scope

Rules placed under a principal's `rules/` directory bind only that principal and the records under its control.
Rules MUST NOT silently bind other principals; cross-principal binding requires explicit reference from the bound principal's own rules.

## §6 What this specification does not decide

- The contents of any specific specification — see [specifications](./specifications.md).
- Conflict resolution between rules from nested principals (e.g., a character whose rules conflict with the polity's).
- Promotion of a rule from draft to enforced.

This specification derives from [emsenn 2026-05-14].
