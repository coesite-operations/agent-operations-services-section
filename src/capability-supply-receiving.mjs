import { validateCapabilityAcceptanceWitness } from './capability-pressure.mjs';
export function classifyCapabilitySupply(state = {}) {
  const yes = (value) => value === true;
  if (yes(state.downstreamAccepted) && !yes(state.canonicalReadback)) {
    throw new Error('downstream acceptance cannot precede canonical readback');
  }
  if (yes(state.canonicalReadback) && !yes(state.canonicalEffectObserved)) {
    throw new Error('canonical readback cannot precede canonical effect');
  }
  if (yes(state.canonicalEffectObserved) && !yes(state.deployed)) {
    throw new Error('canonical effect cannot precede deployment');
  }
  if (yes(state.deployed) && !(yes(state.sourceImplemented) && yes(state.sourceVerified))) {
    throw new Error('deployment cannot be accepted without verified source supply');
  }

  if (yes(state.downstreamAccepted)) {
    const evidence = validateCapabilityAcceptanceWitness(state, state);
    if (!evidence.ok) throw new Error('downstream acceptance lacks independent provider witness: ' + evidence.issues.join('; '));
    return 'CAPABILITY_SUPPLY_ACCEPTED';
  }
  if (yes(state.canonicalReadback)) return 'CANONICAL_READBACK_AWAITING_DOWNSTREAM_ACCEPTANCE';
  if (yes(state.canonicalEffectObserved)) return 'EFFECT_OBSERVED_AWAITING_CANONICAL_READBACK';
  if (yes(state.deployed)) return 'DEPLOYED_AWAITING_EFFECT_PROBE';
  if (yes(state.sourceImplemented) && yes(state.sourceVerified)) return 'SOURCE_SUPPLIED_AWAITING_DEPLOYMENT';
  if (yes(state.sourceImplemented)) return 'SOURCE_IMPLEMENTED_AWAITING_VERIFICATION';
  return 'UNSUPPLIED';
}
