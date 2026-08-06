// A recording stand-in for AudioContext.
//
// The voices are the part of this package most worth testing and the part hardest to test: their
// whole output is a schedule of AudioParam automation, which a real browser turns into sound and
// throws away. So instead of rendering audio and analysing it, we record every node created and every
// automation call, and assert on the schedule itself — the duty table actually written into the
// buffer, the exact playbackRate for a MIDI note, the shape of a pitch drop.
//
// Every node also records its `connect` targets, so a test can walk the graph.

let nextId = 1

class FakeParam {
  constructor (node, name, value = 0) {
    this.node = node
    this.name = name
    this.value = value
    this.calls = []
  }
  setValueAtTime (v, t) { this.calls.push({ m: 'setValueAtTime', v, t }); return this }
  linearRampToValueAtTime (v, t) { this.calls.push({ m: 'linearRampToValueAtTime', v, t }); return this }
  exponentialRampToValueAtTime (v, t) { this.calls.push({ m: 'exponentialRampToValueAtTime', v, t }); return this }
  setTargetAtTime (v, t, tc) { this.calls.push({ m: 'setTargetAtTime', v, t, tc }); return this }
  cancelScheduledValues (t) { this.calls.push({ m: 'cancelScheduledValues', t }); return this }
  /** Times at which this param was given `v`, in call order. */
  timesFor (v) { return this.calls.filter(c => c.v === v).map(c => c.t) }
}

class FakeNode {
  constructor (ctx, kind) {
    this.ctx = ctx
    this.kind = kind
    this.id = nextId++
    this.outputs = []
    this.disconnected = false
    ctx.nodes.push(this)
  }
  connect (dst) { this.outputs.push(dst); return dst }
  disconnect () { this.disconnected = true }
}

class FakeBufferSource extends FakeNode {
  constructor (ctx) {
    super(ctx, 'bufferSource')
    this.buffer = null
    this.loop = false
    this.playbackRate = new FakeParam(this, 'playbackRate', 1)
    this.started = null
    this.stopped = null
  }
  start (t) { this.started = t }
  stop (t) { this.stopped = t }
}

class FakeOscillator extends FakeNode {
  constructor (ctx) {
    super(ctx, 'oscillator')
    this.type = 'sine'
    this.frequency = new FakeParam(this, 'frequency', 440)
    this.detune = new FakeParam(this, 'detune', 0)
    this.started = null
    this.stopped = null
  }
  start (t) { this.started = t === undefined ? 0 : t }
  stop (t) { this.stopped = t }
}

class FakeGain extends FakeNode {
  constructor (ctx) { super(ctx, 'gain'); this.gain = new FakeParam(this, 'gain', 1) }
}

class FakeBiquad extends FakeNode {
  constructor (ctx) {
    super(ctx, 'biquad')
    this.type = 'lowpass'
    this.frequency = new FakeParam(this, 'frequency', 350)
    this.Q = new FakeParam(this, 'Q', 1)
    this.gain = new FakeParam(this, 'gain', 0)
  }
}

class FakeWaveShaper extends FakeNode {
  constructor (ctx) { super(ctx, 'waveShaper'); this.curve = null; this.oversample = 'none' }
}

class FakePanner extends FakeNode {
  constructor (ctx) { super(ctx, 'panner'); this.pan = new FakeParam(this, 'pan', 0) }
}

class FakeConvolver extends FakeNode {
  constructor (ctx) { super(ctx, 'convolver'); this.buffer = null }
}

class FakeCompressor extends FakeNode {
  constructor (ctx) {
    super(ctx, 'compressor')
    this.threshold = new FakeParam(this, 'threshold', -24)
    this.knee = new FakeParam(this, 'knee', 30)
    this.ratio = new FakeParam(this, 'ratio', 12)
    this.attack = new FakeParam(this, 'attack', 0.003)
    this.release = new FakeParam(this, 'release', 0.25)
  }
}

class FakeAnalyser extends FakeNode {
  constructor (ctx) { super(ctx, 'analyser'); this.fftSize = 2048 }
}

class FakeBuffer {
  constructor (channels, length, sampleRate) {
    this.numberOfChannels = channels
    this.length = length
    this.sampleRate = sampleRate
    this._data = []
    for (let i = 0; i < channels; i++) this._data.push(new Float32Array(length))
  }
  getChannelData (i) { return this._data[i] }
}

export class FakeAudioContext {
  constructor (sampleRate = 44100) {
    this.sampleRate = sampleRate
    this.currentTime = 0
    this.state = 'running'
    this.nodes = []
    this.destination = new FakeNode(this, 'destination')
    // Deliberately absent: `audioWorklet`. The transport must fall back to its timer without one.
  }
  createBuffer (c, l, sr) { return new FakeBuffer(c, l, sr) }
  createBufferSource () { return new FakeBufferSource(this) }
  createOscillator () { return new FakeOscillator(this) }
  createGain () { return new FakeGain(this) }
  createBiquadFilter () { return new FakeBiquad(this) }
  createWaveShaper () { return new FakeWaveShaper(this) }
  createStereoPanner () { return new FakePanner(this) }
  createConvolver () { return new FakeConvolver(this) }
  createDynamicsCompressor () { return new FakeCompressor(this) }
  createAnalyser () { return new FakeAnalyser(this) }
  resume () { this.state = 'running'; return Promise.resolve() }
  suspend () { this.state = 'suspended'; return Promise.resolve() }
  close () { this.state = 'closed'; return Promise.resolve() }

  /** Nodes of one kind, in creation order. */
  of (kind) { return this.nodes.filter(n => n.kind === kind) }
}

/** A minimal channel bus for driving a voice in isolation. */
export function fakeBus (ctx) {
  const input = ctx.createGain()
  return { input, chId: 'test' }
}
