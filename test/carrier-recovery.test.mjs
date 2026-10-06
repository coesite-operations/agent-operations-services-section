import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextCarrierRecoveryAction,
  assertFallbackNeverCanonical,
  assertEffectCustodyContinuity
} from '../src/carrier-recovery.mjs';

test('Cold Red Gate is attempted before fallback', () => {
  assert.equal(nextCarrierRecoveryAction({}), 'ATTEMPT_COLD_RED_GATE');
});

test('successful canonical effect requires readback before closure', () => {
  assert.equal(nextCarrierRecoveryAction({
    coldRedGateAttempted: true,
    coldRedGateSucceeded: true
  }), 'VERIFY_COLD_RED_GATE_READBACK');

  assert.equal(nextCarrierRecoveryAction({
    coldRedGateAttempted: true,
    coldRedGateSucceeded: true,
    coldRedGateReadback: true
  }), 'CLOSED_RECEIVED');
});

test('repairable connector is repaired before GitHub fallback', () => {
  assert.equal(nextCarrierRecoveryAction({
    coldRedGateAttempted: true,
    connectorRepairable: true
  }), 'REPAIR_COLD_RED_GATE_CONNECTOR');
});

test('GitHub fallback is immediately followed by another Cold Red Gate attempt', () => {
  assert.equal(nextCarrierRecoveryAction({
    coldRedGateAttempted: true,
    connectorRepairable: false,
    githubFallbackAttempted: true,
    githubFallbackSucceeded: true
  }), 'RETRY_COLD_RED_GATE');
});

test('successful GitHub fallback remains degraded while canonical retry fails', () => {
  assert.equal(nextCarrierRecoveryAction({
    coldRedGateAttempted: true,
    connectorRepairable: false,
    githubFallbackAttempted: true,
    githubFallbackSucceeded: true,
    postGithubColdRedGateAttempted: true,
    postGithubColdRedGateSucceeded: false
  }), 'KEEP_GITHUB_DEGRADED_AND_SYNC_BACK');
});

test('Drive is available only after GitHub failure plus mandatory canonical retry', () => {
  assert.equal(nextCarrierRecoveryAction({
    coldRedGateAttempted: true,
    connectorRepairable: false,
    githubFallbackAttempted: true,
    githubFallbackSucceeded: false,
    postGithubColdRedGateAttempted: true,
    postGithubColdRedGateSucceeded: false,
    driveRequired: true
  }), 'DRIVE_EMERGENCY_STAGE');
});

test('fallback carrier cannot become canonical', () => {
  assert.throws(
    () => assertFallbackNeverCanonical({ canonicalCarrier: 'github' }),
    /fallback carrier cannot become canonical/
  );
  assert.throws(
    () => assertFallbackNeverCanonical({ canonicalCarrier: 'drive' }),
    /fallback carrier cannot become canonical/
  );
  assert.doesNotThrow(
    () => assertFallbackNeverCanonical({ canonicalCarrier: 'semioverse' })
  );
});

test('effect custody record requires stable routing and acceptance fields', () => {
  assert.throws(
    () => assertEffectCustodyContinuity({}),
    /effect-custody record missing workRef/
  );
});

test('custody cannot move before receiver acceptance', () => {
  assert.throws(
    () => assertEffectCustodyContinuity({
      workRef: 'w',
      canonicalReceiver: 'semioverse://receiver',
      actualCarrier: 'github',
      acceptanceTest: 'read back receiver state',
      syncBackState: 'PENDING',
      custodyMoved: true,
      receiverState: 'QUEUED'
    }),
    /custody cannot move before receiver acceptance/
  );
});

test('fallback sync-back cannot complete without canonical readback', () => {
  assert.throws(
    () => assertEffectCustodyContinuity({
      workRef: 'w',
      canonicalReceiver: 'semioverse://receiver',
      actualCarrier: 'github',
      acceptanceTest: 'read back receiver state',
      syncBackState: 'COMPLETE',
      custodyMoved: false,
      receiverState: 'PENDING',
      canonicalReadback: false
    }),
    /fallback sync-back cannot complete without canonical readback/
  );
});

test('accepted custody with canonical readback is valid', () => {
  assert.doesNotThrow(() => assertEffectCustodyContinuity({
    workRef: 'w',
    canonicalReceiver: 'semioverse://receiver',
    actualCarrier: 'github',
    acceptanceTest: 'read back receiver state',
    syncBackState: 'COMPLETE',
    custodyMoved: true,
    receiverState: 'ACCEPTED',
    canonicalReadback: true
  }));
});
