// Pure timing math + the sequencer. No AudioContext involved — if this file needs one, something has
// leaked out of the pure layer.

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  secondsPerStep, sixteenthSeconds, swingOffsetSec, stepsToScheduleInWindow, underrunsInBatch,
  midiToHz, automationAt, parseSong, stepTriggers, songStepCount, normalizeDuty
} from '../dist/deck-player.js'

const DOCS_EXAMPLE = `deck 1
bpm 120

track Lead id lead gen gameBoyDmg
  gen type pulse duty 50 vol 12
  note 60 0 0.5 v 100
  note 64 0.5 0.5 v 90
  note 67 1 1 v 100

track Bass id bass gen gameBoyDmg
  gen type wave wave_shape saw vol 15
  note 36 0 2 v 110

track Kick id kick gen gbaDirectSound
  gen waveform triangle pitch_drop -12
  adsr a 0 d 0.1 s 0 r 0
  note 36 0 0.25 v 127
  note 36 1 0.25 v 127
`

test('secondsPerStep is a 16th note, clamped to 40..300 bpm', () => {
  assert.equal(secondsPerStep(120), 0.125)
  assert.equal(secondsPerStep(60), 0.25)
  assert.equal(sixteenthSeconds(120), 0.125)
  assert.equal(secondsPerStep(10), secondsPerStep(40), 'below 40 clamps up')
  assert.equal(secondsPerStep(9999), secondsPerStep(300), 'above 300 clamps down')
  assert.equal(secondsPerStep('nope'), 0.125, 'non-numeric falls back to 120')
})

test('swing delays odd steps only, and never past a half step', () => {
  const sp = 0.125
  assert.equal(swingOffsetSec(0, sp, 1), 0)
  assert.equal(swingOffsetSec(2, sp, 1), 0)
  assert.equal(swingOffsetSec(1, sp, 1), sp * 0.5)
  assert.equal(swingOffsetSec(3, sp, 0.5), sp * 0.25)
  assert.equal(swingOffsetSec(1, sp, 0), 0, 'swing 0 is straight')
  assert.equal(swingOffsetSec(1, sp, 5), sp * 0.5, 'swing clamps to 1')
})

test('lookahead batches every step inside the window and self-corrects', () => {
  // A 0.1s window at 0.125s/step reaches exactly one step: 1.125 is past the 1.1 horizon.
  const one = stepsToScheduleInWindow(0, 1.0, 1.0, 0.1, 0.125, 256)
  assert.deepEqual(one.items.map(i => i.step), [0])
  assert.equal(one.nextStep, 1)
  assert.equal(one.nextSec, 1.125)

  const two = stepsToScheduleInWindow(0, 1.0, 1.0, 0.2, 0.125, 256)
  assert.deepEqual(two.items.map(i => i.step), [0, 1])
  assert.deepEqual(two.items.map(i => i.when), [1.0, 1.125])
  assert.equal(two.nextStep, 2)
  assert.equal(two.nextSec, 1.25)

  // The cursor advances from the previous `when`, not from the wall clock, so drift can't accumulate.
  let sec = 0
  for (let i = 0; i < 1000; i++) sec = stepsToScheduleInWindow(i, sec, sec, 0.0001, 0.125, 1).nextSec
  assert.equal(sec, 125, '1000 steps of 0.125s land exactly on 125s')

  assert.equal(stepsToScheduleInWindow(0, 0, 0, 10, 0.125, 4).items.length, 4, 'maxBatch caps a burst')
  assert.equal(stepsToScheduleInWindow(0, 0, 0, 1, 0, 256).items.length, 0, 'a zero step size cannot loop forever')
})

test('underruns count steps already in the past', () => {
  const items = [{ when: 0.5 }, { when: 1.5 }, { when: 2.5 }]
  assert.equal(underrunsInBatch(items, 2.0), 2)
  assert.equal(underrunsInBatch(null, 2.0), 0)
})

test('midiToHz and linear automation', () => {
  assert.equal(midiToHz(69), 440)
  assert.equal(midiToHz(81), 880)
  const pts = [{ beat: 0, value: 0 }, { beat: 4, value: 1 }]
  assert.equal(automationAt(pts, 0), 0)
  assert.equal(automationAt(pts, 2), 0.5)
  assert.equal(automationAt(pts, 99), 1, 'past the last point holds')
  assert.equal(automationAt([], 1), 0)
})

test('duty normalizes the way the GBA bake does', () => {
  assert.equal(normalizeDuty('12_5'), '12_5')
  assert.equal(normalizeDuty(12.5), '12_5', 'numeric 12.5 stringifies to "12.5", not "12_5"')
  assert.equal(normalizeDuty('25'), '25')
  assert.equal(normalizeDuty(50), '50')
  assert.equal(normalizeDuty('75'), '75')
  // Anything unrecognised is 50%, matching duty_code() — not silence.
  assert.equal(normalizeDuty(12), '50')
  assert.equal(normalizeDuty('wat'), '50')
  assert.equal(normalizeDuty(null), '50')
})

test('the docs example sequences the notes it prints', () => {
  const song = parseSong(DOCS_EXAMPLE)
  assert.deepEqual(song.errors, [], 'the example must parse clean')
  assert.deepEqual(song.substitutions, [], 'both its generators are ported')
  assert.equal(song.bpm, 120)
  assert.equal(song.channels.length, 3)

  // Step 0 (beat 0): lead 60, bass 36, kick 36.
  const s0 = stepTriggers(song, 0)
  assert.deepEqual(s0.map(t => t.pitch).sort((a, b) => a - b), [36, 36, 60])
  assert.deepEqual(s0.map(t => t.vel).sort((a, b) => a - b), [100, 110, 127])

  // Step 2 (beat 0.5): lead 64 only.
  assert.deepEqual(stepTriggers(song, 2).map(t => t.pitch), [64])
  // Step 4 (beat 1): lead 67 and the second kick.
  assert.deepEqual(stepTriggers(song, 4).map(t => t.pitch).sort((a, b) => a - b), [36, 67])
  // Step 1 is empty.
  assert.deepEqual(stepTriggers(song, 1), [])

  // Durations are beats converted at this tempo: 0.5 beats at 120bpm = 0.25s.
  assert.equal(stepTriggers(song, 2)[0].durSec, 0.25)

  // A 1-bar pattern with no `loops` cap repeats forever.
  assert.equal(song.totalBeats, null)
  assert.equal(songStepCount(song), null)
  assert.deepEqual(stepTriggers(song, 16).map(t => t.pitch).sort((a, b) => a - b), [36, 36, 60],
    'bar 2 repeats bar 1')
})

test('steps, locks and euclid', () => {
  const song = parseSong(`deck 1
bpm 120
track Drum id d gen gameBoyDmg
  steps x . . . x . . . x . . . x . . .
  step_vel 120 . . . 60 . . . . . . . . . . .
  step_pitch 40
`)
  assert.deepEqual(song.errors, [])
  const ch = song.channels[0]
  assert.equal(ch.steps.length, 16)
  assert.deepEqual(ch.steps.map(s => s.on).map(Number), [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])
  assert.equal(ch.steps[0].vel, 120)
  assert.equal(ch.steps[4].vel, 60)
  assert.equal(ch.steps[8].vel, 100, 'unwritten steps keep the default of 100')
  assert.equal(ch.stepPitch, 40)

  assert.deepEqual(stepTriggers(song, 0).map(t => t.pitch), [40])
  assert.deepEqual(stepTriggers(song, 0).map(t => t.vel), [120])
  assert.deepEqual(stepTriggers(song, 1), [])
  assert.deepEqual(stepTriggers(song, 4).map(t => t.vel), [60])

  const euclid = parseSong(`deck 1
track E id e gen gameBoyDmg
  steps euclid 5 16
`)
  assert.equal(euclid.channels[0].steps.length, 16)
  assert.equal(euclid.channels[0].steps.filter(s => s.on).length, 5, 'euclid arrives already expanded')
})

test('notes win over steps, and transpose shifts only notes', () => {
  const song = parseSong(`deck 1
track T id t gen gameBoyDmg
  steps x x x x x x x x x x x x x x x x
  note 60 0 1 v 100
  transpose 12
`)
  assert.equal(song.channels[0].steps, null, 'a block with notes clears its steps')
  assert.equal(song.channels[0].pianoNotes[0].pitch, 72)
})

test('bar selectors expand onto matching bars at apply time', () => {
  const song = parseSong(`deck 1
track T id t gen gameBoyDmg * 4
  note 60 0 1 v 100 bar even
  note 67 2 1 v 90 bar 1
`)
  assert.deepEqual(song.errors, [])
  const notes = song.channels[0].pianoNotes
  // `even` = bars 0 and 2 of a 4-bar pattern.
  assert.deepEqual(notes.filter(n => n.pitch === 60).map(n => n.startBeat), [0, 8])
  // `bar 1` = the second bar only; beat 2 within it is absolute beat 6.
  assert.deepEqual(notes.filter(n => n.pitch === 67).map(n => n.startBeat), [6])

  assert.deepEqual(stepTriggers(song, 0).map(t => t.pitch), [60])
  assert.deepEqual(stepTriggers(song, 24).map(t => t.pitch), [67], 'step 24 = beat 6, the bar-1 note')
  assert.deepEqual(stepTriggers(song, 32).map(t => t.pitch), [60], 'step 32 = beat 8, bar 2 of `even`')
  assert.deepEqual(stepTriggers(song, 16), [], 'bar 1 beat 0 is silent — `even` skips it')
  assert.deepEqual(stepTriggers(song, 4), [], 'bar 0 beat 1 is silent')
})

test('probability is deterministic across runs and seeds', () => {
  const src = seed => `deck 1
song_seed ${seed}
track T id t gen gameBoyDmg
  steps x x x x x x x x x x x x x x x x
  step_prob 0.5 0.5 0.5 0.5 0.5 0.5 0.5 0.5 0.5 0.5 0.5 0.5 0.5 0.5 0.5 0.5
`
  const fire = (song, n) => Array.from({ length: n }, (_, i) => stepTriggers(song, i).length > 0)
  const a = fire(parseSong(src(1)), 32)
  const b = fire(parseSong(src(1)), 32)
  assert.deepEqual(a, b, 'the same seed must roll the same every time')
  const c = fire(parseSong(src(2)), 32)
  assert.notDeepEqual(a, c, 'a different seed must roll differently')
  const on = a.filter(Boolean).length
  assert.ok(on > 6 && on < 26, `p=0.5 over 32 steps should land near half, got ${on}`)
})

test('ratchet and nudge subdivide and shift a hit', () => {
  const song = parseSong(`deck 1
bpm 120
track T id t gen gameBoyDmg
  steps x . . . . . . . . . . . . . . .
  step_ratchet 4 . . . . . . . . . . . . . . .
  step_nudge 0.25 . . . . . . . . . . . . . . .
`)
  const trigs = stepTriggers(song, 0)
  assert.equal(trigs.length, 4, 'ratchet 4 = four sub-hits')
  const stepSec = 0.125
  // Each sub-hit is offset by a quarter step, and all four carry the same 0.25-step nudge.
  assert.deepEqual(trigs.map(t => Number((t.noteOffset - 0.25 * stepSec).toFixed(6))),
    [0, stepSec / 4, stepSec / 2, (stepSec / 4) * 3])
})

test('loops caps a channel, and an uncapped channel makes the song endless', () => {
  const song = parseSong(`deck 1
track T id t gen gameBoyDmg
  steps x x x x x x x x x x x x x x x x
  loops 2
`)
  assert.equal(song.channels[0].loopCap, 2)
  assert.equal(song.totalBeats, 8, '2 loops of a 1-bar pattern = 8 beats')
  assert.equal(songStepCount(song), 32)
  assert.equal(stepTriggers(song, 31).length, 1, 'last step of the cap still plays')
  assert.equal(stepTriggers(song, 32).length, 0, 'past the cap the channel is silent')

  const inf = parseSong(`deck 1
track T id t gen gameBoyDmg
  steps x x x x x x x x x x x x x x x x
  loops inf
`)
  assert.equal(inf.channels[0].loopCap, null)
  assert.equal(inf.totalBeats, null)
  assert.equal(stepTriggers(inf, 1000).length, 1)
})

test('mute and solo gate channels', () => {
  const song = parseSong(`deck 1
track A id a gen gameBoyDmg
  steps x x x x x x x x x x x x x x x x
track B id b gen gameBoyDmg
  mix gain 1 pan 0 mute 1
  steps x x x x x x x x x x x x x x x x
`)
  assert.equal(stepTriggers(song, 0).length, 1, 'the muted channel is silent')

  const soloed = parseSong(`deck 1
track A id a gen gameBoyDmg
  steps x x x x x x x x x x x x x x x x
track B id b gen gameBoyDmg
  mix gain 1 pan 0 solo 1
  steps x x x x x x x x x x x x x x x x
`)
  assert.equal(soloed.anySolo, true)
  const t = stepTriggers(soloed, 0)
  assert.equal(t.length, 1)
  assert.equal(t[0].busIndex, 1, 'only the soloed channel sounds')
})

test('scale lock snaps pitches', () => {
  const song = parseSong(`deck 1
scale C minor
track T id t gen gameBoyDmg
  note 61 0 1 v 100
`)
  assert.equal(song.scaleRoot, 0)
  assert.equal(song.scaleMode, 'minor')
  // C# is not in C minor; it snaps to a scale degree.
  const p = stepTriggers(song, 0)[0].pitch
  assert.notEqual(p, 61)
  assert.ok([60, 62].includes(p), `expected a neighbouring degree, got ${p}`)

  const off = parseSong(`deck 1
scale off
track T id t gen gameBoyDmg
  note 61 0 1 v 100
`)
  assert.equal(stepTriggers(off, 0)[0].pitch, 61, 'scale off leaves pitches alone')
})

test('voice chord expands one trigger into a stack', () => {
  const song = parseSong(`deck 1
track T id t gen gameBoyDmg
  voice chord major octave 1
  note 60 0 1 v 100
`)
  const trigs = stepTriggers(song, 0)
  assert.deepEqual(trigs.map(t => t.pitch), [60, 64, 67], 'a major triad')
  // `octave` is applied by the dispatcher at play time, not baked into the trigger.
  assert.equal(song.channels[0].octave, 1)
})
