# @spacedevin/deck

Streamable **`.deck`** patch **language** for Tish hosts (e.g. Deckard).

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

That is a whole song: a tempo, three tracks, and what each one plays — melody as notes on
a beat grid, drums as a step pattern. **[Press play on it](https://spacedevin.github.io/deck/)**
— the docs site synthesises it in the browser with
[`@spacedevin/deck-player`](packages/player/), the same engine that drives the GBA build.

More in **[Examples](docs/EXAMPLES.md)**; the full surface in the
**[grammar](docs/DECK_GRAMMAR.md)**.

## Install

```bash
npm install @spacedevin/deck
```

```tish
import { parseProgram, registerGeneratorIdAliases, registerGenBlockDialect } from "@spacedevin/deck"

registerGeneratorIdAliases({ matrix_fm: "matrixFm" }, { matrixFm: "matrix_fm" })
// registerGenBlockDialect(...) — host supplies patch / matrix_fm parsers

let ast = parseProgram(source)
```

## Examples

Runnable demos in [`examples/`](examples/) (parse, host boot, helpers):

```bash
npm run examples
```

## In scope

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

## Out of scope (host)

Apply/emit to project IR · session/co-DJ · audio engines · instrument catalogs · builtin macro catalogs · HTML highlight CSS · graph editor mutators.

## Playback

Hearing a `.deck` file is a host job, so it is a second package in this repo:
**[`@spacedevin/deck-player`](packages/player/)** — Web Audio chip synths, a lookahead transport, and
a `<deck-player>` element.

```bash
npm install @spacedevin/deck-player
```

```js
import { createDeckPlayer } from '@spacedevin/deck-player'
let player = createDeckPlayer()
player.load(source)
player.play()
```

It depends on this package and never the reverse — the language stays audio-free.

## Rust

The same `src/index.tish` also emits a Rust library crate, so a Rust consumer (tish-gba's build-time
bake) parses `.deck` with this parser rather than its own:

```bash
npm run build:rust   # -> crate/  (crates.io: `deckfile`)
npm run test:rust    # the same conformance corpus, from Rust
```

```rust
let program = deckfile::parse(src);          // typed
let ast = deckfile::parseProgram(value);     // the raw AST, same shape as JS
```

One source, three targets — Tish, JS, Rust — checked against one corpus.

## Docs

**[spacedevin.github.io/deck](https://spacedevin.github.io/deck/)** — the same markdown, as a site.

- **[Language grammar](docs/DECK_GRAMMAR.md)** — canonical `.deck` surface
- **[Examples](docs/EXAMPLES.md)** — complete runnable songs (playable on the site)
- **[gen_block extensions](docs/DECK_EXTENSION.md)** — dialect registration + common `patch` / `matrix_fm`
- **[Host integration](docs/HOST.md)** — boot order, registries, what hosts implement
- **[AGENTS.md](AGENTS.md)** — in/out of scope for package edits

npm also exports `./grammar` and `./extension` to those markdown files.

## Release

Matches [lattish](https://github.com/tishlang/lattish): semantic-release prerelease → promote → OIDC npm publish.

## Test / coverage

```bash
npm test                 # build + API/grammar suite + conformance + tish smoke
npm run test:coverage    # c8 on dist/deck.js — 100% lines / functions / statements
npm run test:conformance # the cross-implementation corpus
npm run examples         # runnable demos
```

**[`conformance/`](conformance/)** is the contract between implementations: the same `.deck` inputs
and expected parses are run by the JS build, the Rust crate emitted from the same Tish source, and
any restricted host (via a profile). It is what makes drift a test failure rather than a surprise.

Branch % is lower (~60%) because the Tish→JS emit adds many `?? null` / typeof guards that are defensive noise, not language logic. Line coverage is the gate in CI.

## License

Pay It Forward (PIF) — see [LICENSE](LICENSE). Same license as [tish](https://github.com/tishlang/tish).
