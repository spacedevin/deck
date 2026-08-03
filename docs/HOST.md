# Hosting `@spacedevin/deck`

The package parses and classifies `.deck` text. Hosts map the AST into their own IR, register catalogs, and own audio.

## Boot order

Call these once at app/test start (idempotent if you gate with a `registered` flag):

1. **`registerGeneratorIdAliases(forward, emit)`** — deck snake_case ↔ host camelCase ids  
2. **`registerParamKeyAliases(map)`** — optional extra snake → camel for `gen` keys  
3. **`registerGenBlockDialect(ids, parseFn)`** — e.g. `patch`, `matrix_fm`  
4. **`registerBodyLineDialect(heads, parseFn)`** — extra track/clip body heads (optional)  
5. **`registerTopLevelStatement(head, parseFn)`** — extra top-level statements (optional)  
6. **`registerHighlightKeywords({ body: [...] })`** — dialect keywords for `classifyLine`  
7. **`registerBuiltinMacros(map)`** — named patch templates (optional)

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
- `clearBodyLineDialects`
- `clearTopLevelStatements`
- `clearBuiltinMacros`

## What the host must implement

| Concern | Typical modules |
|---------|-----------------|
| Body rows → project IR (clamps, defaults, range checks) | apply |
| AST → project | apply / merge |
| project → `.deck` text | emit |
| Incremental line stream | buffer + re-apply block |
| `patch` / `matrix_fm` body lines | graph parse + serialize |
| Macro catalog content | register into package |
| Instrument / generator defaults | host registry |
| Skills / ownership | co-DJ layer |
| Highlight CSS | map `classifyLine` classes to themes |

## AST shape (summary)

`parseProgram` returns one flat object. Every field is always present; the value is `null` (or an
empty array) when the source didn't set it.

| Field | Shape |
|-------|-------|
| `tplVersion` | number (`deck 1` / `tpl 1`) |
| `bpm`, `swing`, `launchQuant`, `songSeed`, `mainDeck` | scalar or `null` |
| `scaleRoot`, `scaleMode` | pitch class `0..11` (`-1` = scale off) + mode name |
| `xfade` | `{ x, y }` or `null` |
| `deckMix` | `{ A\|B\|C\|D: { hi, mid, lo, flt, vol } }` or `null` |
| `tracks[]` | `{ name, id, generatorId, rawGenId, genParams, loopBars, body[], genBlocks[] }` |
| `clipBlocks[]` | `{ clipId, channelId, bars, displayName, body[] }` |
| `autos[]` | `{ lineNo, header[], points: [{ beat, value }] }` |
| `macros` | object map `name → { params, body[] }` |
| `removeTrackIds[]` | channel ids from `remove_track` |
| `masterMixTokens`, `actorMixRows[]` | raw token rows for the host to interpret |
| `sessionSceneCount`, `sessionSlots[]`, `song`, `follow` | session / arrangement |
| `directives[]` | `{ lineNo, verb, tokens[] }` — every `@ …` line |
| `errors[]` | `{ line, msg }` — the parser accumulates, it never throws |

Track and clip `body[]` rows are `{ lineNo, tokens[], raw }`; `genBlocks[]` entries are
`{ generatorId, lines[] }`.

**Control directives.** `@ launch`, `@ transport`, `@ cue`, `@ throw`, `@ fx`, `@ deck`, `@ perf_step`
are transient stream lines, not document state, so the parser collects them into `directives[]`
verbatim and leaves the meaning to the host. They never produce errors.

## Package docs

- [DECK_GRAMMAR.md](DECK_GRAMMAR.md) — language  
- [DECK_EXTENSION.md](DECK_EXTENSION.md) — dialects  
- npm exports: `@spacedevin/deck/grammar`, `@spacedevin/deck/extension`
