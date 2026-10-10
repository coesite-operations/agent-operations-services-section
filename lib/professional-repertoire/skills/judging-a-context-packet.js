#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const target = fileURLToPath(new URL("../../../services/working-services-section/services/context-packet-services-section/services/judging-a-context-packet/src/judging-a-context-packet.js", import.meta.url));
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { input: readFileSync(0), stdio: ["pipe", "inherit", "inherit"] });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
