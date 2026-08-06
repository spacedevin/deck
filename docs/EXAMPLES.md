# Examples

Complete, runnable `.deck` songs — one per idea. On the docs site every block here has a **Play**
button; in a checkout, drop any of them in a `.deck` file.

The grammar reference shows *syntax* (`note <midi> <startBeat> …`); this page shows *songs*. Each one
uses only `gameBoyDmg` and `gbaDirectSound`, so it sounds the same in a browser as it does on a GBA.

## Steps

The step grid is one bar of sixteenths. `x` is a hit, `.` is a rest, and `step_pitch` sets what a hit
plays when the channel has no `note` lines.

```deck
deck 1
bpm 120

track Kick id kick gen gbaDirectSound
  gen waveform triangle pitch_drop -14
  adsr a 0 d 0.08 s 0 r 0
  step_pitch 36
  steps x . . . x . . . x . . . x . . .

track Hat id hat gen gameBoyDmg
  gen type noise vol 6
  step_pitch 72
  steps . . x . . . x . . . x . . . x .
```

## Step locks

A bare `steps` line resets the locks; the lanes after it restore only the steps that differ.
`step_vel` is 1–127, `step_prob` is a 0–1 chance, `step_ratchet` fills a step with sub-hits.

```deck
deck 1
bpm 128

track Snare id snare gen gbaDirectSound
  gen waveform square
  adsr a 0 d 0.12 s 0 r 0
  step_pitch 40
  steps . . . . x . . . . . . . x . . x
  step_vel . . . . 127 . . . . . . . 100 . . 70
  step_ratchet . . . . 1 . . . . . . . 1 . . 3
  step_prob . . . . 1 . . . . . . . 1 . . 0.6
```

## Notes

Notes are placed by beat, not by step, so they can sit anywhere including off the grid. Beats are
quarter notes: one bar is 4 beats.

```deck
deck 1
bpm 116

track Lead id lead gen gameBoyDmg
  gen type pulse duty 25 vol 12
  note 72 0 0.5 v 110
  note 74 0.5 0.25 v 90
  note 76 0.75 0.75 v 105
  note 79 1.5 0.5 v 100
  note 76 2 1 v 95
  note 72 3 1 v 110

track Bass id bass gen gameBoyDmg
  gen type wave wave_shape saw vol 15
  note 36 0 2 v 120
  note 43 2 2 v 110
```

## Bar selectors

`* N` declares an N-bar pattern. A note with `bar <selector>` starts inside its own bar and repeats
on every bar the selector matches — `even`, `1`, `0,2`, `-n+2`.

```deck
deck 1
bpm 124

track Bass id bass gen gameBoyDmg * 4
  gen type wave wave_shape saw vol 14
  note 36 0 1 v 120 bar even
  note 41 0 1 v 115 bar 1
  note 43 0 1 v 115 bar 3
  note 48 2 0.5 v 90

track Kick id kick gen gbaDirectSound * 4
  gen waveform triangle pitch_drop -12
  adsr a 0 d 0.09 s 0 r 0
  step_pitch 36
  steps x . . . x . . . x . . . x . . .
```

## Euclidean fills

`steps euclid <hits> <len>` spreads N hits as evenly as possible over the pattern — the Bjorklund
fill. It expands to an ordinary step grid, so the lock lanes still apply.

```deck
deck 1
bpm 132

track Perc id perc gen gameBoyDmg
  gen type noise noise_mode short vol 7
  step_pitch 65
  steps euclid 7 16

track Kick id kick gen gbaDirectSound
  gen waveform triangle pitch_drop -14
  adsr a 0 d 0.08 s 0 r 0
  step_pitch 36
  steps euclid 4 16
```

## Voice: chords and arpeggios

`voice` transforms every trigger on the channel — one note becomes a stack, and `arp` ripples that
stack across the note instead of playing it together.

```deck
deck 1
bpm 108

track Chords id chords gen gameBoyDmg
  gen type pulse duty 50 vol 9
  voice chord minor arp up arprate 1/16
  note 60 0 2 v 100
  note 65 2 2 v 100

track Sub id sub gen gameBoyDmg
  gen type wave wave_shape triangle vol 15
  note 36 0 2 v 110
  note 41 2 2 v 110
```

## Swing and scale

`swing` delays every off-beat sixteenth; `scale` snaps every pitch onto a key, so a wrong note
becomes the nearest right one.

```deck
deck 1
bpm 96
swing 0.4
scale C minor

track Keys id keys gen gameBoyDmg
  gen type pulse duty 12.5 vol 10
  note 60 0 0.25 v 100
  note 61 0.25 0.25 v 85
  note 63 0.5 0.25 v 95
  note 66 0.75 0.25 v 90
  note 67 1 0.5 v 105
  note 63 1.5 0.5 v 90
  note 60 2 2 v 110

track Kick id kick gen gbaDirectSound
  gen waveform triangle pitch_drop -12
  adsr a 0 d 0.1 s 0 r 0
  step_pitch 36
  steps x . . . . . . . x . . . . . . .
```

## A whole song

Three voices, four bars, with the DMG's two pulse channels carrying the melody and harmony over the
wave-channel bass.

```deck
deck 1
bpm 140

track Lead id lead gen gameBoyDmg * 4
  gen type pulse duty 25 vol 11
  note 76 0 0.5 v 112
  note 79 0.5 0.5 v 100
  note 83 1 1 v 118
  note 79 2 0.5 v 95
  note 76 2.5 0.5 v 100
  note 74 3 1 v 105

track Harm id harm gen gameBoyDmg * 4
  gen type pulse duty 50 vol 7
  note 67 0 1 v 80 bar even
  note 71 1 1 v 78 bar even
  note 69 0 1 v 80 bar 1
  note 72 1 1 v 78 bar 1

track Bass id bass gen gameBoyDmg * 4
  gen type wave wave_shape saw vol 15
  note 40 0 1 v 120
  note 40 1 1 v 100
  note 47 2 1 v 115
  note 45 3 1 v 105

track Kick id kick gen gbaDirectSound * 4
  gen waveform triangle pitch_drop -14
  adsr a 0 d 0.07 s 0 r 0
  step_pitch 36
  steps x . . . x . . x x . . . x . x .
```
