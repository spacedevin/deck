# @spacedevin/deck

Streamable **`.deck`** patch **language** for Tish hosts (e.g. Deckard).

**In scope:** tokenize · parse → AST · format · gen_block / macros · highlight · grammar docs.

**Out of scope (host app):** apply/emit to project IR, session, co-DJ, audio engines, agent skills.

```bash
npm install @spacedevin/deck
```

```tish
import { parseProgram } from "@spacedevin/deck"
let ast = parseProgram(source)
```

Docs: [grammar](docs/DECK_GRAMMAR.md) · [extensions](docs/DECK_EXTENSION.md)

Release flow matches [lattish](https://github.com/tishlang/lattish) (semantic-release prerelease → promote → OIDC npm publish).

MIT
