---
name: memory file
description: Specifies §1 abstract.
title: "MEMORY.md"
status: draft
version: "2026.05.14.memory-file"
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
  theory-openclaw-memory:
    class: theory-term
    title: "openclaw-memory"
    note: "theories/.../artificial-intelligence/openclaw-memory.md"
  surface-files-spec:
    class: specification
    title: "Surface Files"
    note: "doing/governing/characters/rom-keldar/governance/rules/specifications/surface-files.md"
  mcp-server-spec:
    class: specification
    title: "MCP Server"
    note: "doing/governing/characters/rom-keldar/governance/rules/specifications/mcp-server.md"
---

# MEMORY.md

## §1 Abstract

This document specifies the format and content of `MEMORY.md` files for characters in the 561 substrate.
MEMORY.md provides session-start context: standing facts that every session needs without searching.
It is not a session log, not a full knowledge base, and not a scratch pad.
It is the curated long-term semantic memory layer that persists across sessions.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Purpose

MEMORY.md answers: *what must a new session know about the project before it can do useful work?*

Per [theory-openclaw-memory]: files on disk are the source of truth, not session-local state.
MEMORY.md is the curated layer that makes accumulation across sessions possible without letting the file grow unboundedly.

## §4 Two MEMORY.md instances

There are two MEMORY.md instances in use:

1. **Character store template** (`doing/governing/characters/<slug>/MEMORY.md`) — Canonical, versioned in git, human-authored.
  Contains standing context that remains valid across all sessions.
  Updated only via principal direction or the MCP server's `save_memory` tool.

2. **Installed surface file** (theory root `MEMORY.md`) — A copy of the store template.
  Installed by the install script.
  May be extended by the auto-memory system during a session; however, the character store template is authoritative.
  The installed copy MUST be treated as a read-only orientation document for Claude Code's session-start auto-load.

These two instances MUST NOT drift significantly.
When the installed copy is extended by the auto-memory system, the extensions SHOULD eventually be reviewed and either promoted to the store template or discarded.

## §5 Mutable class

MEMORY.md is **mutable** — but governed.
The character MUST NOT write to the installed theory root `MEMORY.md` directly.
All memory writes MUST go through the MCP server's `save_memory` tool, which writes to the character store's `memory/<category>/<slug>.md` hierarchy.
The session log captures episodic events; MEMORY.md captures distilled, durable semantic facts.

## §6 Required content

A MEMORY.md template MUST contain:

1. **Project purpose** — One paragraph describing what the project is and what phase it is in.
  This MUST be honest about current phase (e.g., "bootstrapping," "draft," "stable").

2. **Key paths** — A table or list of the most important directory paths within the theory.
  MUST include the character store location and the specifications directory.
  SHOULD include the theories/ root if present.

3. **Principal** — Who the character serves and what their authority level is.

## §7 Recommended content

A MEMORY.md SHOULD contain:

1. **Current phase description** — What the overall state of the project is (bootstrapping, active founding work, etc.).

2. **Spec index** — List of current specifications with their slugs and one-line purposes.

3. **Notes on substrate state** — Things a new session would likely get wrong: paths that have recently moved, files that are pre-spec artifacts, known inconsistencies.

## §8 Forbidden content

A MEMORY.md template MUST NOT contain:

1. **Session-specific events** — These belong in the MCP session log (`rom-session-log.jsonl`).
2. **Auto-memory index format headers** — The template SHOULD NOT begin with auto-memory system headers (e.g., `# MEMORY.md - Long-term Memory` followed by auto-generated sections), as these belong to the auto-memory layer, not the store template.
3. **Identity or behavioral constraints** — IDENTITY.md, SOUL.md.
4. **Current tasks** — HEARTBEAT.md.
5. **Goals** — DREAMS.md.

## §9 Size discipline

A MEMORY.md template SHOULD NOT exceed 150 lines.
If it grows beyond this, the excess SHOULD be moved to `memory/<category>/` files in the character store and referenced by slug in MEMORY.md.
The goal is a file that can be read in full in a few seconds, not a comprehensive knowledge dump.

## §10 Frontmatter

A MEMORY.md template MUST carry YAML frontmatter with: - `name:` — e.g., `memory` - `description:` — one-line summary - `type: surface-file` - `class: mutable`

## §11 Acceptance criteria

A MEMORY.md is conformant if:

1. It carries required frontmatter.
2. It states project purpose and current phase.
3. It contains key paths as a table or structured list.
4. It names the principal.
5. It is under 150 lines.
6. It contains no session log entries, SOUL, IDENTITY, HEARTBEAT, or DREAMS content.

## §12 What this specification does not decide

- The structure of the `memory/<category>/` hierarchy in the character store.
- How session log entries are promoted to MEMORY.md (that is a consolidation workflow concern).
- How Claude Code's auto-memory system interacts with the installed copy (that is governed by [mcp-server-spec]).
