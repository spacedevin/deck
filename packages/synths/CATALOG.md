# Instrument catalog

Every voice in `@spacedevin/deck-synths`, generated from `generatorCatalog()` and
`defaultParamsForGeneratorId()` so it cannot drift from the code.

Select one with `track <Name> id <id> gen <generatorId>`. Parameters are set with `gen <key> <value>`
in snake_case — `sweep_amt 26` reaches the voice as `sweepAmt`. Values below are the defaults.

| Voices | Count |
|---|---|
| Chip emulations | 8 |
| Hard sync | 4 |
| Analog & electronic | 7 |
| Atmospheric | 4 |
| Acoustic models | 3 |
| Percussion | 4 |
| Vocal | 3 |
| **Total** | **33** |

## Chip emulations

### `gameBoyDmg` — LR35902

Game Boy DMG APU emulator (100% hardware parity).

| Parameter | Default |
|---|---|
| `type` | `"pulse"` |
| `duty` | `"50"` |
| `envMode` | `"step"` |
| `vol` | `15` |
| `sweep` | `0` |
| `noiseMode` | `"long"` |
| `waveShape` | `"saw"` |
| `attack` | `0` |
| `decay` | `0` |
| `sustain` | `15` |
| `release` | `0` |
| `pitchDrop` | `0` |
| `pitchDec` | `0.05` |
| `vibRate` | `0` |
| `vibAmt` | `0` |
| `arpRate` | `0` |
| `arpSemis` | `0` |
| `len` | `0` |
| `envStep` | `0` |
| `envUp` | `false` |
| `sweepShift` | `0` |
| `sweepPeriod` | `0` |
| `sweepDown` | `false` |
| `noiseShift` | `null` |
| `noiseRatio` | `0` |

Factory presets:

- **GB Pulse Lead** — `{ channel: "pulse_50", decay: 0.15, sweep: 0 }`
- **GB Bass** — `{ channel: "wavetable", waveShape: "sawtooth", decay: 0.3, sweep: 0 }`
- **25% Pulse** — `{ type: "pulse", duty: "25", envMode: "step", vol: 15, sweep: 2, attack: 0, decay: 0, sustain: 15, release: 0 }`
- **Wavetable Crunch** — `{ type: "wave", waveVol: "100", attack: 0, decay: 0, sustain: 15, release: 0 }`

### `nes2a03` — 2A03

NES APU emulator (100% hardware parity).

| Parameter | Default |
|---|---|
| `type` | `"pulse"` |
| `duty` | `"50"` |
| `envMode` | `"decay"` |
| `vol` | `10` |
| `sweep` | `0` |
| `noiseMode` | `"long"` |
| `attack` | `0` |
| `decay` | `0` |
| `sustain` | `15` |
| `release` | `0` |
| `vibRate` | `0` |
| `vibAmt` | `0` |
| `arpRate` | `0` |
| `arpSemis` | `0` |
| `pitchDrop` | `0` |
| `pitchDec` | `0.05` |
| `dutySweep` | `0` |
| `dpcmSample` | `"kick"` |

Factory presets:

- **NES Pulse 50%** — `{ channel: "pulse_50", decay: 0.2, sweep: 0 }`
- **NES Pulse 25%** — `{ channel: "pulse_25", decay: 0.2, sweep: 0 }`
- **NES Pulse 12.5%** — `{ channel: "pulse_12_5", decay: 0.25, sweep: 0 }`
- **NES Triangle** — `{ channel: "triangle", decay: 0.4, sweep: 0 }`
- **NES Noise** — `{ channel: "noise", decay: 0.1, sweep: 0 }`
- **NES Laser Sweep** — `{ channel: "pulse_50", decay: 0.2, sweep: -12 }`
- **Pulse Lead** — `{ type: "pulse", duty: "50", envMode: "decay", vol: 12, attack: 0, decay: 3, sustain: 10, release: 2 }`
- **12.5% Pluck** — `{ type: "pulse", duty: "12_5", envMode: "decay", vol: 15, attack: 0, decay: 6, sustain: 0, release: 1 }`
- **Triangle Bass** — `{ type: "triangle", vol: 15, attack: 0, decay: 0, sustain: 15, release: 0 }`

### `c64sid` — MOS 6581

Commodore 64 SID chip emulator (100% hardware parity).

| Parameter | Default |
|---|---|
| `waveform` | `"sawtooth"` |
| `pulseWidth` | `0.5` |
| `filterType` | `"lowpass"` |
| `cutoff` | `2000` |
| `resonance` | `5` |
| `attack` | `0` |
| `decay` | `5` |
| `sustain` | `15` |
| `release` | `6` |
| `hardSync` | `false` |
| `ringMod` | `false` |
| `pitchDrop` | `0` |
| `pitchDec` | `0.05` |
| `vibRate` | `0` |
| `vibAmt` | `0` |
| `arpRate` | `0` |
| `arpSemis` | `0` |

Factory presets:

- **C64 SID Lead** — `{ waveform: "sawtooth", pulseWidth: 0.5, filterType: "lowpass", cutoff: 3500, resonance: 6, attack: 0.008, decay: 0.2, sustain: 0.6, release: 0.1 }`
- **C64 SID Bass** — `{ waveform: "pulse", pulseWidth: 0.4, filterType: "lowpass", cutoff: 1200, resonance: 8, attack: 0.005, decay: 0.35, sustain: 0.4, release: 0.08 }`
- **C64 PWM Pad** — `{ waveform: "pulse", pulseWidth: 0.3, filterType: "lowpass", cutoff: 2000, resonance: 4, attack: 0.08, decay: 0.5, sustain: 0.7, release: 0.3 }`
- **SNES Warm Pad** — `{ waveform: "pulse", pulseWidth: 0.5, filterType: "lowpass", cutoff: 1500, resonance: 2, attack: 0.12, decay: 0.5, sustain: 0.65, release: 0.4 }`
- **SNES Lead** — `{ waveform: "sawtooth", pulseWidth: 0.5, filterType: "lowpass", cutoff: 2500, resonance: 3, attack: 0.008, decay: 0.25, sustain: 0.6, release: 0.12 }`
- **SID Brass** — `{ waveform: "sawtooth", pulseWidth: 0.5, filterType: "lowpass", cutoff: 4000, resonance: 2, attack: 0.03, decay: 0.3, sustain: 0.7, release: 0.15 }`
- **Hard Sync Lead** — `{ waveform: "sawtooth", hardSync: true, attack: 2, decay: 5, sustain: 10, release: 6, pitchDrop: -12, pitchDec: 0.2 }`
- **Filter Bass** — `{ waveform: "pulse", pulseWidth: 0.5, filterType: "lowpass", cutoff: 600, resonance: 8, attack: 0, decay: 4, sustain: 4, release: 3 }`

### `ym2612` — YM2612

Sega Genesis FM Synth emulator (References: Nuked-OPN2, Genesis Plus GX).

| Parameter | Default |
|---|---|
| `algorithm` | `0` |
| `feedback` | `0` |
| `op1_mul` | `1` |
| `op1_tl` | `0` |
| `op1_ar` | `31` |
| `op1_dr` | `5` |
| `op1_sr` | `5` |
| `op1_rr` | `5` |
| `op1_sl` | `0` |
| `op2_mul` | `1` |
| `op2_tl` | `0` |
| `op2_ar` | `31` |
| `op2_dr` | `5` |
| `op2_sr` | `5` |
| `op2_rr` | `5` |
| `op2_sl` | `0` |
| `op3_mul` | `1` |
| `op3_tl` | `0` |
| `op3_ar` | `31` |
| `op3_dr` | `5` |
| `op3_sr` | `5` |
| `op3_rr` | `5` |
| `op3_sl` | `0` |
| `op4_mul` | `1` |
| `op4_tl` | `0` |
| `op4_ar` | `31` |
| `op4_dr` | `5` |
| `op4_sr` | `5` |
| `op4_rr` | `5` |
| `op4_sl` | `0` |
| `pitchDrop` | `0` |
| `pitchDec` | `0.05` |
| `vibRate` | `0` |
| `vibAmt` | `0` |
| `arpRate` | `0` |
| `arpSemis` | `0` |

Factory presets:

- **Genesis E-Piano** — `{ algorithm: 4, feedback: 0, op1_mul: 1, op1_tl: 0, op1_ar: 31, op1_dr: 12, op1_sr: 5, op1_rr: 8, op1_sl: 5, op2_mul: 1, op2_tl: 20, op2_ar: 31, op2_dr: 15, op2_sr: 5, op2_rr: 8, op2_sl: 5, op3_mul: 4, op3_tl: 30, op3_ar: 31, op3_dr: 18, op3_sr: 5, op3_rr: 8, op3_sl: 5, op4_mul: 1, op4_tl: 10, op4_ar: 31, op4_dr: 10, op4_sr: 5, op4_rr: 8, op4_sl: 5 }`
- **Genesis Brass** — `{ algorithm: 1, feedback: 5, op1_mul: 1, op1_tl: 0, op1_ar: 20, op1_dr: 15, op1_sr: 5, op1_rr: 10, op1_sl: 2, op2_mul: 2, op2_tl: 15, op2_ar: 22, op2_dr: 12, op2_sr: 5, op2_rr: 10, op2_sl: 2, op3_mul: 1, op3_tl: 5, op3_ar: 18, op3_dr: 10, op3_sr: 5, op3_rr: 10, op3_sl: 2, op4_mul: 1, op4_tl: 0, op4_ar: 24, op4_dr: 8, op4_sr: 5, op4_rr: 10, op4_sl: 2 }`

### `sn76489` — SN76489

Sega Master System / Genesis PSG emulator (References: MAME).

| Parameter | Default |
|---|---|
| `type` | `"square"` |
| `noiseMode` | `"white"` |
| `noiseFreq` | `0` |
| `vol` | `15` |
| `attack` | `0` |
| `decay` | `0.1` |
| `sustain` | `15` |
| `release` | `0` |
| `pitchDrop` | `0` |
| `pitchDec` | `0.05` |
| `vibRate` | `0` |
| `vibAmt` | `0` |
| `arpRate` | `0` |
| `arpSemis` | `0` |

Factory presets:

- **PSG Square Lead** — `{ type: "square", vol: 15, attack: 0, decay: 0.1, sustain: 15, release: 0 }`

### `spc700` — SPC700

Super Nintendo S-DSP emulator (References: bsnes, snes9x).

| Parameter | Default |
|---|---|
| `waveform` | `"strings"` |
| `attack` | `0` |
| `decay` | `3` |
| `sustainLevel` | `7` |
| `sustainRate` | `0` |
| `echoEnable` | `false` |
| `echoDelay` | `4` |
| `echoFeedback` | `0` |
| `echoFir` | `0` |
| `pitchDrop` | `0` |
| `pitchDec` | `0.05` |
| `vibRate` | `0` |
| `vibAmt` | `0` |
| `arpRate` | `0` |
| `arpSemis` | `0` |

Factory presets:

- **Echo Strings** — `{ waveform: "strings", attack: 10, decay: 3, sustainLevel: 7, sustainRate: 0, echoEnable: true, echoDelay: 8, echoFeedback: 40 }`
- **Warm Brass** — `{ waveform: "brass", attack: 6, decay: 5, sustainLevel: 5, sustainRate: 0, echoEnable: false, echoDelay: 4, echoFeedback: 0 }`

### `gbaDirectSound` — GBA DirectSound

Game Boy Advance 8-bit DAC software mixing simulator.

| Parameter | Default |
|---|---|
| `waveform` | `"pulse"` |
| `duty` | `"50"` |
| `vol` | `15` |
| `attack` | `0` |
| `decay` | `2` |
| `sustain` | `15` |
| `release` | `0` |
| `bitcrush` | `true` |
| `pitchDrop` | `0` |
| `pitchDec` | `0.05` |
| `vibRate` | `0` |
| `vibAmt` | `0` |
| `arpRate` | `0` |
| `arpSemis` | `0` |

Factory presets:

- **Software Saw Lead** — `{ waveform: "sawtooth", duty: "50", attack: 0, decay: 1, sustain: 15, release: 0, bitcrush: true }`
- **Pulse Chug** — `{ waveform: "pulse", duty: "25", attack: 0, decay: 0.1, sustain: 0, release: 0.2, bitcrush: true }`

### `chiptune` — Chiptune

Retro 8-bit pulse-width modulation and decimation crush.

| Parameter | Default |
|---|---|
| `waveform` | `"pulse"` |
| `pulseWidth` | `0.5` |
| `pwmSpeed` | `0` |
| `bitcrush` | `0` |
| `lowpass` | `0` |
| `arpRate` | `0` |
| `arpSemis` | `0` |
| `attack` | `0.005` |
| `decay` | `0.3` |
| `sustain` | `0` |
| `release` | `0.05` |

## Hard sync

### `syncLead` — Sync Lead

Aggressive true hard sync analog lead with an automated sweep envelope.

| Parameter | Default |
|---|---|
| `masterTune` | `0` |
| `slaveBase` | `12` |
| `sweepAmt` | `24` |
| `sweepDecay` | `0.4` |
| `lfoRate` | `0` |
| `lfoAmt` | `0` |
| `cutoff` | `3000` |
| `resonance` | `5` |
| `filterEnvAmt` | `0` |
| `filterDecay` | `0.4` |
| `attack` | `0.05` |
| `decay` | `0.3` |
| `sustain` | `0.8` |
| `release` | `0.5` |

Factory presets:

- **Sync Screamer** — `{ slaveBase: 19, sweepAmt: 36, sweepDecay: 0.25, cutoff: 5000, resonance: 3, filterEnvAmt: 0, attack: 0.02, decay: 0.2, sustain: 0.9, release: 0.3 }`
- **Sync Pluck** — `{ slaveBase: 12, sweepAmt: 24, sweepDecay: 0.15, cutoff: 2400, resonance: 6, filterEnvAmt: 0.3, filterDecay: 0.2, attack: 0.005, decay: 0.15, sustain: 0, release: 0.2 }`
- **Sync Talk Box** — `{ slaveBase: 5, sweepAmt: 12, sweepDecay: 0.6, lfoRate: 3.5, lfoAmt: 8, cutoff: 1800, resonance: 8, attack: 0.08, decay: 0.4, sustain: 0.7, release: 0.4 }`

### `syncChoir` — Sync Choir

Lush, robotic 80s analog choir built from detuned hard sync formants.

| Parameter | Default |
|---|---|
| `vowelShift` | `24` |
| `morphRate` | `0.5` |
| `morphAmt` | `12` |
| `ensembleDetune` | `15` |
| `vibRate` | `5` |
| `vibAmt` | `10` |
| `highpass` | `300` |
| `attack` | `1` |
| `decay` | `1` |
| `sustain` | `0.8` |
| `release` | `1.5` |

Factory presets:

- **Android Choir** — `{ vowelShift: 24, morphRate: 0.5, morphAmt: 12, ensembleDetune: 15, vibRate: 5.0, vibAmt: 10, highpass: 300, attack: 1.0, decay: 1.0, sustain: 0.8, release: 1.5 }`
- **Slow Morph Pad** — `{ vowelShift: 19, morphRate: 0.12, morphAmt: 24, ensembleDetune: 20, vibRate: 4.0, vibAmt: 8, highpass: 200, attack: 2.0, decay: 1.5, sustain: 0.85, release: 2.5 }`
- **Tight Ensemble** — `{ vowelShift: 12, morphRate: 0.8, morphAmt: 6, ensembleDetune: 6, vibRate: 6.5, vibAmt: 14, highpass: 400, attack: 0.3, decay: 0.5, sustain: 0.9, release: 0.8 }`

### `obSync` — OB Sync

Massive, creamy dual-oscillator hard sync synth with Oberheim-style width and a sweeping filter.

| Parameter | Default |
|---|---|
| `detune` | `15` |
| `sweepRate` | `0.5` |
| `sweepAmt` | `24` |
| `cutoff` | `1200` |
| `resonance` | `2` |
| `filterEnv` | `2400` |
| `filterDecay` | `0.8` |
| `attack` | `0.1` |
| `decay` | `0.4` |
| `sustain` | `0.6` |
| `release` | `0.5` |

Factory presets:

- **Oberheim Jump** — `{ detune: 18, sweepRate: 0.7, sweepAmt: 30, cutoff: 2000, resonance: 3, filterEnv: 3200, filterDecay: 0.5, attack: 0.04, decay: 0.3, sustain: 0.7, release: 0.3 }`
- **OB Pad** — `{ detune: 12, sweepRate: 0.2, sweepAmt: 12, cutoff: 800, resonance: 1.5, filterEnv: 1600, filterDecay: 1.2, attack: 0.6, decay: 0.8, sustain: 0.8, release: 1.5 }`

### `laserSync` — Laser Sync

Punchy, retro-arcade zap. A rapid pitch-dropping master oscillator ripping through a static sync slave.

| Parameter | Default |
|---|---|
| `dropRate` | `0.8` |
| `dropAmt` | `36` |
| `slaveBase` | `18` |
| `attack` | `0.01` |
| `decay` | `0.3` |

Factory presets:

- **Arcade Zap** — `{ dropRate: 0.9, dropAmt: 48, slaveBase: 24, attack: 0.005, decay: 0.15 }`
- **Laser Sweep** — `{ dropRate: 0.3, dropAmt: 24, slaveBase: 12, attack: 0.02, decay: 0.6 }`

## Analog & electronic

### `acid303` — Acid 303

Classic 303-style bassline with resonant filter and envMod sweep.

| Parameter | Default |
|---|---|
| `waveform` | `"sawtooth"` |
| `cutoff` | `800` |
| `resonance` | `15` |
| `envMod` | `4000` |
| `decay` | `0.4` |

Factory presets:

- **Classic Acid** — `{ waveform: "square", cutoff: 600, resonance: 18, envMod: 5000, decay: 0.35 }`
- **Acid Squelch** — `{ waveform: "sawtooth", cutoff: 400, resonance: 22, envMod: 6000, decay: 0.2 }`
- **Deep Acid** — `{ waveform: "sawtooth", cutoff: 500, resonance: 12, envMod: 3000, decay: 0.6 }`

### `sub808` — Sub 808

Heavy sine wave sub-bass with punch and drive saturation.

| Parameter | Default |
|---|---|
| `punch` | `60` |
| `decay` | `1.2` |
| `drive` | `0` |
| `glide` | `0.05` |

Factory presets:

- **808 Long Tail** — `{ punch: 48, decay: 2.5, drive: 0.15, glide: 0.08 }`
- **808 Distorted** — `{ punch: 72, decay: 1.0, drive: 0.6, glide: 0.03 }`

### `reeseBass` — Reese Bass

Thick, multi-oscillator detuned Supersaw bass with filter wobble.

| Parameter | Default |
|---|---|
| `voices` | `3` |
| `detune` | `30` |
| `cutoff` | `1500` |
| `wobble` | `0` |
| `decay` | `1` |

Factory presets:

- **DnB Reese** — `{ voices: 5, detune: 40, cutoff: 1200, wobble: 0.6, decay: 1.5 }`
- **Minimal Sub Reese** — `{ voices: 2, detune: 15, cutoff: 800, wobble: 0, decay: 1.2 }`

### `basicOsc` — Basic OSC

Single oscillator + ADSR in generator params.

| Parameter | Default |
|---|---|
| `waveform` | `"sine"` |
| `attack` | `0.005` |
| `decay` | `0.08` |
| `sustain` | `0.4` |
| `release` | `0.12` |

Factory presets:

- **Saw Lead** — `{ waveform: "sawtooth", attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.2 }`
- **Square Sub** — `{ waveform: "square", attack: 0.005, decay: 0.3, sustain: 0.8, release: 0.15 }`

### `fmTone` — FM tone

Two-operator FM + ADSR in generator params.

| Parameter | Default |
|---|---|
| `ratio` | `2` |
| `modIndex` | `4` |
| `carrierWave` | `"sine"` |
| `modWave` | `"sine"` |
| `attack` | `0.005` |
| `decay` | `0.08` |
| `sustain` | `0.4` |
| `release` | `0.12` |

Factory presets:

- **FM E-Piano** — `{ ratio: 1, modIndex: 3, carrierWave: "sine", modWave: "sine", attack: 0.003, decay: 0.8, sustain: 0.15, release: 0.4 }`
- **FM Brass** — `{ ratio: 1, modIndex: 6, carrierWave: "sine", modWave: "square", attack: 0.06, decay: 0.3, sustain: 0.7, release: 0.25 }`

### `matrixFm` — Matrix FM

Multi-operator FM/RM graph via deck gen_block (Sytrus-style).

### `patch` — Patch

Modular synth patch (gen_block patch): osc/noise/filter/shaper/gain + breakpoint envelopes — any voice, written in deck.

## Atmospheric

### `pad` — Pad

Detuned triple-osc + lowpass + slow env — ethereal, reverb-friendly.

| Parameter | Default |
|---|---|
| `wave1` | `"sine"` |
| `wave2` | `"triangle"` |
| `detune` | `9` |
| `cutoff` | `2200` |
| `attack` | `0.08` |
| `decay` | `0.25` |
| `sustain` | `0.6` |
| `release` | `0.7` |

Factory presets:

- **Warm Blanket** — `{ wave1: "triangle", wave2: "sine", detune: 14, cutoff: 1200, attack: 0.6, decay: 0.8, sustain: 0.75, release: 2.0 }`
- **Glass Shimmer** — `{ wave1: "sawtooth", wave2: "square", detune: 8, cutoff: 4000, attack: 0.3, decay: 0.4, sustain: 0.6, release: 1.2 }`

### `aether` — Aether

Theremin — eerie, voice-like heterodyne tone with a portamento swoop into each note, a living two-hand pitch/amplitude waver, and a breathy volume-hand swell.

| Parameter | Default |
|---|---|
| `glide` | `0.4` |
| `waver` | `0.5` |
| `tone` | `0.3` |
| `swell` | `0.45` |
| `air` | `0.25` |

Factory presets:

- **Classic Theremin** — `{ glide: 0.4, waver: 0.5, tone: 0.3, swell: 0.45, air: 0.25 }`
- **Sci-Fi Wail** — `{ glide: 0.7, waver: 0.8, tone: 0.5, swell: 0.6, air: 0.4 }`

### `halo` — Halo

Hang drum / handpan — lush inharmonic octave + compound-fifth shimmer triad over a long ethereal ring, with a soft fingertip strike and a warm 'gu' body.

| Parameter | Default |
|---|---|
| `temper` | `0.4` |
| `ring` | `0.55` |
| `mallet` | `0.35` |
| `bloom` | `0.5` |
| `lows` | `0.45` |

Factory presets:

- **Meditation Bowl** — `{ temper: 0.3, ring: 0.8, mallet: 0.2, bloom: 0.65, lows: 0.6 }`
- **Steel Tongue** — `{ temper: 0.55, ring: 0.35, mallet: 0.6, bloom: 0.3, lows: 0.35 }`

### `bell` — Bell

Inharmonic sine partials + highpass + bell decay — metallic shimmer.

| Parameter | Default |
|---|---|
| `partial` | `2.01` |
| `highpass` | `800` |
| `decay` | `1` |

Factory presets:

- **Crystal Chime** — `{ partial: 3.01, highpass: 1200, decay: 2.0 }`
- **Dark Bell** — `{ partial: 1.41, highpass: 400, decay: 1.8 }`

## Acoustic models

### `arco` — Arco

Bowed strings — violin · viola · cello · bass · fiddle. Stick-slip saw through real body-resonance formants, with bow pressure, articulation, vibrato and rosin noise. Only string-player controls.

| Parameter | Default |
|---|---|
| `voice` | `"violin"` |
| `pressure` | `0.5` |
| `bow` | `0.4` |
| `vibrato` | `0.35` |
| `rosin` | `0.3` |
| `body` | `0.6` |

Factory presets:

- **Solo Violin** — `{ voice: "violin", pressure: 0.55, bow: 0.45, vibrato: 0.4, rosin: 0.25, body: 0.65 }`
- **Cello Legato** — `{ voice: "cello", pressure: 0.6, bow: 0.5, vibrato: 0.5, rosin: 0.2, body: 0.75 }`
- **Country Fiddle** — `{ voice: "fiddle", pressure: 0.7, bow: 0.55, vibrato: 0.3, rosin: 0.55, body: 0.5 }`
- **Upright Bass** — `{ voice: "bass", pressure: 0.45, bow: 0.35, vibrato: 0.2, rosin: 0.15, body: 0.8 }`

### `tine` — Tine

Rhodes-style electric piano — velocity-barked FM tine (hard = metallic bark, soft = mellow bell), a metal tine ping, EP decay, and lush suitcase tremolo.

| Parameter | Default |
|---|---|
| `bark` | `0.55` |
| `tine` | `0.6` |
| `tremolo` | `0.35` |
| `decay` | `0.5` |
| `drive` | `0.2` |

Factory presets:

- **Suitcase Warm** — `{ bark: 0.35, tine: 0.4, tremolo: 0.6, decay: 0.65, drive: 0.15 }`
- **Stage Bright** — `{ bark: 0.7, tine: 0.75, tremolo: 0, decay: 0.45, drive: 0.3 }`
- **Neo Soul Keys** — `{ bark: 0.45, tine: 0.55, tremolo: 0.25, decay: 0.7, drive: 0.1 }`

### `guitar` — Guitar

Karplus-Strong plucked electric guitar — string model + palm mute + drive + body. Pairs with the chord voice for strums.

| Parameter | Default |
|---|---|
| `tone` | `0.5` |
| `decay` | `0.6` |
| `damping` | `0.4` |
| `drive` | `0.25` |
| `body` | `3500` |
| `mute` | `0` |

Factory presets:

- **Clean Electric** — `{ tone: 0.55, decay: 0.6, damping: 0.35, drive: 0.1, body: 3800, mute: 0 }`
- **Palm Mute Chug** — `{ tone: 0.35, decay: 0.3, damping: 0.55, drive: 0.45, body: 2800, mute: 0.7 }`
- **Nylon Acoustic** — `{ tone: 0.72, decay: 0.75, damping: 0.25, drive: 0, body: 4200, mute: 0 }`
- **Bass Guitar** — `{ tone: 0.28, decay: 0.55, damping: 0.6, drive: 0.15, body: 1800, mute: 0 }`

## Percussion

### `drumSynth` — Drum

Pitch-envelope drum synth — punchy kicks, snares, toms, 808s (+ noise + drive).

| Parameter | Default |
|---|---|
| `tone` | `"sine"` |
| `pitchEnv` | `36` |
| `pitchDecay` | `0.06` |
| `decay` | `0.35` |
| `noise` | `0` |
| `noiseDecay` | `0.12` |
| `noiseHp` | `1500` |
| `drive` | `0` |

Factory presets:

- **TR-909 Kick** — `{ tone: "sine", pitchEnv: 30, pitchDecay: 0.035, decay: 0.3, noise: 0.05, drive: 0.2 }`
- **Boom Bap Kick** — `{ tone: "sine", pitchEnv: 38, pitchDecay: 0.07, decay: 0.55, noise: 0, drive: 0.08 }`
- **Rim Shot** — `{ tone: "triangle", pitchEnv: 12, pitchDecay: 0.015, decay: 0.06, noise: 0.5, noiseHp: 3000, noiseDecay: 0.04, drive: 0.15 }`
- **Tom Low** — `{ tone: "sine", pitchEnv: 24, pitchDecay: 0.04, decay: 0.35, noise: 0.1, drive: 0.05 }`
- **Tom High** — `{ tone: "sine", pitchEnv: 18, pitchDecay: 0.03, decay: 0.25, noise: 0.12, drive: 0.05 }`

### `clap` — Clap

The Clap — handclap engine: hand count, timing spread, hand size, brightness, room tail, and clusters (single / double / many-hand crowd).

| Parameter | Default |
|---|---|
| `hands` | `3` |
| `spread` | `0.4` |
| `size` | `0.5` |
| `tone` | `0.5` |
| `claps` | `1` |
| `gap` | `0.35` |
| `tail` | `0.4` |
| `body` | `0.2` |

Factory presets:

- **Tight Clap** — `{ hands: 2, spread: 0.2, size: 0.3, tone: 0.6, claps: 1, gap: 0.2, tail: 0.25, body: 0.15 }`
- **Crowd Clap** — `{ hands: 8, spread: 0.7, size: 0.7, tone: 0.45, claps: 3, gap: 0.4, tail: 0.6, body: 0.35 }`

### `cymbal` — Cymbal

TR-808 style cymbal cluster (6 tuned squares + noise + highpass).

| Parameter | Default |
|---|---|
| `tune` | `300` |
| `metallic` | `0.8` |
| `decay` | `0.4` |
| `highpass` | `7000` |

Factory presets:

- **Ride Cymbal** — `{ tune: 340, metallic: 0.7, decay: 0.8, highpass: 6000 }`
- **Crash** — `{ tune: 280, metallic: 0.9, decay: 1.5, highpass: 5000 }`

### `noiseBurst` — Noise burst

Filtered noise; attack + decay shape the hit.

| Parameter | Default |
|---|---|
| `attack` | `0.002` |
| `decay` | `0.07` |
| `tone` | `0.45` |
| `pitchFollow` | `0.25` |

## Vocal

### `formantVocal` — Formant Vocal

Expressive formant synthesizer with gliding notes and vibrato.

| Parameter | Default |
|---|---|
| `glide` | `0.1` |
| `vibDepth` | `0.02` |
| `vibRate` | `5` |
| `humanize` | `0.5` |
| `release` | `0.2` |

### `ttsVocal` — TTS Vocal

Web Speech API Text-to-Speech engine for robotic vocal sequences.

| Parameter | Default |
|---|---|
| `voice` | `0` |
| `rate` | `1.5` |

### `meSpeakVocal` — meSpeak Vocal

Retro robotic TTS using meSpeak.js with sample-accurate timing.

| Parameter | Default |
|---|---|
| `pitch` | `50` |
| `speed` | `175` |
| `wordgap` | `0` |
| `variant` | `"m1"` |
| `amplitude` | `100` |

