---
name: bilattice
description: An algebra B = ⟨B, ∧_t, ∨_t, ∧_k, ∨_k, ~⟩ with two partial orders (truth-order ≤_t and knowledge-order ≤_k) and a negation ~ that is antitone in ≤_t, monotone in ≤_k, and involutive. May additionally carry a conflation - that is antitone in ≤_k, monotone in ≤_t, with --a = a. The smallest non-trivial bilattice is FOUR = {t, f, ⊥, ⊤} (Belnap-Dunn 4-valued logic). This is the algebra of truth values in predication-categorical substrates — predication cells carry values in a bilattice rather than in {true, false}.
---

# bilattice

## The 4-valued case (FOUR)

The smallest non-trivial bilattice is FOUR = {t, f, ⊥, ⊤}:

- **t** — true (settled, evidence supports the claim, no contradiction)
- **f** — false (settled, evidence refutes the claim, no contradiction)
- **⊥** — undetermined (no evidence; gap; the cell hasn't been adjudicated)
- **⊤** — contradiction (evidence both supports and refutes; cell holds paradox)

The two orders sit transversally:

- Truth-order: ⊥ ≤_t f and ⊥ ≤_t t (and t, f are top in their respective rays); ⊤ sits above both t and f (it's "as true as t plus as false as f").
- Knowledge-order: ⊥ ≤_k everything (least information); ⊤ ≤_k nothing (most information — a paradox is the maximally-informed state).

The orders are independent.
Cells move up in knowledge-order as evidence accretes (toward ⊤); they move "right" or "left" in truth-order depending on which side the evidence weighs.

## Why this matters

A Boolean substrate has only {t, f} and cannot represent "gap" or "contradiction."
A bilattice substrate represents both as first-class values.
This is the polity's "non-Boolean, non-Shannon" substrate: information isn't a probability over a 2-element sample space; it's a bilattice value with truth-order and information-order.

Cells (predications) carry bilattice values.
Closure operators evolve cells in the knowledge-order direction (toward more information).
Wicozani is the substrate condition where there's no persistent ⊤ on relation-cells and no persistent ⊥ where settlement is due.

## Where this lives in the repo

`/theories/humanities/theories/math/theories/categories/theories/predication-categories/structures/bilattice.md` — the math definition with Lean verification.

## Sources read

The math definition in predication-categories/structures/bilattice.md (read 2026-05-14).
