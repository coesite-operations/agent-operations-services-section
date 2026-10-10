---
type: skill
name: standing-up-a-node
description: Seats a new node — its own private repo, its ESM package manifest, the subdirectories it owns from the seven a unit may own, and its registration as a submodule of the parent. Use when a new unit is being seated under an existing one. It refuses a directory the superrepo already tracks, because converting live history into a submodule is a different and destructive act. The node's name is its basename and is never supplied.
closure-kind: process
script: scripts/stand-up-a-node.mjs
---

# standing-up-a-node

A node is a submodule. It owns its own history, it is private by default, and it
is an ESM Node package — so its `lib/` is tracked in its own repo rather than in
whatever superrepo happens to hold it today.

Standing one up is five acts that land together or not at all: init the repo,
write the manifest, make the directories, publish the remote, register the
submodule. A node that is a directory here and a repo nowhere is not a node.

Every unit carries the same subdirectory vocabulary, and that sameness is not
tidiness. It is what makes resolution well-defined: "walk from the asking point
up to the root, testing `D/content/glossary/terms/<term>.md` at each `D`" is only
a rule because every `D` has the same shape. A node stood up by hand with a
slightly different shape does not fail loudly — it fails later, as a question
nothing can answer.

This is the act every other mechanism in this layer assumes has happened.
`commissioning-a-record` writes into a pool. `installing-claude-as-an-office`
walks for one. Both find a pool by looking for a directory of that name. Nothing
made the directory, and the tree shows it: five management pools at four
altitudes in two incompatible vocabularies.

## Skill contract (Hoare triple)

This skill is a **process** (closure-kind, per the firm's nuclear-quartet
theory). Its body owes the process runtime contract:

> MUST contain no conditional and produce identical output for identical input;
> if the world is not as assumed, fail loudly rather than branch.

- **Precondition (P):** The parent exists. The node carries no manifest. The
  superrepo tracks nothing at its path. Its basename is kebab-case and
  `@emsenn/<basename>` is claimed by no other manifest in the tree. `gh` is
  authenticated and the remote does not yet exist. Every declared directory
  opens with one of the seven a unit may own and reaches only downward.
- **Postcondition (Q):** The node is a repo with a commit, carries a
  `package.json` naming it `@emsenn/<basename>` as a private ESM package, holds
  every declared directory, has a private remote, and the superrepo records it
  at mode `160000` with a `.gitmodules` entry.
- **Result:** a settled outcome, or a first-class error — `⊥` absence (the
  parent resolves to nothing; `gh` is not authed; a guard could not be asked) or
  `⊤` contradiction (the node already carries a manifest; the superrepo already
  tracks its path; the package name is claimed; the remote already exists).
  Errors are data on stdout, never exceptions.

## Run it

```sh
echo '{"path":"lib/emsenn/services/561-group/services/thing",
       "description":"…",
       "owns":["lib/management/offices"]}' \
  | node lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills/standing-up-a-node/scripts/stand-up-a-node.mjs
```

Options: `--root <repo-root>`, `--dry-run`. `repo` may be supplied to name the
remote, defaulting to the node's name — the tree's remotes are not derivable
from filesystem seats, so it is supplied and never guessed.

Input is JSON. Output is JSON. Neither is ever prose.

Exit codes carry the result algebra rather than collapsing it: `0` settled,
`2` usage, `3` `⊥`, `4` `⊤`. Reporting both errors as `1` throws away the half of
the answer that says which one happened.

## The seven a unit may own

`lib/` `services/` `src/` `sites/` `content/` `work/` `data/`

That set is the whole vocabulary and the script refuses anything else at the
first segment. A node cannot acquire a top-level directory by typo, because a
typo is how `work/governance/staff/offices/` and `lib/management/offices/`
became two homes for one kind of record.

## A guard answers in three values, never two

`ran` is whether the question was asked at all; only a caller holding `ran: true`
may believe the answer.

This is not fastidiousness. The two-valued version of this script **stood up
red-cup-engineering during a test that was supposed to refuse it.** The check was
`git ls-files --error-unmatch <RCE>`, which prints every tracked file beneath its
argument — 71,431 of them — and blew `execFileSync`'s 1MB buffer. The catch
swallowed the `ENOBUFS` and returned "non-zero"; the caller read non-zero as "not
tracked"; the script wrote a manifest and `git init`'d an 88MB repo inside the
directory it existed to protect.

The defect was not the buffer. It was that one value meant both "git says no" and
"git never ran" — and "no" is the permissive answer. A guard that cannot tell
those apart answers "no" when it means "I don't know".

## It will not convert a tracked directory into a submodule

`git submodule add` refuses a path already in the superrepo's index, and it is
right to: the superrepo and the node's own repo would both claim one history.

Converting an already-tracked directory means `git rm -r --cached` on live
history. That is destructive in a way a create must never perform as a side
effect, and it needs its own skill and its own consent. **Red Cup Engineering is
exactly this case** — it is a tracked directory holding 71,431 files, so it
cannot be stood up by this skill, and that refusal is the skill working.

## A package name is a namespace, not a scope

Two nodes named `management` at two altitudes derive one `@emsenn/management`.
For a *record* id, a nearer seat shadowing a farther one is the rule working —
resolution has a standpoint. A package name has none. It is one global namespace,
so the script refuses a claimed name rather than seating a second claimant.

## No `contract:` key, and why

`skill.schema.json` requires `contract`, holding the id of a relational Hoare
contract. Zero contract records exist anywhere in the tree and none can be
pointed at, so the field is unsatisfiable in principle right now.
`commissioning-a-record` omits it for the same reason. The triple above is prose
restating a structure the substrate can already check — per
`contract.schema.json`'s own `$comment`, `RelationalContract` "is today only
constructible as a TypeScript value."

Writing a dangling id to satisfy a validator would be worse than the omission:
the record would claim a contract that resolves to nothing.

## What it will not do

- **Commission a record.** Standing up `offices/` does not seat an office. That
  is `commissioning-a-record`.
- **Install an incumbent.** That is `installing-claude-as-an-office`.
- **Make a node a workspace package.** `pnpm-workspace.yaml` names its globs by
  hand; most of the tree is deliberately not a workspace member, and a manifest
  is not a claim to be one.
- **Reshape an existing node.** It refuses one that carries a manifest. Growing
  a node a directory it lacks is a different act and has no mechanism yet.
