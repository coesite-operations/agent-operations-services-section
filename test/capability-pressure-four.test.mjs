import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceDiagnosis } from '../src/capability-pressure.mjs';

const base = {
  surfaceId: 'surface:gap',
  capabilityId: 'capability:test',
  provider: 'provider',
  implementationSupport: 'HELD',
  connectorExposure: 'REFUTED',
  principalPermission: 'HELD',
  harnessCallability: 'HELD',
  providerEffect: 'UNKNOWN',
  readback: 'UNKNOWN',
  health: 'DEGRADED',
  evidenceAt: '2026-10-06T04:00:00Z'
};

test('unknown provider support leaves exact connector gap unknown', () => {
  const d = surfaceDiagnosis({ ...base, providerSupport: 'UNKNOWN' });
  assert.equal(d.connectorGap, true);
  assert.equal(d.connectorGapStanding, 'UNKNOWN');
});

test('confirmed and contested connector gaps stay distinct', () => {
  assert.equal(surfaceDiagnosis({ ...base, providerSupport: 'HELD' }).connectorGapStanding, 'HELD');
  assert.equal(surfaceDiagnosis({ ...base, providerSupport: 'CONTESTED' }).connectorGapStanding, 'CONTESTED');
  assert.equal(surfaceDiagnosis({ ...base, providerSupport: 'REFUTED' }).connectorGapStanding, 'REFUTED');
});

test('executable standing preserves unknown callability', () => {
  const d = surfaceDiagnosis({
    ...base,
    connectorExposure: 'HELD',
    providerSupport: 'HELD',
    harnessCallability: 'UNKNOWN',
    providerEffect: 'HELD',
    readback: 'HELD'
  });
  assert.equal(d.executable, false);
  assert.equal(d.executableStanding, 'UNKNOWN');
  assert.equal(d.receivedStanding, 'UNKNOWN');
});
