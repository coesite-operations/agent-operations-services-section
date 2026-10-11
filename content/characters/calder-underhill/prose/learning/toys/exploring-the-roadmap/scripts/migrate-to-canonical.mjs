#!/usr/bin/env node
// One-shot migration of the toy's records into their canonical repo-wide
// locations. Objects (including programs) go to code/structures/; morphisms
// to code/transformers/; tasks to doing/working/hacking/doing/working/planning/library/task/library/. Programs get a
// `kind: program` field added so the explorer skill can discriminate them
// from ordinary objects.
//
// Existing records at the destination are NOT overwritten. They are
// surfaced as collisions and listed at the end of the run for case-by-case
// review.

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const toyRoot = join(here, '..');
const repoRoot = join(here, '..', '..', '..', '..', '..', '..', '..', '..', '..');

const dirs = [
  { toy: 'objects', dest: 'code/structures', mark: null },
  { toy: 'morphisms', dest: 'code/transformers', mark: null },
  { toy: 'tasks', dest: 'doing/working/hacking/doing/working/planning/library/task/library', mark: null },
  { toy: 'programs', dest: 'code/structures', mark: 'program' },
];

let copied = 0;
let collisions = [];
let added = 0;

for (const { toy, dest, mark } of dirs) {
  const srcDir = join(toyRoot, toy);
  const dstDir = join(repoRoot, dest);
  await mkdir(dstDir, { recursive: true });
  let files;
  try {
    files = await readdir(srcDir);
  } catch (e) {
    if (e.code === 'ENOENT') continue;
    throw e;
  }
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const slug = f.slice(0, -3);
    const dstPath = join(dstDir, f);
    if (existsSync(dstPath)) {
      collisions.push({ slug, kind: toy, dest: `${dest}/${f}` });
      continue;
    }
    let content = await readFile(join(srcDir, f), 'utf-8');
    if (mark === 'program') {
      // Inject `kind: program` after the first --- line if not already present.
      if (!content.match(/^kind:\s*program\s*$/m)) {
        content = content.replace(
          /^---\r?\n/,
          `---\nkind: program\n`,
        );
      }
    }
    await writeFile(dstPath, content);
    copied++;
    added++;
  }
}

console.log(`migration to canonical locations:`);
console.log(`  copied: ${copied}`);
console.log(`  collisions (existing records kept; toy records dropped): ${collisions.length}`);
console.log(``);
if (collisions.length > 0) {
  console.log(`collision list (toy record left in place under toy/; existing record at canonical location was kept):`);
  for (const c of collisions) {
    console.log(`  ${c.kind}/${c.slug} → ${c.dest}`);
  }
}
