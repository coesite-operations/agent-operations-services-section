import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCapabilitySupply } from '../src/capability-supply-receiving.mjs';

test('source is not deployment', () => {
  assert.equal(classifyCapabilitySupply({
    sourceImplemented: true,
    sourceVerified: true
  }), 'SOURCE_SUPPLIED_AWAITING_DEPLOYMENT');
});

test('deployment is not readback', () => {
  assert.equal(classifyCapabilitySupply({
    sourceImplemented: true,
    sourceVerified: true,
    deployed: true
  }), 'DEPLOYED_AWAITING_EFFECT_PROBE');
});

test('readback is not downstream acceptance', () => {
  assert.equal(classifyCapabilitySupply({
    sourceImplemented: true,
    sourceVerified: true,
    deployed: true,
    canonicalEffectObserved: true,
    canonicalReadback: true
  }), 'CANONICAL_READBACK_AWAITING_DOWNSTREAM_ACCEPTANCE');
});

const acceptedSupply = {
  sourceImplemented: true, sourceVerified: true, deployed: true,
  canonicalEffectObserved: true, canonicalReadback: true, downstreamAccepted: true,
  demandId: 'demand:1', demandingActor: 'office:buyer',
  workRef: 'work:1', capabilityId: 'provider.write',
  supplyReceiptId: 'receipt:1', suppliedSurfaceId: 'surface:2',
  sourceRevision: 'sha:rev2', supplierActorId: 'actor:engineer',
  acceptedBy: 'office:buyer',
  acceptanceWitness: {
    kind: 'CAPABILITY_CONSUMER_READBACK', verdict: 'MET',
    demandId: 'demand:1', workRef: 'work:1', capabilityId: 'provider.write',
    supplyReceiptId: 'receipt:1', suppliedSurfaceId: 'surface:2',
    sourceRevision: 'sha:rev2', acceptedBy: 'office:buyer',
    receiverActorId: 'actor:independent-customer',
    witnessId: 'provider:witness:1', providerReadbackRef: 'provider:confirmed:1',
    observedAt: '2026-10-10T20:00:00Z'
  }
};

test('full sequence closes only on exact independent provider readback', () => {
  assert.equal(classifyCapabilitySupply(acceptedSupply), 'CAPABILITY_SUPPLY_ACCEPTED');
});

test('all stage booleans and handoff text without a receiving witness cannot close', () => {
  assert.throws(() => classifyCapabilitySupply({
    ...acceptedSupply, acceptanceWitness: undefined,
    handoff: 'engineering asked operations'
  }), /independent provider witness/);
  assert.throws(() => classifyCapabilitySupply({
    ...acceptedSupply, acceptanceWitness: {...acceptedSupply.acceptanceWitness,
      receiverActorId:acceptedSupply.supplierActorId}
  }), /independent provider witness/);
  assert.throws(() => classifyCapabilitySupply({
    ...acceptedSupply, acceptanceWitness: {...acceptedSupply.acceptanceWitness,
      providerReadbackRef:''}
  }), /independent provider witness/);
  assert.equal(classifyCapabilitySupply({...acceptedSupply, downstreamAccepted:false}),
    'CANONICAL_READBACK_AWAITING_DOWNSTREAM_ACCEPTANCE');
});
