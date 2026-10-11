---
name: writing-a-term
description: Writes a firm term to the glossary — a new term at its owning unit's home, or a safe update to an existing one that changes only what it was told to change and validates the result against the live markdown codec before it lands. Use when a unit, concept, role, product, method, or business-model term must be recorded, normalized, corrected, or amended as durable machine-findable memory. Run the script rather than hand-writing the file, the frontmatter, or the git add.
---

# writing-a-term

The **write** half of the glossary, and the deterministic inverse of `recalling-a-term`.

```sh
node lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/writing-a-term/scripts/write-a-term.js \
  --home <unit-dir> --slug <slug> --name "<Display Name>" --description "<one line>" <<'BODY'
<your standalone plain-English definition, one sentence per line>
BODY

node lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/writing-a-term/scripts/write-a-term.js \
  --slug <slug> --update [--from <path>] [--keep-body]
```

**Do not hand-write the file, the frontmatter, or the `git add`.** Those mechanical steps — correct home, filename, provenance-bearing frontmatter, staging, form validation, and the write→recall proof — are exactly what hand-doing put in the wrong spot with ad-hoc frontmatter, sometimes unstaged and therefore *unrecallable*. The script owns the mechanics. The judgment — what the sources say, and the prose — stays yours.

## Skill contract (Hoare triple)

This skill is a **derivation** (closure-kind, per the firm's nuclear-quartet theory).
Its body owes the derivation runtime contract:

> MUST produce a typed judgment from its inputs by fixed rules, or report that it could reach none.

- **Precondition (P):** A term is named and the home it is being written to is determinable — given as `--home`, or, on `--update`, resolved as the nearest definition from the asking point.
- **Postcondition (Q):** Exactly one glossary file at that home says what the term means, in plain technical English, standing alone; it is git-tracked; it conforms to the live markdown codec; and `recall-a-term <slug> --from <its home>` resolves to it. No other file in the tree is touched.
- **Result:** a success (a settled outcome) or a first-class error —
  `⊥` absence (found/produced nothing) or `⊤` contradiction (world conflicted
  with an assumption). Errors are data to route, not exceptions to throw.

## NEAREST settles what this writes, and what it leaves alone

A term defined in five places is **five scopes each answering for themselves**. The nearest one wins at the asking point; the rest are outer definitions it shadows. So:

- **Writing a nearer definition is normal and correct.** It is an override, and overrides are the point. Another scope already defining this slug is **not** a conflict and **not** a reason to refuse — the no-clobber gate keys on the **exact target path**, never on "does this term exist somewhere in the tree."
- **This script never collapses, canonicalizes, consolidates, or reconciles anything.** There is nothing to reconcile. To change what a scope says, write to *that* scope: `--home <that scope> --update`, or `--update` with no `--home` to change the nearest one.
- **Nothing outside the target home is ever touched.** `--update` names the outer definitions it is shadowing and leaves them alone.

## Why the script refuses things — every rule is a repair

Each of these exists because a session destroyed real markdown doing this by hand:

- **Never clobbers.** An existing term needs `--update`, stated out loud (`⊤`, exit 4).
- **Never reserializes.** Updates are **surgical line edits** to the frontmatter block. Untouched keys survive byte-for-byte. Nothing round-trips through a YAML dumper, because that is how comments, ordering, and block scalars get silently eaten. A key whose value spills across lines (block scalar, list, nested map) is **refused** rather than truncated (`⊤`, exit 4) — edit that key by hand.
- **One prose normalizer.** Every body is passed to Red Cup's `semantic-linefeed-normalization-service`; this skill owns no competing sentence-boundary implementation. The service preserves rich Markdown boundaries, including closing quotes and emphasis.
- **Never writes blind.** The result is validated against metroplat's **live markdown codec** before it lands. If the codec cannot be found, the script says so **loudly** — it does not silently skip the check.
- **Never half-writes.** Atomic: temp file, then rename.
- **Always proves.** It runs `recall-a-term` afterward, asked from the term's own home. A write that did not become recallable is a **failure** (exit 6), not a success with a caveat.
- **Always stages.** An unstaged node is invisible to every git-driven reader downstream, and "wrote it but you can't find it" is indistinguishable from not having written it.

## The prose rules (the part that is yours)

- Plain, clear, technical English. A reader with **zero** access to this repo understands the term from this file alone.
- **Standalone.** No links, no `[[wikilinks]]`, no "see X", no "as described in Y". If a referenced concept is load-bearing, explain it inline in a clause — never delegate understanding to a pointer.
- State what the term **is**, how it works, its parts, and its boundaries (what it is **not**). Substance, not a table of contents.
- **Semantic linefeeds: one sentence per line.** The codec enforces this and the script will refuse without it.
- Frontmatter carries the load-bearing claims — only typed keys grounded in the unit's schema, no invented classification tags.

## Before you write

Collect first, and do not sample: `recall-a-term <term> --search` puts every occurrence in the tree in front of you in about two seconds. Derive the definition from those sources only.

- `⊥` absence — the search found no primary source: **report the gap, do not fabricate.** This skill records what the firm already knows; it does not decide firm policy.
- `⊤` contradiction — sources genuinely conflict: record the conflict in the note as contested, naming both readings. Do not flatten it to one.

## Options

```
--home <dir>       owning unit. Target: <home>/content/glossary/<sub>/<slug>.md
--slug <slug>      lowercase kebab
--type             term|concept|topic  (default: term)
--name             display name        --description  one-liner
--field key=value  additional typed frontmatter keys (repeatable)
--source <path>    primary source, recorded in provenance
--recorded-by <id> session/agent id, recorded in provenance
--update           permit writing over an existing term. Without --home, updates the NEAREST.
--keep-body        --update only: change frontmatter, leave the prose alone
--force            write despite codec findings (prints them)
--dry-run          show the diff and the validation, write nothing
```

Provenance is stamped with the **local** date, not `toISOString()` — the latter is UTC and stamps a day ahead for anyone west of Greenwich for part of each day. On `--update`, `recorded-by`/`recorded-on` are kept as the original fact and `updated-by`/`updated-on` are added.

## When NOT to use

- To **read** a term, or to collect the whole record on one — that is `recalling-a-term`.
- Authoring a normative/testable specification (RFC-2119 MUST/SHOULD) — that is `improve-metroplat-specification`, not a plain-English glossary note.
- Episodic session logs, handoffs, or "what I did" notes — that is `writing-a-note-about-research`. This skill is for durable term definitions, not activity records.
