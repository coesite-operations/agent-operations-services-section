---
name: recalling-a-requirement
description: Reads a requirement and derives whether it is met by re-running its own conditions, never by reading a status; and with --audit, settles the cells the requirements duties discharge against, reporting a cell it cannot settle as unknown rather than guessing it. Use to answer whether a requirement is met, to see what was asked before the work rewrote the memory of it, and to read how far the requirements duties are from discharged.
---

# recalling-a-requirement

The **read** half of the requirements line, and the deterministic inverse of `writing-a-requirement`.

```sh
node lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/recalling-a-requirement/scripts/recall-a-requirement.js --slug <slug>
node lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/recalling-a-requirement/scripts/recall-a-requirement.js --audit
node lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/recalling-a-requirement/scripts/recall-a-requirement.js          # list
```

Exits non-zero when a requirement is not met, so it can itself be a `--met-when` condition of another requirement.

## Whether it is met is a readout

Nothing writes `met: true`. `--slug` re-runs every condition **at read time** and reports what settled. The file asserts nothing about its own success, because a record that could would be indistinguishable from a record of actual success — and the whole apparatus exists because those two came apart.

## --audit is honest about its own reach

`--audit` settles the cells the four requirements duties discharge against. Four of the seven it can settle. Three it cannot, and it reports them `unknown` with what is missing rather than `held`:

- **nothing records when a requirement was distributed**, so "edited after distribution" has no referent;
- **no attestation record exists**, so nothing can say a body other than the realizer verified a requirement — this needs product quality assurance's attestation act, which is not built;
- **no closure record exists**, so nothing records the raiser agreeing they got what they asked for.

Those three keep `closing-the-loop-on-a-requirement` and `realizing-a-requirement` undischarged, which is the true state. A cell reported held because checking it was inconvenient is the exact substitution this apparatus exists against.

An empty pool exits non-zero. Every cell is vacuously held over zero requirements, and a sweep that found nothing is a finding, not a pass.

## Who holds this

Every office in the requirements line, and the implementation team holds this one without holding `writing-a-requirement` — it may read what it was asked and may not change it.
