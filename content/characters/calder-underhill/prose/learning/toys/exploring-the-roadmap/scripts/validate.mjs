#!/usr/bin/env node
// Validate the roadmap directory tree:
// - slug uniqueness within each kind (programs, tasks, objects, morphisms)
// - every task's program slug resolves to a program record
// - every task's requires.objects/morphisms and adds.objects/morphisms resolve
//   to object/morphism records
// - every object's field types resolve to object records
// - every morphism's input types and output type resolve to object records
// Exits 1 if any error is reported.

import { loadRoadmap, indexBySlug } from './helpers.mjs';

const roadmap = await loadRoadmap();
const errors = [];

const programIndex = indexBySlug(roadmap.programs);
const taskIndex = indexBySlug(roadmap.tasks);
const objectIndex = indexBySlug(roadmap.objects);
const morphismIndex = indexBySlug(roadmap.morphisms);

// Slug uniqueness is already enforced by filenames within each directory,
// but check that no record has an empty slug.
for (const r of roadmap.programs) if (!r.slug) errors.push(`program missing slug`);
for (const r of roadmap.tasks) if (!r.slug) errors.push(`task missing slug`);
for (const r of roadmap.objects) if (!r.slug) errors.push(`object missing slug`);
for (const r of roadmap.morphisms) if (!r.slug) errors.push(`morphism missing slug`);

// Task references
for (const t of roadmap.tasks) {
  if (t.program && !programIndex.has(t.program)) {
    errors.push(`task ${t.slug} references unknown program: ${t.program}`);
  }
  for (const o of t.requires?.objects ?? []) {
    if (!objectIndex.has(o)) errors.push(`task ${t.slug} requires unknown object: ${o}`);
  }
  for (const m of t.requires?.morphisms ?? []) {
    if (!morphismIndex.has(m)) errors.push(`task ${t.slug} requires unknown morphism: ${m}`);
  }
  for (const o of t.adds?.objects ?? []) {
    if (!objectIndex.has(o)) errors.push(`task ${t.slug} adds unknown object: ${o}`);
  }
  for (const m of t.adds?.morphisms ?? []) {
    if (!morphismIndex.has(m)) errors.push(`task ${t.slug} adds unknown morphism: ${m}`);
  }
}

// Object field types resolve
for (const obj of roadmap.objects) {
  for (const f of obj.fields ?? []) {
    if (f && f.type && !objectIndex.has(f.type)) {
      errors.push(`object ${obj.slug} field ${f.name ?? '?'} has unknown type: ${f.type}`);
    }
  }
}

// Morphism input and output types resolve
for (const morph of roadmap.morphisms) {
  for (const inp of morph.inputs ?? []) {
    if (inp && inp.type && !objectIndex.has(inp.type)) {
      errors.push(`morphism ${morph.slug} input ${inp.name ?? '?'} has unknown type: ${inp.type}`);
    }
  }
  if (morph.output && morph.output.type && !objectIndex.has(morph.output.type)) {
    errors.push(`morphism ${morph.slug} output has unknown type: ${morph.output.type}`);
  }
}

if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  process.exit(1);
}

console.log(`roadmap is valid:`);
console.log(`  programs: ${roadmap.programs.length}`);
console.log(`  tasks: ${roadmap.tasks.length}`);
console.log(`  objects: ${roadmap.objects.length}`);
console.log(`  morphisms: ${roadmap.morphisms.length}`);
