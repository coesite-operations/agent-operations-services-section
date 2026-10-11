#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const target = fileURLToPath(new URL("../../../services/knowledge-services-section/services/glossary-services-section/services/term-services/services/drafting-a-term/src/drafting-a-term.js", import.meta.url));
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { input: readFileSync(0), stdio: ["pipe", "inherit", "inherit"] });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
