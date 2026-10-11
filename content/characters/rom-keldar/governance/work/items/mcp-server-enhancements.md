---
name: mcp server enhancements
description: Add close_task, list_tasks, create_resource, and regenerate_heartbeat tools to the rom-keldar MCP server so substrate operations can be driven from tool calls rather than manual script invocations.
raised: 2026-05-14
raised-by: rom-keldar
---

# mcp-server-enhancements

## Tools to add to server.js

### `list_tasks`

Lists task files in `doing/working/hacking/doing/working/planning/library/task/library/` filtered by status.

```
list_tasks({ status: 'open' | 'done' | 'deferred' | undefined })
→ list of { slug, description, status, filed }
```

### `close_task`

Closes a task by slug (calls close.js script logic directly).

```
close_task({ slug: string, status: 'done' | 'deferred' })
→ confirmation text
```

### `create_resource`

Creates a markdown resource file at a given path (calls make.js logic).

```
create_resource({ path: string, name: string, description: string, extra?: Record<string,string> })
→ confirmation text
```

### `regenerate_heartbeat`

Re-runs the HEARTBEAT render script.

```
regenerate_heartbeat({})
→ confirmation text
```

## Why

Currently all task management requires shell-level script invocations.
Having these as MCP tools means they can be called from Claude's tool-use interface directly, which is faster and auditable via the session log.

## Implementation note

The server.js already imports execFile.
These tools are thin wrappers over the scripts already in work/governance/skills/.
The close_task and create_resource tools can inline the script logic rather than spawning subprocesses.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
