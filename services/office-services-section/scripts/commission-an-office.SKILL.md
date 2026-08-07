---
name: commissioning-an-office
description: Seats or retires a canonical office spec in the firm's pool at lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/offices, validating it against emsenn/schema/office, patching the superior's presides-over edge, and proving the whole pool conforms before reporting success. Use when there is work nobody answers for and an office must be seated for it, or when an office answers for nothing and must be decommissioned with its work's destination recorded.
---

# commissioning-an-office

Seats or retires a canonical office spec in the firm's pool, validating it against `emsenn/term/office`, patching the superior's `presides-over` edge, and proving the whole pool conforms before reporting success.

## Skill contract (Hoare triple)

This skill is a **process** (closure-kind, per the firm's nuclear-quartet theory).
Its body owes the process runtime contract:

> MUST contain no conditional and produce identical output for identical input; if the world is not as assumed, fail loudly rather than branch.

- **Precondition (P):** The spec conforms to `emsenn/term/office`, the named office does not already seat, and every office it names seats.
- **Postcondition (Q):** The office record seats, the superior names it back, and the conformance checker passes over the whole pool — every edge, borne duty, and owed work resolves.
- **Result:** a success (a settled outcome) or a first-class error —
  `⊥` absence (found/produced nothing) or `⊤` contradiction (world conflicted
  with an assumption). Errors are data to route, not exceptions to throw.

## When to use

Use when there is work nobody answers for and an office must be seated for it, or when an office answers for nothing and must be decommissioned. The duty this skill discharges toward is `emsenn/duty/commissioning-an-office`: keep the roster of offices equal to the work that is actually answered for.

## Run it

Commission — the spec comes in whole, on stdin:

```sh
cat chief-engineer.json | node lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills/commissioning-an-office/scripts/commission-an-office.js
```

Decommission:

```sh
node .../scripts/commission-an-office.js --decommission chief-engineer --succeeded-by chairperson
```

Options: `--root <repo-root>`, `--dry-run`.

## The spec is supplied, never scaffolded

The intake must articulate the office itself: `normative-structure` (what it answers for), `deontic-profile` (the works it governs, each mapped to exactly one of `duty` | `liberty` | `deontic-power` | `deontic-immunity`), and `theory-basis` (what the structure is derived from). This is the term's own gate, not bureaucracy: no office can be created without articulating what it governs, and an office with no theory basis was not derived — it was asserted. A scaffold with plausible filler would pass the schema and still be the failure the gate exists to catch, so there is no scaffold.

The spec carries no incumbent, and the profile carries no holder: a duty in the profile is the office's, and it passes whole to whoever holds the office next. Seating someone *in* the office is a different act (`installing-claude-as-an-office`), and the standing obligations the office takes up are separate duty records named in `bears-duty` — a duty spec names no bearer, so the `bears-duty` list is the only place the assignment exists.

## Procedure

1. Read the spec from stdin and validate it against `emsenn/term/office` — refused before writing, not after.
2. Read the whole pool; **exit non-zero on any miss** — office already seated, or any office the spec names unseated. No branching on surprise.
3. Seat the record; patch the superior's `presides-over` with the reciprocal edge.
4. Run `checking-the-offices-of-a-firm-conform` across the pool; require PASS. This is the postcondition, checked rather than assumed.

Decommission inverts it: refuse while any record still points at the office (naming each), mark the record `status: decommissioned` with `succeeded-by`, then re-verify.

## What it refuses, and why that is the skill

Writing the file is the easy half. The parts that decide whether an office is a *seat* or a *claim* are the term gate, the reciprocal edge, and the pool-wide proof, so the script will not proceed without them:

- **Spec does not conform to the term** — refused, every schema error named.
- **Office already seats** — refused, never overwritten. Safe against a sibling session's record.
- **Any office the spec names doesn't seat** — refused before writing, not after.
- **Decommission while anything still points at it** — refused, every referrer named. Otherwise the office is hidden, not retired.
- **`--succeeded-by` omitted or unseated** — refused. An office is not retired until what it held has somewhere to go.

## Decommissioning does not delete

The record is kept and marked: `status: decommissioned` and `succeeded-by` are added.

This is not politeness — deleting the record would destroy settled facts about an office that existed, and a roster that forgets its retired offices cannot say why the work moved. The record is what persists; the incumbency is what ends.

## When NOT to use

- Not for changing an existing office's relations — this commissions and retires; edit the record and re-run the checker otherwise.
- Not for seating an incumbent — that is `installing-claude-as-an-office`.
- Not for the standing obligations themselves — duties are separate records in the duties pool, and an office takes them up by `bears-duty`.
