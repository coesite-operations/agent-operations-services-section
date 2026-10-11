---
name: tools file
description: Specifies §1 abstract.
title: "TOOLS.md"
status: draft
version: "2026.05.14.tools-file"
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

# TOOLS.md

## §1 Abstract

This document specifies the format and content of `TOOLS.md` files for characters in the 561 substrate.
TOOLS.md declares what tools are available to the character in a given theory: built-in Claude Code tools, skills (slash commands), runtime environment, and MCP servers.
It is static — a reference document, not a tutorial.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Purpose

TOOLS.md answers: *what can this character actually invoke in this theory?*

It is the character's working inventory of available capabilities.
It MUST reflect what is actually available, not a wish list.
Tools listed here that do not exist will mislead the character.

## §4 Static class

TOOLS.md is **static**.
The character MUST NOT amend it during a session without explicit principal direction.
When a new skill is added or a tool changes, the character SHOULD note this for the principal's review; the principal directs the update.

## §5 Required content

A TOOLS.md MUST contain:

1. **Runtime environment** — The shell (PowerShell, bash, etc.), Node.js version if scripts are used, and operating system.
  Without this, the character may invoke tools incorrectly.

2. **Key skills listing** — The slash commands most relevant to this character's work, with their invocation syntax and one-line purpose.
  This MUST NOT attempt to list every skill; it SHOULD list the ~10 most used.

## §6 Recommended content

A TOOLS.md SHOULD contain:

1. **Claude Code built-in tools** — A brief table of the built-in tools available (Read, Edit, Write, Bash, Glob, Grep, Agent, TodoWrite).
  This is reference material, not tutorial.

2. **MCP servers** — Any MCP servers configured for this theory, with their name, URL, and what they provide.

3. **Notes on tool constraints** — Things the character gets wrong about tools: e.g., "Use Glob not `find`; use Grep not `grep`; do not use general-purpose Agent for substrate reads."

## §7 Forbidden content

A TOOLS.md MUST NOT contain:

1. **Tutorial or how-to content** — How to use the tools is in skills and Claude Code's own documentation.
2. **Domain knowledge** — What the tools are used *for* in this project belongs in MEMORY.md.
3. **Behavioral constraints about tool use** — These belong in SOUL.md ("do not use general-purpose subagents for substrate reads" is a soul-level constraint, not a tools declaration).
4. **Environment-specific secrets** — Credentials, API keys, tokens.
  Never in this file.

## §8 Frontmatter

A TOOLS.md MUST carry YAML frontmatter with: - `name:` — e.g., `tools` - `description:` — one-line summary - `type: surface-file` - `class: static`

## §9 Acceptance criteria

A TOOLS.md is conformant if:

1. It carries required frontmatter.
2. It states the runtime environment.
3. It lists the key skills with invocation syntax.
4. It contains no tutorial content, domain knowledge, behavioral constraints, or credentials.

## §10 What this specification does not decide

- How detailed the skill listing should be (that is a judgment call based on the character's work).
- Whether TOOLS.md lists every configured MCP tool individually (a summary is sufficient).
