import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

export const ACTIVITY_STREAMS_CONTEXT = "https://www.w3.org/ns/activitystreams";
export const ACADEMY_ACTOR = "urn:ame:union-officer-academy";
export const CODEX_ACTOR = "urn:ame:bare-cedar-fog-codex";
const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const CAIP2 = /^eip155:[1-9][0-9]*$/u;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function hash(value) {
  const bytes = typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value);
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalId(kind, value) {
  return identifyJsonSemanticContent({ objectKind: `union-officer-academy.${kind}`, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
}

function exactIdentifiers(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  const unique = [...new Set(value)];
  if (unique.some((item) => typeof item !== "string" || !IDENTIFIER.test(item))) throw new TypeError(`${label} must contain canonical identifiers only`);
  return unique.sort();
}

async function readJson(path) {
  const raw = await readFile(path);
  return { value: JSON.parse(raw), digest: `sha256:${hash(raw)}` };
}

function dutyId(uri) {
  const parts = typeof uri === "string" ? uri.split("/") : [];
  const id = parts.at(-1);
  if (!id || !IDENTIFIER.test(id)) throw new Error(`invalid Academy duty URI: ${String(uri)}`);
  return id;
}

async function loadRepertoire() {
  const { value: catalog } = await readJson(resolve(ROOT, "content/catalogs/professional-repertoire.json"));
  if (catalog.owner !== "union-officer-academy" || catalog.appointmentAuthority !== false) throw new Error("Academy repertoire authority declaration is invalid");
  const offices = [];
  for (const entry of catalog.offices) {
    if (!IDENTIFIER.test(entry.id) || entry.canonicalPath !== `content/professional-repertoire/offices/${entry.id}.json`) throw new Error(`invalid office catalog entry: ${entry.id}`);
    const officeRecord = await readJson(resolve(ROOT, entry.canonicalPath));
    if (officeRecord.digest !== entry.digest || officeRecord.value.id !== entry.id) throw new Error(`office repertoire digest mismatch: ${entry.id}`);
    const dutyIds = [...new Set((officeRecord.value["bears-duty"] ?? []).map(dutyId))].sort();
    const duties = [];
    const skills = new Set(officeRecord.value["provides-skill"] ?? []);
    for (const id of dutyIds) {
      const dutyRecord = await readJson(resolve(ROOT, `content/professional-repertoire/duties/${id}.json`));
      if (dutyRecord.value.id !== id) throw new Error(`duty identity mismatch: ${id}`);
      const catalogDuty = catalog.duties?.find((item) => item.id === id);
      if (!catalogDuty || catalogDuty.digest !== dutyRecord.digest) throw new Error(`duty repertoire digest mismatch: ${id}`);
      for (const skill of dutyRecord.value.skills ?? []) {
        if (!IDENTIFIER.test(skill)) throw new Error(`invalid skill identifier in duty ${id}`);
        skills.add(skill);
      }
      duties.push({ id, digest: dutyRecord.digest });
    }
    const exactSkills = [...skills].sort();
    if (exactSkills.some((skill) => !IDENTIFIER.test(skill))) throw new Error(`invalid skill identifier in office ${entry.id}`);
    offices.push({ id: entry.id, digest: officeRecord.digest, duties, skills: exactSkills });
  }
  return offices;
}

function envelope(type, object, demand) {
  const basis = { provider: ACADEMY_ACTOR, target: CODEX_ACTOR, demand: demand.demand, move: demand.move, object };
  return { "@context": ACTIVITY_STREAMS_CONTEXT, id: canonicalId(type, basis), type, actor: ACADEMY_ACTOR, target: CODEX_ACTOR, object };
}

export async function shopOfficeRepertoire(input) {
  if (!input || input.type !== "OfficeRepertoireDemand") throw new TypeError("type must be OfficeRepertoireDemand");
  if (input.actor !== CODEX_ACTOR || input.receiver !== CODEX_ACTOR) throw new TypeError("demand actor and receiver must be the Bare Cedar Fog Codex Actor");
  if (typeof input.network !== "string" || !CAIP2.test(input.network)) throw new TypeError("demand network must be an EIP-155 CAIP-2 identifier supplied by the customer");
  if (typeof input.demand !== "string" || !input.demand.startsWith("urn:")) throw new TypeError("demand must be an immutable URN");
  if (typeof input.move !== "string" || !input.move.startsWith("urn:")) throw new TypeError("move must be an immutable URN");
  const strategySpace = input.strategySpace ?? {};
  const requiredDuties = exactIdentifiers(strategySpace.requiredDuties ?? [], "requiredDuties");
  const requiredSkills = exactIdentifiers(strategySpace.requiredSkills ?? [], "requiredSkills");
  const excludedOffices = exactIdentifiers(strategySpace.excludedOffices ?? [], "excludedOffices");
  if (requiredDuties.length + requiredSkills.length === 0) throw new TypeError("strategy space must require at least one exact duty or skill");
  const demand = { type: input.type, actor: input.actor, receiver: input.receiver, demand: input.demand, move: input.move, strategySpace: { requiredDuties, requiredSkills, excludedOffices } };
  const strategySpaceDigest = `sha256:${hash(demand.strategySpace)}`;
  const accountPath = process.env.ACADEMY_EVM_ACCOUNT_PATH ?? resolve(ROOT, "content/evm/accounts", `${input.network.replace(":", "-")}.json`);
  const { value: account, digest: accountDigest } = await readJson(accountPath);
  if (account.enterprise?.urn !== ACADEMY_ACTOR || !new RegExp(`^${input.network}:0x[0-9a-f]{40}$`, "u").test(account.account?.caip10 ?? "")) throw new Error("Academy customer-chain EVM account declaration is invalid");
  const offices = await loadRepertoire();
  const candidates = offices.filter((office) => !excludedOffices.includes(office.id) && requiredDuties.every((id) => office.duties.some((duty) => duty.id === id)) && requiredSkills.every((id) => office.skills.includes(id))).sort((a, b) => a.id.localeCompare(b.id));
  const common = { demand: demand.demand, move: demand.move, strategySpaceDigest, providerAccount: account.account.caip10, providerAccountDigest: accountDigest, appointmentAuthority: false, receiverAcceptanceRequired: true, moveScoped: true, incumbency: false };
  if (candidates.length === 1) return envelope("Offer", { type: "OfficeRepertoireOffer", ...common, candidate: candidates[0] }, demand);
  if (candidates.length > 1) return envelope("Question", { type: "ProviderSelectionRequired", ...common, ranking: "none", candidates }, demand);
  return envelope("Reject", { type: "MarketUnavailable", ...common, reason: "No Academy professional office contains the exact required repertoire.", candidates: [] }, demand);
}
