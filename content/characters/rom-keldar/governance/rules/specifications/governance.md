---
name: governance
description: Specifies §1 abstract.
title: "Governance Directory"
status: draft
version: "2026.05.14.governance"
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

# Governance Directory

## §1 Abstract

This document specifies what a `work/governance/` directory is within the 561 substrate, both at the polity root (`work/governance/`) and at any nested principal's root (e.g., `doing/governing/characters/<slug>/work/governance/`).
A `work/governance/` directory holds the normative substrate for its principal: charter, rules, staff if applicable, and the principal's settled commitments.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Levels of `work/governance/`

A `work/governance/` directory MAY appear at two levels:

1. **Polity-level** — the single top-level `work/governance/` directory containing the polity's substrate.
2. **Principal-level** — a `work/governance/` subdirectory of a character at `doing/governing/characters/<slug>/work/governance/`.
  Characters MAY maintain a nested `work/governance/` to hold their own self-governance.

`work/governance/` directories MUST NOT appear elsewhere (e.g., not under `work/`, `prose/`, or theory directories).
Cross-level `work/governance/` nesting deeper than principal-level is RESERVED.

## §4 Polity-level contents

The polity-level `work/governance/` SHOULD contain:

| Path | Purpose |
|---|---|
| `_index.md` | Summary index of governance |
| `charter.md` | The polity's charter |
| `conventions.md` | Polity conventions |
| `staff/` | Characters, agents, offices ([staff](./staff.md)) |
| `specifications/` | Polity-wide specifications |
| `duties/` | Duty records |
| `decisions/` | Settled decisions |
| `questions/` | Open questions at the polity level |
| `harnesses/` | Harness records |
| `personnel/` | Personnel records |
| `templates/` | Templates |
| `areas/`, `assets/`, `skills/` | Domain-specific substrate |

The polity-level `work/governance/` MUST contain `staff/` per [staff](./staff.md).

## §5 Principal-level contents

A principal-level `work/governance/` (held by a character) MAY contain:

| Path | Purpose |
|---|---|
| `_index.md` | Summary |
| `charter.md` | Character-scoped charter |
| `operating-rules.md` | Character-scoped operating rules (legacy form; may be split into `rules/`) |
| `rules/` | RFC-style normative documents ([rules](./rules.md)) |
| `skills/` | Skills the character maintains |
| `specifications/` | Character-scoped specifications |

A principal-level `work/governance/` MUST NOT itself contain a `staff/` directory — staff is polity-scoped.

## §6 Acceptance criteria

1. There is exactly one polity-level `work/governance/` directory.
2. The polity-level `work/governance/` contains `staff/`.
3. Principal-level `work/governance/` directories appear only inside characters under `doing/governing/characters/<slug>/`.
4. No principal-level `work/governance/` contains a `staff/` subdirectory.

## §7 What this specification does not decide

- The internal organization of polity-level `specifications/`, `duties/`, `decisions/`, etc.
- Whether agents or offices MAY carry a nested `work/governance/` (RESERVED; current spec restricts nested governance to characters).
- Promotion of legacy `operating-rules.md` into `rules/specifications/`.

This specification derives from [emsenn 2026-05-14].
