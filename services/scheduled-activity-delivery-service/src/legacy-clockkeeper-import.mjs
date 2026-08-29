import { createHash } from "node:crypto";
import { createReadStream, existsSync, lstatSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { entry, seavt } from "@red-cup-engineering/witness-journal-entry-service";
import { appendEntries, appendSeavt } from "@red-cup-engineering/witness-journal-log-service";
import { RECORD_KIND, identify } from "./semantic-content.mjs";

const LEGACY_CONTRACT = "clocked-activity-delivery";
const LEGACY_RETIREMENT_CONTRACT = "clocked-activity-delivery-retirement";
export const LEGACY_ARCHIVE_CONTRACT = "legacy-clockkeeper/archive/v1";
const NI_PREFIX = "ni:///sha-256;";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function legacyDigest(value) { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }
function legacyId(value) { return `urn:${legacyDigest(value)}`; }
function safeInstant(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function isBelow(root, path) { const rel = relative(root, path); return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith("..")); }
function sha256Ni(hash) { return `${NI_PREFIX}${hash.digest("base64url")}`; }
function categoryCoordinate(category) { return `category:${createHash("sha256").update(category).digest("hex")}`; }
function tokenHex(token) { return Buffer.from(token.slice(NI_PREFIX.length), "base64url").toString("hex"); }
function journalRows(category, value, recordedAt) {
  const identity = identifyJsonSemanticContent({ objectKind: RECORD_KIND, value, witnessRoot: EMPTY_WITNESS_ROOT });
  const hex = tokenHex(identity.id), entity = `record.${hex}`, content = `content.${hex}`;
  return {
    id: identity.id,
    content: entry(identity.id, category, value, recordedAt),
    claims: [
      seavt(entity, "journal:category", categoryCoordinate(category), recordedAt),
      seavt(entity, "journal:content", content, recordedAt),
      seavt(entity, "charge:support", "evidence.present", recordedAt),
    ],
  };
}

function jsonlFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return jsonlFiles(path);
    return entry.isFile() && entry.name.endsWith(".jsonl") ? [path] : [];
  }).sort();
}

function assertIdentity(record, kind, file, line) {
  const fail = (reason) => { throw new Error(`legacy ${kind} schema or identity failure at ${file}:${line}: ${reason}`); };
  if (!record || Object.getPrototypeOf(record) !== Object.prototype) fail("record must be an object");
  if (record.customerTerritoryMutation !== false) fail("customerTerritoryMutation must be false");
  if (kind === "schedules") {
    if (record.type !== "ScheduleRegistration" || record.status !== "active" || typeof record.scheduleId !== "string" || record.id !== record.scheduleId) fail("invalid ScheduleRegistration identity fields");
    if (typeof record.provider !== "string" || typeof record.customer !== "string" || !record.request || record.requestDigest !== legacyDigest(record.request) || !safeInstant(record.registeredAt)) fail("invalid ScheduleRegistration semantics");
    if (record.scheduleId !== legacyId({ provider: record.provider, customer: record.customer, requestDigest: record.requestDigest })) fail("scheduleId does not bind provider, customer, and request");
    return;
  }
  if (kind === "delivery-receipts") {
    if (record.type !== "ScheduledDeliveryReceipt" || typeof record.scheduleId !== "string" || !Number.isSafeInteger(record.occurrence) || record.occurrence < 0 || !record.activity || record.activityDigest !== legacyDigest(record.activity) || !safeInstant(record.attemptedAt) || !safeInstant(record.scheduledFor)) fail("invalid ScheduledDeliveryReceipt semantics");
    if (record.targetResponse !== null && record.targetResponseDigest !== legacyDigest(record.targetResponse)) fail("target response digest mismatch");
    if (record.targetResponse === null && record.targetResponseDigest !== null) fail("null target response requires null digest");
    if (record.id !== legacyId({ scheduleId: record.scheduleId, occurrence: record.occurrence, activity: record.activity, disposition: record.disposition, response: record.targetResponse })) fail("receipt identity mismatch");
    return;
  }
  if (record.type !== "ScheduleRetirement" || record.contract !== LEGACY_RETIREMENT_CONTRACT || record.status !== "retired" || typeof record.scheduleId !== "string" || typeof record.requestDigest !== "string" || !safeInstant(record.retiredAt)) fail("invalid ScheduleRetirement semantics");
  if (record.id !== legacyId({ scheduleId: record.scheduleId, requestDigest: record.requestDigest })) fail("retirement identity mismatch");
}

/**
 * Copies only validated, historic Clockkeeper records. There is deliberately
 * no contract mapping: the old literal contracts do not establish a
 * cryptographic equivalence with current law. Imported rows remain archival
 * evidence and cannot become active ScheduleDelivery projections.
 */
export async function importLegacyClockkeeper({ sourceRoot, destinationRoot } = {}) {
  if (typeof sourceRoot !== "string" || typeof destinationRoot !== "string") throw new TypeError("sourceRoot and destinationRoot are required");
  const source = resolve(sourceRoot), destination = resolve(destinationRoot);
  if (source === destination || isBelow(source, destination) || isBelow(destination, source)) throw new Error("legacy source and destination roots must be distinct and non-overlapping");
  if (!existsSync(source) || !lstatSync(source).isDirectory()) throw new Error("legacy source root must be an existing directory");
  const contract = LEGACY_ARCHIVE_CONTRACT;
  const inputs = [
    ["schedules", join(source, "records", "schedules")],
    ["delivery-receipts", join(source, "records", "delivery-receipts")],
    ["schedule-retirements", join(source, "records", "schedule-retirements")],
  ];
  const existing = await existingRecordIds(destination, new Set(inputs.map(([kind]) => `${contract}.${kind}`)));
  const counts = Object.fromEntries(inputs.map(([kind]) => [kind, { read: 0, imported: 0, skipped: 0 }]));
  const sourceHash = createHash("sha256"); const imported = [], batches = new Map();
  // Validate and stage the complete bounded legacy record corpus before the
  // first destination write. One malformed late row therefore cannot leave a
  // misleading partial import. Batches are date partitions, matching journal
  // custody and avoiding the journal carrier's quadratic one-row append path.
  for (const [kind, directory] of inputs) for (const file of jsonlFiles(directory)) {
    const reader = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity }); let lineNumber = 0;
    for await (const line of reader) {
      lineNumber += 1; if (!line.trim()) continue;
      sourceHash.update(line).update("\n"); counts[kind].read += 1;
      let record; try { record = JSON.parse(line); } catch { throw new Error(`invalid legacy ${kind} JSONL at ${file}:${lineNumber}`); }
      assertIdentity(record, kind, file, lineNumber);
      const identity = identify(record, RECORD_KIND).id;
      if (existing.has(identity)) { counts[kind].skipped += 1; continue; }
      const category = `${contract}.${kind}`, recordedAt = kind === "schedules" ? record.registeredAt : kind === "delivery-receipts" ? record.attemptedAt : record.retiredAt;
      const rows = journalRows(category, record, recordedAt), day = recordedAt.slice(0, 10);
      if (!batches.has(day)) batches.set(day, { at: recordedAt, content: [], claims: [] });
      batches.get(day).content.push(rows.content); batches.get(day).claims.push(...rows.claims);
      existing.add(identity); imported.push(identity); counts[kind].imported += 1;
    }
  }
  for (const day of [...batches.keys()].sort()) {
    const batch = batches.get(day);
    appendEntries(destination, "semantic-record-content", batch.content, batch.at);
    appendSeavt(destination, "semantic-record-seavt-claims", batch.claims, batch.at);
  }
  return Object.freeze({ type: "LegacyClockkeeperImportReport", sourceRoot: source, destinationRoot: destination, destinationContract: contract, counts, sourceDigest: sha256Ni(sourceHash), importedRecordDigests: imported.sort(), deliveryActivated: false, sourceMutated: false });
}

async function existingRecordIds(root, categories) {
  const found = new Set();
  for (const file of jsonlFiles(join(root, "data", "logs"))) {
    if (!file.endsWith("semantic-record-content.jsonl")) continue;
    const reader = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity }); let lineNumber = 0;
    for await (const line of reader) {
      lineNumber += 1; if (!line.trim()) continue;
      let row; try { row = JSON.parse(line); } catch { throw new Error(`invalid destination semantic record journal JSONL at ${file}:${lineNumber}`); }
      if (!categories.has(row.a)) continue;
      if (!row || typeof row !== "object" || typeof row.e !== "string" || !Object.hasOwn(row, "v") || identify(row.v, RECORD_KIND).id !== row.e) throw new Error(`invalid destination semantic record journal identity at ${file}:${lineNumber}`);
      found.add(row.e);
    }
  }
  return found;
}

export const LEGACY_CLOCKKEEPER_CONTRACTS = Object.freeze({ schedule: LEGACY_CONTRACT, retirement: LEGACY_RETIREMENT_CONTRACT });
