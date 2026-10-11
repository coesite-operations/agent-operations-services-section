---
name: encoding claims in frontmatter
description: How to write a record whose frontmatter encodes claims about the thing-at-hand. The minimum: `name` and `description`. The description carries the actual claim — what the thing IS or what's TRUE about it. Other frontmatter fields are added only when emsenn or the math has indicated they belong; not asserted from vibes.
---

# encoding-claims-in-frontmatter

## The shape

```yaml
---
name: <slug>
description: <the claim about the thing>
---

# <slug>
```

The description carries the substantive content.
The body adds detail when needed (math definitions, distinctions, sources read).
The body may be empty if the description suffices.

## Why this works

Every `(file, key, value)` triple in frontmatter is a predication cell `(s, p, o)`.
Reading frontmatter is reading substrate.
This is not metadata — it is the predication.
Each key is a predicate; each value is the object.
The frontmatter IS the theory's knowledge of the file's subject.

`name:` and `description:` are the minimum, not the maximum.
A record that references other records, realizes a structure, depends on a claim, or carries a status is richer substrate.
Those additional fields are real predications — add them when they are grounded in the theory.

## What not to do

- **Don't import classification tags.** `type: concept`, `class: entity` — if these don't correspond to defined types in the 561 theory that transformers or closure rules act on, they are labels, not predications.
  The position of a file in `concepts/` or `structures/` already expresses that; a redundant `type:` key adds nothing.

- **Don't invent structural keys.** `domain:`, `codomain:`, `inverse:` for a morphism — if the 561 theory hasn't defined these as valid predicates for this record type, don't use them.
  Math structure goes in the body.

- **Don't write blog-post prose.** "Why this matters" / "Open questions" / "Implications" sections are shape borrowed from technical writing, not from predication.
  If the description carries the claim, the body adds substance (math definitions, distinctions, source paths read).
  It does not add rhetorical structure.

## When more fields are appropriate

When the field corresponds to a real predicate in the theory — one that the substrate can use (a transformer reads it, a closure rule derives from it, the MCP audit checks it).
Precedent from the 561 repo's actual math notes is the guide; vibes and imported conventions are not.

## Iterating on a record

Improvement means rewriting the description to be more precise, or adding body content with math substance, or filing related records that the description points to.
It does NOT mean adding frontmatter keys to display thoroughness.

## Worked example

```yaml
---
name: predication-cell
description: An ordered triple (s, p, o) recording an assertion of predicate p of subject s in relation to object o, oriented from subject to object through the predicate. Subject and object are entities; predicate is from the predicate set. The cell is the assertion-position; its value lives in the predication fiber algebra at predicate p and is a bilattice value tracking evidence for and against the assertion. The fundamental unit of predication.
---

# predication-cell

[Body content with math substance — structure, where values live, distinctions from RDF, sources read.]
```

The description contains the claim.
The body adds substance.
No imported frontmatter conventions.
