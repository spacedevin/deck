# `.deck` conformance corpus

The cross-implementation contract for the language. Every implementation runs the **same** inputs and
must produce the **same** parse:

| Implementation | Runner |
|----------------|--------|
| **Tish** (`src/index.tish` — the source itself, VM via `tish test`) | `npm run test:conformance:tish` / `npm run test:tish` |
| **JS** (`dist/deck.js`) | `npm run test:conformance` |
| **Rust** (`deckfile` crate, emitted from the same source) | `cargo test` in the crate |
| A restricted host (tish-gba) | its own test, against the `gba` profile |

The Tish runner uses `tish run`, not the JS build, because reading the corpus needs `tish:fs` and the
JS target has no filesystem. It also compares **semantically** — `JSON.stringify` ignores its indent
argument on that runtime, so a text compare would fail on whitespace while the data matched.

Each case is `NNN-name.deck` plus `NNN-name.expected.json`, which holds the full observable parse:

```jsonc
{
  "program":     { /* parseProgram output */ },
  "trackBodies": [ { "id": "c0", "rows": [...], "errors": [...] } ],  // parseTrackBody per track
  "clipBodies":  [ { "clipId": "...", "rows": [...], "errors": [...] } ]
}
```

Regenerate after an intentional language change — and read the diff, because it is the review:

```bash
npm run conformance:update
```

## Why the expected files are the whole parse

A projection would only pin what someone thought to assert. The drift this corpus exists to catch was
never in the obvious fields: it was a `#` inside a token, a name that lost its second word, an `inf`
that errored on one side, a `bar` selector one implementation ignored. Freezing the entire parse
catches the change nobody predicted.

## Profiles

An implementation may support a **subset** — tish-gba bakes to two sound chips and has no session
grid, automation or co-DJ layer. `profiles.json` records, per profile, the cases it may reject **with
a reason**, the cases it must accept, and the extensions it registers.

The rule: a restricted implementation may **reject** a listed case, but any case it does not reject
must parse **identically**. Rejecting is honest; parsing the same file differently is the bug.

The runner also fails if a case is not accounted for in a profile — so adding a case forces every
profile to state where it stands, which is what stops a subset from quietly becoming a dialect.

## Coverage

Cases are weighted toward where the implementations actually diverged:

| Case | Pins |
|------|------|
| `001-comments-and-sharps` | `#` only starts a comment at column 0 or after whitespace — `scale F# minor`, a track named `C# Lead` |
| `002-track-header` | multi-word names (`MOS 6581`), `* N`, `* inf`, macro param overrides, `remove_track` |
| `003-steps-and-locks` | literal / euclid / multi-bar `steps`, `\|` separators, all four lock lanes, `loops inf` |
| `004-notes` | `v` / `p` / `r` / `n` / `l` locks, every `bar` selector form, `transpose`, `notes_clear` |
| `005-mix-fx-voice-deck` | `mix` boolish, `fx` aliases (`reverb`, `type`), `voice`, booth routing, `gen`, `adsr` |
| `006-globals` | `bpm`, `swing`, `scale`, `launch_quant`, `song_seed`, `xfade`, `main_deck`, `deck_mix`, master/actor mix |
| `007-session-song-follow` | clips, session grid, `song` repeats, `follow` weights, automation |
| `008-macros-genblock` | macro definition + `$param` defaults, `gen_block` collection |
| `009-directives` | every `@` verb lands in `directives[]` and produces no error |
| `010-errors` | the exact set of malformed lines that must be reported |
| `011-golden` | the full-language sample from `fixtures/golden.deck` |
