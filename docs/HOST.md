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

## AST shape

`parseProgram` returns one flat object; `parseTrackBody` turns a track's raw body rows into typed
ones. Both are documented in full in **[AST.md](AST.md)** — the top-level fields, every body-row
`kind`, bar selectors and gen blocks.

The two rules that shape everything a host does with it: the parser **never throws** (errors
accumulate in `errors[]` so a partial stream still parses), and it is **parse-only** — an absent
optional is `null` rather than a default, and nothing is clamped. Applying defaults and ranges is
your job, which is what the table above means by "clamps, defaults, range checks".

**Control directives.** `@ launch`, `@ transport`, `@ cue`, `@ throw`, `@ fx`, `@ deck`, `@ perf_step`
are transient stream lines, not document state, so the parser collects them into `directives[]`
verbatim and leaves the meaning to the host. They never produce errors.

## Package docs

- [DECK_GRAMMAR.md](DECK_GRAMMAR.md) — language  
- [AST.md](AST.md) — what the parser returns  
- [DECK_EXTENSION.md](DECK_EXTENSION.md) — dialects  
- npm exports: `@spacedevin/deck/grammar`, `@spacedevin/deck/extension`
