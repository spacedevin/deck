# @spacedevin/deck-player

The **host** side of `.deck` — Web Audio playback for programs parsed by `@spacedevin/deck`.

**Entry:** `src/index.tish`

This package exists so that playback never enters the language package. The root
[AGENTS.md](../../AGENTS.md) lists "Audio / Web Audio engines" as out of scope for `@spacedevin/deck`,
and that stands: `../../src/` stays audio-free. Everything that rule excludes lives here.

## In scope

- AST → Song IR: **defaults, clamps, range checks**. The parser deliberately does none of this
  (`docs/DECK_GRAMMAR.md`: absent optional = `null`, "host policy, and hosts genuinely differ"), so
  this package is where `step_vel` becomes 100 and an out-of-range lock gets decided.
- Registry boot (`registerGeneratorIdAliases`, dialects, highlight keywords) per `docs/HOST.md`
- Web Audio: channel bus, master chain, generators/voices
- Transport: lookahead scheduler, play / pause / stop / seek, loop caps
- Offline render (`OfflineAudioContext`)
- The `<deck-player>` custom element
- Tests: Song IR snapshots, pure timing math, a recording fake `AudioContext` for voice schedules

## Out of scope — do not add here

- **Grammar changes.** A new body head, top-level statement, or token shape belongs in `../../src/`
  and its conformance corpus. If you need something the parser doesn't expose, fix it upstream —
  never re-tokenize `.deck` text here.
- **Conformance cases.** `../../conformance/` is the cross-implementation parse contract; adding a
  case there forces every profile in `profiles.json` to declare its position. This package reads that
  corpus as test *input* and keeps its own fixtures for playback behaviour.
- Session / co-DJ / ownership, DJ mixer crossfading, cue outputs, scratch platters — all dropped from
  the Deckard port on purpose.
- Instrument catalogs beyond the generators listed below.

## Generators

Ported from Deckard (`tish-midi/src/generators/`), which is the reference host. The port is
source-level: those modules are already Tish and already pure
(`play*(ctx, bus, t, midi, vel, durSec, ch, bendSemis)`), so a fidelity difference is a porting bug,
not a design choice.

| Tier | Generators | State |
|------|-----------|-------|
| 1 | `gameBoyDmg`, `gbaDirectSound`, `basicOsc` | ported |
| 2 | the other node-graph voices (`chiptune`, `nes2a03`, `c64sid`, `ym2612`, `sn76489`, `spc700`, `noiseBurst`, `fmTone`, `pad`, `bell`, `drumSynth`, …) | not yet ported |
| 3 | `patch`, `matrixFm` — need the gen_block graph parsers + the sync worklet | not yet ported |
| — | `ttsVocal`, `meSpeakVocal` | **excluded**: Web Speech API / `mespeak` dependency |

Anything unported falls back to `basicOsc` so a song still plays; `unsupportedGenerators()` reports
what was substituted.

## Why `element/` is not Tish

`element/deck-player-element.js` is hand-written JavaScript, shipped as authored. A custom element
must be `class X extends HTMLElement`, and **Tish has no class syntax** — `tish build` parses the
declaration as an identifier expression and emits JS that doesn't parse. Everything with behaviour
stays in `src/*.tish`; that file is only the DOM shell around it. Don't try to move it back.

## Notes for editors

- **Per-instance state only.** Deckard keeps loop counters in module-level maps
  (`deckfile/LoopState.tish`); here they live on the player instance, because two `<deck-player>`
  elements can share a page.
- The deck package's registries **are** process-wide singletons. Boot is idempotent and runs once.
- The clock worklet is loaded from an inline Blob URL, not a file — consumers must not have to copy
  assets. Keep the `setTimeout` fallback for contexts where `addModule` fails.
