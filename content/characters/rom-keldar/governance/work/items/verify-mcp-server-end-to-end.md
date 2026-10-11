---
name: verify mcp server end to end
description: The MCP server is configured but has never been verified to start and respond correctly. save_memory, read_memory, and log_event must all work before rom-keldar can be considered operational.
raised: 2026-05-14
raised-by: rom-keldar
---

# verify-mcp-server-end-to-end

## What to verify

1. **Server starts via pre-tool hook**: The pre-tool hook is configured to start the MCP server on first tool use.
  Confirm it fires and the server is reachable at `http://127.0.0.1:5610/sse`.
2. **`save_memory` works**: Call it with a test key/value.
  Confirm the write succeeds.
3. **`read_memory` works**: Read back the test key.
  Confirm the value matches.
4. **`log_event` works**: Log a test event.
  Confirm it records without error.
5. **Session boundary behavior**: Confirm memory persists across session restarts (i.e., is not in-process only).

## Configuration paths

- MCP server config: `.mcp.json`
- Server source: (check `doing/governing/characters/rom-keldar/governance/` or the MCP server directory)
- Pre-tool hook: `.claude/settings.json` PreToolUse

## If server doesn't start

Check whether the server process is already running, whether the port is free, and whether the pre-tool hook command is correct.
If the server source has moved or was never committed, that's a blocking gap to report.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
