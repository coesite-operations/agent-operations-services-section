---
name: hooks
description: Specifies §1 abstract.
title: "Hooks"
status: draft
version: "2026.05.14.hooks"
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
---

# Hooks

## §1 Abstract

This document specifies *hooks* within the 561 substrate as used by Claude Code.
A hook is a shell command registered in `.claude/settings.json` that fires on a named Claude Code event.
Hooks enforce substrate invariants automatically: frontmatter validity, path conventions, link integrity.
A character MAY carry hooks that are registered into the theory's Claude Code settings as part of installation.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Claude Code hook events

Claude Code supports the following hook events:

| Event | Fires |
|---|---|
| `PreToolUse` | Before a tool executes; exit non-zero to block the tool |
| `PostToolUse` | After a tool executes |
| `Notification` | When Claude Code sends a notification |
| `Stop` | When Claude Code stops |

Hooks MUST be registered in `.claude/settings.json` under the `hooks` key.
The structure is:

```json
{
  "hooks": {
    "<Event>": [
      {
        "matcher": "<tool-name-pattern>",
        "hooks": [
          { "type": "command", "command": "<shell command>" }
        ]
      }
    ]
  }
}
```

## §4 Hook storage in the character store

A character MAY carry a `hooks/` directory containing:

1. **Hook scripts** — executable files implementing hook logic (MUST be idempotent)
2. **`hooks.json`** — a JSON fragment declaring the hooks this character registers, in the format of the `hooks` key in `.claude/settings.json`

The `hooks.json` file MUST be a valid JSON object with event keys at top level.
It MUST NOT include the outer `{"hooks": ...}
` wrapper — it is the value of that key.

## §5 Registration on installation

When a character is installed, its `hooks/hooks.json` SHOULD be merged into `.claude/settings.json`.
Merging MUST be additive: existing hooks MUST NOT be removed.
If `.claude/settings.json` does not exist, it MUST be created with `{"hooks": <hooks.json content>}`.

If the installation tool does not perform hook registration automatically, the installing principal MUST be informed that manual hook registration is required.

## §6 Hook script constraints

Hook scripts MUST: 1.
Be idempotent — running twice produces the same result as running once.
2.
Exit 0 on success.
3.
Exit non-zero with a human-readable message on stderr to block a `PreToolUse` event.

Hook scripts SHOULD NOT modify files outside the theory root without explicit principal direction.

## §7 Recommended hooks for a character

A character serving as a substrate maintainer SHOULD register:

| Event | Matcher | Purpose |
|---|---|---|
| `PreToolUse` | `Write\|Edit` | Validate frontmatter on `.md` files before write |
| `PostToolUse` | `Write\|Edit` | Check that internal links in modified `.md` files resolve |

## §8 What this specification does not decide

- The mechanism for merging hooks from multiple characters if more than one is installed.
- Whether hooks are unregistered on character uninstall.
- Hook ordering when multiple hooks match the same event.
