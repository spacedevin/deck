# @spacedevin/deck

Language-only package for the **`.deck`** patch language.

**Entry:** `src/index.tish`

## Repo layout

This repo publishes **two** packages. The rules below are this one's.

| Path | Package | What |
|------|---------|------|
| `/` (this file) | `@spacedevin/deck` | the language: tokenize, parse, registries, highlight |
| `packages/player/` | `@spacedevin/deck-player` | the host: Web Audio playback, transport, `<deck-player>` |

The "out of scope" list below — **including audio** — is about `@spacedevin/deck`. `src/` stays
audio-free; everything that list excludes lives in `packages/player/`, which has its own
[AGENTS.md](packages/player/AGENTS.md). The player depends on this package and never the reverse.

## In scope

- Tokenize / `parseProgram` → AST
- Track / clip body lines → typed rows (`parseBodyLine`, `parseTrackBody`) — **parse only**: no
  clamping, no defaults, no range checks. Those are host policy and the hosts genuinely differ.
- Format helpers (`formatTplBeat`, `formatTplFloat`)
- Scale root/mode vocabulary
- Bar selectors + Euclidean step fill
- Empty registries: generator id aliases, param key aliases, macros, gen_block dialects, body-line
  dialects, host top-level statements
- Highlight classification (`classifyLine` / keyword sets)
- Grammar docs (`docs/DECK_GRAMMAR.md`, `docs/DECK_EXTENSION.md`)
- Host integration (`docs/HOST.md`)
- Runnable examples (`examples/`)
- Tests covering the documented API + grammar (`test/coverage.mjs`, `fixtures/golden.deck`)
- The conformance corpus (`conformance/`) — the cross-implementation contract. A language change
  means regenerating it (`npm run conformance:update`) and **reviewing the diff**; a new case means
  every profile in `profiles.json` must say where it stands.

## Out of scope — do not add here

- Project IR / JSON schemas
- Apply / emit to a host project model
- Session, co-DJ, ownership, skills
- Audio / Web Audio engines — see `packages/player/`
- Instrument catalogs or builtin macro *contents* (hosts `registerBuiltinMacros`)
- HTML / CSS highlight styling
- Graph editor mutators

## Docs site

`site/build.mjs` renders the markdown **already in this repo** to
[spacedevin.github.io/deck](https://spacedevin.github.io/deck/) on every push to `main`.

Adding a page means **adding a `.md` file** under `docs/` or `packages/player/` — there is no route,
nav entry, or registration to update. The title comes from `title:` frontmatter, else a per-section
override in `site/build.mjs`, else the first `#` heading, else the filename; `description:` becomes
the lede.

Don't put frontmatter in a file listed in a package's `files` — npm renders a README verbatim, and a
`---` fence after a text line is a setext H2, so it shows up as a stray rule and a giant
`description:` heading on npmjs.com. Use the section override for those.

**Fence tags.** `tish`, `bash`, `js`, `rust`, `html`, `json`, `yaml` and `deck` all highlight
(`site/highlight.mjs`). In `docs/` an untagged fence defaults to `deck`, since every one of them is.

`.deck` highlighting is driven by **this package's own** `isKeyword` / `isInlineKeyword` /
`isStepToken` / `classifyLine`, not a second keyword list — add a keyword to
`src/deckfile/Highlight.tish` and the site picks it up. The player's `bootDeckRegistries()` runs at
build time too, so host vocabulary (`wave`, `layer`, …) colours as well.

**Play buttons** are decided by *parsing*, not by the fence tag: a `deck` block gets one when
`parseSong` reports no errors and yields at least one channel that actually sounds. So a complete
song is playable wherever it appears, and the grammar's `<placeholder>` notation never offers a
button it can't honour. Runnable songs belong in [docs/EXAMPLES.md](docs/EXAMPLES.md); keep the
grammar reference as reference.

**`llms.txt`** and `llms-full.txt` are generated from the same pages as the HTML, so they can't fall
behind — the usual fate of a hand-written one. A new `.md` appears in both automatically.

Sources are read **in place**. `docs/*.md` are package exports and ship in the tarball, so a
`content/` copy would fork the canonical text. `npm run site:serve` previews locally.

## Docs ownership

| Doc | Audience |
|-----|----------|
| [README.md](README.md) | Install + API map |
| [docs/DECK_GRAMMAR.md](docs/DECK_GRAMMAR.md) | **Canonical** language reference |
| [docs/AST.md](docs/AST.md) | What `parseProgram` / `parseTrackBody` return |
| [docs/EXAMPLES.md](docs/EXAMPLES.md) | Complete runnable songs |
| [docs/DECK_EXTENSION.md](docs/DECK_EXTENSION.md) | gen_block dialect registration + common dialects |
| [docs/HOST.md](docs/HOST.md) | How a host boots registries |
| [examples/](examples/) | Runnable parse / boot / helper demos |

Host apps (e.g. Deckard) may document UI, apply clamps, ownership, and their generator id tables — not a second copy of the language.

## Tests

- `test/coverage.mjs` — every public export + grammar constructs (incl. `fixtures/golden.deck`)
- `test/smoke.test.tish` — language smoke via `tish test` (VM)
- `test/smoke.tish` — JS-emit smoke via `npm run test:js-smoke` (`tish build --target js` + node)
- `npm run test:coverage` — c8 gate: **100%** lines / functions / statements on `dist/deck.js`
