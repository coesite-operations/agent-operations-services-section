#!/usr/bin/env node
/**
 * @description Sweeps a downstream unit's management records — its office pool, its projected skills' frontmatter, the inherited misspelling, and its pool records' provenance — against ruled practice, and reports every drift found rather than assuming conformance from a prior read. A hit inside a checked-out git submodule is not this unit's own nonconformance: it is still derived and reported, tagged out-of-jurisdiction and named to the submodule that owns it, but it does not gate --check. Use --check to settle whether a unit presently conforms (exit 3 on any in-jurisdiction finding) and --register to derive the register of what does not, jurisdiction included (findings are data; deriving them, whether empty or not, is success). Use before treating any downstream unit as settled, and any time "it passed before" is being trusted instead of re-run.
 *
 * @returns {object} every finding names the rule it violates and the path it occurred at — never a bare count standing in for what was found
 * @returns {object} every finding carries a jurisdiction: out-of-jurisdiction and the owning submodule directory when it falls inside a checked-out submodule, unit otherwise
 * @returns {object} --check exits 0 exactly when no in-jurisdiction finding remains and 3 whenever one does; an out-of-jurisdiction finding alone never fails it, and it is still printed rather than dropped
 * @returns {object} --register exits 0 whenever the sweep itself completed, whether the register it derived is empty or not; deriving the register is the success, not what it contains, and nothing found is suppressed for jurisdiction
 * @throws {Error} the named unit directory exists and is a directory this process can read
 *
 * Ruled practice is exactly the four rules the Chairperson has settled today,
 * and no others: office-pool records under a unit's content/offices are plain
 * <id>.json instances conforming to emsenn/schema/office — never loose .md, and
 * never the retired instance-dressed-as-schema .schema.json form; every
 * SKILL.md's frontmatter carries only name and description; the spelling
 * infometrologia appears nowhere in the unit outside _archive/ directories and
 * content/documents/ notes, because it is a ruled typo for obsmetrologia;
 * every record inside an instance pool (offices, duties, works, tasks,
 * work-items, dispatches, requirements) carries an x-provenance naming what
 * recorded it.
 *
 * A directory lies inside a checked-out git submodule, for this sweep's
 * purposes, exactly when it or an ancestor within the unit holds a .git file —
 * not a directory — the checkout signature git itself writes for a submodule;
 * this reads checked-out state directly rather than parsing .gitmodules,
 * because a registered-but-not-checked-out path and an actual checkout can
 * disagree.
 *
 * A unit's management records drift from ruled practice one record at a time,
 * and each drift looks, to anyone not re-checking it, exactly like conformance:
 * a loose `first-officer.md` reads as an office until you ask whether it is a
 * `.schema.json`; a SKILL.md with an extra frontmatter key still renders; the
 * string `infometrologia` sitting in a deploy workflow is invisible unless
 * something greps for it. Fa's own discipline is this script's discipline —
 * a rule that is not re-run against the record is not a rule, it is a memory
 * of one, and memories do not catch drift.
 *
 * This is deliberately a fixed, small ruled set — four checks, no others —
 * because ruled practice is what the Chairperson has settled, not what this
 * script infers is probably a good idea. A fifth check belongs here only once
 * a fifth rule has actually been settled elsewhere; adding one on suspicion
 * would make the sweep the thing deciding what conformance means, which is
 * exactly the decision this office does not hold.
 *
 * ## Run it
 *
 * ```sh
 * node normalize-a-units-management-records.js --check <unit-dir> --root <repo-root>
 * node normalize-a-units-management-records.js --register --unit <unit-dir> --root <repo-root>
 * ```
 *
 * `--check` is the gate: exit 0 conforming, exit 3 with every finding printed
 * as JSON on stdout otherwise. `--register` never gates — it derives the
 * findings as data and exits 0 whether there are none or many, because
 * deriving the register honestly is what this half of the instrument is for.
 *
 * ## Jurisdiction
 *
 * A hit inside a directory that is its own checked-out git submodule — a
 * directory holding a `.git` file, not a directory, distinct from the unit's
 * own toplevel — is not this unit's own nonconformance; the owning node has
 * to fix it in the submodule's repo, not here. The sweep still walks in,
 * still derives the hit, and still reports it under `--register`, tagged
 * `jurisdiction: "out-of-jurisdiction"` and named to the submodule directory
 * that owns it. `--check` only gates on `jurisdiction: "unit"` findings — a
 * unit whose only remaining hits are inside submodules passes.
 *
 * ## What it does not do
 *
 * It does not write to the unit it sweeps. It does not decide whether a
 * finding is worth fixing, and it does not fix one — that would make the
 * office that runs this script the office that also decided the correction
 * was fine, which is the exact independence failure the requirements line
 * exists against elsewhere in this pool. It reports.
 *
 * ## When NOT to use
 *
 * - Not for deciding what ruled practice should require — that is settled
 *   above this script, not inferred by it.
 * - Not as a substitute for --check's exit code. A session reading `ok: true`
 *   out of context and skipping the exit code has reintroduced exactly the
 *   recollection this instrument exists to replace.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

function resolveMeshScopeGate() {
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
  throw new Error("cannot find the shared mesh-scope gate");
}

const { inspectMeshScope } = await import(pathToFileURL(resolveMeshScopeGate()).href);

const SKIP_DIR_NAMES = new Set([
  "node_modules", ".git", "dist", "build", "out", "coverage",
  ".cache", ".next", ".astro", ".vercel", ".deploy",
]);

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".bmp", ".svg",
  ".pdf", ".zip", ".gz", ".tar", ".7z", ".mp4", ".mp3", ".mov", ".avi",
  ".wasm", ".woff", ".woff2", ".ttf", ".eot", ".map", ".lock",
]);

const MAX_SCAN_BYTES = 4 * 1024 * 1024;
const POOL_NAMES = new Set(["offices", "duties", "works", "tasks", "work-items", "dispatches", "requirements"]);

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function misuse(message) {
  process.stderr.write(`normalize-a-units-management-records: ${message}\n`);
  process.exit(1);
}

const ROOT = resolve(argValue("--root") ?? process.cwd());
const READ_A_SCHEMA = fileURLToPath(import.meta.resolve("@red-cup-engineering/json-schema-services-section/read-a-schema"));
const SCHEMAS_POOL = join(ROOT, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/schemas");

// The one validator, called as a subprocess — never copied. A schema check
// carried locally drifts from the pool it claims to enforce; this instrument
// spawns reading-a-schema instead, which is a call and not an import.
function validateAgainstSchema(type, data) {
  if (!existsSync(READ_A_SCHEMA)) {
    return { ok: false, errors: [`reading-a-schema not found at ${relative(ROOT, READ_A_SCHEMA)} — cannot check emsenn/schema/${type}`] };
  }
  let stdout;
  try {
    stdout = execFileSync(process.execPath, [READ_A_SCHEMA, type, "--pool", SCHEMAS_POOL], {
      input: JSON.stringify(data),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (e) {
    // read-a-schema exits non-zero on a nonconforming record; its verdict is
    // still JSON on stdout, so the thrown error's stdout is what is read.
    stdout = e.stdout ?? "";
  }
  let verdict;
  try {
    verdict = JSON.parse(stdout);
  } catch {
    return { ok: false, errors: [`reading-a-schema returned nothing parseable for emsenn/schema/${type}`] };
  }
  return { ok: !!verdict.ok, errors: verdict.errors ?? (verdict.error ? [verdict.error] : []) };
}

// Instance pools seat under a unit's content/ — classes in lib, instances in
// content. A pool still seated under lib/management is itself the drift.
function isManagementPool(parentDir, name) {
  return (basename(parentDir) === "content" || basename(parentDir) === "management") && POOL_NAMES.has(name);
}

// Rule 1: office-pool records are plain <id>.json instances conforming to
// emsenn/schema/office — never .md, and never the retired
// instance-dressed-as-schema .schema.json form.
function checkOfficesPool(officesDir, unitRoot, findings) {
  let entries;
  try {
    entries = readdirSync(officesDir);
  } catch (e) {
    findings.push({ rule: "office-pool-shape", path: relative(unitRoot, officesDir), detail: `unreadable: ${e.message}` });
    return;
  }
  for (const name of entries) {
    const full = join(officesDir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      findings.push({
        rule: "office-pool-shape",
        path: relative(unitRoot, full),
        detail: "office pool holds a subdirectory — ruled practice wants a flat <id>.json office instance here",
      });
      continue;
    }
    if (name.endsWith(".md")) {
      findings.push({
        rule: "office-pool-shape",
        path: relative(unitRoot, full),
        detail: "loose markdown office record — office pool records must be plain <id>.json instances conforming to emsenn/schema/office, never .md",
      });
      continue;
    }
    if (name.endsWith(".schema.json")) {
      findings.push({
        rule: "office-pool-shape",
        path: relative(unitRoot, full),
        detail: "instance dressed as a schema — an office record is an instance of emsenn/schema/office, filed as <id>.json; the .schema.json dress is the retired class/instance conflation",
      });
      continue;
    }
    if (!name.endsWith(".json")) {
      findings.push({
        rule: "office-pool-shape",
        path: relative(unitRoot, full),
        detail: "unexpected file in an office pool — only <id>.json office instances belong here",
      });
      continue;
    }
    let data;
    try {
      data = JSON.parse(readFileSync(full, "utf8"));
    } catch (e) {
      findings.push({ rule: "office-pool-shape", path: relative(unitRoot, full), detail: `not valid JSON: ${e.message}` });
      continue;
    }
    const result = validateAgainstSchema("office", data);
    if (!result.ok) {
      findings.push({
        rule: "office-pool-shape",
        path: relative(unitRoot, full),
        detail: `does not conform to emsenn/schema/office: ${result.errors.join("; ") || "(no detail)"}`,
      });
    }
  }
}

// Rule 2: every SKILL.md frontmatter carries only name and description.
function checkSkillFrontmatter(file, unitRoot, findings) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch (e) {
    findings.push({ rule: "skill-frontmatter", path: relative(unitRoot, file), detail: `unreadable: ${e.message}` });
    return;
  }
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(text);
  if (!m) {
    findings.push({ rule: "skill-frontmatter", path: relative(unitRoot, file), detail: "no frontmatter block found" });
    return;
  }
  const keys = m[1]
    .split("\n")
    .filter((line) => /^[A-Za-z0-9_-]+:/u.test(line))
    .map((line) => line.slice(0, line.indexOf(":")));
  const allowed = new Set(["name", "description"]);
  const extra = keys.filter((k) => !allowed.has(k));
  if (extra.length) {
    findings.push({
      rule: "skill-frontmatter",
      path: relative(unitRoot, file),
      detail: `frontmatter carries keys beyond name and description: ${extra.join(", ")}`,
    });
  }
  for (const required of ["name", "description"]) {
    if (!keys.includes(required)) {
      findings.push({ rule: "skill-frontmatter", path: relative(unitRoot, file), detail: `frontmatter is missing '${required}'` });
    }
  }
}

// Rule 3: infometrologia appears nowhere outside _archive/ and content/documents/.
function isExemptFromSpellingCheck(relPath) {
  const p = `/${relPath.split("\\").join("/")}`;
  return p.includes("/_archive/") || p.includes("/content/documents/");
}

function checkSpelling(file, unitRoot, findings) {
  const relPath = relative(unitRoot, file);
  if (isExemptFromSpellingCheck(relPath)) return;
  if (BINARY_EXTENSIONS.has(extname(file).toLowerCase())) return;
  let st;
  try {
    st = statSync(file);
  } catch {
    return;
  }
  if (st.size > MAX_SCAN_BYTES) return;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return; // not readable as utf8 — treated as binary, not scanned
  }
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (line.includes("infometrologia")) {
      findings.push({
        rule: "infometrologia-spelling",
        path: relPath,
        detail: `line ${i + 1}: ${line.trim().slice(0, 200)}`,
      });
    }
  });
}

// Rule 4: pool records carry x-provenance naming what recorded them.
function checkPoolProvenance(poolDir, unitRoot, findings) {
  let entries;
  try {
    entries = readdirSync(poolDir);
  } catch (e) {
    findings.push({ rule: "pool-provenance", path: relative(unitRoot, poolDir), detail: `unreadable: ${e.message}` });
    return;
  }
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    const full = join(poolDir, name);
    if (statSync(full).isDirectory()) continue;
    let data;
    try {
      data = JSON.parse(readFileSync(full, "utf8"));
    } catch (e) {
      findings.push({ rule: "pool-provenance", path: relative(unitRoot, full), detail: `not valid JSON: ${e.message}` });
      continue;
    }
    const prov = data["x-provenance"];
    const recordedBy = prov && typeof prov === "object" ? prov["recorded-by"] : undefined;
    if (typeof recordedBy !== "string" || !recordedBy.trim()) {
      findings.push({ rule: "pool-provenance", path: relative(unitRoot, full), detail: "no x-provenance naming what recorded it" });
    }
  }
}

// Tags a finding with where it stands relative to the unit being swept:
// jurisdiction "unit" when it is the unit's own record, "out-of-jurisdiction"
// plus the owning submodule directory when it fell inside one. Nothing is
// dropped here — tagging, never filtering, is this function's whole job.
function withJurisdiction(finding, submoduleDir, unitRoot) {
  if (submoduleDir) {
    return { ...finding, jurisdiction: "out-of-jurisdiction", submodule: relative(unitRoot, submoduleDir) };
  }
  return { ...finding, jurisdiction: "unit" };
}

function sweep(unitRoot) {
  const findings = [];
  (function walk(dir, submoduleDir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      findings.push(withJurisdiction(
        { rule: "sweep-error", path: relative(unitRoot, dir), detail: `directory unreadable: ${e.message}` },
        submoduleDir,
        unitRoot,
      ));
      return;
    }
    // Files directly inside dir share dir's own jurisdiction context.
    const sink = { push: (finding) => findings.push(withJurisdiction(finding, submoduleDir, unitRoot)) };
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) continue;
        // Mesh scope is one firm-wide rule carried by mesh-scope.js. The
        // deepest crossed boundary owns a nested finding; this sweep keeps no
        // private `.git` classifier of its own.
        let childSubmoduleDir = submoduleDir;
        try {
          childSubmoduleDir = inspectMeshScope({ authorityRoot: unitRoot, subject: full }).deepestOwner ?? submoduleDir;
        } catch (error) {
          findings.push(withJurisdiction(
            { rule: "sweep-error", path: relative(unitRoot, full), detail: `mesh scope unreadable: ${error.message}` },
            submoduleDir,
            unitRoot,
          ));
          continue;
        }
        const childSink = { push: (finding) => findings.push(withJurisdiction(finding, childSubmoduleDir, unitRoot)) };
        if ((basename(dir) === "content" || basename(dir) === "management") && entry.name === "offices") checkOfficesPool(full, unitRoot, childSink);
        if (isManagementPool(dir, entry.name)) checkPoolProvenance(full, unitRoot, childSink);
        walk(full, childSubmoduleDir);
      } else if (entry.isFile()) {
        if (entry.name === "SKILL.md") checkSkillFrontmatter(full, unitRoot, sink);
        checkSpelling(full, unitRoot, sink);
      }
    }
  })(unitRoot, null);
  return findings;
}

function resolveUnit(unitArg, flagName) {
  if (!unitArg || unitArg.startsWith("--")) misuse(`${flagName} requires a unit directory`);
  const unitDir = resolve(ROOT, unitArg);
  if (!existsSync(unitDir) || !statSync(unitDir).isDirectory()) {
    misuse(`unit directory does not exist: ${unitArg} (resolved ${relative(ROOT, unitDir)})`);
  }
  return unitDir;
}

function runCheck() {
  const checkIdx = process.argv.indexOf("--check");
  const unitDir = resolveUnit(process.argv[checkIdx + 1], "--check");
  const findings = sweep(unitDir);
  // Out-of-jurisdiction findings are still in the list below — reported,
  // never suppressed — but only in-jurisdiction findings gate the exit.
  const gating = findings.filter((f) => f.jurisdiction !== "out-of-jurisdiction");
  const result = { ok: gating.length === 0, mode: "check", unit: relative(ROOT, unitDir), findings };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(gating.length === 0 ? 0 : 3);
}

function runRegister() {
  const unitDir = resolveUnit(argValue("--unit"), "--register --unit");
  const findings = sweep(unitDir);
  const result = { ok: true, mode: "register", unit: relative(ROOT, unitDir), count: findings.length, findings };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

if (process.argv.includes("--check")) runCheck();
else if (process.argv.includes("--register")) runRegister();
else misuse("pass --check <unit-dir> --root <repo-root>, or --register --unit <unit-dir> --root <repo-root>");
