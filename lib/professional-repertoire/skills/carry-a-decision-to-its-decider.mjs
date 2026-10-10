#!/usr/bin/env node
/**
 * @description Validates a decision record as rulable and, only for a decided claim whose decider is not a uniquely resolved conforming local office, requires a separate address-bound ruling carried by a local office inside the operated mesh jurisdiction. The carrier is read-only: it makes no decision, writes no ruling, and does not authorize an internal Change Control Board transition.
 *
 * @param {string} root - --root explicitly names the operating git worktree authority and the shared resolver, schema reader, and mesh classifier settle without absence, ambiguity, or drift
 * @param {string} validate - the path named by --validate is readable JSON conforming to emsenn/schema/decision-record
 * @returns {object} proposed and last-call records, and decided records naming a uniquely resolved conforming local office, preserve the existing validation verdict
 * @returns {object} an external decided claim exits 0 only when one independently seated conforming ruling exactly backs its address, repeats its decider, carries a real Gregorian day, and names a uniquely resolved conforming local carrier office
 *
 * Validation performs no filesystem mutation and never creates a rulings
 * pool or ruling instance.
 *
 * Exit 0 admits. Exit 2 is input or invocation failure. Exit 3 is readable
 * record nonconformance or authority refusal. Exit 1 is infrastructure failure.
 */

import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const HERE = dirname(SELF);
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const EXPECTED_SCHEMA_IDS = {
  "decision-record": "emsenn/schema/decision-record",
  office: "emsenn/schema/office",
  ruling: "emsenn/schema/ruling",
};
const DEPENDENCIES = ["resolve-an-identifier.js", "read-a-schema.js", "mesh-scope.js"];
const LIVE_CURRENT = [
  "assign-the-red-army-a-role",
  "close-the-ccb-gate-around-a-baseline-change",
  "commission-write-a-duty-and-write-a-work",
  "fund-distributing-claude-borne-work-to-scripts-and-lesser-models",
  "gate-a-fabricated-external-deciders-ruling",
  "ideas-dispose-through-the-requirement-term",
  "name-the-emsweb-substack-node-and-authorize-its-remote",
  "one-pool-resolution-strategy",
  "protocol-allocation-for-the-orchestration-platform",
  "re-pin-the-idea-collection-conditions-to-the-migrated-seats",
  "rejudge-the-distribution-pilot",
  "repin-five-goals-stale-since-the-class-instance-migration",
  "seat-collection-with-the-requirements-management-team",
  "seat-the-standing-up-a-node-duty-with-requirements-implementation-team",
  "the-mesh-scope-rule",
  "write-a-requirement-carries-from-idea",
];
const LIVE_LEGACY = ["the-firms-did-method", "the-skill-form-convention"];
const CELLS = new Set([
  "identity-seat-binding",
  "mesh-jurisdiction",
  "decision-multiseat-regression",
  "external-ruling-adversarial-matrix",
  "ruled-on-contract",
  "dependency-fail-closed",
  "read-only-external-only",
]);

class GateError extends Error {
  constructor(code, message, exit = 3, facts = {}) {
    super(message);
    this.name = "GateError";
    this.code = code;
    this.exit = exit;
    this.facts = facts;
  }
}

const fail = (code, message, exit = 3, facts = {}) => { throw new GateError(code, message, exit, facts); };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function emit(value, code = 0) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  process.exit(code);
}

function pathExists(path) {
  try { lstatSync(path); return true; }
  catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
    throw error;
  }
}

function realRegular(path, code = "dependency:invalid") {
  let st;
  try { st = lstatSync(path); }
  catch (error) { fail(code, `required file '${path}' is absent or unreadable: ${error.message}`, 1); }
  if (st.isSymbolicLink() || !st.isFile()) fail(code, `required file '${path}' is not a non-symlink regular file`, 1);
  return realpathSync(path);
}

function enterpriseRoot(from) {
  let at = resolve(from);
  for (;;) {
    if (existsSync(join(at, "lib", "schemas")) && existsSync(join(at, "lib", "management", "skills"))) return at;
    const up = dirname(at);
    if (up === at) return null;
    at = up;
  }
}

function projectedCandidates(root, flatName) {
  if (!pathExists(root) || !lstatSync(root).isDirectory()) return [];
  const found = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = join(root, entry.name, "scripts", flatName);
    if (pathExists(candidate)) found.push(candidate);
  }
  return found;
}

function selectDependency(flatName, here = HERE) {
  const projected = basename(here) === "scripts";
  const root = projected ? dirname(dirname(here)) : here;
  const flat = realRegular(join(root, flatName), "dependency:missing-flat");
  const candidates = projectedCandidates(root, flatName);
  if (candidates.length > 1) fail("dependency:ambiguous", `${flatName} has ${candidates.length} projected carriers`, 1, { candidates });
  if (projected && candidates.length !== 1) fail("dependency:missing-projected", `${flatName} has no unique projected carrier`, 1, { candidates });
  if (!projected && candidates.length === 0) return { path: flat, source: flat, layer: "flat", sha256: sha256(readFileSync(flat)) };
  const carried = realRegular(candidates[0], "dependency:invalid-projected");
  const flatHash = sha256(readFileSync(flat));
  const carriedHash = sha256(readFileSync(carried));
  if (flatHash !== carriedHash) fail("dependency:drift", `${flatName} flat and projected carriers differ`, 1, { flat, carried, flatHash, carriedHash });
  return { path: projected ? carried : flat, source: flat, projected: carried, layer: projected ? "projected" : "flat", sha256: flatHash };
}

async function loadDependencies() {
  const selected = Object.fromEntries(DEPENDENCIES.map((name) => [name, selectDependency(name)]));
  let resolver;
  let mesh;
  try {
    resolver = await import(`${pathToFileURL(selected["resolve-an-identifier.js"].path).href}?v=${selected["resolve-an-identifier.js"].sha256}`);
    mesh = await import(`${pathToFileURL(selected["mesh-scope.js"].path).href}?v=${selected["mesh-scope.js"].sha256}`);
  } catch (error) {
    fail("dependency:import", `shared dependency import failed: ${error.message}`, 1);
  }
  requireDependencyExports(resolver, mesh);
  return { selected, resolver, inspectMeshScope: mesh.inspectMeshScope, reader: selected["read-a-schema.js"].path };
}

function requireDependencyExports(resolver, mesh) {
  if (typeof resolver?.resolveIdentifier !== "function" || typeof resolver?.poolsFor !== "function" || typeof mesh?.inspectMeshScope !== "function") {
    fail("dependency:contract", "shared resolver or mesh carrier lacks a required export", 1);
  }
}

async function importSelected(selected) {
  try { return await import(`${pathToFileURL(selected.path).href}?v=${selected.sha256}-${randomBytes(4).toString("hex")}`); }
  catch (error) { fail("dependency:import", `shared dependency import failed: ${error.message}`, 1); }
}

function parseArgs(argv) {
  const args = { root: null, validate: null, cell: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (["--root", "--validate", "--check-cell"].includes(arg)) {
      const value = argv[++i];
      if (!value || value.startsWith("--")) fail("cli:missing-value", `${arg} requires a value`, 2);
      if (arg === "--root") args.root = value;
      if (arg === "--validate") args.validate = value;
      if (arg === "--check-cell") args.cell = value;
    } else if (arg === "--help") args.help = true;
    else fail("cli:unknown", `unknown argument '${arg}'`, 2);
  }
  if (args.help) return args;
  if (!args.root) fail("cli:root-required", "--root explicitly names the authority worktree", 2);
  if (Boolean(args.validate) === Boolean(args.cell)) fail("cli:mode", "choose exactly one of --validate or --check-cell", 2);
  if (args.cell && !CELLS.has(args.cell)) fail("cli:cell", `unknown check cell '${args.cell}'`, 2, { allowed: [...CELLS] });
  return args;
}

function authorityRoot(value) {
  let root;
  try { root = realpathSync(resolve(value)); }
  catch (error) { fail("authority-root:invalid", `--root is not an existing directory: ${error.message}`, 2); }
  let st;
  try { st = lstatSync(root); } catch (error) { fail("authority-root:invalid", error.message, 2); }
  if (st.isSymbolicLink() || !st.isDirectory()) fail("authority-root:invalid", "--root must be a non-symlink directory", 2);
  const marker = join(root, ".git");
  let mst;
  try { mst = lstatSync(marker); } catch (error) { fail("authority-root:not-worktree", `authority root has no readable .git marker: ${error.message}`, 2); }
  if (mst.isSymbolicLink() || (!mst.isFile() && !mst.isDirectory())) fail("authority-root:not-worktree", "authority root .git marker is not a file or directory", 2);
  return root;
}

function snapshotExtends(later, admitted) {
  const n = admitted.components.length;
  return later.components.length >= n && later.markers.length >= n
    && same(later.components.slice(0, n), admitted.components)
    && same(later.markers.slice(0, n), admitted.markers);
}

function meshInspect(ctx, subject, label) {
  let scope;
  try { scope = ctx.inspectMeshScope({ authorityRoot: ctx.root, subject }); }
  catch (error) { fail("mesh:infrastructure", `${label} mesh classification failed: ${error.message}`, 1, error.facts ?? {}); }
  if (!scope.inside) fail("jurisdiction:outside", `${label} lies outside the authority root`, 3, { subject: scope.subject });
  if (scope.boundaries.length) fail("jurisdiction:sovereign-boundary", `${label} crosses a sovereign .git-file boundary`, 3, { boundaries: scope.boundaries });
  if (ctx.unitScope && !snapshotExtends(scope.snapshot, ctx.unitScope.snapshot)) {
    fail("jurisdiction:prefix", `${label} mesh snapshot does not extend the admitted enterprise`);
  }
  return scope;
}

function admitPool(ctx, pool, label) {
  let st;
  try { st = lstatSync(pool); } catch (error) { fail("jurisdiction:pool-unreadable", `${label} pool cannot be read: ${error.message}`); }
  if (st.isSymbolicLink() || !st.isDirectory()) fail("jurisdiction:pool-symlink", `${label} pool is not a non-symlink directory`);
  const canonical = realpathSync(pool);
  const scope = meshInspect(ctx, canonical, `${label} pool`);
  if (canonical !== resolve(pool)) fail("jurisdiction:pool-alias", `${label} pool does not occupy its literal canonical seat`);
  return { path: pool, canonical, dev: st.dev, ino: st.ino, scope };
}

function admitSeat(ctx, seat, poolAdmission, expectedBasename, label) {
  let st;
  try { st = lstatSync(seat); } catch (error) { fail("jurisdiction:seat-unreadable", `${label} cannot be read: ${error.message}`); }
  if (st.isSymbolicLink() || !st.isFile()) fail("jurisdiction:seat-symlink", `${label} is not a non-symlink regular file`);
  if (dirname(resolve(seat)) !== poolAdmission.canonical) fail("jurisdiction:seat-parent", `${label} is not directly in its admitted pool`);
  if (expectedBasename && basename(seat) !== expectedBasename) fail("identity:seat-basename", `${label} does not occupy expected seat '${expectedBasename}'`);
  const bytes = readFileSync(seat);
  return { path: seat, dev: st.dev, ino: st.ino, size: st.size, hash: sha256(bytes), bytes, poolAdmission, label };
}

function revalidateSeat(ctx, admission) {
  const pool = admitPool(ctx, admission.poolAdmission.path, admission.label);
  const fresh = admitSeat(ctx, admission.path, pool, basename(admission.path), admission.label);
  if (fresh.dev !== admission.dev || fresh.ino !== admission.ino || fresh.size !== admission.size || fresh.hash !== admission.hash
      || !same(pool.scope.snapshot, admission.poolAdmission.scope.snapshot)) {
    fail("jurisdiction:authority-changed", `${admission.label} changed during validation`);
  }
}

function schemaVerdict(reader, schemaPool, schema, data) {
  const expected = EXPECTED_SCHEMA_IDS[schema];
  const run = spawnSync(process.execPath, [reader, schema, "--pool", schemaPool], { input: JSON.stringify(data), encoding: "utf8" });
  if (run.error || run.signal !== null) fail("schema-reader:infrastructure", `schema reader failed for ${schema}`, 1, { error: run.error?.message, signal: run.signal });
  let body;
  try { body = JSON.parse(run.stdout); } catch { fail("schema-reader:infrastructure", `schema reader returned unparseable output for ${schema}`, 1, { status: run.status, output: run.stdout }); }
  const goodShape = body && typeof body === "object" && body.schema === expected && Array.isArray(body.errors)
    && body.errors.every((x) => typeof x === "string");
  if (run.status === 0 && goodShape && body.ok === true && body.errors.length === 0) return { ok: true, schema: expected, errors: [] };
  if (run.status === 1 && goodShape && body.ok === false && body.errors.length > 0) return { ok: false, schema: expected, errors: body.errors };
  fail("schema-reader:infrastructure", `schema reader status/output contract failed for ${schema}`, 1, { status: run.status, body });
}

function jsonFrom(bytes, label, code = "record:unreadable") {
  try { return JSON.parse(bytes.toString("utf8")); }
  catch (error) { fail(code, `${label} is not valid JSON: ${error.message}`); }
}

async function buildContext(rootArg, enterpriseOverride = null, dependencyOverride = null) {
  const root = authorityRoot(rootArg);
  const deps = dependencyOverride ?? await loadDependencies();
  const enterprise = enterpriseOverride ?? enterpriseRoot(HERE);
  if (!enterprise) fail("enterprise:absent", "no enterprise root above this carrier", 1);
  const schemaPool = join(enterprise, "lib", "schemas");
  if (!pathExists(schemaPool)) fail("enterprise:schema-pool", "enterprise schema pool is absent", 1);
  const ctx = { root, enterprise: resolve(enterprise), schemaPool, ...deps, unitScope: null };
  ctx.unitScope = meshInspect(ctx, ctx.enterprise, "enterprise");
  if (ctx.unitScope.subject !== ctx.enterprise) fail("jurisdiction:enterprise-alias", "enterprise root is not canonical");
  return ctx;
}

function normalizeOfficeWords(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^the\s+/iu, "").replace(/\s+/gu, " ").toLowerCase();
}

function officeSlug(value) {
  const words = normalizeOfficeWords(value);
  const slug = words.replace(/\s+/gu, "-");
  return KEBAB.test(slug) ? slug : null;
}

function resolveOffice(ctx, reference) {
  const slug = officeSlug(reference);
  if (!slug) return { local: false, reason: "unresolvable-prose" };
  let hit;
  try { hit = ctx.resolver.resolveIdentifier(slug, { kind: "offices", strategy: "nearest", from: ctx.enterprise }); }
  catch (error) { fail("resolver:infrastructure", `office resolution failed: ${error.message}`, 1); }
  if (!hit.ok) fail("resolver:infrastructure", hit.error, 1);
  if (hit.seats.length !== 1) return { local: false, reason: hit.seats.length ? "ambiguous" : "absent", seats: hit.seats };
  const seat = hit.seats[0];
  const pool = admitPool(ctx, dirname(seat), "office");
  const admitted = admitSeat(ctx, seat, pool, `${slug}.json`, `office '${slug}'`);
  const office = jsonFrom(admitted.bytes, `office '${slug}'`, "office:unreadable");
  const verdict = schemaVerdict(ctx.reader, ctx.schemaPool, "office", office);
  if (!verdict.ok) return { local: false, reason: "nonconforming", errors: verdict.errors, admitted };
  if (office.id !== slug || basename(seat) !== `${office.id}.json`) return { local: false, reason: "identity-mismatch", admitted };
  if (normalizeOfficeWords(office.name) !== normalizeOfficeWords(reference)) return { local: false, reason: "name-mismatch", admitted };
  return { local: true, slug, seat, office, admitted };
}

function calendarDay(value) {
  const m = /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/u.exec(value ?? "");
  if (!m) return false;
  const year = Number(m[1]); const month = Number(m[2]); const day = Number(m[3]);
  if (year === 0) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

function decisionPools(ctx) {
  let pools;
  try { pools = ctx.resolver.poolsFor("decision-records", ctx.enterprise, { multiSeat: true }); }
  catch (error) { fail("resolver:infrastructure", `decision pool resolution failed: ${error.message}`, 1); }
  return pools.map((pool) => admitPool(ctx, pool, "decision-records"));
}

function decisionIdentity(ctx, targetPath, data) {
  const absolute = resolve(targetPath);
  for (const pool of decisionPools(ctx)) {
    if (dirname(absolute) !== pool.canonical) continue;
    const file = basename(absolute);
    const id = file.endsWith(".json") ? file.slice(0, -5) : "";
    if (!KEBAB.test(id)) fail("decision-identity:invalid-seat", `seated decision filename '${file}' is not <kebab>.json`);
    const admitted = admitSeat(ctx, absolute, pool, `${id}.json`, `decision '${id}'`);
    let hit;
    try { hit = ctx.resolver.resolveIdentifier(id, { kind: "decision-records", strategy: "nearest", from: ctx.enterprise, multiSeat: true }); }
    catch (error) { fail("resolver:infrastructure", `decision identity resolution failed: ${error.message}`, 1); }
    if (!hit.ok) fail("resolver:infrastructure", hit.error, 1);
    if (hit.seats.length !== 1 || realpathSync(hit.seats[0]) !== realpathSync(absolute)) {
      fail("decision-identity:ambiguous", `decision '${id}' does not resolve to exactly this one seat`, 3, { seats: hit.seats });
    }
    if (data.id !== undefined && data.id !== id) fail("decision-identity:id-seat-mismatch", `decision seat '${id}' carries id '${data.id}'`);
    return { kind: "seated", id, admitted };
  }
  return { kind: "attachment", id: typeof data.id === "string" && KEBAB.test(data.id) ? data.id : null, admitted: null };
}

function carrierOffice(ctx, slug) {
  let hit;
  try { hit = ctx.resolver.resolveIdentifier(slug, { kind: "offices", strategy: "nearest", from: ctx.enterprise }); }
  catch (error) { fail("resolver:infrastructure", `carrier office resolution failed: ${error.message}`, 1); }
  if (!hit.ok) fail("resolver:infrastructure", hit.error, 1);
  if (hit.seats.length !== 1) return { ok: false, reason: hit.seats.length ? "ambiguous-carrier" : "absent-carrier" };
  const seat = hit.seats[0];
  const pool = admitPool(ctx, dirname(seat), "carrier office");
  const admitted = admitSeat(ctx, seat, pool, `${slug}.json`, `carrier office '${slug}'`);
  const office = jsonFrom(admitted.bytes, `carrier office '${slug}'`, "carrier:unreadable");
  const verdict = schemaVerdict(ctx.reader, ctx.schemaPool, "office", office);
  if (!verdict.ok) return { ok: false, reason: "malformed-carrier", admitted };
  if (office.id !== slug || basename(seat) !== `${office.id}.json` || officeSlug(office.name) !== slug) {
    return { ok: false, reason: "carrier-identity", admitted };
  }
  return { ok: true, office, admitted };
}

function backingRuling(ctx, decisionId, decider) {
  let pools;
  try { pools = ctx.resolver.poolsFor("rulings", ctx.enterprise); }
  catch (error) { fail("resolver:infrastructure", `ruling pool resolution failed: ${error.message}`, 1); }
  const rejected = {};
  const bump = (reason) => { rejected[reason] = (rejected[reason] ?? 0) + 1; };
  let examined = 0;
  for (const poolPath of pools) {
    const pool = admitPool(ctx, poolPath, "rulings");
    for (const entry of readdirSync(poolPath).filter((x) => x.endsWith(".json")).sort()) {
      examined += 1;
      const seat = admitSeat(ctx, join(poolPath, entry), pool, entry, `ruling '${entry}'`);
      let ruling;
      try { ruling = JSON.parse(seat.bytes.toString("utf8")); } catch { bump("unreadable-ruling"); continue; }
      const verdict = schemaVerdict(ctx.reader, ctx.schemaPool, "ruling", ruling);
      if (!verdict.ok) { bump("malformed-ruling"); continue; }
      if (entry !== `${ruling.id}.json`) { bump("ruling-id-seat-mismatch"); continue; }
      if (ruling.backs !== decisionId) { bump("backs-mismatch"); continue; }
      if (ruling.decider !== decider) { bump("decider-mismatch"); continue; }
      if (!calendarDay(ruling["ruled-on"])) { bump("impossible-ruled-on"); continue; }
      const carrier = carrierOffice(ctx, ruling["carried-by"]);
      if (!carrier.ok) { bump(carrier.reason); continue; }
      revalidateSeat(ctx, seat);
      revalidateSeat(ctx, carrier.admitted);
      return { ok: true, ruling: ruling.id, seat: seat.path, carrier: carrier.office.id, examined, rejected, admissions: [seat, carrier.admitted] };
    }
  }
  return { ok: false, examined, rejected };
}

function validateRecord(ctx, data, targetPath) {
  const shape = schemaVerdict(ctx.reader, ctx.schemaPool, "decision-record", data);
  if (!shape.ok) {
    const core = ["context", "options", "consequences"];
    const missing = core.filter((key) => !(key in (data ?? {})));
    fail("decision-record:nonconforming", missing.length ? `bare decision missing ${missing.join(", ")}` : "decision record does not conform", 3, { schema: shape.schema, "missing-core": missing, errors: shape.errors });
  }
  const identity = decisionIdentity(ctx, targetPath, data);
  const decider = resolveOffice(ctx, data.decider);
  if (data.status !== "decided" || decider.local) {
    if (identity.admitted) revalidateSeat(ctx, identity.admitted);
    if (decider.local) revalidateSeat(ctx, decider.admitted);
    return { ok: true, branch: data.status === "decided" ? "internal-decider" : "not-decided", identity: identity.id, office: decider.local ? decider.office.id : null };
  }
  if (!identity.id) fail("external-ruling:attachment-id-absent", "an external decided attachment requires an explicit kebab id before a ruling can back it");
  const ruling = backingRuling(ctx, identity.id, data.decider);
  if (!ruling.ok) fail("external-ruling:missing", `external decided claim '${identity.id}' has no conforming jurisdiction-bound backing ruling`, 3, { examined: ruling.examined, rejected: ruling.rejected, deciderResolution: decider.reason });
  if (identity.admitted) revalidateSeat(ctx, identity.admitted);
  if (decider.admitted) revalidateSeat(ctx, decider.admitted);
  return { ok: true, branch: "external-ruling", identity: identity.id, ruling: ruling.ruling, carrier: ruling.carrier, examined: ruling.examined, dependencies: Object.fromEntries(Object.entries(ctx.selected).map(([k, v]) => [k, { path: v.path, sha256: v.sha256 }])) };
}

function readTarget(root, value) {
  const path = resolve(root, value);
  let st;
  try { st = lstatSync(path); } catch (error) { fail("input:unreadable", `no readable input '${value}': ${error.message}`, 2); }
  if (!st.isFile() && !st.isSymbolicLink()) fail("input:not-file", `'${value}' is not a file`, 2);
  let data;
  try { data = JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { fail("input:invalid-json", `'${value}' is not valid JSON: ${error.message}`, 2); }
  return { path, data };
}

function capture(fn) {
  try { return { ok: true, value: fn() }; }
  catch (error) { return { ok: false, code: error.code ?? "unexpected", exit: error.exit ?? 1, message: error.message, facts: error.facts ?? {} }; }
}

async function captureAsync(fn) {
  try { return { ok: true, value: await fn() }; }
  catch (error) { return { ok: false, code: error.code ?? "unexpected", exit: error.exit ?? 1, message: error.message, facts: error.facts ?? {} }; }
}

function assertCase(condition, name, observations = {}) {
  if (!condition) fail("check-cell:assertion", `case '${name}' did not settle`, 1, observations);
  return { name, held: true, observations };
}

function writeJson(path, value) { writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }

function fixtureDecision({ id = "external-decision", decider = "emsenn", status = "decided", includeId = true } = {}) {
  return {
    ...(includeId ? { id } : {}), name: `decide ${id}`, decider, status,
    context: "An isolated fixture needs a rulable decision.",
    options: [{ label: "a", description: "Choose a." }, { label: "b", description: "Choose b." }],
    ...(status === "decided" ? { decision: "The external party chose a." } : {}),
    consequences: "The validator can exercise one bounded branch.",
    "x-provenance": { "recorded-by": "verification fixture", "recorded-on": "2026-07-17" },
  };
}

function fixtureRuling({ id = "external-ruling", backs = "external-decision", decider = "emsenn", carrier = "configuration-manager", day = "2024-02-29" } = {}) {
  return {
    id, name: `carry ${id}`, backs, decider, "carried-by": carrier,
    quote: "I choose a.", channel: "isolated verification fixture", "ruled-on": day,
    "x-provenance": { "recorded-by": "verification fixture", "recorded-on": "2026-07-17" },
  };
}

function manifest(path) {
  const rows = [];
  const walk = (at, rel = ".") => {
    let st;
    try { st = lstatSync(at); } catch { rows.push({ path: rel, kind: "absent" }); return; }
    const kind = st.isSymbolicLink() ? "symlink" : st.isDirectory() ? "directory" : st.isFile() ? "file" : "other";
    const row = { path: rel, kind, dev: st.dev, ino: st.ino, mode: st.mode };
    if (kind === "file") row.sha256 = sha256(readFileSync(at));
    if (kind === "symlink") row.target = readlinkSync(at);
    rows.push(row);
    if (kind === "directory") for (const entry of readdirSync(at).sort()) walk(join(at, entry), rel === "." ? entry : `${rel}/${entry}`);
  };
  walk(path);
  return rows;
}

async function makeFixture(liveCtx, { ruling = true, decisionPool = "content" } = {}) {
  const root = mkdtempSync(join(tmpdir(), "external-ruling-gate-"));
  mkdirSync(join(root, ".git"));
  const unit = join(root, "enterprise");
  mkdirSync(join(unit, "lib", "schemas"), { recursive: true });
  mkdirSync(join(unit, "lib", "management", "skills"), { recursive: true });
  mkdirSync(join(unit, "content", "offices"), { recursive: true });
  mkdirSync(join(unit, "content", "decision-records"), { recursive: true });
  mkdirSync(join(unit, "lib", "management", "decision-records"), { recursive: true });
  for (const name of ["decision-record", "office", "ruling"]) copyFileSync(join(liveCtx.schemaPool, `${name}.schema.json`), join(unit, "lib", "schemas", `${name}.schema.json`));
  for (const office of ["configuration-manager", "change-control-board"]) copyFileSync(join(liveCtx.enterprise, "content", "offices", `${office}.json`), join(unit, "content", "offices", `${office}.json`));
  const pool = decisionPool === "legacy" ? join(unit, "lib", "management", "decision-records") : join(unit, "content", "decision-records");
  const decisionPath = join(pool, "external-decision.json");
  writeJson(decisionPath, fixtureDecision());
  if (ruling) {
    mkdirSync(join(unit, "content", "rulings"), { recursive: true });
    writeJson(join(unit, "content", "rulings", "external-ruling.json"), fixtureRuling());
  }
  const ctx = await buildContext(root, unit, { selected: liveCtx.selected, resolver: liveCtx.resolver, inspectMeshScope: liveCtx.inspectMeshScope, reader: liveCtx.reader });
  return { root, unit, ctx, decisionPath, pool, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

async function cellIdentity(liveCtx) {
  const cases = [];
  for (const poolKind of ["content", "legacy"]) {
    const fx = await makeFixture(liveCtx, { decisionPool: poolKind });
    try {
      const decision = fixtureDecision({ includeId: false }); writeJson(fx.decisionPath, decision);
      const result = capture(() => validateRecord(fx.ctx, decision, fx.decisionPath));
      cases.push(assertCase(result.ok && result.value.branch === "external-ruling", `seated-derived-id-${poolKind}`, result));
    } finally { fx.cleanup(); }
  }
  {
    const fx = await makeFixture(liveCtx); try {
      const rulingPath = join(fx.unit, "content", "rulings", "wrong-seat.json");
      rmSync(join(fx.unit, "content", "rulings", "external-ruling.json")); writeJson(rulingPath, fixtureRuling());
      const r = capture(() => validateRecord(fx.ctx, fixtureDecision(), fx.decisionPath));
      cases.push(assertCase(!r.ok && r.code === "external-ruling:missing" && r.facts.rejected?.["ruling-id-seat-mismatch"] === 1, "ruling-id-seat-mismatch", r));
    } finally { fx.cleanup(); }
  }
  for (const poolKind of ["content", "legacy"]) {
    const fx = await makeFixture(liveCtx, { decisionPool: poolKind }); try {
      const decision = fixtureDecision({ id: "seat-b" }); writeJson(fx.decisionPath, decision);
      writeJson(join(fx.unit, "content", "rulings", "external-ruling.json"), fixtureRuling({ backs: "seat-b" }));
      const r = capture(() => validateRecord(fx.ctx, decision, fx.decisionPath));
      cases.push(assertCase(!r.ok && r.code === "decision-identity:id-seat-mismatch", `decision-id-seat-mismatch-${poolKind}`, r));
    } finally { fx.cleanup(); }
  }
  {
    const fx = await makeFixture(liveCtx); try {
      writeJson(join(fx.unit, "lib", "management", "decision-records", "external-decision.json"), fixtureDecision());
      const r = capture(() => validateRecord(fx.ctx, fixtureDecision(), fx.decisionPath));
      cases.push(assertCase(!r.ok && r.code === "decision-identity:ambiguous", "decision-multiseat-ambiguity", r));
    } finally { fx.cleanup(); }
  }
  {
    const fx = await makeFixture(liveCtx); try {
      const attachment = join(fx.root, "attachment.json"); const data = fixtureDecision(); writeJson(attachment, data);
      const positive = capture(() => validateRecord(fx.ctx, data, attachment));
      const anonymousData = fixtureDecision({ includeId: false }); const anonymous = join(fx.root, "anonymous.json"); writeJson(anonymous, anonymousData);
      const negative = capture(() => validateRecord(fx.ctx, anonymousData, anonymous));
      cases.push(assertCase(positive.ok && !negative.ok && negative.code === "external-ruling:attachment-id-absent", "attachment-identity-rule", { positive, negative }));
    } finally { fx.cleanup(); }
  }
  return cases;
}

async function cellMesh(liveCtx) {
  const cases = [];
  const run = async (name, prepare) => {
    const fx = await makeFixture(liveCtx);
    let outside = null;
    try {
      outside = prepare(fx);
      const before = manifest(fx.root); const outsideBefore = outside ? manifest(outside) : null;
      const r = capture(() => validateRecord(fx.ctx, fixtureDecision(), fx.decisionPath));
      const after = manifest(fx.root); const outsideAfter = outside ? manifest(outside) : null;
      cases.push(assertCase(!r.ok && r.code.startsWith("jurisdiction:") && same(before, after) && same(outsideBefore, outsideAfter), name, { result: r, manifestEqual: same(before, after), outsideEqual: same(outsideBefore, outsideAfter), mutationTrace: [] }));
    } finally { fx.cleanup(); if (outside && outside.startsWith(tmpdir())) rmSync(outside, { recursive: true, force: true }); }
  };
  await run("outward-rulings-pool-symlink", (fx) => { const outside = mkdtempSync(join(tmpdir(), "ruling-outside-")); writeJson(join(outside, "external-ruling.json"), fixtureRuling()); rmSync(join(fx.unit, "content", "rulings"), { recursive: true }); symlinkSync(outside, join(fx.unit, "content", "rulings")); return outside; });
  await run("outward-ruling-file-symlink", (fx) => { const outside = mkdtempSync(join(tmpdir(), "ruling-file-outside-")); const at = join(outside, "external-ruling.json"); writeJson(at, fixtureRuling()); rmSync(join(fx.unit, "content", "rulings", "external-ruling.json")); symlinkSync(at, join(fx.unit, "content", "rulings", "external-ruling.json")); return outside; });
  await run("rulings-git-boundary", (fx) => { writeFileSync(join(fx.unit, "content", "rulings", ".git"), "gitdir: fixture\n"); return null; });
  await run("carrier-office-git-boundary", (fx) => { writeFileSync(join(fx.unit, "content", "offices", ".git"), "gitdir: fixture\n"); return null; });
  await run("inward-ruling-file-symlink", (fx) => { const target = join(fx.unit, "content", "rulings", "inward.json"); writeJson(target, fixtureRuling()); rmSync(join(fx.unit, "content", "rulings", "external-ruling.json")); symlinkSync(target, join(fx.unit, "content", "rulings", "external-ruling.json")); return null; });
  {
    const fx = await makeFixture(liveCtx); try {
      const broken = { ...fx.ctx, inspectMeshScope: () => { throw new Error("injected classifier failure"); }, unitScope: null };
      const r = capture(() => { broken.unitScope = meshInspect(broken, broken.enterprise, "enterprise"); });
      cases.push(assertCase(!r.ok && r.exit === 1 && r.code === "mesh:infrastructure", "classifier-infrastructure", r));
    } finally { fx.cleanup(); }
  }
  return cases;
}

async function cellMultiSeat(liveCtx) {
  const pools = liveCtx.resolver.poolsFor("decision-records", liveCtx.enterprise, { multiSeat: true });
  const current = join(liveCtx.enterprise, "content", "decision-records");
  const legacy = join(liveCtx.enterprise, "lib", "management", "decision-records");
  if (!pools.includes(current) || !pools.includes(legacy)) fail("check-cell:assertion", "shared multi-seat law did not return both live pools", 1, { pools });
  const expected = new Map([[current, LIVE_CURRENT], [legacy, LIVE_LEGACY]]);
  const cases = [];
  for (const [pool, pinned] of expected) {
    const found = readdirSync(pool).filter((x) => x.endsWith(".json")).map((x) => x.slice(0, -5)).sort();
    for (const id of pinned) if (!found.includes(id)) fail("check-cell:assertion", `pinned live decision '${id}' is absent from ${pool}`, 1);
    for (const id of found) {
      const path = join(pool, `${id}.json`); const data = jsonFrom(readFileSync(path), path);
      const r = capture(() => validateRecord(liveCtx, data, path));
      cases.push(assertCase(r.ok, `${relative(liveCtx.enterprise, pool)}:${id}`, r));
    }
  }
  return cases;
}

async function matrixCase(liveCtx, name, mutate, predicate) {
  const fx = await makeFixture(liveCtx);
  try {
    const state = { decision: fixtureDecision(), decisionPath: fx.decisionPath, rulingPath: join(fx.unit, "content", "rulings", "external-ruling.json"), fx };
    await mutate(state);
    const r = capture(() => validateRecord(fx.ctx, state.decision, state.decisionPath));
    return assertCase(predicate(r), name, r);
  } finally { fx.cleanup(); }
}

async function cellMatrix(liveCtx) {
  const specs = [
    ["positive", async () => {}, (r) => r.ok],
    ["absent-ruling", async ({ rulingPath }) => rmSync(rulingPath), (r) => !r.ok && r.code === "external-ruling:missing"],
    ["malformed-ruling", async ({ rulingPath }) => writeJson(rulingPath, { id: "external-ruling" }), (r) => !r.ok && r.facts.rejected?.["malformed-ruling"] === 1],
    ["unreadable-ruling", async ({ rulingPath }) => writeFileSync(rulingPath, "{bad\n"), (r) => !r.ok && r.facts.rejected?.["unreadable-ruling"] === 1],
    ["backs-mismatch", async ({ rulingPath }) => writeJson(rulingPath, fixtureRuling({ backs: "other" })), (r) => !r.ok && r.facts.rejected?.["backs-mismatch"] === 1],
    ["decider-mismatch", async ({ rulingPath }) => writeJson(rulingPath, fixtureRuling({ decider: "someone else" })), (r) => !r.ok && r.facts.rejected?.["decider-mismatch"] === 1],
    ["impossible-day", async ({ rulingPath }) => writeJson(rulingPath, fixtureRuling({ day: "2026-02-30" })), (r) => !r.ok && r.facts.rejected?.["impossible-ruled-on"] === 1],
    ["office-name-slug-coincidence", async ({ decision, decisionPath, rulingPath }) => { decision.decider = "change-control-board"; writeJson(decisionPath, decision); writeJson(rulingPath, fixtureRuling({ decider: "change-control-board" })); }, (r) => r.ok && r.value.branch === "external-ruling"],
    ["nonconforming-internal-office", async ({ fx, decision, decisionPath }) => { decision.decider = "the Change Control Board"; writeJson(decisionPath, decision); writeJson(join(fx.unit, "content", "offices", "change-control-board.json"), { id: "change-control-board" }); }, (r) => !r.ok],
    ["ambiguous-internal-office", async ({ fx, decision, decisionPath }) => { decision.decider = "the Change Control Board"; writeJson(decisionPath, decision); copyFileSync(join(fx.unit, "content", "offices", "change-control-board.json"), join(fx.unit, "content", "offices", "change-control-board.schema.json")); }, (r) => !r.ok],
    ["absent-carrier", async ({ rulingPath }) => writeJson(rulingPath, fixtureRuling({ carrier: "absent-office" })), (r) => !r.ok && r.facts.rejected?.["absent-carrier"] === 1],
    ["malformed-carrier", async ({ fx }) => writeJson(join(fx.unit, "content", "offices", "configuration-manager.json"), { id: "configuration-manager" }), (r) => !r.ok && r.facts.rejected?.["malformed-carrier"] === 1],
    ["ambiguous-carrier", async ({ fx }) => copyFileSync(join(fx.unit, "content", "offices", "configuration-manager.json"), join(fx.unit, "content", "offices", "configuration-manager.schema.json")), (r) => !r.ok && r.facts.rejected?.["ambiguous-carrier"] === 1],
    ["carrier-id-mismatch", async ({ fx }) => { const p = join(fx.unit, "content", "offices", "configuration-manager.json"); const o = jsonFrom(readFileSync(p), p); o.id = "change-control-board"; writeJson(p, o); }, (r) => !r.ok],
    ["ruling-mesh-refusal", async ({ fx }) => writeFileSync(join(fx.unit, "content", "rulings", ".git"), "gitdir: fixture\n"), (r) => !r.ok && r.code === "jurisdiction:sovereign-boundary"],
    ["carrier-mesh-refusal", async ({ fx }) => writeFileSync(join(fx.unit, "content", "offices", ".git"), "gitdir: fixture\n"), (r) => !r.ok && r.code === "jurisdiction:sovereign-boundary"],
  ];
  const cases = [];
  for (const spec of specs) cases.push(await matrixCase(liveCtx, ...spec));
  return cases;
}

async function cellRuledOn(liveCtx) {
  const property = jsonFrom(readFileSync(join(liveCtx.schemaPool, "ruling.schema.json")), "ruling schema").properties["ruled-on"];
  const forbidden = ["rfc 3339", "date-time", "timestamp", "timezone", "instant"];
  const text = JSON.stringify(property).toLowerCase();
  const cases = [assertCase(forbidden.every((word) => !text.includes(word)), "honest-public-vocabulary", { property })];
  for (const [day, expected] of [["2024-02-29", true], ["0000-01-01", false], ["2026-02-29", false], ["2026-02-30", false], ["2026-13-01", false]]) {
    const fx = await makeFixture(liveCtx); try {
      writeJson(join(fx.unit, "content", "rulings", "external-ruling.json"), fixtureRuling({ day }));
      const r = capture(() => validateRecord(fx.ctx, fixtureDecision(), fx.decisionPath));
      cases.push(assertCase(r.ok === expected, `calendar-${day}`, r));
    } finally { fx.cleanup(); }
  }
  return cases;
}

function fakeReader(path, source) { writeFileSync(path, source, { mode: 0o755 }); }

async function cellDependencies(liveCtx) {
  const cases = [];
  const root = mkdtempSync(join(tmpdir(), "ruling-dependencies-"));
  try {
    const flat = join(root, "skills"); mkdirSync(flat);
    const validModule = "export const resolveIdentifier=()=>({}); export const poolsFor=()=>[];\n";
    writeFileSync(join(flat, "resolve-an-identifier.js"), validModule);
    cases.push(assertCase(selectDependency("resolve-an-identifier.js", flat).layer === "flat", "flat-control"));
    rmSync(join(flat, "resolve-an-identifier.js"));
    let r = capture(() => selectDependency("resolve-an-identifier.js", flat)); cases.push(assertCase(!r.ok && r.exit === 1, "flat-missing", r));
    writeFileSync(join(flat, "resolve-an-identifier.js"), validModule);
    for (const dir of ["a", "b"]) { mkdirSync(join(flat, dir, "scripts"), { recursive: true }); writeFileSync(join(flat, dir, "scripts", "resolve-an-identifier.js"), validModule); }
    r = capture(() => selectDependency("resolve-an-identifier.js", flat)); cases.push(assertCase(!r.ok && r.code === "dependency:ambiguous", "flat-ambiguous", r));
    rmSync(join(flat, "b"), { recursive: true }); writeFileSync(join(flat, "a", "scripts", "resolve-an-identifier.js"), "export const x=1;\n");
    r = capture(() => selectDependency("resolve-an-identifier.js", flat)); cases.push(assertCase(!r.ok && r.code === "dependency:drift", "flat-drift", r));
    rmSync(join(flat, "a"), { recursive: true }); const source = join(flat, "resolver-source.js"); writeFileSync(source, validModule); rmSync(join(flat, "resolve-an-identifier.js")); symlinkSync(source, join(flat, "resolve-an-identifier.js"));
    r = capture(() => selectDependency("resolve-an-identifier.js", flat)); cases.push(assertCase(!r.ok && r.exit === 1, "flat-symlink", r));

    const projRoot = join(root, "projected"); const here = join(projRoot, "carrying", "scripts"); mkdirSync(here, { recursive: true });
    writeFileSync(join(projRoot, "resolve-an-identifier.js"), validModule);
    r = capture(() => selectDependency("resolve-an-identifier.js", here)); cases.push(assertCase(!r.ok && r.code === "dependency:missing-projected", "projected-missing", r));
    mkdirSync(join(projRoot, "resolving", "scripts"), { recursive: true }); writeFileSync(join(projRoot, "resolving", "scripts", "resolve-an-identifier.js"), validModule);
    cases.push(assertCase(selectDependency("resolve-an-identifier.js", here).layer === "projected", "projected-control"));
    writeFileSync(join(projRoot, "resolving", "scripts", "resolve-an-identifier.js"), "export {\n");
    writeFileSync(join(projRoot, "resolve-an-identifier.js"), "export {\n");
    const selected = selectDependency("resolve-an-identifier.js", here);
    r = await captureAsync(() => importSelected(selected));
    cases.push(assertCase(!r.ok && r.code === "dependency:import" && r.exit === 1, "projected-import-syntax", r));
    writeFileSync(join(projRoot, "resolving", "scripts", "resolve-an-identifier.js"), "export const nope=1;\n"); writeFileSync(join(projRoot, "resolve-an-identifier.js"), "export const nope=1;\n");
    const noExports = selectDependency("resolve-an-identifier.js", here); const module = await importSelected(noExports);
    r = capture(() => requireDependencyExports(module, { inspectMeshScope() {} }));
    cases.push(assertCase(!r.ok && r.code === "dependency:contract" && r.exit === 1, "projected-export-contract", r));

    const readers = join(root, "readers"); mkdirSync(readers);
    const pool = liveCtx.schemaPool; const valid = fixtureDecision({ status: "proposed" });
    const scripts = {
      control: `process.stdout.write(JSON.stringify({ok:true,schema:"emsenn/schema/decision-record",errors:[]}));`,
      nonconforming: `process.stdout.write(JSON.stringify({ok:false,schema:"emsenn/schema/decision-record",errors:["x"]}));process.exit(1);`,
      unparseable: `process.stdout.write("no");`,
      wrongSchema: `process.stdout.write(JSON.stringify({ok:true,schema:"wrong",errors:[]}));`,
      contradictory: `process.stdout.write(JSON.stringify({ok:false,schema:"emsenn/schema/decision-record",errors:["x"]}));`,
      statusTwo: `process.stdout.write("{}");process.exit(2);`,
      signal: `process.kill(process.pid,"SIGTERM");`,
    };
    for (const [name, sourceText] of Object.entries(scripts)) fakeReader(join(readers, name), sourceText);
    cases.push(assertCase(schemaVerdict(join(readers, "control"), pool, "decision-record", valid).ok, "reader-conforming-control"));
    cases.push(assertCase(!schemaVerdict(join(readers, "nonconforming"), pool, "decision-record", {}).ok, "reader-nonconforming-control"));
    for (const name of ["unparseable", "wrongSchema", "contradictory", "statusTwo", "signal"]) {
      r = capture(() => schemaVerdict(join(readers, name), pool, "decision-record", valid));
      cases.push(assertCase(!r.ok && r.exit === 1 && r.code === "schema-reader:infrastructure", `reader-${name}`, r));
    }
    r = capture(() => schemaVerdict(join(readers, "absent-reader"), pool, "decision-record", valid));
    cases.push(assertCase(!r.ok && r.exit === 1 && r.code === "schema-reader:infrastructure", "reader-spawn-error", r));
  } finally { rmSync(root, { recursive: true, force: true }); }
  return cases;
}

async function cellReadOnly(liveCtx) {
  const liveRulings = join(liveCtx.enterprise, "content", "rulings");
  const liveObserved = {
    rulings: liveRulings,
    rulingSchema: join(liveCtx.schemaPool, "ruling.schema.json"),
    proposedDecision: join(liveCtx.enterprise, "content", "decision-records", "name-the-emsweb-substack-node-and-authorize-its-remote.json"),
    ccbOffice: join(liveCtx.enterprise, "content", "offices", "change-control-board.json"),
  };
  const snapshot = (named) => Object.fromEntries(Object.entries(named).map(([name, path]) => [name, manifest(path)]));
  const liveBefore = snapshot(liveObserved); const existedBefore = pathExists(liveRulings);
  const fx = await makeFixture(liveCtx);
  try {
    const internal = fixtureDecision({ id: "internal", decider: "the Change Control Board" }); const internalPath = join(fx.root, "internal.json"); writeJson(internalPath, internal);
    const proposed = fixtureDecision({ id: "proposed", status: "proposed" }); const proposedPath = join(fx.root, "proposed.json"); writeJson(proposedPath, proposed);
    const external = fixtureDecision();
    const measured = (fn) => { const before = manifest(fx.root); const result = capture(fn); const after = manifest(fx.root); return { result, equal: same(before, after) }; };
    const positiveM = measured(() => validateRecord(fx.ctx, external, fx.decisionPath));
    const internalM = measured(() => validateRecord(fx.ctx, internal, internalPath));
    const proposedM = measured(() => validateRecord(fx.ctx, proposed, proposedPath));
    const rulingPath = join(fx.unit, "content", "rulings", "external-ruling.json"); const rulingBytes = readFileSync(rulingPath); rmSync(rulingPath);
    const absentM = measured(() => validateRecord(fx.ctx, external, fx.decisionPath)); writeFileSync(rulingPath, rulingBytes);
    const liveAfter = snapshot(liveObserved);
    return [assertCase(positiveM.result.ok && internalM.result.ok && internalM.result.value.branch === "internal-decider" && proposedM.result.ok && proposedM.result.value.branch === "not-decided" && !absentM.result.ok
      && [positiveM, internalM, proposedM, absentM].every((x) => x.equal) && same(liveBefore, liveAfter) && existedBefore === pathExists(liveRulings), "read-only-external-only", { positive: positiveM, internal: internalM, proposed: proposedM, absent: absentM, everyInvocationManifestEqual: [positiveM, internalM, proposedM, absentM].every((x) => x.equal), liveAuthorityManifestEqual: same(liveBefore, liveAfter), mutationTrace: [] })];
  } finally { fx.cleanup(); }
}

async function runCell(name, liveCtx) {
  const functions = {
    "identity-seat-binding": cellIdentity,
    "mesh-jurisdiction": cellMesh,
    "decision-multiseat-regression": cellMultiSeat,
    "external-ruling-adversarial-matrix": cellMatrix,
    "ruled-on-contract": cellRuledOn,
    "dependency-fail-closed": cellDependencies,
    "read-only-external-only": cellReadOnly,
  };
  const cases = await functions[name](liveCtx);
  return { ok: true, cell: name, carrier: basename(HERE) === "scripts" ? "projected" : "flat", cases: cases.length, results: cases };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    emit({ ok: true, usage: ["--validate <path> --root <worktree>", "--check-cell <name> --root <worktree>"], cells: [...CELLS] });
  }
  const ctx = await buildContext(args.root);
  if (args.cell) emit(await runCell(args.cell, ctx), 0);
  const target = readTarget(ctx.root, args.validate);
  emit({ ...validateRecord(ctx, target.data, target.path), validated: args.validate, schema: EXPECTED_SCHEMA_IDS["decision-record"] }, 0);
}

main().catch((error) => {
  if (error instanceof GateError) emit({ ...error.facts, ok: false, code: error.code, error: error.message }, error.exit);
  emit({ ok: false, code: "infrastructure:unexpected", error: error?.stack ?? String(error) }, 1);
});
