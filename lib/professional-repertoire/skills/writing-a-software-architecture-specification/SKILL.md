---
name: writing-a-software-architecture-specification
description: Produces the software architecture specification (SAS) — the document the system architect answers for, packaging an IEEE 42010-conformant architecture description with the requirements baseline it answers to, the module decomposition it hands to high-level designs, and the non-functional budgets it allocates per module. Use when a system's architecture must be decided and recorded so that module leads can write high-level designs against it, or when an existing SAS must be brought current with what was built.
---

# writing-a-software-architecture-specification

The SAS is the top of the firm's design document chain: SAS → HLD → LLD. It is the document the system architect's central duty produces, the thing a high-level design is reviewed for conformance *to*, and the only place a cross-module decision is allowed to live. Its conformance discipline is `writing-an-ieee-42010-architecture-description`; this skill is the document itself.

## What a SAS contains

**1. Identification.** Per 42010: the system, the version of the requirements baseline it answers to, date, issuing office, change history. A SAS that does not name its requirements baseline is an architecture for nothing in particular.

**2. The requirements it answers.** The system requirements the system engineer decomposed and supplied — cited by address, never restated. Restating a requirement forks it; the SAS answers to the baseline, it does not keep a copy.

**3. Architecture views.** The views the declared viewpoints govern. The set is chosen per system, but a SAS that cannot show its module decomposition, its runtime interactions, its deployment, and its data has not yet described an architecture — those four concerns exist for every system this firm builds.

**4. The module decomposition.** Every module named, its responsibility stated in one sentence, its allocated requirements cited, and its owner named — a module boundary with no owning office is a boundary nobody defends, and it will move the first time it is inconvenient. This section is the hand-off: each named module is what a module lead writes a high-level design for.

**5. Non-functional budgets.** A system-level non-functional requirement stated without per-module allocation is a wish: if the system must respond in 200ms, the SAS says which modules spend which share of it. A budget nobody allocated is exceeded by everyone and owned by no one.

**6. Decisions and rationale.** Per 42010 requirement 7: every architecturally significant decision, the alternatives that lost, and why. Cross-module disputes the architect arbitrated land here, so the arbitration outlives the argument.

## Method

1. Take the requirements baseline from the system engineer. If there is no baseline, stop — a SAS written ahead of its requirements is the architect deciding what the firm wants, which is not this office's power.
2. Run `writing-an-ieee-42010-architecture-description` for stakeholders, concerns, viewpoints, and views.
3. Decompose into modules against the allocated requirements; name an owner per module before the decomposition is settled — an unowned module is renegotiated at the first HLD.
4. Allocate every system-level non-functional requirement across the modules it touches.
5. Record decisions and rationale as they are made.
6. Audit against 42010's requirements and record any nonconformance in the document.

## What it refuses, and why that is the skill

- **No requirements baseline named** — refused. The SAS answers to something or it is taste with a table of contents.
- **A module with no owner** — refused. The decomposition is a set of accountabilities, not a drawing.
- **A non-functional requirement with no per-module budget** — refused. Unallocated budgets are how every module is individually fine and the system is late.
- **A requirement restated instead of cited** — refused. Copies drift; the baseline is the baseline.

## When NOT to use

- Not for a single module's structure — that is the module lead's high-level design.
- Not for changing an accepted architecture baseline — a baselined SAS changes through the change control board, and this skill writes the change; it does not decide it.
