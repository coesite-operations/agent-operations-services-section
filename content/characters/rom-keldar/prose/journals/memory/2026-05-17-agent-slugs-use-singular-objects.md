---
name: agent-slugs-use-singular-objects
description: "Agent slugs use the singular form of the structure-noun for their object-of-action coordinate, with an article (a / an / the) for grammatical naturalness. Plural-as-domain (e.g., \"getter-of-predication-cells\") is incorrect; the correct form is singular-with-article (\"getter-of-a-predication-cell\")."
---

When naming an [agent](../../561/code/structures/agent.md) per the naming grammar at [`encoding-of-agents-and-skills`](../../561/prose/concepts/encoding-of-agents-and-skills.md), the object-of-action coordinate in the slug uses the **singular** form of the structure-noun, with an English article (`a`, `an`, or `the`) for grammatical naturalness:

- ✓ `getter-of-a-predication-cell` (singular + article)
- ✓ `auditor-of-the-citations-of-the-survey` (singular structure `citation`... but here `citations` is plural — flag for review; the discipline may want `auditor-of-the-citation-list` or similar)
- ✓ `enforcer-of-the-specification-for-a-rust-script` (singular)
- ✗ `getter-of-predication-cells` (plural)
- ✗ `enforcer-of-the-specification-for-rust-scripts` (plural)

**Why:** Per the orthographic-only alias discipline at [`aliases`](../../561/work/governance/rules/specifications/aliases/aliases.md), singular and plural are *distinct entities* with distinct canonical records.
An agent slug that names its object using the plural form is referencing a different structure than the singular.
Using the singular with an article keeps the slug English-natural while preserving the discipline that the resolution target is the singular structure.

**How to apply:**

- When authoring an agent slug, identify the object structure (e.g., `predication-cell`); use the singular slug.
- Insert an English article (`a`, `an`, `the`) between the preposition and the noun to keep the slug readable.
- Audit existing agent slugs: those using plurals (e.g., `cleaner-of-citations`, `auditor-of-records`) are non-conformant under this discipline; the corrected form is singular-with-article (e.g., `cleaner-of-a-citation`, `auditor-of-a-record`).
- The same discipline applies to skill slugs' object coordinates: `getting-a-predication-cell` (singular + article) rather than `getting-predication-cells`.

This is a consequence of [[no-polity-framing-in-definitions]] + the orthographic-only alias discipline combined: each structure name is one specific mathematical object; pluralizing it implicitly invokes a different (collection-type) structure that may not be earned.
