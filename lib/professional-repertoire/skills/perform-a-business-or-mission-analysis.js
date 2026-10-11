#!/usr/bin/env node
/**
 * @description Produces and validates a business-or-mission-analysis record — ISO/IEC/IEEE 15288:2023 §6.4.1, the first process of Concept Definition, the one that defines the problem or opportunity space and characterizes candidate solution classes ahead of any organization-level ConOps committing to one of them. Default mode validates a record against the process's mechanizable outcomes: the record is a CloudEvents 1.0 envelope (JSON format) carrying a W3C DID-core identifier naming whose analysis it is, and its data holds a problem-or-opportunity space stated as claims that can fail, candidate solution classes characterized, traceability toward the organization-level ConOps, and stakeholder/environment context — printing the refusals that resist mechanization as the unmechanized remainder. --scaffold emits a skeleton. Use when a firm-level or program-level conceptualization capability must put its problem space and candidate solutions on the record before an organization ConOps commits to one, or when a solution is being chosen with no record of the wider space it was chosen from.
 *
 * @param {string} scaffold - the target path does not already exist, since a scaffold never overwrites a record
 * @returns {object} every mechanizable outcome of 15288 §6.4.1 was checked and reported with FULL or PARTIAL coverage, and the exit code derives from the checks, never from an assertion
 * @returns {object} the refusals that resist mechanization were printed as the unmechanized remainder, so a green run states what it did not check
 * @throws {Error} in default mode, the given path names a JSON file that exists and parses as one JSON value
 *
 * A business-or-mission-analysis (BMA) is the process 15288:2023 §6.4.1 puts
 * before every other act of Concept Definition: define the problem or
 * opportunity space, characterize the candidate solution classes that might
 * address it, and only then let an organization-level ConOps (29148) commit
 * to one of them. Skipped, the ConOps is written directly against whichever
 * solution a session already favored, with no record of the wider space it
 * was chosen from or why the alternatives were set aside — the analysis that
 * should have disqualified them never happened, or happened and left no
 * trace.
 *
 * ## Why a CloudEvents envelope, and why a DID
 *
 * Per the CCB decision splitting the ConOps/OpsCon genres
 * (conops-opscon-split-and-standard-protocols), the new conceptualization
 * skills carry their emitted records in public, checkable protocol shapes
 * rather than bespoke ones: CNCF CloudEvents 1.0 for the envelope, so a BMA
 * record is one event among any system's — with a stable specversion,
 * an id, a source, a type, and a time — and W3C DID-core for the identifier
 * naming whose analysis it is, so "whose" is a resolvable `did:` URI rather
 * than a firm-internal name nothing outside the firm can check. Both arrive
 * as honest conformance-plan rungs (claim today: syntax only — this
 * validator does not resolve a DID document or reconcile the event against
 * a broker) rather than assertions.
 *
 * ## What a business-or-mission-analysis record contains
 *
 * 1. **The envelope.** CloudEvents 1.0 (JSON format) context attributes:
 *    `specversion` (must be `"1.0"`), `id`, `source`, `type` (reverse-DNS
 *    shaped, naming the firm's BMA record type), `subject`, and `time` —
 *    the house rule requires `subject` and `time` present even though
 *    CloudEvents' own core only mandates `id`, `source`, `specversion`,
 *    `type`. One of `source` or `subject` carries a `did:` URI matching
 *    did-core syntax (`did:<method>:<method-specific-id>`) naming whose
 *    analysis this is.
 * 2. **`data.problem-or-opportunity-space`.** An array, one entry per
 *    problem or opportunity, each an object with a `statement` (the claim)
 *    and a `fails-if` (the condition under which the statement is false) —
 *    the pairing is what keeps a statement from being a vibe: a claim with
 *    no way to fail is not yet analysis.
 * 3. **`data.candidate-solution-classes`.** An array, one entry per class,
 *    each an object with a `class` name, a `characterization`, and a
 *    `would-be-disqualified-if` — so a class is on the record as something
 *    that could have lost, not just something that was considered.
 * 4. **`data.operational-concept-traceability`.** An object with a `toward`
 *    (the organization-level ConOps this analysis feeds, or an honest
 *    statement that none exists yet) and a `statement` (how this analysis
 *    bears on it) — the forward reference 15288 §6.4.1 exists to set up.
 * 5. **`data.stakeholders-and-environment`.** An object with at least one
 *    keyed aspect of context, each carrying non-empty content. PESTEL-style
 *    keys (political, economic, social, technological, environmental,
 *    legal) are acceptable structure; a flat `stakeholders` array of actors
 *    is also acceptable. The rule is content per key, not the key set.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **A record that is not a CloudEvents envelope** — refused. No
 *   `specversion: "1.0"`, no BMA record — a bespoke envelope is exactly what
 *   the CCB decision rejected as unchecked-outside-the-firm.
 * - **Neither `source` nor `subject` a `did:` URI** — refused. Whose
 *   analysis this is has to resolve to an identifier, not a firm-internal
 *   phrase.
 * - **A problem-or-opportunity-space entry with no `fails-if`** — refused.
 *   A statement nothing could falsify is a vibe wearing analysis's name.
 * - **A candidate-solution-classes array with fewer than one entry** —
 *   refused. Zero candidates characterized is not an analysis of the
 *   solution space; it is the absence of one.
 * - **`stakeholders-and-environment` present but empty** — refused. A key
 *   with no content is a section header, not context.
 *
 * ## Run it
 *
 * ```sh
 * node .../perform-a-business-or-mission-analysis.js path/to/bma-record.json
 * node .../perform-a-business-or-mission-analysis.js --scaffold path/to/new.json
 * ```
 *
 * A fresh scaffold does not validate — its placeholders fail the checks on
 * purpose, so an unfilled skeleton cannot pass as an analysis.
 *
 * ## When NOT to use
 *
 * - Not for the organization-level ConOps itself — that is
 *   writing-a-concept-of-operations, which this analysis feeds via
 *   `operational-concept-traceability`, never restates.
 * - Not for a system-level operational concept — that is
 *   writing-a-system-operational-concept (the OpsCon), a different altitude.
 * - Not for resolving a `did:` URI to its DID document, or for verifying the
 *   envelope against a real CloudEvents broker — this validator checks
 *   syntax on the record at rest, nothing that requires a network.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SCAFFOLD = argValue("--scaffold");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}
const die = (message) => out({ ok: false, error: message }, 1);

// ── the mechanizable rules ──────────────────────────────────────────────────

const UNMECHANIZED = [
  "whether the DID method named in source or subject is registered and the DID actually resolves to a document — this validator checks did-core URI syntax only",
  "whether each fails-if condition is genuinely falsifiable rather than restating its statement in different words",
  "whether the candidate solution classes are actually distinct, rather than the same class listed twice under different names",
  "whether the operational-concept-traceability statement is honest about what this analysis actually settles for the ConOps it names",
  "whether stakeholders-and-environment content reflects the real environment rather than boilerplate carried over from a template",
  "whether the event, once emitted, is reconciled against a real CloudEvents broker or store — this validator checks the record at rest",
];

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const DID_RE = /^did:[a-z0-9]+:[A-Za-z0-9._:%-]+$/u;

function validate(path) {
  if (!path) die("name a JSON record to validate, or pass --scaffold <path>");
  const abs = resolve(path);
  if (!existsSync(abs)) die(`no record at ${abs}`);
  const text = readFileSync(abs, "utf8");
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch (e) {
    die(`${abs} is not valid JSON: ${e.message}`);
  }

  const checks = [];
  const check = (id, coverage, notCovered, fn) => {
    const r = fn();
    checks.push({ check: id, coverage, ok: r === true, ...(r === true ? {} : { failure: r }), "does-not-cover": notCovered });
  };
  const attr = (key, test, why) =>
    check(`envelope: ${key}`, "FULL", "that the value is honest — a well-formed lie passes", () => {
      const v = envelope[key];
      if (v === undefined || v === "") return `no '${key}' context attribute — CloudEvents 1.0 §2.2`;
      return test(v) ? true : `'${key}' ${why}`;
    });

  check("the record is a JSON object", "FULL", "nothing — an object is present or it is not", () =>
    (isObject(envelope) ? true : "the top-level JSON value is not an object — a CloudEvents envelope is one"));

  if (isObject(envelope)) {
    attr("specversion", (v) => v === "1.0", 'must be exactly "1.0" — CloudEvents 1.0 §2.2');
    attr("id", isNonEmptyString, "must be a non-empty string identifying this event — CloudEvents 1.0 §2.2");
    attr("source", isNonEmptyString, "must be a non-empty URI-reference naming the context this event occurred in — CloudEvents 1.0 §2.2");
    attr("type", (v) => isNonEmptyString(v) && v.includes("."), "must be a non-empty, reverse-DNS-shaped string naming the firm's BMA record type — CloudEvents 1.0 §2.2");
    attr("subject", isNonEmptyString, "must be a non-empty string — required by house rule, naming the subject of this analysis within the source's context");
    attr("time", (v) => isNonEmptyString(v) && !Number.isNaN(Date.parse(v)), "must be an RFC 3339 timestamp — required by house rule, CloudEvents 1.0 §2.2");

    check("did-core: source or subject carries a did: URI", "FULL",
      "whether the DID method is registered and the DID resolves — syntax only, checked here",
      () => {
        const source = typeof envelope.source === "string" ? envelope.source : "";
        const subject = typeof envelope.subject === "string" ? envelope.subject : "";
        if (DID_RE.test(source) || DID_RE.test(subject)) return true;
        return "neither source nor subject matches did-core syntax (did:<method>:<method-specific-id>) — whose analysis this is must resolve to a DID";
      });

    check("data: object present", "FULL", "nothing — an object is present or it is not", () =>
      (isObject(envelope.data) ? true : "no 'data' object carrying the analysis — CloudEvents 1.0 §3.1 event data"));

    if (isObject(envelope.data)) {
      const data = envelope.data;

      check("data.problem-or-opportunity-space: array of falsifiable statements", "FULL",
        "whether each fails-if condition is genuinely falsifiable rather than a restatement",
        () => {
          const v = data["problem-or-opportunity-space"];
          if (!Array.isArray(v)) return "no 'problem-or-opportunity-space' array — 15288 §6.4.1 outcome: the problem or opportunity space is defined";
          if (v.length === 0) return "'problem-or-opportunity-space' is empty — nothing was defined";
          const bad = v
            .map((entry, i) => ({ entry, i }))
            .filter(({ entry }) => !isObject(entry) || !isNonEmptyString(entry.statement) || !isNonEmptyString(entry["fails-if"]))
            .map(({ i }) => i);
          return bad.length === 0 ? true : `entries at index ${bad.join(", ")} lack a non-empty 'statement' and 'fails-if' — a statement with no way to fail is a vibe, not analysis`;
        });

      check("data.candidate-solution-classes: array of characterized classes", "FULL",
        "whether the classes are actually distinct rather than duplicated under different names",
        () => {
          const v = data["candidate-solution-classes"];
          if (!Array.isArray(v)) return "no 'candidate-solution-classes' array — 15288 §6.4.1 outcome: candidate solution classes are characterized";
          if (v.length === 0) return "'candidate-solution-classes' is empty — zero candidates characterized is not an analysis of the solution space";
          const bad = v
            .map((entry, i) => ({ entry, i }))
            .filter(({ entry }) => !isObject(entry) || !isNonEmptyString(entry.class) || !isNonEmptyString(entry.characterization) || !isNonEmptyString(entry["would-be-disqualified-if"]))
            .map(({ i }) => i);
          return bad.length === 0 ? true : `entries at index ${bad.join(", ")} lack a non-empty 'class', 'characterization', and 'would-be-disqualified-if'`;
        });

      check("data.operational-concept-traceability: forward reference stated", "FULL",
        "whether the statement is honest about what this analysis actually settles for the ConOps it names",
        () => {
          const v = data["operational-concept-traceability"];
          if (!isObject(v)) return "no 'operational-concept-traceability' object — 15288 §6.4.1 outcome: preliminary operational concepts or traceability toward the organization-level ConOps";
          if (!isNonEmptyString(v.toward)) return "'operational-concept-traceability.toward' is missing or empty — state the ConOps this feeds, or state honestly that none exists yet";
          if (!isNonEmptyString(v.statement)) return "'operational-concept-traceability.statement' is missing or empty";
          return true;
        });

      check("data.stakeholders-and-environment: at least one aspect with content", "PARTIAL",
        "whether the content reflects the real environment rather than boilerplate",
        () => {
          const v = data["stakeholders-and-environment"];
          if (!isObject(v) && !Array.isArray(v)) return "no 'stakeholders-and-environment' object or array — 15288 §6.4.1 outcome: stakeholders and environment characterized";
          const entries = Array.isArray(v) ? v : Object.values(v);
          if (entries.length === 0) return "'stakeholders-and-environment' carries no aspects — a key with no content is a section header, not context";
          const empty = entries.filter((e) => (typeof e === "string" ? e.trim().length === 0 : Array.isArray(e) ? e.length === 0 : !isObject(e) || Object.keys(e).length === 0));
          return empty.length === 0 ? true : `${empty.length} aspect(s) carry no content`;
        });
    }
  }

  const failed = checks.filter((c) => !c.ok);
  out({
    ok: failed.length === 0,
    skill: "performing-a-business-or-mission-analysis",
    record: abs,
    verdict: failed.length === 0
      ? "the mechanizable rules hold — which is not the same as the analysis holding; read the unmechanized remainder"
      : `${failed.length} mechanizable rule(s) do not hold`,
    checks,
    unmechanized: UNMECHANIZED,
  }, failed.length === 0 ? 0 : 1);
}

// ── the scaffold ────────────────────────────────────────────────────────────

function skeleton() {
  return {
    specversion: "1.0",
    id: "{uuid}",
    source: "did:{method}:{firm-or-office-identifier}",
    type: "net.emsenn.bma.record",
    subject: "{what this analysis is of}",
    time: "YYYY-MM-DDThh:mm:ssZ",
    data: {
      "problem-or-opportunity-space": [
        { statement: "{a claim about the problem or opportunity}", "fails-if": "{the observable condition under which the claim above is false}" },
      ],
      "candidate-solution-classes": [
        { class: "{a class of solution}", characterization: "{what distinguishes this class}", "would-be-disqualified-if": "{the condition that would rule this class out}" },
      ],
      "operational-concept-traceability": {
        toward: "{identifier of the organization-level ConOps this feeds, or a statement that none exists yet}",
        statement: "{how this analysis bears on that ConOps}",
      },
      "stakeholders-and-environment": {
        political: "",
        economic: "",
        social: "",
        technological: "",
        environmental: "",
        legal: "",
      },
    },
  };
}

function scaffold(path) {
  const abs = resolve(path);
  if (existsSync(abs)) die(`${abs} already exists — a scaffold never overwrites a record`);
  writeFileSync(abs, JSON.stringify(skeleton(), null, 2) + "\n");
  out({ ok: true, scaffolded: abs, note: "a fresh scaffold does not validate — its placeholders (empty aspects, {braced} text) fail the checks on purpose; fill it, then run the validator" });
}

if (SCAFFOLD) scaffold(SCAFFOLD);
else validate(process.argv[2]);
