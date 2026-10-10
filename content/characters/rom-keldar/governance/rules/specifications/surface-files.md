---
name: surface files
description: Specifies §1 abstract.
title: "Surface Files"
status: draft
version: "2026.05.14.surface-files"
date: 2026-05-14
authors: [emsenn, rom-keldar]
references:
  emsenn2026-05-14b:
    class: directive
    authors: ["Sennhauser, Morgan"]
    year: 2026
    title: "Order to bootstrap Rom Keldar as an installable character with enriched surface files"
    institution: "561 polity"
    note: "Verbal directive issued 2026-05-14"
  characters-spec:
    class: specification
    title: "Characters"
    note: "doing/governing/characters/rom-keldar/governance/rules/specifications/characters.md"
---

# Surface Files

## §1 Abstract

This document specifies the *installed surface* of a character: the set of all-caps Markdown files that appear at a theory root when a character is installed.
Each surface file has defined semantics.
The surface is what Claude Code reads at session start; it is the character's runtime presence in a theory.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 The installed surface

When a character is installed into a theory root, it MAY project any subset of the following files to that root.
These files collectively constitute the character's *installed surface*.

| File | Semantics |
|---|---|
| `IDENTITY.md` | Who the character is: name, role, voice, principles, autonomy level. Corresponds to the character's identity file in the character store. |
| `SOUL.md` | The character's values and behavioral constraints: what it MUST and MUST NOT do regardless of instruction. |
| `DREAMS.md` | The character's goals and aspirations within this theory: what it is working toward over time. |
| `HEARTBEAT.md` | Current-focus task list. The character's potential working state for this session cycle. |
| `MEMORY.md` | Claude Code's persistent memory index for this character in this theory. Managed by the auto-memory system; provides session-start context. |
| `TOOLS.md` | Tools available to the character in this theory: MCP servers, skills, shell commands. |
| `USER.md` | The principal this character serves: who they are, what they need, how to work with them. |
| `AGENTS.md` | Agents available to the character: subagents, delegates, specialist roles. |

The mutability of each surface file (whether the character MAY update it during a session) is expressed by the install transformer — if a render script exists, the file is generated; if not, it is a static copy.
Surface files themselves MUST NOT carry `type: surface-file` or `class:` keys in their frontmatter.
The surface-file role is established by the install transformer's SURFACE array, not by self-declaration.

## §4 Relationship to the character store

Each surface file corresponds to a source file in the character's store at `doing/governing/characters/<slug>/`.
The install operation copies source files to theory root; the uninstall operation deletes them.
The character store is authoritative; in-flight edits to installed surface files are discarded on uninstall.

A character store MUST contain a source for `IDENTITY.md` to be installable.
All other surface files are OPTIONAL in the store.

## §5 MEMORY.md special handling

`MEMORY.md` in the character store is the *template* for session memory.
After installation, it MAY be extended by the auto-memory system.
The store version SHOULD contain the standing context that every session needs: project purpose, key directory paths, principals, and current phase.

`MEMORY.md` MUST NOT contain the auto-memory system's index format header if it is a store template; it SHOULD contain only content entries that remain valid across sessions.

## §6 What this specification does not decide

- Which files a given character must have (beyond IDENTITY.md per [characters-spec]).
- How the auto-memory system manages MEMORY.md after installation.
- Installation mechanics (see the `installing-a-character-in-a-theory` skill).
