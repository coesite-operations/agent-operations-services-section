import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRepairAction, isRepairClosed, assertNoIssueOnlyClosure } from '../src/repair-through-receiving.mjs';
const independentlyReceived = Object.freeze({
  producer: 'agent:engineer',
  acceptedBy: 'office:independent-receiver',
  producerActorId: 'actor:claude-on-bare-cedar-fog',
  receiverActorId: 'actor:codex-on-bare-cedar-fog',
  revision: 'sha:exact-merge-head',
  verdict: 'MET'
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
  assert.equal(nextRepairAction({ received: true }), 'CLOSED_RECEIVED');
  assert.equal(isRepairClosed({ merged: true }), false);
  assert.equal(isRepairClosed({ received: true }), true);
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
    'REPAIR_WRITE_ACTUATOR');
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
  assert.equal(nextRepairAction({harnessBlocked:true,received:true}), 'CLOSED_RECEIVED');
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
