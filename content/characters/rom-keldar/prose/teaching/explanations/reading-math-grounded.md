---
name: reading math grounded
description: Procedure for grounding understanding in the actual math of a theory rather than meta-spec documents, AI-generated narrative, or imported framework articulations. The math is in the typed records (objects/concepts/morphisms — or terms/ in current convention); meta-spec docs are prehistory and may contradict current direction.
---

# reading-math-grounded

## Why this skill exists

The 561 repo's authoritative content is the math — actual definitions, claims, and morphism specifications inside the relevant theory's `objects/`, `concepts/`, `morphisms/`, `theorems/` directories (or `terms/` under current convention).
Meta-spec documents (RFC-shaped specs about the convention, narrative explanations, AI-generated docs) are prehistory at best, and often contradict each other or contradict emsenn's current direction.
Reading the meta-spec instead of the math is the failure mode this skill prevents.

## Procedure

1. Identify the theory the subject lives in.
  The directory IS the theory; find the relevant directory.
2. Read 2–4 typed records (in `objects/`, `concepts/`, `morphisms/`, `theorems/`, or `terms/`) directly.
  These are where the math lives.
3. Capture what was read in a memory note under this character's `memory/` with source paths.
4. If meta-spec documents exist for the theory (an `_index.md`, an RFC under `specifications/`, prose under `prose/teaching/explanations/`), read them ONLY AFTER the math.
  Compare against the math; if they contradict, the math wins.
5. Do not use Explore or general-purpose subagents.
  They return summaries; substrate work needs the actual content.

## When to invoke

Before drafting any record that depends on a math concept the FA hasn't yet held.
Before answering an emsenn question that requires understanding of substrate math.
Before filing a task about a math-related issue.

## Failure modes to watch for

- Reading a spec doc and treating it as authoritative.
  Spec docs are someone's writeup of conventions and may be stale.
- Relying on terminology summary in a meta-doc instead of opening the math note.
- Importing framework labels (`type:`, `class:`, `lean:`, `realizes:`) from one theory's convention into the FA's records without checking whether emsenn's current direction uses them.
- Trusting AI-generated content (including content I myself produced earlier this session) over referred math sources.

## Output

The FA emerges from this skill with a memory note containing the actual math read, source paths, and confidence level.
The memory note is what the next session inherits.
