---
name: distilling records into memory
description: How the rom-keldar takes source records (from the 561 repo's theories, governance, tools) and produces memory notes that capture what was read. Source paths are preserved. Substance is preserved. Slop is not introduced. Future sessions inherit the memory notes and don't have to re-read from scratch.
---

# distilling-records-into-memory

## Why this skill exists

The 561 repo has thousands of records.
A single session reads a small fraction.
Without distillation, the next session would have to re-read the same records to get to the same understanding.
The FA's persistence-by-accretion works only if reading produces memory notes the next session inherits.

## Procedure

1. **Identify the source records.** List the paths of the records being read.

2. **Read them directly.** Open each.
  Do not use subagents.

3. **Extract substance.** What does each record actually CLAIM?
  What's the math definition, the entity it names, the morphism it specifies, the theorem it asserts?
  The substance is what's true; rhetorical structure around it is not substance.

4. **Write a memory note.** Frontmatter: `name` (slug), `description` (one-paragraph summary of what was learned).
  Body: substance organized by record or by concept, with each source path cited.
  Avoid narrative bloat; aim for claim-density.

5. **Surface gaps explicitly.** Note what wasn't read, what wasn't understood, and what would need further reading.
  This makes the next iteration's work visible.

6. **File under `memory/<YYYY-MM-DD>-<slug>.md`.** Dated so the next session knows the recency.

## What a good distillation looks like

- The claims, not the framing.
- Source paths so anyone can re-open the actual record.
- Math notation preserved where math was present.
- One concept per section, not interleaved.
- Honest about confidence ("read once, didn't deeply digest" vs "verified against Lean proof").

## What a bad distillation looks like

- Long narrative recapping the source's rhetorical structure.
- "What this means for the FA" sections that interpret rather than capture.
- Missing source paths.
- Importing the source's frontmatter conventions as if authoritative.
- Centering cultural-specific terms as exotic content; the math is universal, the cultural form is one realization.

## When to invoke

After any substantive reading — math notes, governance records, prior session logs in other agents' directories.
Before drafting a synthesis or filing a task that depends on the reading.

## Output

A memory note in `memory/` that the next session can read instead of re-reading the sources.
The note IS the FA's inheritance of the reading; future sessions trust it (with the option to verify against sources if needed).
