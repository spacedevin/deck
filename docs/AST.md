# AST shape

What `parseProgram` and `parseTrackBody` return. This is the contract a host codes against.

Two rules run through all of it:

- **Never throws.** Malformed lines accumulate in `errors[]` and parsing continues, because a
  streaming host has to be able to parse a partial program.
- **Parse-only.** An absent optional is `null`, never a default, and nothing is clamped or
  range-checked. Defaults and ranges are host policy and hosts genuinely differ — one clamps an
  out-of-range lock, another rejects it — and a check like "does this note fit inside `* N`?" needs
  track context the line doesn't have. See [HOST.md](HOST.md).

So `null` means *the source didn't say*, which a host can distinguish from *the source said the
default*. Don't collapse the two.

## `parseProgram(source)`

One flat object. Every field below is always present.

| Field | Shape |
|-------|-------|
| `tplVersion` | number — `deck 1` / `tpl 1` |
| `bpm`, `swing`, `launchQuant`, `songSeed` | number or `null` |
| `mainDeck` | `"live"` \| `"local"` \| `null` |
| `scaleRoot`, `scaleMode` | pitch class `0..11` (`-1` = scale off) + mode name, or `null` |
| `xfade` | `{ x, y }` or `null` |
| `deckMix` | `{ A\|B\|C\|D: { hi?, mid?, lo?, flt?, vol? } }` or `null` |
| `tracks[]` | see [Track](#track) |
| `clipBlocks[]` | `{ clipId, channelId, bars, displayName, body[] }` |
| `removeTrackIds[]` | channel ids from `remove_track` |
| `macros` | `{ [name]: { params: { k: number\|string }, body: string[] } }` |
| `autos[]` | `{ lineNo, header: string[], points: [{ beat, value }] }` |
| `masterMixTokens` | `string[]` or `null` — raw, host-interpreted |
| `actorMixRows[]` | `{ lineNo, lane, tokens: string[] }` — raw, host-interpreted |
| `sessionSceneCount` | int or `null` |
| `sessionSlots[]` | `{ channelId, scene, clipId }` |
| `song` | `null` or `[{ scene, repeat }]` |
| `follow` | `null` or `[{ scene, a, wa, b, wb }]` |
| `directives[]` | `{ lineNo, verb, tokens: string[] }` — every `@ …` line |
| `hostStatements` | `{ [head]: [{ lineNo, value }] }` from `registerTopLevelStatement` |
| `errors[]` | `{ line, msg }` — 1-based line numbers |

### Track

```js
{
  name: "MOS 6581",      // may be multi-word; anchored on the id/gen keyword pair
  id: "c9",
  generatorId: "fm",     // normalizeGeneratorId(raw) — identity until a host registers aliases
  rawGenId: "fm",        // exactly what the source wrote
  genParams: {},         // trailing `k v` pairs on the header (macro overrides), numbers coerced
  loopBars: 2,           // `* N`; null for `* inf` or unset
  body: [{ lineNo, tokens, raw }],
  genBlocks: [{ generatorId, lines: string[] }]
}
```

**`body[]` rows are raw token rows.** `parseProgram` does not interpret them — call
`parseTrackBody(track.body)` for typed rows. `lineNo` is 1-based throughout.

A `gen_block` is only collected inside a `track` body. Inside a `clip` body the clip branch matches
first, so such a line stays an ordinary body row.

## `parseTrackBody(bodyRows)`

Returns `{ rows, errors }`. Every row carries `kind` and `lineNo`; `kind: "error"` rows are split out
into `errors[]` instead.

| `kind` | Fields |
|--------|--------|
| `mix` | `gain`, `pan`, `mute`, `solo`, `eqLo`, `eqMid`, `eqHi` — absent = `null`, boolish → `true`/`false` |
| `steps` | `mode: "literal" \| "euclid"`, `on: boolean[]`, plus `hits`/`len` when euclid |
| `stepLane` | `lane: "vel" \| "prob" \| "ratchet" \| "nudge" \| "lyric"`, `values: (number \| null)[]` |
| `stepPitch` | `midi`, `bar` |
| `note` | `midi`, `startBeat`, `durBeats`, `vel`, `prob`, `ratchet`, `nudge`, `bar`, `lyric` |
| `notesClear` | — |
| `transpose` | `semitones` |
| `loops` | `cap` — `null` means `loops inf` |
| `gen`, `fx`, `voice` | `params: { camelKey: number \| string }` |
| `adsr` | `a`, `d`, `s`, `r` |
| `deckRoute` | `lane: "A".."D" \| "live" \| null`, `slot` |
| `unknown` | `head`, `tokens` — a head nothing claimed; **not an error**, a dialect may still take it |

Real rows:

```js
{ kind: "note", midi: 61, startBeat: 0, durBeats: 1, vel: 100,
  prob: null, ratchet: null, nudge: null, bar: null, lyric: null, lineNo: 6 }

{ kind: "steps", mode: "literal",
  on: [true, false, false, false, true, false, false, false, …], lineNo: 3 }

{ kind: "stepLane", lane: "vel",
  values: [120, 100, 100, 100, 70, 100, …], lineNo: 4 }

{ kind: "gen", params: { waveShape: "saw", vol: 15, pitchDrop: -12 }, lineNo: 7 }

{ kind: "adsr", a: 0, d: 0.1, s: 0.5, r: 0.03, lineNo: 8 }

{ kind: "deckRoute", lane: "A", slot: 2, lineNo: 6 }
```

Two things the parser does for you:

- **Euclid is already expanded.** `steps euclid 5 16` arrives as the same `on: boolean[]` grid a
  literal line produces, with `hits` and `len` alongside.
- **Wavetables are already resolved.** `wave x harmonics 1 0.5`, `wave x levels 8 9 …` and
  `wave x shape square` all arrive as the same `levels` (32 numbers, 0..15) a hex literal produces,
  with `mode` (`"harmonics"` / `"levels"` / `"shape"` / `"hex"`) and the source `harmonics` / `hex` /
  `shape` + `duty` alongside. `mode` is a plain string, so treat it as open rather than exhaustive.
- **Param keys are camelCased and aliased.** `wave_shape` → `waveShape`, `reverb` → `reverbSend`,
  `type` → `filterType` on `fx`. Extend with `registerParamKeyAliases`.

## Bar selector

The value of `bar` on a `note` or `stepPitch`; `null` means every bar. Evaluate with
`barSelectorMatches(sel, bar)` — bars are 0-indexed within `* N`.

| Source | Shape |
|--------|-------|
| `all` | `{ kind: "all" }` |
| `2` | `{ kind: "eq", n: 2 }` |
| `-n+2` | `{ kind: "first", b: 2 }` |
| `0,2,3` | `{ kind: "list", list: [0, 2, 3] }` |
| `even` / `2n+1` | `{ kind: "mod", a: 2, b: 0 }` |

## gen_block

With no dialect registered, `parseGenBlock(id, lines)` returns the lines verbatim:

```js
{ kind: "patch", tplHeaderId: "patch", version: 1,
  raw: ["osc o1 sawtooth note", "filter f1 lowpass q 4 freq 1800", "conn f1 out 1"] }
```

Register a dialect to parse them into a graph — see [DECK_EXTENSION.md](DECK_EXTENSION.md).

## Typed mirrors

- **Rust** — `deckfile::parse(src)` returns typed structs. `rust/facade.rs` is the only hand-written
  Rust in the crate and enumerates every variant above; it is the most precise statement of this
  shape in the repo.
- **TypeScript** — the language package ships no declarations. `@spacedevin/deck-player` has
  hand-written types for its own Song IR, which is a *host* shape (defaults applied, values clamped),
  not this one.

The [conformance corpus](https://github.com/spacedevin/deck/tree/main/conformance) stores the whole
observable parse of each case as JSON, so it doubles as a worked example of every shape here — and is
what stops the JS, Rust and Tish targets from drifting apart.
