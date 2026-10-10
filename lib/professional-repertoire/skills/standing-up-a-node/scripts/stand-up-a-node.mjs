#!/usr/bin/env node
// stand-up-a-node — seat a new node: its own repo, its manifest, its submodule.
//
// A node is a submodule. It owns its own history, it is private by default, and
// it is an ESM Node package, so its lib/ is tracked in its own repo rather than
// in whatever superrepo happens to hold it today. Standing one up is therefore
// five acts that must all land or none: init the repo, write the manifest, make
// the directories, publish the remote, register the submodule. A node that is a
// directory here and a repo nowhere is not a node.
//
// Every unit in this tree carries the same subdirectory vocabulary, and that
// sameness is not tidiness: it is what makes NEAREST resolution well-defined at
// every altitude. "Walk from the asking point up to the root testing
// D/lib/schemas/<term>.md at each D" only means something because
// every D has the same shape. A node stood up by hand with a slightly different
// shape does not fail loudly — it fails as an unanswerable question, later.
//
// This is the act every other mechanism in this layer assumes has happened.
// commission-a-record writes into a pool; install-claude-as-an-officer walks for
// one; both find pools by looking for a directory of that name. Nothing made the
// directory. Until this file that was `mkdir`, typed by a person, and the tree
// shows it: five management pools at four altitudes in two vocabularies.
//
// Closure-kind: process. No branching on surprise: every unmet precondition
// exits non-zero with the reason. Identical input produces an identical node.
//
// Input is JSON on stdin. Output is a JSON receipt on stdout. Never prose.
//
//   echo '{"path":"lib/emsenn/.../thing","description":"…","owns":["lib"]}' \
//     | stand-up-a-node.mjs [--dry-run]

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const REPO_ROOT = argValue("--root") ?? process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");

// The seven directories a unit may own, and the whole vocabulary. This IS the
// template: a node cannot acquire a top-level directory outside this set by
// typo, because a typo is how `work/governance/staff/offices/` and
// `lib/management/offices/` became two homes for one kind of record.
//
//   lib/       what the unit has        (characters, management pools, shared libs)
//   services/  the units under it
//   src/       its own code             (apps/, services/, _archive/)
//   sites/     its deployed properties
//   content/   its corpus               (glossary/, documents/)
//   work/      its governance
//   data/      its settlement root      (journals/, lexicon/, rulings/, terms/, work/)
const OWNABLE = new Set(["lib", "services", "src", "sites", "content", "work", "data"]);

// An id is kebab-case everywhere in this layer — management/schemas/*.json all
// carry "^[a-z0-9]+(-[a-z0-9]+)*$" for recordId. A node's name is the same kind
// of name and must be, because the node's basename is what a record inside it
// resolves against.
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

// Exit codes carry the result algebra rather than collapsing it to 1. The
// contract every skill in this pool declares is: a settled outcome, or a
// first-class error — ⊥ absence, or ⊤ contradiction. Reporting both as `1`
// throws away the half of the answer that says which one happened.
const OK = 0;
const USAGE = 2;
const BOTTOM = 3; // ⊥ — something that must exist does not
const TOP = 4; // ⊤ — the world contradicted an assumption

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function fail(code, error, extra = {}) {
  process.stdout.write(JSON.stringify({ ok: false, error, ...extra }, null, 2) + "\n");
  process.exit(code);
}

function run(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

// A command that is allowed to fail, because its failure is an answer. Used only
// where the non-zero exit IS the information — `git ls-files` on an untracked
// path, `gh repo view` on a repo that does not exist yet.
function ask(command, args, cwd) {
  try {
    return { ok: true, out: run(command, args, cwd) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}`.trim() };
  }
}

// A guard's question, answered in three values and never in two.
//
// This exists because the two-valued version failed OPEN and stood up
// red-cup-engineering during a test that was supposed to refuse it. The check
// was `git ls-files --error-unmatch <RCE>`, which prints every tracked file
// beneath its argument — 71,431 of them — and blew execFileSync's 1MB buffer.
// The catch swallowed the ENOBUFS and returned "non-zero", the caller read
// non-zero as "not tracked", and the script proceeded to write a manifest and
// git init a repo inside a directory it was built to protect.
//
// The defect was not the buffer. It was that `false` meant both "git says no"
// and "git never ran". A guard that cannot tell those apart is not a guard: it
// answers "no" when it means "I don't know", and "no" is the permissive answer.
//
// So: `ran` is whether the question was asked at all, and only a caller holding
// `ran: true` may believe `ok`. An unasked question fails closed.
function guard(command, args, cwd) {
  try {
    execFileSync(command, args, { cwd, stdio: ["ignore", "ignore", "ignore"] });
    return { ran: true, ok: true };
  } catch (e) {
    // A number here means the process ran and exited non-zero, which is an
    // answer. No status means it never ran — spawn failure, ENOBUFS, signal —
    // which is not.
    if (typeof e.status === "number") return { ran: true, ok: false };
    return { ran: false, reason: e.message };
  }
}

// Every package.json in the tree, by the name it declares. Walked rather than
// listed: `git ls-files` cannot see inside a submodule, and a node IS a
// submodule, so a name check driven by the superrepo's index would be blind to
// exactly the nodes most likely to collide.
function declaredNames(root) {
  const names = new Map();
  const walk = (dir, depth) => {
    if (depth > 8) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name.startsWith("_archive")) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path, depth + 1);
      else if (entry.name === "package.json") {
        try {
          const declared = JSON.parse(readFileSync(path, "utf8")).name;
          if (typeof declared === "string" && !names.has(declared)) names.set(declared, path);
        } catch {
          // A manifest that will not parse is not this script's to diagnose.
        }
      }
    }
  };
  walk(join(root, "lib"), 0);
  return names;
}

function readInput() {
  let raw;
  try {
    raw = readFileSync(0, "utf8").trim();
  } catch {
    fail(USAGE, "no stdin — this stands up a node from data, never from prose");
  }
  if (!raw) fail(USAGE, "no data on stdin — this stands up a node from data, never from prose");
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(USAGE, `stdin is not JSON: ${e.message}`);
  }
}

// package.json's shape is npm's contract, not this firm's, which is why this
// script may own it while commission-a-record may not own a record's shape.
// There is no node.schema.json to load, and inventing one would put a firm
// schema in front of a foreign standard that already has one.
//
// type: module because a node is an ESM Node package by default. private: true
// because a node is private by default; publishing is a later, separate act,
// and a manifest that omits it defaults to publishable.
//
// The description says what the node IS. Not what it is positioned against:
// huidu-guanli's manifest said it was the corpus "that the 561 Group's offices
// are defined against", which was framing prose, which nothing could check, and
// which was read back later as if it were evidence.
function manifestOf(name, description, keywords) {
  return {
    name: `@union-officer-academy/${name}`,
    version: "0.1.0",
    private: true,
    type: "module",
    description,
    ...(keywords === undefined ? {} : { keywords }),
    license: "UNLICENSED",
  };
}

function main() {
  const input = readInput();

  const declaredPath = input.path;
  if (typeof declaredPath !== "string" || !declaredPath) fail(USAGE, "data has no 'path'");

  const description = input.description;
  if (typeof description !== "string" || !description) {
    fail(USAGE, "data has no 'description' — a node whose manifest cannot say what it is has not been stood up, it has been mkdir'd");
  }

  const keywords = input.keywords;
  if (keywords !== undefined && (!Array.isArray(keywords) || keywords.some((k) => typeof k !== "string"))) {
    fail(USAGE, "'keywords' must be a list of strings");
  }

  const owns = input.owns ?? [];
  if (!Array.isArray(owns) || owns.some((o) => typeof o !== "string")) {
    fail(USAGE, "'owns' must be a list of strings");
  }

  // The node's own path, confined to the superrepo. A node outside the tree is
  // not a node of the tree, and `..` is how a caller stands somewhere it did not
  // mean to stand.
  const root = resolve(REPO_ROOT);
  const nodePath = resolve(root, declaredPath);
  if (nodePath !== root && !nodePath.startsWith(`${root}${sep}`)) {
    fail(USAGE, `path '${declaredPath}' resolves outside the repo root`);
  }

  // The name is the basename, derived and never supplied. Asking for both is
  // asking the caller to agree with itself, and every record type in this layer
  // settles this the same way: id equals the record's basename.
  const name = basename(nodePath);
  if (!KEBAB.test(name)) {
    fail(USAGE, `node name '${name}' is not kebab-case — the whole resolution model is by name, and a name that cannot be an id cannot be resolved against`);
  }

  // A remote name is not derivable from a node's filesystem seat. It is
  // supplied, defaulting to the node name, and never guessed.
  const repo = input.repo ?? name;
  if (typeof repo !== "string" || !repo) fail(USAGE, "'repo' must be a non-empty string");

  for (const owned of owns) {
    const segments = owned.split("/").filter((s) => s.length > 0);
    if (segments.length === 0) fail(USAGE, "'owns' contains an empty path");
    if (segments.some((s) => s === "." || s === "..")) {
      fail(USAGE, `owns '${owned}' contains a relative segment — a node owns what is under it, never what is beside it`);
    }
    if (!OWNABLE.has(segments[0])) {
      fail(USAGE, `owns '${owned}' opens with '${segments[0]}', which is not one of the seven a unit may own: ${[...OWNABLE].join(", ")}`);
    }
    for (const s of segments) {
      if (!KEBAB.test(s)) fail(USAGE, `owns '${owned}' has segment '${s}', which is not kebab-case`);
    }
  }

  // ⊥ — the parent must exist. A node under nothing is seated nowhere, and
  // resolution from inside it would walk up into a tree that does not hold it.
  const parent = dirname(nodePath);
  if (!existsSync(parent)) {
    fail(BOTTOM, `the parent '${relative(root, parent)}' does not exist — a node is stood up under a node, never in the air`);
  }

  // ⊤ — a node that already carries a manifest is already stood up. Refused,
  // never overwritten, exactly as commission-a-record refuses an existing record.
  const manifestPath = join(nodePath, "package.json");
  if (existsSync(manifestPath)) {
    fail(TOP, `${relative(root, nodePath)} already carries a package.json — it is already a node, and this refuses rather than overwrites`);
  }
  if (existsSync(nodePath) && !statSync(nodePath).isDirectory()) {
    fail(TOP, `${relative(root, nodePath)} exists and is not a directory`);
  }

  // ⊤ — the superrepo cannot already be tracking content here. `git submodule
  // add` refuses a path that is already in the index, and it is right to: the
  // superrepo and the node's own repo would both claim the same history.
  //
  // Converting an ALREADY-TRACKED directory into a submodule is a different act
  // from standing up a new one. It means `git rm -r --cached` on live history,
  // and it is destructive in a way this process must not perform as a side
  // effect of a create. That act needs its own skill and its own consent.
  const tracked = guard("git", ["ls-files", "--error-unmatch", "--", relative(root, nodePath)], root);
  if (!tracked.ran) {
    fail(BOTTOM, `cannot ask git whether ${relative(root, nodePath)} is already tracked: ${tracked.reason} — refusing, because an unasked question is not a 'no'`);
  }
  if (tracked.ok) {
    fail(TOP, `the superrepo already tracks content at ${relative(root, nodePath)} — this stands up a NEW node and will not convert tracked history into a submodule, which needs 'git rm -r --cached' and its own consent`);
  }

  // ⊤ — the package name must be unclaimed. Two nodes named `management` at two
  // altitudes derive one `@union-officer-academy/management`, and unlike a record id — where a
  // nearer seat shadowing a farther one IS the rule working — a package name has
  // no standpoint to be resolved from. It is one global namespace, and two
  // manifests claiming it is a collision rather than a scope.
  const claimed = declaredNames(root).get(`@union-officer-academy/${name}`);
  if (claimed !== undefined) {
    fail(TOP, `@union-officer-academy/${name} is already declared by ${relative(root, claimed)} — a package name is one namespace with no standpoint to resolve from, so this is a collision, not a shadow. Name the node something its package name can keep.`);
  }

  // ⊥ — gh must be authed before anything is written. Discovering it at the push
  // is discovering it after the repo exists locally and the manifest is on disk,
  // which is the half-node this refuses to leave.
  const auth = ask("gh", ["auth", "status"], root);
  if (!auth.ok) fail(BOTTOM, `gh is not authenticated, so the node could be created and never published: ${auth.out}`);

  const owner = ask("gh", ["api", "user", "--jq", ".login"], root);
  if (!owner.ok) fail(BOTTOM, `cannot read the authenticated gh user: ${owner.out}`);
  const slug = `${owner.out}/${repo}`;

  // ⊤ — the remote must not already exist. Pushing into an existing repo would
  // graft this node onto someone else's history.
  //
  // The same three-valued discipline the tracked check owes: `gh repo view`
  // exits non-zero both when the repo does not exist and when github cannot be
  // reached, and only the first is permission to create. An unreachable github
  // read as "it isn't there" is how a create proceeds on a guess.
  const exists = ask("gh", ["repo", "view", slug, "--json", "name"], root);
  if (exists.ok) fail(TOP, `${slug} already exists on github — refused, never pushed into`);
  if (!/could not resolve to a repository|not found/iu.test(exists.out)) {
    fail(BOTTOM, `cannot tell whether ${slug} exists — gh failed for a reason other than the repo being absent: ${exists.out}`);
  }

  const manifest = manifestOf(name, description, keywords);
  const manifestText = JSON.stringify(manifest, null, 2) + "\n";
  const directories = owns.map((owned) => join(nodePath, owned));

  if (DRY_RUN) {
    process.stdout.write(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          would: {
            stand: relative(root, nodePath),
            name: manifest.name,
            repo: `${slug} (private)`,
            mkdir: directories.map((d) => relative(root, d)),
            acts: [
              `git init -b main ${relative(root, nodePath)}`,
              "write package.json",
              "git add -A && git commit",
              `gh repo create ${slug} --private --source . --push`,
              `git submodule add <url> ${relative(root, nodePath)}`,
            ],
          },
        },
        null,
        2,
      ) + "\n",
    );
    process.exit(OK);
  }

  mkdirSync(nodePath, { recursive: true });
  writeFileSync(manifestPath, manifestText);
  for (const directory of directories) mkdirSync(directory, { recursive: true });

  // The node's own repo. Its lib/ is tracked here, in the node's history, which
  // is the whole point of a node being a submodule rather than a directory.
  run("git", ["init", "-b", "main"], nodePath);
  run("git", ["add", "-A"], nodePath);
  run("git", ["commit", "-m", `Stand up ${name}`], nodePath);

  run("gh", ["repo", "create", slug, "--private", "--source", ".", "--push"], nodePath);
  const url = run("gh", ["repo", "view", slug, "--json", "url", "--jq", ".url"], root);

  run("git", ["submodule", "add", `${url}.git`, relative(root, nodePath)], root);

  // The postcondition is checked, not assumed. The write is not the standing-up;
  // reading back a node that is a repo, a package, and a submodule is.
  const failures = [];
  const back = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : undefined;
  if (back !== manifestText) failures.push("package.json does not read back byte-identical");
  for (const directory of directories) {
    if (!existsSync(directory) || !statSync(directory).isDirectory()) {
      failures.push(`${relative(root, directory)} was not created`);
    }
  }
  const entry = ask("git", ["ls-files", "-s", relative(root, nodePath)], root);
  if (!entry.ok || !entry.out.startsWith("160000")) {
    failures.push(`the superrepo does not record ${relative(root, nodePath)} as a submodule (git ls-files -s: ${entry.out || "nothing"})`);
  }
  const modules = ask("git", ["config", "--file", ".gitmodules", "--get", `submodule.${relative(root, nodePath)}.url`], root);
  if (!modules.ok) failures.push(".gitmodules gained no entry for this node");
  const head = ask("git", ["rev-parse", "HEAD"], nodePath);
  if (!head.ok) failures.push("the node's own repo has no commit");

  if (failures.length) {
    // Not withdrawn automatically: by this point a remote exists and history has
    // been pushed, and deleting a published repo to tidy a failed postcondition
    // is a larger act than the one that failed. The half-node is reported whole
    // so the operator can decide, which is the loud failure a process owes.
    fail(TOP, `${relative(root, nodePath)} was stood up but does not read back clean: ${failures.join("; ")}`, {
      withdrawn: false,
      remote: slug,
    });
  }

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        stood: { node: relative(root, nodePath), name: manifest.name, repo: slug, url, private: true },
        owns: directories.map((d) => relative(root, d)),
      },
      null,
      2,
    ) + "\n",
  );
  process.exit(OK);
}

main();
