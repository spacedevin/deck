// Syntax highlighting for the docs site.
//
// Two highlighters, for two different reasons:
//
//   `deck`  — uses THIS REPO'S OWN highlight exports (`isKeyword`, `isInlineKeyword`, `isStepToken`,
//             `classifyLine`). The package ships those precisely so a host can colour `.deck`, so the
//             deck docs colouring itself with them is the honest test of that API. It also means the
//             vocabulary can never drift from the language: add a keyword to src/deckfile/Highlight
//             .tish and the site picks it up, no second keyword list to forget.
//
//   everything else — highlight.js, core build with only the languages the docs actually use, so we
//             don't pull 190 grammars into the build for four of them.
//
// `tish` is registered by hand: it is JS-shaped but `fn`, `///` doc comments and type annotations are
// its own, and no library ships a grammar for it.

import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import rust from 'highlight.js/lib/languages/rust'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)

hljs.registerLanguage('tish', (hl) => ({
  name: 'Tish',
  aliases: ['tsh'],
  keywords: {
    keyword:
      'import export from as let const fn return if else while for in of break continue ' +
      'new typeof instanceof delete void throw try catch finally async await yield',
    literal: 'true false null undefined',
    built_in:
      'Math JSON Object Array String Number Boolean Promise Set Map Date RegExp console ' +
      'Float32Array Float64Array Int8Array Int16Array Int32Array Uint8Array Uint16Array Uint32Array',
  },
  contains: [
    hl.QUOTE_STRING_MODE,
    hl.APOS_STRING_MODE,
    { className: 'string', begin: '`', end: '`', contains: [hl.BACKSLASH_ESCAPE] },
    // `///` doc comments are the house style; C_LINE_COMMENT_MODE covers them since they start `//`.
    hl.C_LINE_COMMENT_MODE,
    hl.C_BLOCK_COMMENT_MODE,
    hl.C_NUMBER_MODE,
    { className: 'title.function', begin: /(?<=\bfn\s+)[A-Za-z_$][\w$]*/ },
    { className: 'title.class', begin: /\b[A-Z][\w$]*(?=\s*[({])/ },
  ],
}))

const ALIASES = { js: 'javascript', ts: 'javascript', sh: 'bash', shell: 'bash', html: 'xml', yml: 'yaml' }

export const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── deck ──────────────────────────────────────────────────────────────────────

/**
 * Colour one `.deck` line, preserving its exact whitespace — indentation is syntax here (2+ spaces
 * nests a body under the open block), so a tokenizer that drops it would change what the reader sees.
 *
 * `deck` is passed in rather than imported so the caller controls which build is used, and so this
 * module still loads when `dist/` has not been built yet.
 */
function highlightDeckLine (line, deck) {
  // A `#` only starts a comment at column 0 or after whitespace — otherwise it is data, which is
  // exactly what makes `scale F# minor` and a track named `C#maj` work.
  const cut = /(^|\s)#/.exec(line)
  const code = cut ? line.slice(0, cut.index + cut[1].length) : line
  const comment = cut ? line.slice(cut.index + cut[1].length) : ''

  const info = deck.classifyLine(code)
  const stepIdx = new Set(info.stepIndices ?? [])

  // Walk runs of whitespace and non-whitespace so the original spacing survives verbatim. Collected
  // first because classifying a `key value` pair needs to see the NEXT token.
  const parts = []
  let tokenIndex = 0
  for (const m of code.matchAll(/(\s+)|(\S+)/g)) {
    if (m[1]) parts.push({ space: m[1] })
    else parts.push({ tok: m[2], index: tokenIndex++ })
  }
  const tokens = parts.filter((p) => p.tok)
  const isPlaceholder = (t) => !!t && (/^<.+>$/.test(t) || t === '…')

  // `gen <snake_key> <val> …` — these heads take alternating key/value pairs, per the grammar. That
  // is exact, where guessing from the next token's shape is not: in `gen type pulse duty 25`, `type`
  // introduces a word and `duty` a number, but both are keys.
  const head = tokens[0]?.tok
  const isKvLine = head === 'gen' || head === 'fx' || head === 'voice' || head === 'adsr' || head === 'mix'
  // A generator id follows `gen` only in a TRACK HEADER (`track X id y gen gameBoyDmg`). In a body
  // `gen …` line the same word introduces a param key instead.
  const headerGen = head === 'track' || head === 'clip'

  let out = ''
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part.space) { out += part.space; continue }

    const tok = part.tok
    const at = tokens.indexOf(part)
    const next = tokens[at + 1]?.tok
    const prev = tokens[at - 1]?.tok
    const first = part.index === 0
    let cls = null

    if (isPlaceholder(tok)) {
      // Grammar notation — `note <midi> <startBeat>` — a slot, not a value.
      cls = 'dk-ph'
    } else if (/^[[\]|…]+$/.test(tok)) {
      cls = 'dk-ph'
    } else if (first && deck.isKeyword(tok)) {
      cls = 'dk-kw'
    } else if (info.kind === 'steps' && stepIdx.has(part.index)) {
      cls = 'dk-step'
    } else if (deck.isInlineKeyword(tok)) {
      cls = 'dk-inline'
    } else if (deck.isNumberToken(tok)) {
      cls = 'dk-num'
    } else if (((prev === 'gen' && headerGen) || prev === 'id' || prev === 'gen_block') && /^[A-Za-z_]/.test(tok)) {
      cls = 'dk-id'
    } else if (!first && deck.isKeyword(tok)) {
      // `end gen_block`, and inline heads that follow another keyword.
      cls = 'dk-kw'
    } else if (isKvLine && at >= 1) {
      cls = at % 2 === 1 ? 'dk-param' : 'dk-val'
    } else if (
      /^[a-z][a-z0-9_]*$/.test(tok) &&
      // `next` is undefined at the end of a line, and isNumberToken reads `.length` unguarded.
      next !== undefined &&
      (deck.isNumberToken(next) || isPlaceholder(next))
    ) {
      // Grammar notation outside a kv head — `cutoff <n>`. Shape is the only tell there, since the
      // parser keeps no list of param keys (they are generator-specific and host-registered).
      cls = 'dk-param'
    }

    out += cls ? `<span class="${cls}">${escapeHtml(tok)}</span>` : escapeHtml(tok)
  }

  if (comment) out += `<span class="dk-comment">${escapeHtml(comment)}</span>`
  return out
}

export function highlightDeck (src, deck) {
  return src.split('\n').map((line) => highlightDeckLine(line, deck)).join('\n')
}

// ── entry point ───────────────────────────────────────────────────────────────

/** Highlighted HTML for a fenced block. Falls back to escaped plain text for anything unknown. */
export function highlight (code, lang, deck) {
  const name = ALIASES[lang] ?? lang

  if (name === 'deck') {
    return deck ? highlightDeck(code, deck) : escapeHtml(code)
  }
  if (name && hljs.getLanguage(name)) {
    try {
      return hljs.highlight(code, { language: name, ignoreIllegals: true }).value
    } catch {
      return escapeHtml(code)
    }
  }
  return escapeHtml(code)
}
