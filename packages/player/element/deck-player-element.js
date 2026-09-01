// <deck-player> — a framework-agnostic custom element wrapping createDeckPlayer.
//
//   <script type="module" src=".../element/deck-player-element.js"></script>
//   <deck-player>
//     deck 1
//     bpm 120
//     track Lead id lead gen gameBoyDmg
//       note 60 0 0.5 v 100
//   </deck-player>
//
//   <deck-player src="/music/theme.deck"></deck-player>
//
// Source comes from the element's text content, or from a `src` attribute. Everything renders into a
// shadow root, so the host page's CSS can't reshape the controls and the controls can't leak out.
// The AudioContext is created on the first click, which is what the autoplay policy wants.
//
// THIS FILE IS PLAIN JAVASCRIPT, not Tish, and is shipped as authored rather than built. A custom
// element has to be `class X extends HTMLElement`, and Tish has no class syntax — `tish build` parses
// the declaration as an identifier expression and emits JS that doesn't even load. Everything with
// actual behaviour lives in the Tish source; this is the DOM shell around it.

import { createDeckPlayer, stepTriggers } from '../dist/deck-player.js'

const STYLES = `
:host { display: inline-flex; align-items: center; gap: 8px; font: inherit; color: inherit;
  vertical-align: middle; }
:host([hidden]) { display: none; }
button { font: inherit; font-size: 0.85em; line-height: 1; cursor: pointer; color: inherit;
  background: color-mix(in srgb, currentColor 10%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
  border-radius: 6px; padding: 5px 10px; display: inline-flex; align-items: center; gap: 6px; }
button:hover:not(:disabled) { background: color-mix(in srgb, currentColor 20%, transparent); }
button:disabled { opacity: 0.45; cursor: default; }
button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.bar { position: relative; width: 72px; height: 4px; border-radius: 2px; overflow: hidden;
  background: color-mix(in srgb, currentColor 20%, transparent); }
.bar > i { position: absolute; inset: 0 auto 0 0; width: 0; background: currentColor;
  border-radius: 2px; }
.err { font-size: 0.75em; opacity: 0.8; }
@media (prefers-reduced-motion: no-preference) { .bar > i { transition: width 90ms linear; } }
`

export class DeckPlayerElement extends HTMLElement {
  static get observedAttributes () {
    return ['src']
  }

  constructor () {
    super()
    this._player = null
    this._raf = 0
    this._song = null
    this._built = false
    this.attachShadow({ mode: 'open' })
  }

  /** The parsed Song, so a page can surface `errors` or `substitutions`. */
  get song () {
    return this._song
  }

  connectedCallback () {
    if (!this._built) this._build()
    const src = this.getAttribute('src')
    if (src) this._loadFromUrl(src)
    else this._setSource(this.textContent)
  }

  disconnectedCallback () {
    this._stopTicking()
    if (this._player) {
      this._player.dispose()
      this._player = null
    }
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'src' && newValue && newValue !== oldValue && this._built) {
      this._loadFromUrl(newValue)
    }
  }

  _build () {
    this._built = true
    const style = document.createElement('style')
    style.textContent = STYLES

    this._button = document.createElement('button')
    this._button.type = 'button'
    this._button.addEventListener('click', () => this._toggle())
    this._icon = document.createElement('span')
    this._icon.setAttribute('aria-hidden', 'true')
    this._label = document.createElement('span')
    this._button.append(this._icon, this._label)

    this._bar = document.createElement('div')
    this._bar.className = 'bar'
    this._fill = document.createElement('i')
    this._bar.append(this._fill)

    this._note = document.createElement('span')
    this._note.className = 'err'

    this.shadowRoot.append(style, this._button, this._bar, this._note)
    this._paint('idle')
  }

  _loadFromUrl (url) {
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.text()
      })
      .then((text) => this._setSource(text))
      .catch(() => {
        this._note.textContent = `could not load ${url}`
        this._button.disabled = true
      })
  }

  _setSource (text) {
    if (!this._player) {
      this._player = createDeckPlayer()
      this._player.on('stop', () => {
        this._stopTicking()
        this._paint('idle')
      })
    }
    this._song = this._player.load(text ? String(text) : '')
    if (this._song && this._song.errors.length) {
      const e = this._song.errors[0]
      this._note.textContent = `line ${e.line}: ${e.msg}`
    } else if (this._song && this._song.substitutions.length) {
      const ids = [...new Set(this._song.substitutions.map((s) => s.generatorId))]
      this._note.textContent = `approximating ${ids.join(', ')}`
    } else {
      this._note.textContent = ''
    }
    this._paint('idle')
    this.dispatchEvent(new CustomEvent('deck-load', { detail: this._song }))
  }

  _toggle () {
    if (!this._player || !this._song) return
    if (this._player.isPlaying()) {
      this._player.pause()
      this._stopTicking()
      this._paint('paused')
      return
    }
    this._player.play()
    this._paint('playing')
    this._startTicking()
  }

  _paint (state) {
    const playable = !!this._song && this._song.channels.length > 0
    this._button.disabled = !playable
    const playing = state === 'playing'
    const label = playing ? 'Pause' : state === 'paused' ? 'Resume' : 'Play'
    this._icon.textContent = playing ? '❚❚' : '▶'
    this._label.textContent = label
    this._button.setAttribute('aria-label', label)
    if (state === 'idle') this._fill.style.width = '0%'
  }

  /**
   * The highlighted copy of this song, if the page rendered one next to us.
   *
   * The element owns the audio; the code block is the page's. They are matched up through the data
   * attributes the highlighter emits — `data-track` on every line, `data-step` on every step in a
   * lane — so neither has to know how the other is built, and a `<deck-player>` with no code beside
   * it simply finds nothing and lights nothing.
   */
  _collectCode () {
    this._lines = []
    this._lanes = []
    this._lastStep = -1
    const host = this.closest('.deck-block') ?? this.parentElement
    const code = host ? host.querySelector('pre') : null
    if (!code) return
    this._lines = Array.from(code.querySelectorAll('.dk-line[data-track]'))
    for (const line of this._lines) {
      const steps = Array.from(line.querySelectorAll('[data-step]'))
      if (steps.length) this._lanes.push(steps)
    }
  }

  _clearCode () {
    for (const lane of this._lanes ?? []) {
      for (const s of lane) s.classList.remove('dk-now')
    }
    for (const line of this._lines ?? []) line.classList.remove('dk-live')
    this._lastStep = -1
  }

  /** Light the step under the playhead, and the lines of every track sounding on it. */
  _paintCode (pos) {
    const step = Math.floor(pos * 4)
    if (step === this._lastStep) return
    this._lastStep = step

    // Lanes are their own length: a 16-step lane and a 32-step lane under the same playhead are at
    // different places in their own patterns, which is exactly what the sequencer does with them.
    for (const lane of this._lanes) {
      const at = ((step % lane.length) + lane.length) % lane.length
      for (let i = 0; i < lane.length; i++) lane[i].classList.toggle('dk-now', i === at)
    }

    let live = null
    try {
      live = new Set(stepTriggers(this._song, step).map((t) => t.busIndex))
    } catch {
      return
    }
    for (const line of this._lines) {
      line.classList.toggle('dk-live', live.has(Number(line.dataset.track)))
    }
  }

  _startTicking () {
    this._stopTicking()
    this._collectCode()
    const tick = () => {
      if (!this._player || !this._player.isPlaying()) return
      const span = this._song.totalBeats ?? this._song.loopBeats
      const pos = this._player.position()
      this._fill.style.width = `${span > 0 ? ((pos % span) / span) * 100 : 0}%`
      if (this._lines.length) this._paintCode(pos)
      this._raf = requestAnimationFrame(tick)
    }
    this._raf = requestAnimationFrame(tick)
  }

  _stopTicking () {
    if (this._raf) {
      cancelAnimationFrame(this._raf)
      this._raf = 0
    }
    this._clearCode()
  }
}

/** Define `<deck-player>`. Idempotent, and a no-op where there is no `customElements`. */
export function defineDeckPlayerElement () {
  if (typeof customElements === 'undefined') return
  if (customElements.get('deck-player')) return
  customElements.define('deck-player', DeckPlayerElement)
}

defineDeckPlayerElement()
