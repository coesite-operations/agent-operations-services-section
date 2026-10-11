---
name: organizing-a-technical-review
description: Organizes a technical review of a work product — names the product against its baseline, checks the entry conditions before reviewers' time is spent, seats reviewers who did not author it, and records the advisory verdict (pass, pass-with-risk, fail) that a decision checkpoint will require as input. Use when a work product must be judged sound before a gate; the organizer never decides the verdict.
---

# organizing-a-technical-review

A technical review asks **is this technically sound**, and its verdict is
advisory: pass, pass-with-risk, or fail. It is the input a decision
checkpoint cannot open without. This act is the *organizing* of that review —
and the line it walks is the quality office's whole position: PQA organizes
the review and never decides it. The verdict belongs to the reviewers; the
integrity of the process by which a verdict happened at all belongs here.

The reviews sit inside the phases (TR1 in Concept, TR2/TR3 in Plan,
TR4/TR4A/TR5 in Develop, TR6 in Qualify), but the public literature is
inconsistent about numbering — so a review here is named by **what it
reviews**, not by number, which is the honest form this firm has already
chosen elsewhere.

## What an organized review contains

1. **The work product, named against its baseline.** What is being reviewed,
   at what address, checked against which baseline of the documents above it.
   A design reviewed against a superseded architecture passes a review of the
   wrong thing.
2. **The entry check.** Before any reviewer's time is spent: the product is
   readable, complete in the shape its kind requires (an LLD with no error
   paths fails entry, not review), and its upstream documents are themselves
   baselined. Entry failures go back to the author as absences, cheaply —
   that is the point of checking entry at all.
3. **The reviewers, seated.** Named, competent in the product's domain, and
   none of them its author. The author presents; the author does not vote.
   Where the firm is thin, one reviewer is a review; the author reviewing
   alone is not, ever.
4. **The verdict, recorded.** Pass, pass-with-risk (the risk named), or fail
   (the faults named, each one addressable). The verdict is the reviewers';
   the record of it is this act's. It is advisory — it binds no funding, and
   it cannot be overruled by anyone who wants the checkpoint to open anyway.

## Method

1. Take the work product; run the entry check; return entry failures without
   convening anyone.
2. Seat the reviewers; state scope — what kind of fault this review exists to
   find.
3. Hold the review: author presents, reviewers fault, faults are recorded as
   stated, not as softened.
4. Record the verdict with the faults and risks attached; deliver it to the
   author, the team leader, and the checkpoint body.

## What it refuses, and why that is the skill

- **Deciding the verdict** — refused. The organizer who votes has become a
  reviewer with control of the record, which is worse than either alone.
- **Skipping the entry check under schedule pressure** — refused. A review of
  an unready product spends the reviewers' credibility on faults an entry
  check catches for free.
- **The author among the reviewers** — refused. Presenting, yes; voting, no.
- **A softened record** — refused. Faults enter the record as the reviewers
  stated them; softening at the record is deciding the review after it ended.
- **Attesting under pressure that a review happened when it did not** —
  refused, with the office's standing immunity: schedule and cost pressure
  are the named things its independence exists to be undisturbed by.

## When NOT to use

- Not for whether the work is worth more money — that is
  **deciding-a-decision-checkpoint**, which takes this act's output as input.
- Not for re-running a product's own pass conditions — that is
  **attesting-a-work-product**.
- Not for exercising a built artifact — that is **verifying-a-built-artifact**,
  the pilot department's ladder.
