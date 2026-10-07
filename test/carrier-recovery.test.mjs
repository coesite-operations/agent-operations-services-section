import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextCarrierRecoveryAction,
  assertFallbackNeverCanonical,
  assertEffectCustodyContinuity,
  classifyMutationOutcome
} from '../src/carrier-recovery.mjs';

const unavailable = () => classifyMutationOutcome({
  failureKind: 'SERVICE_UNAVAILABLE',
  providerEffectAbsent: true
});

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
    coldRedGateOutcome: unavailable(),
    connectorRepairable: true
  }), 'REPAIR_COLD_RED_GATE_CONNECTOR');
});

test('successful GitHub fallback does not demand an unchanged native retry', () => {
  assert.equal(nextCarrierRecoveryAction({
    coldRedGateAttempted: true,
    coldRedGateOutcome: unavailable(),
    connectorRepairable: false,
    githubFallbackAttempted: true,
    githubFallbackSucceeded: true
  }), 'KEEP_GITHUB_DEGRADED_AND_SYNC_BACK');
});

test('successful GitHub fallback remains degraded while canonical retry fails', () => {
  assert.equal(nextCarrierRecoveryAction({
    coldRedGateAttempted: true,
    coldRedGateOutcome: unavailable(),
    connectorRepairable: false,
    githubFallbackAttempted: true,
    githubFallbackSucceeded: true,
    postGithubColdRedGateAttempted: true,
    postGithubColdRedGateOutcome: unavailable(),
    postGithubColdRedGateSucceeded: false
  }), 'KEEP_GITHUB_DEGRADED_AND_SYNC_BACK');
});

test('Drive recommendation requires evidenced ordinary failure of both carriers', () => {
  assert.equal(nextCarrierRecoveryAction({
    coldRedGateAttempted: true,
    coldRedGateOutcome: unavailable(),
    connectorRepairable: false,
    githubFallbackAttempted: true,
    githubFallbackSucceeded: false,
    githubFallbackOutcome: unavailable(),
    driveRequired: true
  }), 'DRIVE_EMERGENCY_STAGE');
});

test('an attempt or an unobserved effect alone cannot justify fallback', () => {
  for (const coldRedGateOutcome of [undefined, {}, classifyMutationOutcome(), classifyMutationOutcome({
    failureKind: 'SERVICE_UNAVAILABLE', providerEffectObserved: false
  }), classifyMutationOutcome({
    failureKind: 'SERVICE_UNAVAILABLE', providerEffectAbsent: 'true'
  })]) {
    assert.equal(nextCarrierRecoveryAction({ coldRedGateAttempted: true, coldRedGateOutcome }), 'OBTAIN_EFFECT_EVIDENCE');
  }
  assert.equal(nextCarrierRecoveryAction({ coldRedGateAttempted: true, coldRedGateOutcome: unavailable() }), 'GITHUB_FALLBACK');
});

test('failure classes retain their distinct recovery or stop', () => {
  for (const [failureKind, expected] of [
    ['DENIED', 'HOLD_DENIED_EFFECT'],
    ['CANCELLED', 'HOLD_CANCELLED_EFFECT'],
    ['METHOD_UNAVAILABLE', 'RECOVER_NATIVE_METHOD'],
    ['INVALID_INPUT', 'REPAIR_OPERATION_INPUT']
  ]) {
    const outcome = classifyMutationOutcome({ failureKind, providerEffectAbsent: true });
    assert.equal(outcome.state, failureKind);
    assert.equal(outcome.next, expected);
    assert.equal(nextCarrierRecoveryAction({ coldRedGateAttempted: true, coldRedGateOutcome: outcome, connectorRepairable: true }), expected);
  }
  assert.equal(classifyMutationOutcome({ blockedBeforeProvider: true, providerEffectAbsent: true }).next, 'DIAGNOSE_PRE_PROVIDER_BLOCK');
});

test('unknown, observed and contradictory mutation effects require evidence or readback', () => {
  assert.equal(classifyMutationOutcome({ failureKind: 'METHOD_UNAVAILABLE' }).next, 'OBTAIN_EFFECT_EVIDENCE');
  assert.equal(classifyMutationOutcome({ providerEffectObserved: true }).next, 'VERIFY_RECEIVER_READBACK');
  assert.equal(classifyMutationOutcome({ providerEffectObserved: true, providerRejected: true }).next, 'VERIFY_RECEIVER_READBACK');
  assert.equal(classifyMutationOutcome({ providerEffectObserved: true, providerEffectAbsent: true }).next, 'OBTAIN_EFFECT_EVIDENCE');
  for (const failureKind of ['DENIED', 'CANCELLED']) {
    assert.equal(classifyMutationOutcome({ failureKind }).state, failureKind);
  }
});

test('GitHub denial, cancellation or uncertain effect cannot become Drive fallback', () => {
  for (const failureKind of ['DENIED', 'CANCELLED', 'METHOD_UNAVAILABLE', 'INVALID_INPUT', null]) {
    const outcome = classifyMutationOutcome({ failureKind, providerEffectAbsent: true });
    assert.equal(nextCarrierRecoveryAction({
      coldRedGateAttempted: true, coldRedGateOutcome: unavailable(),
      githubFallbackAttempted: true, githubFallbackOutcome: outcome, driveRequired: true
    }), outcome.next);
  }
  assert.equal(nextCarrierRecoveryAction({
    coldRedGateAttempted: true, coldRedGateOutcome: unavailable(),
    githubFallbackAttempted: true, githubFallbackSucceeded: false, driveRequired: true
  }), 'OBTAIN_EFFECT_EVIDENCE');
});

test('a separately attempted native retry is received without erasing its stop', () => {
  const state = {
    coldRedGateAttempted: true, coldRedGateOutcome: unavailable(),
    githubFallbackAttempted: true, githubFallbackSucceeded: true,
    postGithubColdRedGateAttempted: true
  };
  assert.equal(nextCarrierRecoveryAction({ ...state, postGithubColdRedGateOutcome: classifyMutationOutcome({ failureKind: 'CANCELLED' }) }), 'HOLD_CANCELLED_EFFECT');
  assert.equal(nextCarrierRecoveryAction({ ...state, postGithubColdRedGateSucceeded: true }), 'VERIFY_COLD_RED_GATE_READBACK');
  assert.equal(nextCarrierRecoveryAction({ ...state, postGithubColdRedGateSucceeded: true, postGithubColdRedGateReadback: true }), 'CLOSED_RECEIVED');
});

test('success flags cannot override a stop or contradictory classified outcome', () => {
  const denied = classifyMutationOutcome({ failureKind: 'DENIED', providerEffectAbsent: true });
  assert.equal(nextCarrierRecoveryAction({ canonicalReceived: true, coldRedGateOutcome: denied }), 'HOLD_DENIED_EFFECT');
  assert.equal(nextCarrierRecoveryAction({ coldRedGateAttempted: true, coldRedGateSucceeded: true, coldRedGateOutcome: denied }), 'HOLD_DENIED_EFFECT');
  assert.equal(nextCarrierRecoveryAction({ coldRedGateAttempted: true, coldRedGateSucceeded: true, coldRedGateOutcome: unavailable() }), 'OBTAIN_EFFECT_EVIDENCE');
  assert.equal(nextCarrierRecoveryAction({ canonicalReceived: true, coldRedGateAttempted: true, coldRedGateOutcome: classifyMutationOutcome({ providerEffectObserved: true, providerEffectAbsent: true }) }), 'OBTAIN_EFFECT_EVIDENCE');
  assert.equal(nextCarrierRecoveryAction({ canonicalReceived: true, coldRedGateAttempted: true, coldRedGateOutcome: classifyMutationOutcome() }), 'OBTAIN_EFFECT_EVIDENCE');
  assert.equal(nextCarrierRecoveryAction({ canonicalReceived: true, coldRedGateAttempted: true, coldRedGateOutcome: unavailable() }), 'OBTAIN_EFFECT_EVIDENCE');
  assert.equal(nextCarrierRecoveryAction({ canonicalReceived: true, coldRedGateAttempted: true, coldRedGateOutcome: { state: 'UNKNOWN_FUTURE_KIND', providerEffectAbsent: true } }), 'OBTAIN_EFFECT_EVIDENCE');
  assert.equal(nextCarrierRecoveryAction({ canonicalReceived: true, coldRedGateAttempted: true, coldRedGateOutcome: classifyMutationOutcome({ providerEffectObserved: true }) }), 'CLOSED_RECEIVED');
});

test('a supplied current outcome prevents an unqualified first-attempt recommendation', () => {
  for (const coldRedGateAttempted of [undefined, false]) {
    assert.equal(nextCarrierRecoveryAction({ coldRedGateAttempted, coldRedGateOutcome: classifyMutationOutcome({ providerEffectObserved: true }) }), 'VERIFY_RECEIVER_READBACK');
    assert.equal(nextCarrierRecoveryAction({ coldRedGateAttempted, coldRedGateOutcome: classifyMutationOutcome() }), 'OBTAIN_EFFECT_EVIDENCE');
    assert.equal(nextCarrierRecoveryAction({ coldRedGateAttempted, coldRedGateOutcome: unavailable() }), 'OBTAIN_EFFECT_EVIDENCE');
  }
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
