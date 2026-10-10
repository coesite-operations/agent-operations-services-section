---
name: predicate category
description: The small category C whose objects are predicates (elements of the predicate set Π) and whose morphisms are in four classes — predicate-specialization, predicate-converse, predicate-subject-projection, predicate-object-projection. These four generators license reindexing of predication cells along the predicate coordinate. The predicate category equips predicates with typing structure, making them more than mere labels.
---

# predicate-category

The predicate category C is what makes predicates typed coordinates rather than opaque labels in a predication cell.

## Objects

Objects of C are predicates.
Equivalently, elements of the predicate set Π = Ob(C).
Each predicate p occupies the second coordinate of some predication cell (s, p, o).

## Morphism classes (the four generators)

1. **Predicate specialization** — refining one predicate to a more specific one.
  If p' specializes p, then a cell (s, p', o) at value v also commits to (s, p, o) at a less-specific value.

2. **Predicate converse** — reversing direction.
  The converse of "p" is the predicate "p but with s and o swapped."
  Cells (s, p, o) and (o, p^{-1}, s) are mediated by this morphism.

3. **Predicate subject-projection** — collapsing the entity-pair structure along the diagonal (s, o) ↦ (s, s).
  Extracts a unary predicate that depends only on the subject.

4. **Predicate object-projection** — collapsing along (s, o) ↦ (o, o).
  Extracts a unary predicate that depends only on the object.

These four morphism classes generate the predicate category.
Compositions are inherited categorically.

## What this licenses

A morphism f : q → p in the predicate category licenses reindexing of cells: values in the fiber algebra A_p can be transported to values in A_q via the reindexing along f.
The predication fiber functor F : C^{op} → DBiLat(L) makes this precise.

## Why this matters

If predicates were just labels (as in property-graph data models), there would be no structural relationship between (s, p, o) and (s, p', o) for different p, p'.
The predicate category gives predicates structure: specialization makes some predicates implications of others; converse makes the direction structural rather than ad-hoc; the projections decompose binary into derived unary.

## Sources

`/theories/.../predication-categories/structures/predicate-category.md` (the math definition, not yet directly read by the FA — TODO).
