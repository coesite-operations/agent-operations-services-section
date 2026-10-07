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

test('full sequence can close', () => {
  assert.equal(classifyCapabilitySupply({
    sourceImplemented: true,
    sourceVerified: true,
    deployed: true,
    canonicalEffectObserved: true,
    canonicalReadback: true,
    downstreamAccepted: true
  }), 'CAPABILITY_SUPPLY_ACCEPTED');
});
