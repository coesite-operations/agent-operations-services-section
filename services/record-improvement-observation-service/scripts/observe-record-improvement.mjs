#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { observeRecordImprovement } from "../src/observe.mjs";
const input = readFileSync(0, "utf8").trim();
const result = observeRecordImprovement(input ? JSON.parse(input) : {});
process.stdout.write(`${JSON.stringify(result)}\n`);
if (result.type === "RecordImprovementObservationResidue") process.exitCode = 2;
