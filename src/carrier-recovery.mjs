const yes = (value) => value === true;

// These are recommendations for one action, never grants of authority. The caller
// supplies classified evidence for that action, not a prior action's failure.
function failureNext(outcome) {
  if (outcome?.state === 'DENIED') return 'HOLD_DENIED_EFFECT';
  if (outcome?.state === 'CANCELLED') return 'HOLD_CANCELLED_EFFECT';
  if (yes(outcome?.providerEffectObserved) && yes(outcome?.providerEffectAbsent)) return 'OBTAIN_EFFECT_EVIDENCE';
  if (yes(outcome?.providerEffectObserved)) return 'VERIFY_RECEIVER_READBACK';
  if (!yes(outcome?.providerEffectAbsent)) return 'OBTAIN_EFFECT_EVIDENCE';
  switch (outcome.state) {
    case 'SERVICE_UNAVAILABLE': return null;
    case 'METHOD_UNAVAILABLE': return 'RECOVER_NATIVE_METHOD';
    case 'INVALID_INPUT': return 'REPAIR_OPERATION_INPUT';
    case 'PROVIDER_REJECTED': return 'REPAIR_PROVIDER_STATE_OR_INPUT';
    case 'PRE_PROVIDER_BLOCKED': return 'DIAGNOSE_PRE_PROVIDER_BLOCK';
    default: return 'OBTAIN_EFFECT_EVIDENCE';
  }
}

export function nextCarrierRecoveryAction(state) {
  const outcomes = [state.coldRedGateOutcome, state.githubFallbackOutcome, state.postGithubColdRedGateOutcome];
  const stopped = outcomes.find((outcome) => outcome?.state === 'DENIED' || outcome?.state === 'CANCELLED');
  if (stopped) return failureNext(stopped);
  for (const [attempted, succeeded, outcome] of [
    [state.coldRedGateAttempted, state.coldRedGateSucceeded, state.coldRedGateOutcome],
    [state.githubFallbackAttempted, state.githubFallbackSucceeded, state.githubFallbackOutcome],
    [state.postGithubColdRedGateAttempted, state.postGithubColdRedGateSucceeded, state.postGithubColdRedGateOutcome]
  ]) {
    if (!outcome) continue;
    if (yes(outcome.providerEffectObserved) && yes(outcome.providerEffectAbsent)) return 'OBTAIN_EFFECT_EVIDENCE';
    if (!yes(attempted)) return failureNext(outcome) ?? 'OBTAIN_EFFECT_EVIDENCE';
    if (outcome.state === 'UNRESOLVED' || !outcome.state) return 'OBTAIN_EFFECT_EVIDENCE';
    if (yes(succeeded) && outcome && outcome.state !== 'PROVIDER_EFFECT_OBSERVED') return 'OBTAIN_EFFECT_EVIDENCE';
  }
  if (yes(state.canonicalReceived)) {
    const latestOutcome = state.postGithubColdRedGateOutcome ?? state.githubFallbackOutcome ?? state.coldRedGateOutcome;
    if (latestOutcome && latestOutcome.state !== 'PROVIDER_EFFECT_OBSERVED') return failureNext(latestOutcome) ?? 'OBTAIN_EFFECT_EVIDENCE';
    return 'CLOSED_RECEIVED';
  }
  if (!yes(state.coldRedGateAttempted)) return 'ATTEMPT_COLD_RED_GATE';

  if (yes(state.coldRedGateSucceeded)) {
    return yes(state.coldRedGateReadback)
      ? 'CLOSED_RECEIVED'
      : 'VERIFY_COLD_RED_GATE_READBACK';
  }

  const nativeBarrier = failureNext(state.coldRedGateOutcome);
  if (nativeBarrier) return nativeBarrier;

  if (yes(state.connectorRepairable) && !yes(state.connectorRepairAttempted)) {
    return 'REPAIR_COLD_RED_GATE_CONNECTOR';
  }

  if (yes(state.connectorRepairAttempted) && !yes(state.connectorRepairVerified)) {
    return 'VERIFY_CONNECTOR_REPAIR';
  }

  if (!yes(state.githubFallbackAttempted)) return 'GITHUB_FALLBACK';

  // A caller may separately perform a newly admitted native attempt. Successful
  // fallback alone never instructs it to repeat a stopped or unchanged action.
  if (yes(state.postGithubColdRedGateAttempted)) {
    if (yes(state.postGithubColdRedGateSucceeded)) {
      return yes(state.postGithubColdRedGateReadback)
        ? 'CLOSED_RECEIVED'
        : 'VERIFY_COLD_RED_GATE_READBACK';
    }
    const retryBarrier = failureNext(state.postGithubColdRedGateOutcome);
    if (retryBarrier) return retryBarrier;
  }

  if (yes(state.githubFallbackSucceeded)) {
    return 'KEEP_GITHUB_DEGRADED_AND_SYNC_BACK';
  }

  const githubBarrier = failureNext(state.githubFallbackOutcome);
  if (githubBarrier) return githubBarrier;
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

export function classifyMutationOutcome({
  providerEffectObserved = false,
  providerEffectAbsent = false,
  blockedBeforeProvider = false,
  providerRejected = false,
  failureKind = null
} = {}) {
  // Absence needs affirmative evidence. An unobserved effect, missing response,
  // unknown error or absent field cannot establish that nothing happened.
  const observed = yes(providerEffectObserved);
  const absent = yes(providerEffectAbsent);
  let state = 'UNRESOLVED';
  if (failureKind === 'DENIED' || failureKind === 'CANCELLED') state = failureKind;
  else if (observed && absent) state = 'UNRESOLVED';
  else if (observed) state = yes(providerRejected) ? 'PROVIDER_REJECTED' : 'PROVIDER_EFFECT_OBSERVED';
  else if (absent) {
    if (['SERVICE_UNAVAILABLE', 'METHOD_UNAVAILABLE', 'INVALID_INPUT'].includes(failureKind)) state = failureKind;
    else if (yes(blockedBeforeProvider)) state = 'PRE_PROVIDER_BLOCKED';
    else if (yes(providerRejected)) state = 'PROVIDER_REJECTED';
  }
  const outcome = { state, providerEffectObserved: observed, providerEffectAbsent: absent };
  return {
    ...outcome,
    custody: state === 'PROVIDER_EFFECT_OBSERVED' ? 'RETAIN_UNTIL_READBACK' : 'RETAIN',
    next: failureNext(outcome) ?? 'CHECK_FALLBACK_ADMISSION'
  };
}
