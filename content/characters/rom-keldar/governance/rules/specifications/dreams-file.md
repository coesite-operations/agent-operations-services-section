---
name: dreams file
description: Specifies §1 abstract.
title: "DREAMS.md"
status: draft
version: "2026.05.14.dreams-file"
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
---

# DREAMS.md

## §1 Abstract

This document specifies the format and content of `DREAMS.md` files for characters in the 561 substrate.
DREAMS.md is the character's goals and aspirations within its assigned theory: what it is working toward over time.
It is semi-static — it changes when goals meaningfully shift, not on routine session activity.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Purpose

DREAMS.md answers: *what is this character trying to accomplish over a longer horizon than a single session?*

It gives a session orientation toward what matters without prescribing specific tasks (HEARTBEAT.md) or constraining behavior (SOUL.md).
A character that has read DREAMS.md should understand what success looks like and what it should decline to pursue.

## §4 Semi-static class

DREAMS.md is **semi-static**.
The character SHOULD NOT update it during routine session work.
It SHOULD be updated only when: the principal redirects the character's overall mission, a goal is substantially completed, or a goal proves unachievable.
Updates require principal direction.

## §5 Required content

A DREAMS.md MUST contain:

1. **Primary goal** — A single clear statement of what the character is ultimately for within this theory.
  This is the north star: sessions that are not moving toward it are potentially misdirected.

2. **What the character is not trying to do** — An explicit scope exclusion.
  This prevents mission drift and over-reach.
  At minimum it MUST address: what authority the character does not have (canonization, restructuring) and what it should not attempt unilaterally.

## §6 Recommended content

A DREAMS.md SHOULD contain:

1. **Secondary goals** — Supporting goals that serve the primary goal.
  These are ordered by relevance to the primary goal, not by urgency.

2. **Horizon framing** — A note on timescale (e.g., "over the bootstrapping phase," "across this session cycle") so the character can distinguish near-term from long-term orientation.

## §7 Forbidden content

A DREAMS.md MUST NOT contain:

1. **Current tasks** — HEARTBEAT.md.
2. **Behavioral constraints** — SOUL.md.
3. **Identity disclosure** — IDENTITY.md.
4. **Project context or memory** — MEMORY.md.

The test: goals are about *where the character is going*; constraints are about *how it travels*; tasks are *what it is doing right now*.
Only the first belongs in DREAMS.md.

## §8 Frontmatter

A DREAMS.md MUST carry YAML frontmatter with: - `name:` — e.g., `dreams` - `description:` — one-line summary - `type: surface-file` - `class: semi-static`

## §9 Acceptance criteria

A DREAMS.md is conformant if:

1. It carries required frontmatter.
2. It states a primary goal.
3. It states explicitly what the character is not trying to do.
4. It contains no HEARTBEAT, SOUL, IDENTITY, or MEMORY content.

## §10 What this specification does not decide

- How dreams and goals relate to formal milestone or plan records in `work/`.
- Whether DREAMS.md goals are measurable or time-bound (this is up to the principal).
