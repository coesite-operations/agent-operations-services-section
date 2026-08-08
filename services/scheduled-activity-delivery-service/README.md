# ScheduleDelivery Service

This portable service lets a colony sell the work of one of its clocks without
claiming to own time. A customer contracts a schedule once; the colony-local
clock may then call `run-due` without gaining authority over the customer work
caused by the pulse. The intended first provider is the always-on VPS colony,
`cold-red-gate`; the office name is **ScheduleDelivery of the Cold Red Gate
Colony**. The laptop colony is `bare-cedar-fog`. This package does not itself
claim that the VPS deployment is installed or healthy.

The public A2A task faces require the standard HTTP Bearer scheme declared by
the signed Agent Card. A deployment binds that credential to one customer
actor, and the executor refuses an activity whose actor differs from the
authenticated principal. Credential bytes remain in a mode-0600 file outside
the repository and never enter schedules or WitnessJournal.

Schedule identity commits the inspected target runtime closure as well as the
customer and request. Renewal is one provider-side `ScheduleTransition` record:
the successor registration and predecessor retirement share one append-only
semantic object. A write-once prepared transition cell makes concurrent claims
for the same predecessor mutually exclusive and lets a lost response replay the
same transition without guessing, compensating, or activating two successors.

The admitted Cold Red Gate carrier installs the package at
`~/services/scheduled-activity-delivery-service` and the customer Koios runtime at
`~/services/koios-news-runtime`. The user timer in
`content/deployments/cold-red-gate/` only supplies provider-local clock ticks;
it cannot choose a customer command, schedule, or activity. Those remain in
accepted provider-owned schedule records.

```sh
npm run verify
node src/service.mjs --operation solicit-service < solicitation.json
node src/service.mjs --operation invoke-service < acceptance.json
node src/service.mjs --operation run-due --now 2026-07-19T12:00:00.000Z
```

The first carrier is deliberately local and narrow. It calls only a named
operation in the target's own package operation catalog, using that package's
own `bin` entry. It accepts no caller-selected executable, argv, shell, or
environment. A later HTTP delivery carrier can be added without changing the
schedule and receipt law.
