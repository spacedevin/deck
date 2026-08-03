# @spacedevin/deck

Language-only package for the **`.deck`** patch language.

**Entry:** `src/index.tish`

## In scope

- Tokenize / `parseProgram` → AST
- Format helpers (`formatTplBeat`, `formatTplFloat`)
- Scale root/mode vocabulary
- Bar selectors + Euclidean step fill
- Empty registries: generator id aliases, param key aliases, macros, gen_block dialects
- Highlight classification (`classifyLine` / keyword sets)
- Grammar docs (`docs/DECK_GRAMMAR.md`, `docs/DECK_EXTENSION.md`)
- Host integration (`docs/HOST.md`)
- Runnable examples (`examples/`)
- Tests covering the documented API + grammar (`test/coverage.mjs`, `fixtures/golden.deck`)

## Out of scope — do not add here

- Project IR / JSON schemas
- Apply / emit to a host project model
- Session, co-DJ, ownership, skills
- Audio / Web Audio engines
- Instrument catalogs or builtin macro *contents* (hosts `registerBuiltinMacros`)
- HTML / CSS highlight styling
- Graph editor mutators

## Docs ownership

| Doc | Audience |
|-----|----------|
| [README.md](README.md) | Install + API map |
| [docs/DECK_GRAMMAR.md](docs/DECK_GRAMMAR.md) | **Canonical** language reference |
| [docs/DECK_EXTENSION.md](docs/DECK_EXTENSION.md) | gen_block dialect registration + common dialects |
| [docs/HOST.md](docs/HOST.md) | How a host boots registries |
| [examples/](examples/) | Runnable parse / boot / helper demos |

Host apps (e.g. Deckard) may document UI, apply clamps, ownership, and their generator id tables — not a second copy of the language.

## Tests

- `test/coverage.mjs` — every public export + grammar constructs (incl. `fixtures/golden.deck`)
- `test/smoke.tish` — import path via Tish
- `npm run test:coverage` — c8 gate: **100%** lines / functions / statements on `dist/deck.js`
