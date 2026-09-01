#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRecords,
  compileOfficeFormationBundle,
  readRecords,
  recordFormationCorrection,
  verifyNode,
} from "./academy.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const at = process.argv[2] ?? new Date().toISOString();
const records = await readRecords(ROOT);
const legacy = records.filter((record) => record.type === "OfficeFormationBundle" && record.candidateAssembly === undefined);
const corrected = [];

for (const prior of legacy) {
  if (records.some((record) => record.type === "FormationRecordCorrection" && record.target === prior.id)) continue;
  const replacement = compileOfficeFormationBundle({
    enrollment: prior.enrollment,
    compiledAt: at,
    dispositionDigest: prior.characterFormation.dispositionDigest,
    personaDigest: prior.characterFormation.personaDigest,
    materials: prior.contextPlan.materials,
    omissions: prior.contextPlan.omissions,
    carriers: prior.contextPlan.carriers,
    exercisePackDigest: prior.exercisePackDigest,
    engagementRoles: prior.engagementRoles,
    projectionPlan: prior.projectionPlan,
  }, records);
  const correction = recordFormationCorrection({
    target: prior.id,
    replacement: replacement.id,
    recordedAt: at,
    recordedBy: "union-officer-academy#registrar",
    reason: "Candidate-assembly rectification: the prior bundle omitted model, harness, runtime, agent-relation, context, and tool layer bindings and is retained only as invalid historical evidence.",
  });
  await appendRecords(ROOT, [replacement, correction]);
  records.push(replacement, correction);
  corrected.push({ target: prior.id, replacement: replacement.id, correction: correction.id });
}

process.stdout.write(`${JSON.stringify({ corrected, verification: await verifyNode(ROOT) }, null, 2)}\n`);
