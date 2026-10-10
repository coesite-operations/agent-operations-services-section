#!/usr/bin/env node
/**
 * @description Reads Claude Code session transcripts (~/.claude/projects/<escaped-root>/<session-id>.jsonl) and emits one emsenn/schema/movement record per main-chain session turn — session id, turn index, kind, the timestamp the transcript entry itself carries, the verbatim prompt for a genuine human turn, a sha256 digest plus bounded excerpt of an assistant turn's reply text, token usage as the transcript reported it, and tool acts by name and count — writing only into the unit's data/movements pool (day-bucketed JSONL), never rewriting or deleting a seated record. Use to make a session's own generated data (prompts, replies, token costs, tool counts) into swept, schema-validated records instead of leaving it to scroll past in a terminal and vanish.
 *
 * @param {string} session - Names a transcript file that exists, when given.
 * @throws {Error} Refuses unless a project transcripts directory exists at --project-dir, or is derivable by escaping --root's path under ~/.claude/projects.
 * @throws {Error} Refuses unless emsenn/schema/movement is seated and reachable through read-a-schema.js from --from.
 *
 * Every record this sweep writes validates against emsenn/schema/movement through read-a-schema.js before it is written, never after. A record already seated at <id>.json is never rewritten or deleted; a re-sweep only adds ids not yet seated. Every field derived from a transcript entry — session id, turn index, kind, at, prompt, reply digest, usage, tool acts — is a pure function of that entry's own bytes, never of the wall clock at sweep time.
 *
 * ## Turn, kind, and what is excluded
 *
 * A "turn" is one JSONL line whose `type` is `user` or `assistant`, carrying
 * a `message`, with `isSidechain` false or absent — a main-chain entry. This
 * EXCLUDES: `queue-operation`, `last-prompt`, `ai-title`, `attachment`, and
 * `file-history-*` lines (none of these carry a turn's own content); and
 * excludes sidechain entries, which belong to a subagent transcript recorded
 * separately under `<session-id>/subagents/*.jsonl` — a distinct resource
 * this sweep does not open in this seating, named here rather than silently
 * folded in, since claiming to sweep "the session" while skipping every
 * subagent turn inside it would be exactly the kind of substitution this
 * office exists against. Widening to subagent transcripts is a future
 * sweep, not a silent scope change made unannounced in this one.
 *
 * `turn-index` is the 0-based position among a session's own turns, counted
 * in the transcript's own append order — never re-sorted by timestamp, so a
 * transcript that somehow carried out-of-order clock stamps still yields a
 * stable index. `kind` is derived, never asserted by the entry itself:
 *
 *   - `assistant` — `type: "assistant"`.
 *   - `human`     — `type: "user"`, `origin.kind === "human"`: a person
 *                   actually typed this.
 *   - `task-notification` — `type: "user"`, `origin.kind === "task-notification"`:
 *                   a background agent's completion notice.
 *   - `tool-result` — `type: "user"`, content holding a `tool_result` block:
 *                   the harness's own reply to a tool call, standing in for
 *                   a person's turn in the same role slot the API uses.
 *   - `other`     — none of the above matched; named rather than folded in.
 *
 * ## What each field is built from, and why
 *
 * `prompt` (kind: human only) is every `text`-type content block's own text,
 * in order, joined by a blank line — or the content string verbatim when the
 * entry carries one directly. Never summarized, never truncated: a person's
 * own words are the one field this sweep must not touch.
 *
 * `reply` (kind: assistant only) digests the assistant's `text`-type blocks
 * only — NOT `thinking` blocks, which are the model's internal reasoning
 * rather than its reply, and NOT `tool_use` blocks, which are counted
 * separately under `tool-acts`. sha256 over that joined text, plus a
 * deterministic prefix (first @excerpt-chars UTF-16 code units) as a bounded
 * excerpt — bounded because a movement record is a readout of a turn, not a
 * second copy of the transcript that produced it.
 *
 * `usage` copies only the fields the transcript entry's own `message.usage`
 * actually reports (`input_tokens`, `output_tokens`,
 * `cache_creation_input_tokens`, `cache_read_input_tokens`) — a field the
 * entry did not carry is omitted, never zero-filled, since zero and absent
 * are different facts about what the API reported.
 *
 * `tool-acts` counts `tool_use` blocks in the turn by tool name, sorted by
 * name for determinism, omitted entirely for a turn that invoked none.
 *
 * `at` is the entry's own `timestamp` field, verbatim — never
 * `new Date()` at sweep time. A turn whose entry carries no timestamp is
 * counted toward `turn-index` (so later ids stay stable) but held back from
 * writing, named in `no-timestamp`, since `at` is required and this sweep
 * does not invent one.
 *
 * ## Determinism and the append-only pool
 *
 * Byte-identical transcript bytes yield byte-identical records: `id` is
 * `<session-id>-<turn-index>`, both drawn from the entry itself, so a
 * re-sweep derives the same id for the same turn every time. A record
 * already seated in the `data/movements` day bucket is left untouched — this
 * sweep only ever ADDS ids not yet seated, matching the pool's own
 * append-only rule, and never rewrites or deletes.
 *
 * ## Run it
 *
 * ```sh
 * node .../sweep-the-movements.js --from lib/emsenn                       # most recent session, real write
 * node .../sweep-the-movements.js --from lib/emsenn --dry-run             # derive only, write nothing
 * node .../sweep-the-movements.js --from lib/emsenn --session <uuid>      # one named session
 * node .../sweep-the-movements.js --from lib/emsenn --limit 3             # 3 most-recently-modified sessions
 * node .../sweep-the-movements.js --from lib/emsenn --project-dir <dir>   # name the transcripts dir directly
 * node .../sweep-the-movements.js --from lib/emsenn --root /home/emsenn/info  # escape a different repo root
 * ```
 *
 * `--from` (default: the caller's working directory) is where the movements
 * pool and emsenn/schema/movement are resolved from, by the same up-walk
 * every sibling in this pool uses: nearest ancestor carrying `content/` (or
 * `lib/management/`) is the unit, and its `data/movements` is where a
 * record is written, created on first write; `--pool` names that pool
 * directly and wins outright. `--root` (default: the caller's working
 * directory) is the repository root whose path is escaped
 * (`/` -> `-`) to find `~/.claude/projects/<escaped>/`; `--project-dir`
 * names that transcripts directory directly and wins outright.
 *
 * Without `--session`, the `--limit` (default 1) most-recently-modified
 * `.jsonl` files directly in the project directory are swept — deliberately
 * bounded, per the raiser's own words ("as long as we're not being stupid
 * about how we'll fill up the disk space"): a first seating proves the pipe
 * over one session, not all of them at once. `--session <id>` sweeps
 * exactly that transcript and ignores `--limit`.
 *
 * ## When NOT to use
 *
 * - Not to sweep subagent transcripts. Those are a distinct, unopened
 *   resource in this seating (see above) — widening scope to them is a
 *   change to what this instrument covers, decided and made deliberately,
 *   not discovered as a side effect of running it.
 * - Not to sweep every session at once by default. `--limit` exists so a
 *   wider sweep is an explicit choice, never the default footprint.
 * - Not to decide what a movement record MEANS. This derives data; judging
 *   what it says about the firm's own coordination is a different office's
 *   work, done over the pool this sweep fills.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { appendDataRecord, dataDir, recordDate } from "./resolve-an-identifier.js";

const EXCERPT_CHARS = 240;

const HERE = dirname(fileURLToPath(import.meta.url));
const FROM = argValue("--from") ?? process.cwd();
const ROOT = argValue("--root") ?? process.cwd();
const DRY_RUN = process.argv.includes("--dry-run") || process.argv.includes("--check");
const POOL_OVERRIDE = argValue("--pool");
const PROJECT_DIR_OVERRIDE = argValue("--project-dir");
const SESSION_ARG = argValue("--session");
const LIMIT = Number(argValue("--limit") ?? 1);

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

const die = (message) => out({ ok: false, error: message }, 1);

if (process.argv.includes("--help")) {
  process.stdout.write(
    [
      "Usage:",
      "  node sweep-the-movements.js --from <unit>                    # most recent session",
      "  node sweep-the-movements.js --from <unit> --dry-run          # derive only",
      "  node sweep-the-movements.js --from <unit> --session <uuid>   # one session",
      "  node sweep-the-movements.js --from <unit> --limit <n>        # n most recent sessions",
      "  node sweep-the-movements.js --help",
      "",
      "Output is JSON.",
    ].join("\n") + "\n",
  );
  process.exit(0);
}

// ── resolution ─────────────────────────────────────────────────────────────
// Walk from the asking point UP, testing <D>/<shape> at each D. Nearest wins,
// neighbours or upward, never downward — the same discipline read-a-schema.js
// and write-a-schema.js use, and for the same reason.
function findUp(from, shape) {
  let d = resolve(from);
  for (;;) {
    const at = join(d, shape);
    if (existsSync(at)) return at;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

// The unit boundary: nearest ancestor carrying content/ or lib/management/.
function findUnitRoot(from) {
  let d = resolve(from);
  for (;;) {
    if (existsSync(join(d, "content")) || existsSync(join(d, "lib/management"))) return d;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

// read-a-schema.js is a sibling script, found rather than imported — this
// script travels as one file, flat, exactly like the sibling it calls.
function findSkill(flatName, from) {
  const beside = join(HERE, flatName);
  if (existsSync(beside)) return beside;
  const pooled = findUp(from, join("lib/management/skills", flatName));
  if (pooled) return pooled;
  let d = resolve(from);
  for (;;) {
    const projected = join(d, ".claude/skills");
    if (existsSync(projected)) {
      for (const entry of readdirSync(projected)) {
        const at = join(projected, entry, "scripts", flatName);
        if (existsSync(at)) return at;
      }
    }
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

const UNIT_ROOT = findUnitRoot(FROM) ?? findUnitRoot(HERE);
if (!UNIT_ROOT) {
  die(`⊥ no unit at or above ${FROM} — nothing carries content/ or lib/management/. Pass --pool to name the movements pool directly.`);
}
// Movements are the quintessential write-once log — one line per session
// turn — so per the Chairperson's content/data/lib rule they seat as
// data/, day-bucketed by each record's own `at` timestamp.
const MOVEMENTS_POOL = POOL_OVERRIDE ? resolve(POOL_OVERRIDE) : dataDir(UNIT_ROOT, "movements");

const READER = findSkill("read-a-schema.js", FROM);
if (!READER) {
  die("⊥ cannot find read-a-schema.js — the one validator. Nothing is derived without it.");
}

// ── the transcripts directory ────────────────────────────────────────────
const PROJECT_DIR = PROJECT_DIR_OVERRIDE
  ? resolve(PROJECT_DIR_OVERRIDE)
  : join(homedir(), ".claude", "projects", resolve(ROOT).replace(/\//g, "-"));

if (!existsSync(PROJECT_DIR)) {
  die(`⊥ no transcripts directory at ${PROJECT_DIR} — pass --project-dir to name one, or --root to derive a different one.`);
}

function sessionFiles() {
  if (SESSION_ARG) {
    const path = join(PROJECT_DIR, `${SESSION_ARG}.jsonl`);
    if (!existsSync(path)) die(`⊥ --session '${SESSION_ARG}' names no transcript at ${path}`);
    return [path];
  }
  const all = readdirSync(PROJECT_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => join(PROJECT_DIR, f));
  if (all.length === 0) die(`⊥ no .jsonl transcripts in ${PROJECT_DIR}`);
  // Most-recently-modified first; a bounded default, never every session.
  const withMtime = all.map((p) => ({ p, mtime: statSync(p).mtimeMs }));
  withMtime.sort((a, b) => b.mtime - a.mtime || (a.p < b.p ? -1 : a.p > b.p ? 1 : 0));
  const n = Number.isInteger(LIMIT) && LIMIT > 0 ? LIMIT : 1;
  return withMtime.slice(0, n).map((x) => x.p);
}

// ── turn extraction ──────────────────────────────────────────────────────
function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n\n");
  }
  return "";
}

function kindOf(entry) {
  if (entry.type === "assistant") return "assistant";
  const originKind = entry.origin?.kind;
  if (originKind === "human") return "human";
  if (originKind === "task-notification") return "task-notification";
  const content = entry.message?.content;
  if (Array.isArray(content) && content.some((b) => b && b.type === "tool_result")) return "tool-result";
  return "other";
}

function toolActsOf(content) {
  if (!Array.isArray(content)) return [];
  const counts = new Map();
  for (const b of content) {
    if (b && b.type === "tool_use" && typeof b.name === "string") {
      counts.set(b.name, (counts.get(b.name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, count]) => ({ name, count }));
}

function usageOf(message) {
  const u = message?.usage;
  if (!u || typeof u !== "object") return undefined;
  const usage = {};
  if (typeof u.input_tokens === "number") usage["input-tokens"] = u.input_tokens;
  if (typeof u.output_tokens === "number") usage["output-tokens"] = u.output_tokens;
  if (typeof u.cache_creation_input_tokens === "number") usage["cache-creation-tokens"] = u.cache_creation_input_tokens;
  if (typeof u.cache_read_input_tokens === "number") usage["cache-read-tokens"] = u.cache_read_input_tokens;
  return Object.keys(usage).length ? usage : undefined;
}

function recordFor(entry, sessionId, turnIndex) {
  const kind = kindOf(entry);
  const id = `${sessionId}-${turnIndex}`;
  const record = {
    id,
    name: `${kind} turn ${turnIndex} of session ${sessionId}`,
    "session-id": sessionId,
    "turn-index": turnIndex,
    kind,
    at: entry.timestamp,
  };
  if (kind === "human") {
    record.prompt = textOf(entry.message?.content);
  }
  if (kind === "assistant") {
    const text = textOf(entry.message?.content);
    record.reply = {
      sha256: createHash("sha256").update(text, "utf8").digest("hex"),
      excerpt: [...text].slice(0, EXCERPT_CHARS).join(""),
    };
    const usage = usageOf(entry.message);
    if (usage) record.usage = usage;
    const acts = toolActsOf(entry.message?.content);
    if (acts.length) record["tool-acts"] = acts;
  }
  return record;
}

function validates(record) {
  const probe = spawnSync(process.execPath, [READER, "movement", "--from", FROM], {
    input: JSON.stringify(record),
    encoding: "utf8",
  });
  let verdict = null;
  try {
    verdict = JSON.parse(probe.stdout);
  } catch {
    return { ok: false, errors: [(probe.stderr || probe.stdout || "read-a-schema.js returned nothing parseable").trim()] };
  }
  return { ok: verdict.ok === true, errors: verdict.errors ?? [] };
}

// ── sweep ─────────────────────────────────────────────────────────────────
// Each record's own `at` deterministically names the one day-file it seats
// in, so "already seated" is checked against that one file's ids, cached
// per date rather than re-read per record.
const seatedIdsByDate = new Map();
function seatedIdsFor(dateStr) {
  if (seatedIdsByDate.has(dateStr)) return seatedIdsByDate.get(dateStr);
  const [y, m, d] = dateStr.split("-");
  const file = join(MOVEMENTS_POOL, y, m, d, `${dateStr}-movements.jsonl`);
  const ids = new Set();
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        ids.add(JSON.parse(line).id);
      } catch {
        // an unparseable line here is settle-the-evidence's problem to
        // report, not this sweep's to skip past silently mid-write
      }
    }
  }
  seatedIdsByDate.set(dateStr, ids);
  return ids;
}

const sessions = [];
for (const file of sessionFiles()) {
  const raw = readFileSync(file, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim() !== "");

  let turnIndex = 0;
  let sessionId = null;
  let written = 0;
  let alreadySeated = 0;
  const invalid = [];
  const noTimestamp = [];
  const wouldWrite = [];

  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // an unparseable line carries no turn to count
    }
    const isTurn = (entry.type === "user" || entry.type === "assistant") && entry.message && (entry.isSidechain === false || entry.isSidechain === undefined);
    if (!isTurn) continue;

    sessionId = sessionId ?? entry.sessionId ?? file.replace(/\.jsonl$/u, "").split("/").pop();
    const index = turnIndex;
    turnIndex += 1;

    if (!entry.timestamp) {
      noTimestamp.push(`${sessionId}-${index}`);
      continue;
    }

    const record = recordFor(entry, sessionId, index);
    const dateStr = recordDate(record); // record.at, always present past the no-timestamp guard above
    const dayIds = seatedIdsFor(dateStr);
    if (dayIds.has(record.id)) {
      alreadySeated += 1;
      continue;
    }

    const verdict = validates(record);
    if (!verdict.ok) {
      invalid.push({ id: record.id, errors: verdict.errors });
      continue;
    }

    if (DRY_RUN) {
      wouldWrite.push(record.id);
      continue;
    }

    const { file } = appendDataRecord(MOVEMENTS_POOL, "movements", record);
    const lastLine = readFileSync(file, "utf8").trimEnd().split("\n").pop();
    let back;
    try {
      back = JSON.parse(lastLine);
    } catch (e) {
      invalid.push({ id: record.id, errors: [`written but did not read back as JSON: ${e.message}`] });
      continue;
    }
    if (JSON.stringify(back) !== JSON.stringify(record)) {
      invalid.push({ id: record.id, errors: [`written but did not read back identical to what was appended`] });
      continue;
    }
    dayIds.add(record.id);
    written += 1;
  }

  sessions.push({
    file: relative(PROJECT_DIR, file),
    "session-id": sessionId,
    "scanned-turns": turnIndex,
    written,
    "already-seated": alreadySeated,
    invalid,
    "no-timestamp": noTimestamp,
    ...(DRY_RUN ? { "would-write": wouldWrite } : {}),
  });
}

const totals = sessions.reduce(
  (acc, s) => {
    acc.written += s.written;
    acc["already-seated"] += s["already-seated"];
    acc.invalid += s.invalid.length;
    acc["no-timestamp"] += s["no-timestamp"].length;
    if (DRY_RUN) acc["would-write"] += s["would-write"].length;
    return acc;
  },
  { written: 0, "already-seated": 0, invalid: 0, "no-timestamp": 0, ...(DRY_RUN ? { "would-write": 0 } : {}) },
);

out({
  ok: sessions.every((s) => s.invalid.length === 0),
  "dry-run": DRY_RUN,
  "project-dir": PROJECT_DIR,
  pool: relative(FROM, MOVEMENTS_POOL),
  sessions,
  totals,
}, sessions.every((s) => s.invalid.length === 0) ? 0 : 1);
