#!/usr/bin/env node

import { createHash } from "node:crypto";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const AS_CONTEXT = "https://www.w3.org/ns/activitystreams";

function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function identify(value) {
  return identifyJsonSemanticContent({ objectKind: "union-officer-academy.officer-supply-market.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

export function publishOfficerSupplyLot(attestation, options = {}) {
  requireValue(attestation?.type === "LocalOfficerSupplyNecessity", "a receiver-local necessity attestation is required");
  requireValue(attestation.actor === attestation.receiver, "the receiver must author the necessity");
  requireValue(attestation.conclusion?.officerSupplyServiceNecessary === true, "the local derivation does not establish a supply need");
  requireValue(attestation.premises?.evidenceAuthorship === "receiver-local", "the market lot requires receiver-local evidence");
  requireValue(!attestation.contract, "publish the provider-neutral lot before admitting a provider contract");
  requireValue(options.market && options.market !== "union-officer-academy", "a provider-neutral market boundary is required");
  requireValue(Array.isArray(options.selectionCriteria) && options.selectionCriteria.length > 0, "receiver selection criteria are required");

  const object = {
    type: "OfficerSupplyLot",
    issuer: attestation.receiver,
    market: options.market,
    necessity: attestation.id,
    office: { ...attestation.office },
    outcome: options.outcome ?? "supply one qualified character and exact context/animation evidence for receiver evaluation",
    requiredProducts: options.requiredProducts ?? ["qualified-character", "cohort-membership", "qualification-evidence", "context-and-skill-plan", "animation-plan", "typed-authority-withheld"],
    selectionCriteria: [...options.selectionCriteria],
    settlement: options.settlement ?? "price and receipt terms invited from bidders",
    providerNeutral: true,
    selectedProvider: null,
    receiverKeeps: ["bid comparison", "award", "contract admission", "recognition", "induction", "incumbency", "capability grants", "refusal"]
  };
  object.id = identify(object);
  const activity = { "@context": AS_CONTEXT, type: "Offer", actor: attestation.receiver, target: options.market, object };
  activity.id = identify(activity);
  return activity;
}

export function prepareAcademySupplyBid(lotActivity, capacity) {
  const lot = lotActivity?.object;
  requireValue(lotActivity?.type === "Offer" && lot?.type === "OfficerSupplyLot", "an OfficerSupplyLot Offer is required");
  requireValue(lotActivity.actor === lot.issuer, "lot issuer must be its ActivityStreams actor");
  requireValue(lot.providerNeutral === true && lot.selectedProvider === null, "Academy bids only on provider-neutral, unawarded lots");
  requireValue(Array.isArray(capacity?.supplierContracts) && capacity.supplierContracts.length > 0, "Academy bid must disclose its recursive supplier contracts");
  requireValue(capacity.supplierContracts.every((item) => item.provider && item.capability && item.contract), "each recursive supplier contract must name provider, capability, and contract");
  requireValue(capacity.characterCandidate && capacity.qualification, "Academy bid must bind a character candidate and qualification evidence");

  const object = {
    type: "AcademyOfficerSupplyBid",
    bidder: "union-officer-academy",
    lot: lot.id,
    receiver: lot.issuer,
    office: { ...lot.office },
    offeredOutcome: "qualified cohort-formed character plus exact professional context and bounded animation plan",
    characterCandidate: capacity.characterCandidate,
    qualification: capacity.qualification,
    capacityStatus: capacity.capacityStatus ?? "ready",
    recursivelyProcuredCapacity: {
      agreement: capacity.agreement,
      assignedByHeadquarters: false,
      voluntarySuppliers: true,
      supplierContracts: capacity.supplierContracts.map((item) => ({ ...item })),
      shortfallRule: "Academy refuses or marks the bid conditional when its suppliers cannot make the promised outcome available"
    },
    settlement: capacity.settlement ?? "monetary price undecided; non-zero resource contributions disclosed at award",
    awardStatus: "not-awarded",
    authorityWithheld: ["receiver-award", "receiver-contract-admission", "receiver-recognition", "receiver-induction", "incumbency", "capability-grant"]
  };
  object.id = identify(object);
  const activity = { "@context": AS_CONTEXT, type: "Offer", actor: "union-officer-academy", target: lot.issuer, inReplyTo: lotActivity.id, object };
  activity.id = identify(activity);
  return activity;
}

export function admitOfficerSupplyAward({ lotActivity, bidActivity, receiver, contract }) {
  const lot = lotActivity?.object, bid = bidActivity?.object;
  requireValue(lotActivity?.actor === receiver && lot?.issuer === receiver, "only the lot issuer may award it");
  requireValue(bidActivity?.actor === "union-officer-academy" && bid?.bidder === "union-officer-academy", "award requires an Academy-authored bid");
  requireValue(bidActivity.inReplyTo === lotActivity.id && bid.lot === lot.id, "bid does not answer the awarded lot");
  requireValue(contract?.consumer === receiver && contract?.provider === "union-officer-academy", "award contract parties do not match lot and bid");
  requireValue(contract.admittedByReceiver === true, "award is not a receiver-admitted contract");
  const object = {
    type: "OfficerSupplyAward",
    receiver,
    lot: lot.id,
    bid: bid.id,
    provider: "union-officer-academy",
    contract: { ...contract },
    selection: "receiver-local",
    conveysRecognition: false,
    conveysInduction: false,
    conveysIncumbency: false
  };
  object.id = identify(object);
  const activity = { "@context": AS_CONTEXT, type: "Accept", actor: receiver, target: "union-officer-academy", inReplyTo: bidActivity.id, object };
  activity.id = identify(activity);
  return activity;
}
