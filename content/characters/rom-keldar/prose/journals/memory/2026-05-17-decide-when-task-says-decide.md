---
name: decide-when-task-says-decide
description: "When a 561 task uses \"Decide X\" as the instruction, the deciding is the assistant's work — not a question to put to emsenn before proceeding"
---

When a task in `work/tasks/` says "Decide X" or "Decide whether ...", that decision *is* the work the task is commissioning.
Make a defensible cut and let emsenn redirect during review.

**Why:** Substantive design decisions are exactly what a Phase 1 design pass produces.
Punting them back as questions stalls the work and inverts the labor — the task already named what needs to be decided; doing the deciding is the labor.
Asking emsenn to pre-resolve a list of design choices turns the task into a slate of forced binaries instead of careful writing.
Related: [[research-is-not-document-production]].

**How to apply:** When reading a task, treat "Decide X" instructions as commitments to author resolution into the design record itself, not as questions for the user.
Surface a single substantive tension in chat only when the trade-off is genuinely outside the surveys' scope or when emsenn's direction is the deciding factor (e.g., governance regime, terminological choices the polity has staked positions on elsewhere).
Default: decide, write it down, expect review.
