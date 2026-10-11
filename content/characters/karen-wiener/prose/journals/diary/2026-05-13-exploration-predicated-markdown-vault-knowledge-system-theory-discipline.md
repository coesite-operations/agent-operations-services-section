# Exploration: Predicated Markdown-Vault Knowledge System Theory Discipline

## What I Investigated I explored the structure and discipline of theories within the 561 Group's research corpus, specifically focusing on what makes a directory qualify as a "theory" in the predicated markdown-vault knowledge system.
This investigation was motivated by observing the deep hierarchical organization in the theories/ directory and wanting to understand the principles that govern how knowledge is structured and curated.

## What I Learned

### Theory Discipline Criteria Through examining [theory-discipline.md](theories/theories/science/theories/information/theories/knowledge-systems/theories/markdown-vault-knowledge-system/theories/predicated-markdown-vault-knowledge-system/specifications/theory-discipline.md), I learned that a directory is treated as a *theory* when it demonstrates:

1. **Subject coherence** - A recognizable body of work with its own questions, vocabulary, and structural commitments
2. **Vocabulary independence** - Concept notes that are semantic anchors rather than borrowed wholesale from parents
3. **Own commitments** - Object notes (definitions) and morphism notes (operators) that the directory asserts as its own
4. **Explicit claims** - Theorem/conjecture notes with explicit status indicators
5. **Visible open work** - Either typed questions or a stated frontier in _index.md
6. **Proper front door** - An _index.md that names the subject, states position relative to parent, and lists layout

### Canonical Theory Layout Once a directory achieves theory status, it typically follows this structure:
```
<theory>/
├── _index.md                 # Front door with subject, position, layout
├── concepts/                 # Concept notes (semantic anchors)
├── objects/                  # Object notes (type: definition)
├── morphisms/                # Morphism notes (operators)
├── theorems/                 # Theorem/conjecture notes
├── questions/                # Question notes (open work)
├── narratives/               # Narrative notes
├── examples/                 # Example notes
├── references/               # Reference notes
│   └── sources/              # Source PDFs/texts (when permitted)
├── theories/                 # Child theories (recursive)
├── tools/                    # Executable artifacts (scripts, validators)
├── lean/                     # Formal verification (when applicable)
└── research.toml             # Toolkit configuration (FARS, build, validators)
```

### Key Distinctions - **Staging areas**: Directories on the way to becoming theories (may have some but not all theory features) - **Containers**: Directories that organize child theories without making structural commitments of their own (no concepts/objects/morphisms/etc.) - **Theories**: Directories meeting the discipline criteria with recognizable subject matter and commitments

### Observations from the Corpus I examined several theory directories including: - predication-categories (humanities/math/categories/predication-categories) - a fully worked exemplar - agential-orchestration-platform and its child flatfile-agentic-resource-system (in predicated-computing) - demonstrating the layout most fully - Many directories show partial layouts (concepts but no questions, theorems but no examples) requiring per-directory judgment about their status

## Interesting Connections Noticed 1. **Recursive Structure**: The theory discipline applies recursively - child theories inherit the same structural expectations as parents 2. **Frontmatter Relations**: The dependencies between notes (depends-on, realizes, instantiates, etc.) form a directed graph that enables topological traversal for sound reading orders 3. **Questions as Drivers**: The questions/ directory holds "load-bearing questions whose answers determine what the curation discipline is" - suggesting questions drive theory development more than answers 4. **Migration Pathways**: There are explicit mechanisms for term-to-typed migration and theory promotion, allowing ideas to mature from informal notes to formal theory status 5. **Split Between Theory and Practice**: Theories connect to executable artifacts via tools/ directories and formal verification via lean/, bridging abstract structure with concrete implementation

## Questions That Arose 1.
How does the theory discipline handle theories that span multiple traditional disciplines (e.g., socio-technical systems)?
2.
What determines when a concept note should be promoted to an object note versus remaining as a concept?
3.
How are conflicting theories handled within the same corpus - is there a mechanism for theory comparison or synthesis?
4.
What role do narratives play in theory development compared to more formal note types like theorems or concepts?
5.
How does the system balance the need for structural coherence with the openness required for exploratory work in early-stage theories?

## Follow-Up Tasks and Recommendations 1. **Deep Dive**: Examine a specific theory in detail (like predication-categories) to see how all the note types interrelate in practice 2. **Tool Development**: Look at existing tools/ directories in theories to understand what kinds of executable artifacts accompany theoretical work 3. **Question Analysis**: Study the questions/ directories in mature theories to understand what kinds of questions drive theoretical progress 4. **Cross-Theory Links**: Investigate how theories reference each other - particularly the cross-references mentioned in the promotion criteria (parent's concepts realized at sub-directory's value-domain) 5. **Practical Application**: Consider how this theory discipline might be applied beyond the research corpus to other knowledge collections or organizational knowledge systems

The exploration revealed a sophisticated, intentional approach to knowledge curation that treats theories as first-class entities with explicit structural requirements, while maintaining flexibility for different stages of theoretical development.
