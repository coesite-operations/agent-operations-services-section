---
type: skill
id: rendering-a-dag-of-the-offices-of-a-firm
name: rendering-a-dag-of-the-offices-of-a-firm
duty: hold-the-standing-picture
position: chief-of-staff
script: scripts/render-office-dag.mjs
uses: canonical-office-records
description: >
  Renders the 561 Group's office graph from canonical JSON office records and
  the relations those records carry. Resolves each slug to its closest
  neighbour, and upstream on conflict.
---

# Skill: render the office DAG

## What this file is

This is a **skill** — a procedure the Chief of Staff office runs to discharge its duty to hold the standing picture.
The 561 Group is a Lakota tiyóšpaye — an extended kinship band — founded by Morgan "emsenn" Sennhauser under Lakota law in 2018, organized outwardly as a conglomerate corporation.

## Run it

```sh
node <union-officer-academy-engine>/lib/professional-repertoire/skills/rendering-a-dag-of-the-offices-of-a-firm/scripts/render-office-dag.mjs
```

Options: `--format tree` (default, the command hierarchy), `--format edges` (every relation, flat), `--format dot` (Graphviz).
It exits non-zero when any relation points at nothing, so it works as a check and not only as a report.

## One canonical input

The script reads only canonical JSON office records whose `kind` is `office`.
It has no Markdown/frontmatter parser and no compatibility input. An unreadable
record is a finding and makes the check fail; it is never silently skipped or
reinterpreted through an umbrella runtime.

## How a slug resolves

A slug resolves to its **closest neighbour**, and **upstream** when there is a conflict.

Nearness is measured in the filesystem, from the file doing the referring: the candidate sharing the longest path prefix with the referrer wins, and ties break toward the shallower — that is, the more upstream — record.

Two things fall out of this, and both are the reason for the rule.

**A name can mean different things in different places, correctly.**
`executive-assistant` names two different offices: the 561 Group's, and emsenn's own at `services/board-of-directors/services/executive-office/content/offices/`.
When a 561 Group office says `executive-assistant`, the nearest one wins and it means the Group's.
When emsenn's tree says it, it means emsenn's.
Neither has to be renamed, and neither shadows the other.

**The 561 Group speaks English; the upstream concept library speaks pinyin.**
The Group names its offices in English.
`@emsenn/huidu-guanli` names the upstream concepts in pinyin.
So `rotating-chairman` finds `lunzhi-dongshichang`, and `spiritual-leader` finds `jingshen-lingxiu` — through the aliases those terms already declare, upstream, because nothing nearer claims the name.
The English name is the Group's; the pinyin record is the library's; the resolver is the bridge, and neither side has to hold the other's vocabulary.

## What it will tell you

Unresolved edges are printed under `UNRESOLVED`, with the file that carries them.
These are real defects and the reason the skill exists — a relation pointing at nothing is an office claiming a link the organization does not have.

An unreadable canonical office record is reported explicitly, and everything
pointing at it goes unresolved.
