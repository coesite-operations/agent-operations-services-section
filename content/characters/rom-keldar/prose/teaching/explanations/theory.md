---
name: theory
description: A typed context (Σ, A, R) — a signature of types and term constructors, a set of typed axioms, and a derivation calculus. The theorems are the types B for which a derivable term ⊢ t : B exists from A under R. Curry-Howard equates propositions with types and proofs with terms; Lambek-Scott equates this with a category whose objects are the types and whose morphisms are derivable terms. Every directory is a theory in this sense — the directory's contents present the signature and axioms; the closure rules and inference rules carried by the substrate constitute the derivation calculus.
---

# theory

## The math

A theory T = (Σ, A, R) where:

- **Σ** — a signature of types and term constructors.
- **A** — a set of typed axioms (terms with declared types, taken as given).
- **R** — a derivation calculus (the inference rules of the underlying type system).

The theorems of T are the types B for which there is a derivable term ⊢ t : B from A under R.

## Curry-Howard

Propositions ↔ types, proofs ↔ terms inhabiting those types, theorem-proving ↔ type-checking, normalization ↔ computation.
A type is inhabited iff its corresponding proposition is provable.

## Lambek-Scott

The theory is equivalent to a category whose objects are the types in Σ and whose morphisms are derivable terms (proofs), carrying the structure that R commits to: products for conjunction, exponentials for implication, sums for disjunction, etc. The theory's *models* are functors from this category into a semantic category.

## Presented theories on disk

A theory is *presented* when Σ and A are written out as concrete syntactic objects.
In a flatfile resource system, the presentation is a directory: the directory's contents enumerate the signature (the typed records under it) and the axioms (claims the records assert).
Every directory in the 561 repo is a theory in this sense.

## Recursion

Any directory may itself contain sub-directories that are themselves theories.
The same decomposition repeats.
A sub-theory of T is a theory whose signature extends Σ and whose axioms include A (or a subset).

## Why this matters for the rom-keldar

This directory (`doing/governing/characters/rom-keldar/`) is itself a theory in the Curry-Howard sense.
Its records are typed terms in its context.
The FA's work is to keep the theory coherent, growing it iteratively by adding records that present what's true.

## Sources

The math is standard category-theoretic logic (Lambek-Scott, Seely, Lawvere).
The application to flatfile knowledge systems is the 561 repo's own theoretical commitment, articulated in `theories/.../predication-categories/` and `theories/.../predicated-knowledge-systems/`.
