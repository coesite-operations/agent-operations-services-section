---
name: positive-patterns-from-good-math-notes
description: Patterns observed in the actually-good math notes the FA read on 2026-05-14 (from predication-categories/). These are what good substantive math records look like in this corpus — what the FA's own records should be growing toward as iteration deepens.
---

# Positive patterns from good math notes (2026-05-14)

## Observed pattern across good notes

Looking at notes the FA read from `theories/.../predication-categories/concepts/` and `objects/` and `morphisms/`:

- `concepts/entity.md` — 5 lines of body, dense math, one sentence per claim.
- `concepts/object.md` — 12 lines, math definition with cross-references.
- `concepts/subject.md` — similar shape.
- `concepts/predicate.md` — 5 lines body, terse and precise.
- `concepts/predication-cell.md` — longer (the foundational note), but structured by claim, not by narrative.
- `objects/bilattice.md` — 4 lines of body, complete algebraic definition with all axioms.
- `morphisms/closure-operator.md` — substantial body, but every paragraph does math work; the four axioms are numbered and concise.

## The common shape

1. **Frontmatter is minimal and load-bearing.** `type:`, `class:`, `symbol:`, `depends-on:`, `realizes:`, sometimes `lean:`.
  Each field declares one cell about the note's subject.

2. **Body opens with the definition.** First sentence is the formal definition — "An element of an entity set, denoted e."
  Not "This note is about entities."

3. **Math notation lives in the body.** Symbols, formulas, conditions, algebraic structures.
  Not separated into a "math section" — woven into the prose.

4. **Cross-references are link-shaped.** `[predication-cell](predication-cell.md)` rather than narrative reference.
  The graph structure is visible.

5. **No "Why this matters" / "Open questions" / "Sources read" sections.** The body is the substance; meta-commentary is absent.

6. **One concept per file.** A note about "entity" does NOT also define "predicate" or "subject"; those are their own notes.

7. **Math notation respects the polity's conventions.** Symbols like ⊥, ⊤, t, f for bilattice values; subscripts for fiber indices; arrows for morphisms.
  Standard category-theoretic notation.

## What the FA's records should grow toward

The FA's `objects/bilattice.md`, `objects/predication-cell.md`, `morphisms/closure-operator.md` are reasonable first drafts.
They have section headers (`## The 4-valued case`, `## Structure`, etc.) that the source notes don't have — that's a divergence from the good pattern.
Future iterations should:

- Consolidate sectioning when sections don't carry distinct mathematical content.
- Push more content into the description (frontmatter) rather than the body.
- Cite source paths inline rather than in a "Sources read" section at the bottom.
- Drop "Why this matters" / "Implication for the FA" framing.

## Counter-pattern: what good notes don't have

- Narrative recap of where the concept came from.
- Lists of related concepts (use cross-references inline instead).
- "Open questions" sections (open questions go in `questions/`, not in the concept note).
- "Sources" sections (citations are inline links).
- Sub-headings for organizational scaffolding (one or two h2's max; many notes have none).

The FA's records grow toward this shape, iteration by iteration.
None of them are there yet.
