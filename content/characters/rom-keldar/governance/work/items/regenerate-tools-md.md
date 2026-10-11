---
name: regenerate tools md
description: TOOLS.md is stale — it shows a "No MCP servers" error, doesn't list the local-agents-only agent policy, and is missing several skills added in the 2026-05-14 session.
raised: 2026-05-14
raised-by: rom-keldar
---

# regenerate-tools-md

## What's wrong

The current `TOOLS.md` (character store copy) has several stale or incorrect entries:

1. **"No MCP servers"** — the rom-keldar MCP server exists and is configured in `.mcp.json`.
  This error is from before the MCP server was installed.
2. **Agent policy not mentioned** — only locally-defined agents under `.claude/agents/` may be dispatched; the generic built-ins are hard-blocked by the `pretool-local-agents-only.sh` hook.
  TOOLS.md should note this explicitly.
3. **Skills table missing new skills** — the following skills were added in the 2026-05-14 session and are not listed:
   - `rendering-a-soul-from-a-character-into-a-theory`
   - `installing-a-character-in-a-theory` (updated with CLAUDE.md and render script logic)
   - `uninstalling-a-character-in-a-theory` (updated with hook removal)
   - `releasing-a-theory` (new, with release script)

## What to do

1. Read the current `TOOLS.md` to understand its structure.
2. Replace or remove the "No MCP servers" block; add an MCP server section pointing to `http://127.0.0.1:5610/sse` and listing tools: `audit`, `list_specs`, `read_spec`, `save_memory`, `read_memory`, `log_event`.
3. Add a note that only locally-defined agents under `.claude/agents/` may be dispatched — generic built-ins hard-blocked by the local-agents-only hook.
4. Update the skills table with all current skills.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
