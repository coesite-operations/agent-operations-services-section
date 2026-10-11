---
name: closure operator
description: A family of maps cl = (cl_p)_p on each predication fiber algebra A_p, satisfying monotonicity in the knowledge-order, inflationarity (v ≤_k cl_p(v)), idempotence (cl_p ∘ cl_p = cl_p), and naturality in the predicate category (f* ∘ cl_p = cl_q ∘ f* for any f : q → p). The closure cl_p(v) is the consequence closure of a valuation v under the inference rules encoded in cl. This is how the substrate's cell values evolve — closure rules fire to update cells, the closure operator captures the combined effect.
---

# closure-operator

## Axioms

1. **Monotone in knowledge-order**: if v ≤_k v', then cl_p(v) ≤_k cl_p(v').
2. **Inflationary**: v ≤_k cl_p(v).
  Closure adds information, never removes it.
3. **Idempotent**: cl_p ∘ cl_p = cl_p.
  Applying closure twice doesn't differ from applying it once.
4. **Natural in the predicate category**: for any morphism f : q → p, f* ∘ cl_p = cl_q ∘ f*.
  Closure commutes with reindexing.

## What it does

Given a valuation v ∈ A_p (an assignment of values to cells with predicate p), cl_p(v) is the *consequence closure* — the result of firing all inference rules in cl until quiescence (or as far as cl is defined to take it).

In logic-programming-style settling, cl implements a fixed-point operator.
In description-logic-style settling, cl implements TBox-driven inference.
The substrate is closure-agnostic: any closure operator satisfying the axioms is admissible.

## Closure rules

A closure operator is typically specified by a closure-rule system — a finite or countable family of positive Π_1-schemas.
Each rule has an antecedent (when does the rule fire?) and a consequent (what cells does it update?).
The closure operator is the least operator satisfying every rule consequent whenever its antecedent holds.

The rules' shape determines the substrate's regime: rules with quantifier-free antecedents generate Scott-continuous closures; rules with ∀-blocks over infinite domains generate non-Scott-continuous closures.

## Lax-idempotence (the 2-monad version)

The classical idempotence axiom (cl ∘ cl = cl strictly) is one option.
The richer version: cl is a 2-monad, and cl ∘ cl is related to cl by a non-identity 2-cell.
That 2-cell records *paradox-residue* — substrate content that contradicts and is held.

The heyoka-vocation in the 561 Group is the substrate's lived bearer of this 2-cell.

## Sources read

`/theories/humanities/theories/math/theories/categories/theories/predication-categories/transformers/closure-operator.md` (Lean: `PredicationCategories.
Homebrew.
Settling.
Closure.
ClosureOperator`).
