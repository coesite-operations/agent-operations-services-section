import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runAcademyRsiCycle, verifyAcademyRsi } from "../src/academy-rsi.mjs";
import { startTypedCircuitResidueAssayProcess } from "@lenticule-science/typed-circuit-residue-assay/test-provider";

const SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPOSITORY = resolve(SOURCE, "../../../../../..");
const PROVIDER = join(REPOSITORY, "lib/emsenn/services/561-group/services/lenticule-science/services/obsmetrological-services-section/services/typed-circuit-residue-assay");
function fixture() {
  const base = mkdtempSync(join(tmpdir(), "uoa-rmn-v3-")), academy = join(base, "union-officer-academy");
  for (const relative of ["src/academy-rsi.mjs", "src/exercise-rmn-residue-profile.mjs", "content/evm/accounts/eip155-31337.json"]) { const target = join(academy, relative); mkdirSync(dirname(target), { recursive: true }); cpSync(join(SOURCE, relative), target); }
  return { academy };
}

// The typed-circuit provider still requires a live contracted-agent task and
// coordination source. This fixture remains skipped until that external
// receiver is present; Academy custody is independently exercised elsewhere.
const SKIP_REASON = "typed-circuit-residue-assay's contracted-agent test-provider requires a live on-chain task/coordination source by upstream design (serve-contracted-agent.mjs: 'this process deliberately has no R2 state fallback'); tonight's storage law is disk-backed, credential-free, and forbids live EVM/anvil";

let provider;
test.before(async () => {
  try {
    provider = await startTypedCircuitResidueAssayProcess();
  } catch { provider = null; }
});
test.after(async () => {
  await provider?.close();
});

test("Academy RSI records intrinsic hierarchical circuit-trace assay evidence into local WitnessJournal", { skip: SKIP_REASON }, async () => {
  const { academy } = fixture();
  const cycle = await runAcademyRsiCycle({ root: academy, providerRoot: PROVIDER, agentUrl: provider.agentCardUrl, instant: "2099-07-19T12:00:00.000Z" });
  assert.equal(cycle.assay.profile, "org.emsenn.rmn.hierarchical-circuit-trace.v6");
  assert.deepEqual(cycle.assay.vectors.map(({ disposition }) => disposition), ["accepted", "accepted", "accepted", "refused"]);
  assert.equal("examination" in cycle, false);
  assert.equal(cycle.centralAuthorityUsed, false);
  assert.deepEqual(verifyAcademyRsi(academy), { ok: true, profile: "org.emsenn.rmn.hierarchical-circuit-trace.v6", witnessJournalFiles: 2, centralAuthorityUsed: false });
});

test("Academy RSI requires recorded hierarchical-trace evidence", () => {
  const { academy } = fixture();
  assert.throws(() => verifyAcademyRsi(academy), /absent/u);
});
