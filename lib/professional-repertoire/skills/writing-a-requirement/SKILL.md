---
name: writing-a-requirement
description: "Records what a party asked for as a requirement whose conditions are commands a machine runs, refusing any whose conditions are prose; records a change to an accepted requirement as a new requirement naming the one it changes, never as an edit. Use when a requirement is received, when it is decided at a tier, when it is distributed to work items, and when what was asked for moves. Prose conditions are refused because a requirement that cannot fail is satisfied by whatever gets built."
---

The whole content of this script is the REFUSAL, and the refusal is the same
one make-a-task makes one layer down: emitting a requirement is trivial,
and what makes it a requirement rather than a wish is that the conditions
under which the raiser would agree it was met are commands, so it is met when
they exit 0 and not when a builder says so.

"the office DAG should render" cannot fail. Every output satisfies it. A
worker handed it will substitute a task it can finish for the task it was
given — confidently, in a shape indistinguishable from progress — and nobody
will be able to point at the moment it happened.

The second refusal is the edit. An accepted requirement is never rewritten:
a change is a new requirement naming what it changes. Rewriting in place
destroys the only evidence that the ask moved, and a firm that cannot see its
requirements moving will believe it hit a target it repainted.
