#!/usr/bin/env node
// One-time migration script. Reads the legacy single-file roadmap.yaml in the
// toy's root and splits it into per-record .md files under programs/, tasks/,
// objects/, morphisms/. Each record's YAML payload becomes the file's
// frontmatter. After this script runs and validate.mjs passes, the legacy
// roadmap.yaml should be deleted.
//
// The "phase" field on tasks (via their milestone) maps to a "program" field;
// kernel and sdk are programs alongside the others. Milestones from the legacy
// file are dropped — milestones are derived by topo-sort.mjs at read time.
//
// The script does NOT invent field declarations for objects (most current
// objects carry only a description). Empty fields lists are written; the
// find-gaps.mjs report flags these as authoring gaps to fill in subsequent
// passes.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const here = dirname(fileURLToPath(import.meta.url));
const roadmapRoot = join(here, '..');
const oldYamlPath = join(roadmapRoot, 'roadmap.yaml');

// Phase (legacy) → program (new) mapping. Multiple phases may collapse into
// one program; kernel and sdk in particular absorb several.
const phaseToProgram = {
  'boot': 'kernel',
  'operational-kernel': 'kernel',
  'sovereign-federation': 'kernel',
  'daily-driver-replacement': 'bundled-userland',
  'physical-world-bound': 'industrial-control',
  'industrial-control-deployment': 'industrial-control',
  'confederate-productivity-stack': 'confederate-productivity-stack',
  'persona-publishing-and-content-mill': 'persona-publishing',
  'dao-and-on-chain-participation': 'dao-participation',
  'continuous-learning': 'sdk',
  'self-developing-os': 'sdk',
  'self-developing-mathematics': 'sdk',
  'predication-world-sim': 'paracosmic-emulator',
  'semioverse-navigation': 'paracosmic-emulator',
  'confederate-erp': 'confederate-erp',
  'ecological-monitoring': 'ecological-monitoring',
  'healthcare-coordination': 'healthcare-coordination',
  'mutual-aid-and-disaster-response': 'mutual-aid-and-disaster-response',
  'educational-infrastructure': 'educational-infrastructure',
  'creative-tools': 'creative-tools',
  'character-and-identity-system': 'sdk',
  'tool-surfaces': 'sdk',
  'corpus-curation-and-audit': 'sdk',
  'drone-swarm-specifics': 'sdk',
  'knowledge-organization-and-vocabulary': 'sdk',
};

// Synthesized program records for kernel and sdk, since they don't have a
// single legacy phase whose description we can carry. The other programs
// inherit description from their legacy phase record.
const synthesizedPrograms = {
  kernel: {
    name: 'Kernel',
    description: "The OS's foundational machinery — cell-record type, canonical-JSON serializer, SHA-256 content addressing, the append-only event log, presheaf-indexed cell storage projecting by (entity, stratum, peer, session, event-ordinal), the sigma-pass and delta-pass closure engines, the capability resolver implementing the right-residual operator, the cost-quantale, the respond primitive, the session supervisor, and the boot sequence from power-on through bootloader through kernel-initialization through source-cell loading to the emitted ready cell. Without the kernel, nothing runs.",
    status: 'in-progress',
  },
  sdk: {
    name: 'SDK',
    description: "Developer-facing capabilities — the character system (boundaries, identities, personas, personnel, offices, characters), tool surfaces (HTTP and WebSocket, MCP server, CLI and TUI), corpus curation and audit tooling, the FARS lint as a closure operator, the Diátaxis four-mode prose discipline, the application development surface (capability API, Nix-flake or Guix-manifest package format, Ed25519 signing, fuel-budgeted isolation), the continuous-learning pipeline, the self-developing-OS loop, the self-developing-mathematics pipeline, and drone-swarm specifics (formation control, ADMM distributed optimization, centralized-training-decentralized-execution multi-agent RL, federated learning).",
    status: 'planning',
  },
  'paracosmic-emulator': {
    name: 'Paracosmic Emulator',
    description: "A multiplayer terminal world where the cell store IS the game world. The Karst setting (named star systems and lineages each teaching a different morphism class) is authored as substrate content. Combat is claim-injection — an attacker fires a morphism-shaped predication into a target's scope and the target's closure rules resist. Death triggers Padovan-ticked spore-respawn. Anastomosis is federation at captain scope. The program also exposes look/go/find navigation as MCP tools and hosts the transcript-watcher office plus the Jadepol bridge-companion agent.",
    status: 'speculative',
  },
  'bundled-userland': {
    name: 'Bundled Userland',
    description: "The captain's personal daily-driver tools running on the OS rather than on Asana, Todoist, Linear, Obsidian, Google, Apple — email-client (SMTP and IMAP), chat-client (XMPP, IRC, Matrix), calendar-client (CalDAV), ledger-tool with double-entry accounting, file-browser, text-editor, terminal, calculator. Each as a nucleus on the cell store.",
    status: 'planning',
  },
  'industrial-control': {
    name: 'Industrial Control',
    description: "MQTT and Modbus drivers, sensor and actuator record types, an outpost OS image bootable on Raspberry Pi or equivalent edge hardware federating selectively back to the ship. Weather-aware closure rules for irrigation (the captain's first named physical binding is a soil-moisture sensor with a pump controller). Drone supervisory control gated by Hamilton-Jacobi reachability and Control-Barrier-Function safe-envelope prechecks plus captain-witnessed meaningful-human-control authorization. Print-farm fabrication dispatch under the multi-dimensional cost-quantale.",
    status: 'speculative',
  },
};

const data = yaml.load(await readFile(oldYamlPath, 'utf-8'));

await mkdir(join(roadmapRoot, 'programs'), { recursive: true });
await mkdir(join(roadmapRoot, 'tasks'), { recursive: true });
await mkdir(join(roadmapRoot, 'objects'), { recursive: true });
await mkdir(join(roadmapRoot, 'morphisms'), { recursive: true });

// Build milestone -> program map (so tasks can resolve their program).
const milestoneToProgram = new Map();
for (const m of data.milestones || []) {
  const phase = m.phase;
  const program = phaseToProgram[phase] || phase;
  milestoneToProgram.set(m.slug, program);
}

// Collect program metadata. Each legacy phase contributes to its mapped program;
// kernel/sdk/etc. get synthesized descriptions if not already covered.
const programRecords = new Map();
for (const phase of data.phases || []) {
  const program = phaseToProgram[phase.slug] || phase.slug;
  if (!programRecords.has(program)) {
    programRecords.set(program, {
      slug: program,
      name: phase.name || program,
      description: phase.description || '',
      status: phase.status || 'planning',
    });
  }
}
// Override with synthesized descriptions where present
for (const [slug, p] of Object.entries(synthesizedPrograms)) {
  programRecords.set(slug, {
    slug,
    name: p.name,
    description: p.description,
    status: p.status,
  });
}

function writeFrontmatter(path, fm) {
  const dumped = yaml.dump(fm, { lineWidth: -1, noRefs: true });
  return writeFile(path, `---\n${dumped}---\n`);
}

// Write program files
for (const [slug, p] of programRecords) {
  await writeFrontmatter(
    join(roadmapRoot, 'programs', `${slug}.md`),
    {
      name: p.name,
      description: p.description,
      status: p.status,
    }
  );
}

// Walk tasks, extract object/morphism descriptions, write task files
const objectRecords = new Map();
const morphismRecords = new Map();

for (const task of data.tasks || []) {
  const program = milestoneToProgram.get(task.milestone) || 'unknown';

  const addsObjectSlugs = [];
  for (const o of task.adds?.objects ?? []) {
    if (typeof o === 'string') {
      addsObjectSlugs.push(o);
    } else if (o && o.slug) {
      addsObjectSlugs.push(o.slug);
      if (!objectRecords.has(o.slug)) {
        objectRecords.set(o.slug, {
          slug: o.slug,
          description: o.description || '',
          program,
          addedBy: task.slug,
        });
      }
    }
  }

  const addsMorphismSlugs = [];
  for (const m of task.adds?.morphisms ?? []) {
    if (typeof m === 'string') {
      addsMorphismSlugs.push(m);
    } else if (m && m.slug) {
      addsMorphismSlugs.push(m.slug);
      if (!morphismRecords.has(m.slug)) {
        let inputs = [];
        if (Array.isArray(m.source)) {
          inputs = m.source.map((s, i) => ({ name: `arg${i + 1}`, type: s }));
        } else if (m.source) {
          inputs = [{ name: 'arg1', type: m.source }];
        }
        morphismRecords.set(m.slug, {
          slug: m.slug,
          description: m.description || '',
          program,
          addedBy: task.slug,
          inputs,
          output: m.target ? { type: m.target } : null,
        });
      }
    }
  }

  await writeFrontmatter(
    join(roadmapRoot, 'tasks', `${task.slug}.md`),
    {
      name: task.slug,
      description: task.description || '',
      program,
      requires: {
        objects: task.requires?.objects ?? [],
        morphisms: task.requires?.morphisms ?? [],
      },
      adds: {
        objects: addsObjectSlugs,
        morphisms: addsMorphismSlugs,
      },
      'capability-delta': task['capability-delta'] || '',
    }
  );
}

// Write object files
for (const [slug, obj] of objectRecords) {
  await writeFrontmatter(
    join(roadmapRoot, 'objects', `${slug}.md`),
    {
      name: slug,
      description: obj.description,
      program: obj.program,
      'added-by-task': obj.addedBy,
      fields: [],
    }
  );
}

// Write morphism files
for (const [slug, m] of morphismRecords) {
  await writeFrontmatter(
    join(roadmapRoot, 'morphisms', `${slug}.md`),
    {
      name: slug,
      description: m.description,
      program: m.program,
      'added-by-task': m.addedBy,
      inputs: m.inputs,
      output: m.output,
    }
  );
}

console.log(`migration complete:`);
console.log(`  programs: ${programRecords.size}`);
console.log(`  tasks: ${(data.tasks || []).length}`);
console.log(`  objects: ${objectRecords.size}`);
console.log(`  morphisms: ${morphismRecords.size}`);
console.log(``);
console.log(`next steps:`);
console.log(`  1. run scripts/validate.mjs to confirm cross-references resolve`);
console.log(`  2. run scripts/find-gaps.mjs to see the type-graph and field-authoring gaps`);
console.log(`  3. delete roadmap.yaml`);
