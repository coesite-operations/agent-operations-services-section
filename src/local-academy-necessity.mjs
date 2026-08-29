#!/usr/bin/env node

import { createHash } from "node:crypto";

function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Derive an Academy service need from evidence owned by one receiving
 * settlement.  This function does not let the Academy or an upstream manager
 * manufacture the receiver's voice: actor, evidence authorship, office
 * ownership, and any contract admission all have to be receiver-local.
 */
export function deriveLocalAcademyNecessity(situation) {
  requireValue(situation?.type === "ReceiverOfficerSupplySituation", "receiver situation type is required");
  requireValue(typeof situation.receiver === "string" && situation.receiver.length > 0, "receiver is required");
  requireValue(situation.actor === situation.receiver, "only the receiver may author its local necessity");
  requireValue(situation.evidenceAuthorship === "receiver-local", "necessity evidence must be receiver-local");
  requireValue(situation.office?.owner === situation.receiver, "the receiver must own the office whose need it derives");
  requireValue(/^sha256:[a-f0-9]{64}$/u.test(situation.office?.digest ?? ""), "an immutable office digest is required");
  requireValue(Array.isArray(situation.currentIncumbencies), "current incumbency census is required");

  const currentQualifiedIncumbency = situation.currentIncumbencies.some((item) =>
    item?.office?.id === situation.office.id &&
    item?.office?.digest === situation.office.digest &&
    item?.standing === "current" &&
    item?.receiverRecognized === true &&
    item?.receiverInducted === true &&
    item?.characterQualifiedForOfficeEpoch === true
  );
  const serviceNecessary = !currentQualifiedIncumbency;
  let standing = serviceNecessary ? "locally-derived" : "not-needed";
  let contract;
  if (situation.contract) {
    requireValue(serviceNecessary, "a supply contract cannot evidence a need already satisfied by a current qualified incumbent");
    requireValue(situation.contract.consumer === situation.receiver, "local necessity contract must name the receiver as consumer");
    requireValue(situation.contract.admittedByReceiver === true, "a provider offer is not a receiver-admitted contract");
    contract = { ...situation.contract };
    standing = "contracted";
  }

  const attestation = {
    type: "LocalOfficerSupplyNecessity",
    actor: situation.receiver,
    receiver: situation.receiver,
    office: { ...situation.office },
    premises: {
      receiverOwnsOffice: true,
      evidenceAuthorship: "receiver-local",
      evidence: [...(situation.evidence ?? [])],
      currentQualifiedIncumbency
    },
    conclusion: {
      officerSupplyServiceNecessary: serviceNecessary,
      marketTenderRequired: serviceNecessary,
      providerSelectedByDerivation: false,
      service: "market-mediated-character-officer-supply",
      reason: serviceNecessary
        ? "receiver has an exact office epoch and lacks a current receiver-recognized, receiver-induced character qualified for it"
        : "receiver already has a current receiver-recognized, receiver-induced character qualified for the exact office epoch"
    },
    standing,
    ...(contract ? { contract } : {}),
    authority: {
      centralAssignment: false,
      providerMaySpeakForReceiver: false,
      conveysRecognition: false,
      conveysInduction: false,
      conveysIncumbency: false
    }
  };
  attestation.id = `urn:${digest(attestation)}`;
  return attestation;
}

/**
 * Glue locally authored demand without collapsing settlement sovereignty.
 * Provider observations remain market leads; they do not become attestations,
 * acceptances, contracts, appointments, or votes by being included here.
 */
export function glueAcademyDemand({ attestations = [], providerObservations = [] } = {}) {
  for (const item of attestations) {
    requireValue(item?.type === "LocalOfficerSupplyNecessity", "demand cover admits only local necessity attestations");
    requireValue(item.actor === item.receiver, "local necessity actor must be its receiver");
    requireValue(item.premises?.evidenceAuthorship === "receiver-local", "local necessity must retain receiver-local evidence authorship");
    requireValue(item.authority?.providerMaySpeakForReceiver === false, "provider may not speak for receiver");
  }
  for (const observation of providerObservations) {
    requireValue(observation?.type === "Offer", "provider observation must remain an Offer");
    requireValue(observation.actor !== observation.target, "self-addressed provider observations cannot establish independent demand");
  }
  const receivers = [...new Set(attestations.filter((item) => item.conclusion?.officerSupplyServiceNecessary).map((item) => item.receiver))].sort();
  const contractedReceivers = [...new Set(attestations.filter((item) => item.standing === "contracted" && item.contract?.provider === "union-officer-academy").map((item) => item.receiver))].sort();
  const cover = {
    type: "LocallyGluedAcademyDemand",
    theorem: "Officer supply is a common market category induced by independently derived receiver needs; the Academy becomes a common supplier only where receivers independently award its bids.",
    receiversNeedingOfficerSupply: receivers,
    receiversAwardingAcademy: contractedReceivers,
    counts: {
      receiverLocalAttestations: attestations.length,
      independentlyNeedingService: receivers.length,
      receiverAwardedAcademy: contractedReceivers.length,
      providerObservations: providerObservations.length,
      providerObservationsCountedAsReceiverDemand: 0
    },
    boundary: {
      commonProvider: "union-officer-academy",
      commonProviderStanding: "only receiver-awarded bids count",
      centralAssignment: false,
      receiverMayRefuse: true,
      appointmentRemainsReceiverLocal: true,
      observationIsNotAcceptance: true
    }
  };
  cover.id = `urn:${digest(cover)}`;
  return cover;
}
