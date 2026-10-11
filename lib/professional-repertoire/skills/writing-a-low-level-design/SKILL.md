---
name: writing-a-low-level-design
description: Produces a unit's low-level design (LLD, 详细设计) — the unit's logic, data structures, algorithms, error paths, and resource use, stated in a form a reviewer can fault before any code exists — disciplined by IEEE 1016's detail viewpoints. Use when a unit named by a module's high-level design is to be implemented, before its code is written, or when a design must be carried to senior-engineer review.
---

# writing-a-low-level-design

The bottom of the SAS → HLD → LLD chain, and the only one of the three written by the office that will also build the thing. That is deliberate: the unit's design is the module developer's own work product, not dictation from above — MDE stands for module *design* engineer, and the code is the design's realization, not its source.

An LLD is written before the code, carried to senior-software-engineer review, and approved by the module lead for implementation. The order is the content: a design written after the code is a transcription, and reviewing a transcription is reviewing what happened rather than whether it should.

## What an LLD contains

Per IEEE 1016's detail-level viewpoints:

**1. Position.** Which HLD unit this is, cited by address, with its allocated requirements and the interfaces it participates in. The interfaces are *cited from the HLD*, never restated and never altered — an LLD that adjusts an interface has made a module-level change at unit altitude, and it goes up instead.

**2. Structure and data.** The unit's internal parts and its data structures: shapes, invariants, lifetimes. An invariant stated here is a sentence; discovered in production it is an incident.

**3. Logic and algorithms.** The unit's behavior, stated so a reviewer can fault it: the algorithm and why it suffices (its complexity where it matters, its termination where that is not obvious), state machines where there is state, ordering where order matters.

**4. Error paths.** Every failure the unit can meet and what it does with each — handled here, or propagated, and in what form. The error paths are half the design and the half that unwritten designs never have; "the happy path plus experience" is what this section exists to replace.

**5. Resource use.** What the unit spends — memory, handles, time budgets from the SAS's allocation — where any of these is constrained.

## Method

1. Take the unit from the approved HLD. Unapproved HLD, no LLD — building against a proposal builds a different module than the one that gets approved.
2. Write the design in the shape above, error paths with the same care as logic.
3. State what would convince a skeptic: the invariants held, the cases covered. This is what the reviewer will try to fault, so putting it in the document is what makes the review fast.
4. Carry it to senior-software-engineer review; rework what the review returns.
5. On approval by the module lead, implement — and where implementation proves the design wrong, the LLD is corrected and re-reviewed, not silently outgrown. A merged unit whose LLD describes a design that lost is worse than no LLD: it is a confident wrong answer waiting for the next reader.

## What it refuses, and why that is the skill

- **Written after the code** — refused. That is transcription; review of it audits nothing.
- **An interface change, however small** — refused here. Routed to the module lead; interfaces are module property.
- **Code written against an unreviewed LLD** — refused. The review is where design faults cost a paragraph instead of a codebase.
- **A unit skipped as too simple to design** — refused without the module lead's approval on the record. Simplicity is a claim, and the office that approves designs is the office that gets to accept it.

## When NOT to use

- Not for the module's structure or interfaces — that is the HLD.
- Not for recording what existing code does — that is documentation of code, valuable and different; this skill decides what code there will be.
