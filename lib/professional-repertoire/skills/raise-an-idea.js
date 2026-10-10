#!/usr/bin/env node
/**
 * @description Puts a raw idea on the record — who raised it and what they said, unedited — refusing only the absence of a raiser or of words, never vagueness, size, or want of conditions; and with --open/--list, derives which ideas in the pool remain undisposed by scanning the requirements pool for from-idea and every seated decision-records pool for a JSON string value naming the idea, never by reading a stored flag. Use whenever a thought arrives that is not yet a requirement — a user desire, a bug report, a passing remark — so it enters the record before it can be dropped for want of formalization. This is the Monitor sensor for proposals in the firm's Huidu MAPE-K loop, the direct sibling of report-an-anomaly.js's sensor for flaws.
 *
 * @returns {object} an idea's disposition is never stored on the idea; --open and --list derive it fresh, every call, from the requirements pool and every seated decision-records pool
 * @throws {Error} stdin holds JSON naming id, raised-by, and says
 * @throws {Error} raised-by is non-empty and says holds at least one non-whitespace character
 * @throws {Error} no idea of the given id is already seated in the ideas pool
 * @throws {Error} the idea contract is seated in the schema pool and parses
 *
 * An idea record exists that conforms to emsenn/schema/idea, and the idea's
 * id equals its own basename in the pool.
 *
 * Collection (收集) is deliberately the cheapest gate in the requirements
 * line — the refusal here is narrow on purpose: no raiser, no words, nothing
 * else. Analysis, not collection, is where a firm gets to ask whether an idea
 * is well-formed, big enough, or ready; a collection gate that also asked
 * those questions would be the exact silent-drop this organ exists to end.
 *
 * An idea is never edited. A sharpened idea is a new record, optionally
 * prompted-by the old one.
 *
 * Closure-kind justification: process — --open and --list re-scan whatever
 * the requirements and decision-records pools presently hold, which changes
 * over time; that is not what closure-kind classifies. The read itself is
 * deterministic given
 * its inputs — no model call, no branch on judgment, byte-identical output
 * for byte-identical pool state — exactly the shape the house already
 * classifies as process: report-an-anomaly.js's own --check re-validates
 * whatever is presently seated, and make-a-task.js's --verify re-runs a
 * goal's commands against whatever presently exists, both declared process.
 * sigma here is closure against interpretive judgment, not against the
 * filesystem's contents.
 *
 * ## What this is not
 *
 * This is the Monitor sensor for PROPOSALS, the direct sibling of
 * report-an-anomaly.js's sensor for FLAWS:
 *
 *   - No status. Judging whether an idea should be taken up is analysis's
 *     work (requirements-analysis-team / requirements-management-team), done
 *     with more context than the raiser had in passing.
 *   - No disposition. What becomes of an idea is the fact of a requirement
 *     later naming it via from-idea, or a decision record naming it —
 *     read that, never a field here.
 *   - No routing, no priority. Nothing here decides which idea matters more,
 *     or whose job it becomes.
 *
 * A raiser who wrote any of those would be grading their own idea, which is
 * the same failure andon's separation of noticing from fixing already
 * refuses on the flaw side.
 *
 * ## Run it
 *
 * ```sh
 * echo '{"id":"…","raised-by":"…","says":"…"}' | node .../raise-an-idea.js --root <repo>
 * node .../raise-an-idea.js --open --root <repo>
 * node .../raise-an-idea.js --list --root <repo>
 * ```
 *
 * `--home` names the ideas pool directly (default `content/ideas` under the
 * resolved unit). `--root` is the repository root passed through to every
 * sibling this script spawns. Input is JSON. Output is JSON.
 *
 * ## Resolution
 *
 * From `--from` (default: the caller's working directory), walk UP testing
 * each directory for either unit marker: `content/` or `lib/management/` —
 * the identical rule write-an-office.js's findUnitRoot and
 * report-an-anomaly.js's findUnit already use, so this script resolves the
 * same "unit" they do rather than inventing a fourth notion of one. Nearest
 * wins; only where that walk finds nothing does it retry once from this
 * script's own file location.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **No stdin, or unparsable stdin** — refused.
 * - **No raised-by, or says with no non-whitespace content** — refused; the
 *   two load-bearing checks. Everything else about the idea — length, shape,
 *   whether it makes sense yet — is explicitly NOT checked here.
 * - **An id already seated** — refused, never overwritten. File a new idea,
 *   prompted-by the old, rather than editing.
 *
 * ## When NOT to use
 *
 * - Not for editing a filed idea.
 * - Not for deciding whether an idea should become a requirement — that is
 *   requirements-analysis-team's analysing-a-requirement, downstream.
 * - Not for asserting an idea's disposition — there is no field for it here.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendDataRecord, dataDir, findDataRecord, findUnit as resolveFindUnit, readDataPool } from "./resolve-an-identifier.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FROM = argValue("--from") ?? argValue("--root") ?? process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

const die = (message) => out({ ok: false, error: message }, 1);

// ── resolution ─────────────────────────────────────────────────────────────
// The unit boundary and every pool this script reads are now resolved by the
// ONE shared law in resolve-an-identifier.js: findUnit walks UP from the
// asking point to the nearest ancestor carrying content/ or lib/management/
// — the identical rule write-an-office.js's findUnitRoot and
// report-an-anomaly.js's findUnit already used before this module existed,
// now written once instead of three times. poolsFor resolves one kind's
// pool at that unit, content/<kind> shadowing legacy lib/management/<kind>
// — except decision-records, which resolve-an-identifier.js already knows
// (via MULTI_SEAT_KINDS) must scan and merge BOTH seats rather than let one
// shadow the other, per decision-records-pool-split-across-two-seats; this
// script no longer needs its own copy of that exception.
//
// FROM (explicit --from/--root, or its cwd default) walks first; only where
// that finds no unit does the walk retry from this script's own file
// location — a fallback, never a preference, so a bare invocation run from
// above every unit, such as the repository root, still finds the unit this
// script is seated beside.
const UNIT = resolveFindUnit(FROM) ?? resolveFindUnit(HERE);

if (!UNIT) {
  die(`⊥ no unit at or above ${FROM} — nothing carries content/ or lib/management. Ask from inside the unit whose records you mean, with --from.`);
}

// Ideas, requirements, and decision-records are all write-once data/ pools
// per the Chairperson's content/data/lib rule — day-bucketed logs, one
// pool per kind, never multiple seats to merge (decision-records-pool-
// split-across-two-seats does not apply once every seat is data/).
function ideasPool() {
  return argValue("--home") ?? dataDir(UNIT, "ideas");
}

function requirementsPool() {
  return dataDir(UNIT, "requirements");
}

function decisionPool() {
  return dataDir(UNIT, "decision-records");
}

// A skill is one file: it CALLS its siblings as subprocesses rather than
// importing them, so a sibling must be FOUND. Two shapes answer — the flat
// pool a skill's source lives in, and a node it was projected into.
function findSkill(flatName, from) {
  const beside = join(HERE, flatName);
  if (existsSync(beside)) return beside;
  let d = resolve(from);
  for (;;) {
    const pooled = join(d, "lib/management/skills", flatName);
    if (existsSync(pooled)) return pooled;
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

// The record is checked by READING-A-SCHEMA — the one validator, called and
// never copied, so this script cannot drift from the contract the pool
// actually enforces.
function violations(record) {
  const reader = findSkill("read-a-schema.js", FROM);
  if (!reader) die("⊥ cannot find reading-a-schema — the one validator. No idea is filed unchecked.");
  const r = spawnSync(process.execPath, [reader, "idea", "--from", FROM], {
    input: JSON.stringify(record),
    encoding: "utf8",
  });
  let verdict;
  try {
    verdict = JSON.parse(r.stdout);
  } catch {
    die(`⊥ reading-a-schema returned nothing parseable: ${(r.stderr || r.stdout || "").trim()}`);
  }
  return verdict.ok ? [] : (verdict.errors ?? [verdict.error]);
}

function report() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) die("no data on stdin — an idea is filed from data, never typed into a file or asserted in a conversation");
  let intake;
  try {
    intake = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }

  for (const key of ["id", "raised-by", "says"]) {
    if (intake[key] === undefined) die(`idea has no '${key}'`);
  }
  if (!ID.test(String(intake.id))) die(`id '${intake.id}' is not kebab-case`);

  // The two load-bearing refusals. Everything else about the idea — length,
  // shape, whether it makes sense yet — is deliberately NOT checked here.
  const raisedBy = String(intake["raised-by"]).trim();
  if (!raisedBy) {
    die("no raised-by — an idea nobody raised is not an idea, it is a possibility the firm noticed about itself");
  }
  if (!ID.test(raisedBy)) die(`raised-by '${intake["raised-by"]}' is not kebab-case`);
  if (typeof intake.says !== "string" || !intake.says.trim()) {
    die("says has no content — an idea intake with nothing said is not an idea");
  }
  if (intake["prompted-by"] !== undefined && !/^emsenn\/[a-z0-9-]+\/[a-z0-9]+(-[a-z0-9]+)*$/u.test(String(intake["prompted-by"]))) {
    die(`prompted-by '${intake["prompted-by"]}' does not read as an emsenn/<kind>/<id> address`);
  }

  const pool = ideasPool();

  // An idea is never edited. A sharpened idea is a new record, optionally
  // prompted-by the old one.
  if (findDataRecord(pool, "ideas", String(intake.id))) {
    die(`idea '${intake.id}' is already seated in ${relative(FROM, pool)} — refused, never overwritten; file a new one, prompted-by the old`);
  }

  const record = {
    id: intake.id,
    name: intake.name ?? String(intake.id).replace(/-/gu, " "),
    kind: "idea",
    "raised-by": raisedBy,
    says: intake.says,
    ...(intake.opens !== undefined ? { opens: intake.opens } : {}),
    ...(intake["prompted-by"] !== undefined ? { "prompted-by": intake["prompted-by"] } : {}),
    "x-provenance": {
      "recorded-by": intake["recorded-by"] ?? raisedBy,
      "recorded-on": new Date().toISOString().slice(0, 10),
    },
  };

  const errs = violations(record);
  if (errs.length) die(`the idea does not conform to emsenn/schema/idea: ${errs.join("; ")}`);

  const witness = { ok: true, seated: { id: intake.id, pool: relative(FROM, pool) } };
  if (DRY_RUN) out({ ...witness, dryRun: true });

  appendDataRecord(pool, "ideas", record);

  // Read back and re-validate. An idea that does not survive its own filing
  // is written but this instrument cannot un-append a log line — a data/
  // pool is write-once, so a bad append is reported rather than erased; the
  // read-back check still runs, its failure now a loud refusal instead of a
  // silent withdrawal.
  const back = findDataRecord(pool, "ideas", intake.id)?.record;
  if (!back) die(`idea '${intake.id}' was appended but does not read back at all — the append itself is suspect`);
  const backErrs = violations(back);
  if (backErrs.length) {
    die(`idea '${intake.id}' was appended but does not read back clean: ${backErrs.join("; ")} — the append succeeded and cannot be un-appended; this needs a human, not a retry`);
  }

  out(witness);
}

// Recursively walks a parsed JSON value, true iff some STRING value
// (never a key, never the raw file's bytes) contains ref. This is the
// tightening review round 2 asked for: round 1's design matched raw
// substring containment over a whole file's text, which could hit a key
// name or JSON punctuation coincidentally. This cannot — but it narrows
// false positives at the syntactic level only. It does not and cannot
// eliminate the semantic case of a decision record that merely mentions an
// idea's id in passing (in a list of alternatives, in a cross-reference)
// without actually disposing of it; telling "names it as the thing being
// decided" apart from "names it in a sentence" is not this scan's job.
function containsIdeaRef(value, ref) {
  if (typeof value === "string") return value.includes(ref);
  if (Array.isArray(value)) return value.some((v) => containsIdeaRef(v, ref));
  if (value && typeof value === "object") return Object.values(value).some((v) => containsIdeaRef(v, ref));
  return false;
}

function deriveOpenIdeas() {
  const pool = ideasPool();
  const ideas = readDataPool(pool, "ideas").map((r) => r.record);

  const fromIdeaRefs = new Set();
  for (const { record: req } of readDataPool(requirementsPool(), "requirements")) {
    if (typeof req["from-idea"] === "string") fromIdeaRefs.add(req["from-idea"]);
  }

  function namedInDecisions(ideaRef) {
    for (const { record: parsed, file, line } of readDataPool(decisionPool(), "decision-records")) {
      if (containsIdeaRef(parsed, ideaRef)) return { seat: `${relative(FROM, file)}:${line}` };
    }
    return null;
  }

  const open = [];
  const disposed = [];
  for (const idea of ideas) {
    const ref = `emsenn/idea/${idea.id}`;
    const disposedBy = [];
    if (fromIdeaRefs.has(ref)) disposedBy.push({ by: "requirement", via: "from-idea" });
    const dr = namedInDecisions(ref);
    if (dr) disposedBy.push({ by: "decision-record", via: "json-string-value", seat: dr.seat });
    (disposedBy.length ? disposed : open).push({ ...idea, "disposed-by": disposedBy });
  }
  return { open, disposed };
}

function openCommand() {
  const { open } = deriveOpenIdeas();
  out({
    ok: true,
    open: open.map(({ "disposed-by": _drop, ...rest }) => rest),
    count: open.length,
  });
}

function listCommand() {
  const { open, disposed } = deriveOpenIdeas();
  const all = [...open, ...disposed].map((idea) => ({
    id: idea.id,
    name: idea.name,
    disposed: (idea["disposed-by"] ?? []).length > 0,
    "disposed-by": idea["disposed-by"] ?? [],
  }));
  out({ ok: true, ideas: all, count: all.length });
}

if (process.argv.includes("--open")) openCommand();
else if (process.argv.includes("--list")) listCommand();
else report();
