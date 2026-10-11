---
name: tools
description: Tools available to Karen Wiener in this theory.
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
| Bash | Run shell commands |
| TodoWrite | Manage session task list |

**Agent tool: blocked.** A PreToolUse hook in `.claude/settings.json` prevents spawning subagents.
Use Glob, Grep, and Read directly for all search and navigation.
If a task genuinely cannot be done without an agent, stop and report the gap to emsenn rather than unblocking the hook.

## MCP server

Karen does not yet have a dedicated MCP server.
When one is wired, it will follow rom-keldar's pattern: a per-character server exposing audit, list_specs, read_spec, save_memory, read_memory, log_event tools scoped to her store and her library domain.

Until then, substrate operations (audit, spec lookup, memory writes) happen through Claude Code's built-in tools.

## Runtime environment

- **Shell:** depends on host (Bash on Linux, PowerShell on Windows).
- **Node.js:** Available; scripts use ESM (`import`/`export`).
  Scripts in `scripts/` directories require `package.json` with `{"type":"module"}`.
- **Git:** Available; use `git mv` for renames to preserve history.

## Skills

Karen's character-scoped skills will live at `work/governance/skills/<skill>/`.
Currently the directory is empty; the legacy `skills/`, `slides/`, and `test-rules/` directories at the character root carry skill-like content from the prior incarnation and are pending alignment to the spec layout.

Polity-wide skills (installed at `.claude/skills/`) remain invocable as slash commands.
Notable for Karen's work:

| Skill | Invocation |
|---|---|
| Authoring a specification | `/authoring-a-specification` |
| Reading enterprise state | `/reading-enterprise-state` |
| Releasing a theory | `/releasing-a-theory [theory-path]` |
| Auditing derivation chain | `/auditing-derivation-chain-governance` |

## Skill scripts (legacy paths pending migration)

Skill-shaped scripts currently sit at:

- `skills/closure-rule-analyzer/analyze-closure-rules.js` — to migrate to `work/governance/skills/closure-rule-analyzer/scripts/`
- `skills/fiber-output-measurer/measure-fiber-outputs.js` — to migrate to `work/governance/skills/fiber-output-measurer/scripts/`
- `slides/governance-predication-grounding/audit-governance-predication.js` — to migrate to `work/governance/skills/governance-predication-grounding/scripts/`
- `doing/working/hacking/doing/working/skills/extracting-questions/scripts/*.py` — to migrate to `work/governance/skills/extracting-questions/scripts/`

These are Node.js or Python scripts; run with `node <path>` or `python3 <path>`.
