#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { shopOfficeRepertoire } from "./office-repertoire-market.mjs";

const identifier = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const server = new McpServer(
  { name: "union-officer-academy-office-repertoire-market", version: "1.0.0" },
  { instructions: "Return Academy-authored move-scoped repertoire offers. Never appoint, rank incomparable offices, or mutate receiver state." },
);

server.registerTool("shop_office_repertoire", {
  title: "Shop the Academy professional office repertoire",
  description: "Resolve one receiver-authored move-scoped strategy space against digest-verified Academy offices, duties, and skills; return Offer for one exact match, Question for several, or Reject for none.",
  inputSchema: {
    type: z.literal("OfficeRepertoireDemand"),
    actor: z.literal("urn:ame:bare-cedar-fog-codex"),
    receiver: z.literal("urn:ame:bare-cedar-fog-codex"),
    network: z.string().regex(/^eip155:[1-9][0-9]*$/u),
    demand: z.string().startsWith("urn:"),
    move: z.string().startsWith("urn:"),
    strategySpace: z.object({
      requiredDuties: z.array(identifier).default([]),
      requiredSkills: z.array(identifier).default([]),
      excludedOffices: z.array(identifier).default([]),
    }),
  },
  annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false, readOnlyHint: true },
}, async (input) => {
  const result = await shopOfficeRepertoire(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

await server.connect(new StdioServerTransport());
