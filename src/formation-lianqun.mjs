import { join } from "node:path";
import { queryAcademySemanticContent } from "@union-officer-academy/formation-lianqun-member-runtime-service/semantic-records";
import { digest } from "./academy.mjs";

export const FORMATION_LIANQUN_MEMBERS = Object.freeze([
  "context-compilation-xiaowei",
  "formation-market-xiaowei",
  "independent-examination-xiaowei",
  "qualification-registry-xiaowei",
  "situated-practice-xiaowei",
]);

const ROLE = Object.freeze({
  "context-compilation-xiaowei": "context",
  "formation-market-xiaowei": "market-broker",
  "independent-examination-xiaowei": "examiner",
  "qualification-registry-xiaowei": "registrar",
  "situated-practice-xiaowei": "practitioner",
});

function validAgreement(value) {
  return value?.type === "RendanheyiFormationLianqunAgreement"
    && value.assignedByHeadquarters === false
    && value.internalCustomers === false
    && Number.isFinite(Date.parse(value.formedAt))
    && JSON.stringify(value.parties) === JSON.stringify(FORMATION_LIANQUN_MEMBERS)
    && Array.isArray(value.bids) && value.bids.length === FORMATION_LIANQUN_MEMBERS.length
    && Array.isArray(value.commitments) && value.commitments.length === FORMATION_LIANQUN_MEMBERS.length
    && FORMATION_LIANQUN_MEMBERS.every((id) => value.shares?.[id] !== undefined && typeof value.providerConfigurations?.[id] === "string");
}

export async function currentFormationLianqun(root) {
  const agreements = (await queryAcademySemanticContent("union-officer-academy.formation-lianqun-agreement", { root }))
    .filter(validAgreement)
    .sort((left, right) => Date.parse(left.formedAt) - Date.parse(right.formedAt) || left.id.localeCompare(right.id));
  const agreement = agreements.at(-1);
  if (!agreement) throw new Error("an operating, voluntarily formed five-provider formation lianqun agreement is required");
  return agreement;
}

export function formationProviders(agreement) {
  if (!validAgreement(agreement)) throw new TypeError("formation providers require a conforming lianqun agreement");
  return agreement.parties.map((id, index) => ({
    id,
    role: ROLE[id],
    digest: digest({ agreement: agreement.id, bid: agreement.bids[index], commitment: agreement.commitments[index], share: agreement.shares[id] }),
    contract: agreement.id,
    serviceConfigurationDigest: agreement.providerConfigurations[id],
  }));
}
