import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRepairAction, isRepairClosed, assertNoIssueOnlyClosure, diagnoseToolFailure } from '../src/repair-through-receiving.mjs';
const independentlyReceived = Object.freeze({
  producer: 'agent:engineer',
  acceptedBy: 'office:independent-receiver',
  producerActorId: 'actor:claude-on-bare-cedar-fog',
  receiverActorId: 'actor:codex-on-bare-cedar-fog',
  revision: 'sha:exact-merge-head',
  verdict: 'MET'
});


const acceptedDirectEffect = Object.freeze({
  received: true,
  workRef: 'urn:561:test:bounded-effect',
  effectRevision: 'effect:100',
  producerActorId: 'actor:chatgpt-web',
  consumerReceipt: Object.freeze({
    kind: 'CONSUMER_READBACK',
    verdict: 'MET',
    workRef: 'urn:561:test:bounded-effect',
    sourceRevision: 'effect:100',
    receiver: 'service:real-independent-consumer',
    receiverActorId: 'actor:independent-consumer',
    witnessId: 'provider:real-independent-receipt'
  })
});

test('writable defect goes to source patch, not issue filing', () => {
  assert.equal(nextRepairAction({ issueOpen: true, sourceWritable: true }), 'PATCH_SOURCE');
});

test('repair advances through test, PR, merge, deploy, and receiving', () => {
  assert.equal(nextRepairAction({ sourceWritable: true, patched: true }), 'TEST_PATCH');
  assert.equal(nextRepairAction({ sourceWritable: true, patched: true, tested: true }), 'OPEN_OR_UPDATE_PR');
  assert.equal(nextRepairAction({
    prOpen: true, mergeable: true, tested: true,
    headSha: independentlyReceived.revision, sourceReceipt: independentlyReceived
  }), 'MERGE_PR');
  assert.equal(nextRepairAction({ merged: true, deployRequired: true }), 'DEPLOY');
  assert.equal(nextRepairAction({ deployed: true }), 'VERIFY_RECEIVER_READBACK');
  assert.equal(nextRepairAction({ received: true }), 'VERIFY_RECEIVER_READBACK');
  assert.equal(nextRepairAction(acceptedDirectEffect), 'CLOSED_RECEIVED');
  assert.equal(isRepairClosed({ merged: true }), false);
  assert.equal(isRepairClosed({ received: true }), false);
  assert.equal(isRepairClosed(acceptedDirectEffect), true);
});


test('mergeable PR lacking passing tests remains before the merge gate', () => {
  assert.equal(nextRepairAction({ prOpen: true, mergeable: true }), 'VERIFY_PR_TESTS');
});

test('source receiving must be independent, MET, and bound to the current PR head', () => {
  const base = {
    prOpen: true, mergeable: true, tested: true,
    headSha: independentlyReceived.revision, sourceReceipt: independentlyReceived
  };
  for (const change of [
    { sourceReceipt: null },
    { sourceReceipt: { ...independentlyReceived, verdict: 'UNVERIFIED' } },
    { sourceReceipt: { ...independentlyReceived, acceptedBy: independentlyReceived.producer } },
    { sourceReceipt: { ...independentlyReceived, acceptedBy: 'office:another', receiverActorId: independentlyReceived.producerActorId } },
    { sourceReceipt: { ...independentlyReceived, receiverActorId: null } },
    { sourceReceipt: { ...independentlyReceived, acceptedBy: null } },
    { sourceReceipt: { ...independentlyReceived, revision: 'sha:stale' } },
    { headSha: null },
    { headSha: 'sha:head-changed-since-acceptance' }
  ]) {
    assert.equal(nextRepairAction({ ...base, ...change }), 'OBTAIN_INDEPENDENT_SOURCE_RECEIVING');
  }
  assert.equal(nextRepairAction(base), 'MERGE_PR');
});

test('source acceptance never substitutes for mergeability, deployment or consumer readback', () => {
  const base = {
    prOpen: true, mergeable: false, tested: true,
    headSha: independentlyReceived.revision, sourceReceipt: independentlyReceived
  };
  assert.equal(nextRepairAction(base), 'REPAIR_PR_TO_MERGEABLE');
  assert.equal(nextRepairAction({ merged: true, deployRequired: true }), 'DEPLOY');
  assert.equal(nextRepairAction({ merged: true, deployed: true, received: false }), 'VERIFY_RECEIVER_READBACK');
});

test('issue-only coordination cannot declare repair closed', () => {
  assert.throws(() => assertNoIssueOnlyClosure({ issueOpen: true, status: 'DONE' }), /issue-only coordination cannot close/);
});

test('predispatch denial is an observed effect failure, never permanent source non-writability', () => {
  assert.equal(nextRepairAction({harnessBlocked:true,sourceWritable:true,actuatorRepairable:true}),
    'BIND_BLOCKER_WAKE_AND_KEEP_EFFECT_CUSTODY');
  assert.equal(nextRepairAction({harnessBlocked:true,sourceWritable:true,independentWorkReady:true}),
    'CONTINUE_INDEPENDENT_WORK');
  assert.equal(nextRepairAction({harnessBlocked:true,sourceWritable:true}),
    'BIND_BLOCKER_WAKE_AND_KEEP_EFFECT_CUSTODY');
  assert.equal(nextRepairAction({sourceWritable:true}), 'PATCH_SOURCE');
});

test('only changed evidence permits a normal retry; unaffected work is not held captive', () => {
  assert.equal(nextRepairAction({harnessBlocked:true,normalRetryAvailable:true,independentWorkReady:true}),
    'CONTINUE_INDEPENDENT_WORK');
  assert.equal(nextRepairAction({harnessBlocked:true,normalRetryAvailable:true,changedEvidence:true}),
    'RETRY_NORMAL_SUPPORTED_ACTION');
  assert.equal(nextRepairAction({harnessBlocked:true,normalRetryAvailable:true,changedEvidence:false}),
    'BIND_BLOCKER_WAKE_AND_KEEP_EFFECT_CUSTODY');
});

test('actual successful independent receiving outranks stale local blocker observations', () => {
  assert.equal(nextRepairAction({harnessBlocked:true,...acceptedDirectEffect}), 'CLOSED_RECEIVED');
  assert.equal(isRepairClosed({harnessBlocked:true,merged:true,received:false}), false);
});

test('observed merge and deployment advance even when a prior harness attempt was denied', () => {
  assert.equal(nextRepairAction({harnessBlocked:true,merged:true,deployRequired:true,actuatorRepairable:true}),
    'DEPLOY');
  assert.equal(nextRepairAction({harnessBlocked:true,merged:true,deployRequired:false,actuatorRepairable:true}),
    'VERIFY_RECEIVER_READBACK');
  assert.equal(nextRepairAction({harnessBlocked:true,deployed:true,actuatorRepairable:true}),
    'VERIFY_RECEIVER_READBACK');
  assert.equal(nextRepairAction({harnessBlocked:true,prOpen:true,mergeable:true,normalRetryAvailable:true,changedEvidence:false}),
    'BIND_BLOCKER_WAKE_AND_KEEP_EFFECT_CUSTODY');
  assert.equal(nextRepairAction({harnessBlocked:true,prOpen:true,mergeable:true,normalRetryAvailable:true,changedEvidence:true}),
    'RETRY_NORMAL_SUPPORTED_ACTION');
});

const deploymentFixture = Object.freeze({
  workRef: 'red-cup-engineering/computer-services-section#134',
  mergedRevision: '148cb3c58218f626c9578dff70ba7c83fcdd00b3',
  producerActorId: 'actor:bare-cedar-fog-claude',
  merged: true, deployRequired: true, deployed: true, received: true,
  deploymentReceipt: {
    kind: 'DEPLOYMENT_WITNESS', verdict: 'MET', provider: 'cold-red-gate', witnessId: 'synthetic-release:1',
    workRef: 'red-cup-engineering/computer-services-section#134',
    sourceRevision: '148cb3c58218f626c9578dff70ba7c83fcdd00b3'
  },
  consumerReceipt: {
    kind: 'CONSUMER_READBACK', verdict: 'MET', receiver: 'chatgpt-web', receiverActorId: 'actor:chatgpt-web',
    witnessId: 'synthetic-rpc:1', workRef: 'red-cup-engineering/computer-services-section#134',
    sourceRevision: '148cb3c58218f626c9578dff70ba7c83fcdd00b3'
  }
});

test('merged world-entry fix with observed failure remains at deployment and custody', () => {
  const state = { ...deploymentFixture, deployed: false, received: false, deploymentReceipt: null, consumerReceipt: null };
  assert.equal(nextRepairAction(state), 'DEPLOY');
  assert.equal(isRepairClosed(state), false);
});

test('claimed deployment and receiving never close without exact witnesses', () => {
  const base = deploymentFixture;
  assert.equal(nextRepairAction({ ...base, deploymentReceipt: null }), 'VERIFY_DEPLOYMENT_WITNESS');
  assert.equal(nextRepairAction({ ...base, deploymentReceipt: { ...base.deploymentReceipt, sourceRevision: 'stale' } }), 'VERIFY_DEPLOYMENT_WITNESS');
  assert.equal(nextRepairAction({ ...base, consumerReceipt: null }), 'VERIFY_RECEIVER_READBACK');
  assert.equal(nextRepairAction({ ...base, consumerReceipt: { ...base.consumerReceipt, workRef: 'wrong-work' } }), 'VERIFY_RECEIVER_READBACK');
  assert.equal(nextRepairAction({ ...base, consumerReceipt: { ...base.consumerReceipt, witnessId: '' } }), 'VERIFY_RECEIVER_READBACK');
  assert.equal(nextRepairAction({ ...base, consumerReceipt: { ...base.consumerReceipt, receiverActorId: base.producerActorId } }), 'VERIFY_RECEIVER_READBACK');
  assert.equal(nextRepairAction({ ...base, producerActorId: null }), 'VERIFY_RECEIVER_READBACK');
  assert.equal(nextRepairAction({ ...base, received: false }), 'VERIFY_RECEIVER_READBACK');
  assert.equal(nextRepairAction({ ...base, merged: false }), 'RECONCILE_SOURCE_REVISION');
  assert.equal(isRepairClosed({ ...base, consumerReceipt: null }), false);
});

test('matching synthetic deployment and independent readback can close; they are not a real witness', () => {
  assert.equal(nextRepairAction(deploymentFixture), 'CLOSED_RECEIVED');
  assert.equal(isRepairClosed(deploymentFixture), true);
});

test('bare received, status DONE, issue closure, or a self-handoff never proves delivery', () => {
  for (const state of [
    { received: true },
    { received: true, status: 'DONE' },
    { received: true, issueOpen: true, status: 'CLOSED' },
    { received: true, handoff: { to: 'another office of the same actor' } },
    { ...acceptedDirectEffect, consumerReceipt: null },
    { ...acceptedDirectEffect, consumerReceipt: { ...acceptedDirectEffect.consumerReceipt, receiverActorId: acceptedDirectEffect.producerActorId } },
    { ...acceptedDirectEffect, consumerReceipt: { ...acceptedDirectEffect.consumerReceipt, sourceRevision: 'stale' } },
    { ...acceptedDirectEffect, consumerReceipt: { ...acceptedDirectEffect.consumerReceipt, verdict: 'UNVERIFIED' } },
    { ...acceptedDirectEffect, consumerReceipt: { ...acceptedDirectEffect.consumerReceipt, witnessId: '' } },
  ]) {
    assert.equal(isRepairClosed(state), false, 'unverified closure must fail');
  }
  assert.equal(isRepairClosed(acceptedDirectEffect), true);
});

test('classify true host predispatch refusal separately from connector or provider failures', () => {
  const host = diagnoseToolFailure({ dispatchObserved: false, code: 'CHATGPT_HARNESS_POLICY_BLOCK' });
  assert.equal(host.layer, 'HOST_PREDISPATCH_POLICY');
  assert.equal(host.next, 'KEEP_REFUSAL_AND_RESUME_OTHER_AUTHORIZED_WORK');
  assert.equal(diagnoseToolFailure({ dispatchObserved: false, code: 'CLIENT_ARGUMENT_VALIDATION' }).next, 'REPAIR_TOOL_SCHEMA_ARGUMENTS');
  assert.equal(diagnoseToolFailure({ connectorExposed: false }).layer, 'CONNECTOR_SURFACE');
  assert.equal(diagnoseToolFailure({ code: 'CHATGPT_HARNESS_POLICY_BLOCK' }).layer, 'UNKNOWN', 'the code alone is not evidence of dispatch layer');
  assert.equal(diagnoseToolFailure({ message: 'policies prevented it' }).layer, 'UNKNOWN', 'freeform narration is not tool provenance');
  assert.equal(diagnoseToolFailure({ dispatchObserved: false, providerReached: true, code: 'CHATGPT_HARNESS_POLICY_BLOCK' }).layer, 'CONTRADICTORY_EVIDENCE');
  assert.equal(diagnoseToolFailure({ providerReached: true, providerStatus: 301 }).next, 'RESOLVE_CANONICAL_REPOSITORY_ID');
  assert.equal(diagnoseToolFailure({ providerReached: true, providerStatus: 403 }).layer, 'PROVIDER_AUTHORIZATION');
  assert.equal(diagnoseToolFailure({ providerReached: true, providerStatus: 422 }).layer, 'PROVIDER_VALIDATION');
  assert.equal(diagnoseToolFailure({ providerReached: true, providerStatus: 503 }).layer, 'PROVIDER_RUNTIME');
  assert.equal(diagnoseToolFailure({ providerReached: true, providerStatus: 200, readbackMismatch: true }).layer, 'PROVIDER_READBACK');
});

test('diagnosed failures route to normal repair, not fictive handoff or permanent lost rights', () => {
  const attempt = (fields = {}) => ({ lastAttempt: fields, sourceWritable: true });
  assert.equal(nextRepairAction(attempt({ dispatchObserved: false, code: 'CLIENT_ARGUMENT_VALIDATION' })), 'REPAIR_TOOL_SCHEMA_ARGUMENTS');
  assert.equal(nextRepairAction(attempt({ connectorExposed: false })), 'REPAIR_OR_CONNECT_SUPPORTED_SURFACE');
  assert.equal(nextRepairAction(attempt({ providerReached: true, providerStatus: 301 })), 'RESOLVE_CANONICAL_REPOSITORY_ID');
  assert.equal(nextRepairAction(attempt({ providerReached: true, providerStatus: 403 })), 'RECHECK_EXACT_PRINCIPAL_AND_REPOSITORY_SCOPE');
  assert.equal(nextRepairAction(attempt({ providerReached: true, providerStatus: 422 })), 'REPAIR_PROVIDER_REQUEST_OR_STATE');
  assert.equal(nextRepairAction(attempt({ code: 'CHATGPT_HARNESS_POLICY_BLOCK' })), 'OBTAIN_FAILURE_LAYER_EVIDENCE');
  const blocked = { dispatchObserved: false, code: 'CHATGPT_HARNESS_POLICY_BLOCK' };
  assert.equal(nextRepairAction({ lastAttempt: blocked, independentWorkReady: true }), 'CONTINUE_INDEPENDENT_WORK');
  assert.equal(nextRepairAction({ lastAttempt: blocked, normalRetryAvailable: true, changedEvidence: true }), 'RETRY_NORMAL_SUPPORTED_ACTION');
  assert.equal(nextRepairAction({ lastAttempt: blocked, normalRetryAvailable: true }), 'BIND_BLOCKER_WAKE_AND_KEEP_EFFECT_CUSTODY');
  assert.equal(nextRepairAction({ lastAttempt: blocked, lastAttemptSuperseded: true, sourceWritable: true }), 'PATCH_SOURCE');
  assert.equal(nextRepairAction({ lastAttempt: { ...blocked, providerReached: true }, harnessBlocked: true }), 'RECONCILE_ACTION_PROVENANCE');
  assert.equal(nextRepairAction({ lastAttempt: { providerReached: true, providerStatus: 503 }, harnessBlocked: true }), 'REPAIR_PROVIDER_RUNTIME');
  assert.equal(nextRepairAction({ lastAttempt: blocked, merged: true, deployRequired: true }), 'DEPLOY', 'actual merge outranks obsolete predispatch failure');
});

test('owned source-acquisition gate is not misdiagnosed as ChatGPT platform policy', () => {
  const preflight = {
    kind: 'release-source-acquisition-refusal',
    stage: 'pre-acquisition',
    code: 'SOURCE_GRAPH_OR_TOOLCHAIN_UNQUALIFIED',
    evidenceRef: 'https://github.com/emsenn/cold-red-gate/actions/runs/38083819898',
    selectedRevision: 'a623e30cd2b7295a11bbea7e4884d9d1671cda36',
    observedAt: '2026-10-10T20:28:08Z'
  };
  const attempt = {providerReached: true, dispatchObserved: true, releasePreflight: preflight};
  assert.deepEqual(diagnoseToolFailure(attempt), {
    layer: 'SOURCE_ACQUISITION_GUARD',
    next: 'QUALIFY_SOURCE_GRAPH_AND_PACKAGE_TOOLCHAIN'
  });
  assert.equal(nextRepairAction({
    merged: true, deployRequired: true, deployed: false, received: false, lastAttempt: attempt
  }), 'QUALIFY_SOURCE_GRAPH_AND_PACKAGE_TOOLCHAIN', 'a preflight refusal outranks another identical release retry');
  assert.equal(nextRepairAction({
    merged: true, deployRequired: true, deployed: true, lastAttempt: attempt
  }), 'VERIFY_DEPLOYMENT_WITNESS', 'actual later deployment supersedes an older preflight');
  assert.equal(diagnoseToolFailure({
    ...attempt, dispatchObserved: false, code: 'CHATGPT_HARNESS_POLICY_BLOCK'
  }).layer, 'CONTRADICTORY_EVIDENCE', 'contradictory record cannot be classed a witnessed preflight');
  assert.equal(diagnoseToolFailure({
    ...attempt, releasePreflight: {...preflight, evidenceRef: ''}
  }).layer, 'PROVIDER_OBSERVED', 'missing job evidence is not a qualified preflight');
  assert.equal(diagnoseToolFailure({
    ...attempt, providerReached: false
  }).layer, 'UNKNOWN', 'host-only rejection cannot claim an observed provider preflight');
  assert.equal(diagnoseToolFailure({
    lastAttempt: 'Source acquisition refused: SQLite is declared.'
  }).layer, 'UNKNOWN', 'narration alone proves no failure layer');
});

test('release preflight diagnosis does not allow a claimed receipt to close failed receiving', () => {
  const preflight = {kind: 'release-source-acquisition-refusal',stage:'pre-acquisition',
    code:'SOURCE_GRAPH_OR_TOOLCHAIN_UNQUALIFIED',evidenceRef:'job:controlled',
    selectedRevision:'sha:source',observedAt:'2026-10-10T20:00:00Z'};
  const attempt={providerReached:true,releasePreflight:preflight};
  assert.equal(nextRepairAction({
    ...acceptedDirectEffect, received:true, consumerReceipt:null,
    deployRequired:true, merged:true, deployed:false, lastAttempt:attempt
  }), 'QUALIFY_SOURCE_GRAPH_AND_PACKAGE_TOOLCHAIN');
  assert.equal(isRepairClosed({
    ...acceptedDirectEffect, consumerReceipt:null, lastAttempt:attempt
  }), false);
});

test('verified host safety refusal never proposes actuator reconstruction to evade policy', () => {
  const observed = {dispatchObserved:false, code:'CHATGPT_HARNESS_POLICY_BLOCK'};
  assert.equal(nextRepairAction({
    lastAttempt: observed, actuatorRepairable:true, sourceWritable:true
  }), 'BIND_BLOCKER_WAKE_AND_KEEP_EFFECT_CUSTODY');
  assert.equal(nextRepairAction({
    lastAttempt: observed, actuatorRepairable:true, independentWorkReady:true
  }), 'CONTINUE_INDEPENDENT_WORK');
  assert.equal(nextRepairAction({
    lastAttempt: observed, actuatorRepairable:true, changedEvidence:true, normalRetryAvailable:true
  }), 'RETRY_NORMAL_SUPPORTED_ACTION');
  assert.equal(nextRepairAction({
    lastAttempt: {providerReached:true,providerStatus:422}, actuatorRepairable:true
  }), 'REPAIR_PROVIDER_REQUEST_OR_STATE');
});


test('legacy harness boolean does not authorize low-level actuator workaround', () => {
  assert.equal(nextRepairAction({harnessBlocked:true,actuatorRepairable:true,independentWorkReady:true}), 'CONTINUE_INDEPENDENT_WORK');
  assert.equal(nextRepairAction({harnessBlocked:true,actuatorRepairable:true}), 'BIND_BLOCKER_WAKE_AND_KEEP_EFFECT_CUSTODY');
});
