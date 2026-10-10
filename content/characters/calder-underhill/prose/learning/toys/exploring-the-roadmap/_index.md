---
name: Roadmap exploration toy
description: A per-record markdown-vault representation of the 561 OS roadmap. Programs, tasks, objects, and morphisms each have their own subdirectory, one file per record, with YAML frontmatter carrying the structured payload. ESM Node scripts walk the four directories, build the in-memory aggregate, validate cross-references, find gaps in both the task-dependency graph and the object/morphism type graph, and derive milestones by topological sort. The point is to compute the dependency DAG mechanically so that the roadmap grows by accretion as prior-art content is mined into per-record files.
contains:
  - programs/
  - tasks/
  - objects/
  - morphisms/
  - scripts/
---

The 561 group's OS roadmap is scattered across goal records, milestone files, charter documents, design documents, and diary entries.
The captain's instruction (the 2026-05-18 sessions): collect the roadmap content into one resource, but not as a static document — as a graph whose tasks have explicit dependency edges via the objects they require and add, where objects and morphisms are themselves records of their own carrying their own type signatures.
Milestones are NOT authored; they are derived from the task DAG by the topo-sort script.
The key insight: everything in the prior art lives in one mathematical category, so every conceptual thing is either an object (a type) or a morphism (a function with a signature) in that category, and the dependency graph and the type graph are both mechanically checkable.

## Layout

The four kinds of record each live in their own subdirectory, one file per record.

`programs/$slug.md` — one record per program.
A program is a coherent body of capability the OS is engineering toward.
Programs include `kernel`, `sdk`, `paracosmic-emulator`, `bundled-userland`, `confederate-productivity-stack`, `persona-publishing`, `dao-participation`, `industrial-control`, `confederate-erp`, `ecological-monitoring`, `healthcare-coordination`, `mutual-aid-and-disaster-response`, `educational-infrastructure`, `creative-tools`.
The captain may rename, split, merge, or add programs.

`tasks/$slug.md` — one record per task.
Frontmatter declares `program:` (one slug), `requires:` (with `objects:` and `morphisms:` lists of slugs the task needs to exist before it can run), `adds:` (with `objects:` and `morphisms:` lists of slugs the task introduces), and `capability-delta:` (a one-sentence statement of the new capability after the task).

`objects/$slug.md` — one record per object.
An object is a type the OS handles.
Frontmatter declares `description:`, `program:`, `added-by-task:`, and `fields:` — a list of named-typed fields.
Each field has a `name` and a `type` that is the slug of another object.
An object is the data; the fields say what the data structurally is.
The OS's value algebra is non-boolean (four-valued bilattice), and values that other systems would store as fields here live on separate objects produced by morphisms — for example, a cell-record carries the three pointer fields (subject, predicate, object), while the cell's bilattice value at any history lives on a different object (cell-value-at-history) produced by an evaluating morphism.
There is no privileged "bare" object; each object is just what its fields are.

`morphisms/$slug.md` — one record per morphism.
A morphism is a function from one or more input objects to an output object.
Frontmatter declares `description:`, `program:`, `added-by-task:`, `inputs:` (a list of named arguments, each with a `name` and a `type` slug), and `output:` (carrying a `type` slug).
The morphism's existence is what produces its output object as a runtime entity — if a morphism declares output type X, then X is reachable in the type graph; otherwise X is a gap.

## Derived structures

Milestones are not stored.
They are derived by `scripts/topo-sort.mjs`, which builds the task DAG from `requires`/`adds` and emits topological layers.
Each layer is a derived milestone — a set of tasks whose combined adds lands a new addressable capability after all earlier layers have completed.

## Scripts

`scripts/helpers.mjs` — walks the four directories, parses each .md file's YAML frontmatter, and returns the aggregate `{programs, tasks, objects, morphisms}` shape the other scripts consume.
Also computes the task dependency map.

`scripts/validate.mjs` — checks every task's `program` resolves to a program record; every task's `requires`/`adds` slugs resolve to object/morphism records; every object's field types resolve to object records; every morphism's input and output types resolve to object records.
Exits 1 if any error is reported.

`scripts/find-gaps.mjs` — reports five kinds of gap.
(1) Objects required by some task but added by no task.
(2) Morphisms required by some task but added by no task.
(3) Object fields whose types reference an object slug that has no record — missing object records.
(4) Morphism inputs or outputs whose types reference an object slug that has no record — missing object records.
(5) Objects with empty `fields:` lists — authoring gaps (the next pass to fill).
Also reports orphan adds (objects/morphisms added but never required) as informational, since some are intentional terminal capabilities.

`scripts/topo-sort.mjs` — produces a topological ordering of tasks using Kahn's algorithm.
Within each topological layer, tasks may run in parallel.
Emits each layer as a derived milestone, listing the tasks in the layer with their program affiliation and the combined object and morphism counts the layer adds.

`scripts/migrate.mjs` — one-time migration that converted the legacy single-file `roadmap.yaml` into the per-record .md files.
Kept in the directory for reference; not re-runnable now that `roadmap.yaml` is gone.

## Running

```
node scripts/validate.mjs
node scripts/find-gaps.mjs
node scripts/topo-sort.mjs
```

All three walk the directory tree.
No arguments.

## Status

Initial migration complete.
Fourteen programs, 101 tasks, 276 objects, 114 morphisms — the breadth carried over from the legacy YAML's 25 phases and 116 milestones (the milestone records are dropped; topo-sort derives them).
All cross-references resolve.
The two visible work surfaces from `find-gaps.mjs`:

1. **Authoring gaps on object fields.** All 276 objects currently have empty `fields:` lists.
  The legacy YAML carried object descriptions but no field-by-field type signatures.
  Filling in the fields is the next-pass work — and the discipline is that each field's type-slug must resolve to another object, surfacing type-graph gaps that name further missing object records.

2. **Empty bodies on every record.** Each .md file currently carries only its frontmatter.
  Bodies are empty.
  Substantive prose explaining each record (design notes, alternatives considered, references back to the prior-art records that authored the content) is the second next-pass work.

The expected workflow going forward: pick a program, read its program record, walk its tasks via topo-sort to see the dependency layers, expand each task's adds-objects with proper `fields:` declarations grounded in the corpus's prior art (predication-categories, predicated-computing, the design documents like predication-world-sim.md), then re-run find-gaps to see what new object slugs need records.
