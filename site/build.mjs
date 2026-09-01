// Static site generator for the deck docs → GitHub Pages.
//
// The contract, borrowed from tishlang-web: MARKDOWN DICTATES THE DOCS. Adding a page means adding a
// `.md` file inside one of the SECTIONS below — no registration, no route, no nav entry. Title comes
// from frontmatter if present, otherwise the first `#` heading, otherwise the filename.
//
// The one rule specific to this repo: markdown is read WHERE IT ALREADY LIVES. `docs/*.md` are
// package exports (`@spacedevin/deck/grammar` and friends) and ship in the npm tarball, so copying
// them into a `content/` tree would fork the canonical text — the exact drift the conformance corpus
// exists to prevent. The site is a view over the repo, never a second copy of it.
//
//   npm run site        # build to site/out
//   npm run site:serve  # build with base "/" and serve on :4321
//
// Base path defaults to /deck/ because Pages serves a project site under the repo name.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { marked } from 'marked'
import { highlight } from './highlight.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')
const OUT = path.join(HERE, 'out')
const REPO = 'https://github.com/spacedevin/deck'
const BASE = process.env.SITE_BASE ?? '/deck/'

const SITE = {
  title: 'deck',
  tagline: 'Streamable .deck patch language for Tish hosts',
}
// Absolute origin, for llms.txt — that file is read out of context, so relative links are useless.
const SITE_URL = (process.env.SITE_URL ?? 'https://spacedevin.github.io/deck').replace(/\/$/, '')

/**
 * Where markdown comes from. `dir` is globbed for `**\/*.md`, so a new file appears on its own.
 * `order` front-loads a few filenames; anything unlisted sorts alphabetically after them, which is
 * what keeps "just add an .md" true.
 */
const SECTIONS = [
  { label: 'Introduction', dir: '.', slug: '', only: ['README.md'] },
  {
    label: 'Language',
    dir: 'docs',
    slug: 'docs',
    order: ['DECK_GRAMMAR.md', 'EXAMPLES.md', 'RENDERING.md', 'AST.md', 'DECK_EXTENSION.md', 'HOST.md'],
    // Every untagged fence in these files is `.deck` — the grammar reference shows the language it
    // documents, and the host-facing snippets are all tagged `tish`. Declared rather than guessed.
    defaultLang: 'deck',
  },
  {
    label: 'Instruments',
    dir: 'packages/synths',
    slug: 'synths',
    order: ['README.md', 'CATALOG.md'],
    ignore: ['node_modules', 'dist', 'src', 'test'],
    // Same reason as Playback below: README.md is PUBLISHED, so its title and description are
    // declared here rather than in frontmatter that npmjs.com would render as stray text.
    titles: { 'README.md': 'Instruments', 'CATALOG.md': 'Catalog' },
    descriptions: {
      'README.md': 'The instrument catalog for .deck — 33 voices, shared by every host.',
      'CATALOG.md': 'Every voice, its parameters and defaults, and the factory presets.',
    },
    defaultLang: 'deck',
  },
  {
    label: 'Playback',
    dir: 'packages/player',
    slug: 'player',
    order: ['README.md', 'AGENTS.md'],
    ignore: ['node_modules', 'dist', 'test', 'types', 'element'],
    // Both of these open with the same `# @spacedevin/deck-player`, which would put two identical
    // entries in the sidebar. Overridden here rather than with frontmatter because both files are
    // PUBLISHED — npm renders a README verbatim, and a `---` fence after a text line is a setext H2,
    // so frontmatter would show up as a stray rule and a giant "description:" heading on npmjs.com.
    titles: { 'README.md': 'Playback', 'AGENTS.md': 'Player scope' },
    descriptions: {
      'README.md': 'Web Audio playback for .deck — chip-tune synths, a transport, and an element.',
      'AGENTS.md': 'What belongs in the playback package, and what has to stay upstream.',
    },
  },
]

// ── helpers ───────────────────────────────────────────────────────────────────

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const stripTags = (s) => s.replace(/<[^>]*>/g, '')

/**
 * A title is plain text, not markdown. The docs' own H1s carry code spans and links
 * (`# Hosting \`@spacedevin/deck\``), which would otherwise show their backticks in the sidebar and
 * the <title> tag.
 */
const cleanTitle = (s) =>
  s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // links → their text
    .replace(/`([^`]*)`/g, '$1')               // code spans
    .replace(/(\*\*|__|\*|_)/g, '')            // emphasis
    .trim()

/** Frontmatter without a YAML dependency: only `key: value` scalars, which is all the docs use. */
function frontmatter (raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!m) return { data: {}, body: raw }
  const data = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, '')
  }
  return { data, body: raw.slice(m[0].length) }
}

function walk (dir, ignore = []) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ignore.includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, ignore))
    else if (entry.name.endsWith('.md')) out.push(full)
  }
  return out
}

// ── collect pages ─────────────────────────────────────────────────────────────

function collect () {
  const pages = []
  for (const section of SECTIONS) {
    const dir = path.join(ROOT, section.dir)
    let files = section.only
      ? section.only.map((f) => path.join(dir, f)).filter((f) => fs.existsSync(f))
      : walk(dir, section.ignore ?? [])

    const rank = (f) => {
      const i = (section.order ?? []).indexOf(path.basename(f))
      return i === -1 ? Number.MAX_SAFE_INTEGER : i
    }
    files = files.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))

    for (const file of files) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/')
      const raw = fs.readFileSync(file, 'utf8')
      const { data, body } = frontmatter(raw)

      const base = path.basename(file, '.md')
      const isIndex = base === 'README'
      const leaf = isIndex ? '' : slugify(base)
      const route = [section.slug, leaf].filter(Boolean).join('/')

      const name = path.basename(file)
      const h1 = /^#\s+(.+)$/m.exec(body)
      const title = data.title ?? section.titles?.[name] ?? cleanTitle(h1 ? h1[1] : base)
      const description = data.description ?? section.descriptions?.[name] ?? ''

      pages.push({
        section: section.label,
        sourcePath: rel,
        route,
        url: BASE + (route ? route + '/' : ''),
        outFile: path.join(OUT, route, 'index.html'),
        title,
        description,
        defaultLang: section.defaultLang ?? '',
        body,
      })
    }
  }
  return pages
}

// ── markdown → html ───────────────────────────────────────────────────────────

/** Repo-relative path → site URL, for rewriting the links already in these files. */
function buildLinkMap (pages) {
  const map = new Map()
  for (const p of pages) {
    map.set(p.sourcePath, p.url)
    // A README also answers to its directory, so `[player](packages/player/)` resolves.
    if (p.sourcePath.endsWith('README.md')) {
      const dir = p.sourcePath.replace(/README\.md$/, '').replace(/\/$/, '')
      map.set(dir === '' ? '.' : dir, p.url)
      map.set(dir === '' ? './' : dir + '/', p.url)
    }
  }
  return map
}

function rewriteLink (href, fromDir, linkMap) {
  if (!href || /^(https?:|mailto:|#|\/\/)/.test(href)) return href

  const [pathPart, hash = ''] = href.split('#')
  if (!pathPart) return href

  // Resolve against the source file's directory, then normalise to repo-relative.
  const abs = path.resolve(path.join(ROOT, fromDir), pathPart)
  let rel = path.relative(ROOT, abs).split(path.sep).join('/')
  if (rel === '') rel = '.'

  const hit = linkMap.get(rel) ?? linkMap.get(rel.replace(/\/$/, ''))
  if (hit) return hit + (hash ? '#' + hash : '')

  // Not a page on this site — point at the file on GitHub rather than 404.
  if (rel.startsWith('..')) return REPO
  const kind = pathPart.endsWith('/') || fs.existsSync(abs) && fs.statSync(abs).isDirectory() ? 'tree' : 'blob'
  return `${REPO}/${kind}/main/${rel.replace(/\/$/, '')}${hash ? '#' + hash : ''}`
}

/**
 * Does this block actually play? Decided by PARSING it, not by whether someone tagged the fence.
 *
 * The docs are full of grammar notation — `note <midi> <startBeat> <durBeats>` — which colours fine
 * and plays not at all, and equally full of complete songs sitting in untagged fences. A tag is the
 * wrong signal for either. Running the real parser is exact: notation produces errors or no channels,
 * a song produces channels that sound.
 */
function isPlayableDeck (text, player) {
  if (!player) return false
  try {
    const song = player.parseSong(text)
    if (song.errors.length > 0 || song.channels.length === 0) return false
    // A track with neither notes nor an on-step is silent — no point offering Play.
    return song.channels.some(
      (c) => (c.pianoNotes && c.pianoNotes.length > 0) || (c.steps && c.steps.some((s) => s.on))
    )
  } catch {
    return false
  }
}

/** Render one page's markdown. Returns { html, toc }. */
function render (page, linkMap, deck, player) {
  const toc = []
  const fromDir = path.dirname(page.sourcePath)

  const renderer = {
    heading ({ tokens, depth }) {
      const text = this.parser.parseInline(tokens)
      const id = slugify(stripTags(text))
      if (depth === 2 || depth === 3) toc.push({ id, text: stripTags(text), depth })
      return `<h${depth} id="${id}">${text}</h${depth}>\n`
    },
    link ({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens)
      const url = rewriteLink(href, fromDir, linkMap)
      const external = /^https?:/.test(url)
      const attrs = [
        `href="${escapeHtml(url)}"`,
        title ? `title="${escapeHtml(title)}"` : '',
        external ? 'rel="noreferrer"' : '',
      ].filter(Boolean).join(' ')
      return `<a ${attrs}>${text}</a>`
    },
    code ({ text, lang }) {
      const language = lang || page.defaultLang || ''
      const cls = language ? ` class="language-${escapeHtml(language)}"` : ''
      const block = `<pre><code${cls}>${highlight(text, language, deck)}</code></pre>`
      // A block that parses into something audible gets a play button. The element receives the raw
      // source and the <pre> the marked-up copy, so highlighting can never change what is played.
      if (language === 'deck' && isPlayableDeck(text, player)) {
        return `<div class="deck-block">${block}<deck-player>${escapeHtml(text)}</deck-player></div>\n`
      }
      return block + '\n'
    },
  }

  marked.use({ renderer, gfm: true, breaks: false, async: false })
  // The first H1 is already the page title in the header, so drop it from the body. The leading
  // `\s*` matters: stripping frontmatter leaves a newline ahead of the heading, and an anchored
  // pattern without it silently leaves a duplicate title on every page that has frontmatter.
  const body = page.body.replace(/^\s*#\s+.+\n+/, '')
  return { html: marked.parse(body), toc }
}

// ── page shell ────────────────────────────────────────────────────────────────

function sidebar (pages, current) {
  let out = ''
  for (const section of SECTIONS) {
    const items = pages.filter((p) => p.section === section.label)
    if (!items.length) continue
    out += `<div class="nav-section"><span class="nav-label">${escapeHtml(section.label)}</span><ul>`
    for (const p of items) {
      const active = p.route === current.route ? ' class="active"' : ''
      out += `<li><a${active} href="${p.url}">${escapeHtml(p.title)}</a></li>`
    }
    out += '</ul></div>'
  }
  return out
}

function shell (page, pages, html, toc, prev, next, playerAvailable) {
  const tocHtml = toc.length
    ? `<nav class="toc" aria-label="On this page"><span class="nav-label">On this page</span><ul>${toc
        .map((t) => `<li class="d${t.depth}"><a href="#${t.id}">${escapeHtml(t.text)}</a></li>`)
        .join('')}</ul></nav>`
    : ''

  const pager = (prev || next)
    ? `<nav class="pager">${
        prev ? `<a class="prev" href="${prev.url}"><span>Previous</span>${escapeHtml(prev.title)}</a>` : '<span></span>'
      }${
        next ? `<a class="next" href="${next.url}"><span>Next</span>${escapeHtml(next.title)}</a>` : '<span></span>'
      }</nav>`
    : ''

  const desc = page.description || SITE.tagline

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(page.title)}${page.route ? ' · ' + SITE.title : ''}</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta property="og:title" content="${escapeHtml(page.title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<link rel="stylesheet" href="${BASE}style.css">
${playerAvailable ? `<script type="module" src="${BASE}deck-player-element.js"></script>` : ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <a class="brand" href="${BASE}">${SITE.title}</a>
  <nav>
    <a href="${BASE}docs/deck-grammar/">Grammar</a>
    <a href="${BASE}player/">Playback</a>
    <a href="${REPO}" rel="noreferrer">GitHub</a>
  </nav>
</header>
<div class="layout">
  <aside class="sidebar" aria-label="Documentation">${sidebar(pages, page)}</aside>
  <main id="main">
    <h1>${escapeHtml(page.title)}</h1>
    ${page.description ? `<p class="lede">${escapeHtml(page.description)}</p>` : ''}
    ${html}
    ${pager}
    <footer class="edit">
      <a href="${REPO}/blob/main/${page.sourcePath}" rel="noreferrer">Edit this page on GitHub</a>
      <span aria-hidden="true"> · </span>
      <a href="${BASE}llms.txt">llms.txt</a>
    </footer>
  </main>
  ${tocHtml}
</div>
</body>
</html>
`
}

// ── llms.txt ──────────────────────────────────────────────────────────────────

/** First real paragraph of a page, for a one-line summary when there's no `description`. */
function firstParagraph (body) {
  const text = body
    .replace(/^\s*#\s+.+\n+/, '')     // drop the H1
    .replace(/```[\s\S]*?```/g, '')   // and any code
  for (const chunk of text.split(/\n\s*\n/)) {
    const line = chunk.trim().replace(/\s+/g, ' ')
    if (line && !line.startsWith('#') && !line.startsWith('|') && !line.startsWith('-')) {
      return cleanTitle(line).replace(/\.$/, '')
    }
  }
  return ''
}

/**
 * llms.txt + llms-full.txt, per llmstxt.org and the shape Deckard uses: a curated index of links with
 * one-line summaries, plus one file with every page's markdown in it.
 *
 * Both are generated from the same pages as the HTML, so they cannot fall behind the docs — which is
 * the failure mode a hand-written llms.txt always eventually has.
 */
function writeLlms (pages) {
  const abs = (p) => SITE_URL + p.url.replace(BASE, '/')

  const index = [
    `# ${SITE.title}`,
    '',
    `> ${SITE.tagline}. Two packages: \`@spacedevin/deck\` parses the language, ` +
      '`@spacedevin/deck-player` plays it through Web Audio.',
    '',
    'Line-oriented, streamable patch text. Times are in quarter-note beats; one bar = 4 beats = 16',
    'sixteenth steps. The parser is deliberately parse-only — absent optionals stay `null` and no',
    'clamping happens, because defaults and ranges are host policy. One Tish source emits three',
    'targets (Tish, JS, Rust) checked against a single conformance corpus.',
    '',
    '## Docs',
    '',
  ]
  for (const p of pages) {
    const summary = p.description || firstParagraph(p.body)
    index.push(`- [${p.title}](${abs(p)})${summary ? ': ' + summary : ''}`)
  }
  index.push(
    '',
    '## Optional',
    '',
    `- [Full docs as one file](${SITE_URL}/llms-full.txt): every page above, concatenated`,
    `- [Source repository](${REPO}): the markdown on this site lives here`,
    `- [Conformance corpus](${REPO}/tree/main/conformance): the cross-implementation contract — ` +
      'the same `.deck` inputs and expected parses, run by the JS build, the Rust crate and any host',
    `- [Golden fixture](${REPO}/blob/main/fixtures/golden.deck): one file exercising the whole language`,
    ''
  )
  fs.writeFileSync(path.join(OUT, 'llms.txt'), index.join('\n'))

  const full = [`# ${SITE.title} — full documentation`, '', `> Generated from the docs. Site: ${SITE_URL}`, '']
  for (const p of pages) {
    full.push('', '---', '', `# ${p.title}`, '', `Source: ${p.sourcePath}`, '', p.body.replace(/^\s*#\s+.+\n+/, '').trim(), '')
  }
  fs.writeFileSync(path.join(OUT, 'llms-full.txt'), full.join('\n'))
}

// ── build ─────────────────────────────────────────────────────────────────────

async function build () {
  const playerBundle = path.join(ROOT, 'packages/player/dist/deck-player.js')
  const playerElement = path.join(ROOT, 'packages/player/element/deck-player-element.js')
  const playerAvailable = fs.existsSync(playerBundle) && fs.existsSync(playerElement)

  // The language build supplies `.deck` highlighting from its own keyword tables — see
  // site/highlight.mjs. Missing (a clean checkout that hasn't run `npm run build`) just means deck
  // blocks render as plain text; the site still builds.
  const deckBundle = path.join(ROOT, 'dist/deck.js')
  let deck = null
  let player = null
  if (playerAvailable) {
    player = await import(pathToFileURL(playerBundle).href)
  }
  if (fs.existsSync(deckBundle)) {
    deck = await import(pathToFileURL(deckBundle).href)
    // Pick up the player's host vocabulary (`wave`, `layer`, …) so those colour too. This is the
    // registry mechanism the docs describe, used for real.
    if (player) {
      player.bootDeckRegistries()
    }
    // `id` is a structural marker in a track header (`track <name> id <channelId> gen <id>`) but is
    // not in the package's INLINE_KEYS, so `lead` coloured while `id` next to it did not. Added
    // through the documented host hook rather than by special-casing it in the tokenizer.
    deck.registerHighlightKeywords({ inline: ['id'] })
  }

  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })

  const pages = collect()
  const linkMap = buildLinkMap(pages)

  pages.forEach((page, i) => {
    const { html, toc } = render(page, linkMap, deck, player)
    const out = shell(page, pages, html, toc, pages[i - 1], pages[i + 1], playerAvailable)
    fs.mkdirSync(path.dirname(page.outFile), { recursive: true })
    fs.writeFileSync(page.outFile, out)
  })

  fs.copyFileSync(path.join(HERE, 'style.css'), path.join(OUT, 'style.css'))
  writeLlms(pages)

  if (playerAvailable) {
    // The element imports `../dist/deck-player.js`; flatten that to a sibling for the static site.
    fs.copyFileSync(playerBundle, path.join(OUT, 'deck-player.js'))
    const el = fs.readFileSync(playerElement, 'utf8').replace('../dist/deck-player.js', './deck-player.js')
    fs.writeFileSync(path.join(OUT, 'deck-player-element.js'), el)
  }

  // Pages runs Jekyll over the artifact otherwise, which eats files starting with an underscore.
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '')

  console.log(`site: ${pages.length} pages → ${path.relative(ROOT, OUT)} (base ${BASE})`)
  for (const p of pages) console.log(`  ${p.url.padEnd(24)} ${p.sourcePath}`)
  if (!playerAvailable) {
    console.log('  note: player bundle missing — deck blocks built without play buttons')
    console.log('        run `npm run build -w @spacedevin/deck-player` first')
  }
  if (!deck) {
    console.log('  note: dist/deck.js missing — deck blocks built without highlighting')
    console.log('        run `npm run build` first')
  }
}

await build()
