import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyVoidfleetProgram } from "../src/verify-academy.mjs";

const read = p => JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const native = () => ({
 common:read("content/curricula/union-officer-common-core.json"),
 voidfleet:read("content/curricula/voidfleet-professional-practice.json"),
 offerForServiceSections:read("content/services/market-mediated-character-officer-supply.json"),
 officerFormation:read("content/services/officer-formation.json"),
});

test("restored Voidfleet practice is a genuinely selected Academy formation track, not a second appointing ministry",()=>{
 const selected=verifyVoidfleetProgram(native());
 assert.equal(selected.trainingTrackAvailable,true);
 assert.equal(selected.sourceQualified,true);
 assert.equal(selected.qualificationAdmitted,false);
 assert.equal(selected.cohortOpened,false);
 assert.equal(selected.serviceSectionFormed,false);
 assert.equal(selected.recipientAccepted,false);
 assert.equal(Object.isFrozen(selected),true);
});

test("missing original PQS competency or untrained service-section commerce blocks source selection",()=>{
 const input=native();
 input.voidfleet.pqsCompetencyCategories.pop();
 assert.throws(()=>verifyVoidfleetProgram(input),/five original PQS competencies/);
 const withoutCustomerTraining=native();
 withoutCustomerTraining.common.competencies=withoutCustomerTraining.common.competencies.filter(x=>!x.includes("hiring a sovereign professional service section"));
 assert.throws(()=>verifyVoidfleetProgram(withoutCustomerTraining),/mandatory common core/);
});

test("no invented cohort, authority or wrong-source campaign crosses the Academy boundary",()=>{
 const missingAuthority=native();
 missingAuthority.voidfleet.authorityWithheld=missingAuthority.voidfleet.authorityWithheld.filter(x=>x!=="new service-section foundation");
 assert.throws(()=>verifyVoidfleetProgram(missingAuthority),/authority nonidentifications/);
 const wrongProvider=native();
 wrongProvider.offerForServiceSections.sectionServiceHiring.sourceOwner="561-group/561-group-services-section";
 assert.throws(()=>verifyVoidfleetProgram(wrongProvider),/provider section hiring/);
 const corruptedLink=native();
 corruptedLink.officerFormation.curriculumTracks=[];
 assert.throws(()=>verifyVoidfleetProgram(corruptedLink),/provider section hiring/);
});
