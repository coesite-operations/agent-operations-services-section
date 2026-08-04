---
name: checking-the-offices-of-a-firm-conform
description: Checks every office spec in a firm's office pool against the office term, and checks that the edges between them resolve — that each office's address matches its filename, that no relation names an office that is not seated, and that every superior names its subordinates back in presides-over. Use before commissioning, decommissioning, or amending an office, and after any rename or move of an office pool. Run the script rather than reading the specs and judging by eye.
---

# checking-the-offices-of-a-firm-conform

The conformance half of the office pool. Answers one question: **is this roster correct, or is it only correct because someone was careful?**

```sh
node lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills/checking-the-offices-of-a-firm-conform/scripts/check-the-offices-of-a-firm-conform.mjs [<office-pool-dir>]
```

Defaults to the ecosystem pool at `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/offices`. Pass a directory to check a unit's own pool. Exits non-zero with every finding listed; exits zero only when the whole pool passes.

## What it checks, and why each half is needed

**Validation** — every `*.schema.json` in the pool against `emsenn/term/office`. This catches a spec that asserts a holder, carries a `duties` list, or omits its `theory-basis`. All three have happened.

**Address** — `$id` must equal `emsenn/office/<basename>`. A rename that updates the filename and not the address leaves an office that resolves from nowhere.

**Edges resolve** — `reports-to`, `presides-over`, `peer-offices`, `serves`, `served-by`, and `distinguished-from` must each name a seated office. A dangling edge is the record naming something that is not there, which is the disease this apparatus exists against.

**The superior names it back** — an office reporting to another must appear in that office's `presides-over`. Hierarchy asserted from one side only is how a roster comes out right by luck.

## Why the graph check is not optional

Validation alone cannot see a roster. An office can validate perfectly and still name a superior that was deleted last week, and every reader downstream will believe the line exists. `commissioning-an-office` states the standard the script enforces: an office exists when the record says so **and the graph agrees**. An office nobody presides over is a claim, not a seat.

The test is the stranger test — could a blank incumbent, rushed, with no access to emsenn's judgment, run this and get a correct roster? If the roster is only correct because someone chose to be careful, it is not commissioned.
