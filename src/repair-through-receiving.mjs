const bool = (value) => value === true;

export function nextRepairAction(state) {
  if (bool(state.received)) return 'CLOSED_RECEIVED';
  if (bool(state.deployed) && !bool(state.received)) return 'VERIFY_RECEIVER_READBACK';
  if (bool(state.merged) && bool(state.deployRequired) && !bool(state.deployed)) return 'DEPLOY';
  if (bool(state.merged) && !bool(state.deployRequired)) return 'VERIFY_RECEIVER_READBACK';
  if (bool(state.prOpen) && bool(state.mergeable) && !bool(state.merged)) return 'MERGE_PR';
  if (bool(state.prOpen) && !bool(state.mergeable)) return 'REPAIR_PR_TO_MERGEABLE';
  if (bool(state.tested) && !bool(state.prOpen)) return 'OPEN_OR_UPDATE_PR';
  if (bool(state.patched) && !bool(state.tested)) return 'TEST_PATCH';
  if (bool(state.sourceWritable) && !bool(state.patched)) return 'PATCH_SOURCE';
  if (!bool(state.sourceWritable) && bool(state.actuatorRepairable)) return 'REPAIR_WRITE_ACTUATOR';
  if (!bool(state.sourceWritable)) return 'BIND_BLOCKER_WAKE_AND_KEEP_EFFECT_CUSTODY';
  return 'REPRODUCE_AND_BIND_OWNER';
}

export function isRepairClosed(state) {
  return bool(state.received);
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
