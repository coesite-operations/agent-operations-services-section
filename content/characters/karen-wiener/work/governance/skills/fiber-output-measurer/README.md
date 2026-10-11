# Fiber Output Measurer Skill

This skill measures and validates skill outputs by comparing fiber valuations before and after skill execution.
It enables explicit observation of the "fiber elements" (possible outputs) of skills in practice.

## Purpose

The fiber output measurer addresses the question: "How can we explicitly measure or observe the 'fiber elements' (possible outputs) of a skill in practice?
Could we define output types/sets for each skill?"

It provides a practical implementation that: 1.
Uses the existing skill manifest system to declare expected outputs 2.
Measures actual outputs by comparing fiber valuations before/after execution 3.
Validates that observed outputs match declared type-tags 4.
Generates detailed measurement reports for skill developers

## Files

- `SKILL.md` - Skill documentation and metadata
- `measure-fiber-outputs.js` - Executable ESM Node.js script that performs the measurement

## Usage

```bash
# Basic usage
node measure-fiber-outputs.js ./work/governance/skills/skill-to-measure

# With custom test inputs
node measure-fiber-outputs.js ./work/governance/skills/skill-to-measure --test-inputs '{"param": "value"}'

# In advisory mode (warns instead of fails on mismatches)
node measure-fiber-outputs.js ./work/governance/skills/skill-to-measure --validation-mode advisory
```

## Integration

This skill can be used: - During skill development to verify output behavior - In automated testing pipelines for skill validation - For runtime monitoring of skill performance - As part of skill audit processes

## Related Skills

- [theoretical-compliance-auditor](../theoretical-compliance-auditor/) - Audits skills for theoretical compliance
- [working-with-fiber-valuations](../../../../tools/math/pypredcalc/work/governance/skills/working-with-fiber-valuations.md) - Fiber valuation operations
