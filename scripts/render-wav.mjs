#!/usr/bin/env node
// Render a .deck file to a .wav from the command line.
//
// The voices are Web Audio — oscillators, biquads, wave shapers and an AudioWorklet for the sync
// oscillators — so there is no pure-Node path to a rendered buffer. This drives a headless Chrome
// over CDP, calls the player's own `renderDeckToBuffer()` inside an OfflineAudioContext, and brings
// the samples back. Offline rendering is deterministic and runs far faster than real time.
//
//   node scripts/render-wav.mjs song.deck -o song.wav
//   node scripts/render-wav.mjs song.deck -o song.wav --beats 32 --normalize
//
// Set CHROME to override browser discovery.

import { spawn } from 'node:child_process'
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PLAYER_DIST = path.join(HERE, '..', 'packages', 'player', 'dist')

const CHROMES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

function usage (msg) {
  if (msg) console.error(`render-wav: ${msg}\n`)
  console.error(`usage: node scripts/render-wav.mjs <file.deck> -o <out.wav> [options]

  -o, --out <path>     output WAV (required)
      --beats <n>      how many beats to render (default: the song's own length)
      --gain <g>       master gain, 0..1 (default 0.9)
      --sample-rate <n>  default 44100
      --no-reverb      bypass the reverb send
      --normalize      scale the result to peak at -1 dBFS`)
  process.exit(msg ? 2 : 0)
}

function parseArgs (argv) {
  const o = { sampleRate: 44100, reverb: true }
  const rest = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '-h' || a === '--help') usage()
    else if (a === '-o' || a === '--out') o.out = argv[++i]
    else if (a === '--beats') o.beats = Number(argv[++i])
    else if (a === '--gain') o.gain = Number(argv[++i])
    else if (a === '--sample-rate') o.sampleRate = Number(argv[++i])
    else if (a === '--no-reverb') o.reverb = false
    else if (a === '--normalize') o.normalize = true
    else if (a.startsWith('-')) usage(`unknown option ${a}`)
    else rest.push(a)
  }
  o.input = rest[0]
  return o
}

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html' }

function serve (dir, port) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/player\/?/, '')
    const file = path.join(dir, rel)
    if (!file.startsWith(path.resolve(dir)) || !existsSync(file) || !statSync(file).isFile()) {
      res.statusCode = 404
      return res.end('not found')
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream')
    createReadStream(file).pipe(res)
  })
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r(server)))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function connect (port) {
  let url = null
  for (let i = 0; i < 80 && !url; i++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      url = tabs.find((t) => t.type === 'page')?.webSocketDebuggerUrl
    } catch { /* not up yet */ }
    if (!url) await sleep(250)
  }
  if (!url) throw new Error('Chrome never opened a debugging port')
  const ws = new WebSocket(url)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let id = 0
  const pending = new Map()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    const p = pending.get(m.id)
    if (!p) return
    pending.delete(m.id)
    m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result)
  }
  const send = (method, params = {}) => new Promise((res, rej) => {
    const n = ++id
    pending.set(n, { res, rej })
    ws.send(JSON.stringify({ id: n, method, params }))
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'evaluate failed')
    return r.result.value
  }
  return { send, evaluate, close: () => ws.close() }
}

// Runs in the page: render, measure, and hand back a base64 WAV.
const PAGE = `window.__renderDeck = async (src, opts) => {
  const P = await import('/player/deck-player.js')
  const song = P.parseSong(src)
  if (song.errors && song.errors.length) return { errors: song.errors }

  const buf = await P.renderDeckToBuffer(src, opts)

  const chans = []
  for (let c = 0; c < buf.numberOfChannels; c++) chans.push(buf.getChannelData(c))
  let peak = 0, sum = 0, n = 0
  for (const d of chans) {
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; n++ }
  }
  const rms = Math.sqrt(sum / Math.max(1, n))

  const scale = opts.normalize && peak > 0 ? 0.891 / peak : 1
  const len = buf.length, ch = chans.length, sr = buf.sampleRate
  const view = new DataView(new ArrayBuffer(44 + len * ch * 2))
  const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); view.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVEfmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, ch, true)
  view.setUint32(24, sr, true); view.setUint32(28, sr * ch * 2, true)
  view.setUint16(32, ch * 2, true); view.setUint16(34, 16, true)
  str(36, 'data'); view.setUint32(40, len * ch * 2, true)
  let o = 44
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
    const s = Math.max(-1, Math.min(1, chans[c][i] * scale))
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2
  }
  const bytes = new Uint8Array(view.buffer)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return {
    wav: btoa(bin), peak, rms, seconds: len / sr,
    substitutions: song.substitutions || [], channels: song.channels.length,
  }
}`

async function main () {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.input) usage('no input file')
  if (!opts.out) usage('no -o output path')
  if (!existsSync(opts.input)) usage(`${opts.input} does not exist`)
  if (!existsSync(path.join(PLAYER_DIST, 'deck-player.js'))) {
    usage('packages/player/dist/deck-player.js is missing — run `npm run build` first')
  }

  const chrome = CHROMES.find((c) => existsSync(c))
  if (!chrome) {
    console.error('render-wav: no Chrome or Chromium found. Set CHROME to its path.')
    process.exit(1)
  }

  const src = readFileSync(opts.input, 'utf8')
  const port = 9500 + (process.pid % 400)
  const cdpPort = port + 1
  const server = await serve(PLAYER_DIST, port)
  const profile = path.join(os.tmpdir(), `deck-render-${process.pid}`)
  const proc = spawn(chrome, [
    '--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] })

  let cdp
  try {
    cdp = await connect(cdpPort)
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/player/blank.html` })
    // The dist directory has no HTML; a 404 body is a fine origin to import a module from.
    await sleep(300)
    await cdp.evaluate(PAGE)

    const payload = JSON.stringify({
      beats: opts.beats, gain: opts.gain, reverb: opts.reverb,
      sampleRate: opts.sampleRate, normalize: !!opts.normalize,
    })
    const out = await cdp.evaluate(
      `window.__renderDeck(${JSON.stringify(src)}, ${payload})`,
    )

    if (out.errors) {
      console.error('render-wav: the song did not parse')
      for (const e of out.errors) console.error(`  ${e.line ?? '?'}: ${e.message ?? JSON.stringify(e)}`)
      process.exit(1)
    }

    writeFileSync(opts.out, Buffer.from(out.wav, 'base64'))
    const db = (v) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-inf')
    console.log(`${opts.out}  ${out.seconds.toFixed(2)}s  ${out.channels} tracks  peak ${db(out.peak)} dBFS  rms ${db(out.rms)} dBFS`)
    if (out.substitutions.length) {
      console.log('substituted (no voice for these ids):')
      for (const s of out.substitutions) console.log(`  ${s.generatorId ?? JSON.stringify(s)}`)
    }
  } finally {
    cdp?.close()
    proc.kill()
    server.close()
  }
}

main().catch((e) => { console.error(`render-wav: ${e.message}`); process.exit(1) })
