#!/usr/bin/env node
/**
 * @description Records one append-only baseline transition only after re-deriving a decided, uniquely seated local Change Control Board authorization for the exact changed item; sweeps existing records against current class, decision, office, and mesh evidence. Use when configuration management must turn a ruled change into durable history without crossing a sovereign node boundary.
 *
 * @param {string} root - explicitly names the operating git worktree authority and exactly one local Change Control Board resolves in an admitted enterprise unit
 * @throws {Error} the input conforms to emsenn/schema/change-record and its ccb-decision is decided by that local board with x-provenance.authorizes-changes containing the exact item
 *
 * A successful commission publishes one canonical JSON instance atomically at
 * the admitted unit's content/changes seat without overwriting history. Every
 * refusal before publication removes only invocation-owned artifacts and
 * never reports an empty sweep as clean.
 *
 * The class constrains asserted shape. This instrument re-derives authority:
 * current local office, current decision, exact item authorization, and current
 * observable mesh jurisdiction. It imports the firm's shared resolver, schema
 * reader, and mesh classifier; it carries no private copy of their laws.
 */

import { spawnSync } from "node:child_process";
import {
  closeSync,
  copyFileSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const TYPE = "change-record";
const MAX_PARENT_ACQUIRE_ATTEMPTS = 2;

class GateError extends Error {
  constructor(code, message, facts = {}) {
    super(message);
    this.name = "GateError";
    this.code = code;
    this.facts = facts;
  }
}

const fail = (code, message, facts) => { throw new GateError(code, message, facts); };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function pathExists(path) {
  try { lstatSync(path); return true; } catch (error) { if (error.code === "ENOENT" || error.code === "ENOTDIR") return false; throw error; }
}

function walkUp(from) {
  const dirs = [];
  let at = resolve(from);
  for (;;) {
    dirs.push(at);
    const up = dirname(at);
    if (up === at) return dirs;
    at = up;
  }
}

function projectedSkillRoot() {
  if (basename(HERE) !== "scripts") return null;
  return dirname(dirname(HERE));
}

function candidatesAtSkillRoot(root, flatName) {
  if (!pathExists(root)) return [];
  const found = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const at = join(root, entry.name, "scripts", flatName);
    if (pathExists(at)) found.push(realpathSync(at));
  }
  return [...new Set(found)];
}

function chooseTier(label, tier) {
  const found = [...new Set(tier.filter(pathExists).map((p) => realpathSync(p)))];
  if (found.length > 1) fail("dependency: ambiguous", `${label} is ambiguous at one locator tier`, { found });
  return found[0] ?? null;
}

function locateDependency(flatName, anchors, root) {
  const beside = chooseTier(flatName, [join(HERE, flatName)]);
  if (beside) return beside;

  const projected = projectedSkillRoot();
  if (projected) {
    const hit = chooseTier(flatName, candidatesAtSkillRoot(projected, flatName));
    if (hit) return hit;
    fail("dependency: projected-sibling-missing", `${flatName} is absent from the recorder's projected skill root`, { projected });
  }

  for (const anchor of anchors) {
    for (const at of walkUp(anchor)) {
      const flat = chooseTier(flatName, [join(at, "lib", "management", "skills", flatName)]);
      if (flat) return flat;
      const carriers = candidatesAtSkillRoot(join(at, "lib", "management", "skills"), flatName);
      const carried = chooseTier(flatName, carriers);
      if (carried) return carried;
    }
  }

  if (root) {
    const final = chooseTier(flatName, [
      join(root, "lib", "emsenn", "lib", "management", "skills", flatName),
      ...candidatesAtSkillRoot(join(root, "lib", "emsenn", "lib", "management", "skills"), flatName),
    ]);
    if (final) return final;
  }
  fail("dependency: absent", `cannot find required shared mechanism ${flatName}`);
}

function dependencyWitness(path) {
  const bytes = readFileSync(path);
  return { path: realpathSync(path), sha256: sha256(bytes) };
}

function parseArgs(argv) {
  const values = {};
  const positional = [];
  const modes = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (["--root", "--from"].includes(arg)) {
      const value = argv[++i];
      if (!value || value.startsWith("--")) fail("cli: missing-value", `${arg} requires a value`);
      values[arg.slice(2)] = value;
    } else if (["--help", "--check", "--verify", "--dry-run"].includes(arg)) {
      modes.add(arg.slice(2));
    } else if (arg.startsWith("-")) {
      fail("cli: unknown-flag", `unknown flag '${arg}'`);
    } else positional.push(arg);
  }
  if (positional.length > 1) fail("input: multiple", "commission accepts at most one positional JSON path");
  if (["check", "verify", "dry-run"].filter((x) => modes.has(x)).length > 1) {
    fail("cli: incompatible-modes", "--check, --verify, and --dry-run are mutually exclusive");
  }
  if ((modes.has("check") || modes.has("verify")) && positional.length) {
    fail("cli: input-with-sweep", "--check and --verify accept no positional input");
  }
  if (!modes.has("help") && !values.root) fail("unit/jurisdiction: root-required", "operational modes require explicit --root DIR");
  return { ...values, positional: positional[0] ?? null, modes };
}

function assertAuthorityRoot(rootArg) {
  let root;
  try { root = realpathSync(resolve(rootArg)); } catch (error) {
    fail("unit/jurisdiction: invalid-root", `--root does not resolve to an existing directory: ${error.message}`);
  }
  if (!statSync(root).isDirectory()) fail("unit/jurisdiction: invalid-root", "--root is not a directory");
  const marker = join(root, ".git");
  if (!pathExists(marker)) fail("unit/jurisdiction: invalid-root", "--root is not a git worktree root");
  const followed = statSync(marker);
  if (!followed.isFile() && !followed.isDirectory()) fail("unit/jurisdiction: invalid-root", "--root has an invalid .git marker");
  return root;
}

function unitFromOfficeSeat(seat) {
  const path = resolve(seat);
  const pool = dirname(path);
  if (basename(pool) !== "offices") return null;
  const holder = dirname(pool);
  if (basename(holder) === "content") return dirname(holder);
  if (basename(holder) === "management" && basename(dirname(holder)) === "lib") return dirname(dirname(holder));
  return null;
}

function snapshotExtends(later, admitted) {
  const n = admitted.components.length;
  if (later.components.length < n || later.markers.length < n) return false;
  return same(later.components.slice(0, n), admitted.components)
    && same(later.markers.slice(0, n), admitted.markers);
}

function normalizeOfficeName(value) {
  return typeof value === "string" ? value.trim().replace(/^the\s+/iu, "").toLowerCase() : "";
}

function schemaVerdict(ctx, schema, data) {
  const run = spawnSync(process.execPath, [ctx.readerPath, schema, "--pool", ctx.schemaPool], {
    input: JSON.stringify(data), encoding: "utf8",
  });
  let verdict;
  try { verdict = JSON.parse(run.stdout); } catch {
    fail("schema-reader: invalid-output", `reading-a-schema returned no parseable verdict for ${schema}`, { output: (run.stderr || run.stdout || "").trim() });
  }
  return verdict;
}

function requireConforms(ctx, schema, data, code, subject) {
  const verdict = schemaVerdict(ctx, schema, data);
  if (!verdict.ok) fail(code, `${subject} does not conform to ${schema}.schema.json`, { errors: verdict.errors ?? [verdict.error] });
}

function readJson(path, code, subject) {
  let text;
  try { text = readFileSync(path, "utf8"); } catch (error) { fail(code, `${subject} cannot be read: ${error.message}`); }
  try { return JSON.parse(text); } catch (error) { fail(code, `${subject} is not valid JSON: ${error.message}`); }
}

function admitContent(ctx) {
  const expected = join(ctx.unitAdmission.subject, "content");
  let st;
  try { st = lstatSync(expected); } catch (error) {
    fail("unit/jurisdiction: content-seat-not-real-directory", `canonical content seat is absent or unreadable: ${error.message}`);
  }
  if (!st.isDirectory() || st.isSymbolicLink()) {
    fail("unit/jurisdiction: content-seat-not-real-directory", "canonical content seat must be a real non-symlink directory");
  }
  let admission;
  try { admission = ctx.inspectMeshScope({ authorityRoot: ctx.root, subject: expected }); } catch (error) {
    fail("unit/jurisdiction: content-admission-failed", error.message, error.facts);
  }
  if (!admission.inside) fail("unit/jurisdiction: outside-authority-root", "content seat lies outside authority root");
  if (admission.boundaries.length) fail("unit/jurisdiction: sovereign-boundary", "content seat crosses a sovereign boundary", { boundaries: admission.boundaries });
  if (admission.subject !== expected) fail("unit/jurisdiction: canonical-content-seat-mismatch", "content mesh subject is not the ruled literal seat", { expected, actual: admission.subject });
  if (!snapshotExtends(admission.snapshot, ctx.unitAdmission.snapshot)) fail("unit/jurisdiction: prefix-changed", "content snapshot does not extend admitted unit snapshot");
  return { path: expected, admission, dev: st.dev, ino: st.ino };
}

function revalidateContent(ctx, admitted) {
  const next = admitContent(ctx);
  if (next.dev !== admitted.dev || next.ino !== admitted.ino) fail("unit/jurisdiction: prefix-changed", "content directory identity changed");
  if (!same(next.admission.snapshot, admitted.admission.snapshot)) fail("unit/jurisdiction: prefix-changed", "content mesh evidence changed");
  return next;
}

async function buildContext(args) {
  const root = assertAuthorityRoot(args.root);
  const anchors = [args.from ?? root, root];
  const resolverPath = locateDependency("resolve-an-identifier.js", anchors, root);
  const readerPath = locateDependency("read-a-schema.js", anchors, root);
  const meshPath = locateDependency("mesh-scope.js", anchors, root);
  const resolver = await import(`${pathToFileURL(resolverPath).href}?v=${sha256(readFileSync(resolverPath))}`);
  const mesh = await import(`${pathToFileURL(meshPath).href}?v=${sha256(readFileSync(meshPath))}`);
  if (typeof resolver.resolveIdentifier !== "function" || typeof mesh.inspectMeshScope !== "function") {
    fail("dependency: contract", "shared resolver or mesh carrier lacks its required export");
  }

  const from = args.from ? realpathSync(resolve(root, args.from)) : null;
  const initial = resolver.resolveIdentifier("change-control-board", {
    kind: "offices",
    ...(from ? { strategy: "nearest", from } : { strategy: "global", root }),
  });
  if (!initial.ok) fail("unit: office-resolution", initial.error);
  if (initial.seats.length !== 1) fail("unit: ccb-seat-count", `expected exactly one Change Control Board seat, found ${initial.seats.length}`, { seats: initial.seats });
  const unit = unitFromOfficeSeat(initial.seats[0]);
  if (!unit) fail("unit: unrecognized-office-seat", "Change Control Board seat is not in a recognized office pool", { seat: initial.seats[0] });

  let unitAdmission;
  try { unitAdmission = mesh.inspectMeshScope({ authorityRoot: root, subject: unit }); } catch (error) {
    fail("unit/jurisdiction: admission-failed", error.message, error.facts);
  }
  if (!unitAdmission.inside) fail("unit/jurisdiction: outside-authority-root", "enterprise unit lies outside authority root");
  if (unitAdmission.boundaries.length) fail("unit/jurisdiction: sovereign-boundary", "enterprise unit crosses a sovereign boundary", { boundaries: unitAdmission.boundaries });

  const repeated = resolver.resolveIdentifier("change-control-board", { kind: "offices", strategy: "nearest", from: unit });
  if (!repeated.ok || repeated.seats.length !== 1 || realpathSync(repeated.seats[0]) !== realpathSync(initial.seats[0])) {
    fail("unit: ccb-seat-disagreement", "nearest local Change Control Board lookup does not reproduce the unique admitted seat", { initial: initial.seats, repeated: repeated.seats });
  }
  const schemaPool = join(unit, "lib", "schemas");
  const ctx = {
    root, unit: unitAdmission.subject, unitAdmission, resolver, inspectMeshScope: mesh.inspectMeshScope,
    resolverPath, readerPath, meshPath, schemaPool,
    dependencies: {
      resolver: dependencyWitness(resolverPath), reader: dependencyWitness(readerPath), mesh: dependencyWitness(meshPath),
    },
  };
  const office = readJson(repeated.seats[0], "unit: ccb-unreadable", "Change Control Board office");
  requireConforms(ctx, "office", office, "unit: ccb-schema-invalid", "Change Control Board office");
  if (office.id !== "change-control-board" || !office.name?.trim()) fail("unit: ccb-identity-invalid", "local Change Control Board office has invalid identity");
  ctx.ccbSeat = repeated.seats[0];
  ctx.ccbOffice = office;
  ctx.contentAdmission = admitContent(ctx);
  return ctx;
}

function requireCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value ?? "");
  if (!match) fail("record: impossible-date", "recorded-on is not a real calendar date");
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    fail("record: impossible-date", `recorded-on '${value}' is not a real calendar date`);
  }
}

function validateDecision(ctx, id, item) {
  const hit = ctx.resolver.resolveIdentifier(id, { kind: "decision-records", strategy: "nearest", from: ctx.unit, multiSeat: true });
  if (!hit.ok) fail("decision-authorization: resolution", hit.error);
  if (hit.seats.length === 0) fail("decision-authorization: absent", `ccb-decision '${id}' seats in no decision-records pool`);
  if (hit.seats.length !== 1) fail("decision-authorization: ambiguous", `ccb-decision '${id}' has ${hit.seats.length} seats`, { seats: hit.seats });
  const decision = readJson(hit.seats[0], "decision-authorization: unreadable", `ccb-decision '${id}'`);
  requireConforms(ctx, "decision-record", decision, "decision-authorization: schema-invalid", `ccb-decision '${id}'`);
  if (decision.status !== "decided") fail("decision-authorization: not-decided", `ccb-decision '${id}' is not status decided`, { found: decision.status ?? "absent" });
  if (normalizeOfficeName(decision.decider) !== normalizeOfficeName(ctx.ccbOffice.name)) {
    fail("decision-authorization: wrong-decider", `ccb-decision '${id}' was decided by '${decision.decider}', not the local ${ctx.ccbOffice.name}`);
  }
  const authorized = decision["x-provenance"]?.["authorizes-changes"];
  if (!Array.isArray(authorized) || !authorized.length || authorized.some((x) => typeof x !== "string" || !x.trim()) || new Set(authorized).size !== authorized.length) {
    fail("decision-authorization: malformed", `ccb-decision '${id}' has no well-formed nonempty unique x-provenance.authorizes-changes array`);
  }
  if (!authorized.includes(item)) fail("decision-authorization: item-not-authorized", `ccb-decision '${id}' does not authorize exact item '${item}'`, { authorized });
  return { seat: hit.seats[0], decision, authorized };
}

function validateChange(ctx, data) {
  requireConforms(ctx, TYPE, data, "record: schema-invalid", `change '${data?.id ?? "<missing>"}'`);
  if (data.from.trim() === data.to.trim()) fail("record: no-transition", "source and target state describe no change");
  requireCalendarDate(data["x-provenance"]["recorded-on"]);
  return validateDecision(ctx, data["ccb-decision"], data.item);
}

function parseInput(text, source) {
  if (!text.trim()) fail("input: empty", `${source} supplied no JSON data`);
  let data;
  try { data = JSON.parse(text); } catch (error) { fail("input: invalid-json", `${source} is invalid JSON: ${error.message}`); }
  if (data && Object.prototype.hasOwnProperty.call(data, "body")) fail("input: body-key", "change input must not carry a body key");
  if (typeof data?.["ccb-decision"] !== "string" || !data["ccb-decision"].trim()) {
    fail("decision-authorization: missing-ccb-decision", "change input is missing a nonblank ccb-decision");
  }
  return data;
}

function defaultMutator(trace = null) {
  const note = (op, operands, fn) => {
    trace?.push({ op, operands });
    return fn();
  };
  return {
    mkdir: (path) => note("mkdir", [path], () => mkdirSync(path)),
    openTemp: (path) => note("open-temp", [path], () => openSync(path, "wx", 0o600)),
    writeTemp: (fd, text) => note("write-temp", [fd, text.length], () => writeSync(fd, text, null, "utf8")),
    closeTemp: (fd) => note("close-temp", [fd], () => closeSync(fd)),
    link: (from, to) => note("link", [from, to], () => linkSync(from, to)),
    unlink: (path) => note("unlink", [path], () => unlinkSync(path)),
    rmdir: (path) => note("rmdir", [path], () => rmdirSync(path)),
  };
}

function admitChangesParent(ctx, path, unitSnapshot) {
  const expected = join(ctx.unitAdmission.subject, "content", "changes");
  let st;
  try { st = lstatSync(path); } catch (error) { fail("publication: parent-churn", `changes parent disappeared: ${error.message}`); }
  if (st.isSymbolicLink()) fail("publication: parent-symlink", "changes parent is a symlink");
  if (!st.isDirectory()) fail("publication: parent-not-directory", "changes parent is not a real directory");
  let exact;
  try { exact = ctx.inspectMeshScope({ authorityRoot: ctx.root, subject: path }); } catch (error) { fail("unit/jurisdiction: parent-admission-failed", error.message, error.facts); }
  if (!exact.inside) fail("unit/jurisdiction: outside-authority-root", "changes parent lies outside authority root");
  if (exact.boundaries.length) fail("unit/jurisdiction: sovereign-boundary", "changes parent crosses a sovereign boundary", { boundaries: exact.boundaries });
  if (exact.subject !== expected) fail("unit/jurisdiction: canonical-seat-mismatch", "changes mesh subject is not the ruled pool seat", { expected, actual: exact.subject });
  if (!snapshotExtends(exact.snapshot, unitSnapshot)) fail("unit/jurisdiction: prefix-changed", "changes parent snapshot does not extend admitted unit snapshot");
  return { st, exact };
}

function cleanupOwned(mut, owned) {
  const warnings = [];
  if (owned.fd !== null) {
    try { closeSync(owned.fd); } catch { /* already closed */ }
    owned.fd = null;
  }
  if (owned.temp && pathExists(owned.temp)) {
    try { mut.unlink(owned.temp); } catch (error) { warnings.push(`temp cleanup failed: ${error.message}`); }
  }
  if (owned.createdParent && pathExists(owned.parent)) {
    try {
      const st = lstatSync(owned.parent);
      if (st.dev === owned.parentDev && st.ino === owned.parentIno && st.isDirectory() && !st.isSymbolicLink() && readdirSync(owned.parent).length === 0) mut.rmdir(owned.parent);
      else warnings.push("owned changes parent is no longer the same empty directory; preserved");
    } catch (error) { warnings.push(`parent cleanup incomplete: ${error.message}`); }
  }
  return warnings;
}

function acquireParent(ctx, mut, changesDir, owned) {
  const observations = [];
  for (let attempt = 1; attempt <= MAX_PARENT_ACQUIRE_ATTEMPTS; attempt += 1) {
    if (!pathExists(changesDir)) {
      try {
        mut.mkdir(changesDir);
        const st = lstatSync(changesDir);
        owned.createdParent = true; owned.parent = changesDir; owned.parentDev = st.dev; owned.parentIno = st.ino;
      } catch (error) {
        observations.push({ attempt, operation: "mkdir", error: error.code ?? error.message });
        if (error.code === "EEXIST" && attempt < MAX_PARENT_ACQUIRE_ATTEMPTS) continue;
        fail("publication: parent-churn", "changes parent did not settle under bounded acquisition", { observations });
      }
    }
    try { return admitChangesParent(ctx, changesDir, ctx.unitAdmission.snapshot); }
    catch (error) {
      observations.push({ attempt, code: error.code, message: error.message });
      if (error.code === "publication: parent-churn" && attempt < MAX_PARENT_ACQUIRE_ATTEMPTS) continue;
      throw error;
    }
  }
  fail("publication: parent-churn", "changes parent did not settle under bounded acquisition", { observations });
}

function runCommission(ctx, data, { dryRun = false, mut = defaultMutator(), hooks = {} } = {}) {
  if (typeof data.id !== "string" || !data.id) {
    validateChange(ctx, data);
  }
  const finalPath = join(ctx.unit, "content", "changes", `${data.id}.json`);
  if (pathExists(finalPath)) fail("publication: duplicate", `change '${data.id}' already exists at ${finalPath} — refused, never overwritten`);
  validateChange(ctx, data);
  revalidateContent(ctx, ctx.contentAdmission);
  if (dryRun) {
    if (pathExists(dirname(finalPath))) admitChangesParent(ctx, dirname(finalPath), ctx.unitAdmission.snapshot);
    return { ok: true, dryRun: true, would: { write: finalPath } };
  }

  const owned = { fd: null, temp: null, createdParent: false, parent: dirname(finalPath) };
  let published = false;
  try {
    const acquired = acquireParent(ctx, mut, owned.parent, owned);
    const suffix = `${process.pid}-${Date.now()}-${randomBytes(8).toString("hex")}`;
    owned.temp = join(owned.parent, `.${data.id}.${suffix}.tmp`);
    owned.fd = mut.openTemp(owned.temp);
    const canonical = `${JSON.stringify(data, null, 2)}\n`;
    mut.writeTemp(owned.fd, canonical);
    mut.closeTemp(owned.fd); owned.fd = null;
    if (readFileSync(owned.temp, "utf8") !== canonical) fail("publication: readback-mismatch", "temporary record did not read back byte-identical");
    const reread = readJson(owned.temp, "publication: readback-invalid", "temporary change record");
    validateChange(ctx, reread);
    hooks.afterTempValidated?.({ ctx, owned, mut });

    revalidateContent(ctx, ctx.contentAdmission);
    const fresh = admitChangesParent(ctx, owned.parent, ctx.unitAdmission.snapshot);
    if (fresh.st.dev !== acquired.st.dev || fresh.st.ino !== acquired.st.ino || !same(fresh.exact.snapshot, acquired.exact.snapshot)) {
      fail("unit/jurisdiction: prefix-changed", "changes parent identity or mesh evidence changed before publication");
    }
    try { mut.link(owned.temp, finalPath); } catch (error) {
      if (error.code === "EEXIST") fail("publication: duplicate", `change '${data.id}' already exists at ${finalPath} — refused, never overwritten`);
      throw error;
    }
    published = true;
    let cleanupWarning = null;
    try { mut.unlink(owned.temp); owned.temp = null; } catch (error) { cleanupWarning = `published; redundant temp cleanup failed: ${error.message}`; }
    return { ok: true, recorded: { id: data.id, path: finalPath }, ...(cleanupWarning ? { cleanupWarning } : {}) };
  } catch (error) {
    try { hooks.cleanup?.({ ctx, owned, mut }); } catch { /* verifier-owned failpoint cleanup is best effort and independently asserted */ }
    const warnings = cleanupOwned(mut, owned);
    if (published) throw error;
    if (error instanceof GateError && warnings.length) error.facts = { ...error.facts, cleanup: "incomplete", warnings };
    throw error;
  }
}

function runCheck(ctx) {
  revalidateContent(ctx, ctx.contentAdmission);
  const changesDir = join(ctx.unit, "content", "changes");
  if (!pathExists(changesDir)) fail("sweep: empty", "found no records at all — an empty sweep is a broken sweep, not a clean one");
  admitChangesParent(ctx, changesDir, ctx.unitAdmission.snapshot);
  const entries = readdirSync(changesDir).filter((x) => x.endsWith(".json")).sort();
  if (!entries.length) fail("sweep: empty", "found no records at all — an empty sweep is a broken sweep, not a clean one");
  const checked = [];
  for (const entry of entries) {
    const data = readJson(join(changesDir, entry), "sweep: unreadable", `change record '${entry}'`);
    if (`${data.id}.json` !== entry) fail("sweep: id-seat-mismatch", `change record '${entry}' carries id '${data.id}'`);
    validateChange(ctx, data);
    checked.push(data.id);
  }
  return { ok: true, checked: checked.length, records: checked };
}

function fixtureDecision({ id = "authorize-change", item, sentinel = "sentinel-item", status = "decided", decider = "the Change Control Board", authorization = true } = {}) {
  return {
    id, name: `authorize ${item ?? "fixture"}`, decider, status,
    context: "A fixture change requires an exact machine-settleable ruling.",
    options: [
      { label: "authorize", description: "Authorize the exact fixture item." },
      { label: "refuse", description: "Do not authorize the fixture item." },
    ],
    decision: "Authorize the exact fixture item.",
    consequences: "The isolated recorder may exercise its publication path.",
    ...(authorization ? { "x-provenance": { "authorizes-changes": [item, sentinel] } } : {}),
  };
}

function fixtureChange(id = "fixture-change", item = "fixture/item") {
  return {
    id, name: `record ${id}`, item, from: "absent", to: "present",
    "ccb-decision": "authorize-change",
    "x-provenance": { "recorded-by": "verification fixture", "recorded-on": "2026-07-16" },
  };
}

function writeJson(path, value) { writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }

function manifestNode(label, path, rows) {
  let st;
  try { st = lstatSync(path); } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") { rows.push({ label, path: ".", kind: "absent" }); return; }
    throw error;
  }
  const kind = st.isSymbolicLink() ? "symlink" : st.isDirectory() ? "directory" : st.isFile() ? "file" : "other";
  const row = { label, path: ".", kind, mode: st.mode, dev: st.dev, ino: st.ino };
  if (kind === "symlink") row.target = readlinkSync(path);
  if (kind === "file") {
    const bytes = readFileSync(path);
    row.bytes = bytes.length;
    row.sha256 = sha256(bytes);
  }
  rows.push(row);
  if (kind !== "directory") return;
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir).sort()) {
      const at = join(dir, entry);
      const child = lstatSync(at);
      const childKind = child.isSymbolicLink() ? "symlink" : child.isDirectory() ? "directory" : child.isFile() ? "file" : "other";
      const item = { label, path: prefix ? `${prefix}/${entry}` : entry, kind: childKind, mode: child.mode, dev: child.dev, ino: child.ino };
      if (childKind === "symlink") item.target = readlinkSync(at);
      if (childKind === "file") {
        const bytes = readFileSync(at); item.bytes = bytes.length; item.sha256 = sha256(bytes);
      }
      rows.push(item);
      if (childKind === "directory") walk(at, item.path);
    }
  };
  walk(path, "");
}

function territoryManifest(namedPaths) {
  const rows = [];
  for (const [label, path] of Object.entries(namedPaths)) manifestNode(label, path, rows);
  return rows;
}

function tempEntries(unit) {
  const pool = join(unit, "content", "changes");
  if (!pathExists(pool) || !lstatSync(pool).isDirectory()) return [];
  return readdirSync(pool).filter((entry) => entry.endsWith(".tmp") || entry.includes(".tmp."));
}

function makeFixture(liveCtx, { authorityRoot = null, unitParent = null, legacyOffice = false } = {}) {
  const root = authorityRoot ?? mkdtempSync(join(tmpdir(), "record-change-authority-"));
  if (!pathExists(join(root, ".git"))) mkdirSync(join(root, ".git"));
  const unit = join(unitParent ?? root, `enterprise-${randomBytes(4).toString("hex")}`);
  mkdirSync(join(unit, "lib", "schemas"), { recursive: true });
  mkdirSync(join(unit, "content", "decision-records"), { recursive: true });
  const officePool = legacyOffice ? join(unit, "lib", "management", "offices") : join(unit, "content", "offices");
  mkdirSync(officePool, { recursive: true });
  if (!pathExists(join(unit, "content"))) mkdirSync(join(unit, "content"));
  for (const name of ["change-record", "decision-record", "office"]) {
    copyFileSync(join(liveCtx.schemaPool, `${name}.schema.json`), join(unit, "lib", "schemas", `${name}.schema.json`));
  }
  copyFileSync(liveCtx.ccbSeat, join(officePool, "change-control-board.json"));
  return { root, unit, officePool, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function captureError(fn) {
  try { return { ok: true, value: fn() }; } catch (error) {
    return { ok: false, code: error.code ?? "unexpected", message: error.message, facts: error.facts ?? {} };
  }
}

function assertCase(condition, name, observations = {}) {
  if (!condition) fail("verify: assertion", `verification case '${name}' did not settle`, observations);
  return { name, held: true, observations };
}

async function verify(args) {
  const liveCtx = await buildContext(args);
  const cases = [];
  const fx = makeFixture(liveCtx);
  try {
    const ctx = await buildContext({ root: fx.root, from: fx.unit });
    const item = "fixture/item";
    const change = fixtureChange("fixture-change", item);
    const decisionPath = join(fx.unit, "content", "decision-records", "authorize-change.json");
    writeJson(decisionPath, fixtureDecision({ item }));

    const positionalPath = join(tmpdir(), `record-change-positional-${process.pid}-${randomBytes(6).toString("hex")}.json`);
    writeFileSync(positionalPath, '{"item":"a-fixture-item-with-no-decision","old-state":"x","new-state":"y"}');
    const positionalBefore = territoryManifest({ unit: fx.unit, positional: positionalPath });
    let taskFixture;
    try {
      const cli = spawnSync(process.execPath, [SELF, positionalPath, "--root", fx.root, "--from", fx.unit], { encoding: "utf8" });
      let body;
      try { body = JSON.parse(cli.stdout); } catch { body = { code: "unparseable", error: cli.stderr || cli.stdout }; }
      taskFixture = { exit: cli.status, ...body };
      const positionalAfter = territoryManifest({ unit: fx.unit, positional: positionalPath });
      cases.push(assertCase(cli.status === 1 && body.code === "decision-authorization: missing-ccb-decision" && same(positionalAfter, positionalBefore), "positional-missing-decision-cli", { ...taskFixture, manifestEqual: same(positionalAfter, positionalBefore) }));
    } finally { unlinkSync(positionalPath); }

    const empty = captureError(() => runCheck(ctx));
    cases.push(assertCase(!empty.ok && empty.code === "sweep: empty" && !pathExists(join(fx.unit, "content", "changes")), "empty-sweep-refuses", empty));

    const dry = runCommission(ctx, change, { dryRun: true });
    cases.push(assertCase(dry.ok && dry.dryRun && !pathExists(join(fx.unit, "content", "changes")), "authorized-dry-run", dry));

    const positive = runCommission(ctx, change);
    cases.push(assertCase(positive.ok && pathExists(join(fx.unit, "content", "changes", "fixture-change.json")), "authorized-commission", positive));
    const sweep = runCheck(ctx);
    cases.push(assertCase(sweep.ok && sweep.checked === 1, "populated-sweep", sweep));

    const duplicateBefore = readFileSync(join(fx.unit, "content", "changes", "fixture-change.json"));
    const duplicate = captureError(() => runCommission(ctx, change));
    cases.push(assertCase(!duplicate.ok && duplicate.code === "publication: duplicate" && sha256(readFileSync(join(fx.unit, "content", "changes", "fixture-change.json"))) === sha256(duplicateBefore), "duplicate-no-clobber", duplicate));

    const instancePath = join(fx.unit, "content", "changes", "fixture-change.json");
    const schemaPath = join(fx.unit, "lib", "schemas", "change-record.schema.json");
    const savedInstance = readFileSync(instancePath);
    const savedSchema = readFileSync(schemaPath);
    const savedDecision = readFileSync(decisionPath);
    try {
      const broken = JSON.parse(savedInstance); delete broken.from; writeJson(instancePath, broken);
      const result = captureError(() => runCheck(ctx));
      cases.push(assertCase(!result.ok && result.code === "record: schema-invalid", "sweep-current-instance", result));
    } finally { writeFileSync(instancePath, savedInstance); }
    try {
      const narrowed = JSON.parse(savedSchema); narrowed.properties.name.maxLength = 1; writeJson(schemaPath, narrowed);
      const result = captureError(() => runCheck(ctx));
      cases.push(assertCase(!result.ok && result.code === "record: schema-invalid", "sweep-current-schema", result));
    } finally { writeFileSync(schemaPath, savedSchema); }
    try {
      const narrowed = JSON.parse(savedDecision);
      narrowed["x-provenance"]["authorizes-changes"] = narrowed["x-provenance"]["authorizes-changes"].filter((x) => x !== item);
      const arr = narrowed["x-provenance"]["authorizes-changes"];
      if (!same(arr, ["sentinel-item"])) fail("verify: assertion", "authorization tamper did not preserve exactly the well-formed sentinel array");
      writeJson(decisionPath, narrowed);
      const result = captureError(() => runCheck(ctx));
      cases.push(assertCase(!result.ok && result.code === "decision-authorization: item-not-authorized", "sweep-exact-item-authorization", { ...result, remainingAuthorization: arr }));
    } finally { writeFileSync(decisionPath, savedDecision); }
    try {
      const proposed = JSON.parse(savedDecision); proposed.status = "proposed"; writeJson(decisionPath, proposed);
      const result = captureError(() => runCheck(ctx));
      cases.push(assertCase(!result.ok && result.code === "decision-authorization: not-decided", "sweep-current-status", result));
    } finally { writeFileSync(decisionPath, savedDecision); }
    cases.push(assertCase(sha256(readFileSync(instancePath)) === sha256(savedInstance) && sha256(readFileSync(schemaPath)) === sha256(savedSchema) && sha256(readFileSync(decisionPath)) === sha256(savedDecision) && runCheck(ctx).ok, "tamper-restoration-rerunnable"));

    const negativeSpecs = [
      ["absent-decision", null, "decision-authorization: absent"],
      ["proposed-decision", fixtureDecision({ id: "proposed-decision", item, status: "proposed" }), "decision-authorization: not-decided"],
      ["wrong-decider", fixtureDecision({ id: "wrong-decider", item, decider: "Strategy and Development Committee" }), "decision-authorization: wrong-decider"],
      ["missing-authorization", fixtureDecision({ id: "missing-authorization", item, authorization: false }), "decision-authorization: malformed"],
      ["item-mismatch", fixtureDecision({ id: "item-mismatch", item: "other/item" }), "decision-authorization: item-not-authorized"],
    ];
    for (const [id, decision, expected] of negativeSpecs) {
      if (decision) writeJson(join(fx.unit, "content", "decision-records", `${id}.json`), decision);
      const candidate = { ...fixtureChange(`refuse-${id}`, item), "ccb-decision": id };
      const result = captureError(() => runCommission(ctx, candidate, { dryRun: true }));
      cases.push(assertCase(!result.ok && result.code === expected, id, result));
    }

    writeFileSync(join(fx.unit, "content", "decision-records", "unreadable-decision.json"), "{not-json\n");
    const unreadableDecision = captureError(() => runCommission(ctx, { ...fixtureChange("refuse-unreadable", item), "ccb-decision": "unreadable-decision" }, { dryRun: true }));
    cases.push(assertCase(!unreadableDecision.ok && unreadableDecision.code === "decision-authorization: unreadable", "unreadable-decision", unreadableDecision));
    writeJson(join(fx.unit, "content", "decision-records", "schema-invalid-decision.json"), { name: "invalid", decider: "the Change Control Board", context: "x", options: [], consequences: "x", status: "decided" });
    const invalidDecision = captureError(() => runCommission(ctx, { ...fixtureChange("refuse-invalid-decision", item), "ccb-decision": "schema-invalid-decision" }, { dryRun: true }));
    cases.push(assertCase(!invalidDecision.ok && invalidDecision.code === "decision-authorization: schema-invalid", "schema-invalid-decision", invalidDecision));
    const ambiguousBase = fixtureDecision({ id: "ambiguous-decision", item });
    writeJson(join(fx.unit, "content", "decision-records", "ambiguous-decision.json"), ambiguousBase);
    writeJson(join(fx.unit, "content", "decision-records", "ambiguous-decision.schema.json"), ambiguousBase);
    const ambiguousDecision = captureError(() => runCommission(ctx, { ...fixtureChange("refuse-ambiguous-decision", item), "ccb-decision": "ambiguous-decision" }, { dryRun: true }));
    cases.push(assertCase(!ambiguousDecision.ok && ambiguousDecision.code === "decision-authorization: ambiguous", "ambiguous-decision", ambiguousDecision));

    const badInputs = [
      ["trim-equal", { ...fixtureChange("trim-equal", item), from: " x ", to: "x" }, "record: no-transition"],
      ["impossible-date", { ...fixtureChange("impossible-date", item), "x-provenance": { "recorded-by": "fixture", "recorded-on": "2026-02-30" } }, "record: impossible-date"],
      ["blank-provenance", { ...fixtureChange("blank-provenance", item), "x-provenance": { "recorded-by": "   ", "recorded-on": "2026-07-16" } }, "record: schema-invalid"],
    ];
    for (const [name, candidate, expected] of badInputs) {
      const result = captureError(() => runCommission(ctx, candidate, { dryRun: true }));
      cases.push(assertCase(!result.ok && result.code === expected, name, result));
    }

    const partial = { ...fixtureChange("partial-write", item) };
    const base = defaultMutator();
    const partialMut = { ...base, writeTemp(fd, text) { writeSync(fd, text.slice(0, Math.max(1, Math.floor(text.length / 2))), null, "utf8"); throw new Error("injected partial write"); } };
    const partialResult = captureError(() => runCommission(ctx, partial, { mut: partialMut }));
    const tempNames = readdirSync(join(fx.unit, "content", "changes")).filter((x) => x.includes(".tmp"));
    cases.push(assertCase(!partialResult.ok && !pathExists(join(fx.unit, "content", "changes", "partial-write.json")) && tempNames.length === 0, "partial-write-cleanup", partialResult));

    const markerPath = join(fx.unit, "content", "changes", ".git");
    const boundaryBefore = territoryManifest({ unit: fx.unit });
    const boundaryTrace = [];
    const markerResult = captureError(() => runCommission(ctx, fixtureChange("snapshot-change", item), {
      mut: defaultMutator(boundaryTrace),
      hooks: {
        afterTempValidated: () => { writeFileSync(markerPath, "gitdir: fixture\n"); boundaryTrace.push({ op: "inject-boundary", operands: [markerPath] }); },
        cleanup: () => { if (pathExists(markerPath)) { unlinkSync(markerPath); boundaryTrace.push({ op: "restore-boundary", operands: [markerPath] }); } },
      },
    }));
    const boundaryAfter = territoryManifest({ unit: fx.unit });
    const residualMutationTrace = [];
    if (boundaryTrace.filter((x) => x.op === "inject-boundary").length !== boundaryTrace.filter((x) => x.op === "restore-boundary").length) residualMutationTrace.push("boundary injection was not restored");
    if (tempEntries(fx.unit).length) residualMutationTrace.push("owned temporary entry remains");
    if (pathExists(join(fx.unit, "content", "changes", "snapshot-change.json"))) residualMutationTrace.push("final record was published");
    cases.push(assertCase(!markerResult.ok && markerResult.code === "unit/jurisdiction: sovereign-boundary" && same(boundaryAfter, boundaryBefore) && residualMutationTrace.length === 0 && !pathExists(join(fx.unit, "content", "changes", "snapshot-change.json")) && !pathExists(markerPath), "prepublication-boundary-change", { ...markerResult, manifestEqual: same(boundaryAfter, boundaryBefore), mutationTrace: boundaryTrace, residualMutationTrace }));
  } finally { fx.cleanup(); }

  for (const [name, prepare, expected] of [
    ["changes-parent-file", (path) => writeFileSync(path, "not a directory\n"), "publication: parent-not-directory"],
    ["changes-parent-symlink-inward", (path, fixture) => { const target = join(fixture.root, "inside-target"); mkdirSync(target); symlinkSync(target, path); }, "publication: parent-symlink"],
    ["changes-parent-symlink-outward", (path) => { const target = mkdtempSync(join(tmpdir(), "record-change-parent-outside-")); symlinkSync(target, path); }, "publication: parent-symlink"],
    ["changes-parent-boundary", (path) => { mkdirSync(path); writeFileSync(join(path, ".git"), "gitdir: fixture\n"); }, "unit/jurisdiction: sovereign-boundary"],
  ]) {
    const parentFx = makeFixture(liveCtx, { legacyOffice: true });
    let externalTarget = null;
    try {
      const item = "fixture/item";
      writeJson(join(parentFx.unit, "content", "decision-records", "authorize-change.json"), fixtureDecision({ item }));
      const changesPath = join(parentFx.unit, "content", "changes");
      prepare(changesPath, parentFx);
      if (name === "changes-parent-symlink-outward") externalTarget = realpathSync(changesPath);
      const observed = { unit: parentFx.unit, changes: changesPath, ...(externalTarget ? { externalTarget } : {}) };
      const before = territoryManifest(observed);
      const trace = [];
      const ctx = await buildContext({ root: parentFx.root, from: parentFx.unit });
      const result = captureError(() => runCommission(ctx, fixtureChange(`refuse-${name}`, item), { dryRun: true, mut: defaultMutator(trace) }));
      const after = territoryManifest(observed);
      cases.push(assertCase(!result.ok && result.code === expected && trace.length === 0 && same(after, before) && !pathExists(join(changesPath, `refuse-${name}.json`)), name, { ...result, zeroMutationTrace: trace, manifestEqual: same(after, before) }));
    } finally {
      parentFx.cleanup();
      if (externalTarget) rmSync(externalTarget, { recursive: true, force: true });
    }
  }

  const churnFx = makeFixture(liveCtx, { legacyOffice: true });
  try {
    const item = "fixture/item";
    writeJson(join(churnFx.unit, "content", "decision-records", "authorize-change.json"), fixtureDecision({ item }));
    const ctx = await buildContext({ root: churnFx.root, from: churnFx.unit });
    const trace = [];
    const ordinary = defaultMutator(trace);
    const churnMut = { ...ordinary, mkdir(path) { trace.push({ op: "mkdir-injected-eexist", operands: [path] }); const error = new Error("injected EEXIST"); error.code = "EEXIST"; throw error; } };
    const result = captureError(() => runCommission(ctx, fixtureChange("parent-churn", item), { mut: churnMut }));
    cases.push(assertCase(!result.ok && result.code === "publication: parent-churn" && trace.filter((x) => x.op === "mkdir-injected-eexist").length === 2 && !pathExists(join(churnFx.unit, "content", "changes")), "bounded-parent-churn", { ...result, trace }));
  } finally { churnFx.cleanup(); }

  const concurrentFx = makeFixture(liveCtx, { legacyOffice: true });
  try {
    const item = "fixture/item";
    writeJson(join(concurrentFx.unit, "content", "decision-records", "authorize-change.json"), fixtureDecision({ item }));
    const ctx = await buildContext({ root: concurrentFx.root, from: concurrentFx.unit });
    const sentinel = join(concurrentFx.unit, "content", "changes", "concurrent-sentinel");
    const result = captureError(() => runCommission(ctx, fixtureChange("concurrent-cleanup", item), {
      hooks: { afterTempValidated: () => { writeFileSync(sentinel, "unowned\n"); fail("verify: injected", "injected refusal after concurrent entry"); } },
    }));
    const leftovers = readdirSync(join(concurrentFx.unit, "content", "changes"));
    cases.push(assertCase(!result.ok && pathExists(sentinel) && !pathExists(join(concurrentFx.unit, "content", "changes", "concurrent-cleanup.json")) && leftovers.length === 1 && leftovers[0] === "concurrent-sentinel" && result.facts.cleanup === "incomplete", "concurrent-entry-preserved", { ...result, leftovers }));
  } finally { concurrentFx.cleanup(); }

  const readbackFx = makeFixture(liveCtx, { legacyOffice: true });
  try {
    const item = "fixture/item";
    writeJson(join(readbackFx.unit, "content", "decision-records", "authorize-change.json"), fixtureDecision({ item }));
    const ctx = await buildContext({ root: readbackFx.root, from: readbackFx.unit });
    const before = territoryManifest({ unit: readbackFx.unit });
    const trace = [];
    const ordinary = defaultMutator(trace);
    let tempPath = null;
    const corrupting = {
      ...ordinary,
      openTemp(path) { tempPath = path; return ordinary.openTemp(path); },
      writeTemp(fd, text) { ordinary.writeTemp(fd, text); writeFileSync(tempPath, `${text}corrupt`); trace.push({ op: "inject-readback-corruption", operands: [tempPath] }); },
    };
    const result = captureError(() => runCommission(ctx, fixtureChange("readback-failure", item), { mut: corrupting }));
    const after = territoryManifest({ unit: readbackFx.unit });
    cases.push(assertCase(!result.ok && result.code === "publication: readback-mismatch" && same(after, before) && !pathExists(join(readbackFx.unit, "content", "changes", "readback-failure.json")) && tempEntries(readbackFx.unit).length === 0, "prepublish-readback-failure-cleanup", { ...result, manifestEqual: same(after, before), trace }));
  } finally { readbackFx.cleanup(); }

  const semanticFx = makeFixture(liveCtx, { legacyOffice: true });
  try {
    const item = "fixture/item";
    const decisionPath = join(semanticFx.unit, "content", "decision-records", "authorize-change.json");
    writeJson(decisionPath, fixtureDecision({ item }));
    const originalDecision = readFileSync(decisionPath);
    const ctx = await buildContext({ root: semanticFx.root, from: semanticFx.unit });
    const before = territoryManifest({ unit: semanticFx.unit });
    const trace = [];
    const ordinary = defaultMutator(trace);
    const authorityChanging = {
      ...ordinary,
      writeTemp(fd, text) {
        ordinary.writeTemp(fd, text);
        const changed = JSON.parse(originalDecision);
        changed["x-provenance"]["authorizes-changes"] = ["sentinel-item"];
        writeJson(decisionPath, changed);
        trace.push({ op: "inject-authority-change", operands: [decisionPath] });
      },
    };
    const result = captureError(() => runCommission(ctx, fixtureChange("semantic-failure", item), {
      mut: authorityChanging,
      hooks: { cleanup: () => writeFileSync(decisionPath, originalDecision) },
    }));
    const after = territoryManifest({ unit: semanticFx.unit });
    cases.push(assertCase(!result.ok && result.code === "decision-authorization: item-not-authorized" && sha256(readFileSync(decisionPath)) === sha256(originalDecision) && same(after, before) && !pathExists(join(semanticFx.unit, "content", "changes", "semantic-failure.json")) && tempEntries(semanticFx.unit).length === 0, "prepublish-semantic-recheck-cleanup", { ...result, manifestEqual: same(after, before), trace }));
  } finally { semanticFx.cleanup(); }

  for (const mode of ["prefix-replacement", "prefix-marker-change"]) {
    const prefixFx = makeFixture(liveCtx, { legacyOffice: true });
    try {
      const item = "fixture/item";
      writeJson(join(prefixFx.unit, "content", "decision-records", "authorize-change.json"), fixtureDecision({ item }));
      const ctx = await buildContext({ root: prefixFx.root, from: prefixFx.unit });
      const before = territoryManifest({ unit: prefixFx.unit });
      const content = join(prefixFx.unit, "content");
      const backup = join(prefixFx.unit, ".content-replaced-by-verifier");
      const marker = join(prefixFx.unit, ".git");
      const hooks = mode === "prefix-replacement"
        ? {
            afterTempValidated: () => { renameSync(content, backup); mkdirSync(content); },
            cleanup: () => { if (pathExists(content)) rmSync(content, { recursive: true, force: true }); if (pathExists(backup)) renameSync(backup, content); },
          }
        : {
            afterTempValidated: () => mkdirSync(marker),
            cleanup: () => { if (pathExists(marker)) rmdirSync(marker); },
          };
      const result = captureError(() => runCommission(ctx, fixtureChange(mode, item), { hooks }));
      const after = territoryManifest({ unit: prefixFx.unit });
      cases.push(assertCase(!result.ok && result.code === "unit/jurisdiction: prefix-changed" && same(after, before) && !pathExists(join(prefixFx.unit, "content", "changes", `${mode}.json`)) && tempEntries(prefixFx.unit).length === 0, mode, { ...result, manifestEqual: same(after, before) }));
    } finally { prefixFx.cleanup(); }
  }

  for (const direction of ["inward", "outward"]) {
    const alias = makeFixture(liveCtx, { legacyOffice: true });
    try {
      const legacyDecisions = join(alias.unit, "lib", "management", "decision-records");
      mkdirSync(legacyDecisions, { recursive: true });
      writeJson(join(legacyDecisions, "authorize-change.json"), fixtureDecision({ item: "fixture/item" }));
      const lawfulContext = await buildContext({ root: alias.root, from: alias.unit });
      const lawfulAuthorization = validateDecision(lawfulContext, "authorize-change", "fixture/item");
      rmSync(join(alias.unit, "content"), { recursive: true, force: true });
      const target = direction === "inward" ? join(alias.root, "absent-inward-target") : join(dirname(alias.root), `absent-outward-${randomBytes(4).toString("hex")}`);
      symlinkSync(target, join(alias.unit, "content"));
      const trace = [];
      const observed = { unit: alias.unit, contentLink: join(alias.unit, "content"), target, targetChanges: join(target, "changes") };
      const before = territoryManifest(observed);
      let actual;
      try {
        const ctx = await buildContext({ root: alias.root, from: alias.unit });
        runCommission(ctx, fixtureChange(`dangling-${direction}`, "fixture/item"), { mut: defaultMutator(trace) });
        actual = { ok: true };
      }
      catch (error) { actual = { ok: false, code: error.code, message: error.message }; }
      const after = territoryManifest(observed);
      cases.push(assertCase(lawfulAuthorization.authorized.includes("fixture/item") && !actual.ok && actual.code === "unit/jurisdiction: content-seat-not-real-directory" && trace.length === 0 && same(after, before) && !pathExists(target) && !pathExists(join(target, "changes")), `dangling-content-alias-${direction}`, { ...actual, authorizationPrevalidated: lawfulAuthorization.seat, zeroMutationTrace: trace, manifestEqual: same(after, before) }));
    } finally { alias.cleanup(); }
  }

  for (const direction of ["inward", "outward"]) {
    const alias = makeFixture(liveCtx, { legacyOffice: true });
    let outsideTarget = null;
    try {
      const legacyDecisions = join(alias.unit, "lib", "management", "decision-records");
      mkdirSync(legacyDecisions, { recursive: true });
      writeJson(join(legacyDecisions, "authorize-change.json"), fixtureDecision({ item: "fixture/item" }));
      const lawfulContext = await buildContext({ root: alias.root, from: alias.unit });
      const lawfulAuthorization = validateDecision(lawfulContext, "authorize-change", "fixture/item");
      rmSync(join(alias.unit, "content"), { recursive: true, force: true });
      const target = direction === "inward" ? join(alias.root, "existing-inward-target") : (outsideTarget = mkdtempSync(join(tmpdir(), "record-change-content-outside-")));
      if (!pathExists(target)) mkdirSync(target, { recursive: true });
      symlinkSync(target, join(alias.unit, "content"));
      const trace = [];
      const observed = { unit: alias.unit, contentLink: join(alias.unit, "content"), target };
      const before = territoryManifest(observed);
      let actual;
      try {
        const ctx = await buildContext({ root: alias.root, from: alias.unit });
        runCommission(ctx, fixtureChange(`existing-alias-${direction}`, "fixture/item"), { mut: defaultMutator(trace) });
        actual = { ok: true };
      }
      catch (error) { actual = { ok: false, code: error.code, message: error.message }; }
      const after = territoryManifest(observed);
      cases.push(assertCase(lawfulAuthorization.authorized.includes("fixture/item") && !actual.ok && actual.code === "unit/jurisdiction: content-seat-not-real-directory" && trace.length === 0 && same(after, before) && !pathExists(join(target, "changes")), `existing-content-alias-${direction}`, { ...actual, authorizationPrevalidated: lawfulAuthorization.seat, zeroMutationTrace: trace, manifestEqual: same(after, before) }));
    } finally { alias.cleanup(); if (outsideTarget) rmSync(outsideTarget, { recursive: true, force: true }); }
  }

  for (const [name, mutate, expected] of [
    ["missing-ccb-seat", (fixture) => unlinkSync(join(fixture.officePool, "change-control-board.json")), "unit: ccb-seat-count"],
    ["ambiguous-ccb-seat", (fixture) => copyFileSync(join(fixture.officePool, "change-control-board.json"), join(fixture.officePool, "change-control-board.schema.json")), "unit: ccb-seat-count"],
    ["unreadable-ccb-seat", (fixture) => writeFileSync(join(fixture.officePool, "change-control-board.json"), "{bad\n"), "unit: ccb-unreadable"],
    ["schema-invalid-ccb-seat", (fixture) => writeJson(join(fixture.officePool, "change-control-board.json"), { id: "change-control-board", name: "change control board" }), "unit: ccb-schema-invalid"],
  ]) {
    const officeFx = makeFixture(liveCtx);
    try {
      mutate(officeFx);
      let result;
      try { await buildContext({ root: officeFx.root, from: officeFx.unit }); result = { ok: true }; }
      catch (error) { result = { ok: false, code: error.code, message: error.message }; }
      cases.push(assertCase(!result.ok && result.code === expected && !pathExists(join(officeFx.unit, "content", "changes")), name, result));
    } finally { officeFx.cleanup(); }
  }

  const outsideRoot = mkdtempSync(join(tmpdir(), "record-change-outside-authority-"));
  mkdirSync(join(outsideRoot, ".git"));
  const outsideUnitHolder = mkdtempSync(join(tmpdir(), "record-change-outside-unit-"));
  const outsideFx = makeFixture(liveCtx, { authorityRoot: outsideRoot, unitParent: outsideUnitHolder, legacyOffice: true });
  try {
    const trace = [];
    const observed = { authority: outsideRoot, outsideTerritory: outsideUnitHolder, outsideUnit: outsideFx.unit };
    const before = territoryManifest(observed);
    let result;
    try {
      const ctx = await buildContext({ root: outsideRoot, from: outsideFx.unit });
      runCommission(ctx, fixtureChange("outside-authority", "fixture/item"), { mut: defaultMutator(trace) });
      result = { ok: true };
    }
    catch (error) { result = { ok: false, code: error.code, message: error.message }; }
    const after = territoryManifest(observed);
    cases.push(assertCase(!result.ok && result.code === "unit/jurisdiction: outside-authority-root" && trace.length === 0 && same(after, before) && !pathExists(join(outsideFx.unit, "content", "changes")), "outside-authority", { ...result, zeroMutationTrace: trace, manifestEqual: same(after, before) }));
  } finally { rmSync(outsideRoot, { recursive: true, force: true }); rmSync(outsideUnitHolder, { recursive: true, force: true }); }

  const sovereignRoot = mkdtempSync(join(tmpdir(), "record-change-sovereign-"));
  mkdirSync(join(sovereignRoot, ".git"));
  const boundary = join(sovereignRoot, "checked-out-node"); mkdirSync(boundary); writeFileSync(join(boundary, ".git"), "gitdir: fixture\n");
  const sovereignFx = makeFixture(liveCtx, { authorityRoot: sovereignRoot, unitParent: boundary, legacyOffice: true });
  try {
    const trace = [];
    const observed = { authority: sovereignRoot, boundary, sovereignUnit: sovereignFx.unit };
    const before = territoryManifest(observed);
    let result;
    try {
      const ctx = await buildContext({ root: sovereignRoot, from: sovereignFx.unit });
      runCommission(ctx, fixtureChange("sovereign-boundary", "fixture/item"), { mut: defaultMutator(trace) });
      result = { ok: true };
    }
    catch (error) { result = { ok: false, code: error.code, message: error.message, facts: error.facts }; }
    const after = territoryManifest(observed);
    cases.push(assertCase(!result.ok && result.code === "unit/jurisdiction: sovereign-boundary" && trace.length === 0 && same(after, before) && !pathExists(join(sovereignFx.unit, "content", "changes")), "sovereign-boundary", { ...result, zeroMutationTrace: trace, manifestEqual: same(after, before) }));
  } finally { rmSync(sovereignRoot, { recursive: true, force: true }); }

  return { ok: true, verified: cases.length, cases, liveUnit: liveCtx.unit, schemaSource: join(liveCtx.schemaPool, "change-record.schema.json"), dependencies: liveCtx.dependencies };
}

function readCommissionInput(args) {
  if (args.positional) {
    const path = isAbsolute(args.positional) ? args.positional : resolve(args.root, args.positional);
    try { return { text: readFileSync(path, "utf8"), source: path }; } catch (error) { fail("input: unreadable", `cannot read positional input '${path}': ${error.message}`); }
  }
  return { text: readFileSync(0, "utf8"), source: "stdin" };
}

function help() {
  return [
    "Usage:",
    "  node record-a-change.js [record.json] --root DIR [--from DIR] [--dry-run]",
    "  node record-a-change.js --check --root DIR [--from DIR]",
    "  node record-a-change.js --verify --root DIR [--from DIR]",
    "", "Input is JSON. Output is JSON. Change records are append-only.",
  ].join("\n") + "\n";
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.modes.has("help")) { process.stdout.write(help()); return; }
    if (args.modes.has("verify")) {
      const result = await verify(args); process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); return;
    }
    const ctx = await buildContext(args);
    let result;
    if (args.modes.has("check")) result = runCheck(ctx);
    else {
      const input = readCommissionInput(args);
      result = runCommission(ctx, parseInput(input.text, input.source), { dryRun: args.modes.has("dry-run") });
    }
    result.witness = { unit: ctx.unit, dependencies: ctx.dependencies };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    const body = error instanceof GateError
      ? { ok: false, code: error.code, error: error.message, ...(Object.keys(error.facts ?? {}).length ? { facts: error.facts } : {}) }
      : { ok: false, code: "unexpected", error: error?.stack ?? String(error) };
    process.stdout.write(`${JSON.stringify(body, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
