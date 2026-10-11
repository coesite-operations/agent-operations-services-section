---
type: skill
id: generating-a-briefing-about-an-enterprise
name: generating-a-briefing-about-an-enterprise
duty: hold-the-standing-picture
position: chief-of-staff
uses: package-advertisements, witness-journal-rdf-projection-service, repository-state-observation-service
description: >
  Builds and delivers a briefing on the state of every unit of the conglomerate
  — which ventures are live, stalled, or broken, where effort actually went, and
  the single highest-leverage move available now — by querying sovereign service
  advertisements, their own state-report operations, and witness-journal RDF evidence. Use
  when asked what the state of the firm is, where attention should go, or what is
  stalled near revenue; and whenever firm state warrants surfacing something
  unasked. Do not use for a scoped task inside one settlement that has already
  been specified.
---

# Skill: brief the firm state

## What this file is

This is a **skill** — a procedure the Chief of Staff office runs to discharge its duty to hold the standing picture.
The 561 Group is a Lakota tiyóšpaye — an extended kinship band — founded by Morgan "emsenn" Sennhauser under Lakota law in 2018, organized outwardly as a conglomerate corporation.

Its sibling under this duty, **rendering-a-dag-of-the-offices-of-a-firm**, renders the shape of the *organization* — which offices exist and how they relate.
This skill renders the state of the *units* — what the ventures are actually doing.
Both discharge the same obligation: that the picture exist somewhere other than emsenn's head.

## Skill contract (Hoare triple)

This skill is an **inquiry** (closure-kind, per the firm's nuclear-quartet theory).
Its body owes the inquiry runtime contract:

> MUST declare a termination condition and report when the territory is empty.

- **Precondition (P):** Each unit is discovered from its own package advertisement and is queried only through its advertised operation; missing advertisements or operations remain explicit absences.
- **Postcondition (Q):** A briefing exists naming, for each outward venture, its live state and its single blocker; where effort actually went; and one named next move — every status claim confirmed against the live tree.
- **Termination:** the briefing terminates when every enterprise admitted by the
  current political-economic preflight has a confirmed live state or an
  explicit absence, not when a satisfying story has assembled. A story
  assembles long before the reading is done, which is the failure this
  condition exists against.
- **Result:** a success (a settled outcome) or a first-class error — `⊥` absence (a unit's state cannot be read at all) or `⊤` contradiction (the map and the live tree disagree). Errors are data to route: an unreadable unit is a finding to brief, not a gap to quietly omit.

## Orient first

Run **stabilizing-the-unions-political-economy** before this one. Its attributed
preflight supplies the presently admitted enterprise territory, authority map,
market evidence, and explicit gaps. This skill produces the operating briefing;
the preflight prevents it from treating whichever subtree was already open as
the whole going concern.

## Contract the service network

There is no firm-wide managerial runtime. Build the picture from independently
owned observations and retain disagreement between settlement views.

1. Enumerate live package advertisements carrying
   `x-agentic-metro-enterprise`; an unadvertised directory is not silently
   promoted to a settlement.
2. Invoke each settlement's advertised state-report operation. A missing or
   refusing operation is a typed finding, never permission to read or write its
   interior directly.
3. Query the witness-journal RDF provider for the time-ordered witnessed effects and
   receipts each report identifies. Use the repository-state observation
   provider for filesystem and Git evidence that a settlement has expressly
   admitted to that service.
4. Join claims by their RMN semantic identifiers and FOUR evidence bits. Keep
   contradictions visible; do not collapse them into one global status table.

Do not restore `.claude/context/00-FIRM-MAP.md` or another static global map as
ground truth. A prior inventory may enter only as an attributed observation
with its original boundary. The current preflight's admitted territory and
provider-authored reports determine what this briefing must cover.

## What a briefing contains

Three parts, in this order.

**The outward ledger.** For each venture that touches a customer or member — Koios.News, Turntide, 561.group, emsenn.net, the Routine Read — four facts: built? live? earning? and the single blocker between its current state and reaching a paying human. One blocker, named, not a list of concerns.

**The attention reading.** Where the firm's effort actually went recently (`git log --all --since`), set against where the frustration is. Name the gap. This is the part that is uncomfortable to write and is the reason the office exists.

**The one move.** The highest-leverage outward conversion available now, with the specific unit named and what it costs. One. A menu of options is emsenn doing the triage again, which is the cost this duty exists to remove.

## The value is synthesis, not data

Anyone can list packages.
The briefing's worth is the *picture*: which ventures are advancing versus stalled, which are built-but-unshipped, which blockers are systemic — hitting several units — versus local, and the one thing worth attending to right now.

The firm is attention-limited; the managerial job is coordinating attention toward the most-frustrated outward surface.
A briefing that reports what exists, rather than what it means, has not discharged the duty.

## When NOT to use

- Not for a scoped task inside one submodule that has already been specified — this is the firm-level synthesizer, and pointing it at one unit wastes it.
- Not for rendering the office graph — that is **rendering-a-dag-of-the-offices-of-a-firm**, the sibling under this duty.
- Not to decide or execute anything. The office reads everything and commands nothing; naming the one move is a recommendation, and the briefing ends there.
- Not from a single venture's spot-check. A firm conclusion drawn from one unit is the failure this skill was written against; read the set.
