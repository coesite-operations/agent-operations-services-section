---
name: writing-an-ieee-42010-architecture-description
description: Produces an architecture description conforming to ISO/IEC/IEEE 42010 — stakeholders and concerns identified, every concern framed by a declared viewpoint, every view governed by exactly one viewpoint, correspondences and known inconsistencies recorded, and every architecturally significant decision recorded with its rationale and the alternatives that lost. Use when writing or auditing a software architecture specification, or any document that claims to describe a system's architecture, so that the claim can be checked against the standard rather than against taste.
---

# writing-an-ieee-42010-architecture-description

The standards discipline behind the firm's architecture documents. An architecture description (AD) is conformant or it is not — 42010 states checkable requirements, and this skill is those requirements as a method, so that "is this architecture documented?" has an answer that does not depend on who is asking.

## What the standard actually requires

An AD conforming to ISO/IEC/IEEE 42010 does all of the following. Each is a check, not a suggestion; an AD missing one is nonconformant at that point, and says so rather than hiding it.

**1. Identify the system-of-interest and the AD itself.** The AD names the system it describes, its scope, its date, its issuing office, and its change history. An AD that cannot say which version of what it describes is not a description; it is a mood.

**2. Identify stakeholders.** The standard requires considering, at minimum: users, operators, acquirers, owners, suppliers, developers, builders, and maintainers of the system. Not all will exist for every system — but each class is *considered*, and the ones set aside are set aside on the record.

**3. Identify concerns, and map every one to stakeholders.** Required concerns to consider: the purposes of the system; the suitability of the architecture for those purposes; the feasibility of construction and deployment; risks and impacts to stakeholders through the whole lifecycle; maintainability and evolvability. A concern held by nobody is decoration; a stakeholder with no concerns was not identified, only listed.

**4. Frame every concern by at least one viewpoint.** A viewpoint is declared before it is used, and its declaration states: the concerns it frames, the stakeholders it addresses, and the model kinds it uses — each with its notations and conventions. A diagram whose notation is nowhere declared is not a model; it is a picture.

**5. Govern every view by exactly one viewpoint.** One, exactly. A view answering to no viewpoint cannot be checked for completeness; a view answering to two is two views interleaved, and each hides the other's gaps.

**6. Record correspondences and known inconsistencies.** Where the same element appears in two views, the correspondence is stated, and correspondence rules are checked. Where the views are *known* to disagree, the inconsistency is recorded as an inconsistency — an AD that records its own contradictions is conformant; one that smooths them over is lying at the standard's most load-bearing point.

**7. Record rationale.** Every architecturally significant decision carries: the decision, the alternatives considered, and why this one won. Concerns the architecture does not address are listed as unaddressed. Rationale omitted because the decision felt obvious is the first thing the next incumbent will need and not have — obvious-at-the-time is precisely the knowledge that dies with an incumbency.

## Method

1. Write requirement 1's identification block first — it is five minutes of work and skipping it is how drafts become the record.
2. Enumerate stakeholders (req 2) and concerns (req 3) as a two-column mapping. Every concern names its stakeholders; every stakeholder appears at least once.
3. Declare viewpoints (req 4) *before* drawing anything. Steal existing viewpoint definitions where they fit — 42010 expects reuse; inventing a viewpoint per document is a smell.
4. Produce the views (req 5), each stamped with its governing viewpoint.
5. Walk every shared element across views and record correspondences and inconsistencies (req 6).
6. Write the rationale (req 7) as decisions are made, not at the end. Rationale reconstructed at the end is a justification, not a record.
7. Audit the finished AD against the seven requirements above, and record any nonconformance in the AD itself.

## What it refuses, and why that is the skill

- **A view with no declared viewpoint** — refused. Undeclared conventions cannot be checked, so the view can never be wrong, so it can never be right.
- **A stakeholder list with no concern mapping** — refused. It records who was in the room, not what the architecture answers to.
- **Rationale omitted as obvious** — refused. The AD outlives the obviousness.
- **An inconsistency smoothed over instead of recorded** — refused. The standard permits inconsistency and forbids hiding it.

## When NOT to use

- Not for a design below architecture — a module's high-level or low-level design is disciplined by IEEE 1016 through `writing-a-high-level-design` and `writing-a-low-level-design`.
- Not by itself for the firm's SAS document — `writing-a-software-architecture-specification` owns the document; this skill is the conformance discipline it invokes.
