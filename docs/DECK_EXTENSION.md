# Host extensions

Three registries let a host add vocabulary **without forking the grammar**. That matters: the one
implementation that had no such hook (tish-gba, which needed a top-level `wave` statement and a
`layer` body key) ended up a separate grammar rather than a subset of this one. `wave` has since been
adopted into the language itself — every host wanted it, which is the signal that a statement is not
an extension. Its `shape` names arrived the same way: they lived as a per-host fallback for
`wave_shape`, drifted apart (unknown names resolved to a sine in one host and a saw in another), and
are now resolved in the parser so there is one answer.

| Extension point | Adds | API |
|-----------------|------|-----|
| Top-level statement | `cue <name> <beat>` | `registerTopLevelStatement(head, fn)` → `ast.hostStatements[head][]` |
| Track / clip body head | `layer 2` | `registerBodyLineDialect(heads, fn)` → the row `parseBodyLine` returns |
| `gen_block` dialect | `patch`, `matrix_fm` | `registerGenBlockDialect(ids, fn)` |

```tish
import { registerTopLevelStatement, registerBodyLineDialect } from "@spacedevin/deck"

// A cue point the host jumps to. Core statements are matched first, so a host can add vocabulary
// but never shadow the language — registering `wave` here would simply be ignored.
registerTopLevelStatement("cue", (head, toks) => ({ name: toks[1], beat: Number(toks[2]) }))

// tish-gba: `layer|intensity|min_intensity <0..3>` — one head set, one parser
registerBodyLineDialect(["layer", "intensity", "min_intensity"], (head, toks) => {
  return { kind: "layer", level: Math.floor(Number(toks[1])) }
})
```

Registered heads are checked **after** the built-in ones in both cases, so a host can extend the
language but never silently shadow it. `clearBodyLineDialects` and `clearTopLevelStatements` reset
both (tests).

---

# gen_block extensions

Core language collects:

```
gen_block <generatorId>
  …
end gen_block
```

into `raw: string[]` on the track AST. Dialects interpret those lines.

## Registration API (`@spacedevin/deck`)

```tish
import { registerGenBlockDialect, parseGenBlock, clearGenBlockDialects } from "@spacedevin/deck"

registerGenBlockDialect(["patch", "modular"], (generatorId, lines) => {
  return { kind: "patch", tplHeaderId: generatorId, version: 1, raw: lines, graph: parsePatchGraph(lines) }
})

registerGenBlockDialect(["matrixFm", "matrix_fm"], (generatorId, lines) => {
  return { kind: "matrixFm", tplHeaderId: generatorId, version: 2, raw: lines, graph: parseMatrixFmGraph(lines) }
})
```

Until registered, `parseGenBlock` returns `{ kind, tplHeaderId, version: 1, raw }` with `kind` = normalized id (or raw id if no alias).

Also useful:

- `registerGeneratorIdAliases(forward, emit)` — deck spelling ↔ host id  
- `registerHighlightKeywords({ body: [...] })` — dialect keywords for `classifyLine`  
- `registerBuiltinMacros(map)` — named patch templates  

Hosts own the parse/serialize implementations (Deckard: `PatchGraph.tish`, `MatrixFmGraph.tish`).

---

## Common dialect: `patch`

Modular graph voice. Typical nodes:

| Line | Meaning |
|------|---------|
| `osc <id> [wave] [note\|<hz>] [ratio R] [detune cents] [rand N] [gain G]` | Oscillator / LFO |
| `syncosc <id> [note\|<hz>] [ratio R] [detune] [rand] [gain]` | Hard-sync style osc |
| `noise <id> [gain G]` | Noise source |
| `string <id> [note] [tone T] [damping D] [decay P] [mute M] [gain G]` | Karplus–Strong |
| `filter <id> [type] [q Q] [freq Hz] [gain G]` | Biquad |
| `shaper <id> [amount\|drive A] [curve name] [gain G]` | Waveshaper |
| `pan <id> [pos] [gain G]` | Stereo pan (−1…+1) |
| `gain <id> [value]` | Gain node |
| `conn <src> <dst[.param]> [vol]` | Wire (`out`, `reverb` are special sinks) |
| `env <node[.param]> <seg>…` | Breakpoint envelope; seg = `set\|lin\|exp <tExpr> <vExpr>` |
| `dur <seconds>` | Fixed voice duration |

Filter type aliases commonly accepted: `lp`/`lowpass`, `hp`/`highpass`, `bp`/`bandpass`, `notch`, `lowshelf`, `highshelf`, `peaking`/`peak`, `allpass`.

Envelope time/value expressions (host evaluate per trigger): numbers, `note`, `dur`, `vel`, products/sums (`note*2`, `dur-0.1`), `max(a,b)` / `min(a,b)`.

---

## Common dialect: `matrix_fm`

Operator / modulation matrix:

| Line | Meaning |
|------|---------|
| `op <id> wave <w> [ratio R]` | Operator (`wave noise` omits ratio) |
| `env op <id> [a] [d] [s] [r]` | Op ADSR |
| `mod <fm\|rm> <src> <dst> <amount>` | Modulation |
| `filter <id> type <t> cutoff <Hz> res <q>` | Filter (`lp12`, `lp24`, …) |
| `env filter <id> [a] [d] [s] [r] [amount Hz]` | Filter env |
| `route <srcKind> <srcId> filter <fid> <vol>` | Route into filter |
| `route <srcKind> <srcId> out <vol>` | Route to output |

Wave emit spellings are host-defined (e.g. `sawtooth` → `saw`, `triangle` → `tri`).

---

## Highlight

Core keywords live in `Highlight.tish`. Dialects should register extras:

```tish
registerHighlightKeywords({
  body: ["osc", "noise", "string", "syncosc", "filter", "shaper", "gain", "pan", "conn", "env", "dur", "op", "mod", "route"]
})
```
