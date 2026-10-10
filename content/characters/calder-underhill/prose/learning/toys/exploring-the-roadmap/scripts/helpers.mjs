// Shared helpers for the exploring-the-roadmap scripts.
// Walks the four per-record directories (programs, tasks, objects, morphisms)
// under the toy's root, parses each .md file's YAML frontmatter, and returns
// an aggregate in-memory shape the other scripts consume.

import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const here = dirname(fileURLToPath(import.meta.url));
const roadmapRoot = join(here, '..');

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  return yaml.load(m[1]) || {};
}

async function loadDir(dirName) {
  const dir = join(roadmapRoot, dirName);
  let files;
  try {
    files = await readdir(dir);
  } catch (e) {
    return [];
  }
  const records = [];
  for (const f of files) {
    if (extname(f) !== '.md') continue;
    const slug = basename(f, '.md');
    const text = await readFile(join(dir, f), 'utf-8');
    const fm = parseFrontmatter(text);
    records.push({ slug, ...fm });
  }
  return records;
}

export async function loadRoadmap() {
  const [programs, tasks, objects, morphisms] = await Promise.all([
    loadDir('programs'),
    loadDir('tasks'),
    loadDir('objects'),
    loadDir('morphisms'),
  ]);
  return { programs, tasks, objects, morphisms };
}

export function indexBySlug(records) {
  const map = new Map();
  for (const r of records) map.set(r.slug, r);
  return map;
}

// Build task -> Set<task it depends on>.
// X depends on Y iff X.requires names any object/morphism Y.adds.
export function buildTaskDeps(roadmap) {
  const taskByObject = new Map();
  const taskByMorphism = new Map();
  for (const t of roadmap.tasks) {
    for (const o of t.adds?.objects ?? []) {
      if (!taskByObject.has(o)) taskByObject.set(o, []);
      taskByObject.get(o).push(t.slug);
    }
    for (const m of t.adds?.morphisms ?? []) {
      if (!taskByMorphism.has(m)) taskByMorphism.set(m, []);
      taskByMorphism.get(m).push(t.slug);
    }
  }
  const deps = new Map();
  for (const t of roadmap.tasks) {
    const set = new Set();
    for (const o of t.requires?.objects ?? []) {
      for (const adder of taskByObject.get(o) ?? []) {
        if (adder !== t.slug) set.add(adder);
      }
    }
    for (const m of t.requires?.morphisms ?? []) {
      for (const adder of taskByMorphism.get(m) ?? []) {
        if (adder !== t.slug) set.add(adder);
      }
    }
    deps.set(t.slug, set);
  }
  return { taskByObject, taskByMorphism, deps };
}
