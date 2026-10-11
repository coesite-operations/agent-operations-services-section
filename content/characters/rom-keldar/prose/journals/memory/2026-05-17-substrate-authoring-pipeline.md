---
name: substrate-authoring-pipeline
description: "Substrate records arise through a proof-path pipeline: questions and research → claims → structures and transformers → specifications and schemas → scripts, skills, and agents. Mathematical correctness and earned directory placement are jointly required: every path segment states a generating morphism."
---

The 561 substrate has a deliberate pipeline by which mathematical content becomes operative substrate apparatus:

```
(question ↔ research) loop
       ↓
   claim — theorem with proof in narrative form
       ↓
   structures (objects) and transformers (morphisms)
       ↓
   specification + schema
       ↓
   script, skill, agent
```

By location:

- `prose/questions/$slug.md` — open questions and conjectures.
- `prose/research/` — research notes, surveys, working materials.
  The (question ↔ research) loop runs here; research investigates questions, surfaces new questions, and progresses toward claim-shaped statements.
- `prose/claims/$slug.md` — mathematical theorems with proofs in narrative form, per real-world mathematical best practices.
  One claim per file.
  A claim proves the existence and properties of one or more substrate objects or morphisms.
- `code/structures/$slug.md` — objects (sets, algebras, categories, presheaves, ...) whose existence and characteristic predications are proven by claims.
- `code/transformers/$slug.md` — morphisms (functions, functors, natural transformations, operators, ...) whose existence and characteristic preservation are proven by claims.
- `work/governance/rules/specifications/$slug.md` (or `$slug/$slug.md` + `schema.json` when directory-lifted) — RFC discipline on how a proven structure or transformer must be presented and constrained when it appears in the substrate.
- `doing/working/hacking/doing/working/skills/$slug/scripts/$script.{mjs,py,...}
  ` — mechanical scripts implementing operations.
- `doing/working/hacking/doing/working/skills/$slug/SKILL.md` — named procedures agents invoke; built on transformers; producing or consuming structures.
- `work/governance/staff/agents/$slug.md` — entities that invoke skills.

`prose/concepts/$slug.md` runs parallel to the pipeline as informal exposition — recurring semantic anchors that objects and morphisms realize; not a step in the proof pipeline but related material that helps a reader orient.

`theories/.../predication-categories/` is a self-contained math library for the theory predication-categories.
It carries its own concepts, claims, structures, transformers, and theorems under the same disciplines as the rest of the repo. **It is not a separate register with special authority.** Its content can be referenced when building elsewhere in the substrate; that referencing is just reading math that was previously written, the same as reading math from any other location.

**Why:** Math requires both correctness and an earned proof path. Whether the
theorem holds and whether its definitions cohere cannot be separated from the
generative morphisms asserted by its directory location. A privileged bucket
with an unearned name is false, but so is a correct theorem filed along a path
that lies about how it is generated. Align the filepath and the mathematics.
If you are uncertain something is true, prove it; if a proof exists somewhere, read it; if it doesn't and you can't prove it, surface the gap.

Right now the pipeline isn't 100% lawful or precise: some structures lack supporting claims; some claims lack the structure records they would encode; some specs reference structures or transformers that aren't yet authored.
The intention is the pipeline; current state is partial implementation.
Treat gaps as work, not as license to skip steps or to import authority from elsewhere.

**How to apply:**

- When authoring a structure or transformer, ask: what claim proves this exists and has these properties?
  If none exists, the claim may need authoring first (or the gap surfaced explicitly as known-incomplete).
- When authoring a claim, recognize what structures or transformers it proves; those get encoded as `code/` records.
- When authoring a spec, recognize that it pins how a proven object/morphism is presented; the spec's `derives-from:` cites the structure or transformer it grounds in.
- When authoring a skill, script, or agent, recognize that the operation it implements bottoms in proven math: structure(s), transformer(s), and spec(s).
- When referencing math from `theories/.../predication-categories/` or any other location, link the specific file by path.
  Don't invoke a privileged register.
- Never use those phrases to create an unearned prestige bucket. The canonical
  mathematical tree is proof-bearing because each directory is a proved
  generating morphism, not because a folder was granted status by fiat.
