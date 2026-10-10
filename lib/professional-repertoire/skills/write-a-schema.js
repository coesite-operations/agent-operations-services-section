#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const target = fileURLToPath(import.meta.resolve("@red-cup-engineering/json-schema-services-section/write-a-schema"));
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { input: readFileSync(0), stdio: ["pipe", "inherit", "inherit"] });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
