---
name: structure
description: A formal entity-form — a named construction defined by its signature (the fields it has and their constraints), the relations it participates in, and the invariants that must hold for something to count as an instance of it. The objects of a category in the Curry-Howard / Lambek-Scott sense; the things a predication category has alongside morphisms.
---

# structure

## Mathematical grounding

In predication category theory, a category consists of objects and morphisms.
Objects are the mathematical structures — bilattices, predication settlings, hyperdoctrines, entity sets, fiber algebras.
Each is formally specified: what it is made of (signature), what operations it supports, what laws those operations must satisfy.
An object is not an element; it is a type.
Elements (terms, instances) inhabit objects.

The Curry-Howard correspondence equates types with propositions and terms with proofs.
Under this reading, a structure is a type: its instances are the terms that inhabit it, and a term inhabits a structure iff it satisfies the structure's signature and invariants.

## In FARS

The `structures/` directory holds entity-form definitions.
A file in `structures/` defines a type of thing that can exist in the substrate — what fields an instance must have, what those fields mean as predication cells, and what the invariants are.

A record is an instance of structure S iff its frontmatter satisfies S's signature.
The membership claim `(record, instance-of, S)` is derivable from the substrate — not self-declared in the record's own frontmatter.

## Distinguishing structure from concept

A concept is a semantic anchor — a recurring role or idea that objects *realize* but do not *define*.
A structure is a formal construction — a specific mathematical entity with signature and invariants.
`truth` is a concept; `bilattice` is the structure that realizes it by providing the truth-order.
In the 561 filestore: concepts live in `concepts/`, structures live in `structures/`.

## Distinguishing structure from transformer

A structure is a thing.
A transformer is an operation — an arrow between structures.
The structure-transformer distinction is the object-morphism distinction of category theory.
See `structures/transformer.md`.
