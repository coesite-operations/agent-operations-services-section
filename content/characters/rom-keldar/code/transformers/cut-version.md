---
name: cut version
description: Asserts a new version-record entity into the theory's work/governance/records/releases/ directory, marking the current state of the theory as a named version.
---

Operationally: run `node work/governance/skills/releasing-a-theory/scripts/release.js <theory-dir> <noun> [annotation]`.
The script captures HEAD, computes authors from git log since the prior release, writes `work/governance/records/releases/YYYY.
MM.
DD+noun.jsonl` as a single JSON line, and updates `_index.md`.

The noun should be evocative of the session's character — the committer picks whatever comes to mind.
There is no list of approved nouns.

Invariants: - The date component MUST match the actual date on which the cut is made. - `commit` is the HEAD SHA at cut time, captured before writing anything. - `authors` is derived from git log; do not set manually.
