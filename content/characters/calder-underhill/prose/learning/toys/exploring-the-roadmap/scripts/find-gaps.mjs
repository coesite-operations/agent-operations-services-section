#!/usr/bin/env node
// Find gaps in the roadmap:
// 1. Objects required by some task but never added by any task — missing tasks.
// 2. Morphisms required by some task but never added by any task — missing tasks.
// 3. Object fields whose types reference an object slug that has no record —
//    missing object records.
// 4. Morphism inputs/outputs whose types reference an object slug that has no
//    record — missing object records.
// 5. Objects with empty fields lists — authoring gap (next pass to fill).
// Also reports orphan objects/morphisms (added but never required) as
// informational only.

import { loadRoadmap, indexBySlug } from './helpers.mjs';

const roadmap = await loadRoadmap();
const objectIndex = indexBySlug(roadmap.objects);
const morphismIndex = indexBySlug(roadmap.morphisms);

// Required-but-not-added (task-graph gaps)
const objectRequiredBy = new Map();
const morphismRequiredBy = new Map();
for (const t of roadmap.tasks) {
  for (const o of t.requires?.objects ?? []) {
    if (!objectRequiredBy.has(o)) objectRequiredBy.set(o, []);
    objectRequiredBy.get(o).push(t.slug);
  }
  for (const m of t.requires?.morphisms ?? []) {
    if (!morphismRequiredBy.has(m)) morphismRequiredBy.set(m, []);
    morphismRequiredBy.get(m).push(t.slug);
  }
}

const objectAdders = new Map();
const morphismAdders = new Map();
for (const t of roadmap.tasks) {
  for (const o of t.adds?.objects ?? []) {
    if (!objectAdders.has(o)) objectAdders.set(o, []);
    objectAdders.get(o).push(t.slug);
  }
  for (const m of t.adds?.morphisms ?? []) {
    if (!morphismAdders.has(m)) morphismAdders.set(m, []);
    morphismAdders.get(m).push(t.slug);
  }
}

const missingObjectsByRequires = [];
for (const [slug, requiredBy] of objectRequiredBy) {
  if (!objectAdders.has(slug)) missingObjectsByRequires.push({ slug, requiredBy });
}
const missingMorphismsByRequires = [];
for (const [slug, requiredBy] of morphismRequiredBy) {
  if (!morphismAdders.has(slug)) missingMorphismsByRequires.push({ slug, requiredBy });
}

// Type-graph gaps (object fields and morphism inputs/outputs)
const missingTypesInObjectFields = [];
for (const obj of roadmap.objects) {
  for (const f of obj.fields ?? []) {
    if (f && f.type && !objectIndex.has(f.type)) {
      missingTypesInObjectFields.push({ object: obj.slug, field: f.name ?? '?', type: f.type });
    }
  }
}
const missingTypesInMorphisms = [];
for (const morph of roadmap.morphisms) {
  for (const inp of morph.inputs ?? []) {
    if (inp && inp.type && !objectIndex.has(inp.type)) {
      missingTypesInMorphisms.push({ morphism: morph.slug, slot: `input:${inp.name ?? '?'}`, type: inp.type });
    }
  }
  if (morph.output && morph.output.type && !objectIndex.has(morph.output.type)) {
    missingTypesInMorphisms.push({ morphism: morph.slug, slot: 'output', type: morph.output.type });
  }
}

// Authoring gaps: objects with no field declarations
const objectsWithoutFields = [];
for (const obj of roadmap.objects) {
  if (!obj.fields || obj.fields.length === 0) objectsWithoutFields.push(obj.slug);
}

// Orphans (added but never required)
const orphanObjects = [];
for (const [slug] of objectAdders) {
  if (!objectRequiredBy.has(slug)) orphanObjects.push(slug);
}
const orphanMorphisms = [];
for (const [slug] of morphismAdders) {
  if (!morphismRequiredBy.has(slug)) orphanMorphisms.push(slug);
}

console.log(`=== Missing objects (required but not added by any task) ===`);
if (missingObjectsByRequires.length === 0) console.log(`  (none)`);
for (const { slug, requiredBy } of missingObjectsByRequires) {
  console.log(`  ${slug} — required by ${requiredBy.join(', ')}`);
}

console.log(``);
console.log(`=== Missing morphisms (required but not added by any task) ===`);
if (missingMorphismsByRequires.length === 0) console.log(`  (none)`);
for (const { slug, requiredBy } of missingMorphismsByRequires) {
  console.log(`  ${slug} — required by ${requiredBy.join(', ')}`);
}

console.log(``);
console.log(`=== Type gaps in object fields (field type with no object record) ===`);
if (missingTypesInObjectFields.length === 0) console.log(`  (none)`);
for (const g of missingTypesInObjectFields) {
  console.log(`  object ${g.object} field ${g.field} → type ${g.type} has no record`);
}

console.log(``);
console.log(`=== Type gaps in morphisms (input/output type with no object record) ===`);
if (missingTypesInMorphisms.length === 0) console.log(`  (none)`);
for (const g of missingTypesInMorphisms) {
  console.log(`  morphism ${g.morphism} ${g.slot} → type ${g.type} has no record`);
}

console.log(``);
console.log(`=== Authoring gaps (objects with no field declarations) ===`);
console.log(`  ${objectsWithoutFields.length} of ${roadmap.objects.length} objects have empty fields:`);
const firstN = objectsWithoutFields.slice(0, 20);
for (const slug of firstN) console.log(`  ${slug}`);
if (objectsWithoutFields.length > firstN.length) {
  console.log(`  ... and ${objectsWithoutFields.length - firstN.length} more`);
}

console.log(``);
console.log(`=== Orphan adds (informational; some are intentional terminal capabilities) ===`);
console.log(`  ${orphanObjects.length} orphan objects, ${orphanMorphisms.length} orphan morphisms`);
