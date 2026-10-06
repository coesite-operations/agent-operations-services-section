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
