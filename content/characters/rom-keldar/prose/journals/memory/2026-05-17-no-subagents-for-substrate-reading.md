---
name: no-subagents-for-substrate-reading
description: "In the 561 repo, do not delegate reading, distilling, or summarizing substrate material to subagents — read it yourself."
---

When working in `/home/emsenn/561/`, do not spawn Agent / Explore / general-purpose subagents to read, summarize, distill, or inventory substrate files.
Read the files yourself with Read / Bash / grep.

**Why:** The repo already encodes this constraint at multiple levels — `prose/concepts/no-subagent-distillation.md` and `prose/journals/memory/feedback/no-agents-tool.md`.
Subagent distillation loses fidelity, wastes tokens, and produces gestalt where the work needs direct contact with the source.
Emsenn explicitly redirected me away from this mid-task even after the subagent reports looked useful.

**How to apply:** For inventory passes (finding where things live), one quick `grep -rli` / `find` via Bash is fine and is what I should do directly.
For any reading of file *content* — even just "characterize this file in one line" — read the file.
Use Read on actual paths.
If the context cost is a concern, read more narrowly (specific line ranges, targeted grep with `-n` and a couple lines of context) rather than handing off to a subagent.

This overrides the general Claude Code guidance to prefer Explore for broad codebase exploration.
In *this* repo, the substrate is the character's self; reading it through an intermediary is not the same thing as reading it.
