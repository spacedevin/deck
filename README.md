# @spacedevin/deck

Streamable **`.deck`** patch **language** for Tish hosts (e.g. Deckard).

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
| Format | `formatTplBeat`, `formatTplFloat` |
| Scale | `parseScaleRoot`, `scaleRootNames`, `scaleModeNames`, `scaleIntervals` |
| Bar / Euclid | `parseBarSelector`, `barSelectorMatches`, `euclideanPattern` |
| Registries | `registerGeneratorIdAliases`, `registerParamKeyAliases`, `paramKeyToCamel`, … |
| Macros | `registerBuiltinMacros`, `lookupMacro`, `expandMacroBody` |
| gen_block | `parseGenBlock`, `registerGenBlockDialect` |
| Highlight | `classifyLine`, `isKeyword`, `registerHighlightKeywords` |

## Out of scope (host)

Apply/emit to project IR · session/co-DJ · audio engines · instrument catalogs · builtin macro catalogs · HTML highlight CSS · graph editor mutators.

## Docs

- **[Language grammar](docs/DECK_GRAMMAR.md)** — canonical `.deck` surface
- **[gen_block extensions](docs/DECK_EXTENSION.md)** — dialect registration + common `patch` / `matrix_fm`
- **[Host integration](docs/HOST.md)** — boot order, registries, what hosts implement
- **[AGENTS.md](AGENTS.md)** — in/out of scope for package edits

npm also exports `./grammar` and `./extension` to those markdown files.

## Release

Matches [lattish](https://github.com/tishlang/lattish): semantic-release prerelease → promote → OIDC npm publish.

## Test / coverage

```bash
npm test              # build + API/grammar suite + tish smoke
npm run test:coverage # c8 on dist/deck.js — 100% lines / functions / statements
npm run examples      # runnable demos
```

Branch % is lower (~60%) because the Tish→JS emit adds many `?? null` / typeof guards that are defensive noise, not language logic. Line coverage is the gate in CI.

MIT
