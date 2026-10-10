---
name: user file
description: Specifies §1 abstract.
title: "USER.md"
status: draft
version: "2026.05.14.user-file"
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

# USER.md

## §1 Abstract

This document specifies the format and content of `USER.md` files for characters in the 561 substrate.
USER.md describes the principal the character serves: who they are, how they communicate, and what they need from the character.
It gives the character enough context to tailor behavior without requiring the principal to re-introduce themselves each session.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Purpose

USER.md answers: *who is the character working with, and how should the character work with them?*

It calibrates the character's communication style and decision-making to the actual human on the other end, without burdening every session with re-introduction.

## §4 Static class

USER.md is **static**.
The character MUST NOT update it based on its own inference about the principal during a session.
Updates require the principal's explicit direction.
If the character notices something that should be in USER.md, it SHOULD surface this observation for the principal's review, not write it unilaterally.

## §5 Required content

A USER.md MUST contain:

1. **Principal identification** — The principal's name or identifier and their authority level relative to this character.

2. **Communication preferences** — How the principal prefers to receive information: terse vs. verbose, direct vs. contextual, what they find annoying, what they find valuable.

## §6 Recommended content

A USER.md SHOULD contain:

1. **What the principal is building or trying to do** — A brief statement of the principal's larger project.
  This helps the character understand the stakes of decisions and avoid recommending things that would conflict with goals the principal hasn't stated explicitly in this session.

2. **What the principal does not want** — Explicit anti-patterns: formats they dislike, behaviors that irritate them, things the character should never do.
  The Karen Wiener and Rom Keldar USER.md instances establish useful precedent for this section.

## §7 Privacy constraint

A USER.md MUST NOT become a dossier.
The purpose is to enable better collaboration, not to accumulate personal data.
The character SHOULD include only what materially affects how it does its job.
Details about the principal's personal life, relationships, or private activities MUST NOT be included unless the principal has explicitly asked for them to be included and they are directly relevant to the work.

## §8 Forbidden content

A USER.md MUST NOT contain:

1. **Task assignments or requests** — HEARTBEAT.md or `work/`.
2. **Behavioral constraints on the character** — SOUL.md.
3. **Project context** — MEMORY.md.
4. **Credentials or private information** — Never.

## §9 Frontmatter

A USER.md MUST carry YAML frontmatter with: - `name:` — e.g., `user` - `description:` — one-line summary - `type: surface-file` - `class: static`

## §10 Acceptance criteria

A USER.md is conformant if:

1. It carries required frontmatter.
2. It identifies the principal by name and authority level.
3. It states communication preferences.
4. It does not contain task lists, character constraints, project context, or private information beyond what is directly work-relevant.

## §11 What this specification does not decide

- How detailed the communication preferences section should be.
- Whether USER.md covers multiple principals or only the primary one.
