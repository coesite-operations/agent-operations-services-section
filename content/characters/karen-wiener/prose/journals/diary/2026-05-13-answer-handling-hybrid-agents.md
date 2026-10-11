# Exploration: Handling Hybrid Agents in the 561 Group Governance System

## Question How should we handle agents that span multiple functional categories (like Codi, who is both chief engineer and a theory worker)?
Should they reside in multiple locations, have a primary classification, or use tagging mechanisms?

## What I Explored - Examined the agent records for Codi and Emsemiote to see evidence of multiple roles. - Reviewed the work/governance/agents/_index.md for organizational patterns and existing subdirectories. - Looked at the theoretical question file about governance agent directory structure. - Checked for existing tagging mechanisms in the codebase (found that the librarian has tag management skills for the library). - Considered the three options: multiple locations, primary classification, tagging.

## What I Learned - Agents like Codi have a single 'role' field (engineering) but their serves and duties span multiple categories (e.g., coordinating between theory researchers and implementation teams). - Emsemiote has two roles: researcher and writer, showing that multiple roles are already represented in the agent format (via a list in the roles field). - The current system already uses subdirectories for some agents (emsemiote/ and endpoints/), suggesting a move towards structured organization. - There is no existing tagging mechanism for agents, but the librarian agent already manages tags for library content, indicating a precedent for tag-based organization in the polity. - The PyFARS substrate likely reads agent records from the work/governance/agents directory and subdirectories (based on the _index.md discussion), so subdirectories are viable for discovery.

## Interesting Connections - The librarian's role in managing tags for the library could be extended to manage agent tags, providing a ready-made solution for tag-based agent classification. - The use of subdirectories for emsemiote (semiotic engineering) and endpoints (API/interface) aligns with predicated computing principles of organizing by functional concern, which could be extended to other domains. - Handling hybrid agents through tagging aligns with the principle of allowing multiple classifications without duplication, reducing inconsistency risk.

## Answer Assessment The question is partially answered.
We recommend using a tagging mechanism (option 3) where each agent record can have a tags field in the frontmatter, and agents are stored in a single location (either flat or in a primary subdirectory based on their primary role).
The librarian (or a dedicated agent) can maintain indexes by tag for discovery.
This avoids duplication inconsistency while allowing flexible classification.
Further exploration is needed to implement the tags field and update the discovery mechanism, if necessary.

## Follow-up Tasks and Questions - Amend the agent record format to include an optional tags field. - Extend the librarian's duties (or create a new agent) to manage agent tags and generate tag-based indexes. - Update the discovery mechanism to index agents by tag, if not already done. - Develop a migration plan to add tags to existing agent records based on their serves and duties. - Establish guidelines for tagging agents (e.g., using predefined tags from observed functional groupings).
