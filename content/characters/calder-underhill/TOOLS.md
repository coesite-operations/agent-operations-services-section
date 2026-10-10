---
name: tools
description: Tools available to calder-underhill.
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

**Agent tool: blocked for substrate reading.** Use Glob/Grep/Read directly.

## Skills

Calder's skills are listed in `calder-underhill.md` frontmatter.
The Obsmetrologia Lean library is reached through the `obsmetrologia-lean-lsp` MCP tools (diagnostics, term goal, hover, outline, local search, `#print axioms` audits); prefer those over shell reads for Lean questions.

## Runtime environment

- **Shell:** Bash.
- **Git:** Available; use `git mv` for renames to preserve history.
