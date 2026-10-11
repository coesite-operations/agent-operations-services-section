#!/usr/bin/env node
// Fixes the off-by-one error in migrate-to-canonical.mjs by moving the
// wrongly-placed files from work/code/structures/, work/code/transformers/,
// and work/doing/working/hacking/doing/working/planning/library/task/library/ to the actual repo-root canonical
// locations. Surfaces collisions (existing files at the destination) rather
// than overwriting.

import { readFile, readdir, writeFile, mkdir, rm, rmdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = '/home/emsenn/561';

const moves = [
  { from: join(repoRoot, 'work/code/structures'), to: join(repoRoot, 'code/structures') },
  { from: join(repoRoot, 'work/code/transformers'), to: join(repoRoot, 'code/transformers') },
  { from: join(repoRoot, 'work/doing/working/hacking/doing/working/planning/library/task/library'), to: join(repoRoot, 'doing/working/hacking/doing/working/planning/library/task/library') },
];

let movedOk = 0;
let collisions = [];

for (const { from, to } of moves) {
  await mkdir(to, { recursive: true });
  let files;
  try {
    files = await readdir(from);
  } catch (e) {
    if (e.code === 'ENOENT') continue;
    throw e;
  }
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const srcPath = join(from, f);
    const dstPath = join(to, f);
    if (existsSync(dstPath)) {
      collisions.push({ from: srcPath, to: dstPath });
      // Leave the wrongly-placed file in work/code/... so the captain can
      // review the toy version alongside the canonical one if desired.
      continue;
    }
    const content = await readFile(srcPath, 'utf-8');
    await writeFile(dstPath, content);
    await rm(srcPath);
    movedOk++;
  }
}

// Clean up empty directories under work/code/ and work/doing/
async function rmEmpty(dir) {
  try {
    const entries = await readdir(dir);
    if (entries.length === 0) await rmdir(dir);
  } catch (e) {}
}
await rmEmpty(join(repoRoot, 'work/code/structures'));
await rmEmpty(join(repoRoot, 'work/code/transformers'));
await rmEmpty(join(repoRoot, 'work/code'));
await rmEmpty(join(repoRoot, 'work/doing/working/hacking/doing/working/planning/library/task/library'));
await rmEmpty(join(repoRoot, 'work/doing/planning'));
await rmEmpty(join(repoRoot, 'work/doing'));

console.log(`relocate to true canonical:`);
console.log(`  moved successfully: ${movedOk}`);
console.log(`  collisions left in work/code/... for review: ${collisions.length}`);
console.log(``);
if (collisions.length > 0) {
  console.log(`collisions (toy version left at "from"; captain's existing record kept at "to"):`);
  for (const c of collisions) {
    const fromShort = c.from.replace(repoRoot + '/', '');
    const toShort = c.to.replace(repoRoot + '/', '');
    console.log(`  ${fromShort}`);
    console.log(`    vs ${toShort}`);
  }
}
