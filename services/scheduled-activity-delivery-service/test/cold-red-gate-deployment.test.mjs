import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const unit = readFileSync(new URL("../content/deployments/cold-red-gate/scheduled-activity-delivery-run-due.service", import.meta.url), "utf8");

test("Cold Red Gate retains its explicit signed ScheduleDelivery provider identity", () => {
  assert.match(unit, /^Environment=SCHEDULED_ACTIVITY_DELIVERY_ACTOR=https:\/\/bare-cedar-fog\.561\.group\/actors\/cold-red-gate-scheduled-activity-delivery$/mu);
  assert.match(unit, /^Environment=ACTIVITYPUB_ORIGIN=https:\/\/bare-cedar-fog\.561\.group$/mu);
  assert.match(unit, /^Environment=ACTIVITYPUB_IDENTIFIER=cold-red-gate-scheduled-activity-delivery$/mu);
  assert.match(unit, /^Environment=ACTIVITYPUB_KEYS_PATH=%h\/\.local\/share\/emsenn\/activitypub\/cold-red-gate-scheduled-activity-delivery\.json$/mu);
  assert.match(unit, /^Environment=SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST=ACTIVITYPUB_ORIGIN,ACTIVITYPUB_IDENTIFIER,ACTIVITYPUB_KEYS_PATH,ACTIVITYPUB_RECIPIENT,ACTIVITYPUB_RECIPIENT_INBOX$/mu);
});

test("Cold Red Gate addresses Koios's logical actor through its retained inbox", () => {
  assert.match(unit, /^Environment=ACTIVITYPUB_RECIPIENT=https:\/\/koios\.news\/activitypub\/actor$/mu);
  assert.match(unit, /^Environment=ACTIVITYPUB_RECIPIENT_INBOX=https:\/\/bare-cedar-fog\.561\.group\/actors\/koios-news\/inbox$/mu);
  assert.doesNotMatch(unit, /^Environment=ACTIVITYPUB_RECIPIENT_INBOX=https:\/\/bare-cedar-fog\.561\.group\/inbox$/mu);
});
