#!/usr/bin/env node
/**
 * write-research-note.mjs — file a research note at the environment's ONE standard home.
 *
 * The standard place for a research note in this environment is:
 *   $root/content/documents/articles/notes/$YYYY/$MM/$DD/$YYYY-$MM-$DD-research-on-$term.md
 * where $root is the node package or git module the research is performed IN SERVICE OF.
 * (Operator ruling, 2026-07-14: agents kept inventing ad-hoc homes like a top-level
 * research/ dir; this script removes the choice — there is one home, computed here.)
 *
 * This is a PROCESS (nuclear-quartet closure-kind): no behavioural branch, identical
 * inputs produce an identical note, and on a surprise (missing term, root not a real
 * dir, note already exists) it fails LOUDLY rather than guessing.
 *
 * The prose BODY is read from stdin — pipe the giant chunk of markdown in. This script
 * owns only the mechanics: resolving $root, building the dated path, writing frontmatter
 * that matches the corpus convention, and refusing to clobber.
 *
 * Usage:
 *   cat body.md | node write-research-note.mjs \
 *     --term "sheaf-laplacians"            (or --title "Sheaf Laplacians"; slug is derived) \
 *     [--root lib/emsenn]                  (explicit; else derived from --for/cwd) \
 *     [--for path/to/served/settlement]     (what the research serves; root walks up from here) \
 *     [--title "..."] [--description "..."] [--tags a,b,c] \
 *     [--status design] [--date YYYY-MM-DD] [--declared-by researcher] [--force]
 *
 * Exit 0 = written (path printed to stdout); 2 = usage error; 1 = refusal (exists / bad root).
 */
import { existsSync, mkdirSync, writeFileSync, statSync, readSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith("--")) continue;
    const key = k.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) { a[key] = true; }
    else { a[key] = next; i++; }
  }
  return a;
}

function fail(code, msg) { process.stderr.write(`${msg}\n`); process.exit(code); }

function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/^research[- ]on[- ]/, "")   // don't double-prefix
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Derive $root: nearest ancestor of `start` that is a node package (package.json)
// or a git module (.git file or dir). This is the "in service of a meaningful node"
// relation made mechanical. Falls back to lib/emsenn (the firm's main content home).
function deriveRoot(start) {
  let dir = resolve(start);
  const contentHome = resolve("lib/emsenn");   // the firm's main content home
  for (;;) {
    if (existsSync(join(dir, "package.json")) || existsSync(join(dir, ".git"))) {
      // The monorepo WRAPPER root (the one that holds lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content) is NOT itself
      // a note home — that's how the bogus top-level content/ dirs got created. When the
      // walk lands there and no more-specific node was named, redirect to lib/emsenn.
      if (dir !== contentHome && existsSync(join(dir, "lib", "emsenn", "content"))) {
        return existsSync(contentHome) ? contentHome : dir;
      }
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;              // hit filesystem root
    dir = parent;
  }
  return existsSync(contentHome) ? contentHome : resolve(".");
}

const args = parseArgs(process.argv.slice(2));

const termRaw = args.term || args.title;
if (!termRaw || termRaw === true) fail(2, "ERROR: --term (or --title) is required — it names the note. Nothing written.");
const term = slugify(termRaw);
if (!term) fail(2, `ERROR: --term "${termRaw}" slugified to empty. Give a word-bearing term. Nothing written.`);

// $root: explicit --root wins; else derive from --for; else from cwd.
const root = args.root && args.root !== true
  ? resolve(String(args.root))
  : deriveRoot(args.for && args.for !== true ? String(args.for) : ".");
if (!existsSync(root) || !statSync(root).isDirectory()) {
  fail(1, `REFUSED: resolved $root is not a directory: ${root}. Pass --root explicitly. Nothing written.`);
}

// Date: default today (this runs as an ordinary node process, so new Date() is fine).
let date = args.date && args.date !== true ? String(args.date) : new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(2, `ERROR: --date must be YYYY-MM-DD, got "${date}". Nothing written.`);
const [yyyy, mm, dd] = date.split("-");

const title = args.title && args.title !== true
  ? String(args.title)
  : `Research on ${termRaw.replace(/-/g, " ")}`;
const description = args.description && args.description !== true ? String(args.description) : "";
const status = args.status && args.status !== true ? String(args.status) : "design";
const declaredBy = args["declared-by"] && args["declared-by"] !== true ? String(args["declared-by"]) : "researcher";
const tags = (args.tags && args.tags !== true ? String(args.tags) : "")
  .split(",").map((t) => t.trim()).filter(Boolean);
if (!tags.length) fail(2, "ERROR: --tags is required (comma-separated, at least one) — an untagged note is unfindable by anything that curates by tag. Nothing written.");

const dir = join(root, "content", "documents", "articles", "notes", yyyy, mm, dd);
const file = join(dir, `${date}-research-on-${term}.md`);
if (existsSync(file) && !args.force) {
  fail(1, `REFUSED: ${file} already exists. Pass --force to overwrite, or pick a distinct --term. Nothing written.`);
}

// Body: the piped markdown prose (stdin, fd 0). Refuse an empty note.
let body = "";
{
  const chunks = [];
  const buf = Buffer.alloc(65536);
  let n;
  try {
    while ((n = readSync(0, buf, 0, buf.length, null)) > 0) chunks.push(Buffer.from(buf.subarray(0, n)));
  } catch { /* EOF / no stdin -> leave empty, handled below */ }
  body = Buffer.concat(chunks).toString("utf8");
}
body = body.replace(/\s+$/s, "");
if (!body.trim()) fail(2, "ERROR: no prose on stdin. Pipe the note body in: cat body.md | write-research-note ... Nothing written.");

const fm = [
  "---",
  `title: ${JSON.stringify(title)}`,
  ...(description ? [`description: ${JSON.stringify(description)}`] : []),
  `date-created: ${date}`,
  `kind: research-note`,
  `in-service-of: ${root.replace(resolve(".") + "/", "")}`,
  ...(tags.length ? ["tags:", ...tags.map((t) => `  - ${t}`)] : []),
  `status: ${status}`,
  `declared-by: ${declaredBy}`,
  "---",
  "",
].join("\n");

// Ensure the body opens with an H1 if the author didn't provide one.
const bodyOut = /^#\s/m.test(body.split("\n").slice(0, 3).join("\n")) ? body : `# ${title}\n\n${body}`;

mkdirSync(dir, { recursive: true });
writeFileSync(file, fm + bodyOut + "\n", "utf8");
process.stdout.write(`${file}\n`);
process.exit(0);
