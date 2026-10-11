---
name: attesting-a-work-product
description: Re-runs the conditions under which a work product would pass and attests what actually settled — executing every check rather than reading any claim, reporting conditions that cannot be re-run instead of assuming them, by an office that did not make the product and will not repair it. Use to establish that work is done, to give the independent quality opinion a checkpoint requires, or whenever a worker's report is the only evidence something passed.
---

# attesting-a-work-product

A work product has passed when this act re-ran the conditions of its passing
and they settled — never when the worker who made it reports that they did. A
worker attesting its own work is not evidence; it is the worker's opinion
wearing evidence's shape, and nothing downstream can tell the two apart. Not
because workers lie: because the first time schedule pressure meets an honest
incumbent, favourable wins without anyone lying.

The attestor's value is what it cannot do. It did not make the product, it
will not repair what it finds, and it is not paid for the product coming out
well. Every one of those inabilities is load-bearing.

## What an attestation contains

1. **The product and its conditions.** What is being attested, and the
   explicit conditions under which it would pass. Where the work was raised
   as a task, the task's goal *is* the conditions, and `make-a-task.js
   --verify <id>` is the instrument — it re-runs the goal and derives
   achievement, and it is the witness's instrument, not the worker's: a
   worker running it on itself proves nothing. Where no task exists, the
   conditions are taken from the product's own kind — a build that compiles,
   a suite that passes, a document whose required sections exist — stated
   before running, so the attestation cannot quietly narrow to what happened
   to pass.
2. **Each condition, executed.** Run, by this act, now. The readout is the
   exit, not the recollection. `pnpm run verify` executed here is evidence;
   "the team ran verify yesterday" is a claim, and claims are refused as
   evidence by standing duty.
3. **Conditions that cannot be re-run, reported.** A condition that cannot be
   executed is reported as exactly that — never assumed passed, never
   silently dropped. An attestation over a shrunken condition set says so.
4. **The attestation.** What settled, what did not, what could not be run.
   No repair, no advice mixed into the finding — an attestor that repairs
   acquires an interest in what it finds next time.

## Method

1. Fix the condition set first, from the task goal or the product's kind.
2. Execute every condition; record each readout.
3. Report: settled, unsettled, unrunnable — and deliver the same report
   regardless of who wanted which answer.
4. At a decision checkpoint, this report is the independent quality opinion:
   rendered before the decision, on the record either way.

## What it refuses, and why that is the skill

- **A worker's report as evidence** — refused, always. Reading the claim
  instead of executing the check is the entire failure this office exists
  against.
- **Attesting what it worked on** — refused. The immunity from being given
  the work it attests is not modesty; it is what makes the attestation worth
  anything.
- **Repairing what it finds** — refused. Findings go to the owning office;
  the attestor that fixes is grading its own homework one step removed.
- **Attesting under schedule or cost pressure** — refused, by standing
  immunity: 独立、客观、公正, undisturbed by schedule and cost pressure.
- **A narrowed condition set nobody was told about** — refused. Shrinkage is
  reported or the attestation is not issued.

## When NOT to use

- Not for organizing reviewers around a document — that is
  **organizing-a-technical-review**.
- Not for exercising a built artifact up the verification ladder — that is
  **verifying-a-built-artifact**.
- Not for deciding anything. The attestation is input to deciders; the
  attestor holds no verdict over funding, change, or continuation.
