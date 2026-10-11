---
name: value-is-not-part-of-a-cell
description: "A predication cell is the triple (s, p, o) — period. Its value is NOT part of the cell. Value lives in the predication fiber algebra A_p; a valuation v assigns elements of A_p to predicates, and v(p) evaluates at (s, o) to give the cell's value. Cell and value live in different parts of the predication category. Returning {s, p, o, value} from a 'get-the-cell' operation is mathematically wrong — it conflates the cell-as-position with one valuation's image at that position."
---

A [predication-cell](../../561/code/structures/predication-cell.md) is the oriented triple $(s, p, o)$ — that is the entire structure.
The cell is *the carrier of an assertion-position*; it is an index into the predication cell set.
The value at the cell is a separate mathematical object that lives in the [predication-fiber-algebra](../../561/code/structures/predication-fiber-algebra.md) $A_p$.

A [predication-valuation](../../561/code/structures/predication-valuation.md) $v$ assigns each predicate $p$ an element $v(p) \in A_p$; that element evaluates at the entity-pair $(s, o)$ to give the cell's value $v(p)(s, o)$. **Many valuations can be defined on the same cell.** The cell is invariant; the value is what some valuation does to the cell.

**Why:** The cell-as-position vs. value-as-contents distinction is exactly the distinction between addresses and contents in memory, between coordinates and function values, between a spreadsheet cell B7 and what's currently typed into B7.
If you put the value inside the cell, the cell's identity becomes valuation-dependent — different callers under different valuations get "different cells" at the same coordinates, and identity collapses.
The whole fibration apparatus that PCT builds (fiber algebra, valuation, fibration, hyperdoctrine) exists *because* values and positions are separable, and conflating them defeats the categorical structure that makes the substrate work.

The analogy that landed: saying "value: t" is part of a predication cell is like saying the number 7 includes apple pie.
Apple pie is what some function might return at 7; it is not a constituent of the number.

**How to apply:**

- When writing a script or skill that "returns a predication cell," return $\{subject, predicate, object\}$.
  No `value` field.
  No `source` field.
  No `representation` field.
  The cell is its three coordinates.
- If a skill needs to return both a cell *and* a value (because some valuation has been evaluated), the return shape is a pair $\{cell, value\}$ where `cell` and `value` are sibling fields — not a flattened cell-with-value-baked-in.
  Even better, name the operation differently (`evaluating-a-cell`, not `getting-a-cell`) so the type signature reflects that two distinct objects are being returned.
- Operations that interrogate the substrate's implicit register (frontmatter fields) to determine values are *evaluating-against-a-valuation* operations, not *getting-the-cell* operations.
  They require earning the [predication-valuation](../../561/code/structures/predication-valuation.md) structure, the implicit-register-to-$A_p$ morphism, and an [evaluating](../../561) transformer — none of which is yet earned at the substrate.
- Provenance, source-records, retrieval-timestamps, witness chains are also NOT part of the cell.
  They belong to a separate (also not-yet-earned) witness apparatus — possibly a witness fibration over cells, possibly a comma category of cells-with-witnesses, but a separate mathematical object.
  Do not bolt them into the cell's structure.
- When tempted to "return a richer object" to make the script useful, stop.
  Ask: what mathematical object is this skill supposed to return?
  Return that.
  If the skill is `getting-a-$X$`, the return is the $X$, with the structure $X$ actually has — not $X$ plus useful-seeming extras.

This connects to the recurring failure mode [[transformers-are-earned-not-declared]] and [[no-polity-framing-in-definitions]]: substrate apparatus must be earned categorically before being implemented.
Declaring fields in a JSON schema is a way of declaring substrate structure; doing so for unearned apparatus contaminates downstream work.
