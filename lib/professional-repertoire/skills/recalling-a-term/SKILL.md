---
name: recalling-a-term
description: Recalls what a firm term means by reading the glossary — the nearest definition to the asking point, by filesystem distance, neighbours or upward only, never downward — and searches the whole tree for every occurrence of a term when the entire record is wanted. Use to look up a unit, concept, role, product, method, or business-model term from the durable record instead of re-deriving it or asking the operator, and use it the instant a term is named to look up, find, or collect. Invoke the script; do not re-derive the search order from the tree's current layout.
---

# recalling-a-term

The **read** half of the glossary. One script, two modes.

```sh
node lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/recalling-a-term/scripts/recall-a-term.js <term> [--from <path>]
node lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/recalling-a-term/scripts/recall-a-term.js <term> --search
```

- **resolve** (default) — what the term means *from here*: the nearest definition, printed in full.
- **`--search`** — the entire record on the term: every occurrence in the whole tree, as JSON.

Run the script. It **is** the definition of the search order. Do not re-derive that order from the repo's current layout, and do not narrow the search before running it.

## Skill contract (Hoare triple)

This skill is a **process** (closure-kind, per the firm's nuclear-quartet theory).
Its body owes the process runtime contract:

> MUST contain no conditional and produce identical output for identical input; if the world is not as assumed, fail loudly rather than branch.

- **Precondition (P):** A term is named, and an asking point (`--from`, else cwd) inside the repo.
- **Postcondition (Q):** In resolve mode, the definition that resolves from that asking point is printed in full with the outer definitions it shadows named; or absence is reported explicitly, naming any out-of-scope definitions without resolving to them. In search mode, a JSON dossier holds every occurrence of the term in the tree, verified complete against the corpus count, and the answer is derived by reading that dossier rather than by re-searching.
- **Result:** a success (a settled outcome) or a first-class error —
  `⊥` absence (found/produced nothing) or `⊤` contradiction (world conflicted
  with an assumption). Errors are data to route, not exceptions to throw.

## The rule: NEAREST

emsenn, verbatim (2026-07-15):

> the resolver is supposed to use the closest match, by filesystem distance
> (neighbors or upward only, never downward)

This is **lexical scope resolution** — the standard algorithm of any module system (Rust crates, OCaml functors, SML modules). It was specified for this corpus long before it was named again: Part 6 of the archived `theoretical-overview.md`, "The slug-resolution algorithm".

The rule's address is
`lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/documents/articles/notes/2026/07/15/2026-07-15-note-on-term-resolution-by-filesystem-distance.md`.
**If the note and the script disagree, the note wins and the script is the defect.**

The order the script implements:

1. **Asking point** `A` = `--from <path>`, else cwd.
2. **Walk the chain** `A`, `parent(A)`, …, repo root — **nearest first**. At each directory `D`, test in strict priority:
   1. `D/content/glossary/terms/<term>.json` (the record form; `.schema.json` is the retired dress, `.md` the prose node — both still answered, in that order)
   2. `D/content/glossary/concepts/<term>.json` (same form ladder)
   3. `D/content/glossary/topics/<term>.json` (same form ladder)

   The **first** hit, ranked `(distance asc, subdir-priority asc)`, is the answer, printed in full.
3. **Only if no filename matches on the chain:** fall back to `tags:` values, searching each chain scope's *own* glossary tree, nearest first.
4. **If neither yields anything:** report `⊥` absence.

## What NEAREST settles — read this before "fixing" a result

**Nearest settles it.** A term defined in five places is five scopes each answering for themselves; the nearest one wins at the asking point and the rest are outer definitions it **shadows**. That is the mechanism working, not a defect to repair.

- **Shadowing is not drift, and is not a thing to collapse.** **"One answer" is a property of the resolution from a given asking point — not a count of files in the tree.** Do not consolidate a nearer definition into an outer one just because both exist; that deletes the override, which was the reason someone wrote it. To change what a scope says, write to *that* scope — `writing-a-term --home <that scope> --update`.
- **Nothing below or beside the asking point resolves.** The script tests exact paths on an ancestor chain; it has no downward search. Enforced by construction, not by discipline.
- **Asking from the repo root sees only the root's glossary.** That is correct. To ask from inside a unit, pass `--from` — explicit qualification is what a scope rule requires of a caller reaching into a sub-scope.

## `--search`: the whole record, nothing sampled

emsenn, verbatim (2026-07-15):

> "when I tell you to look up a term in the ecosystem, I need an IMMEDIATE NO
> FILTER NO SAMPLE search. Which I said. Repeatedly."

> "I KNOW WHICH FUCKING TERMS ARE RELEVANT TO YOU"

That second line is the design. **The operator holds the map.** When they name a term, the term is already the output of their filtering. Re-deriving which concepts are adjacent, which folders matter, or which sources are "probably the real ones" discards that map and rebuilds a worse one at 100x the cost.

So `--search` does **not**: pick folders, sample top-N, rank by relevance, filter to "files that look like definitions", skip archives, or stop early. It walks the **disk** with `--no-ignore-vcs` — submodules, archives, and gitignored-but-real files all in scope, ~78,600 files — and drops **no occurrence**. The only exclusions are build artifacts, named in `method.excluded_globs` so the omission is never silent. One bound, and it is on recording, not on searching: a single physical **line** longer than 2,000 chars (machine data — JSONL, CBOR-as-text, lockfiles carry 25MB+ lines) is excerpted around the match with the omitted length stated inline, and the hit is flagged `line_excerpted` with its true `line_bytes`. Every hit, file, count, and scope is still in the dossier; without this cap one common-word dossier was 317MB of embedded machine lines that no reader could jq.

Run it **first**, before reading any file or forming a hypothesis about which folders matter. Then read the dossier, not the repo:

```sh
D=.claude/tmp/dossier/<term>.json
jq -r '.totals'                                                     $D
jq -r '.by_scope | to_entries[] | "\(.value.occurrences)\t\(.key)"' $D
jq -r '.occurrences[] | select(.definition_home) | .full_text'      $D   # the term's own nodes, in full
jq -r '.occurrences[] | .hits[] | "\(.section)\t\(.text)"'          $D   # every line, with its section
```

`full_text` for definition homes is already in the file. **Do not re-open files the dossier already carries.** Report the measured totals — "709 files, 2033 occurrences, 30 scopes, 659 archived" — never "I found several relevant sources". Zero hits is a measured finding, not a reason to go looking for a term nobody named.

One landmine, recorded because it cost real time and will recur: **ripgrep reads STDIN when stdin is not a TTY.** Called from a script without an explicit path argument, rg silently searches an empty pipe and reports **zero matches over the whole corpus** — a false "the term does not exist." This script passes an explicit `.` and ignores stdin. Any new tool that shells out to rg must do the same.

## Options

```
recall-a-term <term> [--from <path>]   nearest definition, printed in full
recall-a-term <term> --json            resolve result as JSON (used by writing-a-term)
recall-a-term <term> --search          every occurrence -> JSON dossier, summary to stdout
              --search --stdout        JSON to stdout instead of a file
              --search --exact         no plural/compound tolerance
              --search --regex         treat <term> as a raw regex
              --search -t lean         restrict to one extension    --all  every file type
              --search -C 5            context per hit (default 3)
```

By default `--search` tolerates plurals and compounds on **alphanumeric boundaries, not `\b`** — so `enterprise` finds `enterprises`, `micro-enterprise`, and `enterprise-architecture`. This widens the net for the **one named term**; it never substitutes a different term.

## When NOT to use

- To **write** or change a term — that is `writing-a-term`.
- For free-text content search across the corpus that is not about one named term — that is `bin/search`.
