import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const ACTOR = "urn:ame:record-improvement-observation-service";
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const SAFE = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\0).+$/u;
const FIELDS = Object.freeze({ "missing-description": "description", "missing-tag": "tags" });
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const inside = (root, path) => { const value = relative(root, path); return value !== "" && value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value); };

function residue(reason, details = {}) { return Object.freeze({ type: "RecordImprovementObservationResidue", provider: ACTOR, reason, ...details, inferenceCalls: 0, customerMutation: false }); }
function fieldAbsent(bytes, field) {
  const text = bytes.toString("utf8");
  if (text.includes("\uFFFD")) return null;
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(text);
  if (!match) return null;
  return !new RegExp(`^${field}\\s*:`, "mu").test(match[1]);
}
function envelopeProblem(envelope, customer, territory) {
  if (!envelope || envelope.type !== "ProtectedOracleImprovementGameEnvelope" || envelope.customer !== customer || envelope.territory !== territory) return "protected-oracle-envelope-required";
  const required = ["requestedChanges", "ownedTargetRoots", "forbiddenRoots", "sourceDigests", "acceptanceArtifacts", "acceptanceCommands", "economy", "resourceCeilings", "productContract", "requiredCapabilities", "taskClass"];
  if (required.some((field) => envelope[field] === undefined)) return "protected-oracle-envelope-is-incomplete";
  if (!Array.isArray(envelope.sourceDigests) || envelope.sourceDigests.length < 1 || envelope.sourceDigests.some((value) => typeof value !== "string" || !SHA256.test(value))) return "protected-oracle-source-evidence-required";
  if (!Array.isArray(envelope.acceptanceArtifacts) || envelope.acceptanceArtifacts.length < 1 || envelope.acceptanceArtifacts.some((item) => typeof item?.path !== "string" || !SAFE.test(item.path) || typeof item?.digest !== "string" || !SHA256.test(item.digest))) return "protected-oracle-acceptance-evidence-required";
  return null;
}

export function observeRecordImprovement(request) {
  if (!request || request.type !== "RecordImprovementObservationRequest" || typeof request.customer !== "string" || !request.customer || typeof request.territory !== "string" || !isAbsolute(request.territory)) return residue("exact-customer-territory-request-required");
  const field = FIELDS[request.findingClass];
  if (!field || typeof request.path !== "string" || !SAFE.test(request.path)) return residue("unsupported-or-unbounded-record-class");
  if (!Number.isSafeInteger(request.maximumBytes) || request.maximumBytes < 1 || request.maximumBytes > 1_048_576 || !Number.isSafeInteger(request.expectedTicks) || request.expectedTicks < 1 || request.expectedTicks > 10_000) return residue("finite-observation-bounds-required");
  const envelopeProblemValue = envelopeProblem(request.protectedOracleEnvelope, request.customer, request.territory); if (envelopeProblemValue) return residue(envelopeProblemValue);
  const territory = resolve(request.territory), target = resolve(territory, request.path);
  if (!inside(territory, target)) return residue("record-path-escapes-customer-territory");
  let stat; try { stat = lstatSync(target); } catch { return residue("named-record-is-absent"); }
  if (!stat.isFile() || stat.isSymbolicLink() || !target.endsWith(".md")) return residue("named-record-is-not-a-regular-markdown-file");
  if (stat.size > request.maximumBytes) return residue("named-record-exceeds-customer-byte-bound", { observedBytes: stat.size });
  const bytes = readFileSync(target), absent = fieldAbsent(bytes, field);
  if (absent === null) return residue("named-record-has-no-utf8-yaml-frontmatter", { observedBytes: bytes.length });
  if (!absent) return residue("declared-frontmatter-field-is-present", { observedBytes: bytes.length, field });
  const contentDigest = digest(bytes), observationDigest = digest(Buffer.from(JSON.stringify({ provider: ACTOR, territory, path: request.path, findingClass: request.findingClass, contentDigest, field })));
  return Object.freeze({ type: "RecordImprovementFinding", customer: request.customer, provider: ACTOR, territory, findingClass: request.findingClass, path: request.path, contentDigest, observationDigest, observedAt: request.observedAt ?? new Date().toISOString(), summary: `Record ${request.path} is missing required ${field} frontmatter.`, resourceObservation: { baselinePerTick: { amount: 1, unit: "record-findings" }, expectedTicks: request.expectedTicks }, protectedOracleEnvelope: request.protectedOracleEnvelope, inferenceCalls: 0, customerMutation: false });
}
