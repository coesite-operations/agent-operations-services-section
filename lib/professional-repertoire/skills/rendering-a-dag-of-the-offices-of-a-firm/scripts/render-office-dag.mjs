#!/usr/bin/env node
// render-office-dag — render a firm's office DAG.
//
// An office spec is a JSON Schema (emsenn/office/<slug>), so this reads only
// canonical JSON office records. There is no Markdown or compatibility input.
//
// Resolution (emsenn's rule, 2026-07-14): a slug resolves to its CLOSEST
// neighbor, and upstream when there is a conflict. Nearness is measured in the
// filesystem from the referring file: the candidate sharing the longest path
// prefix with the referrer wins; ties break toward the shallower (more upstream)
// file. This is what lets `executive-assistant` mean the 561 Group's office when
// a 561 Group office says it, and emsenn's own office when emsenn's tree says
// it, with no renaming and no collision.
//
// usage:
//   node render-office-dag.mjs [--root <repo-root>] [--format tree|edges|dot]

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const REPO_ROOT = argValue("--root") ?? "/home/emsenn/info";
const FORMAT = argValue("--format") ?? "tree";

// The relation keys that are edges between offices. Everything else in a spec is
// an attribute of the office, not a link. `unrealized` is prose about what the
// office has not built and is deliberately not an edge.
const EDGE_KEYS = [
  "reports-to",
  "presides-over",
  "serves",
  "served-by",
  "peer-offices",
  "distinguished-from",
];

// Where office pools live. Nearest wins; these are only the roots that get walked.
const OFFICE_POOLS = [
  "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/offices",
  "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/characters/emsenn/lib/management/offices",
  "lib/emsenn/services/561-group/lib/agency/offices",
  "lib/emsenn/services/561-group/services/rsc-quiescent/lib/management/offices",
];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function slugify(text) {
  return String(text).trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function asList(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap(asList);
  if (typeof value === "string") {
    const text = value.trim();
    return text ? [text] : [];
  }
  return [String(value)];
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    let stats;
    try {
      stats = statSync(path);
    } catch {
      continue;
    }
    if (stats.isDirectory()) walk(path, out);
    else if (entry.endsWith(".json")) out.push(path);
  }
  return out;
}

function readOffice(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return null;
  }
  let spec;
  try {
    spec = JSON.parse(text);
  } catch {
    return { path, unreadable: true };
  }
  if (spec.kind !== "office") return null;
  const id = String(spec.id ?? spec.$id ?? "").replace(/^emsenn\/office\//, "");
  if (!id) return { path, unreadable: true };
  return { path, id: slugify(id), spec };
}

function sharedPrefixLength(a, b) {
  const left = a.split(sep);
  const right = b.split(sep);
  let n = 0;
  while (n < left.length && n < right.length && left[n] === right[n]) n += 1;
  return n;
}

// Nearest wins; ties break toward the shallower (upstream) file.
function resolveSlug(raw, fromPath, index) {
  const candidates = index.get(slugify(raw));
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return [...candidates].sort((a, b) => {
    const near = sharedPrefixLength(b.path, fromPath) - sharedPrefixLength(a.path, fromPath);
    if (near !== 0) return near;
    return a.path.split(sep).length - b.path.split(sep).length;
  })[0];
}

function main() {
  const offices = [];
  const unreadable = [];
  for (const pool of OFFICE_POOLS) {
    for (const path of walk(join(REPO_ROOT, pool))) {
      const office = readOffice(path);
      if (!office) continue;
      if (office.unreadable) {
        unreadable.push(relative(REPO_ROOT, path));
        continue;
      }
      offices.push({ ...office, rel: relative(REPO_ROOT, path) });
    }
  }

  const index = new Map();
  for (const office of offices) {
    if (!index.has(office.id)) index.set(office.id, []);
    index.get(office.id).push(office);
  }

  const edges = [];
  const unresolved = [];
  for (const office of offices) {
    for (const key of EDGE_KEYS) {
      for (const raw of asList(office.spec[key])) {
        const target = resolveSlug(raw, office.path, index);
        if (!target) {
          unresolved.push({ from: office.id, key, raw, rel: office.rel });
          continue;
        }
        edges.push({ from: office, to: target, key });
      }
    }
  }

  if (FORMAT === "dot") {
    console.log("digraph offices {");
    console.log("  rankdir=TB;");
    for (const o of offices) console.log(`  "${o.id}" [shape=box];`);
    for (const e of edges) console.log(`  "${e.from.id}" -> "${e.to.id}" [label="${e.key}"];`);
    console.log("}");
  } else if (FORMAT === "edges") {
    for (const e of edges) console.log(`${e.from.id}\t${e.key}\t${e.to.id}`);
  } else {
    // Command tree, rooted at the offices that report to nothing. Keyed by PATH,
    // not by id — two distinct offices may share an id across pools.
    const children = new Map();
    const hasSuperior = new Set();
    for (const e of edges) {
      if (e.key !== "reports-to") continue;
      if (!children.has(e.to.path)) children.set(e.to.path, []);
      children.get(e.to.path).push(e.from);
      hasSuperior.add(e.from.path);
    }
    const roots = offices
      .filter((o) => !hasSuperior.has(o.path))
      .sort((a, b) => a.id.localeCompare(b.id));

    console.log("offices, by command\n");
    const seen = new Set();
    const line = (office, depth) => {
      if (seen.has(office.path)) {
        console.log(`${"  ".repeat(depth)}${office.id} (cycle)`);
        return;
      }
      seen.add(office.path);
      console.log(`${"  ".repeat(depth)}${office.id}`);
      for (const child of (children.get(office.path) ?? []).sort((a, b) => a.id.localeCompare(b.id))) {
        line(child, depth + 1);
      }
    };
    for (const root of roots) line(root, 0);

    const other = edges.filter((e) => e.key !== "reports-to");
    if (other.length) {
      console.log("\nother relations:\n");
      for (const e of other.sort((a, b) => a.from.id.localeCompare(b.from.id))) {
        console.log(`  ${e.from.id} --${e.key}--> ${e.to.id}`);
      }
    }
  }

  // A sweep that found nothing is a finding, not a pass. This is the whole
  // reason the previous version's silence went unnoticed for as long as it did.
  if (offices.length === 0) {
    console.error("\nNO OFFICES FOUND. The pools are empty or the roots are wrong — this is a failure, not a clean sweep.");
    process.exit(1);
  }
  if (unreadable.length) {
    console.error(`\n${unreadable.length} unreadable office spec(s):`);
    for (const rel of unreadable) console.error(`  ${rel}`);
  }
  if (unresolved.length) {
    console.error(`\n${unresolved.length} unresolved edge(s):`);
    for (const u of unresolved) console.error(`  ${u.rel}: ${u.key} names '${u.raw}', which resolves to no office`);
  }
  console.error(
    `\n${offices.length} offices, ${edges.length} edges, ${unresolved.length} unresolved.`,
  );
  if (unresolved.length || unreadable.length) process.exit(1);
}

main();
