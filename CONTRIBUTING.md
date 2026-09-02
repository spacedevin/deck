# Contributing

Thanks for looking. This repo is small on purpose, and most useful contributions are small too: a
song, a voice, a grammar case, a doc fix. This page is the setup and the recipes.

## Setup

You need **Node 22+** and the [Tish](https://github.com/tishlang/tish) compiler, which comes in as a
dev dependency. Chrome or Chromium is only needed for the WAV renderer.

```bash
git clone https://github.com/spacedevin/deck
cd deck
npm install
npm test
```

`npm test` builds the language package, runs the API and grammar suite with a 100% line-coverage
gate, the conformance corpus, every song in `docs/EXAMPLES.md`, and the Tish and JS smoke tests.

The workspaces have their own tests:

```bash
npm test -w @spacedevin/deck-player
npm run build -w @spacedevin/deck-synths
```

And the docs site, which is how you preview any markdown change:

```bash
npm run site:serve     # http://localhost:4321
```

## How the repo is laid out

| Path | Package | Owns |
|---|---|---|
| `/` | `@spacedevin/deck` | the language: tokenize, parse, registries, highlight. **No audio.** |
| `packages/synths/` | `@spacedevin/deck-synths` | the 33 voices and the dispatch that picks one |
| `packages/player/` | `@spacedevin/deck-player` | Song IR, defaults and clamps, transport, offline render, `<deck-player>` |
| `conformance/` | — | the parse contract every implementation is checked against |
| `crate/` | `deckfile` | **generated** from `src/` by `npm run build:rust`; never edit by hand |
| `site/` | — | the docs-site generator; markdown is read in place from the paths above |

Dependencies point one way: player → synths → deck. Each package has an `AGENTS.md` saying what
belongs in it and what does not. Read the one for the package you're touching; the boundaries are
the thing this repo cares most about.

Tish is the source language and it has gotchas: there is **no `class` syntax** (the build emits JS
that doesn't parse), and `undefined` is not a value under `tish run`. `packages/player/AGENTS.md`
explains why the custom element is plain JS for that reason.

## Commit messages

Releases are cut by [sem](https://github.com/tishlang/sem) from Conventional Commits, so the type
you pick decides whether a version ships:

| Type | Effect |
|---|---|
| `feat:` | minor release |
| `fix:`, `perf:` | patch release |
| `feat!:` or a `BREAKING CHANGE:` footer | major release |
| `docs:`, `chore:`, `ci:`, `test:`, `refactor:` | no release |

Scope with the package when it helps: `feat(synths): …`, `fix(player): …`, `docs(examples): …`.
A green `main` cuts a prerelease with all three tarballs; promoting it publishes to npm and crates.io.
The PR title becomes the squash commit, so write it as the commit.

## Recipes

### Add a song to the examples

1. Add a `deck` fenced block to `docs/EXAMPLES.md` under the right heading, with a sentence saying
   what it demonstrates.
2. `npm run test:examples` — every block must parse without errors and produce at least one
   sounding channel. That is also the rule the site uses to decide whether to show a play button.
3. `npm run site:serve` and press play on it.

Grammar-reference snippets with `<placeholders>` belong in `docs/DECK_GRAMMAR.md`; complete songs
belong in `docs/EXAMPLES.md`.

### Add a voice

1. Create `packages/synths/src/<Name>.tish` exporting `play<Name>(ctx, bus, t, midi, vel, durSec, ch, bendSemis)`.
   Build a short-lived Web Audio subgraph, connect its last node to `bus.input`, and disconnect the
   nodes once the tail has passed (the existing voices schedule that themselves; look at
   `GameBoyDmg.tish` for the shape). A voice may instead return `{ stopTime, disconnects }` and let
   the player prune it per step.
2. Register it: an entry in `src/Registry.tish` (id, label, description, default `generatorParams`)
   and a case in `src/Dispatch.tish`. Param aliases or a `gen_block` dialect go in `src/DeckIds.tish`.
3. Seed anything random. Two renders of one song must be identical.
4. Add a song for it to `docs/EXAMPLES.md` (recipe above) and a line to the voices table in
   `packages/synths/README.md`.
5. `npm test` and `npm test -w @spacedevin/deck-player`.

### Change the grammar

1. Change `src/deckfile/*.tish`. The parser is parse-only: no defaults, no clamping, no range checks.
   Those are host policy and belong in the player.
2. Update `docs/DECK_GRAMMAR.md` — it is the canonical reference — and `docs/AST.md` if the shape changed.
3. Regenerate the corpus with `npm run conformance:update` and **review the diff**. A new case means
   every profile in `conformance/profiles.json` must say where it stands.
4. `npm run test:rust` to confirm the Rust emit still agrees.
5. Keywords for highlighting live in `src/deckfile/Highlight.tish`; the site picks them up from there.

### Add or fix a doc page

The site is a view over the markdown already in the repo. Drop a `.md` under `docs/`,
`packages/player/` or `packages/synths/` and it appears in the nav, in `llms.txt` and in
`llms-full.txt` on the next build. There is no route to register. Don't add YAML frontmatter to a
file that ships in an npm tarball (`README.md`, `AGENTS.md`); npm renders it as a stray heading.
Use the per-section title override in `site/build.mjs` instead.

## Pull requests

- Keep a PR to one package where you can; the template asks which.
- Tests pass, the conformance diff is reviewed if you touched the parser, and the docs say what the
  code now does.
- No CHANGELOG edits: the release notes are generated from the commits.

## Reporting a bug

Open an [issue](https://github.com/spacedevin/deck/issues/new/choose). The most useful bug report
is the smallest `.deck` that shows it, plus what you expected to hear or parse. If the parsers
disagree with each other, that is a conformance case waiting to be written.
