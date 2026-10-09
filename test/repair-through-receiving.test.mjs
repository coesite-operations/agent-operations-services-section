import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRepairAction, isRepairClosed, assertNoIssueOnlyClosure } from '../src/repair-through-receiving.mjs';
const independentlyReceived = Object.freeze({
  producer: 'agent:engineer',
  acceptedBy: 'agent:independent-receiver',
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
