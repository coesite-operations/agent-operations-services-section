import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRepairAction, isRepairClosed, assertNoIssueOnlyClosure } from '../src/repair-through-receiving.mjs';

test('writable defect goes to source patch, not issue filing', () => {
  assert.equal(nextRepairAction({ issueOpen: true, sourceWritable: true }), 'PATCH_SOURCE');
});

test('repair advances through test, PR, merge, deploy, and receiving', () => {
  assert.equal(nextRepairAction({ sourceWritable: true, patched: true }), 'TEST_PATCH');
  assert.equal(nextRepairAction({ sourceWritable: true, patched: true, tested: true }), 'OPEN_OR_UPDATE_PR');
  assert.equal(nextRepairAction({ prOpen: true, mergeable: true }), 'MERGE_PR');
  assert.equal(nextRepairAction({ merged: true, deployRequired: true }), 'DEPLOY');
  assert.equal(nextRepairAction({ deployed: true }), 'VERIFY_RECEIVER_READBACK');
  assert.equal(nextRepairAction({ received: true }), 'CLOSED_RECEIVED');
  assert.equal(isRepairClosed({ merged: true }), false);
  assert.equal(isRepairClosed({ received: true }), true);
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
