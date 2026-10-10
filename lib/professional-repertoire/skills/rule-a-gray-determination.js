#!/usr/bin/env node
/**
 * @description Seats the chairperson's ruling on what the firm does between the white army's internal-lawfulness verdict, held in one hand, and the black army's standards-and-fact conformance verdict, held in the other — huidu-guanli's own gray zone, ruled rather than left to whichever hand shouted last — as a decision record conforming to the existing emsenn/schema/decision-record class, citing both hand records by their resolved seat. Refuses while either hand is empty or names a record that does not resolve: the chairperson may not rule with an empty hand. Use once the white army and the black army have each already produced their own verdict on a matter, and the gray determination between them needs to reach the record.
 *
 * @returns {object} decider defaults to "the Chairperson" and status defaults to "decided" when the intake names neither.
 * @throws {Error} Refuses when stdin does not hold JSON naming id, matter, context, determination, consequences, white, and black.
 * @throws {Error} Refuses when white is not a non-empty string that resolves to a seated record — a path under the repo root that exists, or an emsenn/<kind>/<slug> address a tree-wide search finds.
 * @throws {Error} Refuses when black is not a non-empty string that resolves to a seated record by the same rule as white, independently.
 * @throws {Error} Refuses when a decision-record of this id is already seated in content/decision-records or lib/management/decision-records.
 * @throws {Error} Refuses when the record built from the intake does not conform to emsenn/schema/decision-record, read by reading-a-schema and never by a copy carried here.
 *
 * Once seated, a decision-record exists at lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/records/decision-records/<id>.json, realizing the existing class; no new schema is minted. The record's options name holding to the white hand and holding to the black hand as the two alternatives weighed, each citing that hand's resolved seat; its context names both hands' resolved paths as well.
 *
 * ## Position
 *
 * This is the chairperson office's own instrument — the office seated by
 * work-item write-the-chairperson-office-record.json, which holds "the white
 * army's math lawfulness verdict in the left hand and the black army's
 * standards and legal conformance verdict in the right" and "rule[s] what the
 * firm does between the two hands as a gray determination on the record."
 * The white army (lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/offices/white-army.json) checks a work
 * product's own internal logical and mathematical structure, judged from the
 * inside. The black army (lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/offices/black-army.json) checks
 * a work product against a named external standard or observed fact, judged
 * from the outside. Neither settles what the firm actually does when their
 * verdicts diverge or when neither alone answers the question — that space
 * is huidu-guanli ("grey management"), this firm's own prior management-
 * thought art on anticipating and ruling the grey zone before it hardens
 * black or white (the same doctrine red-army.json already cites). This
 * instrument is where that ruling reaches the record.
 *
 * A gray determination is not a fourth verdict alongside white's and
 * black's — it is the chairperson's ruling on what the firm does GIVEN both,
 * carried in the vocabulary this firm already has for exactly that shape of
 * question: a decision record (Nygard's ADR form, options weighed against
 * what the context forces, per CMMI DAR). This instrument mints no new
 * schema; it realizes lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas/decision-record.schema.json,
 * the class every other decider-facing ruling in this pool already uses.
 *
 * ## Structure and data
 *
 * Intake (JSON on stdin):
 *   id            kebab-case, the record's address
 *   matter        short noun phrase — becomes the record's `name`
 *   context       prose stating the situation forcing a ruling — the
 *                 chairperson's own words, never synthesized here beyond
 *                 appending the two hands' resolved paths
 *   determination prose — the ruling itself, becomes the record's `decision`
 *   consequences  prose — what follows from ruling this way, required by
 *                 the class and stated by the chairperson, never invented
 *   white         a hand: path or emsenn/<kind>/<slug> address
 *   black         a hand: path or emsenn/<kind>/<slug> address
 *   decider       optional, default "the Chairperson"
 *   status        optional, one of proposed/last-call/decided,
 *                 default "decided" — a ruling this instrument seats has,
 *                 by construction, already been made
 *   recommendation, recorded-by   optional passthroughs
 *
 * decision-record.schema.json requires `options` (>=2, each carrying a
 * label and description) beyond what the task's plain description names
 * (a matter and a determination) — this design does not ask the chairperson
 * to separately enumerate alternatives, and it does not fabricate ones the
 * hands never stated. The two hands themselves ARE the two alternatives a
 * gray determination stands between: option one is holding to the white
 * army's verdict as it stands, option two is holding to the black army's
 * verdict as it stands, and `decision` (the ruling) is what the chairperson
 * did between them. Each option's description is drawn from the resolved
 * hand record's own `name` field (or, failing that, its first line) —
 * cited, not invented.
 *
 * `white` and `black` resolve one of two ways, mirroring the load-bearing
 * refusal report-an-anomaly.js already uses for its own `at` field: a
 * PATH-SHAPED ref (contains a `.`, or starts with `/`, `./`, or `../`) is
 * checked with existsSync against the repo root; anything else is handed to
 * resolve-an-identifier.js's GLOBAL strategy, which requires an
 * emsenn/<kind>/<slug> address (a bare kebab slug is refused there too, for
 * the same reason raise-an-idea.js's own addresses require it: a slug alone
 * does not say which pool it lives in, and this instrument does not guess).
 * The white and black armies have no dedicated verdict pool of their own yet
 * (neither office has been practiced — both say so in their own `unrealized`
 * — see white-army.json, black-army.json) — the global strategy and the
 * path form together mean a hand can name whatever pool eventually holds
 * that record, or a bare file, without this instrument needing to know its
 * shape in advance.
 *
 * ## Logic
 *
 * 1. Read and parse stdin; refuse absent or unparsable input.
 * 2. Refuse any of id/matter/context/determination/consequences/white/black
 *    missing; refuse id not kebab-case.
 * 3. Resolve white, then black, independently, by the rule above; refuse
 *    the first unresolved hand encountered, naming it.
 * 4. Refuse an id already seated in EITHER decision-records seat (content/
 *    and the legacy lib/management/ seat both stay live per
 *    decision-records-pool-split-across-two-seats, so an existing-id check
 *    against only one seat would miss a collision the other already holds).
 * 5. Build the record: name=matter, decider (default "the Chairperson"),
 *    status (default "decided"), context=intake context with both hands'
 *    resolved paths appended, options=[hold-to-white, hold-to-black] built
 *    from each hand's own content, decision=determination,
 *    consequences=intake consequences, x-provenance carrying both hands'
 *    refs and resolved seats structurally (x-provenance is schema-
 *    unconstrained beyond being an object, so this is additive, not a
 *    second definition of what the top-level schema already shapes).
 * 6. Validate the built record through reading-a-schema (the one validator,
 *    called and never copied); refuse on any violation.
 * 7. Write to the decision-records pool (content/decision-records by
 *    default, `--pool` overrides); never overwrite a seated id.
 *
 * ## Error paths
 *
 * - No stdin, or stdin that is not JSON — refused before anything else runs.
 * - Any required intake key absent — refused, naming the key.
 * - id not kebab-case — refused.
 * - white or black empty, non-string, or unresolvable by the rule above —
 *   refused, naming which hand and why: "the chairperson may not rule with
 *   an empty hand."
 * - id already seated in either decision-records seat — refused, never
 *   overwritten; a gray determination is ruled once, and a second ruling on
 *   the same matter is a new id, optionally citing the first.
 * - the built record fails reading-a-schema's check against
 *   emsenn/schema/decision-record — refused, with every violation named,
 *   never silently coerced into shape.
 * - reading-a-schema itself cannot be found beside this script or in a
 *   pool/projection above the asking point — refused (⊥): no record is
 *   seated unchecked.
 *
 * ## Resource use
 *
 * One subprocess spawn (reading-a-schema, once, on the built record) and
 * two to four small filesystem reads (the hands, and the existing-id checks
 * against both decision-records seats). No network, no model call, no
 * unbounded loop — a single stdin read, a single write.
 *
 * ## Run it
 *
 * ```sh
 * echo '{"id":"…","matter":"…","context":"…","determination":"…",
 *        "consequences":"…","white":"lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/….json",
 *        "black":"emsenn/decision-records/…"}' \
 *   | node .../rule-a-gray-determination.js --root <repo>
 * ```
 *
 * `--root` (default: cwd) is the repo root path-shaped hands resolve
 * against and resolve-an-identifier's global search walks from. `--pool`
 * names the decision-records pool written to directly, overriding the
 * default `<root>/lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/data/records/decision-records`.
 *
 * ## When NOT to use
 *
 * - Not to record either army's own verdict — that is each army's own
 *   instrument (unbuilt, per each office's `unrealized`), never this one.
 * - Not to invent options, context, or consequences the chairperson did not
 *   state. The two hands supply the alternatives; the chairperson supplies
 *   the context, the ruling, and what follows.
 * - Not to amend a seated gray determination. Rule a new one, citing the old.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendDataRecord, dataDir, findDataRecord, resolveIdentifier } from "./resolve-an-identifier.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = argValue("--root") ?? process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");
const UNIT = join(REPO_ROOT, "lib/emsenn");
// A decision, once ruled, is never amended — a later change is a new
// decision citing the old one — so per the Chairperson's content/data/lib
// rule decision-records seat as data/, a day-bucketed log.
const DECISION_POOL = argValue("--pool") ?? dataDir(UNIT, "decision-records");

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

// A path-shaped hand: contains a `.` (an extension), or opens with `/`,
// `./`, or `../` — the identical rule report-an-anomaly.js's `at` field
// already uses, reused rather than reinvented.
function pathShaped(ref) {
  return /\./u.test(ref) || ref.startsWith("/") || ref.startsWith("./") || ref.startsWith("../");
}

// Resolve one hand. Returns { ok: true, seat } or { ok: false, error }.
function resolveHand(label, ref) {
  if (typeof ref !== "string" || !ref.trim()) {
    return { ok: false, error: `${label} is empty — the chairperson may not rule with an empty hand` };
  }
  const value = ref.trim();
  if (pathShaped(value)) {
    const at = isAbsolute(value) ? value : resolve(REPO_ROOT, value);
    if (!existsSync(at)) {
      return { ok: false, error: `${label} '${value}' reads as a path and does not exist (looked at ${relative(REPO_ROOT, at)}) — an unresolvable hand is an empty hand` };
    }
    return { ok: true, seat: at };
  }
  const hit = resolveIdentifier(value, { strategy: "global", root: REPO_ROOT });
  if (!hit.ok || hit.seats.length === 0) {
    return {
      ok: false,
      error: `${label} '${value}' resolves to no seated record (${hit.error ?? "found nowhere in the tree"}) — `
        + `a bare slug does not say which pool it lives in; name a path, or an emsenn/<kind>/<slug> address`,
    };
  }
  return { ok: true, seat: hit.seats[0] };
}

// A short, honest description of what a resolved hand actually says: its
// own `name` field if it is JSON and has one, else its first non-empty
// line, truncated. Cited, never invented.
function describeHand(seatPath) {
  const raw = readFileSync(seatPath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.name === "string" && parsed.name.trim()) return parsed.name.trim();
    if (parsed && typeof parsed.id === "string") return parsed.id;
  } catch {
    // not JSON — fall through to the raw-text reading below
  }
  const firstLine = raw.split("\n").find((l) => l.trim().length > 0) ?? "";
  return firstLine.trim().slice(0, 140);
}

// A sibling script is found beside this one, or in a pool/projection walked
// up from the asking point — the same three-shape search raise-an-idea.js's
// findSkill already uses, so a projected copy of this instrument still
// finds its validator.
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
  const reader = findSkill("read-a-schema.js", REPO_ROOT);
  if (!reader) die("⊥ cannot find reading-a-schema — the one validator. No decision record is seated unchecked.");
  const r = spawnSync(process.execPath, [reader, "decision-record", "--from", REPO_ROOT], {
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

function work() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) die("no data on stdin — a gray determination is ruled from data, never typed into a file or asserted in a conversation");
  let intake;
  try {
    intake = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }

  for (const key of ["id", "matter", "context", "determination", "consequences", "white", "black"]) {
    if (intake[key] === undefined) die(`intake has no '${key}'`);
  }
  if (!ID.test(String(intake.id))) die(`id '${intake.id}' is not kebab-case`);
  if (intake.status !== undefined && !["proposed", "last-call", "decided"].includes(intake.status)) {
    die(`status '${intake.status}' must be one of proposed, last-call, decided`);
  }

  // The load-bearing refusal: neither hand may be empty or unresolvable.
  const white = resolveHand("white", intake.white);
  if (!white.ok) die(white.error);
  const black = resolveHand("black", intake.black);
  if (!black.ok) die(black.error);

  if (findDataRecord(DECISION_POOL, "decision-records", intake.id)) {
    die(`decision-record '${intake.id}' already seats — refused, never overwritten; rule a new id, citing this one`);
  }

  const whiteRel = relative(REPO_ROOT, white.seat);
  const blackRel = relative(REPO_ROOT, black.seat);

  const record = {
    id: intake.id,
    name: intake.matter,
    decider: intake.decider ?? "the Chairperson",
    status: intake.status ?? "decided",
    context: `${intake.context}\n\nHands: the white army's verdict at ${whiteRel}; the black army's verdict at ${blackRel}.`,
    options: [
      { label: "hold to the white army's verdict", description: `As found at ${whiteRel}: ${describeHand(white.seat)}` },
      { label: "hold to the black army's verdict", description: `As found at ${blackRel}: ${describeHand(black.seat)}` },
    ],
    ...(intake.recommendation !== undefined ? { recommendation: intake.recommendation } : {}),
    decision: intake.determination,
    consequences: intake.consequences,
    "x-provenance": {
      "recorded-by": intake["recorded-by"] ?? "claude/chairperson",
      "recorded-on": new Date().toISOString().slice(0, 10),
      hands: { white: whiteRel, black: blackRel },
    },
  };

  const errs = violations(record);
  if (errs.length) die(`the gray determination does not conform to emsenn/schema/decision-record: ${errs.join("; ")}`);

  const witness = {
    ok: true,
    ruled: { id: intake.id, pool: relative(REPO_ROOT, DECISION_POOL), decider: record.decider, status: record.status },
    hands: { white: whiteRel, black: blackRel },
  };
  if (DRY_RUN) out({ ...witness, dryRun: true });

  appendDataRecord(DECISION_POOL, "decision-records", record);
  out(witness);
}

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      '  echo \'{"id":"…","matter":"…","context":"…","determination":"…",',
      '         "consequences":"…","white":"…","black":"…"}\' \\',
      "    | node rule-a-gray-determination.js --root <repo>",
      "",
      "Input is JSON. Output is JSON. Refuses while either hand is empty or unresolvable.",
    ].join("\n") + "\n",
  );
}

if (process.argv.includes("--help")) printUsage();
else work();
