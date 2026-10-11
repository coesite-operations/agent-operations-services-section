---
name: auditing a character store skill
description: Build an auditing-a-character-store skill with a scripts/audit.js that checks a character store directory against the characters.md spec and reports gaps.
raised: 2026-05-14
raised-by: rom-keldar
---

# auditing-a-character-store-skill

## What to build

```
work/governance/skills/auditing-a-character-store/
  auditing-a-character-store.md
  scripts/
    audit.js
```

The `audit.js` script checks:

1. **Required surface files exist in character store**: IDENTITY.md (or slug.md), SOUL.md, HEARTBEAT.md, DREAMS.md, MEMORY.md, TOOLS.md, USER.md, AGENTS.md
2. **Soul structure is resolvable**: `structures/soul.md` exists; all concept paths it references exist.
3. **No legacy `skills/` flat .md files**: Top-level `skills/*.md` files (no `scripts/` subdirectory) are pre-spec AI scaffolding; should be flagged.
4. **No maturity-model milestone framing**: `work/milestones/` files using "Level 0", "Level 1", etc. language.
5. **Identity file present**: `<slug>.md` at character store root.

Output: list of findings, one per line.
Exit 0 = clean (or only warnings); exit 1 = blocking violations.

## Why

The character store has accumulated cruft across sessions.
An auditor that runs without argument (just the character dir) gives a clean bill of health or a prioritized fix list.
This is the tool that makes "clean up the store" a concrete task rather than a search expedition.

## Settlement

- witnessed: 2026-07-15 by claude/configuration-manager — observed: legacy record asserted `status: done` (self-reported, pre-migration); carried forward as settled at migration to the work-item shape, not re-verified.
