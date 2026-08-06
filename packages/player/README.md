# @spacedevin/deck-player

Web Audio playback for **`.deck`** — chip-tune synths, a lookahead transport, and a `<deck-player>`
element.

[`@spacedevin/deck`](../..) parses the language. This package is the **host**: it applies the
defaults and clamps the parser deliberately leaves out, and it makes sound.

## Install

```bash
npm install @spacedevin/deck-player
```

## Use

```js
import { createDeckPlayer } from '@spacedevin/deck-player'

const player = createDeckPlayer()
const song = player.load(`
deck 1
bpm 120

track Lead id lead gen gameBoyDmg
  gen type pulse duty 50 vol 12
  note 60 0 0.5 v 100
  note 64 0.5 0.5 v 90
  note 67 1 1 v 100
`)

if (song.errors.length) console.warn(song.errors)
button.onclick = () => player.play()   // an AudioContext needs a user gesture
```

Or drop in the element — no framework, no build step:

```html
<script type="module" src="/node_modules/@spacedevin/deck-player/element/deck-player-element.js"></script>

<deck-player>
deck 1
bpm 120
track Lead id lead gen gameBoyDmg
  note 60 0 0.5 v 100
</deck-player>

<deck-player src="/music/theme.deck"></deck-player>
```

## Hear it

A whole song is three kinds of line: a tempo, a track, and some notes. On the docs site this block
has a play button — the synths below are doing the work.

```deck
deck 1
bpm 132

track Lead id lead gen gameBoyDmg
  gen type pulse duty 25 vol 11
  note 72 0 0.5 v 110
  note 76 0.5 0.5 v 95
  note 79 1 0.5 v 105
  note 76 1.5 0.5 v 90
  note 72 2 1 v 110
  note 74 3 1 v 95

track Bass id bass gen gameBoyDmg
  gen type wave wave_shape saw vol 15
  note 36 0 1 v 120
  note 36 1 1 v 100
  note 43 2 1 v 115
  note 41 3 1 v 100

track Kick id kick gen gbaDirectSound
  gen waveform triangle pitch_drop -14
  adsr a 0 d 0.08 s 0 r 0
  note 36 0 0.25 v 127
  note 36 1 0.25 v 110
  note 36 2 0.25 v 127
  note 36 3 0.25 v 110
```

## API

| | |
|---|---|
| `createDeckPlayer(opts?)` | `load` · `play` · `pause` · `stop` · `seek(beat)` · `position()` · `duration()` · `setIntensity(0..3)` · `analyser()` · `on(event, fn)` · `dispose()` |
| `renderDeckToBuffer(src, opts?)` | offline render through the same graph → `Promise<AudioBuffer>` |
| `parseSong(src)` | `.deck` → Song IR. No AudioContext, no sound |
| `stepTriggers(song, step)` | which notes sound at a 16th step. Pure |
| `buildAudioGraph` · `createTransport` · `playStep` | the pieces, if you want your own loop |

`load()` returns the Song, including three things worth showing a user:

- **`errors`** — parse errors plus host errors (a malformed `gen` line, a bad `wave` table)
- **`substitutions`** — generators that were swapped for `basicOsc` (see below)
- **`ignored`** — language features present in the source that this package doesn't sequence yet:
  clips/session, `song`/`follow` arrangement, `auto` automation, `master_mix`, `@` directives

## Sound

The synths are a source-level port of [Deckard](https://deckard.lol)'s, which are themselves checked
against tish-gba's build-time bake — so a `.deck` sounds the same in a browser as it does on a GBA.
That means real hardware behaviour, not an impression of it:

- **`gameBoyDmg`** — the four duty tables in an 8-sample buffer pitched by `playbackRate`; a genuine
  15/7-bit LFSR for noise; wave RAM quantized to 4 bits; the 64 Hz / 32 Hz frequency floors; the
  15-step volume envelope
- **`gbaDirectSound`** — a 32-sample table (so high notes alias like the real software mixer), an
  8-bit DAC as a 256-step staircase, and the ~16 kHz mixing roll-off
- **`wave <name> <32 hex nibbles>`** — named wave RAM tables, and `layer` stem gating via
  `setIntensity()`

Everything else — `matrixFm`, `patch`, `nes2a03`, `c64sid`, and the rest — falls back to a plain
oscillator so a song still plays, and says so in `song.substitutions`. `ttsVocal` / `meSpeakVocal`
are out of scope: they need the Web Speech API.

## Notes

- **Players are aware of each other.** Starting one stops any other that's playing — two chip songs
  at once is noise, and a page like this one has several players on it. Pass `{ exclusive: false }`
  to layer them deliberately.
- **One AudioContext per page.** Players share a single lazily-created context unless you pass your
  own, because a context is a page-level resource and Safari has historically refused past about
  four.
- **No assets to copy.** The clock worklet is compiled from an inline string into a Blob URL, so
  installing the package is the whole install.
- **Deterministic.** Probability locks, arpeggiator shuffles and the reverb impulse are all seeded, so
  two renders of one song are identical.
- **Pause is real pause.** It suspends the AudioContext, so notes and the scheduler resume exactly
  where they stopped.
- Requires `AudioContext`; playback must start from a user gesture.

## Scope

See [AGENTS.md](AGENTS.md). Grammar changes belong upstream in `@spacedevin/deck` — never re-tokenize
`.deck` text here.

## License

Pay It Forward (PIF) — see [LICENSE](../../LICENSE).
