# deck language

Line-oriented, streamable patch text (`.deck`). This is the **language** reference for `@spacedevin/deck`.

**Package responsibilities:** tokenize, `parseProgram` → AST, format helpers, bar selectors, Euclidean step fill, wavetables, scale root/mode vocab, highlight classify, empty registries (generator id / param key / macro / gen_block dialect).

**Host responsibilities:** map AST → project IR (apply/emit), audio engines, ownership/skills, co-DJ, UI. Generators, builtin macro catalogs, and `patch` / `matrix_fm` dialect parsers are **host-registered**.

Times are in **quarter-note beats**. One bar = 4 beats = **16** sixteenth steps.

---

## Lexical

- Lines are statements. Indentation (2+ spaces or tab) nests a body under the current open block (`track`, `clip`, `auto`, `macro`, `song`, `follow`, `gen_block`).
- `#` starts a comment to end of line — but **only at column 0 or after whitespace**, so a `#` inside a token is data. That is what makes sharp note names (`scale F# minor`, a track named `C#maj`) work.
- Tokens: whitespace-separated; numbers accepted by `isNumberToken`.
- Legacy alias: `tpl` ≡ `deck` for the version header only.

---

## Version header

```
deck 1
```

Recommended first non-comment line. Emit writes `deck 1`. Distinct from track-body routing `deck A|B|C|D`.

---

## Top-level statements

These are recognized by `parseProgram`.

| Statement | Form | Notes |
|-----------|------|--------|
| Version | `deck <n>` / `tpl <n>` | |
| Tempo | `bpm <number>` | |
| Swing | `swing <0..1>` | Off-beat 16th shuffle; `0` = straight |
| Scale lock | `scale <root> <mode>` | `root` = note (`C`, `F#`, `Bb`) or pitch-class `0..11`; modes below. `scale off` / `none` / `chromatic` clears (AST root `-1`) |
| Launch quant | `launch_quant <n>` | Scene/clip launch grid (bars), `n ≥ 1` |
| Song seed | `song_seed <int>` | Seeds deterministic randomness (e.g. step probability) |
| Wavetable | `wave <name> harmonics <a1> …` / `levels <n0> … <n31>` / `shape <name> [duty <pct>]` / `<32 hex>` | Named PSG wavetable; see below |
| Crossfader | `xfade <x> [<y>]` | Both `0..1`; if `y` omitted, `y = 0.5` |
| Main deck | `main_deck live\|local` | Which booth feeds the main out |
| Booth mix | `deck_mix <A\|B\|C\|D> [hi n] [mid n] [lo n] [flt n] [vol n]` | Any subset of keys |
| Track | `track <name…> id <id> gen <genId\|macro> [ * <N\|inf> ] [ <k> <v> … ]` | Name may be multi-word; anchored on `id` / `gen` |
| Remove track | `remove_track <id>` | Incremental edit; not present in full snapshots |
| Macro def | `macro <name> [k=default …]` … `end macro` | Body lines = patch dialect lines |
| Automation | `auto …` + indented `<beat> <value>` | See [Automation](#automation) |
| Master mix | `master_mix eq_lo <db> eq_mid <db> eq_hi <db>` | Keys any order; missing keys unchanged |
| Actor mix | `actor_mix <lane> …` | `gain`/`trim`, `eq_*`, optional `mute`/`solo` |
| Session scenes | `session_scenes <n>` | `n ≥ 1` |
| Session slot | `session_slot <channelId> <sceneIdx> <clipId\|-\|.>` | `-`/`.` clears |
| Clip | `clip <clipId> channel <channelId> bars <n> [name …]` + indented body | |
| Song | `song` + indented `P<scene1> [x<repeat>]` or bare scene index | 1-based `P` |
| Follow | `follow` + indented `P<scene> <a> <wa> [<b> <wb>]` | 1-based `P` |
| Control directive | `@ <verb> …` | Collected into `directives[]`; the verb is host-interpreted. See [Control directives](#control-directives-) |

### Scale modes

Accepted mode tokens (aliases in parentheses):  
`major` (`ionian`), `minor` (`aeolian`), `dorian`, `phrygian`, `lydian`, `mixolydian`, `locrian`, `harmonic_minor`, `melodic_minor`, `pentatonic_major` (`penta_major`, `majpenta`), `pentatonic_minor` (`penta_minor`, `minpenta`), `blues`.

Package helpers: `parseScaleRoot`, `scaleRootNames`, `scaleModeNames`, `scaleIntervals`.

### Wavetables

```
wave <name> harmonics <a1> [a2 a3 …]
wave <name> levels <n0> <n1> … <n31>
wave <name> shape sine|square|saw|triangle|pulse [duty <pct>]
wave <name> <32 hex digits>
```

A named PSG wavetable: **32 four-bit levels**, one cycle, in Game Boy wave RAM order. `0` is the bottom
of the wave, `f` the top, `8` about the rest line. Select one with `gen type wave wave_shape <name>`;
a name matching no `wave` line falls back to the host's built-in shapes.

All four spellings are **expanded at parse time**, the way `steps euclid` is: a host reads `levels`
and never has to know which one produced it. The source form is kept on the AST node alongside, so an
emitter can write back what was written rather than flattening everything to hex.

**`harmonics`** gives amplitudes instead of samples — `a1` is the fundamental, `a2` the octave above
it, `a3` the twelfth — summed into 32 levels and normalized to fill the range, so only the ratios
matter. This is the form to reach for: it says what a timbre *is*.

**`levels`** is the same 32 samples in decimal, each a whole number `0..15`. It exists so the set of
spellings is exhaustive. `harmonics` can only land on tables whose partials are all in sine phase, so
a curve someone tuned a nibble at a time has no additive recipe — without `levels` it would be stuck
as hex. Anything hex can say, `levels` can say.

**`shape`** names a classic waveform. `duty` is a percent above 0 and below 100, and applies to
`pulse`; `square` is `pulse` at 50. These names existed before only as a host-side fallback for
`wave_shape`, with a different vocabulary and a different default in each host — resolving them here
means every host gets the same levels.

Every line below is the same sound:

```
wave organ harmonics 1 0.5 0.33 0.2
wave organ 8beffecbbbbaa9888776554444310014
wave organ levels 8 11 14 15 15 14 12 11 11 11 11 10 10 9 8 8 8 7 7 6 5 5 4 4 4 4 3 1 0 0 1 4
```

Errors: a hex form that is not exactly 32 hex digits; a `harmonics` form with no numbers, a
non-numeric amplitude, or amplitudes that are all zero (silence has no shape to normalize); a
`levels` form without exactly 32 samples, or a sample that is not a whole number `0..15`; a `shape`
that is not one of the five names, a duty outside `0 < pct < 100`, or trailing tokens that are not
`duty <pct>`.

### Track header

```
track <displayName> id <channelId> gen <generatorId|macro> [ * <N|inf> ] [ <param> <val> … ]
```

- `* N` — **pattern length** in bars (default 1). Channel spans `N × 16` steps and repeats. `* inf` / `* infinite` clears an explicit finite length.
- Trailing `key value` pairs — **macro parameter overrides** when `gen` is a macro name.
- `* N` and the `key value` pairs may appear in **any order** after `gen <id>`. Emit writes `* N` first; a `*` that names no valid length is an error, never a silently dropped token.
- `generatorId` spellings are host-registered (`registerGeneratorIdAliases`). Undeclared ids pass through as-is.

---

## Track / clip body

`parseProgram` stores indented body lines as token rows (except `gen_block` collection);
**`parseBodyLine` / `parseTrackBody`** turn those rows into typed values. The heads below are the
standard language.

Body parsing is deliberately **parse-only**: an absent optional is `null` so the host applies its own
default, and there is no clamping or range checking — that is host policy, and hosts differ (one
clamps an out-of-range lock, another rejects it). Range checks needing track context (`note` start vs
`* N`) can't live here at all. An unrecognised head comes back as `kind: "unknown"` so a host dialect
can claim it via `registerBodyLineDialect` — see [DECK_EXTENSION.md](DECK_EXTENSION.md).

### Mix

```
mix gain <n> pan <n> [mute <0|1>] [solo <0|1>] [eq_lo <db>] [eq_mid <db>] [eq_hi <db>]
```

Boolish: `1`/`true`/`on` vs `0`/`false`/`off`.

### Pattern length vs play cap

| Form | Meaning |
|------|---------|
| `* N` on track header | Pattern **length** (bars); loops forever |
| `loops <N\|inf\|infinite>` | Finite **play cap** since Play / re-apply; then silent |

Compose: `* 4` + `loops 8` = 4-bar pattern played twice, then stops.

### Steps

```
steps x . . . x . . . x . . . x . . .
steps euclid <hits> <len>
```

- On: `x` `X` `1` · Off: `.` `0`
- Euclidean: Bjorklund fill (`euclideanPattern` in this package). Common host constraint: `len = 16`.

#### Step lock lanes (after `steps`)

Emitted only when a step differs from the default:

| Lane | Range (default) | Meaning |
|------|-----------------|--------|
| `step_vel` | `1..127` (100) | Velocity |
| `step_prob` | `0..1` (1) | Hit probability (seeded; peers agree) |
| `step_ratchet` | `1..8` (1) | Sub-hits over the step |
| `step_nudge` | `-0.5..0.5` (0) | Micro-timing as a fraction of a step |

A bare `steps` line resets locks; following lanes restore deviations. Optional host extension: `step_lyric` (emitted by some hosts).

### Step pitch

```
step_pitch <midi> [ bar <selector> ]
```

Base MIDI for step hits when the channel has **no** `note` lines (default **36**). With `bar <selector>`, one line per bar/group for multi-bar patterns.

### Notes (piano roll)

```
note <midi> <startBeat> <durBeats> v <velocity> [ p <prob> ] [ r <ratchet> ] [ n <nudge> ] [ bar <selector> ] [ l <lyric> ]
```

- Beats in quarter notes. For pattern length `N`: `0 ≤ startBeat` and `startBeat + durBeats ≤ N×4`.
- Optional locks (non-default only on emit): `p`, `r`, `n` — same semantics as step locks.
- `bar <selector>`: keep `startBeat < 4`; expand onto matching loop bars.
- Host optional: `l <lyric>` on notes / step lyric lane.

**Steps vs notes:** if a track block contains any `note` lines, steps for that channel are cleared. If it contains `steps` and no `note`s, piano notes are cleared. Playback prefers notes when any exist.

Also: `notes_clear` — host edit fragment that clears piano notes.

### Transpose

```
transpose <semitones>
```

Integer shift applied to collected `note` pitches for that block.

### Generator params (fixed / generic)

Hosts typically accept:

```
gen <snake_key> <val> …
adsr a <n> d <n> s <n> r <n>
```

plus legacy one-line shapes for specific engines (`noise …`, `fm …`, `osc waveform …`). Snake_case keys map via `paramKeyToCamel` / `registerParamKeyAliases`.

### Channel FX / voice / deck routing

```
fx reverb_send <n> drive <n> lfo_rate <n> lfo_depth <n> cutoff <n> res <n> [filter_type <t>]
voice octave <n> arp <token> chord <token> arprate <token> inversion <token> strum <n>
deck <A|B|C|D|live> [slot <n>]
```

`fx` also accepts `reverb` as alias for `reverb_send`, and `type` as alias for `filter_type`.

### Heavy generators (`gen_block`)

```
gen_block <generatorId>
  …
end gen_block
```

Core language collects lines until `end gen_block`. `parseGenBlock(id, lines)` returns `{ kind, tplHeaderId, version, raw }` until a host dialect is registered. See [DECK_EXTENSION.md](DECK_EXTENSION.md) for the registration API and common `patch` / `matrix_fm` dialects.

---

## Bar selectors

Single token (no spaces). Used after `bar` on `note` / `step_pitch`. Bars are **0-indexed** within the track's `* N` length.

| Selector | Matches |
|----------|---------|
| `even` / `odd` | 0,2,4,… / 1,3,5,… |
| `<int>` | that bar only |
| `n` / `*` / `all` / `every` | every bar |
| `<a>n` | `bar % a == 0` |
| `<a>n+<b>` | `bar % a == b` |
| `-n+<b>` | first `b` bars (`0 .. b-1`) |
| `b0,b1,…` | explicit list |

Package: `parseBarSelector`, `barSelectorMatches`.

---

## Macros

**Define** (top-level):

```
macro <name> [key=default …]
  … patch-dialect body with $key …
end macro
```

**Use:** `track … gen <name> [key val …]` — expands to a `gen_block patch` at load (when the host registers a patch dialect + builtin/user macros). Package provides `lookupMacro`, `expandMacroBody`, `registerBuiltinMacros` (catalog is empty until the host fills it).

---

## Automation

```
auto master_gain
  <beat> <value>

auto <channelId> gen <paramName>
  <beat> <value>

auto <channelId> mix <gain|pan|eq_lo|eq_mid|eq_hi>
  <beat> <value>

auto actor <lane> mix <gain|trim|eq_lo|eq_mid|eq_hi>
  <beat> <value>

auto master mix <eq_lo|eq_mid|eq_hi>
  <beat> <value>
```

Indented points are `beat value` pairs. Hosts interpolate on the beat timeline (`beat = globalStep × 0.25` for step playback).

---

## Session / scenes / clips

```
session_scenes <n>
session_slot <channelId> <sceneIdx> <clipId|->

clip <clipId> channel <channelId> bars <n> [name <display…>]
  steps …
  note …
  loops …
```

Clip grid length = `bars × 16` steps. Clip notes may span the whole clip (`bars × 4` beats). Same steps-vs-notes rule as tracks.

### Song arrangement

```
song
  P1
  P2 x4
  3
```

1-based scene refs (`P<n>` or bare index). Optional `xN` repeat.

### Follow actions

```
follow
  P1 next 1
  P2 jump 0.7 stay 0.3
```

`P<scene1> <actionA> <weightA> [<actionB> <weightB>]`. Host interprets action tokens.

---

## Control directives (`@ …`)

Transient **stream** lines. Most are **not** stored in a static project document; hosts apply them for performance / co-DJ.

`parseProgram` collects every `@ …` line into `directives[]` as `{ lineNo, verb, tokens }` and does
not interpret the verb — that is host policy. A bare `@` with no verb is an error. Hosts typically
understand:

| Directive | Typical authority | Effect |
|-----------|-------------------|--------|
| `@ launch scene <n>` | master | Arm scene clips |
| `@ launch clip <trackId> <clipId\|-\|stop>` | track owner | Per-track clip / release / stop |
| `@ transport play\|song\|sequence [scene] \| stop` | master | Shared transport |
| `@ transport preview` | private | Local preview clock |
| `@ cue <scene>` | private | Load into local cue |
| `@ throw [scene]` | master | Cue → shared main |
| `@ fx <echo\|filter> on\|off …` | master | Live master FX |
| `@ deck <A\|B\|C\|D> <cut\|rev\|brake> on\|off` · `spin` | deck owner / master | Vinyl platter moves |
| `@ perf_step <n>` | — | Schedule surrounding block for perf step `n` |

Any other verb is collected too, so a host may define its own without a parser change.

---

## Format helpers

Package emit helpers (numeric spelling):

- `formatTplBeat` — snap to 1/96 beat, trim zeros  
- `formatTplFloat` — ≤ 4 decimal places, trimmed  

---

## Streaming rules

1. Strip comments; ignore empty lines.
2. A line commits when its newline arrives and any open `gen_block` is closed.
3. Partial trailing lines must not mutate state.
4. Incremental merge is by `channelId` / clip id / automation key (host apply).

---

## What is not language (host-only)

- Audio engines and Web Audio graphs
- Instrument / preset catalogs and generator default param tables
- Builtin macro catalogs (register into the package)
- Ownership, skills, co-DJ transport plumbing
- HTML highlight styling (`tpl-hl-*`) — classify API only lives here
- Project JSON / IR schemas beyond what the AST implies

---

## Golden example

```
deck 1
bpm 118
swing 0.08
scale C minor
xfade 0.5 0.5
main_deck live

track Kick id c0 gen noise_burst
  mix gain 0.9 pan 0 eq_lo 0 eq_mid 0 eq_hi 0
  deck A
  step_pitch 36
  steps x . . . x . . . x . . . x . . .
  step_vel 120 100 100 100 70 100 100 100 100 100 100 100 90 100 100 100

track Bass id c3 gen fm * 2
  mix gain 0.85 pan 0
  voice octave -1
  fx cutoff 1200 res 0.4
  note 48 0.0 0.5 v 90
  note 50 1.0 0.5 v 85 bar even

track Lead id c4 gen patch
  gen_block patch
    osc o1 sawtooth note
    filter f1 lowpass q 4 freq 1800
    gain a1 0
    conn o1 f1 1
    conn f1 a1 1
    conn a1 out 1
    env a1.gain set 0 0 lin 0.01 0.9 lin dur 0
  end gen_block
  note 60 0 1 v 80

session_scenes 4
session_slot c0 0 clip_kick_a

clip clip_kick_a channel c0 bars 1
  steps x . . . x . . . x . . . x . . .

auto master_gain
  0 0.85
  16 0.9

master_mix eq_lo 0 eq_mid 0 eq_hi 0
```
