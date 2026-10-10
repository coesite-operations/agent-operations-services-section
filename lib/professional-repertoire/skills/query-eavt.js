#!/usr/bin/env node
/**
 * @description Answers a triple-pattern (datalog-style conjunctive) query over the rows project-pools-to-eavt.js projects from the content pools — SPARQL-Basic-Graph-Pattern-equivalent semantics (variables as ?x strings unified by shared name across patterns, constants matched exactly), deliberately bounded rather than a general SPARQL engine per the protocol-allocation decision's own refusal of one. Use wherever an instrument presently re-derives a cross-pool question (which dispatches name which office, which requirements carry from-idea) by hand-walking directories, so the derivation becomes one conjunction of patterns instead of a bespoke scan.
 *
 * @returns {Array} every returned binding satisfies every pattern in the conjunction, simultaneously, over the same row set
 * @returns {Array} a variable bound once is unified, never rebound to a second value within one solution
 * @throws {Error} the query names at least one pattern, each a 3-element array of [entity, attribute, value] terms
 * @throws {Error} every term is either a JSON scalar (constant, matched exactly) or a string starting with ? (a variable)
 *
 * ## What this deliberately is not
 *
 * The protocol-allocation decision (protocol-allocation-for-the-orchestration-platform)
 * refuses a full triplestore/SPARQL server outright — "it solves a
 * query-expressiveness problem this platform does not have, at the cost of
 * an infrastructure dependency." This is that refusal, kept: no OPTIONAL, no
 * FILTER, no property paths, no UNION, no aggregation, no persistence, no
 * server. A conjunctive query is join-of-patterns and nothing else — the
 * same bound the prior art's own Datalog/Triple-Pattern-Fragments notes
 * describe choosing over a general engine.
 *
 * ## The evaluator, honestly
 *
 * Naive nested-loop join: for each pattern in turn, extend every partial
 * binding by every row that matches it under the bindings already fixed.
 * This is O(patterns × rows^patterns) in the worst case and carries no
 * index — correct semantics (SPARQL-BGP-equivalent joins via shared-variable
 * unification), not a fast one. Fine at this platform's present scale
 * (thousands of rows); the moment it is not, that is itself the forcing
 * case a heavier engine would need, and not before.
 *
 * ## Run it
 *
 * ```sh
 * echo '{"patterns":[["?d","/task","?t"],["?d","/office","?o"]]}' \
 *   | node .../query-eavt.js --root <repo>
 *
 * node .../query-eavt.js --root <repo> --patterns '[["?d","/task","?t"],["?d","/office","?o"]]'
 * ```
 *
 * Input is JSON (stdin, or `--patterns` inline). Output is JSON: every
 * satisfying binding, and the row count queried over. Rows are produced by
 * IMPORTING project-pools-to-eavt.js's own unfoldPools — never a private
 * re-projection — so a query and the codec it reads can never disagree
 * about what a row is.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **No patterns, or a pattern that is not a 3-element array** — refused,
 *   named. A query with nothing to join is not a query.
 * - **A term that is neither a JSON scalar nor a ?variable string** —
 *   refused. An object or array constant cannot be matched exactly against
 *   an EAVT row's own leaf-only values, and admitting one silently would
 *   make it match nothing, forever, with no signal why.
 *
 * ## When NOT to use
 *
 * - Not for writing anything — this only reads project-pools-to-eavt.js's
 *   projection; it holds no pool, no schema, no write path.
 * - Not for a query needing OPTIONAL, FILTER, negation, or aggregation —
 *   deliberately out of scope, per the decision this instrument answers to.
 */

import { readFileSync } from "node:fs";
import { unfoldPools } from "./project-pools-to-eavt.js";

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

function die(message) {
  out({ ok: false, error: message }, 1);
}

const isVariable = (term) => typeof term === "string" && term.startsWith("?");

function validatePattern(pattern, i) {
  if (!Array.isArray(pattern) || pattern.length !== 3) {
    return `patterns[${i}] is not a 3-element [entity, attribute, value] array: ${JSON.stringify(pattern)}`;
  }
  for (const [j, term] of pattern.entries()) {
    if (isVariable(term)) continue;
    if (term === null || ["string", "number", "boolean"].includes(typeof term)) continue;
    return `patterns[${i}][${j}] is neither a JSON scalar nor a ?variable: ${JSON.stringify(term)}`;
  }
  return null;
}

/** Does one EAVT row [e,a,v,t] match a [e,a,v] pattern under bindings? Returns the extended bindings, or null. */
function matchPattern(row, pattern, bindings) {
  const next = { ...bindings };
  for (let i = 0; i < 3; i++) {
    const term = pattern[i];
    const value = row[i];
    if (isVariable(term)) {
      if (term in next) {
        if (JSON.stringify(next[term]) !== JSON.stringify(value)) return null;
      } else {
        next[term] = value;
      }
    } else if (JSON.stringify(term) !== JSON.stringify(value)) {
      return null;
    }
  }
  return next;
}

/**
 * Evaluate a conjunctive triple-pattern query over EAVT rows.
 * Returns the list of bindings satisfying every pattern simultaneously.
 */
export function evaluate(rows, patterns) {
  let bindingsSet = [{}];
  for (const pattern of patterns) {
    const next = [];
    for (const bindings of bindingsSet) {
      for (const row of rows) {
        const extended = matchPattern(row, pattern, bindings);
        if (extended) next.push(extended);
      }
    }
    bindingsSet = next;
  }
  return bindingsSet;
}

function main() {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      [
        "Usage:",
        '  echo \'{"patterns":[["?d","/task","?t"],["?d","/office","?o"]]}\' \\',
        "    | node query-eavt.js --root <repo>",
        "",
        "  node query-eavt.js --root <repo> --patterns '[[...]]'",
        "  node query-eavt.js --help",
        "",
        "A triple-pattern (datalog-style conjunctive) query over rows",
        "project-pools-to-eavt.js projects. Variables are ?x strings, unified",
        "by shared name across patterns; constants match exactly.",
      ].join("\n") + "\n",
    );
    return;
  }

  const root = argValue("--root") ?? process.cwd();

  let intake;
  const inline = argValue("--patterns");
  if (inline !== undefined) {
    try {
      intake = { patterns: JSON.parse(inline) };
    } catch (e) {
      die(`--patterns is not JSON: ${e.message}`);
    }
  } else {
    const input = readFileSync(0, "utf8").trim();
    if (!input) die("no query on stdin, and no --patterns given — a query is asked from data, never assumed");
    try {
      intake = JSON.parse(input);
    } catch (e) {
      die(`stdin is not JSON: ${e.message}`);
    }
  }

  const patterns = intake.patterns;
  if (!Array.isArray(patterns) || patterns.length === 0) {
    die("query has no 'patterns', or patterns is empty — a query with nothing to join is not a query");
  }
  for (const [i, pattern] of patterns.entries()) {
    const err = validatePattern(pattern, i);
    if (err) die(err);
  }

  const rows = unfoldPools(root);
  const bindings = evaluate(rows, patterns);

  out({ ok: true, patterns, rowsQueried: rows.length, count: bindings.length, bindings });
}

if (import.meta.url === `file://${process.argv[1]}`) main();
