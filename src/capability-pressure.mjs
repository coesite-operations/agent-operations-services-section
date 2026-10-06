const REQUIRED = (value, name) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(name + ' is required');
  return value.trim();
};

const OPTIONAL = (value, name) => value == null ? null : REQUIRED(value, name);
const TRI = new Set(['HELD', 'REFUTED', 'UNKNOWN', 'CONTESTED']);
const HEALTH = new Set(['AVAILABLE', 'CONFIRMATION_GATED', 'RESERVED', 'UNSUPPORTED', 'DEGRADED', 'UNKNOWN']);

function tri(value, name) {
  if (!TRI.has(value)) throw new TypeError(name + ' has invalid FOUR standing');
  return value;
}

function evidence(input) {
  const evidenceAt = REQUIRED(input.evidenceAt, 'evidenceAt');
  return {
    evidenceAt,
    sourceTimestamp: OPTIONAL(input.sourceTimestamp, 'sourceTimestamp') ?? evidenceAt,
    evidenceRefs: Array.isArray(input.evidenceRefs) ? [...input.evidenceRefs] : []
  };
}

export function makeCapability(input) {
  return Object.freeze({
    resourceType: 'Capability',
    schemaVersion: input.schemaVersion ?? 'capability.v1',
    capabilityId: REQUIRED(input.capabilityId, 'capabilityId'),
    effect: REQUIRED(input.effect, 'effect'),
    description: OPTIONAL(input.description, 'description'),
    ...evidence(input)
  });
}

export function makeCapabilitySurface(input) {
  const surface = {
    resourceType: 'CapabilitySurface',
    schemaVersion: input.schemaVersion ?? 'capability-surface.v1',
    surfaceId: REQUIRED(input.surfaceId, 'surfaceId'),
    capabilityId: REQUIRED(input.capabilityId, 'capabilityId'),
    provider: REQUIRED(input.provider, 'provider'),
    implementation: OPTIONAL(input.implementation, 'implementation'),
    connector: OPTIONAL(input.connector, 'connector'),
    principal: OPTIONAL(input.principal, 'principal'),
    providerObjectId: OPTIONAL(input.providerObjectId, 'providerObjectId'),
    connectorObjectId: OPTIONAL(input.connectorObjectId, 'connectorObjectId'),
    surfaceRevision: OPTIONAL(input.surfaceRevision, 'surfaceRevision'),
    providerSupport: tri(input.providerSupport ?? 'UNKNOWN', 'providerSupport'),
    implementationSupport: tri(input.implementationSupport ?? 'UNKNOWN', 'implementationSupport'),
    connectorExposure: tri(input.connectorExposure ?? 'UNKNOWN', 'connectorExposure'),
    principalPermission: tri(input.principalPermission ?? 'UNKNOWN', 'principalPermission'),
    harnessCallability: tri(input.harnessCallability ?? 'UNKNOWN', 'harnessCallability'),
    providerEffect: tri(input.providerEffect ?? 'UNKNOWN', 'providerEffect'),
    readback: tri(input.readback ?? 'UNKNOWN', 'readback'),
    health: input.health ?? 'UNKNOWN',
    ...evidence(input)
  };
  if (!HEALTH.has(surface.health)) throw new TypeError('health has invalid standing');
  return Object.freeze(surface);
}

export function surfaceDiagnosis(surface) {
  const s = makeCapabilitySurface(surface);
  const connectorGap = s.providerSupport !== 'REFUTED' && s.connectorExposure === 'REFUTED';
  const executable = [s.providerSupport, s.implementationSupport, s.connectorExposure, s.principalPermission, s.harnessCallability]
    .every((value) => value === 'HELD');
  const received = executable && s.providerEffect === 'HELD' && s.readback === 'HELD';
  return Object.freeze({
    executable,
    received,
    connectorGap,
    providerAbsent: s.providerSupport === 'REFUTED',
    standing: received ? 'RECEIVED' : executable ? 'CALLABLE_UNRECEIVED' : connectorGap ? 'CONNECTOR_SURFACE_GAP' : s.health
  });
}

export function makeCapabilityDemand(input) {
  const suppliers = input.suppliers ?? {};
  return Object.freeze({
    resourceType: 'CapabilityDemand',
    schemaVersion: input.schemaVersion ?? 'capability-demand.v1',
    demandId: REQUIRED(input.demandId, 'demandId'),
    demandingActor: REQUIRED(input.demandingActor, 'demandingActor'),
    workRef: REQUIRED(input.workRef, 'workRef'),
    blockedEffect: REQUIRED(input.blockedEffect, 'blockedEffect'),
    capabilityId: REQUIRED(input.capabilityId, 'capabilityId'),
    currentSurfaceId: REQUIRED(input.currentSurfaceId, 'currentSurfaceId'),
    impact: REQUIRED(input.impact, 'impact'),
    frequency: REQUIRED(input.frequency, 'frequency'),
    acceptableSemantics: OPTIONAL(input.acceptableSemantics, 'acceptableSemantics'),
    scienceQuestion: OPTIONAL(input.scienceQuestion, 'scienceQuestion'),
    engineeringRequirement: OPTIONAL(input.engineeringRequirement, 'engineeringRequirement'),
    operationsRequirement: OPTIONAL(input.operationsRequirement, 'operationsRequirement'),
    scienceProvider: suppliers.science ?? null,
    engineeringProvider: suppliers.engineering ?? null,
    operationsProvider: suppliers.operations ?? null,
    acceptanceTest: REQUIRED(input.acceptanceTest, 'acceptanceTest'),
    intendedReceiver: OPTIONAL(input.intendedReceiver, 'intendedReceiver'),
    receivingState: input.receivingState ?? 'PENDING',
    state: 'OPEN',
    effectCustodian: REQUIRED(input.effectCustodian ?? input.demandingActor, 'effectCustodian'),
    ...(input.evidenceAt ? evidence(input) : { evidenceAt: null, sourceTimestamp: null, evidenceRefs: [] })
  });
}

export function makeCapabilitySupplyReceipt(input) {
  const downstreamAccepted = input.downstreamAccepted === true;
  return Object.freeze({
    resourceType: 'CapabilitySupplyReceipt',
    schemaVersion: input.schemaVersion ?? 'capability-supply-receipt.v1',
    supplyReceiptId: REQUIRED(input.supplyReceiptId, 'supplyReceiptId'),
    demandId: REQUIRED(input.demandId, 'demandId'),
    capabilityId: REQUIRED(input.capabilityId, 'capabilityId'),
    suppliedSurfaceId: REQUIRED(input.suppliedSurfaceId, 'suppliedSurfaceId'),
    supplierActor: REQUIRED(input.supplierActor, 'supplierActor'),
    providerEffectRef: OPTIONAL(input.providerEffectRef, 'providerEffectRef'),
    readbackRef: OPTIONAL(input.readbackRef, 'readbackRef'),
    downstreamAccepted,
    acceptedBy: downstreamAccepted ? REQUIRED(input.acceptedBy, 'acceptedBy') : null,
    ...evidence(input)
  });
}

export function receiveCapabilitySupply(demand, supply) {
  if (!demand || demand.state !== 'OPEN') throw new TypeError('an OPEN demand is required');
  if (REQUIRED(supply.demandId, 'supply.demandId') !== demand.demandId) throw new Error('supply does not answer this demand');
  const suppliedCapabilityId = REQUIRED(supply.capabilityId, 'supply.capabilityId');
  if (suppliedCapabilityId !== demand.capabilityId) throw new Error('supply capability does not match demand');

  const downstreamAccepted = supply.downstreamAccepted === true;
  const acceptedBy = supply.acceptedBy ?? null;
  if (downstreamAccepted && acceptedBy !== demand.demandingActor) {
    throw new Error('only the demanding downstream actor may accept supply for closure');
  }

  return Object.freeze({
    ...demand,
    state: downstreamAccepted ? 'ACCEPTED' : 'SUPPLIED_AWAITING_DOWNSTREAM_ACCEPTANCE',
    receivingState: downstreamAccepted ? 'RECEIVED' : 'SUPPLIED_PENDING_ACCEPTANCE',
    effectCustodian: downstreamAccepted ? acceptedBy : demand.effectCustodian,
    supplyReceiptId: REQUIRED(supply.supplyReceiptId, 'supply.supplyReceiptId'),
    suppliedSurfaceId: REQUIRED(supply.suppliedSurfaceId, 'supply.suppliedSurfaceId'),
    downstreamAccepted,
    acceptedBy: downstreamAccepted ? acceptedBy : null
  });
}
