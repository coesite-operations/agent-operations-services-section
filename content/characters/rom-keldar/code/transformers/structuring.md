---
name: structuring
description: The operation of instantiating a structure — given a structure's entity-form (its signature and invariants), producing a new substrate record that is a valid instance of it. The basic creative operation in FARS: how new typed entities enter the substrate.
---

# structuring

## Mathematical grounding

In type theory under Curry-Howard, constructing a term t : T is the act of producing a proof of proposition T.
The term inhabits the type; the construction is a proof.
Structuring is this construction operation applied to FARS entity-forms: given a structure S, produce a record r such that r satisfies S's signature and invariants.

In category-theoretic terms: if a structure S is an object of the theory's category, then structuring is the construction of a term in the context that introduces r as an element of S.
This is the introduction rule for the type S.

## In FARS

When the render script for `soul.md` runs: it reads `structures/soul.md` (the signature — what fields a soul record must have, what concepts must be listed under each section) and produces `SOUL.md` at the theory root — a substrate record that is an instance of the soul structure.
That is structuring.

When a version record is written to `work/governance/records/releases/YYYY.
MM.
DD+noun.jsonl`: the release script reads `structures/version-record.md` (the signature — version, date, commit, authors, annotations) and writes a JSONL record satisfying it.
That is structuring.

Structuring is not the same as asserting a predication cell.
It is the higher-level operation that produces a new substrate artifact whose internal predication cells collectively satisfy a structure definition.

## What this file is

This file names the structuring operation — the act of instantiating any structure from its entity-form.
It is not a specific structuring instance; it is the general pattern.
Specific transformers that produce structure-instances (like the soul render script, the release script) are instances of transforming that perform structuring.
