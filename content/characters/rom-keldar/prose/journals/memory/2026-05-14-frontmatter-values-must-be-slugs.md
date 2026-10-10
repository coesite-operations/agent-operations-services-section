---
name: 2026 05 14 frontmatter values must be slugs
description: A resource file's frontmatter is its substrate cells; (file, key, value) = (s, p, o). The value MUST be a slug naming another entity (itself made of predications). No nested objects, no raw scalars-as-data, no invented shortcuts. Edges have to actually be edges to real entities or the substrate cannot be used.
type: correction
date: 2026-05-14
---

# The rule

Each `key: value` line in a resource file's frontmatter is one substrate cell.
The triple is:

- **s** = the file (the entity the file presents)
- **p** = the key (a predicate from predication-category theory)
- **o** = the value

The value MUST always be a slug.
The slug must name an actual structure — another entity in the substrate — that is itself made of predications.

No exceptions.

This is what makes the substrate usable.
Every cell is an edge in the predication-graph; the edge has to lead to a real node.
If the value is a raw scalar, an inlined object, a JSON-encoded structure, a tagged form, or any other non-slug shape, the edge cannot be traversed and the system never works as a substrate.

# What this rules out (and why I have to watch for it)

I have a pattern of stating the captain's rule correctly and then introducing an unauthorized permissive branch — "value must be a slug, OR a nested object with its own cells", "value must be a slug, OR a literal when the predicate's range is primitive", etc. The second clause is always made-up; the captain never authorizes those shortcuts.

When the captain says "X must be Y," that is the whole rule.
I do not add "or Z" without being told.
If I find myself reaching for an "or" branch while writing a spec, I stop and either ask, or accept that the slug-only constraint forces the design to look different than I was about to write (e.g., the "nested structure" I wanted to inline becomes its own file with its own slug).

# What this means for FARS specs I have produced

The encoding I used for closure-rule transformers — `premise:` containing a nested object with `quantifiers`, `atoms`, `connective`; `conclusion:` containing a nested `cell`, `value`, `op` — is wrong.
The frontmatter values there are inlined structures, not slugs.
The rule's antecedent and consequent are themselves entities; if they need to appear in the substrate, they need their own files (or to be reconstructible from other cells using real predicates).

Similarly: `transformer-class: closure-rule` was wrong as discussed separately ([[2026-05-14-predication-substrate-foundations]] — frontmatter keys must be real predicates, not invented meta-classifications), and the value-form question compounds it.
The fix is not partial.

# How to apply this

When writing or reviewing a spec:

1. Every frontmatter key must be a real predicate from predication-category theory (or a downstream theory's predicate inventory).
2. Every frontmatter value must be a slug naming an existing entity.
3. If I think I need a nested object, the right move is to file that nested thing as its own entity with its own slug, then point at it.
  The flatfile substrate already supports this; that is the point of the substrate.
4. If I think I need a scalar (a number, a boolean, an enum value), I either find the predicate that already lets it be slug-named (every primitive value can be slug-named in a sufficiently rich category) or I ask the captain how to encode it — I do not invent an exception.

# Related

- [[2026-05-14-predication-substrate-foundations]] — the substrate-cells framing for frontmatter generally.
- [[2026-05-14-lessons-from-this-session]] — broader behavioral patterns to watch.
