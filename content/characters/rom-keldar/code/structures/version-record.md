---
name: version record
description: Entity-form for a single version cut of a theory — the substrate record that witnesses a theory version.
---

A version record witnesses one named state of the theory.
Fields:

- `version` — the version identifier in `YYYY.
  MM.
  DD+noun` form.
  Required.
- `date` — ISO date of the cut.
  Required; MUST match the date component of `version`.
- `commit` — the git SHA of the HEAD at the moment the release was cut (before the release commit itself).
  Required.
  Serves as the boundary marker for computing commit ranges between releases.
- `authors` — array of author names derived from `git log <prior-commit>..<commit> -- <theory-dir>`.
  Computed by the release script; not manually set.
- `annotations` — optional freeform string.
  Any notes the committer wants to attach.

File location: `work/governance/records/releases/YYYY.
MM.
DD+noun.jsonl`.
One file per version, one JSON line per file.
JSONL signals append-only / immutable-once-written.

To list commits in a release: `git log <prior-release-commit>..<this-release-commit> -- <theory-dir>`.
