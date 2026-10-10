---
name: verifying-a-built-artifact
description: Exercises a built artifact up the verification ladder — the design verified against what was built (SDV), the parts integrated and exercised together (SIT), the whole exercised as its user would meet it (SVT) — by an office independent of the builders, answering for final quality and repairing nothing. Use before a release or availability checkpoint, or whenever a built thing's working-ness rests only on its builders' own checks.
---

# verifying-a-built-artifact

A built thing is believed working, before this act, on its builders' own
checks — verification as a stage of the building, performed by the party
whose schedule it threatens. This act is the independent pass: the pilot
department's ladder, run by an office that did not build the artifact,
cannot repair it, and 对产品的最终质量负责 — answers for the product's final
quality. The verdict is owed by the verifier and is not negotiable back down
the line that built the thing.

The ladder is Huawei's **SDV → SIT → SVT**, and its rungs are three different
questions, in an order that matters:

## The ladder

1. **SDV — the design, verified against what was built.** Does the artifact
   that exists match the design that was reviewed? Interfaces as the HLD
   states them, units behaving as their LLDs claim, invariants actually
   held. A mismatch here is either a build defect or a design that was
   silently outgrown — both findings, both reported, neither repaired here.
   For this firm's software: does what `lib/` actually exports and does
   correspond to what the design documents say it does — checked by
   exercising it, not by reading the documents side by side.
2. **SIT — the parts, integrated and exercised together.** Units that each
   passed alone, now composed: the seams, the orderings, the resource
   contention, the error that one part throws and another was supposed to
   catch. For this firm: the workspace built and its packages exercised
   against each other — `pnpm run verify` (check + build + test, every
   package) is the floor of this rung, not the whole of it.
3. **SVT — the whole, exercised as its user would meet it.** Not the test
   suite's entry points: the user's. The service brought LIVE and driven
   through what a user actually does (`make animate`, then drive the real
   surface), the CLI invoked as documented, the failure a user would hit
   first hunted deliberately. The question is not "do the tests pass" but
   "does the thing, met cold, do what it is for."

Each rung runs on the artifact as built from the baseline — a verification
of a locally patched build verifies a product that does not exist.

## What a verification contains

The rungs run, in order, each with: what was exercised, how, what settled,
what did not, and what could not be exercised (reported as exactly that,
never assumed). Then the verdict: the verifier's, on the record, delivered
to the team leader and the checkpoint body. A failed rung stops the ladder —
integrating parts whose design correspondence already failed verifies the
integration of the wrong thing.

## What it refuses, and why that is the skill

- **Repairing what it finds** — refused. Findings go to the owning office
  through the team leader; a verifier that fixes has joined the building
  line and stopped being evidence.
- **Verifying a moving target** — refused. The artifact is built from a
  named baseline or the ladder does not start.
- **Skipping rungs under schedule pressure** — refused. A rung skipped is
  reported as a rung skipped; the checkpoint decides what that is worth,
  not the verifier and not the builders.
- **Negotiating the verdict** — refused. The builders may fix and resubmit;
  they may not argue the readout into a different one.
- **The builders' checks as this act's evidence** — refused. Their passing
  suite is an input worth knowing about and evidence of nothing here; this
  office runs its own exercise or reports that it could not.

## When NOT to use

- Not for documents — a design or specification is attested and reviewed
  (**attesting-a-work-product**, **organizing-a-technical-review**), not
  exercised.
- Not for the builders' own test-writing — that is the building line's work
  and belongs there; this act neither replaces it nor inherits it.
- Not as a gate the verifier decides — the verdict is input to
  **deciding-a-decision-checkpoint**; worth is the funding body's question.
