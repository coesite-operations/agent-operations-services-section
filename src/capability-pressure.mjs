const REQUIRED = (value, name) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(name + ' is required');
  return value.trim();
};

const TRI = new Set(['HELD', 'REFUTED', 'UNKNOWN', 'CONTESTED']);
const HEALTH = new Set(['AVAILABLE', 'CONFIRMATION_GATED', 'RESERVED', 'UNSUPPORTED', 'DEGRADED', 'UNKNOWN']);

const FOUR_BITS = Object.freeze({
  HELD: Object.freeze({ positive: true, negative: false }),
  REFUTED: Object.freeze({ positive: false, negative: true }),
  UNKNOWN: Object.freeze({ positive: false, negative: false }),
  CONTESTED: Object.freeze({ positive: true, negative: true })
});

function tri(value, name) {
  if (!TRI.has(value)) throw new TypeError(name + ' has invalid FOUR standing');
  return value;
}

function fromFourBits(positive, negative) {
  if (positive) return negative ? 'CONTESTED' : 'HELD';
  return negative ? 'REFUTED' : 'UNKNOWN';
}

export function fourNeg(value) {
  const standing = tri(value, 'value');
  const bits = FOUR_BITS[standing];
  return fromFourBits(bits.negative, bits.positive);
}

export function fourAnd(left, right) {
  const l = FOUR_BITS[tri(left, 'left')];
  const r = FOUR_BITS[tri(right, 'right')];
  return fromFourBits(l.positive && r.positive, l.negative || r.negative);
}

export function fourAll(values) {
  if (!Array.isArray(values)) throw new TypeError('values must be an array');
  return values.reduce((acc, value) => fourAnd(acc, value), 'HELD');
}

export function makeCapabilitySurface(input) {
  const surface = {
    surfaceId: REQUIRED(input.surfaceId, 'surfaceId'),
    capabilityId: REQUIRED(input.capabilityId, 'capabilityId'),
    provider: REQUIRED(input.provider, 'provider'),
    implementation: input.implementation ? REQUIRED(input.implementation, 'implementation') : null,
    connector: input.connector ? REQUIRED(input.connector, 'connector') : null,
    principal: input.principal ? REQUIRED(input.principal, 'principal') : null,
    providerSupport: tri(input.providerSupport ?? 'UNKNOWN', 'providerSupport'),
    implementationSupport: tri(input.implementationSupport ?? 'UNKNOWN', 'implementationSupport'),
    connectorExposure: tri(input.connectorExposure ?? 'UNKNOWN', 'connectorExposure'),
    principalPermission: tri(input.principalPermission ?? 'UNKNOWN', 'principalPermission'),
    harnessCallability: tri(input.harnessCallability ?? 'UNKNOWN', 'harnessCallability'),
    providerEffect: tri(input.providerEffect ?? 'UNKNOWN', 'providerEffect'),
    readback: tri(input.readback ?? 'UNKNOWN', 'readback'),
    health: input.health ?? 'UNKNOWN',
    evidenceAt: REQUIRED(input.evidenceAt, 'evidenceAt'),
    evidenceRefs: Array.isArray(input.evidenceRefs) ? [...input.evidenceRefs] : []
  };
  if (!HEALTH.has(surface.health)) throw new TypeError('health has invalid standing');
  return Object.freeze(surface);
}

export function surfaceDiagnosis(surface) {
  const s = makeCapabilitySurface(surface);
  const connectorGapStanding = fourAnd(s.providerSupport, fourNeg(s.connectorExposure));
  const providerAbsentStanding = fourNeg(s.providerSupport);
  const executableStanding = fourAll([
    s.providerSupport,
    s.implementationSupport,
    s.connectorExposure,
    s.principalPermission,
    s.harnessCallability
  ]);
  const receivedStanding = fourAll([executableStanding, s.providerEffect, s.readback]);

  const connectorGap = s.providerSupport !== 'REFUTED' && s.connectorExposure === 'REFUTED';
  const executable = executableStanding === 'HELD';
  const received = receivedStanding === 'HELD';

  return Object.freeze({
    executable,
    received,
    connectorGap,
    providerAbsent: s.providerSupport === 'REFUTED',
    connectorGapStanding,
    providerAbsentStanding,
    executableStanding,
    receivedStanding,
    standing: received ? 'RECEIVED' : executable ? 'CALLABLE_UNRECEIVED' : connectorGap ? 'CONNECTOR_SURFACE_GAP' : s.health
  });
}

export function makeCapabilityDemand(input) {
  const suppliers = input.suppliers ?? {};
  return Object.freeze({
    demandId: REQUIRED(input.demandId, 'demandId'),
    demandingActor: REQUIRED(input.demandingActor, 'demandingActor'),
    workRef: REQUIRED(input.workRef, 'workRef'),
    blockedEffect: REQUIRED(input.blockedEffect, 'blockedEffect'),
    capabilityId: REQUIRED(input.capabilityId, 'capabilityId'),
    currentSurfaceId: REQUIRED(input.currentSurfaceId, 'currentSurfaceId'),
    impact: REQUIRED(input.impact, 'impact'),
    frequency: REQUIRED(input.frequency, 'frequency'),
    scienceProvider: suppliers.science ?? null,
    engineeringProvider: suppliers.engineering ?? null,
    operationsProvider: suppliers.operations ?? null,
    acceptanceTest: REQUIRED(input.acceptanceTest, 'acceptanceTest'),
    state: 'OPEN',
    effectCustodian: REQUIRED(input.effectCustodian ?? input.demandingActor, 'effectCustodian')
  });
}

/** Pure structural check only. The consumer/provider issuer must independently
 * authenticate witnessId and providerReadbackRef; matching strings alone grant no rights. */
export function validateCapabilityAcceptanceWitness(demand, supply) {
  const w = supply?.acceptanceWitness;
  const issues = [];
  if (supply?.downstreamAccepted !== true || supply.acceptedBy !== demand?.demandingActor)
    issues.push('acceptance must come from the exact demanding office');
  if (w?.kind !== 'CAPABILITY_CONSUMER_READBACK' || w?.verdict !== 'MET')
    issues.push('an independently received MET witness is required');
  if (w?.demandId !== demand?.demandId || w?.workRef !== demand?.workRef ||
      w?.capabilityId !== demand?.capabilityId ||
      w?.supplyReceiptId !== supply?.supplyReceiptId ||
      w?.suppliedSurfaceId !== supply?.suppliedSurfaceId)
    issues.push('receiving witness must identify the exact work and supply');
  if (typeof supply?.sourceRevision !== 'string' || !supply.sourceRevision.trim() ||
      w?.sourceRevision !== supply.sourceRevision)
    issues.push('receiving witness must bind the supplied source revision');
  if (w?.acceptedBy !== demand?.demandingActor ||
      typeof w?.receiverActorId !== 'string' || !w.receiverActorId.trim() ||
      typeof supply?.supplierActorId !== 'string' || !supply.supplierActorId.trim() ||
      w.receiverActorId === supply.supplierActorId)
    issues.push('source supplier cannot self-accept as an independent receiving actor');
  if (typeof w?.witnessId !== 'string' || !w.witnessId.trim() ||
      typeof w?.providerReadbackRef !== 'string' || !w.providerReadbackRef.trim() ||
      typeof w?.observedAt !== 'string' || !Number.isFinite(Date.parse(w.observedAt)))
    issues.push('independent witness, provider readback and observation time required');
  return Object.freeze({ok: issues.length === 0, issues: Object.freeze(issues)});
}

export function receiveCapabilitySupply(demand, supply) {
  const awaitingAcceptance = demand?.state === 'SUPPLIED_AWAITING_DOWNSTREAM_ACCEPTANCE';
  if (!demand || (demand.state !== 'OPEN' && !awaitingAcceptance)) {
    throw new TypeError('an OPEN demand or supply awaiting downstream acceptance is required');
  }
  if (REQUIRED(supply.demandId, 'supply.demandId') !== demand.demandId) throw new Error('supply does not answer this demand');
  const suppliedCapabilityId = REQUIRED(supply.capabilityId, 'supply.capabilityId');
  if (suppliedCapabilityId !== demand.capabilityId) throw new Error('supply capability does not match demand');
  const supplyReceiptId = REQUIRED(supply.supplyReceiptId, 'supply.supplyReceiptId');
  const suppliedSurfaceId = REQUIRED(supply.suppliedSurfaceId, 'supply.suppliedSurfaceId');
  const sourceRevision = supply.sourceRevision ?? demand.sourceRevision ?? null;
  const supplierActorId = supply.supplierActorId ?? demand.supplierActorId ?? null;
  if (awaitingAcceptance && (supplyReceiptId !== demand.supplyReceiptId ||
      suppliedSurfaceId !== demand.suppliedSurfaceId ||
      sourceRevision !== demand.sourceRevision || supplierActorId !== demand.supplierActorId)) {
    throw new Error('supply identity does not match the supply awaiting downstream acceptance');
  }

  const downstreamAccepted = supply.downstreamAccepted === true;
  const acceptedBy = supply.acceptedBy ?? null;
  if (downstreamAccepted && acceptedBy !== demand.demandingActor) {
    throw new Error('only the demanding downstream actor may accept supply for closure');
  }
  if (downstreamAccepted) {
    const witnessed = validateCapabilityAcceptanceWitness(demand, {
      ...supply, sourceRevision, supplierActorId
    });
    if (!witnessed.ok) throw new Error('capability acceptance unverified: ' + witnessed.issues.join('; '));
  }

  return Object.freeze({
    ...demand,
    state: downstreamAccepted ? 'ACCEPTED' : 'SUPPLIED_AWAITING_DOWNSTREAM_ACCEPTANCE',
    effectCustodian: downstreamAccepted ? acceptedBy : demand.effectCustodian,
    supplyReceiptId,
    suppliedSurfaceId,
    sourceRevision,
    supplierActorId,
    downstreamAccepted,
    acceptedBy: downstreamAccepted ? acceptedBy : null,
    acceptanceWitness: downstreamAccepted ? Object.freeze({...supply.acceptanceWitness}) : null
  });
}
