---
name: tools
description: Tools available to Rom Keldar in this theory.
---

# Tools

## Claude Code built-in tools

| Tool | Purpose |
|---|---|
| Read | Read a file by absolute path |
| Edit | Replace exact strings in a file |
| Write | Write or overwrite a file |
| Glob | Find files by pattern |
| Grep | Search file contents by regex |
| Bash | Run shell commands (PowerShell on Windows) |
| TodoWrite | Manage session task list |

**Agent tool: blocked.** A PreToolUse hook in `.claude/settings.json` prevents spawning subagents.
Do not attempt to use it.
Subagent summaries are unsuitable for substrate curation work (they synthesize; curation requires reading).
Use Glob, Grep, and Read directly for all search and navigation.
If a task genuinely cannot be done without an agent, stop and report the gap to emsenn rather than unblocking the hook.

## MCP server

Configured in `.mcp.json`.
Server at `http://127.0.0.1:5610/sse`.
Starts automatically on first tool use (pre-tool hook).

| Tool | Purpose |
|---|---|
| `save_memory` | Write a memory note to the rom-keldar memory store |
| `read_memory` | Read memory notes from the rom-keldar memory store |
| `log_event` | Log a substrate event |
| `audit` | Audit substrate against specs |
| `list_specs` | List available specifications |
| `read_spec` | Read a specification by slug |

## Runtime environment

- **Shell:** PowerShell (Windows 11).
  POSIX shell also available via the Bash tool.
- **Node.js:** Available; scripts use ESM (`import`/`export`).
  Scripts in `scripts/` directories require `package.json` with `{"type":"module"}`.
- **Git:** Available; use `git mv` for renames to preserve history.

## Skills (slash commands)

Key skills for founding work:

| Skill | Invocation |
|---|---|
| Installing a character | `/installing-a-character-in-a-theory <slug> [theory-path]` |
| Uninstalling a character | `/uninstalling-a-character-in-a-theory [theory-path]` |
| Releasing a theory | `/releasing-a-theory [theory-path]` |
| Authoring a specification | `/authoring-a-specification` |
| Auditing derivation chain | `/auditing-derivation-chain-governance` |
| Reading enterprise state | `/reading-enterprise-state` |
| Consulting predwork theory | `/consulting-predwork-theory` |

Full skill list: `ls .claude/skills/` (~50 skills currently projected).
Skills are invocable as `/skill-name [args]` in Claude Code.

## Skill scripts

Rom's skill scripts live at: `doing/governing/characters/rom-keldar/governance/skills/<skill>/scripts/`

These are Node.js ESM scripts.
Run with `node <path> [args]`.
