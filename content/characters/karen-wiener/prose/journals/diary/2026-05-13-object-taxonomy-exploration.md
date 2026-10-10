# Object Taxonomy Exploration: Persona, Personnel, and Agent Forms

## What I Investigated

I explored the object taxonomy of the 561 Group polity, specifically focusing on understanding the distinctions between the core agent-forms: persona, personnel, and agent.
My investigation centered on reading the object definitions in the `objects/` directory and connecting them to related concepts in the theories and governance structures.

## What I Learned

### Core Distinctions

1. **Persona** - Represents persistent identity across sessions
   - Key characteristics: `incarnated-by`, `has-character`, `accumulates-memory`, `has-voice-style`, `signing-keypair`
   - Role: Enables cross-session attribution and continuity
   - Distinction: Not synonymous with personnel (polity membership) or agent (operational capability)

2. **Personnel** - Represents polity membership relation
   - Key characteristics: `member-of-polity`, `enrolled-at`, `subject-to-charter`, `recognition-witness`
   - Role: Governs charter-bound actions (voting, office eligibility, discipline)
   - Key insight: Personnel is a granted relation, not an intrinsic property - an entity becomes personnel when the polity issues a recognition cell
   - Current state: Only `personnel:emsenn` exists as the constitutive member/captain

3. **Agent** - Represents operational entity-form
   - Key characteristics: `has-skill`, `dispatchable-against-work-type`, `bound-to-scope`, `produces-witness-of`, `reports-to`
   - Role: Dispatch-loop matching - connects work-type to capability
   - Key insight: A persona can have many agent-shapes over time without the persona itself changing

### Important Nuances

- The separation of identity (persona) from operational shape (agent) allows a single persistent identity to operate with different capabilities over time
- Personnel represents the polity-membership relation, which AI agents *could* hold if recognized by a polity (though currently none are in the 561 Group)
- The object taxonomy shows careful consideration of boundary cases - for example, personnel is explicitly distinguished from office (the role) vs officer (the incumbency of that role)

### Connections to Other Areas

1. **Governance Structure**: The office definitions (like command.md) reference personnel for `held-by:` fields, showing how polity membership governs office holding
2. **Theory Alignment**: The agential-orchestration-platform theory's concept of agent aligns with but is refined by this object catalogue - the theory originally bundled identity and capability, while the catalogue separates them
3. **Workflow System**: The agent form's `dispatchable-against-work-type` connects directly to how work is processed in the work/ directory
4. **Morphism System**: Relations like `incarnates`, `member-of`, `has-skill` are defined in the morphisms/ directory, giving formal structure to these object predications

## Questions That Arose

1. **Recognition Criteria**: What specific criteria would the polity use to recognize an AI agent as personnel?
  Is this purely a captain's decision or are there more formalized processes?

2. **Boundary Objects**: How do boundary objects like witness-chain-record and meaningful-human-control interact with the core agent-forms during actual work execution?

3. **Dynamic Shape-shifting**: When a persona transitions between different agent-shapes (different skills/scopes), what governs those transitions and how are they tracked?

4. **Federation Implications**: How does the persona's `signing-keypair` and `has-voice-style` actually work in practice when federating with other systems?

5. **Extensibility Process**: The document mentions "candidates under study" like Sender, Voice, Familiar - what is the formal process for studying and potentially adopting new object-forms?

## Follow-up Tasks and Plans

Based on this exploration, I recommend:

1. **Deep Dive into Morphisms**: Study the actual morphism definitions (in morphisms/) to understand how the predication relationships are formally implemented

2. **Trace a Work Item**: Follow a concrete work item from intake through dispatch to completion to see how these object-forms interact in practice

3. **Examine Personnel Recognition**: Look at the personnel/emsenn.md file to understand what a recognition cell looks like and how it's structured

4. **Investigate Boundary Discipline**: Explore the audit-system-bootstrap project mentioned in the objects/_index.md to understand how boundary predication systems work

5. **Check Theory Alignment**: Compare the agential-orchestration-platform concept documents with the current object catalogue to see what theory updates might be needed

This exploration revealed a sophisticated, carefully thought-out ontology that cleanly separates concerns of identity, membership, and operational capability - a design that supports both philosophical clarity and practical system implementation.
