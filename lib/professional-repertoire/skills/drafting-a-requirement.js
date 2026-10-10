#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const target = fileURLToPath(new URL("../../../services/change-services-section/services/requirements-management-team/services/drafting-a-requirement/src/drafting-a-requirement.js", import.meta.url));
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { input: readFileSync(0), stdio: ["pipe", "inherit", "inherit"] });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
