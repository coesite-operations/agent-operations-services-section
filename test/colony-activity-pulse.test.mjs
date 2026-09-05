import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { recordAcademySemanticContent } from "@coesite-operations/rendanheyi-formation-lianqun-member-runtime-service/semantic-records";
import { collectAcademyColonyActivity } from "../src/collect-colony-activity.mjs";

test("projects timestamped Academy CloudEvents and refuses untimestamped A2A inference", async () => {
  const root = mkdtempSync(join(tmpdir(), "academy-pulse-"));
  const dataRoot = join(root, "data");
  const events = [
    { id: "old", type: "org.emsenn.formation.admitted", time: "2026-07-20T01:59:00.000Z", data: {} },
    { id: "one", type: "org.emsenn.formation.admitted", time: "2026-07-20T02:10:00.000Z", data: {} },
    { id: "two", type: "org.emsenn.contract.rejected", time: "2026-07-20T02:20:00.000Z", data: {} }
  ];
  for (const event of events) await recordAcademySemanticContent(root, "union-officer-academy.boundary-event", event, event.time);
  const pulse = await collectAcademyColonyActivity({ window: { fromExclusive: "2026-07-20T02:00:00.000Z", toInclusive: "2026-07-20T03:00:00.000Z", baseline: false }, recordedAt: "2026-07-20T03:00:00.000Z", dataRoot });
  assert.equal(pulse.events.length, 2);
  assert.match(pulse.events.find((event) => event.domain === "contracts").summary, /1 were refusals/u);
  assert.match(pulse.refusals.find((item) => item.domain === "a2a").reason, /excluded/u);
});
