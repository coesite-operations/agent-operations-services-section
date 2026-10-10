---
name: theory version
description: A named moment in a theory's evolution — a date plus a committer-chosen noun that permanently identifies the state of the theory's content at that point.
---

A theory version is a witness that the theory was in a specific state at a specific time.
The identifier `YYYY.
MM.
DD+noun` encodes the date and a committer-chosen noun; the noun carries no semantic contract (it is not a capability grade, a compatibility pledge, or a priority ranking — it is a handle).
The `+` separator follows PEP-440 local-version convention so the identifier parses cleanly through tooling that reads version strings.

A theory version does not assert that the theory is complete, correct, or stable.
It asserts: "at this date, the theory was in the state recorded in this directory, and this noun distinguishes it from other cuts on the same date."

Version records live in `releases/` as one file per version.
