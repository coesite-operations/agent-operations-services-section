#!/usr/bin/env node
// recall-a-term <term> [--from <path>] [--search] — the READ half of the glossary.
//
// Duty: managing-a-glossary. One object, read and written, so emsenn never
// re-explains a term and no session re-derives one.
//
// THE RULE (emsenn, verbatim, 2026-07-15):
//
//     the resolver is supposed to use the closest match, by filesystem
//     distance (neighbors or upward only, never downward)
//
// NEAREST. That is the whole rule, and it settles every question that used to
// get asked about this tree. A term defined in five places is not drift, is not
// a conflict, and is not a thing to collapse — the nearest one is the answer and
// the rest are outer definitions it shadows. "One answer" is a property of the
// resolution from an asking point, never a count of files in the tree.
//
// The rule's address is:
//   lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/documents/articles/notes/2026/07/15/
//     2026-07-15-note-on-term-resolution-by-filesystem-distance.md
// That note is the authority. If this script and that note disagree, the note
// wins and this script is the defect.
//
// TWO MODES — recall covers search AND reading:
//
//   recall-a-term <term> [--from <path>]     RESOLVE: nearest definition, printed in full.
//   recall-a-term <term> --search            SEARCH: every occurrence in the whole tree.
//
// Resolve answers "what does this mean from here". Search answers "what is the
// entire record on this term". Search NEVER samples, filters, folder-picks, or
// skips archives — it walks the disk, submodules and all, and emits everything.
//
// Deterministic: same term + same asking point + same tree => same output.
// Fails loudly; never branches onto an inferred alternative.
//
// Exit: 0 resolved / found. 1 = ⊥ absence. 2 = usage error.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

// Priority within one scope's glossary. Nearest scope wins first; this only
// breaks a tie inside a single scope.
const SUBDIRS = ['terms', 'concepts', 'topics']

function die (message, code = 2) {
  console.error(`recall-a-term: ${message}`)
  process.exit(code)
}

// ── args ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const opts = { search: false, json: false, ctx: 3, exts: null, all: false, exact: false, regex: false, out: null, stdout: false }
const rest = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--from') opts.from = argv[++i]
  else if (a === '--search') opts.search = true
  else if (a === '--json') opts.json = true
  else if (a === '-C' || a === '--context') opts.ctx = parseInt(argv[++i], 10)
  else if (a === '-t' || a === '--type') opts.exts = [argv[++i]]
  else if (a === '--all') opts.all = true
  else if (a === '--exact') opts.exact = true
  else if (a === '--regex') opts.regex = true
  else if (a === '-o' || a === '--out') opts.out = argv[++i]
  else if (a === '--stdout') opts.stdout = true
  else if (a === '-h' || a === '--help') { usage(); process.exit(0) }
  else if (a.startsWith('-')) die(`unknown argument ${JSON.stringify(a)}`)
  else rest.push(a)
}

function usage () {
  console.error(`usage: recall-a-term <term> [--from <path>]        resolve the nearest definition, print it in full
       recall-a-term <term> --search [options]     every occurrence in the whole tree, as JSON

  --from <path>   asking point for resolution (default: cwd)
  --json          resolve mode: emit the result as JSON
search options:
  --stdout        JSON to stdout instead of a dossier file
  -o <path>       choose the dossier output path
  --exact         no plural/compound tolerance
  --regex         treat <term> as a raw regex
  -t <ext>        restrict to one extension        --all   every file type, not just prose
  -C <n>          context lines per hit (default 3)`)
}

const TERM = rest.join(' ').trim()
if (!TERM) { usage(); process.exit(2) }

const from = resolve(opts.from ?? process.cwd())
if (!existsSync(from)) die(`--from ${from} does not exist`)
const askingPoint = statSync(from).isDirectory() ? from : dirname(from)

const ROOT = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: askingPoint, encoding: 'utf8' }).trim()
  } catch {
    return die(`${askingPoint} is not inside a git repository — there is no root to stop the upward walk at`)
  }
})()

const rel = (p) => (p === ROOT ? '.' : relative(ROOT, p))

// ══════════════════════════════════════════════════════════════════════════
// SEARCH MODE — the whole record on the term. Nothing sampled.
// ══════════════════════════════════════════════════════════════════════════

if (opts.search) {
  process.chdir(ROOT)

  // Boundaries are ALPHANUMERIC, not \b: "enterprise" finds "enterprises",
  // "micro-enterprise", "enterprise-architecture". Hyphen/space/underscore are
  // interchangeable inside a multi-word term. This widens the net for the ONE
  // named term; it never substitutes a different term.
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const core = TERM.split(/[-_\s]+/).filter(Boolean).map(esc).join('[-_\\s]+')
  const PATTERN = opts.regex ? TERM : `(?<![A-Za-z0-9])${core}${opts.exact ? '' : '(?:e?s)?'}(?![A-Za-z0-9])`
  const RE = new RegExp(PATTERN, 'gi')

  const PROSE = ['md', 'mdx', 'txt', 'org', 'lean', 'rst', 'adoc']
  const EXTS = opts.exts || (opts.all ? null : PROSE)
  // Excluded on purpose, and named in the dossier so the omission is never silent.
  const EXCLUDE = ['**/node_modules/**', '**/.git/**', '**/.lake/**', '**/target/**',
    '**/dist/**', '**/.next/**', '**/__pycache__/**', '**/.venv/**', '**/*.min.*']

  // The trailing '.' and the ignored stdin are both load-bearing: when stdin is
  // not a TTY, ripgrep searches STDIN instead of walking the tree, so a piped rg
  // silently returns ZERO matches over the whole corpus — a false "the term does
  // not exist". Never drop them.
  const rg = (args) => {
    try {
      return execFileSync('rg', [...args, '.'], {
        encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe']
      }).split('\n').filter(Boolean).map((l) => l.replace(/^\.\//, ''))
    } catch (e) {
      if (e.status === 1) return [] // rg: no matches
      throw e
    }
  }

  const globArgs = []
  if (EXTS) for (const e of EXTS) globArgs.push('-g', `*.${e}`)
  for (const x of EXCLUDE) globArgs.push('-g', `!${x}`)
  // --no-ignore-vcs: .gitignore must not hide earned material. We walk the DISK,
  // not `git ls-files` — the latter stops at each of the 18 submodule boundaries
  // and hides ~11,500 md files (18% of the corpus), including the mathematics and
  // most of the archives.
  const BASE = ['--no-ignore-vcs', ...globArgs]

  const corpusFiles = rg(['--files', ...BASE])
  // --pcre2: the boundary assertions are look-around; rg's default engine rejects them.
  const matchFiles = rg(['-l', '-i', '--pcre2', '--no-messages', '-e', PATTERN, ...BASE]).sort()

  const scopeCache = new Map()
  const scopeOf = (p) => {
    let dir = dirname(p)
    const seen = []
    while (dir && dir !== '.' && dir !== sep) {
      if (scopeCache.has(dir)) { const s = scopeCache.get(dir); for (const d of seen) scopeCache.set(d, s); return s }
      if (existsSync(join(ROOT, dir, 'package.json')) || existsSync(join(ROOT, dir, '.git'))) {
        for (const d of seen) scopeCache.set(d, dir); scopeCache.set(dir, dir); return dir
      }
      seen.push(dir); dir = dirname(dir)
    }
    for (const d of seen) scopeCache.set(d, '.')
    return '.'
  }
  const isArchived = (p) => /(^|\/)(_archive|archive|triage)(\/|$)/i.test(p)

  const basenameOf = (p) => p.slice(p.lastIndexOf('/') + 1)
  const exactBase = new RegExp(`^${core}\\.[A-Za-z0-9]+$`, 'i')
  const baseRe = new RegExp(opts.regex ? TERM : `(?<![A-Za-z0-9])${core}(?:e?s)?(?![A-Za-z0-9])`, 'i')
  const filenameExact = corpusFiles.filter((p) => exactBase.test(basenameOf(p))).sort()
  const filenameGlob = corpusFiles.filter((p) => !exactBase.test(basenameOf(p)) && baseRe.test(basenameOf(p))).sort()

  const frontmatter = (lines) => {
    if (lines[0]?.trim() !== '---') return null
    const end = lines.indexOf('---', 1)
    if (end < 1) return null
    const fm = {}
    for (const l of lines.slice(1, end)) {
      const m = l.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
      if (m) fm[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
    return Object.keys(fm).length ? fm : null
  }

  // A recorded LINE is excerpted, never a recorded OCCURRENCE dropped. Machine
  // data (JSONL, CBOR-as-text, lockfiles) carries single physical lines of 25MB+;
  // embedding those verbatim per hit made one dossier 317MB (operating, 2026-07-30)
  // — unreadable by jq and a pure cost sink. Every hit, file, and count is still
  // recorded; a line over the cap is excerpted around the match with the omitted
  // length stated inline, so nothing is ever silently gone.
  const LINE_CAP = 2000
  const clipPlain = (s) => s.length <= LINE_CAP ? s : s.slice(0, LINE_CAP) + `…[+${s.length - LINE_CAP} chars]`
  const clipMatch = (s) => {
    if (s.length <= LINE_CAP) return s
    RE.lastIndex = 0
    const m = RE.exec(s)
    const at = m ? m.index : 0
    const start = Math.max(0, at - (LINE_CAP >> 1))
    const end = Math.min(s.length, start + LINE_CAP)
    return (start ? `[+${start} chars]…` : '') + s.slice(start, end) +
      (end < s.length ? `…[+${s.length - end} chars]` : '')
  }

  const occurrences = []
  let totalHits = 0
  for (const p of matchFiles) {
    let text
    try { text = readFileSync(join(ROOT, p), 'utf8') } catch { continue }
    const lines = text.split('\n')

    // nearest enclosing markdown heading trail, per line
    const headings = new Array(lines.length).fill(null)
    const stack = []
    for (let i = 0; i < lines.length; i++) {
      const h = lines[i].match(/^(#{1,6})\s+(.*)$/)
      if (h) {
        const lvl = h[1].length
        while (stack.length && stack[stack.length - 1].lvl >= lvl) stack.pop()
        stack.push({ lvl, title: h[2].trim() })
      }
      headings[i] = stack.length ? stack.map((s) => s.title).join(' › ') : null
    }

    const hits = []
    for (let i = 0; i < lines.length; i++) {
      RE.lastIndex = 0
      if (!RE.test(lines[i])) continue
      RE.lastIndex = 0
      const forms = [...lines[i].matchAll(RE)].map((m) => m[0])
      const before = lines.slice(Math.max(0, i - opts.ctx), i)
      const after = lines.slice(i + 1, Math.min(lines.length, i + 1 + opts.ctx))
      const hit = {
        line: i + 1,
        section: headings[i],
        matched_forms: [...new Set(forms)],
        before: before.map(clipPlain),
        text: clipMatch(lines[i]),
        after: after.map(clipPlain)
      }
      if (lines[i].length > LINE_CAP || before.some((l) => l.length > LINE_CAP) || after.some((l) => l.length > LINE_CAP)) {
        hit.line_excerpted = true
        hit.line_bytes = lines[i].length
      }
      hits.push(hit)
    }
    if (!hits.length) continue
    totalHits += hits.length

    const isDefinitionHome = exactBase.test(basenameOf(p))
    const rec = {
      path: p,
      // The relative path is for a reader; `abspath` is for a caller. A caller
      // resolving `path` must first know what it is relative to, and every
      // caller that guesses wrong writes to a file that is not the one recalled.
      abspath: join(ROOT, p),
      scope: scopeOf(p),
      archived: isArchived(p),
      definition_home: isDefinitionHome,
      bytes: statSync(join(ROOT, p)).size,
      lines: lines.length,
      frontmatter: frontmatter(lines),
      match_count: hits.length,
      hits
    }
    // The term's own home files are carried IN FULL — those are the nodes, and a
    // context window around a hit is not the same thing as the definition.
    if (isDefinitionHome) rec.full_text = text
    occurrences.push(rec)
  }

  const byScope = {}
  for (const o of occurrences) {
    const s = (byScope[o.scope] ||= { files: 0, occurrences: 0, archived_files: 0 })
    s.files++; s.occurrences += o.match_count; if (o.archived) s.archived_files++
  }
  const allForms = {}
  for (const o of occurrences) for (const h of o.hits) for (const f of h.matched_forms) {
    allForms[f.toLowerCase()] = (allForms[f.toLowerCase()] || 0) + 1
  }

  const dossier = {
    term: TERM,
    pattern: PATTERN,
    generated_at: new Date().toISOString(),
    command: `recall-a-term ${process.argv.slice(2).join(' ')}`,
    method: {
      engine: 'ripgrep over the working tree (not git ls-files)',
      why: 'git ls-files stops at submodule boundaries; 18 submodules (~11.5k md files, incl. the mathematics and most archives) are invisible to it',
      filtered: 'nothing — no sampling, no top-N, no relevance ranking, no archive skipping',
      line_excerpt_cap: `${LINE_CAP} chars per recorded line — occurrences are never dropped; a physical line over the cap is excerpted around the match with the omitted length stated inline (hits carry line_excerpted/line_bytes)`,
      excluded_globs: EXCLUDE,
      extensions: EXTS || 'all',
      context_lines: opts.ctx
    },
    corpus: { files_scanned: corpusFiles.length },
    totals: {
      files_with_matches: occurrences.length,
      occurrences: totalHits,
      definition_homes: filenameExact.length,
      archived_files_with_matches: occurrences.filter((o) => o.archived).length,
      scopes: Object.keys(byScope).length
    },
    matched_forms: Object.fromEntries(Object.entries(allForms).sort((a, b) => b[1] - a[1])),
    filename_hits: { exact: filenameExact, glob: filenameGlob },
    by_scope: Object.fromEntries(Object.entries(byScope).sort((a, b) => b[1].occurrences - a[1].occurrences)),
    occurrences: occurrences.sort((a, b) => b.match_count - a.match_count)
  }

  const json = JSON.stringify(dossier, null, 2)
  if (opts.stdout) { process.stdout.write(json + '\n'); process.exit(0) }

  const slug = TERM.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const outDir = process.env.CLAUDE_SCRATCH || join(ROOT, '.claude', 'tmp', 'dossier')
  const out = resolve(opts.out || join(outDir, `${slug}.json`))
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, json)

  const t = dossier.totals
  process.stdout.write(
`── recall-a-term "${TERM}" --search ──
pattern         /${PATTERN}/i
corpus          ${dossier.corpus.files_scanned} files scanned (whole tree, submodules + archives included)
files with hits ${t.files_with_matches}   (${t.archived_files_with_matches} archived)
occurrences     ${t.occurrences}
definition home ${t.definition_homes ? filenameExact.join(', ') : '(none — term has no <term>.<ext> node)'}
name-only hits  ${filenameGlob.length} more files with the term in the filename
scopes          ${t.scopes}
forms found     ${Object.keys(dossier.matched_forms).slice(0, 8).join(', ')}${Object.keys(dossier.matched_forms).length > 8 ? ', …' : ''}

DOSSIER → ${relative(ROOT, out) || out}

NOTHING WAS SAMPLED. Every occurrence is in that file. Read it with jq; do not re-search.
  jq -r '.by_scope | to_entries[] | "\\(.value.occurrences)\\t\\(.key)"' ${relative(ROOT, out)}
  jq -r '.occurrences[] | "\\(.match_count)\\t\\(.path)"' ${relative(ROOT, out)}
  jq -r '.occurrences[] | select(.definition_home) | .full_text' ${relative(ROOT, out)}

This is the whole RECORD on the term. For what it MEANS from a given point —
the nearest definition — drop --search:  recall-a-term ${TERM} --from <path>
`)
  process.exit(0)
}

// ══════════════════════════════════════════════════════════════════════════
// RESOLVE MODE — nearest definition from the asking point. Read it in full.
// ══════════════════════════════════════════════════════════════════════════

if (!/^[A-Za-z0-9._-]+$/.test(TERM)) die(`refusing non-slug term ${JSON.stringify(TERM)} (resolve mode takes a slug; did you mean --search?)`)

if (askingPoint !== ROOT && !askingPoint.startsWith(ROOT + sep)) {
  die(`asking point ${askingPoint} is not inside ${ROOT}`)
}

// The ancestor chain: asking point, then upward, stopping at ROOT. This is the
// ENTIRE search space. Nothing below the asking point, and nothing off the
// chain, is reachable — enforced by construction, not by discipline.
const chain = []
for (let dir = askingPoint; ; dir = dirname(dir)) {
  chain.push(dir)
  if (dir === ROOT) break
}

// ── 1) filename lookup on the chain, nearest first ─────────────────────────
// A term is an INSTANCE — a definition record. `<term>.json` is the term's
// form; `<term>.schema.json` is the RETIRED instance-dressed-as-schema form,
// still answered so an unmigrated glossary resolves; `<term>.md` is the prose
// node that predates both. Extension rank breaks ties WITHIN one scope's
// subdir only — it never outranks distance, so a nearer prose node still
// shadows an outer record. That ordering is deliberate: nearest-resolution is
// about scope authority, not about which form we prefer, and inverting it
// would let a far-away record capture a question a nearer scope already
// answers. What a KIND of record must look like is a class, not a term — ask
// reading-a-schema, whose pool is <node>/lib/schemas.
const FORMS = [
  { ext: 'json', form: 'record' },
  { ext: 'schema.json', form: 'schema (retired form)' },
  { ext: 'md', form: 'prose' }
]
const candidates = []
chain.forEach((scope, distance) => {
  SUBDIRS.forEach((sub, subdirRank) => {
    FORMS.forEach(({ ext, form }, formRank) => {
      const path = join(scope, 'content', 'glossary', sub, `${TERM}.${ext}`)
      if (existsSync(path) && statSync(path).isFile()) {
        candidates.push({ path, scope, distance, subdirRank, sub, form, formRank })
      }
    })
  })
})
candidates.sort((a, b) => a.distance - b.distance || a.subdirRank - b.subdirRank || a.formRank - b.formRank)

if (candidates.length > 0) {
  const answer = candidates[0]
  const shadowed = candidates.slice(1)

  const answerText = readFileSync(answer.path, 'utf8')

  if (opts.json) {
    console.log(JSON.stringify({
      term: TERM,
      asked_from: rel(askingPoint),
      resolved: true,
      // `path` is for a reader; `abspath` is for a caller. A caller resolving
      // `path` must first know what it is relative to, and a caller that guesses
      // wrong acts on a file that is not the one recalled.
      answer: { path: rel(answer.path), abspath: resolve(ROOT, answer.path), sub: answer.sub, distance: answer.distance, form: answer.form, text: answerText },
      shadowed: shadowed.map((c) => ({ path: rel(c.path), abspath: resolve(ROOT, c.path), sub: c.sub, distance: c.distance, form: c.form }))
    }, null, 2))
    process.exit(0)
  }

  console.log(`── recall-a-term "${TERM}" — asked from ${rel(askingPoint)} ──`)
  console.log(`   ▶ ${rel(answer.path)}  [${answer.sub}, ${answer.distance} level(s) up, ${answer.form}]`)
  for (const c of shadowed) {
    console.log(`     ${rel(c.path)}  [${c.sub}, ${c.distance} up, ${c.form} — shadowed by the above]`)
  }
  console.log('\n===== ' + rel(answer.path) + ' =====')
  console.log(answerText)

  // A prose node answering while no schema exists for the term at ANY scope is
  // the term still being un-schema'd. Say so on the readout rather than letting
  // a nice document read as a settled term.
  if (answer.form === 'prose' && !candidates.some((c) => c.form === 'schema')) {
    console.log(
      `\n(${TERM} has no schema node anywhere on this chain — this is prose, so nothing can be ` +
      `validated against it. A term is a definition record; write one:  write-a-term --home <scope> --slug ${TERM} ...)`
    )
  }

  if (shadowed.length > 0) {
    console.log(
      `\n(${shadowed.length} outer definition(s) shadowed. This is NOT drift and NOT a thing to ` +
      `collapse — a nearer scope overriding an outer one is what nearest-resolution is FOR. ` +
      `To change one of them, write to THAT home: write-a-term --home <that scope> --update.)`
    )
  }
  process.exit(0)
}

// ── 2) fallback: <term> as a value under frontmatter `tags:` ───────────────
// Scoped the same way: each chain scope's OWN glossary tree, nearest first. A
// scope's glossary is that scope's vocabulary — reading it is reading the scope,
// not descending past it. Nested sub-scopes are pruned.
function glossaryFiles (scope) {
  const root = join(scope, 'content', 'glossary')
  if (!existsSync(root)) return []
  const out = []
  ;(function walk (dir) {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue
        // A nested content/glossary is a sub-scope, not part of this one.
        if (existsSync(join(path, 'content', 'glossary'))) continue
        walk(path)
      } else if (entry.name.endsWith('.md')) out.push(path)
    }
  })(root)
  return out
}

function tagsOf (text) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) return []
  const block = fm[1]
  const tags = []
  const inline = block.match(/^tags:\s*\[([^\]]*)\]/m)
  if (inline) for (const t of inline[1].split(',')) tags.push(t.trim().replace(/['"]/g, ''))
  const listed = block.match(/^tags:\s*\r?\n((?:[ \t]*-[ \t]*.+\r?\n?)+)/m)
  if (listed) {
    for (const line of listed[1].split('\n')) {
      const m = line.match(/^[ \t]*-[ \t]*(.+?)\s*$/)
      if (m) tags.push(m[1].replace(/['"]/g, ''))
    }
  }
  return tags
}

const tagHits = []
for (const [distance, scope] of chain.entries()) {
  for (const file of glossaryFiles(scope)) {
    let text = ''
    try { text = readFileSync(file, 'utf8') } catch { continue }
    if (tagsOf(text).includes(TERM)) tagHits.push({ file, distance })
  }
}

if (tagHits.length > 0) {
  if (opts.json) {
    console.log(JSON.stringify({
      term: TERM, asked_from: rel(askingPoint), resolved: true, via: 'tags',
      tag_hits: tagHits.map((h) => ({ path: rel(h.file), distance: h.distance }))
    }, null, 2))
    process.exit(0)
  }
  console.log(`── recall-a-term "${TERM}" — asked from ${rel(askingPoint)} ──`)
  console.log(`No glossary file is named ${TERM}.md on this chain; found as a \`tags:\` value in ${tagHits.length} in-scope file(s), nearest first:`)
  for (const h of tagHits) console.log(`   ${rel(h.file)}  [${h.distance} level(s) up]`)
  process.exit(0)
}

// ── 3) absence (Belnap ⊥) ──────────────────────────────────────────────────
// Report what exists elsewhere so the caller can re-ask with --from. This NAMES
// out-of-scope files; it does NOT resolve to them. The distinction is the rule.
const elsewhere = (() => {
  const patterns = SUBDIRS.flatMap((sub) => ['-o', '-path', `*/content/glossary/${sub}/${TERM}.md`])
  try {
    return execFileSync('find', [
      ROOT, '-type', 'd', '(', '-name', '.git', '-o', '-name', 'node_modules', ')', '-prune',
      '-o', '-type', 'f', '(', ...patterns.slice(1), ')', '-print'
    ], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').filter(Boolean)
  } catch {
    return []
  }
})()

if (opts.json) {
  console.log(JSON.stringify({
    term: TERM, asked_from: rel(askingPoint), resolved: false,
    out_of_scope: elsewhere.sort().map((p) => rel(p))
  }, null, 2))
  process.exit(1)
}

console.log(`── recall-a-term "${TERM}" — ⊥ NOT FOUND from ${rel(askingPoint)} ──`)
console.log(`No content/glossary/{terms,concepts,topics}/${TERM}.md on the chain ${rel(askingPoint)} → root,`)
console.log(`and no in-scope glossary file lists "${TERM}" under \`tags:\`.`)

if (elsewhere.length > 0) {
  console.log(`\n${elsewhere.length} definition(s) exist elsewhere in the tree, OUT OF SCOPE from here:`)
  for (const p of elsewhere.sort()) console.log(`   ${rel(p)}`)
  console.log(`\nThese are not the answer to this question — nothing below or beside the asking`)
  console.log(`point resolves. To ask from one of those scopes, name it:`)
  const first = rel(elsewhere.sort()[0])
  console.log(`   recall-a-term ${TERM} --from ${dirname(dirname(dirname(dirname(first))))}`)
} else {
  console.log(`\nNo definition anywhere on this chain. For the whole record on the term`)
  console.log(`(every occurrence, whole tree, nothing sampled):`)
  console.log(`   recall-a-term ${TERM} --search`)
  console.log(`To write one at this scope:  write-a-term --home <unit> --slug ${TERM} ...`)
}
process.exit(1)
