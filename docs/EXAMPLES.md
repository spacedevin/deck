# Examples

Complete, runnable `.deck` songs — one per idea. On the docs site every block here has a **Play**
button; in a checkout, drop any of them in a `.deck` file.

The grammar reference shows *syntax* (`note <midi> <startBeat> …`); this page shows *songs*.

Everything here uses `gameBoyDmg`, `gbaDirectSound` or `basicOsc` — the three generators this player
synthesizes faithfully, so a Play button is not an approximation. The chip examples sound the same in
a browser as they do on a GBA; `basicOsc` is the way out of the console when you want one. Other
generator ids parse fine, but the player substitutes a plain oscillator and says so in
`song.substitutions`.

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

## Wavetables

`wave` names a 32-sample, 4-bit table — one cycle of a waveform, in Game Boy wave RAM order — and a
`type wave` track plays it by name. There are four ways to say one: `harmonics <a1> …` for the
amplitudes, `levels <n0> … <n31>` for the samples in decimal, `shape <name>` for a classic waveform,
and the bare 32 hex digits. All four resolve in the parser, so they cost the same and sound the same.

Reach for `harmonics`. The hex is what the table *is* — it is never how you should have to say it.

These are the same table, so the two bars below are the same sound:

```deck
deck 1
bpm 100

wave literal  8beffecbbbbaa9888776554444310014
wave additive harmonics 1 0.5 0.33 0.2

track Written id lit gen gameBoyDmg * 2
  gen type wave wave_shape literal vol 14 env_mode adsr
  adsr a 0.02 d 0.06 s 15 r 0.2
  note 48 0 1.5 v 105
  note 55 1.5 1.5 v 100
  note 60 3 1 v 110

track Summed id add gen gameBoyDmg * 2
  gen type wave wave_shape additive vol 14 env_mode adsr
  adsr a 0.02 d 0.06 s 15 r 0.2
  note 48 4 1.5 v 105
  note 55 5.5 1.5 v 100
  note 60 7 1 v 110
```

`a1` is the fundamental, `a2` the octave above it, `a3` the twelfth, and so on. Only the ratios
matter — the table is normalized to fill the 4-bit range either way — so `1 0.5` and `2 1` are the
same wave.

## Spelling a table you cannot sum

`harmonics` reaches any timbre you would design as a stack of partials, but not every table is one.
A curve tuned a nibble at a time — a bell with a slight ring in the second half of the cycle, say —
has no additive recipe, and that is what `levels` is for: the same wave RAM the hex form carries,
written in decimal. Anything hex can hold, `levels` can hold.

`shape` covers the other end, where the table is a plain waveform and naming it beats spelling it.

```deck
deck 1
bpm 92

wave clang levels 8 13 15 15 13 12 11 10 9 8 8 7 7 6 4 5 8 10 11 9 8 8 7 7 6 5 4 3 2 0 0 2

track Bell id b1 gen gameBoyDmg * 2
  gen type wave wave_shape clang vol 13 env_mode adsr
  adsr a 0.005 d 0.6 s 2 r 0.6
  note 72 0 1 v 108
  note 67 1 1 v 96
  note 72 2 2 v 112

track Reed id b2 gen gameBoyDmg * 2
  gen type pulse duty 12 vol 10 env_mode adsr
  adsr a 0.02 d 0.1 s 9 r 0.2
  note 48 4 1.5 v 100
  note 55 5.5 1.5 v 96
  note 60 7 1 v 104
```

Every level is a whole number `0..15`, and there must be exactly 32 of them — a level is a wave RAM
nibble, so there is nothing to round on your behalf.

`shape` takes `sine`, `square`, `saw`, `triangle` or `pulse`, with `duty` as a percent; `square` is
`pulse duty 50`. A narrow pulse on the wave channel is a reed the two pulse channels cannot make,
because their duty is fixed to four settings and this one is not:

```deck
deck 1
bpm 104

wave thin shape pulse duty 12.5

track Reed id r1 gen gameBoyDmg * 2
  gen type wave wave_shape thin vol 12 env_mode adsr
  adsr a 0.03 d 0.12 s 10 r 0.2
  note 55 0 1 v 100
  note 60 1 1 v 96
  note 62 2 2 v 104

track Bass id r2 gen gameBoyDmg * 2
  gen type pulse duty 50 vol 11 env_mode adsr
  adsr a 0.01 d 0.05 s 12 r 0.15
  note 36 0 2 v 104
  note 43 2 2 v 100
```

## Designing a timbre

Timbre is harmonic content, which is what makes `harmonics` easier to aim than 32 digits. The same
phrase, four times, on four tables:

```deck
deck 1
bpm 88

wave pure   harmonics 1
wave hollow harmonics 1 0 0.4 0 0.2
wave bright harmonics 1 0.5 0.33 0.25 0.2 0.16
wave clang  harmonics 1 0 0 0.7 0 0 0.45

track Pure id t1 gen gameBoyDmg * 4
  gen type wave wave_shape pure vol 13 env_mode adsr
  adsr a 0.01 d 0.08 s 12 r 0.3
  note 60 0 0.75 v 100
  note 64 1 0.75 v 96
  note 67 2 1.5 v 104

track Hollow id t2 gen gameBoyDmg * 4
  gen type wave wave_shape hollow vol 13 env_mode adsr
  adsr a 0.01 d 0.08 s 12 r 0.3
  note 60 4 0.75 v 100
  note 64 5 0.75 v 96
  note 67 6 1.5 v 104

track Bright id t3 gen gameBoyDmg * 4
  gen type wave wave_shape bright vol 12 env_mode adsr
  adsr a 0.01 d 0.08 s 12 r 0.3
  note 60 8 0.75 v 100
  note 64 9 0.75 v 96
  note 67 10 1.5 v 104

track Clang id t4 gen gameBoyDmg * 4
  gen type wave wave_shape clang vol 12 env_mode adsr
  adsr a 0.005 d 0.5 s 3 r 0.5
  note 60 12 0.75 v 100
  note 64 13 0.75 v 96
  note 67 14 1.5 v 104
```

Even harmonics left at zero (`hollow`) reads reedy, like a clarinet or a stopped organ pipe. A long
tail at roughly 1/n (`bright`) is heading toward a sawtooth, where bowed strings and brass start.
Sparse high harmonics with gaps between them (`clang`) ring like a bell — especially with a plucked
envelope under them, which is the other half of the job.

## Instrument voices

A wavetable sets the timbre; the envelope decides what is playing it. `env_mode adsr` swaps the
DMG's hardware envelope — which can only decay toward silence — for a real attack and sustain, and
`vib_rate` / `vib_amt` add the vibrato a player's hand does, in cents.

Slow attack, held sustain, gentle vibrato — a string section:

```deck
deck 1
bpm 72

wave strings harmonics 1 0.5 0.33 0.25 0.2 0.166 0.142 0.125

track Violin id vln gen gameBoyDmg * 4
  gen type wave wave_shape strings vol 11 env_mode adsr vib_rate 5.5 vib_amt 24
  adsr a 0.35 d 0.25 s 12 r 0.6
  mix gain 0.75 pan 0.3
  fx reverb_send 0.4 cutoff 3600
  note 65 0 3.8 v 88
  note 65 4 3.8 v 96
  note 65 8 3.8 v 100
  note 64 12 3.8 v 84

track Cello id vc gen gameBoyDmg * 4
  gen type pulse duty 12.5 vol 9 env_mode adsr
  adsr a 0.3 d 0.3 s 11 r 0.7
  mix gain 0.7 pan -0.3
  fx reverb_send 0.3 cutoff 1400
  note 50 0 3.8 v 84
  note 50 4 3.8 v 90
  note 48 8 3.8 v 94
  note 48 12 3.8 v 80
```

Instant attack and a long decay instead, and the same synth is a plucked string:

```deck
deck 1
bpm 92

wave nylon harmonics 1 0 0.4 0 0.2 0 0.1

track Guitar id gtr gen gameBoyDmg * 2
  gen type wave wave_shape nylon vol 12 env_mode adsr
  adsr a 0.004 d 0.9 s 3 r 0.5
  voice chord minor strum 22
  fx reverb_send 0.3 cutoff 4200
  note 57 0 3.5 v 84
  note 52 4 3.5 v 88

track Bass id bass gen gameBoyDmg * 2
  gen type pulse duty 50 vol 10 env_mode adsr
  adsr a 0.01 d 0.3 s 7 r 0.2
  fx cutoff 900
  note 45 0 1 v 100
  note 45 2 1 v 84
  note 40 4 1 v 100
  note 40 6 1 v 84
```

`voice chord minor strum 22` turns each single note into a chord rolled over 22 ms — a strum rather
than a block.

## Beyond the chips

`gameBoyDmg` and `gbaDirectSound` are hardware emulations, and everything above is bound by what a
Game Boy could do. `basicOsc` is not: it is a plain oscillator with an envelope in seconds, for when
you want the language without the console.

```deck
deck 1
bpm 76

track Pad id pad gen basicOsc * 2
  gen waveform sawtooth
  adsr a 0.6 d 0.4 s 0.55 r 1.2
  mix gain 0.5 pan -0.2
  fx cutoff 900 res 6 reverb_send 0.55
  voice chord min7
  note 48 0 4 v 80
  note 46 4 4 v 80

track Bell id bell gen basicOsc * 2
  gen waveform sine
  adsr a 0.002 d 1.4 s 0 r 0.8
  mix gain 0.4 pan 0.35
  fx reverb_send 0.6
  note 84 0 1 v 70
  note 79 1.5 1 v 60
  note 87 4 1 v 70
  note 82 5.5 1 v 60
```

The channel strip — `mix`, and `fx`'s filter, drive and reverb send — is host-side and applies to
every generator, so it works the same on a chip voice as it does here.

`basicOsc` is the plainest of thirty-three. The rest of the catalog is in
[Instruments](../synths/catalog/); the examples below are one from each family.

### Hard sync

A sync voice runs two oscillators and lets the first reset the second's phase. `slave_base` is how
far above the note the slave starts, in semitones, and `sweep_amt` is how far it sweeps down — that
sweep *is* the sound, so it wants tens of semitones rather than a couple.

```deck
deck 1
bpm 124

track Lead id lead gen syncLead * 2
  gen slave_base 19 sweep_amt 30 sweep_decay 0.25 cutoff 4200 resonance 3
  adsr a 0.02 d 0.2 s 13 r 0.3
  mix gain 0.5 pan -0.15
  fx reverb_send 0.25
  note 69 0 1.5 v 104
  note 76 1.5 0.5 v 92
  note 74 2 2 v 100
  note 72 4 1.5 v 98
  note 69 5.5 0.5 v 88
  note 64 6 2 v 94

track Choir id choir gen syncChoir * 2
  gen vowel_shift 12 morph_rate 0.8 morph_amt 6 ensemble_detune 6 vib_rate 6.5 vib_amt 14 highpass 400
  adsr a 0.3 d 0.5 s 12 r 0.8
  mix gain 0.3 pan 0.1
  fx reverb_send 0.5
  note 57 0 3.8 v 74
  note 55 4 3.8 v 76
```

### The analog rack

A 303's character is `env_mod` — a filter envelope in Hz, not a 0–1 amount, so it runs in the
thousands. The 808's `punch` is also Hz, and its `drive` is 0–1.

```deck
deck 1
bpm 128
song_seed 303

track Acid id acid gen acid303 * 2
  gen waveform sawtooth cutoff 480 resonance 20 env_mod 5000 decay 0.25
  mix gain 0.4 pan 0.15
  note 40 0 0.25 v 118
  note 52 0.75 0.25 v 110
  note 40 1.5 0.25 v 92
  note 47 2.25 0.25 v 104
  note 38 4 0.25 v 118
  note 50 4.75 0.25 v 108
  note 45 5.5 0.25 v 96
  note 38 6.5 1 v 100

track Sub id sub gen sub808 * 2
  gen punch 48 decay 2 drive 0.15 glide 0.08
  mix gain 0.5
  note 40 0 2 v 120
  note 38 4 2.5 v 112

track Kick id kick gen drumSynth * 1
  gen tone sine pitch_env 30 pitch_decay 0.035 decay 0.3 noise 0.05 drive 0.2
  mix gain 0.55
  step_pitch 36
  steps x . . . | x . . . | x . . . | x . . .

track Clap id clap gen clap * 1
  gen hands 2 spread 0.2 size 0.3 tone 0.6 claps 1 gap 0.2 tail 0.25 body 0.15
  mix gain 0.3 pan 0.2
  step_pitch 60
  steps . . . . | x . . . | . . . . | x . . .
```

### Atmospheric

Long attacks, and nothing competing for the same register.

```deck
deck 1
bpm 76

track Pad id pad gen pad * 4
  gen wave1 triangle wave2 sine detune 14 cutoff 1200
  adsr a 0.6 d 0.8 s 11 r 2
  mix gain 0.26 pan -0.3
  fx reverb_send 0.5
  note 52 0 7.6 v 72
  note 50 8 7.6 v 74

track Halo id halo gen halo * 4
  gen temper 0.5 ring 0.35 mallet 0.6 bloom 1.2 lows 0.3
  adsr a 0.02 d 2.5 s 2 r 1.6
  mix gain 0.26 pan 0.3
  fx reverb_send 0.6 cutoff 6000
  note 79 0 2 v 76
  note 84 4 2 v 72
  note 81 8 2 v 78
  note 88 12 3 v 82

track Bell id bell gen bell * 4
  gen partial 3.4 highpass 900 decay 2.6
  mix gain 0.3 pan -0.3
  fx reverb_send 0.65
  note 91 6 2 v 62
  note 86 14 2 v 58
```

### Other consoles

The Game Boy is one of six chip emulations. These are five others, in one bar each.

```deck
deck 1
bpm 140

track NES id nes gen nes2a03 * 2
  gen type pulse duty 25 vol 12 env_mode adsr vib_rate 5.5 vib_amt 22
  adsr a 0.002 d 0.12 s 8 r 0.1
  mix gain 0.5 pan -0.3
  note 76 0 0.5 v 104
  note 79 0.5 0.5 v 92
  note 83 1 1 v 100
  note 76 2 2 v 96

track SID id sid gen c64sid * 2
  gen waveform pulse pulse_width 0.28 filter_type lowpass cutoff 2400 resonance 8
  adsr a 0.004 d 0.2 s 7 r 0.15
  mix gain 0.45 pan 0.3
  note 52 0 1 v 96
  note 57 2 2 v 100
  note 50 4 1 v 94
  note 55 6 2 v 98

track FM id fm gen ym2612 * 2
  gen algorithm 4 feedback 5 op1_mul 1 op1_tl 22 op2_mul 3 op2_tl 30 op3_mul 2 op3_tl 26 op4_mul 1 op4_tl 12
  mix gain 0.4
  note 40 0 2 v 106
  note 45 4 2 v 100

track SNES id snes gen spc700 * 2
  gen waveform triangle echo_enable 1 echo_delay 0.16 echo_feedback 0.3
  adsr a 0.01 d 0.4 s 6 r 0.3
  mix gain 0.35 pan -0.15
  note 64 2 1 v 82
  note 67 6 2 v 86

track PSG id psg gen sn76489 * 1
  gen type noise noise_mode white noise_freq 3 vol 8
  adsr a 0 d 0.05 s 0 r 0.02
  mix gain 0.25 pan 0.15
  steps x . . x | . . x . | x . . x | . x . .
```

### Acoustic models

`voice` on `arco` names an instrument — `violin`, `cello`, `fiddle`, `bass` — rather than taking a
number.

```deck
deck 1
bpm 88

track Cello id vc gen arco * 4
  gen voice cello pressure 0.6 bow 0.5 vibrato 0.5 rosin 0.2 body 0.75
  adsr a 0.35 d 0.3 s 12 r 0.7
  mix gain 0.32
  fx cutoff 1600 reverb_send 0.35
  note 50 0 3.8 v 88
  note 46 4 3.8 v 84
  note 53 8 3.8 v 86
  note 48 12 3.8 v 82

track Rhodes id tine gen tine * 4
  gen bark 0.5 tine 0.65 tremolo 0.3 decay 1.1 drive 0.2
  adsr a 0.003 d 0.9 s 3 r 0.5
  mix gain 0.26 pan 0.3
  fx reverb_send 0.35 cutoff 4600
  note 62 1.5 1.2 v 74
  note 65 1.5 1.2 v 70
  note 58 5.5 1.2 v 74
  note 62 5.5 1.2 v 70
  note 65 9.5 1.2 v 74
  note 69 9.5 1.2 v 70
  note 60 13.5 1.2 v 74
  note 64 13.5 1.2 v 70

track Nylon id gtr gen guitar * 4
  gen tone 0.6 decay 1.4 damping 0.35 drive 0.15 body 0.7 mute 0
  mix gain 0.3 pan -0.2
  fx reverb_send 0.3
  note 69 0 1 v 86
  note 74 1 0.75 v 80
  note 77 4 1.5 v 88
  note 72 8 1 v 84
  note 77 10 1.5 v 90
  note 76 12 1.5 v 86
  note 74 14 1.8 v 82
```

### An operator graph

`matrixFm` is the one voice whose patch does not fit on a `gen` line, so it takes a `gen_block`:
operators, the modulation between them, a filter, and how they route to the output. This is the
factory *Supersaw Stack* — three detuned saws cross-modulated into a wide lowpass.

```deck
deck 1
bpm 128

track Saws id saw gen matrixFm * 2
  gen_block matrix_fm
    op 1 wave saw ratio 1
    op 2 wave saw ratio 1.008
    op 3 wave saw ratio 2
    env op 1 a 0.006 d 0.22 s 0.72 r 0.32
    env op 2 a 0.006 d 0.22 s 0.72 r 0.32
    env op 3 a 0.006 d 0.22 s 0.68 r 0.32
    mod fm 2 1 0.45
    mod fm 3 1 0.28
    filter 1 type lp24 cutoff 6800 res 0.32
    route op 1 filter 1 0.38
    route op 2 filter 1 0.36
    route op 3 filter 1 0.34
    route filter 1 out 1
  end gen_block
  mix gain 0.34 pan -0.1
  fx reverb_send 0.3
  note 65 0.5 0.4 v 104
  note 68 0.5 0.4 v 98
  note 72 0.5 0.4 v 96
  note 65 1.5 0.4 v 96
  note 68 1.5 0.4 v 90
  note 61 4.5 0.4 v 104
  note 65 4.5 0.4 v 98
  note 68 4.5 0.4 v 96

track Bass id bass gen reeseBass * 2
  gen voices 2 detune 15 cutoff 800 wobble 0 decay 1.2
  mix gain 0.4
  note 41 0 1.5 v 112
  note 39 4 1.5 v 108
```

## Mixing and effects

`mix` places a track and sets its level; `fx` shapes it. Cutoff and resonance are a filter sweep's
worth of character on their own, and `reverb_send` is what puts several tracks in one room.

```deck
deck 1
bpm 104

track Wide id wide gen gameBoyDmg * 2
  gen type pulse duty 25 vol 12
  mix gain 0.8 pan -0.6 eq_hi 3
  fx cutoff 2600 res 4 reverb_send 0.25
  note 72 0 0.5 v 100
  note 76 1 0.5 v 92
  note 79 2 0.5 v 100
  note 76 3 0.5 v 88

track Narrow id narrow gen gameBoyDmg * 2
  gen type pulse duty 50 vol 9
  mix gain 0.6 pan 0.6 eq_lo -4
  fx cutoff 1500 drive 0.4 reverb_send 0.5
  note 60 4 0.5 v 90
  note 64 5 0.5 v 84
  note 67 6 0.5 v 90
  note 64 7 0.5 v 80

track Kick id kick gen gbaDirectSound * 2
  gen waveform triangle pitch_drop -14
  adsr a 0 d 0.08 s 0 r 0
  mix gain 0.9
  step_pitch 36
  steps x . . . x . . . x . . . x . . .
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
