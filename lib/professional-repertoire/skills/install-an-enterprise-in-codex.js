#!/usr/bin/env node
/**
 * @description Installs a whole enterprise into Codex: every office in the enterprise's roster becomes a project-scoped custom agent, a generated dispatcher block is spliced into AGENTS.md, and bounded dispatcher settings are spliced into .codex/config.toml. Use to make Codex operate a self-contained enterprise from its own offices, duties, skills, and pools; never use this as a shared runtime for another enterprise.
 * @param {string} root - (default: the working directory) Must contain the enterprise, so every path the block cites renders true.
 * @param {string} authority-root - Explicitly names the git worktree whose operated scope contains both the source enterprise and target node without crossing a checked-out submodule boundary.
 * @throws {Error} The enterprise path must hold an offices/ directory — its absence is an absence, not an empty enterprise.
 * @throws {Error} The roster must seat at least one office, each id in exactly one of the three record shapes.
 * @throws {Error} The node must exist and be a directory.
 * @throws {Error} The sibling installer must seat beside this script, or in the lib/management/skills pool of a unit at or above a projected copy.
 * @throws {Error} Every instrument the block cites must seat in the enterprise's skills pool.
 * @throws {Error} Every roster record must yield a first sentence for its roster line.
 * @throws {Error} The node's AGENTS.md, when present, must hold both markers or neither — a torn pair is refused.
 * @throws {Error} .codex/config.toml must parse as TOML, carry no conflicting unmanaged agents settings, and agree with the enterprise manifest about ownership of any generated agents block.
 * @throws {Error} Python 3.11 or newer must be available to provide the standard-library TOML parser.
 *
 * Once installed: every roster office is installed as an agent at the node
 * by the sibling installer, under its manifest discipline. The node's
 * AGENTS.md holds the generated block between the markers, byte-identical
 * to the projection, read back and checked. The rest of the node's
 * AGENTS.md outside the markers is byte-identical to what was there
 * before, and clean restores it byte-identically, guided by the splice
 * mode the manifest records. .codex/config.toml parses and holds the
 * generated agents block while every byte outside it is preserved, and
 * clean restores the prior file byte-identically. The node's enterprise
 * manifest records each office as it installs, and the block's splice
 * mode, so clean is exact even after a mid-roster failure.
 *
 * An enterprise install seats each office as a colleague a Codex dispatcher
 * can hand work to. installing-codex-as-an-agent realizes that one-office
 * relation; this skill seats the WHOLE ROSTER as
 * colleagues, and teaches the node's own sessions what to do with them: the
 * session at an enterprise node holds no office itself — it is the
 * dispatcher, and the standing block in its AGENTS.md is the whole of its
 * standing instruction.
 * It also projects the dispatcher boundary into `.codex/config.toml`:
 * `max_threads = 4`, `max_depth = 1`, and `interrupt_message = true`.
 * Those bytes are marker-bounded output under the enterprise manifest; the
 * node's MCP configuration and every other byte remain the node's own.
 *
 * The block is a deterministic projection of the enterprise's pools — same
 * enterprise, same root, same block, from any working directory, because
 * every path it cites renders relative to a root that is checked to contain
 * the enterprise. It fabricates no roster fact: the office that attestation
 * belongs to is read from the roster (the bearer of attesting-a-work-product),
 * and an enterprise that seats no such office is told exactly that — the
 * operator is the witness. The instruments it cites are cited with the
 * enterprise's own pools passed explicitly, so the commands are true for a
 * non-default enterprise, not only for the one this repository grew first.
 *
 * The agents are not installed here; they are installed by the sibling,
 * called once per office and never copied — found beside this script in the
 * flat pool, or by walking up to the lib/management/skills pool of the unit
 * a projected copy seats under. Its refusals are this skill's refusals,
 * propagated uncensored, and a mid-roster failure stops the install with
 * everything already installed recorded in the enterprise manifest, so
 * --clean sweeps the residue rather than stranding it.
 *
 * ## One block, both markers
 *
 * The block lands in <node>/AGENTS.md between
 * `<!-- installing-an-enterprise-in-codex: begin -->` and its end marker.
 * A file that does not exist is created holding only the block; a file
 * holding both markers has the block replaced in place, byte-exact, the
 * rest untouched; a file holding neither gets the block appended after one
 * separator newline. Which of the three happened is recorded in the
 * manifest as the block's splice mode, and clean undoes exactly that —
 * the separator is removed only when the splice added it, a created file
 * left holding nothing is removed, and a block spliced between pre-existing
 * markers is excised without touching a byte on either side. A file holding
 * ONE marker is a torn block — a contradiction to name, not a thing to
 * repair silently — and is refused.
 *
 * ## Run it
 *
 * ```sh
 * node .../install-an-enterprise-in-codex.js [<enterprise>] [<node>] --root <repo-root> --authority-root <git-worktree-root>
 * node .../install-an-enterprise-in-codex.js <enterprise> <node> --list --root <repo-root> --authority-root <git-worktree-root>
 * node .../install-an-enterprise-in-codex.js <enterprise> <node> --dry-run --root <repo-root> --authority-root <git-worktree-root>
 * node .../install-an-enterprise-in-codex.js <enterprise> <node> --clean --root <repo-root> --authority-root <git-worktree-root>
 * node .../install-an-enterprise-in-codex.js <enterprise> <node> --reinstall --root <repo-root> --authority-root <git-worktree-root>
 * ```
 * Every form also requires `--authority-root <git-worktree-root>`; it is
 * deliberately not defaulted from `--root`, because omission is not consent.
 *
 * <enterprise> is the enterprise's management library — a directory holding
 * an offices/ pool, with duties/, works/ and skills/ expected beside it —
 * defaulting to <node>/lib/management. <node> is the directory whose
 * sessions receive the enterprise, defaulting to the working directory.
 * Installs are recorded in <node>/.codex/.codex-enterprise-manifest, each
 * office as it installs, so that --clean is exact: it removes the block by
 * the recorded splice mode (the rest of the file byte-identical), delegates
 * --clean per manifest office to the sibling — or, for an office whose
 * record no longer seats in the roster, performs the sibling's exact
 * inverse here and says so, since the sibling refuses to resolve a record
 * that is gone — and removes the manifest. A manifest-less clean reports
 * that there is nothing to clean, which is a report, not an error; a dry
 * run of clean says what it would do, never that it did.
 *
 * Known limit, stated rather than hidden: a manifest written before the
 * splice mode was recorded carries a bare `AGENTS.md` line, and clean
 * degrades it to in-place — the non-destructive default, which touches no
 * byte outside the markers. An old separator-mode install cleaned through
 * such a manifest therefore leaves its one separator newline behind rather
 * than risk eating a byte that was never this mechanism's.
 *
 * ## One config block, exact ownership
 *
 * Dispatcher concurrency is output too. The installer parses the existing
 * `.codex/config.toml`, then seats one comment-marker-bounded `[agents]`
 * block carrying `max_threads = 4`, `max_depth = 1`, and
 * `interrupt_message = true`. Its `created`, `separator`, or `in-place`
 * splice mode is recorded as `config.toml:<mode>` in the same enterprise
 * manifest, and clean uses that fact to restore every pre-existing byte —
 * including every MCP setting — exactly.
 *
 * A marked config block and its manifest entry must agree. Markers without
 * ownership, ownership without markers, torn markers, invalid TOML, or an
 * unmanaged `[agents]` table/owned dotted key are refused before the first
 * office installer runs. An existing `[agents.<name>]` subtable and unrelated
 * settings are not this projection's property and remain untouched.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **No offices/ at the enterprise path** — refused. That is an absence,
 *   not an empty enterprise; installing from it would invent a roster.
 * - **A root that does not contain the enterprise** — refused. The block's
 *   cited paths render relative to the root, and a root that does not hold
 *   the enterprise would bake lies into the node's standing instruction.
 * - **An empty roster** — refused. An enterprise with no offices installs
 *   nothing, and an install that does nothing must say so rather than
 *   succeed.
 * - **A torn marker pair** — refused. One marker without the other is a
 *   contradiction in the node's own record of itself.
 * - **Conflicting or ownerless Codex config** — refused. This installer does
 *   not overwrite an unmanaged `[agents]` policy, claim unmanifested marker
 *   bytes, or proceed when its manifest claims a block that is absent.
 * - **A sibling installer failure** — fatal, stderr shown, the offices
 *   already installed left recorded so clean can sweep them. No partial
 *   success is reported as success.
 * - **A roster record yielding no sentence; a cited instrument seating
 *   nowhere** — refused. The block is a projection, and a projection that
 *   fabricates or cites what does not exist is a lie in the node's
 *   standing instruction.
 *
 * The question is always asked of the enterprise's pools, never of the
 * seated files: AGENTS.md between the markers and .codex/agents/ are
 * output. Hand-editing them cannot provoke a refusal — reinstalling over
 * the edit is the correction, which is why the edit belongs in the record.
 *
 * ## When NOT to use
 *
 * - Not for seating one office — that is installing-codex-as-an-agent.
 * - Not for authoring offices, duties, or skills — this installs what
 *   already exists.
 * - Not for editing the standing block. It is output: change the
 *   enterprise's records and reinstall.
 */

import { spawnSync as fsSpawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, mkdirSync as fsMkdirSync, rmSync as fsRmSync, statSync, writeFileSync as fsWriteFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(argValue("--root") ?? process.cwd());
const DRY_RUN = process.argv.includes("--dry-run");
const REINSTALL = process.argv.includes("--reinstall");

const BEGIN = "<!-- installing-an-enterprise-in-codex: begin -->";
const END = "<!-- installing-an-enterprise-in-codex: end -->";
const CONFIG_BEGIN = "# installing-an-enterprise-in-codex: agents begin";
const CONFIG_END = "# installing-an-enterprise-in-codex: agents end";
const CONFIG_BLOCK = [
  CONFIG_BEGIN,
  "[agents]",
  "max_threads = 4",
  "max_depth = 1",
  "interrupt_message = true",
  CONFIG_END,
  "",
].join("\n");

// The duty whose bearer the block names as the attesting office. Read from
// the roster, never assumed: an enterprise that seats no bearer is told so.
const ATTESTING_DUTY = "attesting-a-work-product";

// The instruments the standing block cites, each expected in the
// enterprise's skills pool. A block citing an instrument that seats nowhere
// is a lie in the node's standing instruction, so their existence is a
// precondition, not a hope.
const INSTRUMENTS = [
  "project-a-skill.js",
  "write-a-schema.js",
  "write-an-office.js",
  "make-a-task.js",
  "dispatch-a-task.js",
  "list-open-obligations.js",
];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function die(message) {
  console.error(`install-an-enterprise-in-codex: ${message}`);
  process.exit(1);
}

let revalidateMeshAuthority = () => {};

function meshRefusal(error) {
  const facts = error?.facts && Object.keys(error.facts).length ? `\n${JSON.stringify(error.facts)}` : "";
  die(`${error?.message ?? error}${facts}`);
}

function assertMeshAuthority() {
  try {
    revalidateMeshAuthority();
  } catch (error) {
    meshRefusal(error);
  }
}

// Every effect crosses this wrapper. The admission is installed before any
// wrapper can mutate the target, and is re-derived immediately beforehand.
function spawnSync(...args) { assertMeshAuthority(); return fsSpawnSync(...args); }
function mkdirSync(...args) { assertMeshAuthority(); return fsMkdirSync(...args); }
function rmSync(...args) { assertMeshAuthority(); return fsRmSync(...args); }
function writeFileSync(...args) { assertMeshAuthority(); return fsWriteFileSync(...args); }

function rel(p) {
  return relative(REPO_ROOT, p) || ".";
}

// Walk from the asking point UP, testing <D>/<shape> at each D — the same
// resolution as list-open-obligations.js's, because this script runs both
// flat in the pool and projected into a scripts/ directory two levels down.
function findUp(from, shape) {
  let d = from;
  for (;;) {
    const at = join(d, shape);
    if (existsSync(at)) return at;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

function resolveAuthorityGate() {
  const beside = join(HERE, "mesh-scope.js");
  if (existsSync(beside)) return beside;
  const projectedSibling = resolve(HERE, "../../enforcing-mesh-scope/scripts/mesh-scope.js");
  if (existsSync(projectedSibling)) return projectedSibling;
  let d = HERE;
  for (;;) {
    for (const shape of [
      "lib/management/skills/mesh-scope.js",
      "lib/management/skills/enforcing-mesh-scope/scripts/mesh-scope.js",
      "lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/mesh-scope.js",
      "lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/enforcing-mesh-scope/scripts/mesh-scope.js",
    ]) {
      const at = join(d, shape);
      if (existsSync(at)) return at;
    }
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  die("cannot find the shared mesh-scope authority gate — no enterprise install proceeds without the one firm-wide boundary rule");
}

async function admitMeshAuthority(enterprise, node, operation) {
  const authorityRoot = argValue("--authority-root");
  if (!authorityRoot || authorityRoot.startsWith("--")) {
    die("--authority-root is required; omission is not consent and no --force or free-text claim can replace target-local authority");
  }
  const gate = await import(pathToFileURL(resolveAuthorityGate()).href);
  try {
    const admission = gate.admitEnterpriseInstall({
      authorityRoot,
      sourceEnterprise: enterprise,
      targetNode: node,
      installer: "codex",
      operation,
      mode: DRY_RUN ? "dry-run" : "apply",
    });
    revalidateMeshAuthority = () => gate.revalidateEnterpriseInstall(admission);
    assertMeshAuthority();
    return admission.request;
  } catch (error) {
    meshRefusal(error);
  }
}

// --- the node and the enterprise --------------------------------------------------

function resolveNode(arg) {
  const dir = arg ? (isAbsolute(arg) ? arg : resolve(process.cwd(), arg)) : process.cwd();
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    die(`node '${arg}' is not a directory. The node is where the enterprise gets installed; it must already exist.`);
  }
  return dir;
}

function resolveEnterprise(arg, node) {
  const dir = arg ? (isAbsolute(arg) ? arg : resolve(REPO_ROOT, arg)) : join(node, "lib/management");
  if (!existsSync(rosterDirOf(dir)) || !statSync(rosterDirOf(dir)).isDirectory()) {
    die(
      `${rosterDirOf(dir)} does not exist — that is an absence, not an empty enterprise. ` +
        `An enterprise is a management library (<node>/lib/management) whose node seats its ` +
        `office instances in <node>/content/offices: classes and instruments in lib, instances in content.`,
    );
  }
  // Every path the block cites renders relative to the root; a root that
  // does not contain the enterprise would bake ../.. lies into the node's
  // standing instruction, differently from each working directory.
  const inside = relative(REPO_ROOT, dir);
  if (inside.startsWith("..") || isAbsolute(inside)) {
    die(
      `the root ${REPO_ROOT} does not contain the enterprise at ${dir} — the standing block cites paths ` +
        `relative to the root, and a root that does not hold the enterprise would bake lies into it. ` +
        `Pass --root as the repository root the enterprise seats under.`,
    );
  }
  return dir;
}

// --- the roster --------------------------------------------------------------------

// The enterprise is <node>/lib/management; its node's instances seat in
// <node>/content. The roster is content/offices — instances in content,
// classes and instruments in lib.
function rosterDirOf(enterprise) {
  return join(dirname(dirname(enterprise)), "content/offices");
}

// An office seats in the roster normatively as <id>.json — a plain instance
// of emsenn/schema/office. Legacy shapes (<id>.schema.json, <id>.md,
// <id>/<id>.md) are still read so a not-yet-normalized roster resolves. One
// id in two shapes is one name resolving to two records — refused, both named.
function roster(rosterDir) {
  const seats = new Map();
  const seat = (id, record) => {
    const prior = seats.get(id);
    if (prior) {
      die(`office '${id}' seats twice in ${rel(rosterDir)} — one name cannot resolve to two records:\n  ${rel(prior)}\n  ${rel(record)}`);
    }
    seats.set(id, record);
  };
  for (const entry of readdirSync(rosterDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const record = join(rosterDir, entry.name, `${entry.name}.md`);
      if (existsSync(record)) seat(entry.name, record);
      continue;
    }
    if (entry.name.endsWith(".schema.json")) seat(basename(entry.name, ".schema.json"), join(rosterDir, entry.name));
    else if (entry.name.endsWith(".json")) seat(basename(entry.name, ".json"), join(rosterDir, entry.name));
    else if (entry.name.endsWith(".md")) seat(basename(entry.name, ".md"), join(rosterDir, entry.name));
  }
  return [...seats.entries()].map(([id, record]) => ({ id, record })).sort((a, b) => a.id.localeCompare(b.id));
}

// --- reading the records, for the roster lines and the attesting office -------------

function readSpec(office) {
  if (office.spec) return office.spec;
  try {
    office.spec = JSON.parse(readFileSync(office.record, "utf8"));
  } catch (e) {
    die(`${rel(office.record)} is unreadable: ${e.message}`);
  }
  return office.spec;
}

function frontmatter(file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, "utf8"));
  return match ? match[1] : undefined;
}

// Reads `key: value` and the block-scalar forms (`key: >` / `key: |`), as
// the sibling installer reads them: frontmatter records are written by hand
// in both shapes, so both are read; folded lines join with spaces.
function frontmatterText(file, key) {
  const fm = frontmatter(file);
  if (!fm) return undefined;
  const block = new RegExp(`^${key}:[ \\t]*[>|][+-]?[ \\t]*\\r?\\n((?:[ \\t]+.*\\r?\\n?|[ \\t]*\\r?\\n)+)`, "m").exec(fm);
  if (block) {
    return block[1].split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
  }
  const scalar = new RegExp(`^${key}:[ \\t]*(.+)$`, "m").exec(fm);
  return scalar ? scalar[1].trim() : undefined;
}

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

function firstSentence(text) {
  const s = String(text ?? "").trim();
  return s ? s.split(/(?<=\.)\s/)[0] : "";
}

// The roster line's description: a canonical record's first sentence of
// normative-structure, or a frontmatter office's first sentence of
// description. A record that yields no sentence is refused — a roster line
// with no description delegates nothing.
function describe(office) {
  if (office.record.endsWith(".json")) {
    const spec = readSpec(office);
    if (spec.kind !== "office") {
      die(`${rel(office.record)} declares 'kind: ${spec.kind ?? "(nothing)"}' — refusing to install an enterprise around a non-office.`);
    }
    const sentence = firstSentence(spec["normative-structure"]);
    if (!sentence) die(`${rel(office.record)} yields no sentence — its normative-structure is empty, and a roster line with no description delegates nothing.`);
    return sentence;
  }
  const sentence = firstSentence(frontmatterText(office.record, "description"));
  if (!sentence) die(`${rel(office.record)} yields no sentence — it has no 'description:' in its frontmatter, and a roster line with no description delegates nothing.`);
  return sentence;
}

// A canonical office names its duties in bears-duty, each by full address;
// a frontmatter office names them bare in duties:. Same assignment
// mechanism, two spellings — the sibling installer's rule exactly.
function officeDuties(office) {
  if (office.record.endsWith(".json")) {
    const bears = readSpec(office)["bears-duty"];
    return (Array.isArray(bears) ? bears : []).map((a) => a.replace(/^emsenn\/duty\//, ""));
  }
  return frontmatterList(office.record, "duties");
}

// --- the standing block: a deterministic projection of the enterprise --------------

function renderBlock(enterprise, offices) {
  const skills = join(enterprise, "skills");
  for (const name of INSTRUMENTS) {
    if (!existsSync(join(skills, name))) {
      die(`the block cites ${rel(join(skills, name))}, which seats nowhere — a standing instruction citing a missing instrument is a lie.`);
    }
  }
  const instrument = (name) => rel(join(skills, name));
  // The attesting office is read from the roster, never assumed. An
  // enterprise that seats no bearer of the duty is told exactly that.
  const attesters = offices.filter((o) => officeDuties(o).includes(ATTESTING_DUTY)).map((o) => o.id);
  const content = join(dirname(dirname(enterprise)), "content");
  const verify = `node ${instrument("make-a-task.js")} --verify <task> --pool ${rel(join(content, "tasks"))} --root .`;
  const lines = [
    BEGIN,
    "# This node holds an enterprise",
    "",
    `The enterprise seats at \`${rel(enterprise)}\`. Every office on its roster is`,
    "installed at this node as a subagent — one file per office under `.codex/agents/` —",
    "and the session opened here holds NO office itself. It is the dispatcher: it decides",
    "where work goes, and it does not do the offices' work.",
    "",
    "## Classes and instances are never the same record",
    "",
    `A CLASS says what a kind of record must look like: one JSON Schema per type,`,
    `seated in \`${rel(join(dirname(dirname(enterprise)), "lib/schemas"))}/\` ($node/lib). An INSTANCE is a particular thing —`,
    `one office, one task, one dispatch — a plain \`<id>.json\` record seated in`,
    `\`${rel(content)}/<pool>/\` ($node/content), validated against its class and never`,
    "itself a schema. No record is ever both: an instance carries no `$schema` and",
    "no `$id`, and a class constrains records without being one. A term in the",
    "glossary is an instance too — a definition entry, not a schema.",
    "",
    "## The enterprise membrane",
    "",
    "Protocol scale is not interchangeable. A2A is the coordination face among offices",
    "and agents within this enterprise. ActivityPub is the messaging face between this",
    "sovereign enterprise and another one. Receiving an ActivityPub message may create",
    "local work only through this enterprise's own admission and authority; a sender",
    "never writes this enterprise's pools. No umbrella platform participates in this",
    "boundary; each required faculty is hired from its sovereign owner.",
    "",
    "## The delegation rule",
    "",
    "Work belongs to the office that owes it — delegate to the installed agent rather",
    "than doing an office's work at the root. And records are written by the",
    "enterprise's instruments, never by hand:",
    "",
    `- a skill is one flat script in \`${rel(skills)}/\`, projected by \`${instrument("project-a-skill.js")}\``,
    `- a class (schema) is written by \`${instrument("write-a-schema.js")}\``,
    `- an office by \`${instrument("write-an-office.js")}\``,
    `- a task by \`${instrument("make-a-task.js")}\``,
    `- a dispatch by \`${instrument("dispatch-a-task.js")}\``,
    "",
    "## The obligation loop",
    "",
    '"Fulfill the obligations of your office" resolves here with no other context:',
    "",
    "1. At session start, from the repository root, run",
    `   \`node ${instrument("list-open-obligations.js")} --pool ${rel(join(content, "dispatches"))} --root .\`.`,
    "   It reads the enterprise's dispatch board and derives which dispatches are",
    "   OPEN — a dispatch is open while its task's goal is unachieved, and achievement",
    "   is derived by re-running the goal, never read from any record.",
    "2. Work each open dispatch by delegating its task to the office named on the",
    "   dispatch.",
    ...(attesters.length
      ? [
          "3. The worker never verifies its own work. Attestation belongs to",
          `   ${attesters.join(", ")} (${ATTESTING_DUTY}), and`,
        ]
      : [
          "3. The worker never verifies its own work. This enterprise seats no office",
          `   bearing ${ATTESTING_DUTY} — the operator is the witness — and`,
        ]),
    `   \`${verify}\``,
    "   is the witness's instrument.",
    "",
    "## The roster",
    "",
    ...offices.map((office) => `- **${office.id}** — ${describe(office)}`),
    END,
  ];
  return lines.join("\n") + "\n";
}

// --- splicing the block into <node>/AGENTS.md ---------------------------------------

function markerIndices(text, file, begin = BEGIN, end = END) {
  const b = text.indexOf(begin);
  const e = text.indexOf(end);
  if ((b === -1) !== (e === -1)) {
    die(`${rel(file)} holds one marker of the pair and not the other — a torn block is a contradiction to name, not a thing to repair silently.`);
  }
  if (b !== -1 && (text.indexOf(begin, b + 1) !== -1 || text.indexOf(end, e + 1) !== -1)) {
    die(`${rel(file)} holds a marker of the pair more than once — one block, one pair; anything else is a contradiction to name.`);
  }
  if (b !== -1 && e < b) {
    die(`${rel(file)} holds its end marker before its begin marker — a torn block is a contradiction to name, not a thing to repair silently.`);
  }
  return { b, e };
}

// Three splice modes, and the mode is a fact the manifest records so that
// clean undoes exactly what the splice did: "created" (the file is the
// block), "separator" (one newline was added, then the block), "in-place"
// (the block replaced a block between markers that were already there, and
// no byte on either side is this mechanism's to touch).
function spliceBlock(file, block, begin = BEGIN, end = END) {
  if (!existsSync(file)) return { next: block, mode: "created" };
  const text = readFileSync(file, "utf8");
  const { b, e } = markerIndices(text, file, begin, end);
  if (b === -1) return { next: text + "\n" + block, mode: "separator" };
  let tail = e + end.length;
  if (text[tail] === "\n") tail++;
  return { next: text.slice(0, b) + block + text.slice(tail), mode: "in-place" };
}

// The inverse, by recorded mode. Returns null when no block is present.
function removeBlock(text, file, mode, begin = BEGIN, end = END) {
  const { b, e } = markerIndices(text, file, begin, end);
  if (b === -1) return null;
  let tail = e + end.length;
  if (text[tail] === "\n") tail++;
  let head = b;
  if (mode === "separator" && head > 0 && text[head - 1] === "\n") head--;
  return text.slice(0, head) + text.slice(tail);
}

// --- manifest: what this mechanism installed here, so clean is exact ----------------

function manifestPath(node) {
  return join(node, ".codex/.codex-enterprise-manifest");
}

function readManifest(node) {
  const file = manifestPath(node);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
}

function writeManifest(node, entries) {
  mkdirSync(dirname(manifestPath(node)), { recursive: true });
  writeFileSync(manifestPath(node), [...entries].sort().map((e) => `${e}\n`).join(""));
}

function isBlockEntry(entry) {
  return entry === "AGENTS.md" || entry.startsWith("AGENTS.md:");
}

function isConfigEntry(entry) {
  return entry === "config.toml" || entry.startsWith("config.toml:");
}

// One entry recorded the moment its fact is true — each office AS it
// installs, the block AS it splices — so a mid-roster failure leaves a
// manifest that names exactly the residue, and clean can sweep it.
function recordInManifest(node, entry) {
  const entries = readManifest(node).filter((e) =>
    isBlockEntry(entry) ? !isBlockEntry(e) : isConfigEntry(entry) ? !isConfigEntry(e) : e !== entry,
  );
  writeManifest(node, [...entries, entry]);
}

// Python's standard-library parser is the dependency-free TOML authority
// available to this Node script. Parsing is a precondition before any office
// write and a checked postcondition after config projection; a regex is used
// only for ownership conflicts after syntax has already settled.
function parseToml(text, file, phase) {
  const source = "import sys,tomllib\ntomllib.loads(sys.stdin.read())\n";
  const r = spawnSync("python3", ["-c", source], { input: text, encoding: "utf8" });
  if (r.error) {
    die(`${phase}: cannot invoke Python 3.11+ to parse ${rel(file)}: ${r.error.message}`);
  }
  if (r.status !== 0) {
    die(`${phase}: ${rel(file)} is not valid TOML: ${(r.stderr || r.stdout || "parser exited without a diagnostic").trim()}`);
  }
}

function configPath(node) {
  return join(node, ".codex/config.toml");
}

// Read and settle config ownership before a sibling installer is allowed to
// write. Markers without a manifest entry are somebody else's bytes; a
// manifest entry without markers is a stale ownership claim. Neither is
// repaired silently.
function configState(node) {
  const file = configPath(node);
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (existsSync(file)) parseToml(text, file, "precondition failed");
  const indices = markerIndices(text, file, CONFIG_BEGIN, CONFIG_END);
  const entry = readManifest(node).find(isConfigEntry);
  if (indices.b !== -1 && !entry) {
    die(`${rel(file)} holds a generated agents block that the enterprise manifest does not own — refusing to overwrite unmanaged bytes.`);
  }
  if (indices.b === -1 && entry) {
    die(`${rel(manifestPath(node))} claims '${entry}' but ${rel(file)} holds no generated agents block — ownership state is contradictory.`);
  }
  return { file, text, indices, entry };
}

function prepareConfig(node) {
  const state = configState(node);
  if (state.indices.b === -1) {
    const unmanagedTable = /^[ \t]*\[agents\][ \t]*(?:#.*)?$/mu.test(state.text);
    const unmanagedOwnedKey = /^[ \t]*agents\.(?:max_threads|max_depth|interrupt_message)[ \t]*=/mu.test(state.text);
    if (unmanagedTable || unmanagedOwnedKey) {
      die(
        `${rel(state.file)} already declares unmanaged agents settings that conflict with this enterprise's ` +
          `generated [agents] block — refusing to overwrite or duplicate them.`,
      );
    }
  }
  const spliced = spliceBlock(state.file, CONFIG_BLOCK, CONFIG_BEGIN, CONFIG_END);
  parseToml(spliced.next, state.file, "projected config refused");
  const priorMode = state.entry?.split(":")[1];
  const mode = spliced.mode === "in-place" && priorMode ? priorMode : spliced.mode;
  return { ...state, next: spliced.next, mode };
}

// --- the sibling installer: called, never copied ------------------------------------

const SIBLING_SHAPE = "install-codex-as-an-agent.js";

function resolveSibling() {
  const beside = join(HERE, SIBLING_SHAPE);
  if (existsSync(beside)) return beside;
  let d = HERE;
  for (;;) {
    for (const shape of [
      join("lib/management/skills", SIBLING_SHAPE),
      join("lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills", SIBLING_SHAPE),
    ]) {
      const pooled = join(d, shape);
      if (existsSync(pooled)) return pooled;
    }
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  die(
    `cannot find the sibling installer (${SIBLING_SHAPE}) beside this script or in the enterprise's ` +
      `lib/management/skills pool — this skill calls installing-codex-as-an-agent rather than copying it, ` +
      `including when the whole-enterprise entrypoint is installed under a harness skills directory.`,
  );
}

function spawnSibling(sibling, officeArg, node, flags, doing, motion) {
  const args = [sibling, officeArg, node, "--root", REPO_ROOT, ...flags];
  const r = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (r.status !== 0) {
    // The sweep sentence cites the manifest, and under a dry run nothing was
    // recorded — a witness must not cite a manifest that is not there.
    const sweep =
      motion === "install" && !DRY_RUN
        ? " Offices already installed are recorded in the enterprise manifest, so --clean can sweep them."
        : "";
    die(
      `the sibling installer exited ${r.status ?? `without a status (${r.error?.message ?? "spawn failed"})`} ${doing} — ` +
        `the ${motion} stops here; no partial success is reported as success.${sweep}`,
    );
  }
}

// --- the motions ---------------------------------------------------------------------

function agentTarget(node, id) {
  return join(node, ".codex/agents", `${id}.toml`);
}

function doList(enterprise, node, offices) {
  for (const office of offices) {
    console.log(`agent\t${rel(office.record)}\t->\t${rel(agentTarget(node, office.id))}`);
  }
  console.log(`config\t${rel(enterprise)}\t->\t${rel(configPath(node))}`);
  console.log(`block\t${rel(enterprise)}\t->\t${rel(join(node, "AGENTS.md"))}`);
}

function doInstall(enterprise, node, offices, sibling) {
  // Every local refusal fires before the first sibling spawn: a refused
  // install leaves the node untouched. A mid-roster sibling failure is the
  // one interruption after side effects begin, and the manifest — written
  // office by office below — is what keeps that sweepable.
  const block = renderBlock(enterprise, offices);
  const agentsMd = join(node, "AGENTS.md");
  const { next, mode } = spliceBlock(agentsMd, block);
  const config = prepareConfig(node);

  const flags = [...(REINSTALL ? ["--reinstall"] : []), ...(DRY_RUN ? ["--dry-run"] : [])];
  for (const office of offices) {
    spawnSibling(sibling, office.record, node, flags, `installing office '${office.id}' into ${rel(node)}`, "install");
    if (!DRY_RUN) recordInManifest(node, office.id);
  }

  if (DRY_RUN) {
    console.log(
      `install-an-enterprise-in-codex: dry run — would splice dispatcher settings into ${rel(config.file)}, ` +
        `splice the standing block into ${rel(agentsMd)}, ` +
        `and record ${offices.length} offices in ${rel(manifestPath(node))}.`,
    );
    return;
  }

  mkdirSync(dirname(config.file), { recursive: true });
  writeFileSync(config.file, config.next);
  recordInManifest(node, `config.toml:${config.mode}`);
  console.log(`  spliced  ${rel(config.file)}  (${rel(enterprise)}, mode ${config.mode})`);

  writeFileSync(agentsMd, next);
  // A re-splice between markers a PRIOR install placed must keep the prior
  // splice's recorded mode: the separator fact belongs to the first splice,
  // and clean undoes the first splice, not the latest.
  const prior = readManifest(node).find(isBlockEntry);
  const recordedMode = mode === "in-place" && prior ? (prior.split(":")[1] ?? "in-place") : mode;
  recordInManifest(node, `AGENTS.md:${recordedMode}`);
  console.log(`  spliced  ${rel(agentsMd)}  (${rel(enterprise)}, mode ${recordedMode})`);

  // Postcondition, checked rather than assumed: the block between the
  // markers is byte-identical to the projection, and every agent file exists.
  const readBack = readFileSync(agentsMd, "utf8");
  if (readBack.indexOf(block) === -1 || readBack.indexOf(block) !== readBack.lastIndexOf(block)) {
    die(`postcondition failed: the block in ${rel(agentsMd)} is not byte-identical to the projection of ${rel(enterprise)}.`);
  }
  for (const office of offices) {
    if (!existsSync(agentTarget(node, office.id))) {
      die(`postcondition failed: ${rel(agentTarget(node, office.id))} does not exist after install.`);
    }
  }
  const configReadBack = readFileSync(config.file, "utf8");
  parseToml(configReadBack, config.file, "postcondition failed");
  if (
    configReadBack.indexOf(CONFIG_BLOCK) === -1 ||
    configReadBack.indexOf(CONFIG_BLOCK) !== configReadBack.lastIndexOf(CONFIG_BLOCK)
  ) {
    die(`postcondition failed: the agents block in ${rel(config.file)} is not byte-identical to the projection of ${rel(enterprise)}.`);
  }

  console.log(
    `install-an-enterprise-in-codex: installed enterprise ${rel(enterprise)} into ${rel(node)} — ` +
      `${offices.length} offices, one dispatcher config block, one standing block.`,
  );
}

// A directory this mechanism (or its sibling) created and then emptied by
// its own removals is removed too — an empty `agents/` or `.codex/` left
// behind is residue exactly like a stray file; a directory still holding
// something this mechanism did not put there is left untouched.
function removeIfEmptyDir(dir) {
  if (!existsSync(dir)) return;
  if (readdirSync(dir, { withFileTypes: true }).length === 0) rmSync(dir, { recursive: true, force: true });
}

// The sibling refuses to clean an office whose record seats nowhere — its
// resolver runs before its clean, and there is nothing left to resolve. Its
// install is exactly two facts at the node: the agent file, and the office's
// line in the sibling's manifest. The inverse is done here, and said so.
function cleanRetired(node, id, would) {
  const siblingManifest = join(node, ".codex/.codex-agent-manifest");
  if (!DRY_RUN) {
    rmSync(agentTarget(node, id), { force: true });
    if (existsSync(siblingManifest)) {
      const rest = readFileSync(siblingManifest, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((e) => e !== id);
      // A manifest holding no entries is removed rather than left behind as
      // a zero-byte witness — the same rule the sibling applies itself.
      if (rest.length) writeFileSync(siblingManifest, rest.sort().map((e) => `${e}\n`).join(""));
      else rmSync(siblingManifest, { force: true });
    }
    removeIfEmptyDir(join(node, ".codex/agents"));
  }
  console.log(
    `  ${would}  agents/${id}.toml — office '${id}' seats nowhere in the roster any more, ` +
      `so the sibling's install is inverted here rather than through it.`,
  );
}

function doClean(enterprise, node, sibling) {
  const config = configState(node);
  if (!existsSync(manifestPath(node))) {
    console.log(`install-an-enterprise-in-codex: no enterprise manifest at ${rel(node)} — nothing to clean.`);
    return;
  }
  const entries = readManifest(node);
  const seated = new Map(roster(rosterDirOf(enterprise)).map((o) => [o.id, o.record]));
  const would = DRY_RUN ? "dry run — would remove" : "removed";

  const blockEntry = entries.find(isBlockEntry);
  const configEntry = entries.find(isConfigEntry);
  if (configEntry) {
    const configMode = configEntry.split(":")[1] ?? "in-place";
    const remaining = removeBlock(config.text, config.file, configMode, CONFIG_BEGIN, CONFIG_END);
    // configState already proved that an owned entry has markers, so null here
    // would mean the file changed during this invocation.
    if (remaining === null) {
      die(`postcondition failed: the generated agents block disappeared from ${rel(config.file)} during clean.`);
    }
    if (remaining !== "") parseToml(remaining, config.file, "clean refused");
    if (!DRY_RUN) {
      if (configMode === "created" && remaining === "") rmSync(config.file);
      else writeFileSync(config.file, remaining);
    }
    console.log(`  ${would}  agents config from ${rel(config.file)}  (mode ${configMode})`);
  }

  const agentsMd = join(node, "AGENTS.md");
  if (blockEntry && existsSync(agentsMd)) {
    const mode = blockEntry.split(":")[1] ?? "in-place";
    const remaining = removeBlock(readFileSync(agentsMd, "utf8"), agentsMd, mode);
    if (remaining === null) {
      console.log(`  the block is already absent from ${rel(agentsMd)} — nothing to remove there.`);
    } else {
      if (!DRY_RUN) {
        if (mode === "created" && remaining === "") rmSync(agentsMd);
        else writeFileSync(agentsMd, remaining);
      }
      console.log(`  ${would}  block from ${rel(agentsMd)}  (mode ${mode})`);
    }
  }

  const flags = ["--clean", ...(DRY_RUN ? ["--dry-run"] : [])];
  for (const id of entries.filter((e) => !isBlockEntry(e) && !isConfigEntry(e))) {
    if (seated.has(id)) {
      spawnSibling(sibling, seated.get(id), node, flags, `cleaning office '${id}' from ${rel(node)}`, "clean");
    } else {
      cleanRetired(node, id, would);
    }
  }

  if (!DRY_RUN) {
    rmSync(manifestPath(node), { force: true });
    // Residue check, not a fresh removal: every file this mechanism and its
    // sibling wrote is already gone by this point, so this only fires when
    // that leaves `.codex/agents` and `.codex` holding nothing of anyone
    // else's — a directory still holding a foreign entry is left alone.
    removeIfEmptyDir(join(node, ".codex/agents"));
    removeIfEmptyDir(join(node, ".codex"));
  }
  console.log(
    DRY_RUN
      ? `install-an-enterprise-in-codex: dry run — would clean enterprise ${rel(enterprise)} from ${rel(node)}.`
      : `install-an-enterprise-in-codex: cleaned enterprise ${rel(enterprise)} from ${rel(node)}.`,
  );
}

// --- main ------------------------------------------------------------------------------

const FLAGS_TAKING_VALUE = new Set(["--root", "--authority-root"]);
const BOOLEAN_FLAGS = new Set(["--list", "--dry-run", "--clean", "--reinstall"]);
const positionals = [];
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--")) {
    if (FLAGS_TAKING_VALUE.has(arg)) {
      if (!process.argv[i + 1] || process.argv[i + 1].startsWith("--")) die(`${arg} requires a value`);
      i++;
    } else if (!BOOLEAN_FLAGS.has(arg)) {
      die(`unknown option '${arg}' — authority cannot be widened by an unruled flag`);
    }
    continue;
  }
  positionals.push(arg);
}

if (process.argv.filter((arg) => arg === "--authority-root").length !== 1) {
  die("--authority-root must be supplied exactly once");
}
for (const flag of FLAGS_TAKING_VALUE) {
  if (process.argv.filter((arg) => arg === flag).length > 1) die(`${flag} must not be supplied more than once`);
}
if (positionals.length > 2) die(`unexpected positional argument '${positionals[2]}' — free text is not an authority claim`);
if (process.argv.includes("--reinstall") && (process.argv.includes("--clean") || process.argv.includes("--list"))) {
  die("--reinstall cannot be combined with --clean or --list; one admission binds one exact operation");
}

let node = resolveNode(positionals[1]);
let enterprise = resolveEnterprise(positionals[0], node);
const operation = process.argv.includes("--clean")
  ? "clean"
  : process.argv.includes("--list")
    ? "list"
    : REINSTALL
      ? "reinstall"
      : "install";
const admittedRequest = await admitMeshAuthority(enterprise, node, operation);
enterprise = admittedRequest.sourceEnterprise;
node = admittedRequest.targetNode;
const sibling = resolveSibling();

if (process.argv.includes("--clean")) {
  doClean(enterprise, node, sibling);
} else {
  const offices = roster(rosterDirOf(enterprise));
  if (offices.length === 0) {
    die(
      `the roster at ${rel(rosterDirOf(enterprise))} is empty — an enterprise with no offices installs nothing, ` +
        `and an install that does nothing must say so rather than succeed.`,
    );
  }
  if (process.argv.includes("--list")) {
    doList(enterprise, node, offices);
  } else {
    doInstall(enterprise, node, offices, sibling);
  }
}
assertMeshAuthority();
