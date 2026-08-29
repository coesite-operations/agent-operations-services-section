#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { admitDoctrine, admitRequest, appendRecord, compileCurriculum, compileOfficeFormationBundle, deriveFormationEpochGap, deriveRequalificationGap, enrollCandidate, establishBaseline, issueQualification, openCohort, readRecords, recordAssessment, recordQualificationStatus, recordRefusal, recordSuccessionExercise, recordTraining, verifyNode } from "./academy.mjs";

const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function args(argv) {
  const result = { command: argv[0], root: NODE_ROOT };
  for (let index = 1; index < argv.length; index += 1) {
    if (argv[index] === "--root") result.root = resolve(argv[++index]);
    else if (argv[index] === "--input") result.input = argv[++index];
    else throw new Error(`unknown argument ${argv[index]}`);
  }
  return result;
}

function input(path) {
  const bytes = path ? readFileSync(path, "utf8") : readFileSync(0, "utf8");
  return JSON.parse(bytes);
}

export async function run(argv) {
  const options = args(argv);
  if (options.command === "verify") return await verifyNode(options.root);
  const value = input(options.input), records = await readRecords(options.root);
  let record;
  switch (options.command) {
    case "admit-request": record = admitRequest(value); break;
    case "compile-curriculum": record = compileCurriculum(value); break;
    case "establish-baseline": record = establishBaseline(value, records); break;
    case "open-cohort": record = openCohort(value, records); break;
    case "compile-office-formation-bundle": record = compileOfficeFormationBundle(value, records); break;
    case "enroll": record = enrollCandidate(value, records); break;
    case "record-training": record = recordTraining(value, records); break;
    case "record-assessment": record = recordAssessment(value, records); break;
    case "issue-qualification": record = issueQualification(value, records); break;
    case "record-refusal": record = recordRefusal(value); break;
    case "derive-requalification-gap": record = deriveRequalificationGap(value, records); break;
    case "derive-formation-epoch-gap": record = deriveFormationEpochGap(value, records); break;
    case "admit-doctrine": record = admitDoctrine(value); break;
    case "record-qualification-status": record = recordQualificationStatus(value, records); break;
    case "record-succession-exercise": record = recordSuccessionExercise(value, records); break;
    default: throw new Error(`unknown command ${options.command ?? "<missing>"}`);
  }
  const written = await appendRecord(options.root, record);
  return { ok: true, id: written.record.id, type: written.record.type, networkReference: written.networkReference, semanticId: written.semanticId, record: written.record };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(await run(process.argv.slice(2)))}\n`); }
  catch (error) { process.stderr.write(`${JSON.stringify({ ok: false, error: error.message })}\n`); process.exitCode = 1; }
}
