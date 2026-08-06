// The Song IR: defaults, clamps, and the whole conformance corpus.
//
// The corpus at ../../conformance is the language package's cross-implementation PARSE contract. This
// package reads it as input — every case must survive the host layer without throwing and without
// inventing errors the parser didn't report. It must not add cases there: a new case forces every
// profile in profiles.json to declare its position. See AGENTS.md.

import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseSong, stepTriggers } from '../dist/deck-player.js'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..', '..', '..')
const conformanceDir = join(repo, 'conformance')

test('every conformance case survives the host layer', () => {
  const cases = readdirSync(conformanceDir).filter(f => f.endsWith('.deck')).sort()
  assert.ok(cases.length >= 12, `expected the corpus, found ${cases.length} files`)
  for (const f of cases) {
    const src = readFileSync(join(conformanceDir, f), 'utf8')
    const song = parseSong(src)
    assert.ok(song, `${f}: parseSong returned nothing`)
    assert.ok(Array.isArray(song.channels), `${f}: no channels array`)
    // 010 is the corpus's error case and is SUPPOSED to report errors; nothing else may.
    if (f.startsWith('010')) {
      assert.ok(song.errors.length > 0, `${f}: the error case should report errors`)
    } else {
      assert.deepEqual(song.errors, [], `${f}: clean input must not produce host errors`)
    }
    // Sequencing a few steps must not throw on any corpus input.
    for (const step of [0, 1, 7, 16, 63]) {
      assert.ok(Array.isArray(stepTriggers(song, step)), `${f}: step ${step} did not sequence`)
    }
  }
})

test('the GBA subset needs no substitutions', () => {
  // 012-gba-subset pins the gameBoyDmg / gbaDirectSound subset — the tier this package plays for real.
  const song = parseSong(readFileSync(join(conformanceDir, '012-gba-subset.deck'), 'utf8'))
  assert.deepEqual(song.errors, [])
  assert.deepEqual(song.substitutions, [], 'both chip generators must be ported')
  assert.ok(song.channels.length >= 1)
  for (const ch of song.channels) {
    assert.ok(['gameBoyDmg', 'gbaDirectSound'].includes(ch.generatorId))
  }
})

test('the golden fixture exercises the whole language without host errors', () => {
  const song = parseSong(readFileSync(join(repo, 'fixtures', 'golden.deck'), 'utf8'))
  assert.deepEqual(song.errors, [])
  assert.ok(song.channels.length > 0)
  // It uses features this package does not sequence yet; they are reported, not silently dropped.
  for (const k of ['clips', 'song', 'follow', 'auto']) {
    assert.ok(song.ignored.includes(k), `golden.deck uses ${k}; it should be reported as ignored`)
  }
})

test('defaults come from the grammar tables', () => {
  const song = parseSong(`deck 1
track T id t gen gameBoyDmg
  steps x . . . . . . . . . . . . . . .
`)
  const ch = song.channels[0]
  assert.equal(ch.steps[0].vel, 100, 'step_vel default')
  assert.equal(ch.steps[0].prob, 1, 'step_prob default')
  assert.equal(ch.steps[0].ratchet, 1, 'step_ratchet default')
  assert.equal(ch.steps[0].nudge, 0, 'step_nudge default')
  assert.equal(ch.stepPitch, 36, 'step_pitch default')
  assert.equal(ch.patternBars, 1, 'no `* N` is a one-bar pattern')
  assert.equal(ch.gain, 1)
  assert.equal(ch.pan, 0)
  assert.equal(song.bpm, 120, 'no bpm line')
  assert.equal(song.swing, 0)
})

test('out-of-range locks are clamped, not rejected', () => {
  const song = parseSong(`deck 1
track T id t gen gameBoyDmg
  steps x x x x . . . . . . . . . . . .
  step_vel 999 -5 100 100 . . . . . . . . . . . .
  step_prob 5 -1 0.5 1 . . . . . . . . . . . .
  step_ratchet 99 0 3 1 . . . . . . . . . . . .
  step_nudge 9 -9 0.1 0 . . . . . . . . . . . .
`)
  assert.deepEqual(song.errors, [], 'clamping is not an error')
  const s = song.channels[0].steps
  assert.deepEqual([s[0].vel, s[1].vel], [127, 1], 'velocity clamps to 1..127')
  assert.deepEqual([s[0].prob, s[1].prob], [1, 0], 'probability clamps to 0..1')
  assert.deepEqual([s[0].ratchet, s[1].ratchet], [8, 1], 'ratchet clamps to 1..8')
  assert.deepEqual([s[0].nudge, s[1].nudge], [0.5, -0.5], 'nudge clamps to ±0.5')
})

test('mix and fx values are clamped to sane ranges', () => {
  const song = parseSong(`deck 1
track T id t gen gameBoyDmg
  mix gain 99 pan -9 eq_lo 99 eq_hi -99
  fx reverb_send 9 cutoff 99999 res 999 drive 99
  note 60 0 1 v 100
`)
  const ch = song.channels[0]
  assert.equal(ch.gain, 2)
  assert.equal(ch.pan, -1)
  assert.equal(ch.eqLo, 24)
  assert.equal(ch.eqHi, -24)
  assert.equal(ch.reverbSend, 1)
  assert.equal(ch.cutoff, 20000)
  assert.equal(ch.res, 30)
  assert.equal(ch.drive, 10)
})

test('notes define the pattern length when they run past `* N`', () => {
  // The bake computes the span as max(every note end, bars*4), so a bare header with 8 bars of notes
  // is an 8-bar track — not 31 rejected notes. 10 of the 62 songs in the tish-gba corpus rely on it.
  const long = parseSong(`deck 1
track T id t gen gameBoyDmg
  note 60 0 1 v 100
  note 64 28 1 v 100
`)
  assert.deepEqual(long.errors, [])
  assert.equal(long.channels[0].pianoNotes.length, 2)
  assert.equal(long.channels[0].patternBars, 8, 'a note ending at beat 29 needs 8 bars')
  assert.deepEqual(stepTriggers(long, 112).map(t => t.pitch), [64], 'beat 28 = step 112')

  const over = parseSong(`deck 1
track T id t gen gameBoyDmg
  note 60 0 99 v 100
`)
  assert.deepEqual(over.errors, [])
  assert.equal(over.channels[0].pianoNotes[0].durBeats, 99, 'a long note keeps its duration')
  assert.equal(over.channels[0].patternBars, 25)

  const badBar = parseSong(`deck 1
track T id t gen gameBoyDmg * 4
  note 60 5 1 v 100 bar even
`)
  assert.equal(badBar.errors.length, 1, 'a bar-selected note must still fit inside its bar')
  assert.match(badBar.errors[0].msg, /must start before beat 4/)
})

test('`* N` replicates a bar-0-only pattern across N bars', () => {
  const song = parseSong(`deck 1
track T id t gen gameBoyDmg * 4
  note 60 0 1 v 100
  note 64 2 1 v 90
`)
  assert.deepEqual(song.errors, [])
  assert.equal(song.channels[0].patternBars, 4)
  assert.equal(song.channels[0].pianoNotes.length, 8, '2 notes × 4 bars')
  assert.deepEqual(stepTriggers(song, 0).map(t => t.pitch), [60])
  assert.deepEqual(stepTriggers(song, 16).map(t => t.pitch), [60], 'bar 1 repeats bar 0')
  assert.deepEqual(stepTriggers(song, 56).map(t => t.pitch), [64], 'bar 3, beat 2')

  // Not replicated when the notes already span more than one bar.
  const spans = parseSong(`deck 1
track T id t gen gameBoyDmg * 4
  note 60 0 1 v 100
  note 64 5 1 v 90
`)
  assert.equal(spans.channels[0].pianoNotes.length, 2)
})

test('the GBA host extensions: named wave tables and layer gating', () => {
  const song = parseSong(`deck 1
bpm 120
wave round 8acdefffffedba988765421000001235
track Bass id bass gen gameBoyDmg
  gen type wave wave_shape round
  note 36 0 1 v 100
track Extra id extra gen gameBoyDmg
  layer 3
  gen type pulse
  note 60 0 1 v 100
`)
  assert.deepEqual(song.errors, [], '`wave` and `layer` must parse, not report "unexpected top-level"')
  assert.deepEqual(Object.keys(song.waveTables), ['round'])
  assert.equal(song.waveTables.round.length, 32)
  // Nibble 8 is just above centre, nibble 0 is the floor, f is the ceiling.
  assert.ok(Math.abs(song.waveTables.round[0] - (8 / 7.5 - 1)) < 1e-9)
  assert.equal(Math.min(...song.waveTables.round), -1)
  assert.equal(Math.max(...song.waveTables.round), 1)

  assert.ok(song.channels[0].waveTable, 'wave_shape round binds the named table')
  assert.equal(song.channels[1].minIntensity, 3)

  // Everything plays at the default intensity of 3.
  assert.equal(song.intensity, 3)
  assert.equal(stepTriggers(song, 0).length, 2)
  song.intensity = 2
  assert.deepEqual(stepTriggers(song, 0).map(t => t.pitch), [36], 'the layer-3 stem drops out below 3')

  const bad = parseSong('deck 1\nwave short abc\n')
  assert.equal(bad.errors.length, 1)
  assert.match(bad.errors[0].msg, /32 hex digits/)
})

test('a malformed gen line is reported instead of merging junk params', () => {
  // `gen adsr attack 0 decay 0.1` pairs positionally, so `0` becomes a key. Silently merging that
  // leaves the envelope at its defaults and the author with no idea why.
  const song = parseSong(`deck 1
track T id t gen gbaDirectSound
  gen adsr attack 0 decay 0.1 sustain 0
  note 36 0 0.25 v 127
`)
  assert.equal(song.errors.length, 1)
  assert.match(song.errors[0].msg, /malformed `gen` line/)
  assert.equal(song.errors[0].line, 3)
  assert.equal(song.channels[0].generatorParams.decay, 2, 'the junk was not merged')

  // The correct spelling is the `adsr` body head.
  const ok = parseSong(`deck 1
track T id t gen gbaDirectSound
  adsr a 0 d 0.1 s 0 r 0
  note 36 0 0.25 v 127
`)
  assert.deepEqual(ok.errors, [])
  assert.equal(ok.channels[0].generatorParams.decay, 0.1)
  assert.equal(ok.channels[0].generatorParams.sustain, 0)
})

test('generator params layer: defaults, then header macro overrides, then gen rows', () => {
  const song = parseSong(`deck 1
track T id t gen gameBoyDmg vol 3
  gen duty 25
  note 60 0 1 v 100
`)
  const p = song.channels[0].generatorParams
  assert.equal(p.vol, 3, 'the track header overrides the default')
  assert.equal(p.duty, 25, 'a gen row is applied on top')
  assert.equal(p.envMode, 'step', 'untouched defaults survive')
})

test('remove_track drops a channel', () => {
  const song = parseSong(`deck 1
track A id a gen gameBoyDmg
  note 60 0 1 v 100
track B id b gen gameBoyDmg
  note 64 0 1 v 100
remove_track a
`)
  assert.equal(song.channels.length, 1)
  assert.equal(song.channels[0].id, 'b')
})

test('parse errors from the language package are passed through, not swallowed', () => {
  const song = parseSong('deck 1\nzzz nonsense\n')
  assert.ok(song.errors.length > 0)
  assert.equal(song.errors[0].line, 2)
})

test('an empty or comment-only program is a valid, silent song', () => {
  for (const src of ['', '# just a comment\n', 'deck 1\n']) {
    const song = parseSong(src)
    assert.deepEqual(song.channels, [])
    assert.deepEqual(stepTriggers(song, 0), [])
    assert.equal(song.bpm, 120)
  }
})
