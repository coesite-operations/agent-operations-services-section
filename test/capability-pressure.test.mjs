import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCapabilitySurface, surfaceDiagnosis, makeCapabilityDemand, receiveCapabilitySupply } from '../src/capability-pressure.mjs';

test('connector gap does not imply provider absence', () => {
  const surface = makeCapabilitySurface({
    surfaceId: 'fastmail:chatgpt-web:email.draft.update',
    capabilityId: 'email.draft.update',
    provider: 'fastmail',
    connector: 'chatgpt-web-fastmail',
    providerSupport: 'UNKNOWN',
    implementationSupport: 'UNKNOWN',
    connectorExposure: 'REFUTED',
    principalPermission: 'UNKNOWN',
    harnessCallability: 'REFUTED',
    health: 'UNSUPPORTED',
    evidenceAt: '2026-10-05T22:45:00-05:00'
  });
  const diagnosis = surfaceDiagnosis(surface);
  assert.equal(diagnosis.connectorGap, true);
  assert.equal(diagnosis.providerAbsent, false);
  assert.equal(diagnosis.standing, 'CONNECTOR_SURFACE_GAP');
});

test('capability demand remains with the consumer until downstream acceptance', () => {
  const demand = makeCapabilityDemand({
    demandId: 'cap-demand:fastmail:draft-update:1',
    demandingActor: 'urn:561:office:cfo',
    workRef: 'work:reply-draft:42',
    blockedEffect: 'revise the existing provider draft without replacing its identity',
    capabilityId: 'email.draft.update',
    currentSurfaceId: 'fastmail:chatgpt-web:email.draft.update',
    impact: 'recurring executive correspondence friction',
    frequency: 'weekly',
    suppliers: { science: 'lenticule:fastmail', engineering: 'red-cup:fastmail', operations: 'coesite:fastmail' },
    acceptanceTest: 'same draft identity is updated and read back with revised body'
  });

  const supplied = receiveCapabilitySupply(demand, {
    demandId: demand.demandId,
    capabilityId: demand.capabilityId,
    supplyReceiptId: 'receipt:adapter:1',
    suppliedSurfaceId: 'fastmail:red-cup-adapter:email.draft.update',
    downstreamAccepted: false
  });
  assert.equal(supplied.state, 'SUPPLIED_AWAITING_DOWNSTREAM_ACCEPTANCE');
  assert.equal(supplied.effectCustodian, 'urn:561:office:cfo');

  const accepted = receiveCapabilitySupply(demand, {
    demandId: demand.demandId,
    capabilityId: demand.capabilityId,
    supplyReceiptId: 'receipt:adapter:2',
    suppliedSurfaceId: 'fastmail:red-cup-adapter:email.draft.update',
    downstreamAccepted: true,
    acceptedBy: demand.demandingActor
  });
  assert.equal(accepted.state, 'ACCEPTED');
});

test('upstream provider cannot self-accept downstream demand', () => {
  const demand = makeCapabilityDemand({
    demandId: 'cap-demand:1',
    demandingActor: 'urn:561:office:publishing',
    workRef: 'work:1',
    blockedEffect: 'publish',
    capabilityId: 'provider.publish',
    currentSurfaceId: 'surface:1',
    impact: 'release blocked',
    frequency: 'recurring',
    acceptanceTest: 'publisher reads back live effect'
  });
  assert.throws(() => receiveCapabilitySupply(demand, {
    demandId: demand.demandId,
    capabilityId: demand.capabilityId,
    supplyReceiptId: 'receipt:1',
    suppliedSurfaceId: 'surface:2',
    downstreamAccepted: true,
    acceptedBy: 'urn:561:office:engineering'
  }), /only the demanding downstream actor/);
});

test('XOOMAR exact funding history is a connector-surface gap, not provider absence', () => {
  const surface = makeCapabilitySurface({
    surfaceId: 'xoomar:chatgpt-web:market.crypto.funding.crossvenue.history.exact',
    capabilityId: 'market.crypto.funding.crossvenue.history.exact',
    provider: 'XOOMAR',
    implementation: 'public JSON API + hosted MCP',
    connector: 'chatgpt-web-current-surface',
    providerSupport: 'HELD',
    implementationSupport: 'HELD',
    connectorExposure: 'REFUTED',
    principalPermission: 'HELD',
    harnessCallability: 'REFUTED',
    providerEffect: 'UNKNOWN',
    readback: 'UNKNOWN',
    health: 'UNSUPPORTED',
    evidenceAt: '2026-10-06T05:36:00Z',
    evidenceRefs: [
      'https://xoomar.com/markets/api/funding-rates',
      'public API exposes /api/markets/funding-rates/{slug}?history=30d|1y|all',
      'current ChatGPT-Web surface lacks a structured XOOMAR funding-history action'
    ]
  });

  const diagnosis = surfaceDiagnosis(surface);
  assert.equal(diagnosis.connectorGap, true);
  assert.equal(diagnosis.providerAbsent, false);
  assert.equal(diagnosis.executable, false);
  assert.equal(diagnosis.standing, 'CONNECTOR_SURFACE_GAP');
});

test('Finance Science exact funding-history demand retains effect custody', () => {
  const actor = 'urn:561:office:lenticule-science:finance-science';
  const demand = makeCapabilityDemand({
    demandId: 'cap-demand:finance-science:xoomar-funding-history:v1',
    demandingActor: actor,
    workRef: 'finance-science:funding-settlement-replay:sol-uni-whale',
    blockedEffect: 'replay exact settled cross-venue funding paths for SOL, UNI and BTC-whale experiments',
    capabilityId: 'market.crypto.funding.crossvenue.history.exact',
    currentSurfaceId: 'xoomar:chatgpt-web:market.crypto.funding.crossvenue.history.exact',
    impact: 'path-level falsification and activation-state replay are weaker when only current-page snapshots are callable',
    frequency: 'hourly while funding experiments are active',
    suppliers: {
      science: 'urn:561:office:lenticule-science',
      engineering: 'urn:561:office:red-cup-engineering',
      operations: 'urn:561:office:coesite-operations'
    },
    acceptanceTest: 'retrieve settled venue histories with timestamps and fundingRate8h, replay experiment state, and read back the same result from canonical Semioverse'
  });

  assert.equal(demand.state, 'OPEN');
  assert.equal(demand.effectCustodian, actor);
  assert.equal(demand.capabilityId, 'market.crypto.funding.crossvenue.history.exact');
});
