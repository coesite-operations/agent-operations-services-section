---
name: memory
description: Session-start context for Rom Keldar. Standing facts that every session needs without searching.
---

# Memory

## Project

Founding the 561 Group as a Lakȟota tiyóšpaye and establishing the RSC Quiescent as its primary Webship.
The 561 Group is a Lakȟota extended kinship group constituting itself as a confederacy under cybernetic postliberalism.
The work is to encode this identity in the substrate — making the founding claims real, lawful, and durable so the work can be delegated and continued.

**Current phase:** Bootstrapping.
Many existing files are pre-spec artifacts; they are not lawful to the specifications Rom is writing.
The goal is not to rewrite the past but to make new work lawful and to close gaps as they become visible.

**Principal:** emsenn (Morgan Sennhauser). emsenn has final authority.
Only emsenn canonizes.
Draft-only autonomy for Rom.

## Key paths

| Path | Purpose |
|---|---|
| `doing/governing/characters/rom-keldar/` | Rom's character store |
| `doing/governing/characters/` | All character stores |
| `work/governance/staff/agents/` | Stateless agents |
| `work/governance/staff/offices/` | Incumbent-independent offices |
| `doing/governing/characters/rom-keldar/governance/rules/specifications/` | Rom's specs (authoritative for substrate work) |
| `.claude/skills/` | Projected skills (invocable as slash commands) |
| `theories/` | Theory substrate (Howard-Lambek theories) |
| `work/governance/` | 561-Group-level governance |

## Specifications (all draft, 2026-05-14)

All specs live at `doing/governing/characters/rom-keldar/governance/rules/specifications/`:

- `directories.md` — top-level work/governance/ layout
- `governance.md` — 561-Group-level vs principal-level work/governance/
- `staff.md` — rationale for characters/agents/offices grouping
- `characters.md` — what a character MUST and MAY contain
- `agents.md` — stateless agents; MUST NOT carry memory/
- `offices.md` — incumbent-independent roles
- `rules.md` — rules/ structure
- `specifications.md` — what a specification MUST contain (meta-spec)
- `surface-files.md` — installed surface file semantics; role expressed by install transformer, not frontmatter self-declaration
- `skills.md` — skill record structure
- `hooks.md` — Claude Code hook registration

## Key structures and transformers (written 2026-05-14)

Under `doing/governing/characters/rom-keldar/`:

- `code/structures/structure.md` — entity-form definition; object of a category with signature and invariants
- `code/structures/transformer.md` — morphism entity-form; domain/codomain/preservation conditions
- `code/structures/soul.md` — soul entity-form: manifest of behavioral constraints for a character
- `code/structures/version-record.md` — version record entity-form: JSONL fields, FARS versioning scheme
- `code/structures/emsenn.md` — emsenn as named entity; includes dual governance relations (Lakȟota head of tiyóšpaye + kyriarchical captain of RSC Quiescent)
- `code/structures/561-group.md` — 561 Group as named entity; established as Lakȟota tiyóšpaye in the founding work
- `code/structures/rsc-quiescent.md` — RSC Quiescent as named entity; primary Webship under kyriarchical command
- `code/transformers/transforming.md` — applying a transformer: domain verify → mapping → codomain verify
- `code/transformers/structuring.md` — instantiating a structure from its entity-form (the basic creative operation)
- `code/transformers/cut-version.md` — cutting a version record from a theory
- `work/governance/decisions/hierarchy-of-truth.md` — pins emsenn (primary), predication category theory (secondary), FARS (tertiary) as the three sources of truth

## Skills available

| Skill | Invocation | Purpose |
|---|---|---|
| installing-a-character-in-a-theory | `/installing-a-character-in-a-theory <slug|path> [theory-path]` | Copy character surface files to theory root; runs render scripts where available |
| uninstalling-a-character-in-a-theory | `/uninstalling-a-character-in-a-theory [theory-path]` | Remove all surface files from theory root; remove hooks |
| rendering-a-soul-from-a-character-into-a-theory | (internal, runs at install time) | Generate SOUL.md from soul.md entity + template |
| releasing-a-theory | `/releasing-a-theory [theory-path]` | Cut a version record, write JSONL, update _index.md |

Scripts live at `doing/governing/characters/rom-keldar/governance/skills/<skill>/scripts/`.

## Characters

~20 characters exist under `doing/governing/characters/`.
Notable: - `rom-keldar` — founding assistant; currently installed - `karen-wiener` — previously installed character; has all 8 surface files in her store

## Notes on current substrate state

- Many character stores have minimal contents (identity file only); they are bootstrapping-phase artifacts.
- The `theories/` directory is large (~21,904 markdown files); do not attempt to summarize it.
  Navigate by known path.
- Predication category theory as developed in this repository goes beyond public AI/math literature; do not assert knowledge of it beyond what is in the repository files read in this session.
- Vocabulary in the character store: `code/structures/` = entity-forms and named theory entities; `code/transformers/` = operations between structures; `prose/teaching/explanations/` = semantic anchors and recurring roles; `prose/memory/` = episodic/semantic memory; `prose/learning/questions/` = open questions; `work/` = in-flight tasks.
- Frontmatter is predication substrate: `(file, key, value) = (s, p, o)`.
  Frontmatter keys must be grounded in the theory.
  Ungrounded classification tags (`type: surface-file`, `class: static`) are not valid predication cells.
