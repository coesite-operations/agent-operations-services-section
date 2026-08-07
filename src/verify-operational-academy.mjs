#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { queryAcademySemanticContent } from "@union-officer-academy/formation-lianqun-member-runtime-service/semantic-records";
import { readRecords, verifyNode } from "./academy.mjs";
import { operationalChecks } from "./contract-union-formation-mape.mjs";
import { serviceConfiguration } from "@union-officer-academy/formation-lianqun-member-runtime-service";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const REPOSITORY_ROOT = resolve(ROOT, "../../../../../..");
const MEMBERS = ["context-compilation-xiaowei", "formation-market-xiaowei", "independent-examination-xiaowei", "qualification-registry-xiaowei", "situated-practice-xiaowei"];
const EXPECTED_STAGE_ACTORS = ["urn:ame:context-compilation-xiaowei", "urn:ame:independent-examination-xiaowei", "urn:ame:formation-market-xiaowei", "urn:ame:situated-practice-xiaowei"];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const rawDigest = (path) => `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
async function customerReceipts(root = ROOT) {
  const categories = ["union-officer-academy.customer-capstone-receipt", "union-officer-academy.customer-formation-outcome"];
  const admissions = (await Promise.all(categories.map((category) => queryAcademySemanticContent(category, { root })))).flat();
  return admissions.flatMap((admission) => [admission.receipt, admission.provisionalProjectionReceipt].filter(Boolean));
}

export async function verifyOperationalAcademy(root = ROOT) {
  const gaps = operationalChecks(root).filter((item) => !item.settled);
  assert(gaps.length === 0, `operational carrier gaps: ${gaps.map((item) => item.id).join(", ")}`);
  const pkg = json(join(root, "package.json"));
  assert(pkg.bin?.["solicit-service"] && pkg.bin?.["invoke-service"], "Academy provider boundary is absent");
  assert(!JSON.stringify(pkg).includes("formation-mape-chain"), "superseded stage departments remain in the active package surface");

  const agreement = (await queryAcademySemanticContent("union-officer-academy.formation-lianqun-agreement", { root })).sort((a, b) => a.formedAt.localeCompare(b.formedAt)).at(-1);
  assert(agreement?.type === "RendanheyiFormationLianqunAgreement", "no live formation lianqun agreement");
  assert(agreement.assignedByHeadquarters === false && agreement.internalCustomers === false && agreement.voluntary === true, "formation providers are departments rather than a voluntary lianqun");
  assert(agreement.parties.length === MEMBERS.length && MEMBERS.every((member) => agreement.parties.includes(member)), "live lianqun does not cover the five outcome capabilities");
  assert(new Set(Object.values(agreement.shares)).size > 1, "value shares are a fixed equal allocation");
  for (const member of MEMBERS) {
    const memberRoot = join(root, "services/formation-lianqun/services", member);
    const ownership = json(join(memberRoot, "lib/ownership.json"));
    assert(ownership.kind === "node-micro-enterprise-constitution" && ["decision", "personnel", "distribution"].every((right) => ownership.rights.includes(right)), `${member} lacks constitutional three-rights evidence`);
    assert((await queryAcademySemanticContent("market-events", { root })).length > 0, `${member} authored no market bid`);
    assert((await queryAcademySemanticContent("commitments", { root })).length > 0, `${member} made no mutual-selection commitment`);
    const configuration = serviceConfiguration(memberRoot);
    assert(agreement.providerConfigurations?.[member] === configuration.digest, `${member} executable carriers drifted after the live lianqun agreement`);
  }

  const manifest = readFileSync(join(root, ".codex/.codex-agent-manifest"), "utf8").trim().split("\n").filter(Boolean);
  assert(["formation-context-steward", "formation-practitioner", "independent-examiner", "registrar", "superintendent"].every((office) => manifest.includes(office) && existsSync(join(root, `.codex/agents/${office}.toml`))), "Academy continuous offices are not projected as callable agents");

  const verification = await verifyNode(root);
  const records = await readRecords(root);
  const qualifying = records.filter((item) => item.type === "Assessment" && item.disposition === "qualified").sort((a, b) => a.assessedAt.localeCompare(b.assessedAt)).at(-1);
  const qualification = records.find((item) => item.type === "Qualification" && item.assessment === qualifying?.id);
  assert(qualifying && qualification, "no independently qualified live Executive Officer chain");
  assert(qualification.supersedes, "live qualification does not name the prior cohort qualification it supersedes");
  assert(records.some((item) => item.type === "QualificationStatusEvent" && item.event === "supersession" && item.qualification === qualification.supersedes && item.successorQualification === qualification.id), "registrar did not preserve the prior qualification as superseded historical evidence");
  const bundle = records.find((item) => item.type === "OfficeFormationBundle" && item.enrollment === qualifying.enrollment && item.candidateAssembly);
  const cohort = records.find((item) => item.type === "Cohort" && item.id === bundle?.cohort);
  assert(bundle?.office.id === "executive-officer-to-the-leader", "qualified bundle is not the exact Executive Officer office");
  assert(MEMBERS.every((member) => cohort?.formationConfiguration.providers.some((provider) => provider.id === member && provider.contract === agreement.id)), "qualified cohort is not bound to the live lianqun commitments");
  for (const material of bundle.contextPlan.materials) {
    const materialPath = material.identity === "AGENTS.md" || material.identity.startsWith("lib/") || material.identity.startsWith(".agents/")
      ? join(REPOSITORY_ROOT, material.identity)
      : join(root, material.identity);
    assert(existsSync(materialPath), `qualified context material is absent: ${material.identity}`);
    assert(rawDigest(materialPath) === material.digest, `qualified context material drifted: ${material.identity}`);
  }
  assert(bundle.candidateAssembly.layerBindings.harness === bundle.candidateAssembly.harnessDigest, "qualified candidate assembly and harness identity diverge");
  const control = records.find((item) => item.type === "Assessment" && item.id === qualifying.controlAssessment);
  assert(control?.disposition === "gaps", "qualification lacks a failing same-baseline control");
  assert(records.some((item) => item.type === "FormationRefusal" && item.code === "E_ASSESSOR_NOT_INDEPENDENT"), "the failed authority-separation cycle was not preserved");

  const receipts = await customerReceipts(root);
  const receipt = receipts.filter((item) => item.type === "ExecutiveOfficerUnionMapeCapstoneReceipt" && item.bundle === bundle.id).at(-1);
  assert(receipt?.disposition === "accepted" && Object.values(receipt.checks).every(Boolean), "Leader Movement Team has not accepted the formed EO capstone");
  assert(receipt.mapeEvidence && Object.values(receipt.mapeEvidence.stages).map((item) => item.actor).join(",") === EXPECTED_STAGE_ACTORS.join(","), "capstone was not performed by the lianqun actors");
  assert(receipt.targetDeliveryOutcomes.length > 0 && receipt.targetDeliveryOutcomes.some((item) => item.invoked === true), "capstone has no actual target boundary delivery");
  assert(receipts.some((item) => item.id === receipt.provisionalProjection && item.candidateAssemblyDigest === bundle.candidateAssembly.assemblyDigest), "customer-owned exact projection receipt is absent");
  const outcomeReceipt = receipts.filter((item) => item.type === "ReceiverOutcomeReceipt" && item.qualification === qualification.id && item.capstoneReceipt === receipt.id).at(-1);
  assert(outcomeReceipt?.disposition === "accepted" && outcomeReceipt.appointmentPerformed === false, "customer has not admitted the exact qualification and capstone without fabricating appointment");
  for (const member of MEMBERS) assert((await queryAcademySemanticContent("value-events", { root })).some((item) => item.receiverReceipt === outcomeReceipt.id && item.outcome === "accepted"), `${member} has not booked receiver-accepted value`);
  return { ok: true, members: MEMBERS.length, agreement: agreement.id, cohort: cohort.id, bundle: bundle.id, qualification: qualification.id, receiverReceipt: outcomeReceipt.id, capstoneReceipt: receipt.id, targetDeliveries: receipt.targetDeliveryOutcomes.length, verification };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(await verifyOperationalAcademy(), null, 2)}\n`); }
  catch (error) { process.stderr.write(`operational Academy verification failed: ${error.message}\n`); process.exitCode = 1; }
}
