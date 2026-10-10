---
name: predication cell
description: An ordered triple (s, p, o) recording an assertion of predicate p of subject s in relation to object o, oriented from subject to object through the predicate. Subject and object are entities; predicate is from the predicate set. The cell is the assertion-position; its value lives in the predication fiber algebra at predicate p and is a bilattice value tracking evidence for and against the assertion. The fundamental unit of predication.
---

# predication-cell

## Structure

A predication cell is the triple φ = (s, p, o):

- s — the subject, an entity
- p — the predicate, from the predicate set Π
- o — the object, an entity

The triple is *oriented from s to o through p*.
The cell (s, p, o) and the cell (o, p, s) are distinct assertion-positions with independent values; their relationship is mediated by the predicate-converse morphism, not by any symmetry on the cell index.

## Where the value lives

The cell is the *carrier* of an assertion-position; the value lives in the predication fiber algebra A_p at the cell's predicate coordinate.
A predication valuation v assigns each predicate p an element v(p) ∈ A_p; that element evaluates at the entity-pair (s, o) to give the cell's value v(p)(s, o) — a bilattice value tracking evidence for and against the assertion.

Many cells share a fiber algebra (every cell with predicate p draws its value from A_p).
Many valuations can be defined on the same cell.

## What distinguishes a predication cell from a generic RDF triple

Three things:

1. **Subject and object positions are not interchangeable.** RDF treats (a, R, b) and (b, R, a) symmetrically.
  Predication cells do not.

2. **The predicate is a typed coordinate, not a label.** Predicates live in a small category C — the predicate category — with morphisms in four classes (specialization, converse, subject-projection, object-projection).
  The predicate coordinate carries the typing that licenses reindexing.

3. **The cell carries a bilattice value, not a binary truth.** RDF asserts "this triple is in the graph" (true) or "this triple is not in the graph" (absent).
  Predication cells admit four values: t, f, ⊥, ⊤.
  Gaps and contradictions are first-class.

## In computer data more generally

All computer data is (s, p, o)-shaped — a file has properties, a row has columns, a pointer points-to, a function call applies-to.
Predication categories make this structure first-class instead of abstracting it away under bits (Shannon) or tape symbols (Turing).
The substrate operates on the relational structure directly.

## Sources read

`/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/predication-cell.md` (read 2026-05-14).
