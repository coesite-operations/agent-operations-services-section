---
name: minimal closure rule set
description: A closure-rule set with no redundant rule under a chosen criterion of useful computation — every rule is load-bearing for some required settlement; removing any rule strictly shrinks what the substrate can settle.
status: draft
---

# Minimal closure-rule set

A **minimal closure-rule set** for a chosen criterion of useful computation is a closure-rule set in which every rule is load-bearing: removing any rule strictly shrinks the set of substrate states the engine can settle into while still satisfying the criterion.
The concept is parametric in the criterion — what counts as "useful" must be stated alongside the set for minimality to be checkable.

Minimality matters in predicated computing because closure-rule sets sit on the engine's hot path.
A rule that fires but contributes nothing the criterion requires is dead weight under the cost discipline; a minimal set is the canonical least-cost form of a substrate that can still do its job.

## Structural role

Minimal closure-rule sets are the lower bound of the substrate's design space for a given task: any working closure-rule set contains a minimal sub-set, and the minimal sub-set is the canonical reference against which redundancy is detected.
Authoring a substrate as a minimal-then-extended set, rather than as an over-broad set being shrunk, is the disciplined construction.

The concept also gives bite to the four-regime stratification.
A minimal set for the strict regime may be smaller (and is necessarily simpler) than a minimal set for the aperiodic regime; comparing minimal sets across regimes is a way to read off what the regime adds.

## Not synonymous with

- **Smallest closure-rule set** in cardinality.
  A set with fewer rules whose rules each fire on more state may exist but may not be minimal relative to the criterion if it cannot settle some required state.
  Minimality is criterion-relative.
- **Sound closure-rule set** — a sound set is one that introduces no unintended settlements; a set can be sound without being minimal (it may carry redundant rules that produce no new behavior).
- **Complete closure-rule set** — a complete set settles every required state; completeness is a precondition for minimality but not the same as it.
