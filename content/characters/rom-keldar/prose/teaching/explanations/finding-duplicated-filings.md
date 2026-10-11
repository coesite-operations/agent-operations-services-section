---
name: finding duplicated filings
description: Before filing a task, question, or finding, grep the repo for prior filings of the same. The 561 repo has many repeatedly-filed unresolved items across sessions; surfacing the duplication is higher-leverage than adding another instance. This skill captures the procedure.
---

# finding-duplicated-filings

## Why this skill exists

The 561 repo has accumulated many sessions of work, each of which has filed tasks, questions, and findings.
A common failure mode: a session encounters an issue, files a task about it, without seeing that the same issue has been filed several times already in different forms.
Each new filing burns work because prior filings aren't consolidated.

The rom-keldar's high-leverage contribution is to FIND such duplications and surface them.
Filing yet another instance without consolidation is the failure mode this skill prevents.

## Procedure

Before filing a task, question, or finding:

1. Identify the keywords specific to the issue.
  Be generous (variant terms, related concepts).
2. Grep the repo for those keywords with `--include="*.md"`.
  Search `work/`, `memory/`, `theories/.../../learning/questions/`, `tools/.../docs/dev/decisions/`, and `prose/`.
3. If any prior filings turn up, read them.
  Note their direction (some may have contradictory framings).
4. If prior filings exist, the work is NOT to file another.
  The work is to: (a) cite the prior filings, (b) note any contradictions among them, (c) write a consolidation that supersedes them under emsenn's current direction.
5. If no prior filings turn up after a thorough search, then filing a new task is appropriate.

## Recipe

```sh
grep -rli "<keyword>" --include="*.md" . | grep -v ".git" | head -30
```

Run with multiple keyword variants.
Check work/, memory/, questions/, decisions/, surveys/, prose/, and any specifications/.

## Worked example

On 2026-05-14, the FA encountered an objects-vs-terms convention question and was about to file an "audit" task. emsenn corrected: this task is filed REPEATEDLY in the repo.
A grep search turned up 7 prior filings:

- `theories/.../predicated-markdown-vault-knowledge-system/specifications/term-to-typed-migration.md` (with reverse direction from emsenn's current).
- `tools/platform/pypredcomp/docs/dev/decisions/adopt-predcat-vocabulary.md`.
- `tools/platform/pypredcomp/docs/dev/implementation/predicate-shape-refactor-plan.md`.
- `tools/platform/pypredcomp/docs/dev/surveys/theory-side-research-notes-2026-05-03.md` (plus round 2).
- Memory notes from 2026-05-12 (seven of them).
- `prose/teaching/explanations/unfolding-the-theory-behind-the-561-group.md`.
- `tools/platform/pyfars/work/governance/skills/authoring-foundational-self-theory-concept.md`.

The duplication itself was the finding.
See `memory/2026-05-14-convention-duplication-finding.md`.

## When to invoke

- Before filing any new task under `doing/working/hacking/doing/working/planning/library/task/library/`.
- Before filing a question under `work/questions/` (if such a directory is in use).
- Before surfacing a friction or contradiction to emsenn.
- Before drafting a synthesis or consolidation; the prior filings are inputs to the consolidation.

## What this skill is not

This is not a substitute for the FA's own substrate work.
It's a precondition check.
After grep returns nothing or after consolidation work is captured, the FA proceeds with the substrate task.
