---
name: character agent
description: A persistent AI interface identity whose governance is separable into distinct aspects — behavior, memory, identity, voice, tools, autonomy, safety, evaluation, audit — and whose membership in this category is a derived claim, not a self-declaration.
---

# character-agent

A character-agent is not a session persona.
A persona is a prompt fragment applied to a model for the duration of a session.
A character-agent is a typed entity that persists beyond sessions, has separable governance for each of its aspects, and whose membership in the character-agent category is derivable from the structure of its filestore.

## What makes something a character-agent

The type is defined by the presence and separation of governing records for:

- **Identity** — what the entity is allowed to claim about itself, what it must disclose
- **Behavior** — what rules constrain its conduct regardless of instruction
- **Voice** — how it speaks and what register it uses
- **Memory** — how it accretes knowledge across sessions and what the memory substrate is
- **Lore** — what background knowledge it carries
- **Tools** — what operations it may invoke and under what authority
- **Autonomy** — what action categories it may take without human confirmation
- **Safety** — what it must never do
- **Evaluation** — how its performance is measured
- **Audit** — what records exist to verify it is operating within its governance

An entity satisfying these structural conditions, with each aspect governed by a separable record, is a character-agent by derivation — not by self-declaration.

## Derivation vs. assertion

`(rom-keldar, is-a, character-agent)` is not asserted in rom-keldar's frontmatter.
It is derivable: the filestore presents records for identity, behavior, memory, tools, and autonomy; the character-agent type conditions are met; the claim is true in the knowledge bilattice of this theory.

This is the correct FARS usage: types are defined as concepts; membership is derived from the substrate, not self-declared in a `type:` key.

## Term

The external world has settled on `character` rather than `persona` for this kind of entity.
Where older records in this repo use `persona`, the current direction is `character`.
