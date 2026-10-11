---
name: agents file
description: Specifies §1 abstract.
title: "AGENTS.md"
status: draft
version: "2026.05.14.agents-file"
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
  theory-agents-md:
    class: theory-term
    title: "agents-md"
    note: "theories/.../artificial-intelligence/agents-md.md"
  theory-agent-instruction-file-standards:
    class: theory-term
    title: "agent-instruction-file-standards"
    note: "theories/.../artificial-intelligence/agent-instruction-file-standards.md"
  surface-files-spec:
    class: specification
    title: "Surface Files"
    note: "doing/governing/characters/rom-keldar/governance/rules/specifications/surface-files.md"
---

# AGENTS.md

## §1 Abstract

This document specifies the format and content of `AGENTS.md` files for characters in the 561 substrate.
AGENTS.md is the tool-agnostic complement to `CLAUDE.md`: it declares the ecosystem of agents available to or interacting with the character, and sets policy for multi-agent behavior.
It is also the canonical home for project-level agentic instructions that should be portable across tools.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Purpose and scope

Per [theory-agents-md]: `AGENTS.md` originated with OpenAI Codex and is now stewarded by the Agentic AI Foundation.
It is tool-agnostic: supported by Claude Code, Cursor, Windsurf, Aider, Codex, and others.
Where `CLAUDE.md` is Claude Code-specific, `AGENTS.md` is portable.

For the 561 substrate, AGENTS.md serves two purposes:

1. **Agent ecosystem declaration** — What agents are available, what they do, and when to use them.
2. **Multi-agent policy** — Red lines for subagent behavior, escalation paths, isolation requirements.

## §4 Static class

AGENTS.md is **static**.
The character MUST NOT update it during a session without principal direction.

## §5 Required content

An AGENTS.md MUST contain at least one of:

1. **Agent ecosystem** — A list or table of agents available within this theory: their names, roles, and invocation.
  If no agents are available, this SHOULD explicitly say so.

2. **Multi-agent policy** — Rules stating that only locally-defined agents under `.claude/agents/` may be dispatched (the generic built-ins are hard-blocked by the `pretool-local-agents-only.sh` hook), what those agents are permitted to do, and what actions require escalation to the principal.

An AGENTS.md with no agents and no policy is conformant but provides no value; it SHOULD be omitted rather than filed empty.

## §6 Multi-agent policy requirements

If AGENTS.md includes multi-agent policy, it MUST address:

1. **Which agents are dispatchable** — Only a locally-defined agent (one with a `.claude/agents/<name>.md` file) may be dispatched; the built-in generic agents are hard-blocked by the `pretool-local-agents-only.sh` hook, which derives its allowlist from the filesystem. AGENTS.md MUST make this explicit and MUST present purpose-built local agents as legitimate tools.

2. **Red lines** — Actions subagents MUST NOT take (e.g., committing to remote, deleting files, writing to canonical records without review), and the standing red line: do not weaken the local-agents-only block without emsenn's explicit direction.

## §7 Relationship to CLAUDE.md

`AGENTS.md` is the tool-agnostic layer; `CLAUDE.md` is the Claude Code-specific layer.
Per [theory-agent-instruction-file-standards]: for cross-tool portability, maintain `AGENTS.md` as canonical and reference it from `CLAUDE.md`.
In the 561 substrate, both may exist independently given the substrate is currently Claude Code-only.

## §8 Forbidden content

An AGENTS.md MUST NOT contain:

1. **Claude Code-specific instructions** — These belong in CLAUDE.md.
2. **Identity or behavioral constraints** — IDENTITY.md, SOUL.md.
3. **Task lists** — HEARTBEAT.md.
4. **Project context** — MEMORY.md.

## §9 Frontmatter

An AGENTS.md MUST carry YAML frontmatter with: - `name:` — e.g., `agents` - `description:` — one-line summary - `type: surface-file` - `class: static`

## §10 Acceptance criteria

An AGENTS.md is conformant if:

1. It carries required frontmatter.
2. It contains either an agent ecosystem list or a multi-agent policy (or both).
3. If it includes policy, the policy explicitly addresses when not to use subagents and red lines.
4. It contains no CLAUDE.md-specific content, character constraints, task lists, or project context.

## §11 What this specification does not decide

- Whether to maintain a separate `AGENTS.md` vs. referencing it from `CLAUDE.md`.
- The format of the agent ecosystem table (any structured format suffices).
- How AGENTS.md interacts with the Agentic AI Foundation's evolving standard (the standard is normative for interoperability; this spec adds 561-specific requirements).
