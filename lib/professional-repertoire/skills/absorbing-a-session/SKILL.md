---
name: absorbing-a-session
description: Converts one session's output into settled organizational state at close-out — names what the session actually produced, writes episodic memory in its home, appends settled conclusions and dead ends to the lab notebook, and reconciles the memory index to the files on disk. Use at the end of a session, or whenever asked to close out, reconcile, or do a chief-of-staff pass. Refuses to manufacture memories for a session that produced nothing durable, and refuses to become a hook.
---

# absorbing-a-session

The forward half of the chief-of-staff's function, run at a session's close.

Purpose: this project's growth is bottlenecked the way Edith Penrose describes
a firm's growth being bottlenecked — not by lack of resources (research,
proofs, code, agent output), but by lack of managerial capacity to absorb
those resources into stable, reusable state. Every session that ends without
this pass leaves its findings as unabsorbed inventory: duplicate memories,
stale "settled" claims nobody retired, contradictions nobody flagged. This
skill is that absorption step, run explicitly, not automatically.

Run it by reading real files and editing them directly. Do not delegate the
whole pass to a subagent — the session that was there holds the context; a
fresh agent would have to reconstruct it from the transcript, which is
expensive and lossy. Use a subagent only for a narrow, bounded sub-check
(e.g. "grep the repo for whether X still exists") if needed mid-pass.

## Hard constraint

No Stop/PreCompact/per-event hook. A prior enforcement harness on hooks over
6 events crashed the WSL box (spawned node + read full transcript + hit a
local HTTP server on every turn boundary). This skill is invoked on demand
instead — same effective cadence ("close out most sessions with it") without
the automatic-hook risk. Do not propose converting this into a hook.

## First, the gate

Before touching the inventory, name what this session did in one or two
sentences: what was learned, decided, or built. If nothing durable happened
(pure Q&A, no new conclusion), say so and stop — do not manufacture memories
to justify running the pass.

## The pass

Work through these in order. Each is a small, bounded check — don't turn this
into an open-ended audit.

### 1. New memory: episodic, not generic
If this session produced a correction, a settled conclusion, or a confirmed
approach, it should already be captured per the auto-memory rules (specific
instance, not a poster-on-the-wall rule). If it wasn't, write it now, in the
right home (`~/.claude/projects/-home-emsenn-info/memory/`), following the
existing frontmatter format. Link related memories with `[[name]]`.

### 2. Duplicate / near-duplicate detection
Read `MEMORY.md`. Scan for entries whose one-line hooks describe the same
underlying fact from different sessions. If two memories say the same thing:
- If one is a strict superset, delete the subsumed file and its MEMORY.md line.
- If they're complementary, consider merging into one file and updating the
  index to a single line.
Do this conservatively — only merge when you're confident, not on a guess.

### 3. Stale-claim check
Any memory whose content is a claim about current repo/code state (a file
existing, a function being named X, a status being "settled") is a frozen
snapshot. Spot-check a handful of the oldest or most-referenced ones against
the live tree (`Read`/`grep`, not memory). If a memory is now wrong, update it
in place or delete it — don't leave it to mislead a future session. Don't
spot-check everything every time; rotate through a few per pass.

### 4. Lab notebook append
The lab notebook at
`~/.claude/projects/-home-emsenn-info/workspace/lab-notebook.md` is an
append-only settled-conclusions/failed-attempts log, separate from memory
(memory is per-topic recall; the notebook is a chronological ledger so no
session re-derives or re-attempts something already tried). If this session
settled something or hit a dead end worth recording so it isn't re-attempted,
append one entry. Do not rewrite prior entries.

### 5. MEMORY.md index hygiene
`MEMORY.md` is an index, not content — one line per memory, under ~150 chars.
After any add/merge/delete above, make sure the index matches the files on
disk: no line pointing at a deleted file, no file missing a line. If the index
is approaching the 200-line truncation point, that itself is a signal — flag
it to the operator rather than silently letting old lines fall off.

### 6. Cross-track signal (only if this session touched more than one track)
If this session's work spanned more than one track, note in one sentence
whether it changes the standing picture in the relevant bridge memories.
Skip this step entirely on single-track sessions.

## What it refuses, and why that is the skill

- **A pass with nothing to absorb** — refused at the gate. Manufacturing
  memories to justify the pass is inventory pretending to be absorption.
- **Running mid-session speculatively** — refused. It is a closing move.
- **A full-repo audit out of step 3** — refused. Sample, don't sweep.
- **Meta-memories about this process itself** — refused unless the process
  changed; the skill's own record is where the process lives.
- **New hooks, crons, or automation proposed as part of a pass** — refused. If
  the pass reveals the process needs to change, say so to the operator and let
  them decide; don't quietly expand scope.

## When NOT to use

- Not for the standing backlog — one pass absorbs *this session's* output.
  Reconciling the whole inventory is **sweeping-the-standing-inventory**, a
  different capacity run on a different cadence.
- Not for domain work (proofs, code) — only the administrative layer over it.
