#!/usr/bin/env node

import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CODEX_ACTOR } from "../src/office-repertoire-market.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const transport = new StdioClientTransport({ command: process.execPath, args: [resolve(ROOT, "src/serve-office-repertoire-mcp.mjs")], cwd: ROOT, env: { ...process.env } });
const client = new Client({ name: "office-repertoire-market-smoke", version: "1.0.0" }, { capabilities: {} });

try {
  await client.connect(transport);
  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map(({ name }) => name), ["shop_office_repertoire"]);
  const result = await client.callTool({
    name: "shop_office_repertoire",
    arguments: {
      type: "OfficeRepertoireDemand",
      actor: CODEX_ACTOR,
      receiver: CODEX_ACTOR,
      network: process.env.ACADEMY_NETWORK ?? "eip155:31337",
      demand: "urn:smoke:office-repertoire-demand",
      move: "urn:smoke:codex-move",
      strategySpace: { requiredDuties: ["writing-a-software-architecture-specification"], requiredSkills: [], excludedOffices: [] },
    },
  });
  assert.notEqual(result.isError, true, JSON.stringify(result.content));
  assert.equal(result.structuredContent.type, "Offer");
  assert.equal(result.structuredContent.object.type, "OfficeRepertoireOffer");
  assert.equal(result.structuredContent.object.candidate.id, "system-architect");
  process.stdout.write(`${JSON.stringify({ ok: true, server: client.getServerVersion(), tool: "shop_office_repertoire", office: "system-architect" })}\n`);
} finally {
  await client.close();
}
