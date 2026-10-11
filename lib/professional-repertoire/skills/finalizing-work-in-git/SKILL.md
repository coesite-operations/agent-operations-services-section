---
name: finalizing-work-in-git
description: Performs the git acts by which settled work enters the repository history — reads the tree's actual state, stages exactly what settled and nothing in flight, commits with a message naming what was finalized and by what act, and pushes wherever the firm's copies live. Use when work is done and must be finalized into the record; never to sweep a session's residue into history unexamined.
---

# finalizing-work-in-git

Settled work enters the repository history by a git act, and that act belongs
to the office that finalizes work — the configuration manager, whose lane is
already the equality between what the firm treats as settled and what the
record holds. A commit is that equality made mechanical at the level of the
tree: the boundary between finished and in-flight, written down, public, and
uniformly applied. The worker does not finalize their own work by habit; work
is finalized by this office's act, so the history records settlements rather
than sessions.

## The act

1. **Read before staging.** `git status` and `git diff` first, always. The
   tree's actual state is the evidence; a commit assembled from memory of
   what the session did sweeps in whatever else happened to change.
2. **Stage exactly what settled.** The files that belong to the settlement,
   no more and no less. Unfinished work, another lane's files, and accidental
   residue stay out — `git add` names paths; it is never `git add -A` on an
   unexamined tree.
3. **Commit with a message naming the settlement.** What was finalized and by
   what act it settled — the decision, dispatch, or instruction it arrived
   by — so the history can be read back as a record of what finished, when,
   and on whose authority.
4. **Push where the firm's copies live.** A commit that exists on one machine
   is finalized to nobody. Push to the named remote; if the push is refused,
   report that as exactly that rather than resolving it silently with force.

## What it refuses, and why that is the skill

- **Committing an unexamined tree** — refused. A sweep commit records a
  session, not a settlement, and afterward nothing distinguishes the settled
  from the swept-in.
- **Finalizing work that is not settled** — refused. Whether the work is done
  is the owning office's answer and the checking line's verdict, never this
  act's inference; this act finalizes what is settled, it does not settle.
- **Rewriting shared history** — refused. A force-push over the firm's copy
  makes the record afterward unable to tell what was finalized from what was
  replaced; divergence is reported, not overwritten.
- **An opinion on the work's merits** — refused. The finalizer with a view
  acquires a reason to finalize some work more faithfully than other work.
