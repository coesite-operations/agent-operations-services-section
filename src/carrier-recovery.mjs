const yes = (value) => value === true;

export function nextCarrierRecoveryAction(state) {
  if (yes(state.canonicalReceived)) return 'CLOSED_RECEIVED';
  if (!yes(state.coldRedGateAttempted)) return 'ATTEMPT_COLD_RED_GATE';

  if (yes(state.coldRedGateSucceeded)) {
    return yes(state.coldRedGateReadback)
      ? 'CLOSED_RECEIVED'
      : 'VERIFY_COLD_RED_GATE_READBACK';
  }

  if (yes(state.connectorRepairable) && !yes(state.connectorRepairAttempted)) {
    return 'REPAIR_COLD_RED_GATE_CONNECTOR';
  }

  if (yes(state.connectorRepairAttempted) && !yes(state.connectorRepairVerified)) {
    return 'VERIFY_CONNECTOR_REPAIR';
  }

  if (!yes(state.githubFallbackAttempted)) return 'GITHUB_FALLBACK';
  if (!yes(state.postGithubColdRedGateAttempted)) return 'RETRY_COLD_RED_GATE';

  if (yes(state.postGithubColdRedGateSucceeded)) {
    return yes(state.postGithubColdRedGateReadback)
      ? 'CLOSED_RECEIVED'
      : 'VERIFY_COLD_RED_GATE_READBACK';
  }

  if (yes(state.githubFallbackSucceeded)) {
    return 'KEEP_GITHUB_DEGRADED_AND_SYNC_BACK';
  }

  if (yes(state.driveRequired)) return 'DRIVE_EMERGENCY_STAGE';
  return 'KEEP_EFFECT_CUSTODY_WITH_BLOCKER_WAKE';
}

export function assertFallbackNeverCanonical(state) {
  if (state.canonicalCarrier === 'github' || state.canonicalCarrier === 'drive') {
    throw new Error('fallback carrier cannot become canonical');
  }
  return state;
}

export function assertEffectCustodyContinuity(record) {
  const required = ['workRef', 'canonicalReceiver', 'actualCarrier', 'acceptanceTest', 'syncBackState'];
  for (const field of required) {
    if (typeof record?.[field] !== 'string' || record[field].trim() === '') {
      throw new Error(`effect-custody record missing ${field}`);
    }
  }

  if (yes(record.custodyMoved) && record.receiverState !== 'ACCEPTED') {
    throw new Error('custody cannot move before receiver acceptance');
  }

  if (
    record.actualCarrier !== 'semioverse' &&
    record.syncBackState === 'COMPLETE' &&
    !yes(record.canonicalReadback)
  ) {
    throw new Error('fallback sync-back cannot complete without canonical readback');
  }

  return record;
}
