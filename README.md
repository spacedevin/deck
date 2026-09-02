# deck

**A tiny text language for writing music, and the packages that play it.**

[![npm: @spacedevin/deck](https://img.shields.io/npm/v/@spacedevin/deck?label=%40spacedevin%2Fdeck)](https://www.npmjs.com/package/@spacedevin/deck)
[![npm: @spacedevin/deck-synths](https://img.shields.io/npm/v/@spacedevin/deck-synths?label=%40spacedevin%2Fdeck-synths)](https://www.npmjs.com/package/@spacedevin/deck-synths)
[![npm: @spacedevin/deck-player](https://img.shields.io/npm/v/@spacedevin/deck-player?label=%40spacedevin%2Fdeck-player)](https://www.npmjs.com/package/@spacedevin/deck-player)
[![crates.io: deckfile](https://img.shields.io/crates/v/deckfile?label=crates.io%3A%20deckfile)](https://crates.io/crates/deckfile)
[![CI](https://github.com/spacedevin/deck/actions/workflows/ci.yml/badge.svg)](https://github.com/spacedevin/deck/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**▶ [Hear it on the docs site](https://spacedevin.github.io/deck/)** · [Examples](docs/EXAMPLES.md) · [Grammar](docs/DECK_GRAMMAR.md) · [Contributing](CONTRIBUTING.md)

```deck
deck 1
bpm 132

track Lead id lead gen gameBoyDmg
  gen type pulse duty 25 vol 11
  note 72 0 0.5 v 110
  note 76 0.5 0.5 v 95
  note 79 1 1 v 105
  note 76 2 0.5 v 100
  note 72 2.5 1.5 v 110

track Bass id bass gen gameBoyDmg
  gen type wave wave_shape saw vol 15
  note 36 0 2 v 120
  note 43 2 2 v 110

track Kick id kick gen gbaDirectSound
  gen waveform triangle pitch_drop -14
  adsr a 0 d 0.08 s 0 r 0
  step_pitch 36
  steps x . . . x . . x x . . . x . . .
```

That is a whole song: a tempo, three tracks, and what each one plays — melody as notes on a beat
grid, drums as a step pattern. Press play on the [docs site](https://spacedevin.github.io/deck/) and
the browser synthesises it while the code lights up: the step under the playhead in each lane, and
the lines of every track sounding on it.

`.deck` is line-oriented and streamable, so it can be typed, diffed, generated, and sent over a wire
a line at a time. Times are in quarter-note beats; one bar is 4 beats or 16 sixteenth steps. The
parser is deliberately parse-only — absent optionals stay `null` and nothing is clamped — because
defaults and ranges are the host's policy.

## The packages

| Package | What it is | Install |
|---|---|---|
| [`@spacedevin/deck`](.) | The language: tokenize, parse, format, registries, highlight classification. No audio. | `npm i @spacedevin/deck` |
| [`@spacedevin/deck-synths`](packages/synths/) | The instrument catalog: 33 Web Audio voices — Game Boy, NES, C64 SID, YM2612, SPC700, FM, drums, hard sync, bowed and plucked models, vocals. | `npm i @spacedevin/deck-synths` |
| [`@spacedevin/deck-player`](packages/player/) | The host: Song IR with defaults and clamps, a lookahead transport, offline render, and a `<deck-player>` element. | `npm i @spacedevin/deck-player` |

Dependencies point one way — player → synths → deck — so the language stays audio-free and the
voices can be reused by any host. The same Tish source also emits a Rust crate,
[`deckfile`](https://crates.io/crates/deckfile), checked against the same conformance corpus as the JS build.

## Quick start

**Play it in a page.** No framework, no build step:

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

**Play it from code:**

```js
import { createDeckPlayer } from '@spacedevin/deck-player'

let player = createDeckPlayer()
let song = player.load(source)          // returns the Song, with errors / substitutions / ignored
button.onclick = () => player.play()    // an AudioContext needs a user gesture
```

**Parse it only:**

```tish
import { parseProgram, registerGeneratorIdAliases, registerGenBlockDialect } from "@spacedevin/deck"

registerGeneratorIdAliases({ matrix_fm: "matrixFm" }, { matrixFm: "matrix_fm" })
// registerGenBlockDialect(...) — host supplies patch / matrix_fm parsers

let ast = parseProgram(source)
```

**Render it to a WAV.** From a checkout of this repo, with Chrome or Chromium installed:

```bash
node scripts/render-wav.mjs song.deck -o song.wav
```

The voices are Web Audio, so the renderer drives a headless Chrome and an `OfflineAudioContext`.
It is deterministic and faster than real time. Details and flags in [Rendering](docs/RENDERING.md).

## Docs

**[spacedevin.github.io/deck](https://spacedevin.github.io/deck/)** — the same markdown, as a site,
with a play button on every complete song.

- **[Language grammar](docs/DECK_GRAMMAR.md)** — canonical `.deck` surface
- **[Examples](docs/EXAMPLES.md)** — a complete, playable song for every one of the 33 voices
- **[Rendering](docs/RENDERING.md)** — the WAV CLI and `renderDeckToBuffer()`
- **[AST shape](docs/AST.md)** — what `parseProgram` / `parseTrackBody` return
- **[gen_block extensions](docs/DECK_EXTENSION.md)** — dialect registration + common `patch` / `matrix_fm`
- **[Host integration](docs/HOST.md)** — boot order, registries, what hosts implement
- **[Synths](packages/synths/README.md)** — the voice contract and catalog
- **[Player](packages/player/README.md)** — playback API and the element
- **[AGENTS.md](AGENTS.md)** — in/out of scope for package edits

For LLM readers there is an [llms.txt](https://spacedevin.github.io/deck/llms.txt) and a
single-file [llms-full.txt](https://spacedevin.github.io/deck/llms-full.txt), generated from the same
pages. npm also exports `./grammar`, `./ast`, `./examples`, `./rendering`, `./extension` and `./host`
to those markdown files.

## What the language package covers

| Area | API |
|------|-----|
| Lex / parse | `tokenize`, `isNumberToken`, `parseProgram` |
| Track / clip body | `parseBodyLine`, `parseTrackBody`, `parseBoolish` |
| Format | `formatTplBeat`, `formatTplFloat` |
| Scale | `parseScaleRoot`, `scaleRootNames`, `scaleModeNames`, `scaleIntervals` |
| Bar / Euclid | `parseBarSelector`, `barSelectorMatches`, `euclideanPattern` |
| Registries | `registerGeneratorIdAliases`, `registerParamKeyAliases`, `paramKeyToCamel`, … |
| Host extensions | `registerBodyLineDialect`, `registerTopLevelStatement`, `registerGenBlockDialect` |
| Macros | `registerBuiltinMacros`, `lookupMacro`, `expandMacroBody` |
| gen_block | `parseGenBlock`, `registerGenBlockDialect` |
| Highlight | `classifyLine`, `isKeyword`, `registerHighlightKeywords` |

Out of scope for the language package, and owned by hosts: apply/emit to a project IR, sessions,
audio engines, instrument catalogs, builtin macro catalogs, highlight CSS, graph editors.

Runnable demos of the parse and host-boot API live in [`examples/`](examples/):

```bash
npm run examples
```

## Rust

The same `src/index.tish` emits a Rust library crate, so a Rust consumer (tish-gba's build-time bake)
parses `.deck` with this parser rather than its own:

```bash
npm run build:rust   # -> crate/  (crates.io: `deckfile`)
npm run test:rust    # the same conformance corpus, from Rust
```

```rust
let program = deckfile::parse(src);          // typed
let ast = deckfile::parseProgram(value);     // the raw AST, same shape as JS
```

One source, three targets — Tish, JS, Rust — checked against one corpus.

## Contributing

Contributions are welcome, and small ones are a fine place to start. Good first contributions:

- **A new example** in [docs/EXAMPLES.md](docs/EXAMPLES.md) — every block there is tested and playable
- **A new voice** in [packages/synths/](packages/synths/) — one pure function, one registry entry, one example
- **A conformance case** in [conformance/](conformance/) when you find an input the parsers disagree on
- **A doc fix** — the site is built from the markdown in this repo, so a PR is the whole change

[CONTRIBUTING.md](CONTRIBUTING.md) has the setup, the test commands, the commit conventions, and a
recipe for each of those. Bugs and ideas go in
[issues](https://github.com/spacedevin/deck/issues); there are templates for a bug, a feature, and a
new voice.

## Development

```bash
npm install
npm test                 # build + API/grammar suite + conformance + examples + tish and JS smoke
npm run test:coverage    # c8 on dist/deck.js — 100% lines / functions / statements
npm run test:conformance # the cross-implementation corpus
npm test -w @spacedevin/deck-player
npm run site:serve       # the docs site on :4321
```

**[`conformance/`](conformance/)** is the contract between implementations: the same `.deck` inputs
and expected parses are run by the JS build, the Rust crate emitted from the same Tish source, and
any restricted host (via a profile). It is what makes drift a test failure rather than a surprise.

Branch coverage is lower (~60%) because the Tish→JS emit adds many `?? null` / typeof guards that
are defensive noise, not language logic. Line coverage is the gate in CI.

## Releases

Versions come from [sem](https://github.com/tishlang/sem): Conventional Commits drive semver
(`feat` / `fix` / `perf` / `BREAKING` release; `chore` / `docs` / `ci` do not). A green `main` cuts a
**prerelease** carrying all three npm tarballs; promoting it to a full release publishes to npm and
crates.io. The [Releases page](https://github.com/spacedevin/deck/releases) is the changelog.

## License

MIT — see [LICENSE](LICENSE).
