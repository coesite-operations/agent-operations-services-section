---
name: deciding-a-decision-checkpoint
description: Takes a binding go / no-go / redirect decision at a decision checkpoint (DCP) — on a technical review that already passed and an independent quality opinion already heard — and, at the concept checkpoint, issues the charter (任务书) stating what a go commits the firm to. Use when work asks for more money at a gate; refuses to open on an unpassed or missing technical review, and refuses to rule on technical soundness at all.
---

# deciding-a-decision-checkpoint

A decision checkpoint asks one question: **is this worth more money.** It does
not ask whether the work is technically sound — that question was already
answered, by a technical review, before this act may begin. The TR is
advisory input; the DCP verdict is binding. The body that judges soundness
cannot fund, and the body that funds does not judge soundness. This act is
the funding side of that separation, and every refusal in it exists to keep
the two from collapsing into one committee that rules on both and calls its
funding preferences soundness.

The chain the checkpoints sit in: **Charter → Concept → Plan → Develop →
Qualify → Launch → Lifecycle**, with decision checkpoints CDCP (concept),
PDCP (plan), and ADCP (availability), and technical reviews inside the phases
between them.

## What a checkpoint decision contains

1. **The checkpoint, named.** Which gate this is, for which chartered work.
2. **The technical review verdict, cited.** Pass or pass-with-risk, by
   address of the review record — never summarized from memory, never taken
   from the team's own report. Pass-with-risk is decidable; the risk enters
   the decision. Fail or absent is not decidable — see refusals.
3. **The quality office's independent opinion, heard and cited.** Product
   quality assurance speaks at every checkpoint before the decision, and what
   it said is on the record whether or not the decision goes its way.
4. **The verdict: go, no-go, or redirect.** Binding. A no-go kills the work
   and says so plainly — killed work is a decision, not an embarrassment. A
   redirect states what changes and returns the work to the team; it is not a
   soft go.
5. **What a go commits.** At the concept checkpoint a go issues the
   **charter** (任务书), and a charter states four things: the **target**
   (the shipped thing, in the user's terms), the **boundary** (what it will
   not do — a charter with no boundary commits the firm to everything), the
   **allocation** (what may be spent before the next checkpoint), and the
   **appraisal** (how the team's delivery will be judged, stated now, while
   nobody knows who it favours). At later checkpoints a go re-affirms or
   amends the charter; amendments are stated, not accumulated silently.

## Method

1. Confirm the technical review passed. Read the review record itself.
2. Hear the quality opinion. Read what PQA rendered for this checkpoint.
3. Decide worth — against the portfolio, not against the work's own promise.
   The question is never "is this good" but "is this the best use of what it
   costs, given everything else the firm could buy with the same allocation."
4. Record the verdict with its citations, and — on a go at concept — issue
   the charter in the four-part shape above, as a record:

   ```sh
   echo '{"id":"…","name":"…","target":"…","boundary":["…"],
          "allocation":"…","appraisal":"…","issued-to":"<office>"}' \
     | node lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills/deciding-a-decision-checkpoint/scripts/issue-a-charter.js
   ```

   The record conforms to `emsenn/term/charter` and seats in the charters
   pool. The script refuses a boundary that promises instead of excluding, an
   allocation that does not bound, and an office that does not exist. Nothing
   edits a charter in place — an amendment is a new charter carrying
   `"amends"`, and `--in-force <id>` walks the chain to the commitment that
   currently stands.
5. Tell the team leader the verdict directly. A checkpoint whose outcome the
   team learns by rumor has decided nothing yet.

## What it refuses, and why that is the skill

- **Opening on a failed, missing, or unread technical review** — refused. A
  DCP that opens anyway is judging soundness itself, which is the collapse.
- **Ruling on technical soundness** — refused. If the review's verdict seems
  wrong, the review is re-run or escalated; the checkpoint does not overrule
  it, in either direction.
- **Deciding without the quality opinion** — refused. The opinion is heard
  before the decision or the decision waits.
- **A go with no charter consequence** — refused at concept. A go that
  commits nothing stated has funded work nobody can later say was delivered.
- **A soft no** — refused. Letting work drift on unfunded is a no-go the firm
  pays for anyway; the verdict is one of three words, on the record.

## When NOT to use

- Not for whether the work is sound — that is **organizing-a-technical-review**
  and the review it produces.
- Not for changes to baselined work — that is the change control board's
  **deciding-a-change-to-a-baseline**.
- Not for investment above the product line — whether this whole line should
  exist is **deciding-an-investment**, the investment review board's act.
