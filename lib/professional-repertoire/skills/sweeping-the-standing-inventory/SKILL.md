---
name: sweeping-the-standing-inventory
description: Reconciles the whole standing memory inventory against its own rules — index/file consistency fixed mechanically, oversized append-shaped files moved to the research home with one-fact pointer memories left in place, true duplicates merged only on strict subsumption after reading the bodies, and changes plus deliberate non-changes both reported. Use every several sessions or when the operator says the inventory feels noisy — not as part of every close-out.
---

# sweeping-the-standing-inventory

The backlog half of the chief-of-staff's function, run occasionally.

The forward pass (**absorbing-a-session**) is forward-only: it absorbs one
session's output. Run often enough and the additions accumulate faster than
the retirements — the standing memory inventory grows noisy (many domain
memories, oversized files, orphaned index lines) even though every individual
pass was correct. Penrose's point exactly: the forward absorption step is not
the same capacity as reconciling the backlog it leaves behind.

So, roughly once every several sessions, or whenever the operator says the
inventory feels noisy, run this sweep IN ADDITION to the close-out pass. It
looks at the whole standing `memory/` directory, not just one session.

## Hard constraint

Same as the forward pass: no Stop/PreCompact/per-event hook, no cron. A prior
enforcement harness on hooks over 6 events crashed the WSL box. This is an
occasional on-demand move, invoked when the backlog warrants it.

## The sweep

1. **Index/file consistency.** `ls memory/*.md`, then for each file check it
   has a `MEMORY.md` line, and for each index line check the file exists. Fix
   orphans and dangling lines. (This is mechanical — a shell loop, not
   judgment.)
2. **Oversized-file check.** `wc -c memory/*.md | sort -rn`. Any memory much
   larger than its siblings (roughly >6KB) is probably an append-shaped
   research journal wearing memory's frontmatter, not one fact. If so, MOVE
   the body to `research/` and leave a one-fact `type: reference` pointer
   memory in its place (keep the same filename + index line so lookups still
   resolve). Memory is one-fact recall; research/ is the durable journal home.
3. **True-duplicate check — READ before merging.** Scan `MEMORY.md` for
   clusters whose hooks sound alike. Open the bodies. Merge ONLY if one is a
   strict superset of another, or they state literally the same fact. Distinct
   rules that merely share a prefix or cross-reference each other are NOT
   duplicates — flattening them destroys real constraints. When unsure, leave
   both. (Verified 2026-07-13: the five `sad-*` memories look like a dup
   cluster from their hooks but are five genuinely different rules — do not
   merge them.)
4. **Report, don't over-cut.** State what you changed and what you
   deliberately left (borderline-large files, near-dup clusters you kept). The
   sweep succeeds by making the inventory match its own rules, not by
   shrinking it maximally.

## What it refuses, and why that is the skill

- **Merging on the strength of hooks alone** — refused. Hooks that sound alike
  are evidence of nothing; the bodies are read first, every time.
- **Shrinking as the success measure** — refused. An inventory can be small
  and wrong; the target is the inventory matching its own rules.
- **Becoming a hook or a cron** — refused, same crash constraint as the
  forward pass.

## When NOT to use

- Not at every close-out — that is **absorbing-a-session**. Running the sweep
  every session spends the bounded-pass budget on a whole-inventory audit.
- Not for domain work — only the administrative layer over it.
