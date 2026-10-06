import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeCapability,
  makeCapabilitySurface,
  surfaceDiagnosis,
  makeCapabilityDemand,
  makeCapabilitySupplyReceipt,
  receiveCapabilitySupply
} from '../src/capability-pressure.mjs';

test('capability carries stable semantic identity separately from tool surfaces', () => {
  const capability = makeCapability({
    capabilityId: 'semioverse.resource.admit',
    effect: 'admit a typed resource into Semioverse',
    evidenceAt: '2026-10-06T04:23:01Z',
    sourceTimestamp: '2026-10-06T04:23:01Z',
    evidenceRefs: ['work:connector-defect:5']
  });
  assert.equal(capability.resourceType, 'Capability');
  assert.equal(capability.capabilityId, 'semioverse.resource.admit');
  assert.equal(capability.sourceTimestamp, capability.evidenceAt);
});

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

test('surface preserves provider connector principal coordinates and source timestamp', () => {
  const surface = makeCapabilitySurface({
    surfaceId: 'cold-red-gate:chatgpt-web:semioverse.session.participate',
    capabilityId: 'semioverse.session.participate',
    provider: '561-group-cold-red-gate',
    implementation: 'metroplat',
    connector: 'chatgpt-web-mcp',
    principal: 'authenticated-account',
    providerObjectId: 'cold-red-gate',
    connectorObjectId: 'metroplat_harness_hook_event_admit',
    providerSupport: 'HELD',
    implementationSupport: 'HELD',
    connectorExposure: 'HELD',
    principalPermission: 'HELD',
    harnessCallability: 'HELD',
    providerEffect: 'HELD',
    readback: 'UNKNOWN',
    health: 'AVAILABLE',
    evidenceAt: '2026-10-06T04:23:01Z',
    sourceTimestamp: '2026-10-06T04:23:01Z'
  });
  assert.equal(surface.principal, 'authenticated-account');
  assert.equal(surface.sourceTimestamp, '2026-10-06T04:23:01Z');
  assert.equal(surfaceDiagnosis(surface).standing, 'CALLABLE_UNRECEIVED');
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
  assert.equal(supplied.receivingState, 'SUPPLIED_PENDING_ACCEPTANCE');
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
  assert.equal(accepted.receivingState, 'RECEIVED');
});

test('typed supply receipt retains provider effect and downstream acceptance evidence', () => {
  const receipt = makeCapabilitySupplyReceipt({
    supplyReceiptId: 'supply:semioverse:mcp-session:1',
    demandId: 'demand:semioverse:session',
    capabilityId: 'semioverse.session.participate',
    suppliedSurfaceId: 'cold-red-gate:chatgpt-web:semioverse.session.participate',
    supplierActor: 'red-cup-engineering',
    providerEffectRef: 'session:chatgpt-web-cio-2026-10-06T04:23:01Z',
    readbackRef: null,
    downstreamAccepted: false,
    evidenceAt: '2026-10-06T04:23:01Z'
  });
  assert.equal(receipt.resourceType, 'CapabilitySupplyReceipt');
  assert.equal(receipt.downstreamAccepted, false);
  assert.equal(receipt.readbackRef, null);
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
