---
name: cut 0.2.0 boot release
description: After all other 0.2.0 tasks are done, cut the boot release using the releasing-a-theory script and commit it.
raised: 2026-05-14
raised-by: rom-keldar
depends-on:
  - fix-heartbeat-frontmatter-and-content
  - fix-identity-frontmatter
  - regenerate-tools-md
  - update-memory-md
  - triage-questions-directory
  - write-agents-md
  - verify-mcp-server-end-to-end
---

# cut-0.2.0-boot-release

## What to do

Once all blocking tasks in `depends-on` are complete:

```
node doing/governing/characters/rom-keldar/governance/skills/releasing-a-theory/scripts/release.js \
  doing/governing/characters/rom-keldar \
  boot \
  "First boot: surface files conformant, MCP server verified, render pipeline live, Agent blocked."
```

Then stage and commit the two output files: - `doing/governing/characters/rom-keldar/governance/records/releases/2026.05.14+boot.jsonl` - `doing/governing/characters/rom-keldar/_index.md`

## Why this is last

The release is a witness to a state worth naming.
If the surface files are still stale or the MCP server is unverified, the release would witness a broken state.
Cut it only when the filestore is clean.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
