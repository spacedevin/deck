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
- **Voice implementations.** Those live in `@spacedevin/deck-synths`, in this repo under
  `packages/synths/`. This package owns the IR, the buses, the transport and the master chain — not
  the instruments.

## Generators

The catalog is **`@spacedevin/deck-synths`** (`packages/synths/`), which ships from this repo in
lockstep with the language and this package. All 33 voices live there, including `patch` and
`matrixFm`; a voice is a pure function
(`play*(ctx, bus, t, midi, vel, durSec, ch, bendSemis)`) that connects its last node to `bus.input`.
Add a voice there, not here.

Voices clean up after themselves: each schedules its own disconnects once its tail has passed. A
voice may instead return `{ stopTime, disconnects }` and let this package prune it per step
(`pruneVoices` in `src/index.tish`); that path exists for voices that must not lean on a wall-clock
timer, since an `OfflineAudioContext` has none. `src/generators/` here holds only `Registry.tish`;
there are no local voice copies left.

The catalog falls back to `basicOsc` for a generator id it has no voice for, so a song still plays.
This package surfaces that in `song.substitutions`.

`ttsVocal` and `meSpeakVocal` need the Web Speech API and a `mespeak` worker respectively, so they
stay out of scope here regardless.

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
