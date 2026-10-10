#!/usr/bin/env node
// Compute a topological ordering of tasks in the roadmap directory tree using
// Kahn's algorithm. Each task depends on every task whose adds contains an
// object or morphism this task requires.
//
// Emits topological layers — tasks in layer N have no dependencies remaining
// after layer N-1 completes. Tasks within a layer may run in parallel. Each
// layer is the natural derived-milestone unit — the set of tasks whose
// combined adds lands a new addressable capability after all earlier layers
// have completed.

import { loadRoadmap, buildTaskDeps } from './helpers.mjs';

const roadmap = await loadRoadmap();
const { deps } = buildTaskDeps(roadmap);

const remaining = new Map();
for (const [slug, set] of deps) remaining.set(slug, new Set(set));

const layers = [];
const order = [];

while (remaining.size > 0) {
  const ready = [];
  for (const [slug, set] of remaining) {
    if (set.size === 0) ready.push(slug);
  }
  if (ready.length === 0) break;
  ready.sort();
  layers.push(ready);
  for (const slug of ready) {
    order.push(slug);
    remaining.delete(slug);
  }
  for (const set of remaining.values()) {
    for (const slug of ready) set.delete(slug);
  }
}

const taskBySlug = new Map();
for (const t of roadmap.tasks) taskBySlug.set(t.slug, t);

if (remaining.size > 0) {
  console.error(`cycle detected; cannot order the following tasks:`);
  for (const [slug, set] of remaining) {
    console.error(`  ${slug} — still depends on: ${[...set].join(', ')}`);
  }
  process.exit(1);
}

console.log(`=== Derived milestones (one per topological layer) ===`);
console.log(`A milestone is a set of tasks whose combined adds lands a new`);
console.log(`addressable capability after all earlier layers have completed.`);
console.log(``);
for (let i = 0; i < layers.length; i++) {
  // Compute the combined adds for this layer
  const layerAddsObjects = new Set();
  const layerAddsMorphisms = new Set();
  for (const slug of layers[i]) {
    const t = taskBySlug.get(slug);
    for (const o of t.adds?.objects ?? []) layerAddsObjects.add(o);
    for (const m of t.adds?.morphisms ?? []) layerAddsMorphisms.add(m);
  }
  console.log(`Milestone (derived) — layer ${i}: ${layers[i].length} tasks, ${layerAddsObjects.size} objects, ${layerAddsMorphisms.size} morphisms`);
  for (const slug of layers[i]) {
    const t = taskBySlug.get(slug);
    const prog = t.program ? ` [${t.program}]` : ``;
    console.log(`  ${slug}${prog}`);
  }
  console.log(``);
}

console.log(`Total tasks ordered: ${order.length}`);
console.log(`Total derived milestones: ${layers.length}`);
