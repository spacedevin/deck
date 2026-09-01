# Rendering to audio

A `.deck` file can be rendered to a `.wav` from the command line, without opening the site or
pressing play on anything.

```bash
node scripts/render-wav.mjs song.deck -o song.wav
```

```
song.wav  5.87s  2 tracks  peak -2.0 dBFS  rms -8.1 dBFS
```

## Why it needs a browser

The voices are Web Audio. They are built from `OscillatorNode`, `BiquadFilterNode`,
`WaveShaperNode`, `DelayNode` and — for the sync oscillators — an `AudioWorklet`. Node has none of
these, so there is no pure-Node path from a song to a buffer, and reimplementing the voices for a
second runtime is exactly the duplication this repo spent its effort removing.

So the renderer drives a headless Chrome instead. It serves `packages/player/dist`, calls the
player's own [`renderDeckToBuffer()`](#rendering-from-your-own-code) inside an `OfflineAudioContext`,
and copies the samples back out. Nothing is recorded from a sound device: an `OfflineAudioContext`
computes the buffer as fast as it can, which is many times quicker than real time, and it is
deterministic — the same song renders to the same samples every run.

You need Chrome or Chromium installed. The script looks in the usual places; set `CHROME` to
override.

## Options

| flag | meaning |
| --- | --- |
| `-o`, `--out <path>` | output WAV — required |
| `--beats <n>` | how many beats to render. Defaults to the song's own length |
| `--gain <g>` | master gain, `0`–`1`. Default `0.9` |
| `--sample-rate <n>` | default `44100` |
| `--no-reverb` | bypass the reverb send |
| `--normalize` | scale the result to peak at −1 dBFS |

`--beats` is how you render a slice: a two-bar audition of a long song, or one loop of a piece whose
`totalBeats` is unset.

```bash
node scripts/render-wav.mjs song.deck -o loop.wav --beats 32 --normalize
```

## Reading the output line

`peak` and `rms` are reported so a bad render is visible without opening the file.

- **peak at 0.0 dBFS** means it is clipping — lower `--gain`.
- **rms below about −30 dBFS** on a dense arrangement usually means most of it never triggered.
- **A silent render** (`peak -inf`) means nothing played at all: check the song has notes on the
  beats you asked for.

If any track names a generator with no voice behind it, the substitution is listed:

```
substituted (no voice for these ids):
  someGeneratorId
```

An empty list is the thing to want — it means every track is being played by its real voice rather
than standing in as a plain oscillator.

## Rendering from your own code

The CLI is a thin wrapper. In a browser, the player exports the same call:

```js
import { renderDeckToBuffer } from '@spacedevin/deck-player'

const buffer = await renderDeckToBuffer(source, {
  beats: 32,
  sampleRate: 44100,
  gain: 0.9,
  reverb: true,
})
```

It returns a rendered `AudioBuffer`, which you can encode, analyse, or play back.

### Sync voices need their processor registered

The sync family — `syncLead`, `syncChoir`, `obSync`, `laserSync` — is built on an `AudioWorklet`.
A worklet module registers **asynchronously**, and a voice whose processor is not yet registered
falls back to a plain oscillator rather than failing, so the symptom is a render that sounds thin
instead of one that errors.

`renderDeckToBuffer()` handles this: it waits for the module before scheduling a single note. If you
are driving `buildAudioGraph()` and `playStep()` yourself, register it first and await it:

```js
import { ensureSyncWorklet, buildAudioGraph, playStep } from '@spacedevin/deck-player'

await ensureSyncWorklet(ctx)     // null when the context has no worklet support
const graph = buildAudioGraph(ctx, song, { gain: 0.9 })
```

`buildAudioGraph()` also kicks registration off on its own, which is enough for live playback —
there, the module lands well inside the gap between the user pressing play and the first note. It is
not enough for an offline render, which gets no such gap.

## Rendering every example on this site

Each fenced block in [Examples](EXAMPLES.md) is a complete song. To render them all:

```bash
node -e '
const { readFileSync, writeFileSync, mkdirSync } = require("fs")
const md = readFileSync("docs/EXAMPLES.md", "utf8")
mkdirSync("out/examples", { recursive: true })
;[...md.matchAll(/```deck\n([\s\S]*?)```/g)].forEach((m, i) =>
  writeFileSync(`out/examples/${String(i + 1).padStart(2, "0")}.deck`, m[1]))
'
for f in out/examples/*.deck; do node scripts/render-wav.mjs "$f" -o "${f%.deck}.wav"; done
```
