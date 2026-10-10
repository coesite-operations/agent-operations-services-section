#!/usr/bin/env node
// install-claude-as-an-officer — install ONE office into ONE node of the tree.
//
// The office is the source; the node's `CLAUDE.md` and `.claude/skills/` are the
// output. Installing an office into a node means, exactly:
//
//   1. the office's CLAUDE.md becomes <node>/CLAUDE.md; for a canonical JSON
//      office, that CLAUDE.md is rendered deterministically from the record
//   2. every skill that realizes a duty the office records, and every skill
//      seated under the office itself, becomes <node>/.claude/skills/<name>/ —
//      the whole skill directory, SKILL.md and scripts/ and all.
//
// Closure-kind: process. No branching on surprise — every unmet precondition
// exits non-zero with the reason. Same office and node produce the same install.
//
// usage:
//   install-claude-as-an-officer.js <office> <node> [--dry-run]
//   install-claude-as-an-officer.js <office> <node> --list
//   install-claude-as-an-officer.js <office> <node> --clean
//   install-claude-as-an-officer.js <office> <node> --reinstall
//
// <office> is a path to an office record or office directory, or a bare office
// id resolved from where you stand: the nearest office of that id by filesystem
// distance wins. Where you stand is the working directory, or --from <path>.
//
// <node> is the directory the office is installed into — a path, or omitted to
// mean the repo root.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

const REPO_ROOT = argValue("--root") ?? "/home/emsenn/info";
const DRY_RUN = process.argv.includes("--dry-run");

// Where you stand. A bare office id resolves to the nearest office of that id
// from here — not from a roster ranking written down anywhere.
const STANDPOINT = resolve(argValue("--from") ?? process.cwd());

// Directories that are never part of an office's own record, and never a pool:
// archives hold retired offices, which are records, not seats. `.claude` is
// excluded because it is output — output is never evidence about the record.
const SKIP_DIRS = new Set([
  "fixtures",
  "node_modules",
  ".git",
  ".claude",
  "dist",
  "build",
  "archive",
  "_archive",
  "triage",
  "preservation",
]);

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function die(message) {
  console.error(`install-claude-as-an-officer: ${message}`);
  process.exit(1);
}

function rel(p) {
  return relative(REPO_ROOT, p) || ".";
}

// --- pools: rosters, duty pools, skill pools ---------------------------------

// A pool is a directory of that name seated anywhere in the tree that is not
// skipped: `lib/management/offices/`, `work/governance/staff/offices/`. Found by
// walking, not by a list written down anywhere.
const POOL_CACHE = {};

function pools(name) {
  if (POOL_CACHE[name]) return POOL_CACHE[name];
  const found = [];
  (function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const child = join(dir, entry.name);
      if (entry.name === name) found.push(child);
      else walk(child);
    }
  })(REPO_ROOT);
  POOL_CACHE[name] = found;
  return found;
}

// Distance from where you stand, counting every step — up out of here and back
// down to there. This is what "nearest" means; it is not a preference order.
function distanceFrom(standpoint, target) {
  const r = relative(standpoint, target);
  return r === "" ? 0 : r.split("/").length;
}

// Nearest wins. A nearer seat shadowing a farther one is the glossary's rule
// working, not a conflict — refuse only a true tie, where distance decides
// nothing.
function nearest(kind, id, seats, standpoint) {
  const ranked = seats
    .map((path) => ({ path, distance: distanceFrom(standpoint, path) }))
    .sort((a, b) => a.distance - b.distance);
  if (ranked.length > 1 && ranked[0].distance === ranked[1].distance) {
    die(
      `${kind} '${id}' seats at two places equidistant from ${rel(standpoint)} — nothing decides between them:\n` +
        ranked
          .filter((s) => s.distance === ranked[0].distance)
          .map((s) => `  ${rel(s.path)}`)
          .join("\n") +
        `\nName it by path, or stand somewhere that decides.`,
    );
  }
  return ranked[0].path;
}

// --- frontmatter --------------------------------------------------------------

function frontmatter(file) {
  if (!existsSync(file)) return undefined;
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, "utf8"));
  return match ? match[1] : undefined;
}

function frontmatterValue(file, key) {
  const fm = frontmatter(file);
  if (!fm) return undefined;
  const match = new RegExp(`^${key}:[ \\t]*(.+)$`, "m").exec(fm);
  return match ? match[1].trim() : undefined;
}

// Reads `key: [a, b]` and the block-sequence form. Frontmatter here is written by
// hand in both shapes, so both are read; anything else is not a list.
function frontmatterList(file, key) {
  const fm = frontmatter(file);
  if (!fm) return [];
  const inline = new RegExp(`^${key}:[ \\t]*\\[(.*)\\][ \\t]*$`, "m").exec(fm);
  if (inline) return inline[1].split(",").map((s) => s.trim()).filter(Boolean);
  const block = new RegExp(`^${key}:[ \\t]*\\r?\\n((?:[ \\t]*-[ \\t]*.+\\r?\\n?)+)`, "m").exec(fm);
  if (block) {
    return block[1]
      .split("\n")
      .map((l) => l.replace(/^[ \t]*-[ \t]*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

// --- precondition: the argument names an office ------------------------------

// An office seats in a roster in one of three shapes, and they are the same
// office seen three ways: a bare record `offices/<id>.md`, a directory
// `offices/<id>/` holding `<id>.md` beside whatever else the office carries, or
// a canonical record `offices/<id>.schema.json` conforming to emsenn/office.
// The record is the office either way; the directory is just an office that has
// more than a record, and the canonical form is an office whose whole record is
// data rather than prose.
function officeAt(path) {
  if (existsSync(path) && statSync(path).isDirectory()) {
    const id = basename(path);
    const record = join(path, `${id}.md`);
    if (existsSync(record)) return { id, dir: path, record, seated: true };
    const canonical = join(path, `${id}.schema.json`);
    if (existsSync(canonical)) return { id, dir: path, record: canonical, seated: true, canonical: true };
    return undefined;
  }
  if (path.endsWith(".md") && existsSync(path)) {
    const id = basename(path, ".md");
    return { id, dir: dirname(path), record: path, seated: false };
  }
  if (path.endsWith(".schema.json") && existsSync(path)) {
    const id = basename(path, ".schema.json");
    return { id, dir: dirname(path), record: path, seated: false, canonical: true };
  }
  if (path.endsWith(".json") && existsSync(path)) {
    const id = basename(path, ".json");
    return { id, dir: dirname(path), record: path, seated: false, canonical: true };
  }
  return undefined;
}

// Read and validate a canonical office record. The address carries the type:
// `$id` must be `emsenn/office/<id>` and `kind` must be `office`.
function canonicalOffice(office) {
  let spec;
  try {
    spec = JSON.parse(readFileSync(office.record, "utf8"));
  } catch (e) {
    die(`${rel(office.record)} is unreadable: ${e.message}`);
  }
  if (spec.kind !== "office") {
    die(`${rel(office.record)} declares 'kind: ${spec.kind ?? "(nothing)"}' — refusing to install from a non-office.`);
  }
  const claimed = spec.id ?? (typeof spec.$id === "string" ? spec.$id.split("/").pop() : undefined);
  if (claimed !== office.id) {
    die(`${rel(office.record)} carries id '${claimed}' — that is not office '${office.id}'.`);
  }
  return spec;
}

function resolveOffice(arg) {
  if (!arg) {
    die(
      "no office given. usage: install-claude-as-an-officer.js <office> <node> [--dry-run|--list|--clean|--reinstall]",
    );
  }

  let office;
  if (arg.includes("/") || isAbsolute(arg)) {
    // A path names the office outright; there is nothing to resolve.
    const path = isAbsolute(arg) ? arg : resolve(REPO_ROOT, arg);
    office = officeAt(path) ?? officeAt(`${path}.json`) ?? officeAt(`${path}.md`) ?? officeAt(`${path}.schema.json`);
    if (!office) die(`office path '${arg}' is neither an office record nor an office directory.`);
  } else {
    const rosters = pools("offices");
    const seats = rosters
      .flatMap((roster) => [join(roster, arg), join(roster, `${arg}.json`), join(roster, `${arg}.md`), join(roster, `${arg}.schema.json`)])
      .filter((p) => officeAt(p));
    if (seats.length === 0) {
      die(
        `office '${arg}' seats in no roster. Rosters searched:\n  ` +
          (rosters.length ? rosters.map(rel).join("\n  ") : "(none)"),
      );
    }
    office = officeAt(nearest("office", arg, seats, STANDPOINT));
  }

  if (office.canonical) {
    office.spec = canonicalOffice(office);
    return office;
  }
  const type = frontmatterValue(office.record, "type");
  if (type !== "office") {
    die(`${rel(office.record)} declares 'type: ${type ?? "(nothing)"}' — refusing to install from a non-office.`);
  }
  return office;
}

// --- the node ------------------------------------------------------------------

function resolveNode(arg) {
  const dir = arg ? (isAbsolute(arg) ? arg : resolve(process.cwd(), arg)) : REPO_ROOT;
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    die(`node '${arg}' is not a directory. The node is where the office gets installed; it must already exist.`);
  }
  return dir;
}

// --- discovery: the office's CLAUDE.md and the office's skills -----------------

// The office's CLAUDE.md is the durable role the node's sessions step into. An
// office seated in its own directory says it in the CLAUDE.md it carries there;
// an office that is only a record says it in the record. Both are the office
// speaking — there is no third place, and the harness is not one.
function listed(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : undefined;
  return value || undefined;
}

function renderCanonicalClaudeMd(office, duties, skills) {
  const spec = office.spec;
  const position = [
    ["part of", listed(spec["part-of"])],
    ["reports to", listed(spec["reports-to"])],
    ["peer offices", listed(spec["peer-offices"])],
    ["jurisdiction", listed(spec.jurisdiction)],
    ["distinguished from", listed(spec["distinguished-from"])],
  ].filter(([, value]) => value);
  const deontic = Object.entries(spec["deontic-profile"] ?? {});
  return (
    `# ${spec.name}\n\n` +
    `You hold the office of **${spec.name}** (\`emsenn/office/${office.id}\`). ` +
    `This file is output rendered from \`${rel(office.record)}\` by ` +
    `installing-claude-as-an-office. The office record and its duties and ` +
    `skills are authoritative; edits here are discarded on reinstall.\n\n` +
    `This main session holds this office. It is not a root dispatcher and it ` +
    `does not inherit another settlement's authority from repository access.\n\n` +
    `Before acting at a repository node, read that node's AGENTS.md when one ` +
    `exists and read the target settlement's own membrane instructions. The ` +
    `office projection does not supersede settlement law.\n\n` +
    `## The office\n\n${spec["normative-structure"]}\n\n` +
    (position.length
      ? `## Position\n\n${position.map(([key, value]) => `- ${key}: ${value}`).join("\n")}\n\n`
      : "") +
    (deontic.length
      ? `## Deontic profile\n\n${deontic.map(([key, value]) => `- ${key.replaceAll("-", " ")} — **${value}**`).join("\n")}\n\n`
      : "") +
    (duties.length
      ? `## Duties and their skills\n\n${duties.map((duty) =>
          `- **${duty.id}**` +
          (duty.spec?.authority
            ? ` (authority: ${duty.spec.authority}${duty.spec.claim ? `; claim: ${duty.spec.claim}` : ""})`
            : "") +
          (duty.skills.length ? ` — discharged by: ${duty.skills.join(", ")}` : " — realized by no skill")
        ).join("\n")}\n\n`
      : "") +
    `## Installed skills\n\n${skills.map((skill) => `- ${skill.name}`).join("\n")}\n\n` +
    `Read a matching skill in \`.claude/skills/\` before acting. A skill whose ` +
    `description says it runs at manually opened session start runs on the ` +
    `first turn without waiting for the Leader to name it.\n` +
    (Array.isArray(spec.unrealized) && spec.unrealized.length
      ? `\n## Unrealized\n\n${spec.unrealized.map((item) => `- ${item}`).join("\n")}\n`
      : "")
  );
}

function findClaudeMd(office, duties, skills) {
  if (office.seated) {
    const carried = join(office.dir, "CLAUDE.md");
    if (existsSync(carried)) return { label: carried, bytes: readFileSync(carried) };
  }
  if (office.canonical) {
    return { label: office.record, bytes: Buffer.from(renderCanonicalClaudeMd(office, duties, skills), "utf8") };
  }
  return { label: office.record, bytes: readFileSync(office.record) };
}

// An office's skills come from two places, and they are the same rule seen twice:
// the skills seated under the office itself, and the skills that realize every
// duty the office's record ASSIGNS it via `duties:`. A duty seats in a shared
// pool rather than under any office because a duty can be borne by several
// offices at once; the office record's `duties:` list is the whole assignment
// mechanism, and the duty record's skills list (`skills` on a canonical
// emsenn/term/duty record; `realized-by-skills:` on an older frontmatter
// record) is the whole realization mechanism. Walking the office alone would install an office
// holding none of its assigned duties' skills — an incumbent that cannot
// discharge what its office records, which is the exact drift this exists
// against. So duty resolution is not optional.
function findSkills(office, duties = resolveDuties(office)) {
  const found = new Map();
  const add = (skill) => {
    const prior = found.get(skill.name);
    if (prior && resolve(prior.dir) !== resolve(skill.dir)) {
      die(
        `office '${office.id}' holds skill '${skill.name}' from two places — one name cannot resolve to two skills:\n` +
          `  ${rel(prior.dir)}\n  ${rel(skill.dir)}`,
      );
    }
    found.set(skill.name, skill);
  };

  for (const skill of walkForSkills(office)) add(skill);
  // A canonical office may also name skills of its own in `provides-skill`,
  // resolved from where the record seats — the record's own claim, beside the
  // duties' claims.
  if (office.canonical) {
    for (const name of Array.isArray(office.spec["provides-skill"]) ? office.spec["provides-skill"] : []) {
      add(resolveSkill(name, office.record));
    }
  }
  for (const duty of duties) {
    for (const name of duty.skills) {
      add(resolveSkill(name, duty.record));
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Skills seated under the office itself — only when the office is a directory of
// its own. A bare record's directory is the roster, and the roster is not the
// office: walking it would hand this office every sibling office's skills.
function walkForSkills(office) {
  if (!office.seated) return [];
  const skills = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const child = join(dir, entry.name);
      if (existsSync(join(child, "SKILL.md"))) skills.push({ name: entry.name, dir: child });
      else walk(child);
    }
  })(office.dir);
  return skills;
}

// Resolve each id in the office record's `duties:` to a duty in a pool, nearest
// to the office. A named duty that resolves to nothing is a refusal, not a
// warning: an office recording a duty the Group does not have is exactly the
// drift between record and behavior that this exists to stop.
function resolveDuties(office) {
  // A canonical office names its duties in `bears-duty`, each by full address
  // (`emsenn/duty/<id>`); an older frontmatter office names them bare in
  // `duties:`. Same assignment mechanism, two spellings.
  const ids = office.canonical
    ? (Array.isArray(office.spec["bears-duty"]) ? office.spec["bears-duty"] : []).map((a) =>
        a.replace(/^emsenn\/duty\//, ""),
      )
    : frontmatterList(office.record, "duties");
  const all = pools("duties");
  return ids.map((id) => {
    const seats = all
      .flatMap((pool) => [join(pool, `${id}.json`), join(pool, `${id}.schema.json`), join(pool, `${id}.md`), join(pool, id, `${id}.md`)])
      .filter((p) => existsSync(p));
    if (seats.length === 0) {
      die(
        `office '${office.id}' records duty '${id}', which seats in no duties pool. Pools searched:\n  ` +
          (all.length ? all.map(rel).join("\n  ") : "(none)"),
      );
    }
    const record = nearest("duty", id, seats, office.dir);
    if (record.endsWith(".json")) {
      // A canonical duty record conforming to emsenn/term/duty: the address
      // carries the type, and the skills that discharge it sit in `skills`.
      let spec;
      try {
        spec = JSON.parse(readFileSync(record, "utf8"));
      } catch (e) {
        die(`${rel(record)} is unreadable: ${e.message}`);
      }
      const claimedDuty = spec.id ?? (typeof spec.$id === "string" ? spec.$id.split("/").pop() : undefined);
      if (claimedDuty !== id) die(`${rel(record)} carries id '${claimedDuty}' — that is not duty '${id}'.`);
      return { id, record, skills: Array.isArray(spec.skills) ? spec.skills : [] };
    }
    const type = frontmatterValue(record, "type");
    if (type !== "duty") die(`${rel(record)} declares 'type: ${type ?? "(nothing)"}' — that is not a duty.`);
    return { id, record, skills: frontmatterList(record, "realized-by-skills") };
  });
}

// Resolve a skill named by a duty to a skill directory in a pool, nearest to the
// duty that names it. A duty naming a skill that seats nowhere is a duty nothing
// realizes — a refusal, for the same reason.
function resolveSkill(name, dutyRecord) {
  const all = pools("skills");
  const seats = all.map((pool) => join(pool, name)).filter((d) => existsSync(join(d, "SKILL.md")));
  if (seats.length === 0) {
    die(
      `duty '${rel(dutyRecord)}' says it is realized by skill '${name}', which seats in no skills pool. Pools searched:\n  ` +
        (all.length ? all.map(rel).join("\n  ") : "(none)"),
    );
  }
  return { name, dir: nearest("skill", name, seats, dirname(dutyRecord)) };
}

// --- precondition: the discovered set is installable --------------------------

function checkSkills(skills, office) {
  if (skills.length === 0) {
    die(
      `office '${office.id}' (${rel(office.record)}) has no skills — it records no duties realized by any skill, and holds none of its own.`,
    );
  }
  for (const skill of skills) {
    const source = join(skill.dir, "SKILL.md");
    const declared = frontmatterValue(source, "name");
    if (!declared) die(`${rel(source)} has no 'name:' in its frontmatter.`);
    if (declared !== skill.name) {
      die(
        `${rel(source)} declares name '${declared}' but sits in directory '${skill.name}'. ` +
          `The directory name is the skill's name; make them agree.`,
      );
    }
  }
}

// --- manifest: what this office installed here, so clean is exact -------------

function manifestPath(node) {
  return join(node, ".claude/.claude-install-manifest");
}

function readManifest(node) {
  const file = manifestPath(node);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [officeId, skillName] = line.split(":");
      return { officeId, skillName };
    });
}

function writeManifest(node, entries) {
  const sorted = [...entries].sort((a, b) =>
    a.officeId === b.officeId ? a.skillName.localeCompare(b.skillName) : a.officeId.localeCompare(b.officeId),
  );
  mkdirSync(dirname(manifestPath(node)), { recursive: true });
  writeFileSync(manifestPath(node), sorted.map((e) => `${e.officeId}:${e.skillName}\n`).join(""));
}

// --- the motions --------------------------------------------------------------

function doList(node, claudeMd, skills) {
  console.log(`CLAUDE.md\t${rel(claudeMd.label)}\t->\t${rel(join(node, "CLAUDE.md"))}`);
  for (const skill of skills) {
    console.log(`${skill.name}\t${rel(skill.dir)}\t->\t${rel(join(node, ".claude/skills", skill.name))}`);
  }
}

function doClean(office, node) {
  const manifest = readManifest(node);
  const mine = manifest.filter((e) => e.officeId === office.id);
  if (mine.length === 0) {
    console.log(`install-claude-as-an-officer: office '${office.id}' has nothing installed at ${rel(node)}.`);
    return;
  }
  for (const entry of mine) {
    // A skill of a SHARED duty stays seated while any other office installed
    // here still holds it. Removing it would strip a skill from an office that
    // never asked to be cleaned.
    const alsoHeld = manifest.some((e) => e.skillName === entry.skillName && e.officeId !== office.id);
    if (alsoHeld) {
      console.log(`  kept       ${entry.skillName}  (still held by another office)`);
      continue;
    }
    if (!DRY_RUN) rmSync(join(node, ".claude/skills", entry.skillName), { recursive: true, force: true });
    console.log(`  removed    ${entry.skillName}`);
  }
  if (!DRY_RUN) writeManifest(node, manifest.filter((e) => e.officeId !== office.id));
  console.log(
    `install-claude-as-an-officer: cleaned ${mine.length} skill(s) of office '${office.id}' from ${rel(node)}.`,
  );
}

function doInstall(office, node, claudeMd, skills) {
  // One name, one skill — but that was never the same claim as "one name, one
  // office". A duty in a shared pool is borne by several offices on purpose, and
  // each of them holds its skills; refusing that would make a shared duty
  // uninstallable, which is the opposite of what the pool is for.
  //
  // So the question is not WHO installed the name, it is WHETHER the name
  // resolves to two different skills. Asked of the OFFICES, not of the seated
  // file: `.claude/` is output, and output is never evidence about what a skill
  // is. Hand-editing the artifact must not be able to provoke a refusal —
  // reinstalling over a tampered artifact is the correction.
  const manifest = readManifest(node);
  for (const skill of skills) {
    const owner = manifest.find((e) => e.skillName === skill.name && e.officeId !== office.id);
    if (!owner) continue;
    const theirs = findSkills(resolveOffice(owner.officeId)).find((s) => s.name === skill.name);
    if (theirs && resolve(theirs.dir) === resolve(skill.dir)) continue; // one duty, two bearers
    die(
      `skill '${skill.name}' is already installed at ${rel(node)} by office '${owner.officeId}' from a different source. ` +
        `One name cannot resolve to two skills.\n` +
        `  ${office.id}: ${rel(skill.dir)}\n` +
        `  ${owner.officeId}: ${theirs ? rel(theirs.dir) : "(no longer resolves — stale manifest entry)"}`,
    );
  }

  // The office's CLAUDE.md is the node's CLAUDE.md. The node is output.
  const claudeTarget = join(node, "CLAUDE.md");
  if (!DRY_RUN) writeFileSync(claudeTarget, claudeMd.bytes);
  console.log(`  installed  CLAUDE.md  (${rel(claudeMd.label)})`);

  // The whole skill directory — SKILL.md and scripts/ and all. A skill whose
  // scripts stayed behind is a skill the incumbent cannot run.
  for (const skill of skills) {
    const target = join(node, ".claude/skills", skill.name);
    if (!DRY_RUN) {
      rmSync(target, { recursive: true, force: true });
      mkdirSync(dirname(target), { recursive: true });
      cpSync(skill.dir, target, { recursive: true });
    }
    console.log(`  installed  ${skill.name}`);
  }

  if (DRY_RUN) {
    console.log(
      `install-claude-as-an-officer: dry run — would install office '${office.id}' and ${skills.length} skill(s) into ${rel(node)}.`,
    );
    return;
  }

  writeManifest(node, [
    ...manifest.filter((e) => e.officeId !== office.id),
    ...skills.map((s) => ({ officeId: office.id, skillName: s.name })),
  ]);

  // Postcondition, checked rather than assumed: every file is at its target,
  // byte-identical to the office's copy.
  verifyBytes(claudeMd.bytes, claudeTarget, claudeMd.label);
  for (const skill of skills) verifyTree(skill.dir, join(node, ".claude/skills", skill.name));

  console.log(
    `install-claude-as-an-officer: installed office '${office.id}' and ${skills.length} skill(s) into ${rel(node)}.`,
  );
}

function verifyFile(source, target) {
  if (!existsSync(target)) die(`postcondition failed: ${rel(target)} was not written.`);
  if (readFileSync(target) .equals(readFileSync(source))) return;
  die(`postcondition failed: ${rel(target)} differs from ${rel(source)}.`);
}

function verifyBytes(sourceBytes, target, sourceLabel) {
  if (!existsSync(target)) die(`postcondition failed: ${rel(target)} was not written.`);
  if (readFileSync(target).equals(sourceBytes)) return;
  die(`postcondition failed: ${rel(target)} differs from the projection of ${rel(sourceLabel)}.`);
}

function verifyTree(source, target) {
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(target, entry.name);
    if (entry.isDirectory()) verifyTree(from, to);
    else verifyFile(from, to);
  }
}

// --- main ---------------------------------------------------------------------

const FLAGS_TAKING_VALUE = new Set(["--root", "--from"]);
const positionals = [];
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--")) {
    if (FLAGS_TAKING_VALUE.has(arg)) i++;
    continue;
  }
  positionals.push(arg);
}

const office = resolveOffice(positionals[0]);
const node = resolveNode(positionals[1]);
const duties = resolveDuties(office);
const skills = findSkills(office, duties);
const claudeMd = findClaudeMd(office, duties, skills);

if (process.argv.includes("--clean")) {
  doClean(office, node);
} else if (process.argv.includes("--list")) {
  checkSkills(skills, office);
  doList(node, claudeMd, skills);
} else {
  checkSkills(skills, office);
  if (process.argv.includes("--reinstall")) doClean(office, node);
  doInstall(office, node, claudeMd, skills);
}
