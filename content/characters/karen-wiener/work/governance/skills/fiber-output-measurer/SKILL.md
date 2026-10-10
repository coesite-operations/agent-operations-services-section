---
name: fiber-output-measurer
description: Measures and validates skill outputs by comparing fiber valuations before and after skill execution
---

# fiber-output-measurer

Measures and validates skill outputs by comparing fiber valuations before and after skill execution.
This skill enables explicit observation of the "fiber elements" (possible outputs) of skills in practice by leveraging the substrate's fiber valuation system and skill manifest declarations.

## When to call this skill

- When designing or updating a skill to verify its output behavior matches declarations
- During skill testing to ensure outputs conform to declared type-tags
- For runtime monitoring of skill behavior in agent systems
- When debugging unexpected skill outputs
- To validate that skill compositions are compatible based on output/input matching
- As part of skill audit processes to verify contractual compliance

## When NOT to call this skill

- For checking skill syntax or formatting only: use lint-skills or similar
- For measuring skill performance or execution time: use benchmarking tools
- For determining skill utility or usefulness: use user feedback or usage analytics
- For checking skill dependencies: use dependency analysis tools

## Inputs

| Input | Type | Required | Description |
|---|---|---|---|
| `skill_path` | path | yes | Path to the skill directory containing SKILL.md or to the SKILL.md file directly |
| `test_inputs` | object | no | Optional test inputs to provide to the skill during measurement. If omitted, uses skill's default test scenario |
| `validation_mode` | string | no | Validation strictness: "strict" (fail on mismatches) or "advisory" (warn on mismatches). Default: "strict" |

## Outputs

| Output | Type | Description |
|---|---|---|
| `measurement_report` | object | Detailed report of fiber output measurements including before/after states, changes observed, and validation results |

Measurement report structure:
```
{
  "skill": "<path to skill measured>",
  "validation_mode": "<strict|advisory>",
  "test_inputs": "<provided test inputs or null>",
  "fiber_measurements": {
    "before": {
      "valuation": "<fiber valuation state before execution>",
      "timestamp": "<execution timestamp>",
      "success": true|false
    },
    "after": {
      "valuation": "<fiber valuation state after execution>", 
      "timestamp": "<execution timestamp>",
      "success": true|false
    }
  },
  "output_analysis": {
    "declared_outputs": "<outputs declared in skill manifest>",
    "observed_changes": "<changes detected in fiber valuation>",
    "output_matches": [
      {
        "output_name": "<name of output>",
        "declared_type": "<type-tag from manifest>",
        "observed_value": "<actual value observed>",
        "type_match": true|false,
        "validation_note": "<any validation issues>"
      }
    ]
  },
  "validation_results": {
    "all_outputs_valid": true|false,
    "validation_errors": ["<list of validation errors if any>"],
    "validation_warnings": ["<list of validation warnings if any>"],
    "overall_assessment": "aligned|deficient|excessive|contradicted"
  }
}
```

## Algorithm

### 1. Load and Parse the Skill Manifest

Read the SKILL.md file at the provided skill_path.
Extract: - Skill name, description, version - Declared inputs and outputs from manifest - Runtime information - Region (reads/writes) for sandbox considerations

### 2. Establish Baseline Fiber State

Before skill execution: - Identify the relevant fiber regions based on skill's declared reads/writes - Capture initial fiber valuation state for those regions - Record timestamp and confirm successful capture

### 3. Execute Skill with Test Inputs

- Prepare test inputs (either provided or default)
- Execute the skill using the appropriate runtime adapter
- Capture execution results and any errors
- Record post-execution timestamp

### 4. Capture Post-Execution Fiber State

After skill execution: - Capture fiber valuation state for the same regions - Record timestamp and confirm successful capture - Ensure isolation from other system changes during measurement window

### 5. Analyze Fiber Changes

Compute the difference between before/after valuations: - Use fiber operations (restrict, extend, meet, join) to isolate changes - Map observed changes to skill's declared output names - Extract actual values for each declared output

### 6. Validate Against Manifest Declarations

For each declared output: - Check if observed change corresponds to output name - Validate observed value type against declared type-tag - Note any mismatches, missing outputs, or unexpected outputs - Apply validation mode (strict vs advisory) to determine severity

### 7. Generate Measurement Report

Compile all findings into structured report: - Detail before/after fiber states - Show declared vs observed outputs - Provide validation results with errors/warnings - Include overall assessment aligned with audit-resource-quality pattern

## Edge Cases

- **Skill has no declared outputs**: Report that no outputs were declared to measure
- **Skill fails to execute**: Report execution failure and inability to measure outputs
- **Fiber regions unavailable**: Handle gracefully if declared reads/writes regions don't exist
- **Concurrent modifications**: Attempt to minimize measurement window to reduce interference
- **Non-deterministic skills**: Note in report if multiple executions would be needed for statistical validity
- **Advisory skills**: For skills with null runtime, report that measurement isn't applicable

## See Also

- [audit-theoretical-compliance](../../theoretical-compliance-auditor/SKILL.md) - For theoretical compliance auditing
- [audit-resource-quality](../../../../work/governance/skills/math/audit-resource-quality/SKILL.md) - Pattern for compliance auditing
- [working-with-fiber-valuations](../../../../tools/math/pypredcalc/work/governance/skills/working-with-fiber-valuations.md) - Fiber valuation operations
- [skill-manifest](../../../../tools/platform/pypredcomp/docs/dev/specs/stdlib/skill-manifest.md) - Skill manifest specification
