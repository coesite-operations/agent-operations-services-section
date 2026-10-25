---
name: installing-claude-as-an-office
description: Installs one office into one node of the tree — the office's CLAUDE.md becomes the node's CLAUDE.md, and the skills realizing the office's duties become the node's .claude/skills/, scripts and all. Use when a node's sessions must step into an office holding exactly the skills the office records, when an office's duties or skills have changed and a node has not caught up, or when deciding where a skill belongs — the answer is the office, never .claude/.
---

# installing-claude-as-an-office

Installs one **office** into one **node** of the tree, so a Claude session opened at that node steps into that office holding exactly the skills the office records.

## Skill contract (Hoare triple)

This skill is a **process** (closure-kind, per the firm's nuclear-quartet theory).
Its body owes the process runtime contract:

> MUST contain no conditional and produce identical output for identical input; if the world is not as assumed, fail loudly rather than branch.

- **Precondition (P):** The named office resolves from where you stand and its record declares `type: office`; the node exists; every duty the office records resolves to a duty in a pool; every skill those duties name resolves to a skill directory; every skill names itself the same as its directory; no other office installed at that node holds one of those names from a different source.
- **Postcondition (Q):** `<node>/CLAUDE.md` is byte-identical to the office's carried CLAUDE.md or, for a canonical JSON office, to the deterministic office/duty/skill projection rendered from its record; for every skill the office holds, `<node>/.claude/skills/<name>/` is byte-identical to the skill's directory — SKILL.md, scripts, and all — and the node's manifest records the office as its installer.
- **Result:** a success (a settled outcome) or a first-class error —
  `⊥` absence (the office has no skills; a duty or skill resolves to nothing) or
  `⊤` contradiction (a name resolves to two skills, or a skill's name and
  directory disagree). Errors are data to route, not exceptions to throw.

## The three things it moves

**The office → the node.** A node is any directory a session gets opened at: the repo root, a service, a character. Installing an office there is what makes that directory answer as that office.

**CLAUDE.md.** The office's CLAUDE.md is the durable role the node's sessions step into. An older office seated in its own directory says it in the `CLAUDE.md` it carries there. A canonical JSON office is rendered deterministically in the same office/position/deontic/duty form used by the agent projector, with its resolved skill names and start-trigger rule. Both are the office speaking. `<node>/CLAUDE.md` is output — edit the office, duties, or skills and reinstall; direct edits are discarded.

**The skills, whole.** The whole skill directory copies — `SKILL.md`, `scripts/`, everything. A skill whose scripts stayed behind in the office is a skill the incumbent cannot run, which is an incumbent that cannot discharge what its office records: the exact drift this exists against.

## How an office's skills are found

Three records, each naming the next. None of them is `.claude/`, and the harness is not a place where the chain gets a fourth link:

1. **The office record** — `offices/<id>.md`, or `offices/<id>/<id>.md` — names its duties in `duties:`.
2. **The duty record** — `duties/<id>.schema.json`, a canonical `emsenn/term/duty` record in a pool beside the offices — names the skills that discharge it in `skills` (an older frontmatter record names them in `realized-by-skills:`).
3. **The skill** — `skills/<name>/SKILL.md` — is what copies.

Duties seat in a **pool** rather than under any one office because a duty can be borne by several offices at once. `managing-a-glossary` is borne by three, so its skills install for all three. The office record's `duties:` list is the whole assignment mechanism — a duty record names no bearer, so the offices are the only place the assignment exists; the duty record's skills list is the whole realization mechanism.

An office seated in its own directory also holds any skill seated under it — a directory with a `SKILL.md` in it. There is no opt-in list and no `install:` frontmatter key: an office holds a skill by *having* it, or by bearing a duty that names it.

## Run it

```sh
node services/board-of-directors/services/executive-office/lib/management/skills/installing-claude-as-an-office/scripts/install-claude-as-an-officer.js \
  <office> <node>
```

For example, seating the Content Librarian at the ecosystem root:

```sh
node .../install-claude-as-an-officer.js content-librarian lib/emsenn
```

Or through the Makefile, which is the ordinary way:

```sh
make claude install content-librarian lib/emsenn
make claude list content-librarian lib/emsenn      # name what it would install, install nothing
make claude clean content-librarian lib/emsenn     # remove only what this office installed
make claude reinstall content-librarian lib/emsenn
```

The office may be named by id or by path. The node is a path, defaulting to the repo root.

Options: `--list`, `--clean`, `--reinstall`, `--dry-run`, `--from <path>` (where you stand, default the working directory), `--root <repo-root>`.

## How an office id resolves

**The nearest office of that id wins, measured from where you stand.**

A roster is any `offices/` directory in the tree, found by walking it, not by a list written down anywhere. `executive-assistant` seats in more than one, so it names a different office depending on where you are:

| Standing in | `executive-assistant` resolves to |
| --- | --- |
| the repo root | `lib/agency/offices/executive-assistant` |
| `` | the same — the 561 Group's |
| `services/board-of-directors/services/executive-office/lib/characters/emsenn/` | `services/board-of-directors/services/executive-office/lib/characters/emsenn/lib/management/offices/executive-assistant` |

This is the glossary's rule — one answer per question, resolved from where you stand — applied to office ids. A nearer office shadowing a farther one **is the rule working**, not a conflict, and the script does not treat it as one. "One answer" is a property of the resolution, never a count of seats.

Only a true tie is refused: two seats exactly equidistant, where distance decides nothing. Then name it by path, or stand somewhere that decides. Duties resolve the same way, measured from the office; skills resolve the same way, measured from the duty that names them.

## Procedure

1. Resolve the office. Refuse anything without a record declaring `type: office` — a directory of files is not an office.
2. Resolve the node. It must already exist; the install does not invent a place to put an officer.
3. Read the office's `duties:`, each duty's skills list, and each skill's directory.
4. Check the precondition and **exit non-zero on any miss** — no skills, a duty or skill that resolves to nothing, one name resolving to two skills, a skill's `name:` disagreeing with its directory, or a name another office installed here from a different source. No branching on surprise.
5. Copy the office's carried CLAUDE.md, or render its canonical record plus duties and skills, to `<node>/CLAUDE.md`; copy each skill directory to `<node>/.claude/skills/<name>/`; and record `<office-id>:<skill-name>` in `<node>/.claude/.claude-install-manifest`.
6. Read every written file back and compare it byte-for-byte against the office's copy. This is the postcondition, checked rather than assumed.

`--clean` inverts it against the manifest, removing only the entries this office installed and leaving other offices' skills seated.

## What it refuses, and why that is the skill

Copying a file is the easy half. The parts that decide whether `.claude/` is *output* or *a second source* are the ones the script will not proceed without:

- **A directory that isn't an office** — refused. Installing from an arbitrary path is how skills come to exist with no office answering for them.
- **A duty an office records that seats in no pool** — refused. An office recording a duty the Group does not have is drift between record and behavior.
- **A skill a duty names that seats nowhere** — refused. A duty nothing realizes is a claim, not an obligation anyone can discharge.
- **A skill whose `name:` and directory disagree** — refused. Claude resolves the skill by name; a mismatch installs a skill nobody can invoke by the name they read.
- **One name resolving to two skills** — refused, both named. The glossary's rule is one answer per question; a harness that silently picks a winner breaks it.
- **A name another office installed here from a different source** — refused, the owning office named. Two offices holding one skill name is an unresolved question about who answers for it, not a merge conflict. Two offices holding the *same* skill — one shared duty, two bearers — is the pool working, and installs.

The question is asked of the **offices**, never of the seated file: `.claude/` is output, and output is never evidence about what a skill is. Hand-editing the artifact cannot provoke a refusal — reinstalling over a tampered artifact is the correction.

## When NOT to use

- Not for authoring a skill — that is **make-a-skill**. This installs what already exists.
- Not for commissioning an office — that is **commissioning-an-office**. This seats an incumbent *in* one that exists.
- Not for installing agents — that is **installing-claude-as-an-agent**, which projects an office into `.claude/agents/<id>.md` as a colleague a session delegates to, rather than an identity a session steps into.
- Not for reaching into `.claude/` to fix a skill. `.claude/` is output: edit the office's copy and reinstall, or the next install discards the edit and the reasoning never entered the record.
