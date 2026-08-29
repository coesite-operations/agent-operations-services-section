import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { preflight } from "../scripts/bare-cedar-fog-preflight.mjs";

const serviceRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const installerPath = join(serviceRoot, "content", "deployments", "bare-cedar-fog", "install-and-verify.sh");

function findRepositoryRoot(from) {
  let directory = from;
  while (!existsSync(join(directory, "lib", "emsenn"))) directory = dirname(directory);
  return directory;
}

function fixtureDeployment() {
  const home = mkdtempSync(join(tmpdir(), "bare-cedar-fog-schedule-preflight-"));
  const bin = join(home, ".local", "bin");
  mkdirSync(bin, { recursive: true });
  symlinkSync(process.execPath, join(bin, "node"));
  chmodSync(bin, 0o755);
  const repoRoot = findRepositoryRoot(serviceRoot);
  symlinkSync(repoRoot, join(home, "info"), "dir");
  return { home, serviceRoot: join(home, "info", relative(repoRoot, serviceRoot)) };
}

test("structural preflight admits the repository carrier but never activation", () => {
  const fixture = fixtureDeployment();
  try {
    const result = preflight({ serviceRoot: fixture.serviceRoot, home: fixture.home, structuralOnly: true });
    assert.equal(result.ready, true);
    assert.equal(result.activationReady, false);
    assert.deepEqual(result.acceptedSchedules, []);
    assert.match(result.activationProblems[0], /does not establish accepted schedule authority/u);
  } finally { rmSync(fixture.home, { recursive: true, force: true }); }
});

test("full preflight refuses timer activation without an accepted active live schedule", () => {
  const fixture = fixtureDeployment();
  try {
    const result = preflight({ serviceRoot: fixture.serviceRoot, home: fixture.home, inspectSchedules: () => [] });
    assert.equal(result.ready, true);
    assert.equal(result.activationReady, false);
    assert.match(result.activationProblems[0], /no accepted active live schedule/u);
  } finally { rmSync(fixture.home, { recursive: true, force: true }); }
});

test("the normal preflight command exits nonzero when activation is refused", () => {
  const result = spawnSync(process.execPath, [join(serviceRoot, "scripts", "bare-cedar-fog-preflight.mjs"), "--service-root", serviceRoot], { encoding: "utf8" });
  assert.equal(result.status, 2, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ready, true);
  assert.equal(report.activationReady, false);
});

test("full preflight admits only a live schedule bound to its current target closure", () => {
  const fixture = fixtureDeployment();
  const target = { packageRoot: "/srv/target", actor: "urn:actor", operation: "observe", contract: "urn:contract" };
  const binding = { packageDigest: "package", selectedBinDigest: "bin", runtimeClosureDigest: "closure" };
  try {
    const result = preflight({
      serviceRoot: fixture.serviceRoot,
      home: fixture.home,
      inspectSchedules: () => [{ scheduleId: "schedule-1", executionMode: "live", target, targetBinding: binding }],
      inspectTargetRuntime: () => binding,
    });
    assert.equal(result.ready, true);
    assert.equal(result.activationReady, true);
    assert.equal(result.acceptedLiveSchedules.length, 1);
    assert.deepEqual(result.staleTargetSchedules, []);
  } finally { rmSync(fixture.home, { recursive: true, force: true }); }
});

test("the Bare Cedar Fog installer cannot enable or start the timer", () => {
  const installer = readFileSync(installerPath, "utf8");
  assert.match(installer, /bare-cedar-fog-preflight\.mjs/u);
  assert.match(installer, /systemd-analyze verify/u);
  assert.match(installer, /is-enabled --quiet/u);
  assert.match(installer, /is-active --quiet/u);
  assert.match(installer, /show-environment/u);
  assert.doesNotMatch(installer, /systemctl\s+--user\s+(?:enable|start)/u);
});

test("the staged Bare Cedar Fog installer loads exact fragments without activation", () => {
  const fixture = fixtureDeployment();
  const commandRoot = join(fixture.home, "commands");
  const commandLog = join(fixture.home, "systemctl.log");
  mkdirSync(commandRoot);
  writeFileSync(join(commandRoot, "systemctl"), `#!/bin/sh\nprintf '%s\\n' "$*" >> '${commandLog}'\ncase "$2" in is-enabled) exit 1 ;; is-active) exit 3 ;; *) exit 0 ;; esac\n`, { mode: 0o755 });
  writeFileSync(join(commandRoot, "systemd-analyze"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  try {
    const result = spawnSync("sh", [installerPath, "--staged"], {
      cwd: serviceRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: fixture.home,
        XDG_CONFIG_HOME: join(fixture.home, "config"),
        PATH: `${commandRoot}:${process.env.PATH}`,
        SCHEDULED_ACTIVITY_DELIVERY_SERVICE_ROOT: fixture.serviceRoot,
      },
    });
    assert.equal(result.status, 0, result.stderr);
    const installedRoot = join(fixture.home, "config", "systemd", "user");
    assert.ok(existsSync(join(installedRoot, "scheduled-activity-delivery-run-due.service")));
    assert.ok(existsSync(join(installedRoot, "scheduled-activity-delivery-run-due.timer")));
    const commands = readFileSync(commandLog, "utf8");
    assert.match(commands, /show-environment/u);
    assert.match(commands, /daemon-reload/u);
    assert.doesNotMatch(commands, /(?:^|\s)(?:enable|start)(?:\s|$)/u);
  } finally { rmSync(fixture.home, { recursive: true, force: true }); }
});
