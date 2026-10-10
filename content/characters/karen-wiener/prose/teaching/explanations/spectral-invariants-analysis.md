---
name: spectral invariants analysis
description: The study of spectral properties — eigenvalues, eigenvectors, spectral gaps, and their stability across settlings — of operators defined on closure-driven knowledge graphs, with attention to which of those properties may be inherited by AI embedding spaces trained on the graph.
status: draft
---

# Spectral-invariants analysis

A closure-driven knowledge graph carries operators — predicate-indexed adjacency, bilattice-aware Laplacians, incidence and boundary operators — whose spectra describe global structural properties of the graph independently of any particular vertex. **Spectral-invariants analysis** is the study of which of those spectral properties are stable across settlement (the engine's repeated closure-rule firing), and which can be inherited by AI embedding spaces trained on the graph.

The interest is twofold.
On the substrate side, stable spectra under settlement are a structural invariant of the underlying closure-rule system — a fingerprint the system carries regardless of which fiber is currently being inspected.
On the AI side, embedding methods preserve some operator-shadows of their training graph but not others; spectral-invariants analysis names what's preserved and what's discarded.

## Structural role

Spectral analysis is one of the observation methods through which the substrate's engineering can be characterized at the *global* level.
Where bilattice-state measurement reads a cell, spectral analysis reads the whole operator.
This makes it the right tool for questions like:

- Is this closure-rule system structurally stable, or does its spectrum drift as settling proceeds?
- Does this AI embedding preserve the bilattice structure of its training graph, or has it collapsed to the Boolean shadow?
- When two closure-rule systems disagree on settled state, are their spectra comparable enough that the disagreement is local rather than structural?

For Karen's program specifically, spectral analysis is a way to ask *whether the predicated computer's substrate has the structural invariants the theory predicts*, beyond per-cell verification.

## Not synonymous with

- **Spectral graph theory** in the standard sense — that works over Boolean adjacency and undirected graphs; spectral-invariants analysis here works over predicate-indexed, bilattice-valued operators, which means many standard results need to be re-derived rather than applied.
- **Knowledge-graph embedding evaluation** — embedding evaluation typically tests downstream task performance; spectral-invariants analysis tests structural preservation, which is upstream of downstream tasks.
