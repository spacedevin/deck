# Hosting `@spacedevin/deck`

The package parses and classifies `.deck` text. Hosts map the AST into their own IR, register catalogs, and own audio.

## Boot order

Call these once at app/test start (idempotent if you gate with a `registered` flag):

1. **`registerGeneratorIdAliases(forward, emit)`** — deck snake_case ↔ host camelCase ids  
2. **`registerParamKeyAliases(map)`** — optional extra snake → camel for `gen` keys  
3. **`registerGenBlockDialect(ids, parseFn)`** — e.g. `patch`, `matrix_fm`  
4. **`registerHighlightKeywords({ body: [...] })`** — dialect keywords for `classifyLine`  
5. **`registerBuiltinMacros(map)`** — named patch templates (optional)

```tish
import {
  parseProgram,
  registerGeneratorIdAliases,
  registerGenBlockDialect,
  registerHighlightKeywords,
  registerBuiltinMacros
} from "@spacedevin/deck"

registerGeneratorIdAliases(
  { matrix_fm: "matrixFm", noise_burst: "noiseBurst" },
  { matrixFm: "matrix_fm", noiseBurst: "noise_burst" }
)

registerGenBlockDialect(["patch", "modular"], (generatorId, lines) => {
  return {
    kind: "patch",
    tplHeaderId: generatorId,
    version: 1,
    raw: lines,
    graph: parsePatchGraph(lines)   // host-owned
  }
})

registerHighlightKeywords({
  body: ["osc", "conn", "env", "op", "mod", "route"]
})

registerBuiltinMacros({ /* name → { params, bodyLines } */ })

let ast = parseProgram(source)
// host: applyAst(ast) → project IR
```

## Clear helpers (tests)

- `clearGeneratorIdAliases`
- `clearParamKeyAliases`
- `clearGenBlockDialects`
- `clearBuiltinMacros`

## What the host must implement

| Concern | Typical modules |
|---------|-----------------|
| AST → project | apply / merge |
| project → `.deck` text | emit |
| Incremental line stream | buffer + re-apply block |
| `patch` / `matrix_fm` body lines | graph parse + serialize |
| Macro catalog content | register into package |
| Instrument / generator defaults | host registry |
| Skills / ownership | co-DJ layer |
| Highlight CSS | map `classifyLine` classes to themes |

## AST shape (summary)

`parseProgram` returns an object including (fields appear when present in source):

- Globals: `bpm`, `swing`, `scaleRoot` / `scaleMode`, `launchQuant`, `songSeed`, `xfade`, `mainDeck`, `deckMix`, …
- `tracks[]` — header fields + `body` token rows; `genBlock` when collected
- `macros[]`, `automations[]`, `clips[]`, session / song / follow blocks
- Soft no-ops: `@ perf_step` ignored; other `@` lines are host stream-control

Exact field names follow the parser; treat the grammar doc as the surface contract and tests as round-trip truth.

## Package docs

- [DECK_GRAMMAR.md](DECK_GRAMMAR.md) — language  
- [DECK_EXTENSION.md](DECK_EXTENSION.md) — dialects  
- npm exports: `@spacedevin/deck/grammar`, `@spacedevin/deck/extension`
