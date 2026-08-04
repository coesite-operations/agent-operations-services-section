import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ACADEMY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function territoryRoot(start = ACADEMY_ROOT) {
  let cursor = resolve(start);
  while (dirname(cursor) !== cursor) {
    if (existsSync(join(cursor, "lib", "emsenn", "services", "561-group"))) return cursor;
    cursor = dirname(cursor);
  }
  throw new Error(`territory root not found from ${start}`);
}

export function rawDigest(path) {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

export function filesBelow(path, { exclude = [] } = {}) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (exclude.includes(entry.name)) return [];
    const child = join(path, entry.name);
    return entry.isDirectory() ? filesBelow(child, { exclude }) : [child];
  });
}

export function treeDigest(root) {
  const entries = filesBelow(root).sort().map((path) => `${relative(root, path).split(sep).join("/")}\0${rawDigest(path)}`);
  return `sha256:${createHash("sha256").update(entries.join("\n")).digest("hex")}`;
}

function json(path) { return JSON.parse(readFileSync(path, "utf8")); }
function rel(root, path) { return relative(root, path).split(sep).join("/"); }
function academyRel(path) { return rel(ACADEMY_ROOT, path); }
function territoryRel(path) { return rel(territoryRoot(), path); }

const EO = "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office";
const CHARACTER_SOURCES = {
  "codex-interactive-session": `${EO}/services/leader-movement-team/content/characters/codex-interactive-session.json`,
  "rom-keldar": "lib/emsenn/services/561-group/lib/agency/characters/rom-keldar",
  "riley-park": "lib/emsenn/services/561-group/lib/agency/characters/riley-park",
  "karen-wiener": "lib/emsenn/services/561-group/services/lenticule-science/lib/characters/karen-wiener",
  "lauren-becker": "lib/emsenn/services/561-group/services/lenticule-science/lib/characters/lauren-becker",
  "melvin-ginsberg": "lib/emsenn/services/561-group/services/lenticule-science/lib/characters/melvin-ginsberg",
  "calder-underhill": "lib/emsenn/services/561-group/services/lenticule-science/services/obsmetrological-services-section/src/lib/agency/characters/calder-underhill"
};

function canonicalRecords(directory) {
  return filesBelow(join(ACADEMY_ROOT, directory)).filter((path) => path.endsWith(".json") && dirname(path) === join(ACADEMY_ROOT, directory)).sort().map((path) => {
    const record = json(path);
    return { id: record.id, canonicalPath: academyRel(path), digest: rawDigest(path) };
  });
}

export function makeProfessionalCatalog(territory) {
  const offices = canonicalRecords("content/professional-repertoire/offices").map((item) => ({
    ...item,
    priorProjection: `${EO}/content/offices/${item.id}.json`,
    projectionDigest: rawDigest(join(territory, EO, "content", "offices", `${item.id}.json`))
  }));
  const duties = canonicalRecords("content/professional-repertoire/duties").map((item) => ({
    ...item,
    priorProjection: `${EO}/content/duties/${item.id}.json`,
    projectionDigest: rawDigest(join(territory, EO, "content", "duties", `${item.id}.json`))
  }));
  const works = canonicalRecords("content/professional-repertoire/works").map((item) => ({
    ...item,
    priorProjection: `${EO}/data/records/works/${item.id}.json`,
    projectionDigest: rawDigest(join(territory, EO, "data", "records", "works", `${item.id}.json`))
  }));
  const skillRoot = join(ACADEMY_ROOT, "lib", "professional-repertoire", "skills");
  const skills = readdirSync(skillRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name)).map((entry) => ({
    id: entry.name,
    canonicalRoot: `lib/professional-repertoire/skills/${entry.name}`,
    digest: treeDigest(join(skillRoot, entry.name)),
    priorProjection: `${EO}/lib/management/skills/${entry.name}`,
    projectionDigest: treeDigest(join(territory, EO, "lib", "management", "skills", entry.name))
  }));
  const supportScripts = readdirSync(skillRoot, { withFileTypes: true }).filter((entry) => entry.isFile()).sort((a, b) => a.name.localeCompare(b.name)).map((entry) => ({
    id: entry.name,
    canonicalPath: `lib/professional-repertoire/skills/${entry.name}`,
    digest: rawDigest(join(skillRoot, entry.name)),
    priorProjection: `${EO}/lib/management/skills/${entry.name}`,
    projectionDigest: rawDigest(join(territory, EO, "lib", "management", "skills", entry.name))
  }));
  return {
    id: "union-professional-repertoire",
    owner: "union-officer-academy",
    classification: "academy-repertoire",
    sourceTransition: "Executive Office carriers are retained only as digest-bound consumer projections; Academy carriers are canonical.",
    appointmentAuthority: false,
    offices,
    duties,
    works,
    skills,
    supportScripts,
    counts: { offices: offices.length, duties: duties.length, works: works.length, skillPackages: skills.length, supportScripts: supportScripts.length }
  };
}

function makeCharacterProjectionLedger(territory, corps) {
  return corps.characters.map((character) => {
    const canonical = join(ACADEMY_ROOT, character.canonicalRoot);
    const projection = join(territory, CHARACTER_SOURCES[character.id]);
    const projectionIsFile = existsSync(projection) && !readdirSafe(projection);
    return {
      id: character.id,
      canonicalRoot: character.canonicalRoot,
      canonicalDigest: treeDigest(canonical),
      priorProjection: CHARACTER_SOURCES[character.id],
      projectionDigest: projectionIsFile ? rawDigest(projection) : treeDigest(projection),
      projectionKind: projectionIsFile ? "single-file" : "tree"
    };
  });
}

function readdirSafe(path) {
  try { return readdirSync(path); } catch { return null; }
}

function discoverCarriers(territory) {
  const all = filesBelow(join(territory, "lib", "emsenn"), { exclude: ["node_modules", ".git", "data", "legacy", "_archive", "fixtures"] });
  const carriers = [];
  for (const path of all) {
    const p = territoryRel(path);
    if ((p.includes("/content/offices/") || p.includes("/professional-repertoire/offices/") || p.includes("/lib/management/offices/")) && p.endsWith(".json")) carriers.push({ kind: "office", path: p, id: json(path).id });
    else if ((p.includes("/content/duties/") || p.includes("/professional-repertoire/duties/")) && p.endsWith(".json")) carriers.push({ kind: "duty", path: p, id: json(path).id });
    else if (p.endsWith("/SKILL.md") || p.endsWith("/skill.json")) carriers.push({ kind: "skill", path: p, id: p.split("/").at(-2) });
  }
  const corps = json(join(ACADEMY_ROOT, "content", "catalogs", "character-corps.json"));
  for (const character of corps.characters) {
    carriers.push({ kind: "character", id: character.id, path: `${territoryRel(ACADEMY_ROOT)}/${character.canonicalRoot}/${character.entrypoint}` });
    const source = CHARACTER_SOURCES[character.id];
    carriers.push({ kind: "character", id: character.id, path: source.endsWith(".json") ? source : `${source}/${character.entrypoint}` });
  }
  return carriers.sort((a, b) => a.path.localeCompare(b.path));
}

function canonicalIndex(catalog, territoryAcademyPrefix) {
  const maps = { office: new Map(), duty: new Map(), skill: new Map(), character: new Map() };
  for (const item of catalog.offices) maps.office.set(item.id, `${territoryAcademyPrefix}/${item.canonicalPath}`);
  for (const item of catalog.duties) maps.duty.set(item.id, `${territoryAcademyPrefix}/${item.canonicalPath}`);
  for (const item of catalog.skills) maps.skill.set(item.id, `${territoryAcademyPrefix}/${item.canonicalRoot}`);
  return maps;
}

function classify(carrier, territory, catalog, characterLedger) {
  const academyPrefix = territoryRel(ACADEMY_ROOT);
  const canonical = canonicalIndex(catalog, academyPrefix);
  const absolute = join(territory, carrier.path);
  const digest = carrier.kind === "skill" && carrier.path.endsWith("/skill.json") ? rawDigest(absolute) : rawDigest(absolute);
  if (carrier.path.startsWith(`${academyPrefix}/content/professional-repertoire/`) || carrier.path.startsWith(`${academyPrefix}/lib/professional-repertoire/`) || carrier.path.startsWith(`${academyPrefix}/content/characters/`)) {
    return { ...carrier, classification: "academy-repertoire", canonicalPath: carrier.path, digest, reason: "canonical Academy professional or character carrier" };
  }
  if (carrier.path.startsWith(`${academyPrefix}/content/offices/`) || carrier.path.startsWith(`${academyPrefix}/content/duties/`) || carrier.path.startsWith(`${academyPrefix}/lib/management/skills/`)) {
    return { ...carrier, classification: "academy-governance", canonicalPath: carrier.path, digest, reason: "operates the Academy rather than being supplied as its product" };
  }
  if (carrier.kind === "character") {
    const item = characterLedger.find((entry) => entry.id === carrier.id);
    return { ...carrier, classification: "projection", canonicalPath: `${academyPrefix}/${item.canonicalRoot}/${json(join(ACADEMY_ROOT, "content/catalogs/character-corps.json")).characters.find((entry) => entry.id === carrier.id).entrypoint}`, digest, canonicalDigest: rawDigest(join(ACADEMY_ROOT, item.canonicalRoot, json(join(ACADEMY_ROOT, "content/catalogs/character-corps.json")).characters.find((entry) => entry.id === carrier.id).entrypoint)), reason: "legacy character-store entrypoint retained as Academy projection" };
  }
  const canonicalPath = canonical[carrier.kind]?.get(carrier.id);
  if (canonicalPath) {
    let canonicalCarrier = canonicalPath;
    if (carrier.kind === "skill") canonicalCarrier = `${canonicalPath}/${carrier.path.endsWith("/skill.json") ? "skill.json" : "SKILL.md"}`;
    if (existsSync(join(territory, canonicalCarrier))) {
      const canonicalDigest = rawDigest(join(territory, canonicalCarrier));
      if (canonicalDigest === digest) return { ...carrier, classification: "projection", canonicalPath: canonicalCarrier, digest, canonicalDigest, reason: "digest-equal publication of Academy professional law" };
      return { ...carrier, classification: "service-specialization", specializes: canonicalPath, digest, canonicalDigest, reason: "named local overlay differs from the Academy profession and remains under service law" };
    }
  }
  return { ...carrier, classification: "service-specialization", digest, reason: "carrier depends on its named settlement's domain, protected state, customer relation, or operational interface" };
}

export function compileCatalogs({ write = false } = {}) {
  const territory = territoryRoot();
  const catalog = makeProfessionalCatalog(territory);
  const corps = json(join(ACADEMY_ROOT, "content", "catalogs", "character-corps.json"));
  const characters = makeCharacterProjectionLedger(territory, corps);
  const projectionLedger = { id: "union-officer-academy-projection-ledger", owner: "union-officer-academy", professionalRepertoire: [...catalog.offices, ...catalog.duties, ...catalog.works, ...catalog.skills, ...catalog.supportScripts], characters };
  const adjudications = {
    id: "union-live-executor-carrier-adjudications",
    owner: "union-officer-academy",
    classifierVersion: 1,
    closedWorld: true,
    generatedAt: "2026-07-18T00:00:00-05:00",
    entries: discoverCarriers(territory).map((carrier) => classify(carrier, territory, catalog, characters))
  };
  if (write) {
    writeFileSync(join(ACADEMY_ROOT, "content", "catalogs", "professional-repertoire.json"), `${JSON.stringify(catalog, null, 2)}\n`);
    writeFileSync(join(ACADEMY_ROOT, "content", "catalogs", "projection-ledger.json"), `${JSON.stringify(projectionLedger, null, 2)}\n`);
    writeFileSync(join(ACADEMY_ROOT, "content", "catalogs", "territorial-artifact-adjudications.json"), `${JSON.stringify(adjudications, null, 2)}\n`);
  }
  return { catalog, projectionLedger, adjudications };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes("--write");
  try {
    const result = compileCatalogs({ write });
    process.stdout.write(`${JSON.stringify({ ok: true, write, counts: result.catalog.counts, adjudications: result.adjudications.entries.length, characters: result.projectionLedger.characters.length })}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ ok: false, error: error.message })}\n`);
    process.exitCode = 1;
  }
}
