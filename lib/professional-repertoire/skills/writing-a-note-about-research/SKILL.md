---
name: writing-a-note-about-research
description: Files a research note at this environment's one standard home — $root/content/documents/articles/notes/$YYYY/$MM/$DD/$YYYY-$MM-$DD-research-on-$term.md, where $root is the node package or git module the research is in service of. Use when writing down research, findings, an investigation, or durable notes/prose, INSTEAD of inventing an ad-hoc location like a top-level research/ dir.
---

# write-research-note

Files one research note at this environment's single standard home:
`$root/content/documents/articles/notes/$YYYY/$MM/$DD/$YYYY-$MM-$DD-research-on-$term.md`, where `$root`
is the node package or git module the research is performed **in service of**. The
script owns all the mechanics — resolving `$root`, building the dated path, writing
corpus-matching frontmatter, refusing to clobber — so the author only supplies the term
and the prose.

## Skill contract (Hoare triple)

This skill is a **process** (closure-kind, per the firm's nuclear-quartet theory).
Its body owes the process runtime contract:

> MUST contain no conditional and produce identical output for identical input; if the
> world is not as assumed, fail loudly rather than branch.

- **Precondition (P):** you have research prose to record and a term that names it; the
  node/module it serves is known or derivable from where the work happened.
- **Postcondition (Q):** exactly one note file exists at the standard dated path under
  the correct `$root`, carrying convention frontmatter (`title`, `date-created`,
  `kind: research-note`, `in-service-of`, `tags`, `status`, `declared-by`) and the prose
  body; nothing was written anywhere non-standard, and no existing note was clobbered.
- **Result:** the written path on stdout (success), or a first-class error — `⊥` a
  required input was absent (no term, empty body) or `⊤` the world conflicted (root is
  not a directory, note already exists). Errors are printed and exit non-zero; nothing
  half-written is left behind.

## When to use

Use when writing down research, findings, an investigation, or durable notes/prose —
instead of inventing an ad-hoc location like a top-level `research/` dir. There is one
home; this skill computes it.

## Procedure

Pipe the prose in on stdin; pass the term and (optionally) the node it serves.
No behavioural branch — on a missing term or empty body the script fails loudly and
writes nothing.

```
cat body.md | node .claude/skills/write-research-note/scripts/write-research-note.mjs \
  --term "sheaf-laplacians" \
  --for services/lenticule-science/services/obsmetrological-services-section \   # what the research serves; $root walks up from here
  --tags "sheaf,laplacian,obsmetrologia" \
  --description "one-line summary for retrieval"
```

- `--term` (or `--title`) is **required** — it names the note (`research-on-<term>`).
- `--root` is optional: if omitted, it is **derived** from `--for` (or the cwd) by walking
  up to the nearest node package (`package.json`) or git module. The monorepo wrapper root
  is deliberately skipped in favour of `lib/emsenn`, so research with no named target lands
  in the firm's content home, never a new top-level `content/`.
- `--tags`, `--description`, `--status` (default `design`), `--date` (default today),
  `--declared-by` (default `researcher`), `--force` (overwrite) are optional.

The script prints the path it wrote. Read it back if you need to confirm.

## When NOT to use

- To recall or look up an existing note — that's a search (`.claude/bin/find-note` /
  `.claude/bin/search`), not a write.
- To author a canonical glossary term or to raise a task — those have their own homes
  and skills (`writing-a-term`; `making-a-task`, whose record is a goal of machine-run
  commands raised against a seated duty). This is for dated research prose only.
- To drop a scratch/working file — use the session scratchpad, not the notes tree.
