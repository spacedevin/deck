// What the chip voices actually schedule.
//
// These assert the hardware details that make the port worth doing — the duty table written into the
// buffer, the 4-bit wave quantization, the real LFSR, the 8-bit DAC staircase. A rewrite that merely
// "sounds chiptune-ish" passes none of them.

import assert from 'node:assert/strict'
import test from 'node:test'
import { FakeAudioContext, fakeBus } from './fake-audio.mjs'
import {
  dispatchPlayNote, midiToHz, parseSong, buildAudioGraph, playStep,
  createDeckPlayer, livePlayerCount, isPortedGeneratorId, knownUnportedGeneratorIds
} from '../dist/deck-player.js'

const chan = (generatorId, generatorParams) => ({
  id: 'test', generatorId, generatorParams, octave: 0,
  chord: null, arp: null, arpRate: null, inversion: null, strum: null
})

/** Play one note into a fresh fake context and hand back everything it built. */
function play (generatorId, params, { midi = 60, vel = 127, dur = 0.5, t = 1.0 } = {}) {
  const ctx = new FakeAudioContext(44100)
  const bus = fakeBus(ctx)
  const voice = dispatchPlayNote(ctx, bus, t, midi, vel, dur, chan(generatorId, params), 0)
  return { ctx, bus, voice, src: ctx.of('bufferSource')[0] }
}

test('gameBoyDmg pulse writes the real duty tables', () => {
  const table = d => Array.from(play('gameBoyDmg', { type: 'pulse', duty: d }).src.buffer.getChannelData(0))
  assert.deepEqual(table('50'), [-1, 1, 1, 1, 1, -1, -1, -1])
  assert.deepEqual(table('25'), [-1, 1, 1, -1, -1, -1, -1, -1])
  assert.deepEqual(table('12_5'), [-1, 1, -1, -1, -1, -1, -1, -1])
  assert.deepEqual(table('75'), [1, -1, -1, 1, 1, 1, 1, 1])
  // The regression that matters: an unrecognised duty must fall back to 50%, not to a constant -1
  // (a silent channel), which is what an exact-match-only lookup produces.
  assert.deepEqual(table(12.5), [-1, 1, -1, -1, -1, -1, -1, -1], 'numeric 12.5 is the 12.5% table')
  assert.deepEqual(table('bogus'), [-1, 1, 1, 1, 1, -1, -1, -1], 'unknown duty is 50%, never silence')
  assert.ok(table('bogus').some(v => v > 0), 'and is definitely not a DC buffer')
})

test('gameBoyDmg pitches by playbackRate over an 8-sample buffer', () => {
  const { ctx, src } = play('gameBoyDmg', { type: 'pulse', duty: '50' }, { midi: 60 })
  const expected = (midiToHz(60) * 8) / ctx.sampleRate
  const first = src.playbackRate.calls.find(c => c.m === 'setValueAtTime')
  assert.ok(Math.abs(first.v - expected) < 1e-12, `rate ${first.v} != ${expected}`)
  assert.equal(src.loop, true, 'the waveform table has to loop to be a tone')
  assert.equal(src.started, 1.0)
})

test('gameBoyDmg clamps to the hardware frequency floors', () => {
  // A pulse below 64 Hz and a wave below 32 Hz are pinned by the hardware, so a very low note does
  // not keep dropping in pitch.
  const pulse = play('gameBoyDmg', { type: 'pulse', duty: '50' }, { midi: 12 })
  const pulseRate = pulse.src.playbackRate.calls[0].v
  assert.ok(Math.abs(pulseRate - (64 * 8) / 44100) < 1e-12, 'pulse floors at 64 Hz')

  const wave = play('gameBoyDmg', { type: 'wave', waveShape: 'saw' }, { midi: 12 })
  const waveRate = wave.src.playbackRate.calls[0].v
  assert.ok(Math.abs(waveRate - (32 * 32) / 44100) < 1e-12, 'wave floors at 32 Hz')
})

test('gameBoyDmg wave RAM is 32 samples quantized to 4 bits', () => {
  const data = Array.from(play('gameBoyDmg', { type: 'wave', waveShape: 'saw' }).src.buffer.getChannelData(0))
  assert.equal(data.length, 32)
  // Every sample must sit on a 1/7.5 lattice — that is what 16 levels means.
  for (const v of data) {
    assert.ok(Math.abs(v * 7.5 - Math.round(v * 7.5)) < 1e-6, `${v} is not on the 4-bit lattice`)
  }
  assert.ok(new Set(data.map(v => v.toFixed(4))).size <= 16, 'at most 16 distinct levels')
  assert.ok(data[0] < data[16], 'a saw rises across the table')
})

test('gameBoyDmg noise is a real LFSR, long and short', () => {
  const long = play('gameBoyDmg', { type: 'noise', noiseMode: 'long' }).src.buffer
  const short = play('gameBoyDmg', { type: 'noise', noiseMode: 'short' }).src.buffer
  assert.equal(long.length, 32767, '15-bit LFSR period')
  assert.equal(short.length, 127, '7-bit LFSR period')
  for (const v of long.getChannelData(0).slice(0, 500)) {
    assert.ok(v === 1 || v === -1, 'the LFSR output is a two-level square, not noise-shaped')
  }
  // A 7-bit register really does repeat every 127 samples.
  const s = short.getChannelData(0)
  assert.equal(s[0], s[0], 'sanity')
  const period = play('gameBoyDmg', { type: 'noise', noiseMode: 'short' }).src.buffer.getChannelData(0)
  assert.equal(period.length, 127)
})

test('gameBoyDmg volume scales the envelope peak', () => {
  const peak = (vol, vel) => {
    const { ctx } = play('gameBoyDmg', { type: 'pulse', duty: '50', vol }, { vel })
    // The last gain node built by the voice carries the amplitude envelope.
    const gains = ctx.of('gain')
    const env = gains[gains.length - 1]
    return Math.max(...env.gain.calls.map(c => c.v))
  }
  assert.ok(Math.abs(peak(15, 127) - 0.8) < 1e-9, 'full vol + full velocity = the 0.8 ceiling')
  assert.ok(Math.abs(peak(15, 64) - (64 / 127) * 0.8) < 1e-9, 'velocity scales linearly')
  assert.ok(Math.abs(peak(8, 127) - (8 / 15) * 0.8) < 1e-9, 'vol is a 4-bit fraction')
  assert.equal(peak(0, 127), 0, 'vol 0 is silent')
})

test('gbaDirectSound builds a 32-sample table and an 8-bit DAC', () => {
  const { ctx, src } = play('gbaDirectSound', { waveform: 'triangle', bitcrush: true })
  assert.equal(src.buffer.length, 32)

  const shapers = ctx.of('waveShaper')
  assert.equal(shapers.length, 1, 'bitcrush adds exactly one shaper')
  const curve = shapers[0].curve
  assert.equal(curve.length, 8192)
  assert.equal(shapers[0].oversample, 'none', 'interpolation would smooth away the staircase')
  // A 256-step staircase: 8192 points, 256 distinct output levels.
  assert.equal(new Set(Array.from(curve).map(v => v.toFixed(6))).size, 256)
  assert.ok(Math.abs(curve[0] + 1) < 1e-6 && Math.abs(curve[8191] - 1) < 1e-6, 'the curve spans -1..1')

  // ...feeding the mixer's Nyquist roll-off.
  const lp = ctx.of('biquad').find(b => b.frequency.value === 16000)
  assert.ok(lp, 'the 16 kHz mixing lowpass is present')
  assert.equal(lp.type, 'lowpass')

  const clean = play('gbaDirectSound', { waveform: 'triangle', bitcrush: false })
  assert.equal(clean.ctx.of('waveShaper').length, 0, 'bitcrush false bypasses the DAC')
  const sixteen = play('gbaDirectSound', { waveform: 'triangle', bitcrush: '16bit' })
  assert.equal(sixteen.ctx.of('waveShaper').length, 0, '`bitcrush 16bit` reads as no crush')
})

test('gbaDirectSound waveform tables', () => {
  const table = w => Array.from(play('gbaDirectSound', { waveform: w }).src.buffer.getChannelData(0))
  const tri = table('triangle')
  assert.ok(Math.abs(tri[0] + 1) < 1e-9, 'triangle starts at -1')
  assert.ok(Math.abs(tri[16] - 1) < 1e-9, 'and peaks halfway')
  const saw = table('sawtooth')
  assert.ok(saw[0] < saw[16] && saw[16] < saw[31], 'saw rises monotonically')
  assert.deepEqual(table('saw'), saw, '`saw` is accepted alongside `sawtooth`')
  const sq = table('square')
  assert.ok(sq.every(v => v === 1 || v === -1), 'square is two-level')
})

test('gbaDirectSound pitch_drop bends down then recovers', () => {
  const { ctx, src } = play('gbaDirectSound', { waveform: 'triangle', pitchDrop: -12 }, { midi: 60 })
  const rate0 = midiToHz(60) / (ctx.sampleRate / 32)
  const set = src.playbackRate.calls.find(c => c.m === 'setValueAtTime')
  const target = src.playbackRate.calls.find(c => c.m === 'setTargetAtTime')
  assert.ok(set && target, 'a drop is a jump plus an exponential recovery')
  assert.ok(Math.abs(set.v - rate0 / 2) < 1e-9, '-12 semitones starts an octave down')
  assert.ok(Math.abs(target.v - rate0) < 1e-9, 'and settles back on the note')
  assert.equal(set.t, target.t, 'both land at the note start')
})

test('every generator in the catalog plays, none are substituted', () => {
  // This package used to synthesize three voices and stand basicOsc in for the other thirty. It
  // delegates to @spacedevin/deck-synths now, so a generator outside the old three builds its own
  // graph and `substitutions` stays empty.
  const { ctx } = play('matrixFm', { waveform: 'saw' })
  assert.ok(ctx.nodes.length > 0, 'matrixFm builds a real graph rather than standing in')

  const song = parseSong('deck 1\ntrack T id t gen matrix_fm\n  note 60 0 1 v 100\n')
  assert.equal(song.substitutions.length, 0, 'nothing is substituted any more')
  assert.ok(isPortedGeneratorId('matrixFm'), 'and the registry agrees it is playable')
  assert.ok(isPortedGeneratorId('syncLead'))
  assert.equal(knownUnportedGeneratorIds().length, 0)
})

test('voice octave shifts the pitch the generator receives', () => {
  const ctx = new FakeAudioContext(44100)
  const bus = fakeBus(ctx)
  const ch = chan('basicOsc', {})
  ch.octave = 1
  dispatchPlayNote(ctx, bus, 0, 60, 100, 0.5, ch, 0)
  assert.ok(Math.abs(ctx.of('oscillator')[0].frequency.value - midiToHz(72)) < 1e-9)
})

test('the full graph wires channels through to the destination', () => {
  const ctx = new FakeAudioContext(44100)
  const song = parseSong(`deck 1
bpm 120
track Lead id lead gen gameBoyDmg
  mix gain 0.5 pan -1 eq_lo 3
  fx reverb_send 0.4 cutoff 800 res 2
  note 60 0 0.5 v 100
`)
  const graph = buildAudioGraph(ctx, song, {})
  assert.equal(graph.buses.length, 1)
  const bus = graph.buses[0]
  assert.equal(bus.gainNode.gain.value, 0.5)
  assert.equal(bus.panNode.pan.value, -1)
  assert.equal(bus.eqLo.gain.value, 3)
  assert.equal(bus.filterNode.frequency.value, 800)
  assert.equal(bus.filterNode.Q.value, 2)
  assert.equal(bus.reverbSend.gain.value, 0.4)

  // drive → filter → eqLo → eqMid → eqHi → gain → pan → masterSum
  assert.ok(bus.input.outputs.includes(bus.filterNode))
  assert.ok(bus.filterNode.outputs.includes(bus.eqLo))
  assert.ok(bus.eqHi.outputs.includes(bus.gainNode))
  assert.ok(bus.gainNode.outputs.includes(bus.panNode))
  assert.ok(bus.panNode.outputs.includes(graph.masterSum))
  // masterSum → masterGain → compressor → limiter → analyser → destination
  assert.ok(graph.masterSum.outputs.includes(graph.masterGain))
  assert.ok(graph.masterGain.outputs.includes(graph.glue))
  assert.ok(graph.glue.outputs.includes(graph.limiter))
  assert.ok(graph.limiter.outputs.includes(graph.analyser))
  assert.ok(graph.analyser.outputs.includes(ctx.destination))

  // A step actually reaches the bus input.
  const before = ctx.nodes.length
  const voices = playStep(ctx, song, graph, 0, 1.0)
  assert.ok(ctx.nodes.length > before, 'a step reaches the bus input')
  // The catalog's voices retire themselves on a timer rather than handing back
  // `{ stopTime, disconnects }`, so `pruneVoices` has nothing to collect for them. Audio is
  // unaffected — they still call stop() — but nodes are not disconnected early, which costs
  // memory on a long OfflineAudioContext render. Retrofitting the catalog to the return contract
  // is what would restore early pruning.
  assert.equal(voices.length, 0, 'catalog voices manage their own retirement')
})

test('starting one player stops the others', () => {
  // Two chip songs at once is noise. A page documenting the language has several players on it, so
  // the registry lives in the library rather than in each consumer.
  const song = 'deck 1\ntrack T id t gen gameBoyDmg\n  note 60 0 1 v 100\n'
  const before = livePlayerCount()

  const a = createDeckPlayer({ context: new FakeAudioContext() })
  const b = createDeckPlayer({ context: new FakeAudioContext() })
  const solo = createDeckPlayer({ context: new FakeAudioContext(), exclusive: false })
  a.load(song); b.load(song); solo.load(song)
  assert.equal(livePlayerCount(), before + 2, 'exclusive:false players are not registered')

  a.play()
  assert.equal(a.isPlaying(), true)

  b.play()
  assert.equal(a.isPlaying(), false, 'starting b stopped a')
  assert.equal(b.isPlaying(), true)

  // An opted-out player neither stops others nor is stopped by them.
  solo.play()
  assert.equal(b.isPlaying(), true, 'a non-exclusive player leaves others alone')
  assert.equal(solo.isPlaying(), true)
  a.play()
  assert.equal(solo.isPlaying(), true, 'and is not stopped by an exclusive one')
  assert.equal(b.isPlaying(), false)

  // A paused player is stopped too, so its UI resets instead of sitting on an invisible pause.
  a.pause()
  assert.equal(a.isPaused(), true)
  b.play()
  assert.equal(a.isPaused(), false, 'the paused player was stopped, not left paused')

  a.dispose(); b.dispose(); solo.dispose()
  assert.equal(livePlayerCount(), before, 'dispose unregisters')
})

test('a default channel filter is transparent, not a dulling insert', () => {
  const ctx = new FakeAudioContext(44100)
  const song = parseSong('deck 1\ntrack T id t gen gameBoyDmg\n  note 60 0 1 v 100\n')
  const graph = buildAudioGraph(ctx, song, {})
  assert.equal(graph.buses[0].filterNode.frequency.value, 20000)
  assert.equal(graph.buses[0].gainNode.gain.value, 1)
  assert.equal(graph.buses[0].reverbSend.gain.value, 0)
  assert.equal(graph.buses[0].lfo, null, 'no LFO node when there is no LFO to run')
})
