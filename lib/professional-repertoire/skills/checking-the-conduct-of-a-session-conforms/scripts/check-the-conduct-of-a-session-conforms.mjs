#!/usr/bin/env node
// Checks that a session's conduct comes under the enterprise's own governance,
// mechanically, from the three sources the requirement names: the dispatch
// board (--records), the commit trail (--commits), and session transcripts
// (--transcripts). No mode flag runs all three; the verdict is their
// conjunction. Realizes emsenn/requirement/session-conduct-comes-under-
// governance-2.
//
// Exit codes, one contract across every mode:
//   0 — every evaluated lens conforms
//   3 — ran clean, at least one evaluated lens found a real fault
//   2 — usage error (bad flag, named path does not exist)
//   1 — a lens could not run to completion at all (missing tool, no git,
//       no transcripts directory) — never silently read as conformance
// Precedence when more than one lens is evaluated: unresolved (1) beats
// fault (3) beats clean (0) — a lens that could not run is never masked by
// one that happened to pass.
//
// records lens — a record is treated as instrument-emitted iff it validates
// against the term an instrument would have checked before writing it (every
// writing instrument in this tree refuses on a failed validation, so a
// record that fails could only have reached the pool by being hand-authored
// around the instrument) and its filename agrees with its own $id. This is a
// proxy for provenance, not an observation of it — stated as one. Walks the
// dispatch, task, work-item, and requirement pools; the office, duty, and
// work pools are deliberately left to checking-the-offices-of-a-firm-conform,
// which already owns that ground.
//
// commits lens — two checks, both real, neither requiring a citation
// convention that would have to already exist in this repo's past to hold
// today (none does): (a) every changed path outside the board pools must be
// traceable, by path containment, to a reference token drawn from some
// currently OPEN dispatch's task (its goal commands, its work-item ids) — a
// changed path answering to no open dispatch at all is a fault, not "the
// board happens to be nonempty"; (b) any commit message citing an
// emsenn/dispatch/* or emsenn/task/* token must resolve to a seated record —
// a dangling citation is a fault. This lens can genuinely fault today if
// real work in the tree does not yet trace to anything open — that is a
// true readout, not a bug in the check.
//
// transcripts lens — Claude Code writes one JSONL transcript per session
// under ~/.claude/projects/<root-path-with-/-as-->/<session-id>.jsonl, and a
// session the operator interrupted mid-turn carries a literal
// "[Request interrupted by user]" text block. The lens derives a count from
// the current session's own transcript (CLAUDE_CODE_SESSION_ID) or, failing
// that, every transcript in the project directory. It conforms once a count
// is derivable — the cell asks that it DERIVES, not that it holds any
// particular value.
//
// --fixture <dir> substitutes <dir>/{dispatches,tasks,work-items,
// requirements} for the real pools, for the RECORDS lens only — commits and
// transcripts have nothing to point at in a static fixture directory and are
// reported skipped rather than silently passed over nothing.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
function has(flag) {
  return process.argv.includes(flag);
}
function usageError(message) {
  console.error(`check-the-conduct-of-a-session-conforms: ${message}`);
  process.exit(2);
}

const ROOT_ARG = argValue("--root");
if (!ROOT_ARG) usageError("--root is required");
const REPO_ROOT = resolve(ROOT_ARG);
if (!existsSync(REPO_ROOT)) usageError(`--root '${ROOT_ARG}' does not exist`);

const FIXTURE_ARG = argValue("--fixture");
let FIXTURE_DIR = null;
if (FIXTURE_ARG) {
  FIXTURE_DIR = resolve(FIXTURE_ARG);
  if (!existsSync(FIXTURE_DIR)) usageError(`--fixture '${FIXTURE_ARG}' does not exist`);
}

const POOL_ARG = argValue("--pool");
const DISPATCH_POOL = POOL_ARG ? resolve(POOL_ARG) : join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/state/dispatches");
const TASK_POOL = join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/state/tasks");
const READ_A_SCHEMA = fileURLToPath(import.meta.resolve("@red-cup-engineering/json-schema-services-section/read-a-schema"));
const LIST_OPEN_OBLIGATIONS = join(REPO_ROOT, "lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/list-open-obligations.js");

const MODE_FLAGS = ["records", "commits", "transcripts"].filter((m) => has(`--${m}`));
const REQUESTED = MODE_FLAGS.length ? MODE_FLAGS : ["records", "commits", "transcripts"];

// ── records lens ─────────────────────────────────────────────────────────
const RECORD_POOLS = FIXTURE_DIR
  ? [
      { dir: join(FIXTURE_DIR, "dispatches"), term: "dispatch", idPrefix: "emsenn/dispatch/" },
      { dir: join(FIXTURE_DIR, "tasks"), term: "task", idPrefix: "emsenn/task/" },
      { dir: join(FIXTURE_DIR, "work-items"), term: "work-item", idPrefix: "emsenn/work-item/" },
      { dir: join(FIXTURE_DIR, "requirements"), term: "requirement", idPrefix: "emsenn/requirement/" },
    ]
  : [
      { dir: DISPATCH_POOL, term: "dispatch", idPrefix: "emsenn/dispatch/" },
      { dir: TASK_POOL, term: "task", idPrefix: "emsenn/task/" },
      { dir: join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/state/work-items"), term: "work-item", idPrefix: "emsenn/work-item/" },
      { dir: join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/records/requirements"), term: "requirement", idPrefix: "emsenn/requirement/" },
    ];

function walkSchemaFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkSchemaFiles(p));
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(p);
  }
  return out;
}

function runRecordsLens() {
  const findings = [];
  const fromArg = join(REPO_ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management");
  let scanned = 0;
  for (const pool of RECORD_POOLS) {
    for (const file of walkSchemaFiles(pool.dir)) {
      scanned += 1;
      const label = relative(REPO_ROOT, file);
      let raw;
      try {
        raw = readFileSync(file, "utf8");
      } catch (e) {
        findings.push(`${label}: unreadable — ${e.message}`);
        continue;
      }
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        findings.push(`${label}: not valid JSON — ${e.message} — no instrument emits broken JSON`);
        continue;
      }
      const result = spawnSync("node", [READ_A_SCHEMA, pool.term, "--from", fromArg], {
        input: raw,
        encoding: "utf8",
        timeout: 30_000,
      });
      if (result.error) {
        findings.push(`${label}: could not run read-a-schema.js — ${result.error.message}`);
        continue;
      }
      let verdict = null;
      try {
        verdict = JSON.parse(result.stdout);
      } catch {
        /* verdict stays null, reported below */
      }
      if (!verdict || verdict.ok !== true) {
        const errs = verdict?.errors?.join("; ") ?? result.stderr.trim() ?? "no readable verdict from read-a-schema.js";
        findings.push(`${label}: fails ${pool.term} — ${errs} — not instrument-emitted`);
      }
      const expectedId = basename(file, ".json");
      if (typeof data.id === "string" && data.id !== expectedId) {
        findings.push(`${label}: id is '${data.id}', expected '${expectedId}' — filename and id disagree`);
      }
    }
  }
  if (scanned === 0 && !FIXTURE_DIR) {
    findings.push(`no records found under any of ${RECORD_POOLS.map((p) => relative(REPO_ROOT, p.dir)).join(", ")} — an empty board is not a clean board`);
  }
  return { lens: "records", ran: true, conforms: findings.length === 0, findings, scanned };
}

// ── commits lens ─────────────────────────────────────────────────────────
const BOARD_DIRS = [
  "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/state/dispatches",
  "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/state/tasks",
  "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/state/work-items",
  "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/duties",
  "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/records/works",
  "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/offices",
  "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas",
  "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/records/requirements",
];
function isBoardPath(p) {
  return BOARD_DIRS.some((d) => p === d || p.startsWith(`${d}/`));
}
function git(args) {
  return spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env, PATH: `/home/emsenn/.local/bin:${process.env.PATH ?? "/usr/bin:/bin"}` },
  });
}

function changedNonBoardPaths() {
  const seen = new Set();
  const status = git(["status", "--porcelain"]);
  if (status.error) return { error: status.error.message };
  for (const line of status.stdout.split("\n")) {
    const m = line.match(/^..\s+(.*)$/);
    if (!m) continue;
    let p = m[1].trim().replace(/^"|"$/g, "");
    if (p.includes(" -> ")) p = p.split(" -> ")[1];
    if (!isBoardPath(p)) seen.add(p);
  }
  const lastCommit = git(["show", "--name-only", "--pretty=format:", "HEAD"]);
  if (!lastCommit.error && lastCommit.status === 0) {
    for (const line of lastCommit.stdout.split("\n")) {
      const p = line.trim();
      if (p && !isBoardPath(p)) seen.add(p);
    }
  }
  return { paths: [...seen] };
}

const GENERIC_TOKENS = new Set(["lib/emsenn", "."]);

function openDispatchReferenceTokens() {
  const result = spawnSync(
    "node",
    [LIST_OPEN_OBLIGATIONS, "--pool", DISPATCH_POOL, "--root", REPO_ROOT],
    { encoding: "utf8", timeout: 240_000, maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.error) return { error: result.error.message };
  let data;
  try {
    data = JSON.parse(result.stdout);
  } catch (e) {
    return { error: `list-open-obligations.js did not return JSON: ${e.message}` };
  }
  const byDispatch = [];
  for (const o of data.open ?? []) {
    const refs = new Set();
    const taskPath = join(TASK_POOL, `${o.task}.json`);
    if (existsSync(taskPath)) {
      const task = JSON.parse(readFileSync(taskPath, "utf8"));
      const strings = [...(task.goal ?? []), ...(task["work-items"] ?? []).map(String)];
      for (const s of strings) {
        for (const token of s.match(/[.\w-]+(?:\/[.\w-]+)+/g) ?? []) {
          const clean = token.replace(/^\.\//, "");
          if (!GENERIC_TOKENS.has(clean) && clean.split("/").length >= 2) refs.add(clean);
        }
      }
    }
    byDispatch.push({ dispatch: o.dispatch, task: o.task, refs: [...refs] });
  }
  return { byDispatch };
}

function tracesToOpenDispatch(path, byDispatch) {
  for (const d of byDispatch) {
    for (const ref of d.refs) {
      if (path === ref || path.startsWith(`${ref}/`) || ref.startsWith(`${path}/`)) return d.dispatch;
    }
  }
  return null;
}

function danglingCitations() {
  const log = git(["log", "--format=%B"]);
  if (log.error) return { error: log.error.message };
  const tokens = new Set(log.stdout.match(/emsenn\/(?:dispatch|task)\/[a-z0-9-]+/g) ?? []);
  const findings = [];
  for (const tok of tokens) {
    const [, kind, id] = tok.match(/^emsenn\/(dispatch|task)\/(.+)$/);
    const pool = kind === "dispatch" ? DISPATCH_POOL : TASK_POOL;
    if (!existsSync(join(pool, `${id}.json`))) {
      findings.push(`commit message cites '${tok}', which resolves to no seated record`);
    }
  }
  return { findings };
}

function unresolved(lens, reason) {
  return { lens, ran: true, unresolved: true, conforms: null, findings: [reason] };
}

function runCommitsLens() {
  const changed = changedNonBoardPaths();
  if (changed.error) return unresolved("commits", `git status/show could not run: ${changed.error}`);
  const refs = openDispatchReferenceTokens();
  if (refs.error) return unresolved("commits", `list-open-obligations.js could not run: ${refs.error}`);
  const dangling = danglingCitations();
  if (dangling.error) return unresolved("commits", `git log could not run: ${dangling.error}`);

  const findings = [];
  const openNames = refs.byDispatch.map((d) => d.dispatch).join(", ") || "(none open)";
  for (const path of changed.paths) {
    if (!tracesToOpenDispatch(path, refs.byDispatch)) {
      findings.push(`${path}: changed, but traces to no currently open dispatch — open dispatches: ${openNames}`);
    }
  }
  findings.push(...dangling.findings);
  return { lens: "commits", ran: true, conforms: findings.length === 0, findings };
}

// ── transcripts lens ─────────────────────────────────────────────────────
function runTranscriptsLens() {
  const escaped = REPO_ROOT.replace(/\//g, "-");
  const projectDir = join(homedir(), ".claude", "projects", escaped);
  if (!existsSync(projectDir)) return unresolved("transcripts", `no transcripts directory at ${projectDir}`);

  const sessionId = process.env.CLAUDE_CODE_SESSION_ID;
  let files;
  if (sessionId && existsSync(join(projectDir, `${sessionId}.jsonl`))) {
    files = [join(projectDir, `${sessionId}.jsonl`)];
  } else {
    files = readdirSync(projectDir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => join(projectDir, f));
  }
  if (files.length === 0) return unresolved("transcripts", `no .jsonl transcripts found in ${projectDir}`);

  let totalLines = 0;
  let parsedLines = 0;
  let interrupts = 0;
  for (const file of files) {
    let raw;
    try {
      raw = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      totalLines += 1;
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      parsedLines += 1;
      const content = entry?.message?.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (block?.type === "text" && typeof block.text === "string" && /^\[Request interrupted by user/.test(block.text)) {
          interrupts += 1;
        }
      }
    }
  }
  if (parsedLines === 0) return unresolved("transcripts", `${files.length} transcript file(s) found, but zero lines parsed as JSON`);
  return {
    lens: "transcripts",
    ran: true,
    conforms: true,
    findings: [],
    derived: { files: files.map((f) => relative(projectDir, f)), totalLines, parsedLines, interrupts },
  };
}

// ── run, report, exit ────────────────────────────────────────────────────
const results = [];
for (const lens of REQUESTED) {
  if (FIXTURE_DIR && lens !== "records") {
    results.push({ lens, ran: false, conforms: true, findings: [], note: "--fixture only substitutes the records lens; not evaluated" });
    continue;
  }
  if (lens === "records") results.push(runRecordsLens());
  if (lens === "commits") results.push(runCommitsLens());
  if (lens === "transcripts") results.push(runTranscriptsLens());
}

console.log(`session conduct check — root: ${REPO_ROOT}`);
if (FIXTURE_DIR) console.log(`  fixture: ${FIXTURE_DIR} (records lens only)`);
for (const r of results) {
  const tag = !r.ran ? "SKIPPED" : r.unresolved ? "UNRESOLVED" : r.conforms ? "CONFORMS" : "FAULT";
  console.log(`  [${tag}] ${r.lens}`);
  if (r.note) console.log(`      ${r.note}`);
  for (const f of r.findings ?? []) console.log(`      - ${f}`);
  if (r.derived) console.log(`      derived: ${JSON.stringify(r.derived)}`);
}

const evaluated = results.filter((r) => r.ran);
const anyUnresolved = evaluated.some((r) => r.unresolved);
const anyFault = evaluated.some((r) => !r.unresolved && !r.conforms);
const exitCode = evaluated.length === 0 ? 2 : anyUnresolved ? 1 : anyFault ? 3 : 0;

const verdictText =
  exitCode === 0
    ? "CONFORMS"
    : exitCode === 3
      ? "FAULT — nonconformity found"
      : exitCode === 1
        ? "UNRESOLVED — a lens could not run to completion"
        : "USAGE ERROR — nothing was evaluated";
console.log(`\nVERDICT: ${verdictText} (exit ${exitCode})`);
process.exit(exitCode);
