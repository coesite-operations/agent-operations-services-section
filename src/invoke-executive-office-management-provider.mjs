import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED = new Set(["write-a-schema.js", "write-an-office.js", "make-a-task.js", "dispatch-a-task.js", "list-open-obligations.js"]);

export function invokeExecutiveOfficeManagementProvider(capability) {
  if (!ALLOWED.has(capability)) throw new TypeError(`unadmitted Executive Office capability: ${capability}`);
  // write-a-schema.js is not an Executive Office capability at all — it is a
  // six-line shim there too, spawning @red-cup-engineering/json-schema-services-section's
  // write-a-schema entrypoint. Resolving it via the Executive Office walk-up
  // below would make the Academy depend on the consumer fork to run a
  // capability the fork itself does not own; call the published package directly.
  if (capability === "write-a-schema.js") {
    const provider = fileURLToPath(import.meta.resolve("@red-cup-engineering/json-schema-services-section/write-a-schema"));
    const result = spawnSync(process.execPath, [provider, ...process.argv.slice(2)], { stdio: "inherit" });
    process.exitCode = result.status ?? 1;
    return;
  }
  let cursor = dirname(fileURLToPath(import.meta.url));
  let provider;
  while (dirname(cursor) !== cursor) {
    const candidate = join(cursor, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills", capability);
    if (existsSync(candidate)) { provider = candidate; break; }
    cursor = dirname(cursor);
  }
  if (!provider) {
    process.stderr.write(`union-officer-academy: contracted Executive Office provider is absent: ${capability}\n`);
    process.exitCode = 2;
    return;
  }
  const result = spawnSync(process.execPath, [provider, ...process.argv.slice(2)], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
}
