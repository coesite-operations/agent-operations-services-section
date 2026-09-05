import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { queryAcademySemanticContent } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/semantic-records";

export const ACADEMY_ACTIVITY_PROVIDER = "urn:ame:union-officer-academy:civic-activity-pulse-provider";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COLONY_ACTOR = "urn:ame:bare-cedar-fog-colony";
function digest(value) { return createHash("sha256").update(value).digest("hex"); }
function domainOf(type) {
  if (/formation|qualification|cohort|enrollment|character/u.test(type)) return "formations";
  if (/govern|leadership|decision|mandate|constitution/u.test(type)) return "politics";
  if (/contract|tender|offer|award|service|procure/u.test(type)) return "contracts";
  if (/mape|rsi|knowledge|work|assessment|examin/u.test(type)) return "work";
  if (/a2a/u.test(type)) return "a2a";
  if (/activity/u.test(type)) return "activity-streams";
  if (/value|spend|payment|receipt/u.test(type)) return "economy";
  return "operations";
}
function outcomeOf(row) { const text = `${row.type} ${row.data?.disposition ?? ""} ${row.data?.outcome ?? ""}`.toLowerCase(); if (/reject|refus/u.test(text)) return "refused"; if (/fail|error/u.test(text)) return "failed"; if (/accept|admit|complete|conform|succeed|qualif/u.test(text)) return "succeeded"; return "observed"; }
export async function collectAcademyColonyActivity({ window, recordedAt, dataRoot = join(ROOT, "data") } = {}) {
  const from = Date.parse(window.fromExclusive); const to = Date.parse(window.toInclusive); const rows = [];
  for (const row of await queryAcademySemanticContent("union-officer-academy.boundary-event", { root: dirname(dataRoot) })) { const at = Date.parse(row.time); if (at > from && at <= to) rows.push({ row, evidence: row.id, domain: domainOf(row.type ?? ""), outcome: outcomeOf(row) }); }
  const events = [];
  for (const domain of [...new Set(rows.map((item) => item.domain))].sort()) { const group = rows.filter((item) => item.domain === domain); const refused = group.filter((item) => item.outcome === "refused").length; const failed = group.filter((item) => item.outcome === "failed").length; const types = [...new Set(group.map((item) => item.row.type))].sort(); events.push({
    id: `urn:sha256:${digest(`${window.fromExclusive}\n${window.toInclusive}\n${domain}\n${group.map((item) => item.row.id).join("\n")}`)}`, occurredAt: group.map((item) => item.row.time).sort().at(-1), domain, kind: "academy-cloudevents-interval",
    summary: `The Union Officer Academy issued ${group.length} ${domain} events across ${types.length} event types; ${refused} were refusals and ${failed} were failures. Types: ${types.slice(0, 5).join(", ")}${types.length > 5 ? ", …" : ""}.`,
    outcome: failed ? "failed" : refused ? "refused" : group.some((item) => item.outcome === "succeeded") ? "succeeded" : "observed",
    quantities: [{ label: `Academy ${domain} events`, amount: String(group.length), unit: "events", displayOrder: 500 + events.length }, { label: `Academy ${domain} refusals`, amount: String(refused), unit: "events", displayOrder: 520 + events.length }], evidence: [...new Set(group.map((item) => item.evidence))]
  }); }
  return { type: "ColonyActivityPulseEnvelope", providerActor: ACADEMY_ACTIVITY_PROVIDER, settlementActor: "urn:ame:union-officer-academy", colonyActor: COLONY_ACTOR, window, recordedAt, events, stocks: [],
    unsupportedDomains: ["git-io", "evm", "deployments"], refusals: [{ domain: "a2a", reason: "Academy A2A task carriers without an exact event time are excluded from interval flows rather than dated by filename.", evidence: ["urn:ame:union-officer-academy:evidence:a2a-temporalization-refusal"] }, { domain: "economy", reason: "Ununitized externalSpend fields are not promoted to monetary quantities; currency and basis are required.", evidence: ["urn:ame:union-officer-academy:evidence:currency-basis-required"] }] };
}
