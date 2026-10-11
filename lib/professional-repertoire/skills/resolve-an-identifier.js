#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export * from "@harmonious-union/resolving-an-identifier/src/resolve-an-identifier.js";

const target = fileURLToPath(new URL("../../../services/knowledge-services-section/services/identifier-services-section/services/resolving-an-identifier/src/resolve-an-identifier.js", import.meta.url));
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { input: readFileSync(0), stdio: ["pipe", "inherit", "inherit"] });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
