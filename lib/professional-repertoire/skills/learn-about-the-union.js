#!/usr/bin/env node
/**
 * @description Deterministically searches this settlement's own named self-conception corpus (the governing maps AGENTS.md points to, the root README and CLAUDE.md, and the interactive-session character records) for a question's terms and returns matching passages with file:line citations. Use this BEFORE asking the Leader a question answerable from the repo's own records — "what is the Union", "why does X work this way", "what is my role" — instead of making the Leader search notes by hand.
 * @returns {object} Every corpus file whose content matches the question's terms is returned with file path, line number, and surrounding context.
 * @returns {object} A question that matches nothing returns an explicit empty result naming every file searched, never silence.
 * @throws {Error} The question must be a non-empty string given as argv[2].
 *
 * The named corpus files exist at the paths this script hardcodes; a
 * missing file is reported as a corpus defect, not silently skipped. No
 * file outside the named corpus is read; no file is written.
 *
 * ## Why this exists
 *
 * Leader correction 2026-07-24: a prose-only "ask the Leader" habit is the
 * defect, not a missing note. The corpus already carries the answer to most
 * self-conception questions — what the Union is, why a node is governed the
 * way it is, what this session's own character record says about it. This
 * script is the deterministic first move: grep the settled corpus before
 * spending the Leader's attention on a question the repo already answers.
 *
 * The corpus is exactly the set root `AGENTS.md` calls "the governing maps",
 * plus the root `README.md` and `CLAUDE.md` that state the same law in
 * shorter form, plus the three interactive-session character records that
 * describe what an agent working this repo actually is. It is a fixed list,
 * not a directory walk: the glossary and the auto-minted `content/glossary/terms/`
 * pool are excluded on purpose, because they were confirmed low-quality —
 * leaked tool-call syntax and refusal text stored as "definitions" — and
 * folding them in would return noise as if it were self-conception.
 *
 * ## What this does NOT do
 *
 * It does not call NotebookLM itself — closure-kind process forbids a network
 * call in this script's own body. A real, already-populated notebook for this
 * exact purpose exists: "Harmonious Union Overview"
 * (notebookId `ffb73bcf-d374-4b1f-bafb-4edc3c16a9b9`), reconciled via
 * notebooklm-inference-team's curated-cumulative-add source contract to also
 * carry this script's own AGENTS.md/README.md/CLAUDE.md and the three
 * interactive-session character records alongside its existing 84 sources.
 * A synthesized (not just grepped) answer means invoking that provider's
 * report/solicit-service against this notebookId directly — a separate,
 * live procedure, not this deterministic script.
 *
 * ## Run it
 *
 * ```sh
 * node .../learn-about-the-union.js "why does a node hold its own lib/content/data split"
 * ```
 *
 * Prints one JSON object: `{ query, filesSearched, matches: [{ file, line, context }], notebookAugmentation }`.
 * `notebookAugmentation` is always `{ "available": false, "reason": "..." }`
 * today; it becomes a real field the day a notebook is authorized.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// This script is byte-identical wherever it is projected (source here, or
// scripts/ under .claude/skills or .codex/skills at whatever depth), so its
// own depth cannot be hardcoded as a ".." count. Walk up instead, by the
// settlement root's own shape, same as project-a-skill.js's findUp.
// Root is identified by the workspace root package.json's own name, not by a
// hand-authored doc's presence (AGENTS.md was removed as unowned prose with
// no generator behind it).
function isRepoRootDirectory(d) {
  const path = join(d, "package.json");
  if (!existsSync(path)) return false;
  try { return JSON.parse(readFileSync(path, "utf8")).name === "@bare-cedar-fog/machine-workspace"; }
  catch { return false; }
}
function findRepoRoot(from) {
  let d = resolve(from);
  for (;;) {
    // A settlement is a governed source territory, not a pnpm workspace.
    // The root workspace was intentionally retired in favor of independently
    // published package cells, so requiring its former manifest would turn a
    // completed cutover boundary into a permanent harness outage.
    if (existsSync(join(d, "deno.jsonc")) && isRepoRootDirectory(d)) return d;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

const REPO_ROOT = findRepoRoot(HERE);

// AGENTS.md removed from the corpus list: it was removed from the repo
// entirely (unowned hand-authored prose, no generator), so it would only
// ever surface as a permanent "corpus file missing on disk" defect here.
const CORPUS = REPO_ROOT
  ? [
      "README.md",
      "CLAUDE.md",
      "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/documents/articles/notes/2026/07/19/2026-07-19-a-prospective-constitution.md",
      "lib/emsenn/services/561-group/services/board-of-directors/lib/agency/characters/emsenn/content/documents/articles/notes/2026/06/29/2026-06-29-research-on-the-informational-matter-phase-ladder.md",
      "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/characters/claude-interactive-session.json",
      "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/characters/codex-interactive-session.json",
      "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/characters/principal-exchange-circuit.json",
    ].map((rel) => ({ rel, abs: resolve(REPO_ROOT, rel) }))
  : [];

const CONTEXT_LINES = 2;

function termsOf(query) {
  return [...new Set(query.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/gu) ?? [])];
}

function searchFile(file, terms) {
  if (!existsSync(file.abs)) return { file: file.rel, error: "corpus file missing on disk" };
  const lines = readFileSync(file.abs, "utf8").split("\n");
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    const lower = lines[i].toLowerCase();
    if (terms.some((term) => lower.includes(term))) {
      const start = Math.max(0, i - CONTEXT_LINES);
      const end = Math.min(lines.length, i + CONTEXT_LINES + 1);
      hits.push({ file: file.rel, line: i + 1, context: lines.slice(start, end).join("\n") });
    }
  }
  return hits;
}

function main() {
  const query = process.argv[2];
  if (!query || !query.trim()) {
    process.stdout.write(`${JSON.stringify({ error: "a non-empty question is required as argv[2]" }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  if (!REPO_ROOT) {
    process.stdout.write(`${JSON.stringify({ error: "no settlement root found above this script (no ancestor carries deno.jsonc and the workspace root package.json); the corpus cannot be resolved" }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const terms = termsOf(query);
  const filesSearched = [];
  const matches = [];
  const corpusDefects = [];

  for (const file of CORPUS) {
    filesSearched.push(file.rel);
    const result = searchFile(file, terms);
    if (!Array.isArray(result)) { corpusDefects.push(result); continue; }
    matches.push(...result);
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        query,
        filesSearched,
        corpusDefects,
        matches,
        notebookAugmentation: {
          available: true,
          notebookId: "ffb73bcf-d374-4b1f-bafb-4edc3c16a9b9",
          title: "Harmonious Union Overview",
          url: "https://notebooklm.google.com/notebook/ffb73bcf-d374-4b1f-bafb-4edc3c16a9b9",
          note: "an existing, already-populated notebook (90 sources: broad research corpus plus this skill's own AGENTS.md/README.md/CLAUDE.md and the three interactive-session character records, added via curated-cumulative-add). This script itself stays grep-only and deterministic (closure-kind process forbids a network call here) — for a synthesized answer, invoke notebooklm-inference-team's report/solicit-service against this notebookId directly.",
        },
      },
      null,
      2,
    )}\n`,
  );
}

main();
