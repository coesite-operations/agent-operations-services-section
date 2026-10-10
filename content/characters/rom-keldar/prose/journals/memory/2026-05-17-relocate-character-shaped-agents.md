---
name: relocate-character-shaped-agents
description: "When an entry at work/governance/staff/agents/ is really a character (codi, theorist, mathematical-researcher, diviner, …) wedged into the agents directory, relocate it to doing/governing/characters/$name/$name.md and defer proper character-form encoding until the polity has the theoretical chops for it."
---

When auditing or restructuring `work/governance/staff/agents/`, treat entries that are character-shaped (named like a person/role, carrying persona/voice/lore content, with a corresponding existing record under `doing/governing/characters/`) **not** as conflated agents to be split across multiple form-sections in one file.
Instead, relocate them: move the content into `doing/governing/characters/$name/$name.md`.

**Why:** Even agent-form is still "pretty rough-feeling" theoretically; character-form is rougher still.
Trying to encode multi-form entities (agent + persona + character + officer) in a single file forces premature commitment to a character-form encoding the polity has not yet earned.
The simpler, more honest move is to take the non-agent-shape ones out of agents/ entirely and come back to them when the theoretical apparatus for character is built out.

**How to apply:** - In Phase 3 of `fixing-our-agents-and-skills`, before re-expressing each agent file under the new spec, triage it: is this a *pure agent* (job-function name, no persona content), or is it a *character wedged as an agent* (person/role name, voice content, often with an existing record at `characters/`)? - Pure agents: re-express in place against the new agent spec. - Character-shaped: relocate to `doing/governing/characters/$name/$name.md`.
Do not try to design a multi-form encoding.
The relocation is the disposition for this round. - The design record at `prose/concepts/encoding-of-agents-and-skills.md` should reflect this — the `forms:` list is in principle a multi-form declaration, but in practice this round only handles `forms: [agent]`.
Multi-form encoding is deferred. - Encoding-of-character-form is a future task; do not author it without the user's explicit direction.
