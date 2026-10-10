const bool = (value) => value === true;
const nonblank = (value) => typeof value === 'string' && value.trim().length > 0;

/** A source receipt is bound to the exact PR revision and a distinct receiver. */
function independentlyReceivedSource(state) {
  const receipt = state.sourceReceipt;
  return typeof state.headSha === 'string' && state.headSha.length > 0 &&
    receipt?.verdict === 'MET' && receipt.revision === state.headSha &&
    typeof receipt.producer === 'string' && receipt.producer.length > 0 &&
    typeof receipt.acceptedBy === 'string' && receipt.acceptedBy.length > 0 &&
    typeof receipt.producerActorId === 'string' && receipt.producerActorId.length > 0 &&
    typeof receipt.receiverActorId === 'string' && receipt.receiverActorId.length > 0 &&
    receipt.producer !== receipt.acceptedBy && receipt.producerActorId !== receipt.receiverActorId;
}

/** A provider/consumer receipt must name the actual version and same causal work. */
function witnessedEffect(state, field, kind, principal) {
  const receipt = state[field];
  if (kind === 'CONSUMER_READBACK' && (
    !nonblank(state.producerActorId) ||
    !nonblank(receipt?.receiverActorId) ||
    receipt.receiverActorId === state.producerActorId
  )) return false;
  const revision = nonblank(state.mergedRevision) ? state.mergedRevision :
    (!bool(state.deployRequired) && nonblank(state.effectRevision) ? state.effectRevision : undefined);
  return nonblank(state.workRef) && nonblank(revision) &&
    receipt?.kind === kind && receipt.verdict === 'MET' &&
    receipt.workRef === state.workRef && receipt.sourceRevision === revision &&
    nonblank(receipt[principal]) && nonblank(receipt.witnessId);
}


/** Distinguish an actual ChatGPT host refusal from provider and schema failures.
 * No error *wording* alone proves an authorization decision. An observed
 * provider response proves the attempt crossed dispatch, even if an older
 * refusal was also attached to its work item. Missing evidence is UNKNOWN.
 */
export function diagnoseToolFailure(attempt = {}) {
  const providerReached = attempt.providerReached === true;
  const hostRejected = attempt.dispatchObserved === false && attempt.code === 'CHATGPT_HARNESS_POLICY_BLOCK';
  if (providerReached && hostRejected) return Object.freeze({
    layer: 'CONTRADICTORY_EVIDENCE', next: 'RECONCILE_ACTION_PROVENANCE'
  });
  if (providerReached) {
    const code = Number(attempt.providerStatus);
    if (attempt.readbackMismatch === true) return Object.freeze({
      layer: 'PROVIDER_READBACK', next: 'RECONCILE_PROVIDER_EFFECT'
    });
    if ([301, 302, 307, 308].includes(code)) return Object.freeze({
      layer: 'PROVIDER_REDIRECT', next: 'RESOLVE_CANONICAL_REPOSITORY_ID'
    });
    if ([401, 403].includes(code)) return Object.freeze({
      layer: 'PROVIDER_AUTHORIZATION', next: 'RECHECK_EXACT_PRINCIPAL_AND_REPOSITORY_SCOPE'
    });
    if ([400, 404, 409, 422].includes(code)) return Object.freeze({
      layer: 'PROVIDER_VALIDATION', next: 'REPAIR_PROVIDER_REQUEST_OR_STATE'
    });
    if (code >= 500 && code <= 599) return Object.freeze({
      layer: 'PROVIDER_RUNTIME', next: 'REPAIR_PROVIDER_RUNTIME'
    });
    return Object.freeze({layer: 'PROVIDER_OBSERVED', next: 'VERIFY_PROVIDER_EFFECT'});
  }
  if (hostRejected) return Object.freeze({
    layer: 'HOST_PREDISPATCH_POLICY', next: 'KEEP_REFUSAL_AND_RESUME_OTHER_AUTHORIZED_WORK'
  });
  if (attempt.dispatchObserved === false && attempt.code === 'CLIENT_ARGUMENT_VALIDATION') return Object.freeze({
    layer: 'CLIENT_ARGUMENTS', next: 'REPAIR_TOOL_SCHEMA_ARGUMENTS'
  });
  if (attempt.connectorExposed === false) return Object.freeze({
    layer: 'CONNECTOR_SURFACE', next: 'REPAIR_OR_CONNECT_SUPPORTED_SURFACE'
  });
  return Object.freeze({layer: 'UNKNOWN', next: 'OBTAIN_FAILURE_LAYER_EVIDENCE'});
}

export function nextRepairAction(state) {
  // Neither a merge nor a self-reported deployed/received flag is a live-service witness.
  if (bool(state.deployRequired)) {
    if ((bool(state.deployed) || bool(state.received)) && !bool(state.merged)) return 'RECONCILE_SOURCE_REVISION';
    if (bool(state.merged) && !bool(state.deployed)) return 'DEPLOY';
    if (bool(state.merged) && !witnessedEffect(state, 'deploymentReceipt', 'DEPLOYMENT_WITNESS', 'provider')) return 'VERIFY_DEPLOYMENT_WITNESS';
    if (bool(state.merged) && !witnessedEffect(state, 'consumerReceipt', 'CONSUMER_READBACK', 'receiver')) return 'VERIFY_RECEIVER_READBACK';
    if (bool(state.merged) && bool(state.received)) return 'CLOSED_RECEIVED';
    if (bool(state.merged)) return 'VERIFY_RECEIVER_READBACK';
  }
  if (bool(state.received)) return witnessedEffect(state, 'consumerReceipt', 'CONSUMER_READBACK', 'receiver')
    ? 'CLOSED_RECEIVED' : 'VERIFY_RECEIVER_READBACK';
  // Actual provider-observed progress outranks a stale earlier harness refusal.
  // No need to retry an already merged write or repair its superseded actuator.
  if (bool(state.deployed)) return 'VERIFY_RECEIVER_READBACK';
  if (bool(state.merged) && bool(state.deployRequired)) return 'DEPLOY';
  if (bool(state.merged)) return 'VERIFY_RECEIVER_READBACK';
  // Diagnose the LATEST real attempt, not a long-lived 'policy prevented it'
  // banner or a guessed provider error. Provider evidence outranks stale labels.
  // A repaired/accepted later effect can supersede an old denied attempt.
  const observed = state.lastAttemptSuperseded ? null :
    (state.lastAttempt === undefined ? null : diagnoseToolFailure(state.lastAttempt));
  if (observed && observed.layer !== 'UNKNOWN') {
    if (observed.layer === 'CONTRADICTORY_EVIDENCE') return observed.next;
    if (observed.layer === 'HOST_PREDISPATCH_POLICY') {
      if (bool(state.changedEvidence) && bool(state.normalRetryAvailable)) return 'RETRY_NORMAL_SUPPORTED_ACTION';
      if (bool(state.actuatorRepairable)) return 'REPAIR_WRITE_ACTUATOR';
      if (bool(state.independentWorkReady)) return 'CONTINUE_INDEPENDENT_WORK';
      return 'BIND_BLOCKER_WAKE_AND_KEEP_EFFECT_CUSTODY';
    }
    return observed.next;
  }
  if (observed?.layer === 'UNKNOWN') return 'OBTAIN_FAILURE_LAYER_EVIDENCE';
  // Legacy boolean observations remain supported but never mean permanent
  // permission revocation or authority to route around a host safety refusal.
  if (bool(state.harnessBlocked)) {
    if (bool(state.changedEvidence) && bool(state.normalRetryAvailable)) return 'RETRY_NORMAL_SUPPORTED_ACTION';
    if (bool(state.actuatorRepairable)) return 'REPAIR_WRITE_ACTUATOR';
    if (bool(state.independentWorkReady)) return 'CONTINUE_INDEPENDENT_WORK';
    return 'BIND_BLOCKER_WAKE_AND_KEEP_EFFECT_CUSTODY';
  }
  if (bool(state.prOpen) && bool(state.mergeable) && !bool(state.merged)) {
    if (!bool(state.tested)) return 'VERIFY_PR_TESTS';
    if (!independentlyReceivedSource(state)) return 'OBTAIN_INDEPENDENT_SOURCE_RECEIVING';
    return 'MERGE_PR';
  }
  if (bool(state.prOpen) && !bool(state.mergeable)) return 'REPAIR_PR_TO_MERGEABLE';
  if (bool(state.tested) && !bool(state.prOpen)) return 'OPEN_OR_UPDATE_PR';
  if (bool(state.patched) && !bool(state.tested)) return 'TEST_PATCH';
  if (bool(state.sourceWritable) && !bool(state.patched)) return 'PATCH_SOURCE';
  if (!bool(state.sourceWritable) && bool(state.actuatorRepairable)) return 'REPAIR_WRITE_ACTUATOR';
  if (!bool(state.sourceWritable)) return 'BIND_BLOCKER_WAKE_AND_KEEP_EFFECT_CUSTODY';
  return 'REPRODUCE_AND_BIND_OWNER';
}

export function isRepairClosed(state) {
  return nextRepairAction(state) === 'CLOSED_RECEIVED';
}

export function coordinationOnly(state) {
  return bool(state.issueOpen) && !bool(state.patched) && !bool(state.merged) && !bool(state.received);
}

export function assertNoIssueOnlyClosure(state) {
  if (coordinationOnly(state) && (state.status === 'CLOSED' || state.status === 'DONE')) {
    throw new Error('issue-only coordination cannot close a repair obligation');
  }
  return state;
}
