# @spacedevin/deck-synths

The **instrument catalog** for `.deck` — the 33 Web Audio voices, and the dispatch that picks one.

**Entry:** `src/index.tish`

This package exists so that one set of voices serves every host: Deckard, `@spacedevin/deck-player`,
the docs site, the WAV renderer. The root [AGENTS.md](../../AGENTS.md) keeps audio out of the
language package; the player's [AGENTS.md](../player/AGENTS.md) keeps voice implementations out of
the player. Both of those exclusions land here.

## In scope

- Voices: one `src/<Name>.tish` per generator id, a pure `play<Name>(ctx, bus, t, midi, vel, durSec, ch, bendSemis)`
  that builds a short-lived subgraph, connects it to `bus.input`, and disconnects its nodes once the
  tail has passed. A voice may instead return `{ stopTime, disconnects }` and let the host prune it
  per step, which is the path to take when a voice must not lean on a wall-clock timer
- `Registry.tish` — the catalog: id, label, description, default `generatorParams`
- `Dispatch.tish` — `dispatchPlayNote` by `ch.generatorId`, `basicOsc` fallback for unknown ids
- `DeckIds.tish` — teaching the language this catalog's ids, param aliases and gen_block dialects
  (`ensureDeckGeneratorIds`), via the registries `docs/HOST.md` describes
- Shared DSP: `Duty.tish`, `AdsrAmpSchedule.tish`, `Midi.tish`, the `PatchGraph` / `MatrixFmGraph` parsers
- `SyncWorklet.tish` — the hard-sync processor from an inline Blob URL
- `BuiltinMacros.tish` — the builtin macro *contents* the language package deliberately leaves empty

## Out of scope — do not add here

- **Grammar.** New tokens, body heads or statements belong in `../../src/` and its conformance corpus.
  Register vocabulary through the language's registries; never re-tokenize `.deck` text.
- **Sequencing.** Song IR, defaults and clamps, the transport, buses and the master chain are the
  player's. A voice receives a resolved note; it does not decide when notes happen.
- **Assets to copy.** The worklet is inlined for that reason. `meSpeakVocal` is the one exception and
  is documented as such.

## Notes for editors

- **No `class` syntax** in Tish — `tish build` emits JS that doesn't parse. Worklet processors are
  written as a JS string for that reason.
- Deterministic by design: seed anything random so two renders of one song are identical.
- Two copies of `@spacedevin/deck` in one page means two dialect registries. Keep it a peer.
