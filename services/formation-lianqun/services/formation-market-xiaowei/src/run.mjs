#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runFormationLianqunMember } from "@union-officer-academy/formation-lianqun-member-runtime-service";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const result = await runFormationLianqunMember({ root, activity: JSON.parse(readFileSync(0, "utf8")), operation: arg("--operation", "solicit-service"), at: arg("--now", new Date().toISOString()) });
process.stdout.write(`${JSON.stringify(result)}\n`);
if (result.type === "Reject") process.exitCode = 2;
