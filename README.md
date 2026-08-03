# @spacedevin/deck

Public **Tish** package for the streamable **`.deck`** patch language used by [Deckard](https://deckard.lol).

Parse · apply · emit · incremental line streams · co-DJ skills gating · ownership merge.

## Install

```bash
npm install @spacedevin/deck
```

Peer: `@tishlang/tish` ≥ 2.43 (re-export support).

## Usage (Tish)

```tish
import { loadProjectFromTpl, emitProject, parseProgram } from "@spacedevin/deck"

let r = loadProjectFromTpl("deck 1\nbpm 120\ntrack kick id c0 gen noise_burst\n  steps x...x...x...x...\n")
let text = emitProject(r.project)
```

JS consumers can also import from the compiled `dist/deck.js` entry (same named exports).

## Layout

| Path | Role |
|------|------|
| `src/deckfile/` | Tokenizer, apply, emit, stream, gen_block graphs, macros, highlight |
| `src/codj/` | Skills gating + ownership merge |
| `src/model/` | Minimal project / session IR for round-trips |
| `src/generators/Defaults.tish` | Generator catalog + default params (no audio engines) |
| `docs/` | Grammar, agent grammar, skills, stream protocol |
| `schema/project-v2.json` | Project IR schema |
| `skills/` | Agent skill markdown (optional prompt assets) |

## Docs

- [DECK_GRAMMAR.md](docs/DECK_GRAMMAR.md) — full grammar
- [DECK_AGENT_GRAMMAR.md](docs/DECK_AGENT_GRAMMAR.md) — co-DJ emission subset
- [DJ_SKILLS.md](docs/DJ_SKILLS.md) — skill gating
- [DECK_EXTENSION.md](docs/DECK_EXTENSION.md) — `gen_block` patch / matrix_fm

## Release (lattish pattern)

Uses the same flow as [@tishlang/lattish](https://github.com/tishlang/lattish):

1. Push conventional commits to `main` (`feat:` / `fix:` / `perf:` / `BREAKING CHANGE`).
2. CI runs tests + `semantic-release` dry-run, then creates a **GitHub prerelease** with `spacedevin-deck-npm-package.tgz` attached.
3. Review the prerelease; promote it (**Set as the latest release** / uncheck prerelease) to publish to npm via OIDC trusted publishing (`npm-release.yml`).

One-time npm Trusted Publisher setup for `@spacedevin/deck`:

- GitHub org/user: `spacedevin`
- Repository: `deck`
- Workflow: `npm-release.yml`

## License

MIT
