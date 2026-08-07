---
name: offices
description: Specifies §1 abstract.
title: "Offices"
status: draft
version: "2026.05.14.offices"
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

# Offices

## §1 Abstract

This document specifies what an *office* record is within the 561 substrate.
An office is a named role with a charter and a set of duties, distinct from any particular incumbent who may occupy it.
Office records live under `work/governance/staff/offices/`.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Placement

Each office record MUST live at `work/governance/staff/offices/<slug>.md` or `work/governance/staff/offices/<slug>/` where `<slug>` is a kebab-case identifier unique among offices.

Single-file form is preferred for offices whose definition fits in one document.
Directory form MAY be used when the office maintains auxiliary records (e.g., runbooks, jural relations bound to the office).

## §4 Required contents

The primary office file MUST carry frontmatter declaring:

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | string | yes | MUST be `office`. |
| `slug` | string | yes | MUST match the directory or filename slug. |
| `charter` | string or path | yes | Either the charter text inline, or a relative path to it. |

The body SHOULD include:

1. **Purpose** — what the office exists for.
2. **Duties** — what an incumbent of this office is bound to do.
3. **Powers** — what an incumbent of this office is permitted to do.
4. **Default incumbent** (if any) — who occupies it by default, or that the office is vacant.

## §5 Distinction from agents and characters

An office:

1. Persists **independent of any incumbent**.
  An office MAY be vacant.
2. Defines **what is to be done**, not **who does it**.
  The incumbent is a separate joining record.
3. Does NOT itself carry memory, runtime state, or heartbeat.
  Those belong to the character or agent occupying the office.

An office record MUST NOT carry `memory/`, `work/`, or `HEARTBEAT.md`.
An office record MAY reference incumbents via path or slug, but the incumbent record itself lives elsewhere (e.g., `work/governance/incumbents/` if present).

## §6 Optional contents

An office in directory form MAY contain:

- `_index.md` — summary index.
- `duties/` — duty records bound to this office.
- `runbooks/` — operational runbooks the incumbent executes.
- `jural-relations/` — Hohfeldian relations the office bears (powers, duties, privileges, immunities).

## §7 Acceptance criteria

1. Every file or directory under `work/governance/staff/offices/` declares `type: office` in frontmatter.
2. No office record carries `memory/`, `work/`, or `HEARTBEAT.md`.
3. Every office's `slug` matches its filename or directory name.
4. Every office record states purpose, duties, and powers in the body.

## §8 What this specification does not decide

- How incumbents are recorded, induced, or rotated.
- The full structure of jural-relation records bound to offices.
- Cross-office conflict resolution.

This specification derives from [emsenn 2026-05-14].
