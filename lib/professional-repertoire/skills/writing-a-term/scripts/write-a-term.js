#!/usr/bin/env node
// write-a-term — the WRITE half of the glossary, and the deterministic inverse
// of recall-a-term. Duty: managing-a-glossary.
//
// It writes a NEW term, and it SAFELY UPDATES an existing one. That is all it
// does. It does not collapse, canonicalize, consolidate, or reconcile anything,
// because NEAREST already settles that: a term defined in five places is five
// scopes each answering for themselves, and the nearest one wins at the asking
// point. To change what a scope says, you write to THAT scope. Nothing else in
// the tree is this script's business, and it will not touch it.
//
// SAFETY IS THE POINT. Every rule below exists because a session destroyed real
// markdown doing this by hand:
//
//   * NEVER clobbers.        An existing term needs --update, stated out loud.
//   * NEVER reserializes.    Updates are SURGICAL line edits to the frontmatter
//                            block. Untouched keys stay byte-for-byte identical.
//                            Nothing round-trips through a YAML dumper, because
//                            that is how comments, ordering, anchors, and block
//                            scalars get silently eaten.
//   * ONE prose normalizer.  Every body is passed to Red Cup's semantic-linefeed
//                            normalization actor. This script owns no competing
//                            sentence-boundary implementation.
//   * NEVER writes blind.    The schema form is handed to writing-a-schema,
//                            which refuses one that is not a usable contract.
//                            One validator, called and never copied.
//   * NEVER half-writes.     Atomic: temp file + rename.
//   * ALWAYS proves.         Runs recall-a-term afterward. If the write did not
//                            become recallable, that is a FAILURE, exit 6.
//
// The two real judgments stay with the caller: what the sources say, and the
// prose. This script owns only the mechanics — home, filename, frontmatter shape,
// staging, and the proof.
//
// Usage:
//   write-a-term --home <unit-dir> --slug <slug> --name "X" --description "…"   < body
//   write-a-term --slug <slug> --update [--from <path>]                          < body
//
// Exit: 0 ok. 2 usage. 3 ⊥ thin/empty body. 4 ⊤ exists (needs --update) or
//       unsafe key. 6 round-trip open. 7 markdown non-conformant.

import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeSemanticLinefeeds } from '@red-cup-engineering/semantic-linefeed-normalization-service'

const HERE = dirname(fileURLToPath(import.meta.url))

function fail (msg, code) { console.error(`write-a-term: ${msg}`); process.exit(code) }
function usage () {
  console.error(`usage: write-a-term --home <unit-dir> --slug <slug> --name "<Display Name>" --description "<one line>"
                    [--type term|concept|topic] [--source <path>] [--recorded-by <id>]
                    [--date YYYY-MM-DD] [--field key=value ...]   (DEFINITION on stdin, or --body-file)

       write-a-term --slug <slug> --update [--from <path>] [--home <dir>] [...]   (safe update)

  A term is an INSTANCE — a definition record, never a schema. The default form
  is the record: stdin is the DEFINITION (prose a reader uses), the target is
  <home>/content/glossary/<sub>/<slug>.json, validated against emsenn/schema/term.
  The machine-checkable shape of the things a term names is a CLASS, seats in
  <node>/lib/schemas/, and is written by writing-a-schema — a term that needs one
  points at it with --field specified-by=emsenn/schema/<type> rather than being it.

  --home <dir>     the owning unit. Target is <home>/content/glossary/<sub>/<slug>.json
                   On --update, may be omitted: the NEAREST definition from --from
                   (default cwd) is the one updated.
  --form <f>       record (default) | prose. prose writes the old <slug>.md node —
                   use it only where a plain record genuinely cannot carry the page.
  --update         permit writing over an existing term. Without it, an existing
                   term is refused (⊤) — clobbering is never the default.
  --keep-body      --update only: change frontmatter, leave the prose alone. (prose form)
  --force          write even if validation reports findings. Prints them.
  --dry-run        show the diff and the validation, write nothing.`)
}

// ── args ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const opt = { field: [], type: 'term', form: 'record' }
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  const take = () => { const v = args[++i]; if (v === undefined) fail(`${a} needs a value`, 2); return v }
  if (a === '--home') opt.home = take()
  else if (a === '--form') opt.form = take()
  else if (a === '--type') opt.type = take()
  else if (a === '--slug') opt.slug = take()
  else if (a === '--name') opt.name = take()
  else if (a === '--description') opt.description = take()
  else if (a === '--source') opt.source = take()
  else if (a === '--recorded-by') opt.recordedBy = take()
  else if (a === '--date') opt.date = take()
  else if (a === '--from') opt.from = take()
  else if (a === '--field') opt.field.push(take())
  else if (a === '--body-file') opt.bodyFile = take()
  else if (a === '--update') opt.update = true
  else if (a === '--keep-body') opt.keepBody = true
  else if (a === '--force') opt.force = true
  else if (a === '--dry-run') opt.dryRun = true
  else if (a === '-h' || a === '--help') { usage(); process.exit(0) }
  else fail(`unknown argument ${JSON.stringify(a)}`, 2)
}

if (!opt.slug) { usage(); fail('missing --slug', 2) }
if (!/^[a-z0-9][a-z0-9._-]*$/.test(opt.slug)) fail(`refusing non-slug --slug ${JSON.stringify(opt.slug)} (lowercase kebab)`, 2)
const SUBDIR = { term: 'terms', concept: 'concepts', topic: 'topics' }[opt.type]
if (!SUBDIR) fail(`--type must be term|concept|topic, got ${JSON.stringify(opt.type)}`, 2)
if (opt.form === 'schema') {
  fail('--form schema is retired: a term is an instance, never a schema. A CLASS seats in <node>/lib/schemas/ and is written by writing-a-schema; the term that names it points there with --field specified-by=emsenn/schema/<type>.', 2)
}
if (opt.form !== 'record' && opt.form !== 'prose') fail(`--form must be record|prose, got ${JSON.stringify(opt.form)}`, 2)
const EXT = opt.form === 'record' ? 'json' : 'md'

// ── resolution ─────────────────────────────────────────────────────────────
// Walk from the asking point UP, testing <D>/<shape> at each D. Nearest wins,
// neighbours or upward, never downward.
//
// There is no repo root here. `git rev-parse --show-toplevel` was wrong twice
// over: a node MAY be a submodule, so the enclosing toplevel is another tree's
// root, and staging a submodule's file against the superrepo stages nothing.
// Everything below is answered from where the question stands instead.
function findUp (from, shape) {
  let d = resolve(from)
  for (;;) {
    const at = join(d, shape)
    if (existsSync(at)) return at
    const up = dirname(d)
    if (up === d) return null
    d = up
  }
}

// A skill is one file and calls its siblings as subprocesses rather than
// importing them, because a skill is copied as a single file when projected and
// an imported sibling would not travel with it.
// Three shapes answer, because a skill is one file in the pool but a DIRECTORY
// everywhere it has been projected — and the pool itself still holds unnormalized
// skills in that same directory form.
function findSkill (flatName, from) {
  const beside = join(HERE, flatName)
  if (existsSync(beside)) return beside // a sibling in the same projected directory
  const pooled = findUp(from, join('lib/management/skills', flatName))
  if (pooled) return pooled // the flat source pool
  for (const dir of ['lib/management/skills', '.claude/skills']) {
    let d = resolve(from)
    for (;;) {
      const holder = join(d, dir)
      if (existsSync(holder)) {
        for (const entry of readdirSync(holder)) {
          const at = join(holder, entry, 'scripts', flatName)
          if (existsSync(at)) return at
        }
      }
      const up = dirname(d)
      if (up === d) break
      d = up
    }
  }
  return null
}

// The two skills this one calls. recalling-a-term proves the write closed;
// reading-a-schema — the one validator — checks the record against
// emsenn/schema/term, so what a valid term is stays one fact in one place.
const RECALL = findSkill('recall-a-term.js', HERE)
const READ_SCHEMA = findSkill('read-a-schema.js', HERE)

// ── locate the target ──────────────────────────────────────────────────────
// Explicit --home wins. Otherwise --update resolves the NEAREST definition and
// updates THAT one — the same rule recall uses, so what you update is exactly
// what a reader at that point would have gotten.
let absPath
if (opt.home) {
  absPath = resolve(opt.home.replace(/\/+$/, ''), 'content', 'glossary', SUBDIR, `${opt.slug}.${EXT}`)
} else if (opt.update) {
  const from = resolve(opt.from ?? process.cwd())
  let out = ''
  try {
    out = execFileSync('node', [RECALL, opt.slug, '--from', from, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (e) { out = (e.stdout || '').toString() }
  let parsed = null
  try { parsed = JSON.parse(out) } catch { /* not resolvable */ }
  if (!parsed?.resolved || !parsed.answer) {
    fail(`⊥ --update without --home needs "${opt.slug}" to resolve from ${relative(process.cwd(), from) || '.'}, and it does not.\n` +
         `  Look first:  recall-a-term ${opt.slug} --from ${relative(process.cwd(), from) || '.'}\n` +
         `  Or name the home explicitly:  --home <unit-dir>`, 3)
  }
  // `abspath`, never `path`: recalling-a-term reports `path` relative to the
  // tree IT resolved from, which this script has no business reconstructing.
  absPath = parsed.answer.abspath
  console.error(`write-a-term: --update resolved "${opt.slug}" to the NEAREST definition: ${parsed.answer.path}`)
  if (parsed.shadowed?.length) {
    console.error(`  (${parsed.shadowed.length} outer definition(s) shadowed and NOT touched — they answer for their own scopes.)`)
  }
} else {
  usage(); fail('missing --home (required to create a term)', 2)
}
const relPath = relative(process.cwd(), absPath)
const exists = existsSync(absPath)

// The unit that owns this term: <unit>/content/glossary/<sub>/<slug>.<ext>, so
// the unit is three directories up from the file.
const UNIT = resolve(dirname(absPath), '..', '..', '..')

// ── the no-clobber gate ────────────────────────────────────────────────────
// Keyed on the EXACT target path — not on "does this term exist somewhere in the
// tree". Another scope defining this slug is not a conflict; it is a scope
// answering for itself, and it is none of this write's business.
if (exists && !opt.update) {
  console.error(`write-a-term: ⊤ ${relPath} already exists.`)
  console.error(`  Writing over it needs --update, stated out loud. Read it first:`)
  console.error(`      recall-a-term ${opt.slug} --from ${dirname(relPath)}`)
  console.error(`  Then:  write-a-term --home ${opt.home ?? '<home>'} --slug ${opt.slug} --update ...`)
  process.exit(4)
}
if (!exists && opt.update) {
  console.error(`write-a-term: note — --update given but ${relPath} does not exist; creating it.`)
}
if (!exists && (!opt.name || !opt.description)) {
  usage(); fail('creating a term needs --name and --description', 2)
}

// ── body ───────────────────────────────────────────────────────────────────
const readStdin = () => { try { return readFileSync(0, 'utf8') } catch { return '' } }
let body = null
if (opt.keepBody) {
  if (!exists) fail('--keep-body needs an existing term to keep the body of', 2)
} else {
  body = opt.bodyFile ? readFileSync(opt.bodyFile, 'utf8') : readStdin()
  if (opt.form === 'record' && !body.trim() && opt.description) body = opt.description
  body = normalizeSemanticLinefeeds(body.replace(/\s+$/, '') + '\n')
  if (body.trim().length < 40) {
    if (exists) fail(`⊥ refusing to replace ${relPath}'s prose with ${body.trim().length} chars. Pass --keep-body to edit only the frontmatter, or supply the real body.`, 3)
    fail(`⊥ body is empty/too thin (${body.trim().length} chars) — the definition is YOUR judgment from primary sources, not a stub`, 3)
  }
}

// ── split an existing file, surgically ─────────────────────────────────────
// We keep the frontmatter block as LINES and edit only the lines we were told
// to. Everything else survives byte-for-byte. No parse → dump round-trip.
function splitFile (text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { fmLines: null, body: text }
  return { fmLines: m[1].split(/\r?\n/), body: text.slice(m[0].length) }
}

// A key is safe to edit in place only if it is a plain single-line scalar:
//   key: value
// If its value is a block scalar (`>` / `|`), a nested map, or a list, the value
// spills onto following lines and a one-line substitution would silently truncate
// it. That is exactly the kind of quiet destruction this script exists to stop,
// so we refuse and say so.
function keyShape (fmLines, key) {
  const i = fmLines.findIndex((l) => new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`).test(l))
  if (i === -1) return { index: -1 }
  const value = fmLines[i].slice(fmLines[i].indexOf(':') + 1).trim()
  const next = fmLines[i + 1] ?? ''
  const spills = /^[>|]/.test(value) || (value === '' && /^[ \t]+\S/.test(next))
  return { index: i, value, multiline: spills }
}

const localToday = () => {
  // LOCAL date, not toISOString(): the latter is UTC and stamps provenance a day
  // ahead for anyone west of Greenwich for part of each day. Provenance records
  // when the session happened, which is a local fact.
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const date = opt.date || localToday()
const recordedBy = opt.recordedBy || 'claude-session'
const esc = (s) => (/[:#[\]{}",&*?|<>=!%@`]/.test(s) || /^\s|\s$/.test(s) ? JSON.stringify(s) : s)

// The keys this invocation was actually told to set. Only these are touched.
const setKeys = []
if (opt.name) setKeys.push(['name', esc(opt.name)])
if (opt.description) setKeys.push(['description', esc(opt.description)])
for (const f of opt.field) {
  const eq = f.indexOf('=')
  if (eq < 0) fail(`--field must be key=value, got ${JSON.stringify(f)}`, 2)
  setKeys.push([f.slice(0, eq).trim(), esc(f.slice(eq + 1))])
}

let next
const before = exists ? readFileSync(absPath, 'utf8') : ''

// ── the record form ────────────────────────────────────────────────────────
// A term is an INSTANCE: a plain JSON record — id, name, definition — validated
// against emsenn/schema/term (the CLASS, seated in <node>/lib/schemas/). stdin
// is the definition, prose a reader uses. The identity key (id) is the
// script's, not yours: a hand-set id is how two terms come to claim one name.
//
// There is no surgical-update path here. JSON has nothing a re-serialization
// eats: parse -> merge -> serialize is lossless, so an update is a merge over
// the parsed object and the no-clobber gate above still governs it.
let recordObj = null
if (opt.form === 'record') {
  const prior = exists ? (() => { try { return JSON.parse(before) } catch { return {} } })() : {}
  const provenance = exists
    ? { ...(prior['x-provenance'] ?? {}), 'updated-by': recordedBy, 'updated-on': date }
    : { 'recorded-by': recordedBy, 'recorded-on': date }

  const extra = {}
  for (const [k, v] of setKeys) if (!['name', 'description'].includes(k)) extra[k] = typeof v === 'string' ? v.replace(/^"|"$/g, '') : v

  recordObj = {
    id: opt.slug,
    name: opt.name ?? prior.name,
    definition: body.trim(),
    ...Object.fromEntries(Object.entries(prior).filter(([k]) => !['id', 'name', 'definition', 'x-source', 'x-provenance'].includes(k))),
    ...extra,
    ...(opt.source ? { 'x-source': { source: opt.source } } : prior['x-source'] ? { 'x-source': prior['x-source'] } : {}),
    'x-provenance': provenance
  }
  next = JSON.stringify(recordObj, null, 2) + '\n'
} else if (!exists) {
  // ── create (prose) ───────────────────────────────────────────────────────
  const fm = ['---',
    `name: ${esc(opt.name)}`,
    `slug: ${esc(opt.slug)}`,
    `type: ${opt.type}`,
    `defines: ${opt.slug}`,
    `description: ${esc(opt.description)}`
  ]
  for (const [k, v] of setKeys) if (!['name', 'description'].includes(k)) fm.push(`${k}: ${v}`)
  // provenance — the thing hand-authoring always drops, so the recall never lies
  // about where a fact came from.
  fm.push('provenance:')
  fm.push(`  recorded-by: ${esc(recordedBy)}`)
  fm.push(`  recorded-on: ${date}`)
  if (opt.source) fm.push(`  source: ${esc(opt.source)}`)
  fm.push('---', '')
  next = fm.join('\n') + body
} else {
  // ── safe update ──────────────────────────────────────────────────────────
  const { fmLines, body: oldBody } = splitFile(before)
  if (!fmLines) fail(`⊤ ${relPath} has no parseable frontmatter block — refusing to guess at its shape. Fix it by hand.`, 4)
  const out = [...fmLines]

  for (const [k, v] of setKeys) {
    const shape = keyShape(out, k)
    if (shape.index === -1) {
      // Insert before the provenance block if there is one, else append.
      const pIdx = out.findIndex((l) => /^provenance:/.test(l))
      const line = `${k}: ${v}`
      if (pIdx === -1) out.push(line); else out.splice(pIdx, 0, line)
    } else if (shape.multiline) {
      fail(`⊤ frontmatter key "${k}" in ${relPath} has a multi-line value (block scalar / list / nested map).\n` +
           `  A one-line substitution would silently truncate it, so this script will not do it.\n` +
           `  Edit that key by hand, or drop --${k === 'name' || k === 'description' ? k : `field ${k}=…`} from this call.`, 4)
    } else {
      out[shape.index] = `${k}: ${v}`
    }
  }

  // provenance: keep recorded-* as the ORIGINAL fact, add updated-* as this one.
  const pIdx = out.findIndex((l) => /^provenance:/.test(l))
  if (pIdx === -1) {
    out.push('provenance:', `  recorded-by: ${esc(recordedBy)}`, `  recorded-on: ${date}`)
    if (opt.source) out.push(`  source: ${esc(opt.source)}`)
  } else {
    // end of the provenance block = first line at column 0 after it
    let end = pIdx + 1
    while (end < out.length && /^[ \t]+\S/.test(out[end])) end++
    const block = out.slice(pIdx + 1, end)
    const setSub = (key, val) => {
      const i = block.findIndex((l) => new RegExp(`^[ \\t]+${key}:`).test(l))
      if (i === -1) block.push(`  ${key}: ${val}`); else block[i] = `  ${key}: ${val}`
    }
    setSub('updated-by', esc(recordedBy))
    setSub('updated-on', date)
    if (opt.source) setSub('source', esc(opt.source))
    out.splice(pIdx + 1, end - (pIdx + 1), ...block)
  }

  next = '---\n' + out.join('\n') + '\n---\n' + (opt.keepBody ? oldBody : '\n' + body)
}

// ── validation ─────────────────────────────────────────────────────────────
// The record form is checked by READING-A-SCHEMA — the one validator, called
// and never copied — against emsenn/schema/term, the class in the node's
// lib/schemas pool. There is deliberately no second opinion: two validators is
// one validator and one rumour, and the rumour is the one that reads as proof.
//
// The prose form's frontmatter is checked by parsing it back, below, with the
// same hand-rolled splitter that wrote it.
if (opt.form === 'record') {
  if (!READ_SCHEMA) fail('⊥ cannot find reading-a-schema — the one validator. No term is written unchecked.', 3)
  const checked = spawnSync('node', [READ_SCHEMA, 'term', '--from', UNIT], { input: JSON.stringify(recordObj), encoding: 'utf8' })
  let verdict = null
  try { verdict = JSON.parse(checked.stdout) } catch { /* refused below */ }
  if (!verdict?.ok && !opt.force) {
    console.error('write-a-term: the record does not conform to emsenn/schema/term:')
    for (const e of verdict?.errors ?? [(checked.stderr || checked.stdout || 'no output').trim()]) console.error(`  ${e}`)
    process.exit(7)
  }
}
// ── diff, so the change is auditable rather than asserted ──────────────────
// Everything git does here is done from the FILE's own directory, never from a
// tree root. A node may be a submodule, and `git add` run against the superrepo
// stages nothing at all for a path inside one — it reports success and the file
// stays invisible to every git-driven reader downstream.
const GIT_CWD = dirname(absPath)

function showDiff () {
  if (!exists) { console.log(`  (new file, ${next.split('\n').length} lines)`); return }
  const tmp = `${absPath}.${process.pid}.diff.tmp`
  try {
    writeFileSync(tmp, next)
    try {
      execFileSync('git', ['--no-pager', 'diff', '--no-index', '--', absPath, tmp],
        { cwd: GIT_CWD, encoding: 'utf8', stdio: ['ignore', 'inherit', 'ignore'] })
    } catch { /* git diff --no-index exits 1 when files differ; that is the normal path */ }
  } finally { try { unlinkSync(tmp) } catch {} }
}

console.log(`── write-a-term "${opt.slug}" → ${relPath} ──`)
showDiff()

if (opt.dryRun) {
  console.log(`\n--dry-run: nothing written. The record was validated against emsenn/schema/term above; the diff is what would seat.`)
  process.exit(0)
}

// ── the write ──────────────────────────────────────────────────────────────
mkdirSync(dirname(absPath), { recursive: true })

// ── atomic write ───────────────────────────────────────────────────────────
{
  const tmpPath = `${absPath}.${process.pid}.tmp`
  writeFileSync(tmpPath, next)
  renameSync(tmpPath, absPath)
}

// ── stage it: the recall tools read the tree, but an unstaged node is invisible
// to every git-driven reader downstream, and "wrote it but you can't find it" is
// indistinguishable from not having written it.
execFileSync('git', ['add', '--', absPath], { cwd: GIT_CWD })

// ── PROVE the round-trip closed ────────────────────────────────────────────
// Asked from the term's OWN home — that is the scope this write answers for. A
// nearer definition elsewhere shadowing it for some other reader is correct and
// is not this write's failure.
if (!RECALL) fail('⊥ cannot find recalling-a-term — the skill that proves this write closed. A write nothing can recall is indistinguishable from no write.', 3)
let recalled = null
try {
  const p = spawnSync('node', [RECALL, opt.slug, '--from', dirname(absPath), '--json'], { encoding: 'utf8' })
  recalled = JSON.parse(p.stdout)
} catch { /* an open round-trip is reported below, not thrown */ }
// Compared as ABSOLUTE paths. recalling-a-term reports `path` relative to the
// tree it resolved from, which is not the tree this script measured relPath
// against — comparing those two strings is a check that can only ever fail.
const closed = recalled?.resolved && recalled.answer?.abspath === absPath

console.log(`\nwrite-a-term: ${exists ? 'updated' : 'wrote'} + staged ${relPath}`)
console.log(`  provenance: ${exists ? 'updated-by' : 'recorded-by'}=${recordedBy} ${exists ? 'updated-on' : 'recorded-on'}=${date}${opt.source ? ` source=${opt.source}` : ''}`)
if (opt.form === 'record') console.log(`  ✓ reading-a-schema: conforms to emsenn/schema/term`)

if (closed) {
  console.log(`  ✓ round-trip CLOSED — recall-a-term "${opt.slug}" --from ${dirname(relPath)} resolves to this file.`)
  process.exit(0)
} else {
  console.error(`  ✗ round-trip OPEN — recall-a-term "${opt.slug}" did NOT resolve to ${relPath}.`)
  console.error(`    The file is written but recall cannot see it. Investigate before trusting it.`)
  console.error(`    recall answered: ${recalled?.answer?.abspath ?? (recalled?.resolved === false ? 'unresolved' : 'nothing parseable')}`)
  process.exit(6)
}
