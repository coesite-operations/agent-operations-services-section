---
name: writing-a-high-level-design
description: Produces a module's high-level design (HLD, 概要设计) — the module decomposed into units, every externally visible interface fully specified, data design stated, and every unit carrying its allocated requirements — disciplined by IEEE 1016's design viewpoints. Use when a module named by the software architecture specification must be designed so that developers can write low-level designs against it, or when an HLD must be carried to the system architect's conformance review.
---

# writing-a-high-level-design

The middle of the SAS → HLD → LLD chain. An HLD exists per module, is written and answered for by the module's lead, and is reviewed by the system architect for conformance to the architecture. Its unit of hand-off is the same as the SAS's: each unit the HLD names is what a module developer writes a low-level design for.

## What an HLD contains

Disciplined by IEEE 1016 (software design descriptions): a design description is organized as design views governed by declared design viewpoints, each with its design language stated. The viewpoints an HLD must cover:

**1. Context.** Which SAS decomposition element this module is, cited by address, with its one-sentence responsibility repeated *verbatim* from the SAS. If the sentence needs changing, that is an architecture change and goes up, not in here.

**2. Composition.** The module decomposed into units. Every unit carries the requirements allocated to it, traced from the module's allocation — a unit with no requirement is either missing its trace or should not exist, and the HLD says which.

**3. Interface.** Every externally visible interface, fully: operations, their data in and out, their error behavior, their protocol where order matters. Full means a developer on the *other* side of the interface can build against this section alone. An interface specified by reference to code has the dependency backwards — the code is checked against the HLD, so the HLD cannot be defined by the code.

**4. Information.** The data the module owns: structures, lifetimes, who else may see them. Data shared between modules is an interface and lives in section 3; finding shared data described here is finding an undeclared interface.

**5. Interaction.** How the units realize the module's main scenarios — enough that a reviewer can walk a requirement through the units that jointly satisfy it.

## Method

1. Take the module's entry in the SAS decomposition and its allocated requirements. No SAS entry, no HLD — a module the architecture does not name is a module the architect has not agreed exists.
2. Decompose into units against the allocated requirements; trace every requirement to the units that carry it, and every unit back.
3. Specify every interface before any unit's internals — interfaces are the part neighbors depend on, and the part that cannot be quietly fixed later.
4. Write information and interaction views.
5. Carry the HLD to the system architect's conformance review. The review is the architect's power, not a courtesy: an unreviewed HLD is a proposal, and no LLD is written against a proposal.

## What it refuses, and why that is the skill

- **A module the SAS does not name** — refused. Designing it is deciding architecture from below.
- **An interface specified by reference to code** — refused. The check runs the other way.
- **A unit with no allocated requirement and no stated reason to exist** — refused. Unattributed units are where scope hides.
- **A conflict with the SAS resolved locally** — refused. It goes to the system architect; two modules that quietly agree to diverge from the architecture have re-decided it without the office that answers for it.

## When NOT to use

- Not for the system's shape — that is the SAS.
- Not for a unit's internals — that is the low-level design, and pulling unit internals up into the HLD makes the HLD unreviewable at its own altitude.
