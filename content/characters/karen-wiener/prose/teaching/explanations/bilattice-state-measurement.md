---
name: bilattice state measurement
description: The act of observing which bilattice value a substrate cell carries at a given history, particularly across the four-valued FOUR (⊥, t, f, ⊤) — used to verify that a skill or agent handles the full bilattice rather than collapsing to two values.
status: draft
---

# Bilattice-state measurement

The substrate's cells take values in the four-bilattice FOUR — `⊥` (no information / not-yet-attested), `t` (confirmed), `f` (refuted), `⊤` (contradiction).
Bilattice-state measurement names the act of observing which value a cell or family of cells carries at a chosen history, with the standing requirement that all four states are first-class outcomes the observer can return.

The concept is load-bearing for skill audit.
A skill that processes uncertain or contradictory information is non-conformant if it can only return `t` or `f` — it must be observable to return `⊥` on no-information inputs and `⊤` on contradiction inputs.
Bilattice-state measurement is the observation that lets an auditor say so.
Without the concept, "the skill handles uncertainty" reduces to vibes; with it, the claim is a checkable predication over the skill's output cells.

## Structural role

Bilattice-state measurement is the observation morphism that produces a value report from a cell or cell-set without modifying the substrate.
It is the read side of the cost discipline (reads are free; only settling pays).
It pairs with closure-rule firing to make the substrate's epistemic state legible: closure rules change cell values; bilattice-state measurement reads them.

In skill audit specifically, it is what lets an auditor file a finding of the form *"this skill's output on input I lands in F_χ when it should land in ⊥_χ"* — i.e., the skill is reporting confidence it doesn't have.

## Not synonymous with

- **Cell-value extraction** — extracting a single (s, p, o) cell's value is bilattice-state measurement at minimum cardinality; the concept extends to families and to derived properties (e.g., "the meet of these cells' values in the knowledge order").
- **Skill output validation** — validation checks output against a declared shape; measurement reads what's there.
  A measurement *feeds* validation but is distinct from it.
