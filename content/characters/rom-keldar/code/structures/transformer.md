---
name: transformer
description: A formal operation between structures — a morphism in the category-theoretic sense, defined by its domain structure, codomain structure, the mapping it performs, and the preservation conditions it satisfies. The morphisms of a predication category; what acts on structures to produce new substrate.
---

# transformer

## Mathematical grounding

In predication category theory, morphisms are the arrows between objects.
A morphism f : A → B has a domain object A, a codomain object B, and a mapping that takes elements of A to elements of B in a way that preserves the relevant structure.
Functors, natural transformations, closure operators, positing morphisms, bilattice homomorphisms — all are morphisms in their respective categories.

Morphisms carry as much mathematical content as objects.
A closure operator `cl : P(Cells) → P(Cells)` is a morphism; the structure-preservation conditions (monotonicity, idempotency, extensiveness) are what make it a closure operator rather than an arbitrary set function.
The positing morphisms `posit_{(φ,q)}` are morphisms of the predication settling category; their behavior under the bilattice's knowledge order is a structure-preservation condition.

## In FARS

The `transformers/` directory holds actual transformer instances — specific named operations on substrate.
A transformer file defines:

- What it reads (domain: the structures and cells it takes as input)
- What it produces (codomain: the structures and cells it writes to the substrate)
- The operation itself (how it maps domain to codomain)
- Preservation conditions (what invariants are maintained)

A file in `structures/transformer.md` (this file) defines the entity-form of a transformer record — what fields a transformer record has and what they mean.
Files in `transformers/` are instances of this structure.

## Transformer vs. skill

A skill is a procedure — a sequence of steps a character follows.
A transformer is a formal operation in the substrate — an arrow with domain and codomain structures, grounded in the theory.
Skills may invoke transformers, but a skill is not a transformer unless it has a formally specified domain, codomain, and structure-preservation claim.

## Transformer vs. concept

A concept names a recurring role.
A transformer performs an operation.
`settling` is a concept (the role of convergence dynamics); the `closure-2-monad` is a transformer (the specific categorical operation that realizes settling by iterating closure).
In the 561 filestore: concepts live in `concepts/`, transformers live in `transformers/`.
