---
name: characters
description: Specifies what a character record is, its required and optional contents, and the canonical paths each class of resource must occupy.
status: draft
version: "2026.05.14.characters"
date: 2026-05-14
authors: [emsenn, claude-opus-4-7]
references:
  emsenn2026-05-14:
    class: report
    authors: ["Sennhauser, Morgan"]
    year: 2026
    title: "Order to restructure work/governance/ staff and encode preferences as RFC specifications"
    institution: "561 polity"
    note: "Verbal directive issued 2026-05-14"
  survey-ai-characters-2026-05:
    class: report
    authors: ["Sennhauser, Morgan", "Claude (Opus 4.7)"]
    year: 2026
    title: "Contemporary Research on AI Characters"
    note: "theories/.../agents/prose/surveys/survey-of-agentic-characters-may-2026.md"
---

# Characters

## §1 Abstract

This document specifies what a *character* record is within the 561 substrate.
A character is a persistent identity that may carry memory, skills, work-in-flight, open questions, and its own governance.
Characters live under `doing/governing/characters/<slug>/`.
The structure follows the static-identity-versus-mutable-memory separation surveyed in [survey-ai-characters 2026-05]: identity is stable and inspectable, memory is lifecycle-managed.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Placement and slug

Each character MUST live at `doing/governing/characters/<slug>/` where `<slug>` is a kebab-case identifier unique within the polity.
A character directory MUST NOT be nested inside another character's directory.

## §4 Required contents

A character directory MUST contain:

1. An **identity file** at one of:
   - `<slug>.md` (preferred), or
   - `identity.md`, or
   - `IDENTITY.md`.

The identity file carries the static persona: name, role, voice, principles, default autonomy.
It is the analogue of a Character Card V2 persistent system prompt as surveyed in [survey-ai-characters 2026-05].
It MUST be human-readable in plain Markdown so that what the character *is* can be inspected without running the system.

## §5 Optional contents

A character directory MAY contain any of:

| Path | Purpose | Survey-aligned memory class |
|---|---|---|
| `HEARTBEAT.md` | Current-focus task list / potential working state | Working context |
| `prose/memory/` | Long-term episodic and semantic memory store | Episodic + semantic |
| `prose/learning/questions/` | Open questions held by the character | Semantic (knowledge gaps) |
| `prose/teaching/explanations/` | Semantic anchors, recurring roles, named claims | Semantic (structured) |
| `code/structures/` | Entity-forms and named theory entities | Semantic (structured) |
| `code/transformers/` | Operations between structures | Semantic (structured) |
| `work/` | In-flight task records, drafts, scratchpads | Working context + episodic |
| `work/governance/skills/` | Procedural memory: reusable skill records with scripts | Procedural |
| `work/governance/` | Rules, charter, decisions, hooks, work scoped to this character | Governance scope |
| `_index.md` | Summary index of the character's substrate | — |

A character MUST NOT place identity material inside `memory/`.
A character SHOULD NOT duplicate the same content across multiple files; if a fact lives in `<slug>.md`, it MUST NOT also live in `IDENTITY.md` for the same character.

## §6 HEARTBEAT semantics

If present, `HEARTBEAT.md` is the single canonical current-focus file for the character.
There MUST be at most one `HEARTBEAT.md` per character directory.
When merging legacy task lists, content MAY be preserved under thematic sub-sections so nothing is lost while remaining a single file.

## §7 Self-governance

A character MAY carry its own `work/governance/` subdirectory holding rules, specifications, and charters that bind only that character.
Such rules MUST NOT silently bind other principals.

When a character maintains its own `work/governance/`, that directory SHOULD itself follow the structure specified in [governance](./governance.md).

## §8 Acceptance criteria

1. Every directory under `doing/governing/characters/` carries an identity file per §4.1.
2. No character contains more than one `HEARTBEAT.md`.
3. No character directory is nested inside another character.
4. Character-scoped rules, if present, live under `<character>/work/governance/rules/`.

## §9 What this specification does not decide

- How a runtime resolves which character is currently speaking.
- Mechanisms for memory write-gating, consolidation, or forgetting — these are runtime concerns.
- Whether a given character is dispatchable as an agent.

This specification derives from [emsenn 2026-05-14] and is informed by [survey-ai-characters 2026-05].
