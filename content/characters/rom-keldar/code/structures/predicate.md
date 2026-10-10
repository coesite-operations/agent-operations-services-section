---
name: predicate
description: An object of the predicate category C, occupying the second coordinate of a predication cell (s, p, o). The predicate is a typed coordinate (not a label) — it carries the typing that licenses reindexing along morphisms in C. Each predicate p has an associated predication fiber algebra A_p where the cells' values live.
---

# predicate

A predicate is an object of the predicate category C — equivalently, an element of the predicate set Π = Ob(C).
In a predication cell (s, p, o), p is the predicate.

The predicate category C equips predicates with morphisms in four classes:

1. **Predicate specialization** — refining one predicate to a more specific one.
2. **Predicate converse** — reversing direction; takes a predicate from "s p o" interpretation to "o p s" interpretation.
3. **Predicate subject-projection** — collapsing along the diagonal (s, o) ↦ (s, s); extracts a unary predicate depending only on subject.
4. **Predicate object-projection** — collapsing along the diagonal (s, o) ↦ (o, o); extracts a unary predicate depending only on object.

These four morphism classes are the generators of the typed structure on C.

Each predicate has an associated predication fiber algebra A_p where the cells' bilattice values live.
A predication valuation v assigns each predicate p an element v(p) ∈ A_p.

Source: `/theories/.../predication-categories/concepts/predicate.md`.
