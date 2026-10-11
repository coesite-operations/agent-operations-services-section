---
name: mcp server
description: Specifies §1 abstract.
title: "MCP Server"
status: draft
version: "2026.05.14.mcp-server"
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
  hooks-spec:
    class: specification
    title: "Hooks"
    note: "doing/governing/characters/rom-keldar/governance/rules/specifications/hooks.md"
---

# MCP Server

## §1 Abstract

This document specifies the *character MCP server* — a persistent HTTP process that a character MAY run to act as a constraint layer, observability pipeline, and session memory store between Claude Code and the substrate.
When a character's MCP server is running, it is the preferred interface for substrate operations.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Purpose

A character MCP server serves three functions:

1. **Constraint layer** — Tools exposed by the server enforce substrate invariants (spec compliance, frontmatter validity, install protocol) at the API boundary.
  Claude SHOULD use server tools in preference to raw built-in tools for substrate operations when the server is available.

2. **Observability pipeline** — All tool calls made to the server are logged to a session log.
  PostToolUse hooks SHOULD additionally POST to the server's `/log` endpoint so that direct built-in tool calls are also captured.
  The resulting log is training signal.

3. **Session memory** — The server maintains accumulated state across tool calls within a session, beyond what Claude's context window allows.

## §4 Transport and port

A character MCP server MUST use HTTP/SSE transport.
Rom Keldar's server MUST listen on `http://127.0.0.1:5610`.
Other characters MUST use a different port to avoid collision.

The server MUST expose: - `GET /health` — returns 200 `ok` when running - `GET /sse` — MCP SSE connection endpoint - `POST /messages?sessionId=<id>` — MCP message posting endpoint - `POST /log` — hook-to-server event logging; body is a JSON object; MUST be accepted and appended to the session log

## §5 Session log

The server MUST append events to `.claude/rom-session-log.jsonl` (or equivalent for other characters) at the theory root.
Each entry is a JSON object with at minimum `ts` (ISO 8601) and `type` fields.

The session log MUST NOT be deleted between sessions.
It is a training artifact.

## §6 Tools exposed

A character MCP server SHOULD expose at minimum:

| Tool | Purpose |
|---|---|
| `list_specs` | Returns available spec slugs and titles |
| `read_spec(slug)` | Returns spec content by slug |
| `audit(path?)` | Runs the substrate audit, returns violations |
| `log_event(type, description, context?)` | Appends a session event to the training log |
| `get_surface_files()` | Returns currently installed surface files |

## §7 Start-on-demand via hook

A character whose MCP server is installed SHOULD carry an `ensure-<character>-mcp-running` hook script that: 1.
Checks `GET /health` on the server's port with a short timeout (≤ 500 ms) 2.
If not responding, starts the server as a detached background process with the theory root as argument 3.
MUST exit 0 regardless (never blocks a tool call)

This hook MUST be registered as a `PreToolUse` hook on matcher `.*` so it fires before the first tool use of a session.

## §8 Claude Code registration

A character MCP server MUST be registered in `.mcp.json` at the theory root:
```json
{
  "mcpServers": {
    "<character-slug>": {
      "type": "sse",
      "url": "http://127.0.0.1:<port>/sse"
    }
  }
}
```

## §9 What this specification does not decide

- The language or framework of the server implementation.
- How to handle multiple characters' servers running simultaneously.
- Session log retention policy.
- How training signal is processed into fine-tuning data.
