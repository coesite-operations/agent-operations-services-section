#!/usr/bin/env node
/**
 * @description Derives the overlap between two filesystem-carried units from the firm's existing glossary, EAVT-projected registers, cited paths, contracts, and incumbencies; restricts both units to that overlap; and emits a measurement-only seam register with separate FOUR-valued content and authority axes. Use to locate agreement, conflict, and overlapping authority before any change-control decision. It has no repair mode and never writes either unit.
 * @param {string} a - Names a readable file or directory contained by --root.
 * @param {string} b - Names a readable file or directory contained by --root.
 * @returns {object} Every emitted seam point occurs in both restrictions and carries evidence from both sides.
 * @returns {object} Content evidence and authority evidence remain separate Charge-valued axes.
 * @returns {object} --register reports measurements without changing either input, while --check exits 3 exactly when conflict evidence is present.
 * @throws {Error} The root must carry the management EAVT projector and any glossary register used to recognize terms.
 *
 * ## Contract
 *
 * Given two readable units under one root, this process reads the already-seated
 * records and the two supplied projections. It derives shared claim loci, restricts
 * both sides to those loci, and values each locus twice:
 *
 * - `content`: positive evidence means equal restrictions; negative evidence means
 *   unequal restrictions.
 * - `authority`: positive evidence means A explicitly claims the locus; negative
 *   evidence means B explicitly claims it.
 *
 * These are two `Charge` axes, not one. Obsmetrologia's `kTop` means that both
 * evidence slots are present. It does not mean "two parties own a thing" unless
 * the carrier being measured is specifically the authority axis.
 *
 * The overlap mask and restrictions implement the finite carrier corresponding to
 * `AssocSheaf.restrict`; singleton patches cover every emitted locus, matching
 * `Sheaf.Cover`. Equality is decided only after both sections have been restricted
 * to the same locus. Point charges aggregate by knowledge join (slotwise OR), the
 * executable form of `Charge.joinK`; therefore ordering and duplicate evidence do
 * not change the result. `coordinationRank` is the cycle rank of the two-vertex
 * multigraph whose edges are overlap loci, corresponding to `CoverNerve.H1rank`.
 * It is a coordination-cost measurement, never a conflict verdict.
 *
 * This script instantiates those compiled laws on finite JSON/text observations. It
 * does not prove in Lean that a POSIX unit is the corpus's `PredicationCell`, that a
 * textual assertion is an `AssocSheaf.Cochain`, or that enterprise formation is a
 * glass transition. Those identifications remain explicit proof boundaries.
 *
 * ## Modes
 *
 * ```sh
 * node derive-a-seam-register.js --register --a <unit> --b <unit> --root <root>
 * node derive-a-seam-register.js --check    --a <unit> --b <unit> --root <root>
 * ```
 *
 * `--register` always exits 0 after a successful measurement, even when it finds
 * conflict. `--check` exits 3 when any content-negative evidence is present. A
 * forbidden `--fix` request exits 2 before resolving inputs. `--assert-reading`
 * checks the conflict-dominant content summary for `bottom`, `t`, or `f`;
 * `--assert-reading top` instead checks that at least one seam point carries an
 * explicit dual-authority reading.
 *
 * ## When not to use
 *
 * - Not to repair or discharge a seam. That is a baselined change-control act.
 * - Not to book the yield of a discharged class. The CFO's books own that record.
 * - Not to infer ownership from directory adjacency. Authority charges require an
 *   explicit jurisdiction, authority-scope, owner, or standing-seat assertion.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const EXCLUDED_DIRS = new Set([".git", ".lake", "node_modules", "dist", "target", "__pycache__"]);
const TEXT_EXTENSIONS = new Set([".json", ".md", ".mdx", ".txt", ".js", ".mjs", ".cjs", ".ts", ".mts", ".toml", ".yaml", ".yml", ".lean"]);
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const CONTENT_CHARGES = Object.freeze({
  bottom: Object.freeze({ label: "bottom", positive: false, negative: false }),
  t: Object.freeze({ label: "t", positive: true, negative: false }),
  f: Object.freeze({ label: "f", positive: false, negative: true }),
  top: Object.freeze({ label: "top", positive: true, negative: true }),
});

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

function emit(value, code = 0) {
  // fd 1 is written synchronously because the live seam register can exceed a
  // pipe's buffered capacity. `process.stdout.write(); process.exit()` can exit
  // successfully while leaving a consumer with truncated, unparsable JSON.
  writeFileSync(1, `${JSON.stringify(value, null, 2)}\n`);
  process.exit(code);
}

function refuse(message, code = 2) {
  emit({ ok: false, reading: "bottom", error: message, mutation: false }, code);
}

function usage() {
  process.stdout.write([
    "Usage:",
    "  node derive-a-seam-register.js --register --a <unit> --b <unit> [--root <root>] [--assert-reading bottom|t|f|top]",
    "  node derive-a-seam-register.js --check    --a <unit> --b <unit> [--root <root>] [--assert-reading bottom|t|f|top]",
    "",
    "Exit 0: measurement completed (and --check found no conflict)",
    "Exit 2: usage/refusal, including every --fix request",
    "Exit 3: --check found content-conflict evidence",
    "Exit 4: --assert-reading did not match the derived content summary",
  ].join("\n") + "\n");
}

function within(root, path) {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function resolveInput(root, value, flag) {
  if (!value) refuse(`${flag} must name a file or directory`);
  const path = resolve(root, value);
  if (!within(root, path)) refuse(`${flag} resolves outside --root: ${value}`);
  if (!existsSync(path)) refuse(`${flag} does not exist: ${relative(root, path)}`);
  return path;
}

function extension(path) {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot).toLowerCase();
}

function filesUnder(path) {
  if (statSync(path).isFile()) return [path];
  const result = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      if (EXCLUDED_DIRS.has(name)) continue;
      const child = join(dir, name);
      const st = statSync(child);
      if (st.isDirectory()) walk(child);
      else if (st.isFile() && TEXT_EXTENSIONS.has(extension(child))) result.push(child);
    }
  };
  walk(path);
  return result.sort();
}

function readText(path, root) {
  const st = statSync(path);
  if (st.size > MAX_FILE_BYTES) refuse(`${relative(root, path)} is ${st.size} bytes; the 8 MiB observation bound was exceeded`);
  const text = readFileSync(path, "utf8");
  if (text.includes("\u0000")) refuse(`${relative(root, path)} contains NUL bytes and is not a text observation`);
  return text;
}

function normalizeLine(line) {
  return line.trim().replace(/\s+/gu, " ");
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).filter((k) => k !== "x-provenance").sort().map((k) => [k, stableValue(value[k])]));
  }
  return value;
}

function canonical(value) {
  return JSON.stringify(stableValue(value));
}

function charge(positive, negative) {
  if (positive && negative) return CONTENT_CHARGES.top;
  if (positive) return CONTENT_CHARGES.t;
  if (negative) return CONTENT_CHARGES.f;
  return CONTENT_CHARGES.bottom;
}

function joinCharge(a, b) {
  return charge(a.positive || b.positive, a.negative || b.negative);
}

function hash(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function addClaim(map, key, kind, label, value, evidence, owns = false, comparable = true) {
  let point = map.get(key);
  if (!point) {
    point = { key, kind, label, observations: new Map(), owns: false };
    map.set(key, point);
  }
  const normalized = typeof value === "string" ? normalizeLine(value) : stableValue(value);
  const serialized = canonical(normalized);
  const observationKey = `${comparable ? "comparable" : "evidence"}:${serialized}`;
  if (!point.observations.has(observationKey)) point.observations.set(observationKey, { value: normalized, comparable, evidence: [] });
  const observation = point.observations.get(observationKey);
  const evidenceKey = canonical(evidence);
  if (!observation.evidence.some((item) => canonical(item) === evidenceKey)) observation.evidence.push(evidence);
  point.owns ||= owns;
}

function readGlossary(root) {
  const dir = join(root, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/glossary/terms");
  const terms = new Map();
  if (!existsSync(dir)) return terms;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") || f.endsWith(".md")).sort()) {
    const path = join(dir, file);
    let record = null;
    if (file.endsWith(".json")) {
      try { record = JSON.parse(readFileSync(path, "utf8")); } catch { continue; }
    }
    const filenameId = file.replace(/\.schema\.json$/u, "").replace(/\.(?:json|md)$/u, "");
    const id = String(record?.id ?? filenameId);
    terms.set(id, { id, path: relative(root, path) });
  }
  return terms;
}

function pathTokens(line) {
  const matches = line.match(/(?:\.{0,2}\/)?(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+(?:\.[A-Za-z0-9_-]+)?/gu) ?? [];
  return [...new Set(matches
    .map((p) => p.replace(/^[`'"(<[]+/u, "").replace(/[`'">),;:\]]+$/u, ""))
    .filter((p) => p && !p.includes("://")))].sort();
}

function lineMentionsTerm(line, term) {
  const normalized = line.toLowerCase().replace(/[_\s]+/gu, "-");
  const at = normalized.indexOf(term.toLowerCase());
  if (at === -1) return false;
  const before = at === 0 ? "" : normalized[at - 1];
  const after = normalized[at + term.length] ?? "";
  return !/[a-z0-9]/u.test(before) && !/[a-z0-9]/u.test(after);
}

function inspectJson(record, file, root, claims, sourceHash) {
  const rel = relative(root, file);
  const id = typeof record?.id === "string" ? record.id : null;
  const kind = typeof record?.kind === "string" ? record.kind : (typeof record?.type === "string" ? record.type : null);
  const recordedOn = record?.["x-provenance"]?.["recorded-on"];
  if (id && kind && /contract/iu.test(kind)) {
    addClaim(claims, `contract:${kind}:${id}`, "contract", `${kind}/${id}`, record,
      { file: rel, pointer: "", sha256: sourceHash, ...(recordedOn ? { recordedOn } : {}) });
  }
  if (id && kind && /term|glossary/iu.test(kind)) {
    const definition = record.definition ?? record.description ?? record.meaning;
    if (definition !== undefined) {
      addClaim(claims, `term:${id}`, "glossary-term", id, definition,
        { file: rel, pointer: record.definition !== undefined ? "/definition" : (record.description !== undefined ? "/description" : "/meaning"), sha256: sourceHash, ...(recordedOn ? { recordedOn } : {}) });
    }
  }

  const holder = record?.incumbent ?? record?.holder ?? record?.["held-by"] ?? record?.person;
  const office = record?.office ?? (/personnel|incumb/iu.test(kind ?? "") ? record?.["office-id"] : undefined);
  if (typeof office === "string" && typeof holder === "string") {
    addClaim(claims, `incumbency:${office}`, "incumbency", office, holder,
      { file: rel, pointer: "/office", sha256: sourceHash, ...(recordedOn ? { recordedOn } : {}) });
  }

  const actor = id ?? rel;
  const authority = [];
  if (typeof record?.jurisdiction === "string") authority.push(record.jurisdiction);
  for (const key of ["authority-scope", "owns", "owned-paths"]) {
    const value = record?.[key];
    if (typeof value === "string") authority.push(value);
    else if (Array.isArray(value)) authority.push(...value.filter((v) => typeof v === "string"));
  }
  for (const path of [...new Set(authority)].sort()) {
    addClaim(claims, `authority:${path}`, "authority", path, actor,
      { file: rel, pointer: "/authority-scope", sha256: sourceHash, ...(recordedOn ? { recordedOn } : {}) }, true, false);
  }
}

function inspectUnit(path, root, glossary) {
  const claims = new Map();
  const files = filesUnder(path);
  for (const file of files) {
    const rel = relative(root, file);
    const text = readText(file, root);
    const sourceHash = createHash("sha256").update(text).digest("hex");
    const glossaryHome = /(?:^|\/)content\/glossary\/terms\/([^/]+?)(?:\.schema)?\.(?:json|md)$/u.exec(rel);
    if (glossaryHome && extension(file) === ".md") {
      addClaim(claims, `term:${glossaryHome[1]}`, "glossary-term", glossaryHome[1], normalizeLine(text),
        { file: rel, line: 1, excerpt: "canonical glossary home", sha256: sourceHash });
    }
    if (extension(file) === ".json") {
      try { inspectJson(JSON.parse(text), file, root, claims, sourceHash); } catch (error) {
        refuse(`${rel} is named .json but does not parse: ${error.message}`);
      }
    }
    const lines = text.split(/\r?\n/u);
    for (let i = 0; i < lines.length; i++) {
      const context = normalizeLine(lines[i]);
      if (!context) continue;
      const evidence = { file: rel, line: i + 1, excerpt: context, sha256: sourceHash };

      for (const cited of pathTokens(context)) {
        addClaim(claims, `path:${cited}`, "cited-path", cited, context, evidence);
      }

      for (const term of glossary.keys()) {
        if (lineMentionsTerm(context, term)) {
          addClaim(claims, `term:${term}`, "glossary-term", term, context, evidence, false, false);
        }
      }

      const seat = /\b(?:enterprise|unit|office)\s+seats?\s+at\s+([A-Za-z0-9._/-]+)/iu.exec(context);
      if (seat) addClaim(claims, `authority:${seat[1]}`, "authority", seat[1], relative(root, path) || ".", evidence, true, false);
    }
  }
  return { claims, files: files.map((f) => relative(root, f)) };
}

function restriction(point) {
  const observations = [...point.observations.values()]
    .map((o) => ({ value: o.value, comparable: o.comparable, evidence: o.evidence.sort((a, b) => canonical(a).localeCompare(canonical(b))) }))
    .sort((a, b) => canonical(a.value).localeCompare(canonical(b.value)));
  return {
    values: observations.filter((o) => o.comparable).map((o) => o.value),
    evidenceOnly: observations.filter((o) => !o.comparable).map((o) => o.value),
    evidence: observations.flatMap((o) => o.evidence),
  };
}

async function eavtWitness(root) {
  const projector = join(root, "lib/emsenn/services/561-group/services/coesite-clearing/services/union-officer-academy/lib/professional-repertoire/skills/project-pools-to-eavt.js");
  if (!existsSync(projector)) refuse(`the EAVT projector seats nowhere at ${relative(root, projector)}`);
  const module = await import(pathToFileURL(projector).href);
  if (typeof module.unfoldPools !== "function") refuse(`${relative(root, projector)} exports no unfoldPools`);
  const rows = module.unfoldPools(root);
  return { mediaType: "application/eavt+jsonl", projector: relative(root, projector), rowsRead: rows.length };
}

function derive(a, b) {
  const shared = [...a.claims.keys()].filter((key) => b.claims.has(key)).sort();
  const points = [];
  let aggregateContent = CONTENT_CHARGES.bottom;
  let aggregateAuthority = CONTENT_CHARGES.bottom;
  let agreementCount = 0;
  let conflictCount = 0;
  let inconsistencyCount = 0;

  for (const key of shared) {
    const left = a.claims.get(key);
    const right = b.claims.get(key);
    const ra = restriction(left);
    const rb = restriction(right);
    const comparable = ra.values.length > 0 && rb.values.length > 0;
    const leftValues = new Set(ra.values.map(canonical));
    const rightValues = new Set(rb.values.map(canonical));
    const agreementEvidence = comparable && [...leftValues].some((value) => rightValues.has(value));
    const conflictEvidence = comparable && ([...leftValues].some((value) => !rightValues.has(value)) || [...rightValues].some((value) => !leftValues.has(value)));
    const content = charge(agreementEvidence, conflictEvidence);
    const authority = charge(left.owns, right.owns);
    aggregateContent = joinCharge(aggregateContent, content);
    aggregateAuthority = joinCharge(aggregateAuthority, authority);
    if (content.positive) agreementCount++;
    if (content.negative) conflictCount++;
    if (content.positive && content.negative) inconsistencyCount++;
    points.push({
      key,
      kind: left.kind,
      label: left.label,
      restrictions: { a: ra, b: rb },
      content,
      authority,
      reading: authority.label === "top" ? "top" : content.label,
    });
  }

  const reading = conflictCount > 0 ? "f" : (agreementCount > 0 ? "t" : "bottom");
  const components = points.length === 0 ? 2 : 1;
  const coordinationRank = Math.max(0, points.length + components - 2);
  return {
    reading,
    overlap: {
      mask: shared,
      patches: shared.map((key) => [key]),
      coversEveryPoint: points.length === shared.length,
    },
    points,
    content: { charge: aggregateContent, agreementCount, conflictCount, inconsistencyCount },
    authority: { charge: aggregateAuthority, dualOwnershipCount: points.filter((p) => p.authority.label === "top").length },
    topology: { entities: 2, overlapEdges: points.length, components, coordinationRank, coordinationBits: coordinationRank },
  };
}

function selfTest() {
  const charges = Object.values(CONTENT_CHARGES);
  for (const a of charges) for (const b of charges) {
    if (canonical(joinCharge(a, b)) !== canonical(joinCharge(b, a))) refuse("self-test: joinK commutativity failed");
    if (canonical(joinCharge(a, a)) !== canonical(a)) refuse("self-test: joinK idempotence failed");
    for (const c of charges) {
      if (canonical(joinCharge(joinCharge(a, b), c)) !== canonical(joinCharge(a, joinCharge(b, c)))) {
        refuse("self-test: joinK associativity failed");
      }
    }
  }
  emit({ ok: true, laws: ["joinK-commutative", "joinK-associative", "joinK-idempotent"] });
}

async function main() {
  if (process.argv.includes("--help")) { usage(); return; }
  if (process.argv.includes("--fix")) refuse("--fix is forbidden: this instrument measures only and contains no mutation path");
  if (process.argv.includes("--self-test")) selfTest();

  const registerMode = process.argv.includes("--register");
  const checkMode = process.argv.includes("--check");
  if (registerMode === checkMode) refuse("choose exactly one mode: --register or --check");
  const root = resolve(argValue("--root") ?? process.cwd());
  if (!existsSync(root) || !statSync(root).isDirectory()) refuse(`--root is not a directory: ${root}`);
  const aPath = resolveInput(root, argValue("--a"), "--a");
  const bPath = resolveInput(root, argValue("--b"), "--b");
  const glossary = readGlossary(root);
  const eavt = await eavtWitness(root);
  const a = inspectUnit(aPath, root, glossary);
  const b = inspectUnit(bPath, root, glossary);
  const seam = derive(a, b);
  const register = {
    kind: "seam-register",
    version: 1,
    mode: registerMode ? "register" : "check",
    reading: seam.reading,
    mutation: false,
    inputs: {
      root,
      a: { path: relative(root, aPath) || ".", filesRead: a.files },
      b: { path: relative(root, bPath) || ".", filesRead: b.files },
    },
    registerSubstrate: { eavt, glossaryTermsRead: glossary.size },
    ...seam,
    mathematicalCarrier: {
      content: "Obsmetrologia.Charge (positive=agreement evidence, negative=conflict evidence)",
      authority: "Obsmetrologia.Charge (positive=A ownership claim, negative=B ownership claim)",
      restriction: "finite overlap mask corresponding to AssocSheaf.restrict",
      aggregation: "Charge.joinK / slotwise evidence union",
    },
    formalStatus: "projection-not-verified",
    proofBoundary: [
      "no Lean theorem identifies POSIX path claims with PredicationCell or administrative restrictions with AssocSheaf.Cochain",
      "extractor soundness and the classifier-to-Charge mapping are not yet carried by a checked certificate bridge",
      "the CALM biconditional remains open and this instrument does not infer that seams arise only from non-monotone operations",
    ],
  };
  register.digest = `sha256:${hash(register)}`;

  const asserted = argValue("--assert-reading");
  if (asserted !== undefined && !["bottom", "t", "f", "top"].includes(asserted)) refuse(`--assert-reading must be bottom, t, f, or top; got ${asserted}`);
  const assertionHeld = asserted === undefined || (asserted === "top"
    ? register.points.some((point) => point.reading === "top")
    : asserted === register.reading);
  if (!assertionHeld) emit({ ok: false, asserted, actual: register.reading, register }, 4);
  if (checkMode && register.content.charge.negative) emit({ ok: false, ...register }, 3);
  emit({ ok: true, ...register }, 0);
}

main().catch((error) => refuse(error?.stack ?? String(error)));
