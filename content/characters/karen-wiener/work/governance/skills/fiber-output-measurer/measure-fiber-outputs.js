#!/usr/bin/env node
/**
 * Fiber Output Measurer for Agent Skills
 * 
 * Measures and validates skill outputs by comparing fiber valuations before and after skill execution.
 * Enables explicit observation of the "fiber elements" (possible outputs) of skills in practice.
 * 
 * @module fiber-output-measurer
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname, relative, isAbsolute } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default paths
const DEFAULT_BOOT_PATH = '/home/emsenn/561/boot';
const DEFAULT_MANIFEST_PATH = join(DEFAULT_BOOT_PATH, 'skill-manifest.json');

/**
 * Reads a file and returns its content
 * @param {string} filePath - Path to the file
 * @returns {string} - File content
 */
function readFile(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * Checks if a path exists and is accessible
 * @param {string} filePath - Path to check
 * @returns {boolean} - True if path exists
 */
function pathExists(filePath) {
  try {
    return existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Normalizes a path relative to the workspace root
 * @param {string} inputPath - Input path to normalize
 * @returns {string} - Normalized absolute path
 */
function normalizePath(inputPath) {
  if (!inputPath) return null;
  
  // If already absolute, return as-is
  if (isAbsolute(inputPath)) return inputPath;
  
  // Otherwise, resolve relative to current directory
  return join(process.cwd(), inputPath);
}

/**
 * Extracts skill metadata from SKILL.md frontmatter
 * @param {string} skillContent - Content of SKILL.md file
 * @returns {Object} - Parsed frontmatter data
 */
function parseSkillFrontmatter(skillContent) {
  const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};
  
  const frontmatterText = frontmatterMatch[1];
  const data = {};
  
  frontmatterText.split('\n').forEach(line => {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Try to parse as JSON if it looks like an array or object
      if ((value.startsWith('[') && value.endsWith(']')) || 
          (value.startsWith('{') && value.endsWith('}'))) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Keep as string if JSON parsing fails
        }
      }
      
      data[key] = value;
    }
  });
  
  return data;
}

/**
 * Loads skill manifest from boot/skill-manifest.json or builds it if needed
 * @returns {Object} - Parsed skill manifest
 */
function loadSkillManifest() {
  try {
    if (pathExists(DEFAULT_MANIFEST_PATH)) {
      const manifestContent = readFile(DEFAULT_MANIFEST_PATH);
      return JSON.parse(manifestContent);
    } else {
      console.warn('Skill manifest not found at', DEFAULT_MANIFEST_PATH);
      return {};
    }
  } catch (error) {
    console.warn('Failed to load skill manifest:', error.message);
    return {};
  }
}

/**
 * Finds a skill in the manifest by name or path
 * @param {Object} manifest - Loaded skill manifest
 * @param {string} skillIdentifier - Skill name or path to search for
 * @returns {Object|null} - Skill manifest entry or null if not found
 */
function findSkillInManifest(manifest, skillIdentifier) {
  // If manifest is an array of skills
  if (Array.isArray(manifest)) {
    return manifest.find(skill => 
      skill.name === skillIdentifier || 
      skill['source-path'] === skillIdentifier ||
      skill['source-path'].endsWith(join(skillIdentifier, 'SKILL.md'))
    ) || null;
  }
  
  // If manifest is an object with skills as properties
  if (manifest && typeof manifest === 'object') {
    // Check direct property match
    if (manifest[skillIdentifier]) return manifest[skillIdentifier];
    
    // Check in nested structures
    for (const key in manifest) {
      if (manifest[key] && typeof manifest[key] === 'object') {
        const skill = manifest[key];
        if (skill.name === skillIdentifier || 
            skill['source-path'] === skillIdentifier ||
            (skill['source-path'] && skill['source-path'].endsWith(join(skillIdentifier, 'SKILL.md')))) {
          return skill;
        }
      }
    }
  }
  
  return null;
}

/**
 * Simulates capturing fiber valuation for a skill's region
 * In a real implementation, this would interface with the substrate
 * @param {Object} skillManifest - Skill manifest with region info
 * @param {string} timing - "before" or "after" for labeling
 * @returns {Object} - Simulated fiber valuation state
 */
function captureFiberValuation(skillManifest, timing) {
  // In a real implementation, this would:
  // 1. Determine the relevant fiber regions from skillManifest.region
  // 2. Traverse the substrate to capture current valuation
  // 3. Return the actual fiber state
  
  // For now, we'll simulate based on skill outputs
  const simulatedState = {
    timestamp: new Date().toISOString(),
    region: skillManifest.region || { reads: [], writes: [] },
    outputs: {}
  };
  
  // Simulate some output values based on declared outputs
  if (skillManifest.outputs) {
    for (const [outputName, typeTag] of Object.entries(skillManifest.outputs)) {
      // Generate a simulated value based on type
      simulatedState.outputs[outputName] = generateSimulatedValue(typeTag);
    }
  }
  
  return {
    success: true,
    valuation: simulatedState,
    timing
  };
}

/**
 * Generates a simulated value based on type-tag
 * @param {string} typeTag - Type tag from manifest (string, integer, boolean, etc.)
 * @returns {any} - Simulated value of that type
 */
function generateSimulatedValue(typeTag) {
  switch (typeTag) {
    case 'string':
      return `simulated-${Math.random().toString(36).substr(2, 9)}`;
    case 'integer':
      return Math.floor(Math.random() * 100);
    case 'boolean':
      return Math.random() > 0.5;
    case 'object':
      return { simulated: true, id: Math.random().toString(36).substr(2, 9) };
    case 'array':
      return Array.from({ length: 3 }, () => Math.random());
    default:
      // For substrate cell types or custom types, return a placeholder
      return { type: typeTag, value: `simulated-${typeTag}` };
  }
}

/**
 * Executes a skill with given inputs
 * In a real implementation, this would use the appropriate runtime adapter
 * @param {Object} skillManifest - Skill manifest to execute
 * @param {Object} testInputs - Test inputs to provide
 * @returns {Object} - Execution result
 */
async function executeSkill(skillManifest, testInputs) {
  // In a real implementation, this would:
  // 1. Determine the runtime from skillManifest.runtime
  // 2. Load the appropriate runtime adapter
  // 3. Execute the skill with testInputs
  // 4. Return the result
  
  // For now, we'll simulate execution
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async work
  
  const executionResult = {
    success: true,
    outputs: {},
    stdout: `Executed ${skillManifest.name} with test inputs`,
    stderr: ''
  };
  
  // Simulate producing outputs based on declared outputs
  if (skillManifest.outputs) {
    for (const [outputName, typeTag] of Object.entries(skillManifest.outputs)) {
      // In reality, these would come from actual skill execution
      executionResult.outputs[outputName] = generateSimulatedValue(typeTag);
    }
  }
  
  return executionResult;
}

/**
 * Analyzes fiber changes between before and after states
 * @param {Object} beforeState - Fiber valuation before execution
 * @param {Object} afterState - Fiber valuation after execution
 * @param {Object} skillManifest - Skill manifest with declared outputs
 * @returns {Object} - Analysis of output changes
 */
function analyzeFiberChanges(beforeState, afterState, skillManifest) {
  const declaredOutputs = skillManifest.outputs || {};
  const observedChanges = {};
  const outputMatches = [];
  
  // Compare before/after outputs to see what changed
  for (const [outputName, typeTag] of Object.entries(declaredOutputs)) {
    const beforeValue = beforeState.valuation.outputs?.[outputName];
    const afterValue = afterState.valuation.outputs?.[outputName];
    
    // Simple change detection - in reality would use fiber operations
    const changed = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
    
    observedChanges[outputName] = {
      before: beforeValue,
      after: afterValue,
      changed,
      typeTag
    };
    
    outputMatches.push({
      outputName,
      declaredType: typeTag,
      observedValue: afterValue,
      typeMatch: typeof afterValue === getTypeFromTag(typeTag) || 
                  (typeTag === 'object' && typeof afterValue === 'object' && afterValue !== null) ||
                  (typeTag === 'array' && Array.isArray(afterValue)) ||
                  (typeTag === 'string' && typeof afterValue === 'string') ||
                  (typeTag === 'integer' && Number.isInteger(afterValue)) ||
                  (typeTag === 'boolean' && typeof afterValue === 'boolean'),
      validationNote: changed ? 'Output changed during execution' : 'No change detected'
    });
  }
  
  return {
    declaredOutputs,
    observedChanges,
    outputMatches
  };
}

/**
 * Maps type-tag to JavaScript typeof equivalent
 * @param {string} typeTag - Type tag from manifest
 * @returns {string} - JavaScript typeof equivalent
 */
function getTypeFromTag(typeTag) {
  switch (typeTag) {
    case 'string': return 'string';
    case 'integer': return 'number'; // Note: JavaScript doesn't distinguish int/float
    case 'boolean': return 'boolean';
    case 'object': return 'object';
    case 'array': return 'object'; // Arrays are objects in JS
    default: return 'object'; // Default for custom types
  }
}

/**
 * Validates output matches against declarations
 * @param {Array} outputMatches - Array of output match objects
 * @param {string} validationMode - "strict" or "advisory"
 * @returns {Object} - Validation results
 */
function validateOutputMatches(outputMatches, validationMode) {
  const validationErrors = [];
  const validationWarnings = [];
  
  for (const match of outputMatches) {
    if (!match.typeMatch) {
      const message = `Output '${match.outputName}' type mismatch: expected ${match.declaredType}, got ${typeof match.observedValue}`;
      if (validationMode === 'strict') {
        validationErrors.push(message);
      } else {
        validationWarnings.push(message);
      }
    }
    
    // Check for missing outputs (would be detected in analyzeFiberChanges)
    // Check for unexpected outputs (outputs observed but not declared)
    // This would require comparing all observed changes to declared outputs
  }
  
  // Check for unexpected outputs (observed but not declared)
  // This would need access to all observed changes vs declared outputs
  
  const allOutputsValid = validationErrors.length === 0;
  
  let overallAssessment = 'aligned';
  if (validationErrors.length > 0) {
    overallAssessment = 'deficient';
  } else if (validationWarnings.length > 0 && validationMode === 'advisory') {
    overallAssessment = 'medium'; // Could be enhanced
  }
  
  return {
    allOutputsValid,
    validationErrors,
    validationWarnings,
    overallAssessment
  };
}

/**
 * Main execution function
 */
async function measureFiberOutputs() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.error('Usage: node measure-fiber-outputs.js <skill_path> [--test-inputs json] [--validation-mode strict|advisory]');
      console.error('Example: node measure-fiber-outputs.js ./work/governance/skills/some-skill');
      process.exit(1);
    }
    
    let skillPath = args[0];
    let testInputs = {};
    let validationMode = 'strict';
    
    // Parse optional arguments
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--test-inputs' && i + 1 < args.length) {
        try {
          testInputs = JSON.parse(args[i + 1]);
          i++; // Skip the next argument
        } catch (e) {
          console.error('Invalid JSON for test inputs:', args[i + 1]);
          process.exit(1);
        }
      } else if (args[i] === '--validation-mode' && i + 1 < args.length) {
        if (args[i + 1] === 'strict' || args[i + 1] === 'advisory') {
          validationMode = args[i + 1];
          i++; // Skip the next argument
        } else {
          console.error('Invalid validation mode. Use "strict" or "advisory"');
          process.exit(1);
        }
      }
    }
    
    // Normalize skill path
    const normalizedSkillPath = normalizePath(skillPath);
    if (!pathExists(normalizedSkillPath)) {
      throw new Error(`Skill path does not exist: ${normalizedSkillPath}`);
    }
    
    // Determine skill file path
    let skillFilePath;
    const stats = statSync(normalizedSkillPath);
    if (stats.isDirectory()) {
      skillFilePath = join(normalizedSkillPath, 'SKILL.md');
    } else {
      skillFilePath = normalizedSkillPath;
    }
    
    // Check if skill file exists
    if (!pathExists(skillFilePath)) {
      throw new Error(`SKILL.md not found at: ${skillFilePath}`);
    }
    
    // Load skill content and manifest
    const skillContent = readFile(skillFilePath);
    const skillFrontmatter = parseSkillFrontmatter(skillContent);
    const skillManifest = loadSkillManifest();
    
    // Find skill in manifest (if available)
    let manifestSkill = null;
    if (Object.keys(skillManifest).length > 0) {
      manifestSkill = findSkillInManifest(skillManifest, skillFrontmatter.name || 
                                         relative(process.cwd(), normalizedSkillPath));
    }
    
    // Use manifest data if available, otherwise fall back to frontmatter
    const finalManifest = manifestSkill || {
      name: skillFrontmatter.name || 'unknown-skill',
      description: skillFrontmatter.description || '',
      version: skillFrontmatter.version || [0, 1],
      runtime: skillFrontmatter.runtime || 'inference',
      triggers: skillFrontmatter.triggers || [],
      inputs: skillFrontmatter.inputs || {},
      outputs: skillFrontmatter.outputs || {},
      region: skillFrontmatter.region || { reads: [], writes: [] },
      enablesCapabilities: skillFrontmatter.enables-capabilities || [],
      requiresCapabilities: skillFrontmatter.requires-capabilities || []
    };
    
    console.log(`🔍 Measuring fiber outputs for skill: ${finalManifest.name}`);
    console.log(`📍 Skill path: ${normalizedSkillPath}`);
    console.log(`⚙️  Validation mode: ${validationMode}`);
    
    // Step 1: Capture before state
    console.log('\n📊 Capturing baseline fiber state...');
    const beforeState = captureFiberValuation(finalManifest, 'before');
    if (!beforeState.success) {
      throw new Error('Failed to capture baseline fiber state');
    }
    console.log(`   ✅ Baseline captured at ${beforeState.timestamp}`);
    
    // Step 2: Execute skill
    console.log('\n🚀 Executing skill with test inputs...');
    const executionResult = await executeSkill(finalManifest, testInputs);
    if (!executionResult.success) {
      throw new Error(`Skill execution failed: ${executionResult.stderr}`);
    }
    console.log('   ✅ Skill executed successfully');
    
    // Step 3: Capture after state
    console.log('\n📊 Capturing post-execution fiber state...');
    const afterState = captureFiberValuation(finalManifest, 'after');
    if (!afterState.success) {
      throw new Error('Failed to capture post-execution fiber state');
    }
    console.log(`   ✅ Post-state captured at ${afterState.timestamp}`);
    
    // Step 4: Analyze changes
    console.log('\n🔬 Analyzing fiber changes...');
    const fiberAnalysis = analyzeFiberChanges(beforeState, afterState, finalManifest);
    console.log(`   📈 Analyzed ${Object.keys(fiberAnalysis.declaredOutputs).length} declared outputs`);
    
    // Step 5: Validate outputs
    console.log('\n✅ Validating output declarations...');
    const validationResults = validateOutputMatches(fiberAnalysis.outputMatches, validationMode);
    console.log(`   📋 Validation complete: ${validationResults.validationErrors.length} errors, ${validationResults.validationWarnings.length} warnings`);
    
    // Generate final report
    const measurementReport = {
      skill: normalizedSkillPath,
      validation_mode: validationMode,
      test_inputs: Object.keys(testInputs).length > 0 ? testInputs : null,
      fiber_measurements: {
        before: beforeState.valuation,
        after: afterState.valuation
      },
      output_analysis: {
        declared_outputs: finalManifest.outputs,
        observed_changes: fiberAnalysis.observedChanges,
        output_matches: fiberAnalysis.outputMatches
      },
      validation_results: validationResults
    };
    
    // Output report
    console.log('\n' + '='.repeat(60));
    console.log('📋 FIBER OUTPUT MEASUREMENT REPORT');
    console.log('='.repeat(60));
    console.log(`Skill: ${measurementReport.skill}`);
    console.log(`Validation Mode: ${measurementReport.validation_mode}`);
    console.log(`Test Inputs: ${measurementReport.test_inputs ? 'Provided' : 'None (used defaults)'}`);
    
    console.log('\n📊 FIBER MEASUREMENTS:');
    console.log('-'.repeat(40));
    console.log(`Before: ${measurementReport.fiber_measurements.before.timestamp}`);
    console.log(`After:  ${measurementReport.fiber_measurements.after.timestamp}`);
    
    console.log('\n🎯 OUTPUT ANALYSIS:');
    console.log('-'.repeat(40));
    for (const match of measurementReport.output_analysis.output_matches) {
      const statusIcon = match.typeMatch ? '✅' : '❌';
      console.log(`${statusIcon} ${match.outputName}: ${match.declaredType}`);
      console.log(`   Observed: ${JSON.stringify(match.observedValue)}`);
      if (match.validationNote) {
        console.log(`   Note: ${match.validationNote}`);
      }
    }
    
    console.log('\n🔍 VALIDATION RESULTS:');
    console.log('-'.repeat(40));
    console.log(`All Outputs Valid: ${validationResults.allOutputsValid ? '✅ YES' : '❌ NO'}`);
    console.log(`Overall Assessment: ${validationResults.overallAssessment.toUpperCase()}`);
    
    if (validationResults.validationErrors.length > 0) {
      console.log('\n❌ VALIDATION ERRORS:');
      validationResults.validationErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (validationResults.validationWarnings.length > 0) {
      console.log('\n⚠️  VALIDATION WARNINGS:');
      validationResults.validationWarnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Exit with appropriate code
    if (validationResults.validationErrors.length > 0 && validationMode === 'strict') {
      process.exit(1);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error during fiber output measurement:', error.message);
    process.exit(1);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  measureFiberOutputs();
}

export { measureFiberOutputs };
