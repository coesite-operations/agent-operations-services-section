#!/usr/bin/env node
import { spawn } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { queryAcademySemanticContent, recordAcademySemanticContent } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/semantic-records";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { isNiUri as isCanonicalSha256NiUri } from "@red-cup-engineering/ni-services-section";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MEMBER_PACKAGES = [
  "@coesite-operations/rendanheyi-context-compilation-xiaowei",
  "@coesite-operations/rendanheyi-formation-market-xiaowei",
  "@coesite-operations/rendanheyi-independent-examination-xiaowei",
  "@coesite-operations/rendanheyi-qualification-registry-xiaowei",
  "@coesite-operations/rendanheyi-situated-practice-xiaowei",
];
const CONTEXT = "https://www.w3.org/ns/activitystreams";
const ACTOR = "urn:ame:union-officer-academy";
const contentId = (value) => identifyJsonSemanticContent({ objectKind: "union-officer-academy.formation-lianqun-market-record", value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const at = process.argv.includes("--now") ? process.argv[process.argv.indexOf("--now") + 1] : new Date().toISOString();
const operation = process.argv.includes("--operation") ? process.argv[process.argv.indexOf("--operation") + 1] : "form-lianqun";
const epoch = process.argv.includes("--epoch") ? process.argv[process.argv.indexOf("--epoch") + 1] : "live-eo-cycle-2";
const members = MEMBER_PACKAGES.map((packageName) => {
  const runner = fileURLToPath(import.meta.resolve(packageName));
  const config = JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(`${packageName}/member`)), "utf8"));
  return { root: resolve(dirname(runner), ".."), runner, config };
});
const invoke = (member, op, activity) => new Promise((accept, reject) => {
  // This runner uses files only as ephemeral stdio file descriptors. The
  // protocol value still crosses the child process's stdin/stdout boundary;
  // the files work around hosts that discard nested Node pipe output.
  const transportRoot = mkdtempSync(join(tmpdir(), "academy-lianqun-stdio-"));
  const stdoutPath = join(transportRoot, "stdout");
  const stderrPath = join(transportRoot, "stderr");
  const stdoutFd = openSync(stdoutPath, "w");
  const stderrFd = openSync(stderrPath, "w");
  const child = spawn(process.execPath, [member.runner, "--operation", op, "--now", at], { cwd: member.root, stdio: ["pipe", stdoutFd, stderrFd] });
  closeSync(stdoutFd);
  closeSync(stderrFd);
  const timer = setTimeout(() => child.kill("SIGTERM"), 30_000);
  child.on("error", reject);
  child.on("close", (code, signal) => {
    clearTimeout(timer);
    const stdout = readFileSync(stdoutPath, "utf8");
    const stderr = readFileSync(stderrPath, "utf8");
    rmSync(transportRoot, { recursive: true, force: true });
    try { accept(JSON.parse(stdout)); }
    catch { reject(new Error(`${member.config.id} returned no protocol value (exit=${code}, signal=${signal}): ${stderr || stdout}`)); }
  });
  child.stdin.end(JSON.stringify(activity));
});
async function recordAcademy(category, record) {
  return recordAcademySemanticContent(ROOT, category, record, at);
}

if (operation === "form-lianqun") {
  const userOutcome = "leader-movement-team receiver accepts an exact Academy-formed and customer-projected Executive Officer that closes the held-out Union formation MAPE-K capstone";
  const requiredCapabilityIds = ["formation-market-brokerage", "complete-context-compilation", "situated-formation-practice", "independent-qualification-examination", "qualification-registry-and-requalification"];
  const lot = { type: "FormationWorkLot", id: contentId({ userOutcome, requiredCapabilityIds, epoch }), epoch, userOutcome, requiredCapabilityIds, receiver: "urn:ame:leader-movement-team", valueRule: "all members share accepted upside or receiver-refused shortfall; no internal customer or sequential signoff", monetaryPrice: "undecided-by-leader" };
  const bids = await Promise.all(members.map(async (member) => { const solicitation = { "@context": CONTEXT, id: contentId({ actor: ACTOR, target: member.config.actor, lot }), type: "Offer", actor: ACTOR, target: member.config.actor, object: { type: "ServiceSolicitation", lot } }; return { member, solicitation, offer: await invoke(member, "solicit-service", solicitation) }; }));
  if (bids.some(({ offer }) => offer.type !== "Offer")) throw new Error("at least one autonomous member refused the shared user outcome");
  const coverage = new Set(bids.flatMap(({ offer }) => offer.object.capabilityIds));
  if (!requiredCapabilityIds.every((id) => coverage.has(id))) throw new Error("provider bids do not cover the complete outcome capability denominator");
  const units = bids.reduce((sum, { offer }) => sum + offer.object.contributionUnits, 0);
  const shares = Object.fromEntries(bids.map(({ member, offer }) => [member.config.id, Number((offer.object.contributionUnits / units).toFixed(6))]));
  const commitments = await Promise.all(bids.map(async ({ member, offer }) => { const capability = { type: "Capability", holder: member.config.actor, invocationTarget: member.config.actor, parentOffer: offer.id, allowedActions: ["invoke-service"], attenuation: { lotDigest: offer.object.lotDigest, customerTerritoryMutation: false }, capTP: { target: member.config.actor, method: "invoke-service" } }; const contract = { "@context": CONTEXT, id: contentId({ actor: ACTOR, target: member.config.actor, offer: offer.id, capability }), type: "Accept", actor: ACTOR, target: member.config.actor, inReplyTo: offer.id, object: { type: "ServiceContract", contract: "academy-formation-lianqun", offer, capability } }; return invoke(member, "invoke-service", contract); }));
  if (commitments.some((result) => result.type !== "Accept")) throw new Error("mutual selection did not close for every member");
  const agreement = { type: "RendanheyiFormationLianqunAgreement", id: contentId({ lot, bids: bids.map(({ offer }) => offer.id), commitments: commitments.map((item) => item.object.id), providerConfigurations: Object.fromEntries(bids.map(({ member, offer }) => [member.config.id, offer.object.serviceConfigurationDigest])), shares }), lot, parties: members.map(({ config }) => config.id), bids: bids.map(({ offer }) => offer.id), commitments: commitments.map((item) => item.object.id), providerConfigurations: Object.fromEntries(bids.map(({ member, offer }) => [member.config.id, offer.object.serviceConfigurationDigest])), contributionUnits: Object.fromEntries(bids.map(({ member, offer }) => [member.config.id, offer.object.contributionUnits])), shares, shareRule: "bid contribution units, contingent on the one receiver outcome; shortfall shared", voluntary: true, assignedByHeadquarters: false, internalCustomers: false, formedAt: at };
  await recordAcademy("union-officer-academy.formation-lianqun-agreement", agreement);
  process.stdout.write(`${JSON.stringify(agreement, null, 2)}\n`);
} else if (operation === "settle-outcome") {
  const activity = JSON.parse(readFileSync(0, "utf8"));
  const receipt = activity?.object?.receipt;
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Offer" || activity.actor !== "urn:ame:leader-movement-team" || activity.target !== ACTOR || activity.object?.type !== "CustomerFormationOutcomeEvidence") throw new Error("exact LMT ActivityStreams Offer<CustomerFormationOutcomeEvidence> required");
  if (!isCanonicalSha256NiUri(activity.object.receiptSemanticId) || receipt?.type !== "ReceiverOutcomeReceipt" || receipt.receiver !== activity.actor || receipt.disposition !== "accepted" || receipt.appointmentPerformed !== false || receipt.authorityGranted !== false) throw new Error("canonical accepted producer-identity-neutralizing receiver outcome receipt required");
  const agreement = (await queryAcademySemanticContent("union-officer-academy.formation-lianqun-agreement", { root: ROOT })).find((item) => item.id === receipt.lianqunAgreement);
  if (!agreement || receipt.userOutcome !== agreement.lot.userOutcome || canonical(receipt.shares) !== canonical(agreement.shares)) throw new Error("receiver outcome does not close the exact lianqun agreement");
  await recordAcademy("union-officer-academy.customer-formation-outcome", { activity, receiptSemanticId: activity.object.receiptSemanticId, receipt });
  const outcomes = await Promise.all(members.map((member) => invoke(member, "record-outcome", { "@context": CONTEXT, id: contentId({ actor: ACTOR, target: member.config.actor, receipt }), type: "Create", actor: ACTOR, target: member.config.actor, object: receipt })));
  if (outcomes.some((result) => result.type !== "Accept")) throw new Error("receiver outcome was not admitted by every lianqun member");
  process.stdout.write(`${JSON.stringify({ type: "FormationLianqunSettlement", receipt: receipt.id, outcomes: outcomes.map((item) => item.object.id) }, null, 2)}\n`);
} else throw new Error(`unknown operation ${operation}`);
