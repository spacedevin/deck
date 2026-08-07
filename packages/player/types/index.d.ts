// Hand-written: the source is Tish, and `tish build --target js` emits plain ESM with no
// declarations. @spacedevin/deck ships none either, so these are the only types in the chain.

/** One `note` after bar-selector expansion — always at an absolute beat. */
export interface DeckNote {
  pitch: number
  startBeat: number
  durBeats: number
  /** 1..127 */
  vel: number
  /** 0..1 */
  prob: number
  /** 1..8 */
  ratchet: number
  /** -0.5..0.5, a fraction of a 16th step */
  nudge: number
  lyric: string | null
}

/** One 16th step, with its locks resolved to concrete values. */
export interface DeckStep {
  on: boolean
  vel: number
  prob: number
  ratchet: number
  nudge: number
  lyric: string | null
}

export interface DeckChannel {
  index: number
  id: string
  name: string
  generatorId: string
  generatorParams: Record<string, number | string | boolean | null>
  /** The last `gen_block` on the track, unparsed (`{ generatorId, lines }`). */
  generatorSpec: { generatorId: string, lines: string[] } | null
  /** 32 samples in -1..1 from a named `wave` table, when this channel's `wave_shape` names one. */
  waveTable: number[] | null
  /** From `layer` / `intensity`: this channel is silent below this level. */
  minIntensity: number
  /** Looping span in bars: the longer of `* N` and what the notes need. */
  patternBars: number
  /** `loops N`; null means it never stops. */
  loopCap: number | null
  pianoNotes: DeckNote[]
  /** null when the channel has notes — notes win over steps. */
  steps: DeckStep[] | null
  stepPitch: number
  stepPitchByBar: number[] | null
  transpose: number
  gain: number
  pan: number
  mute: boolean
  solo: boolean
  eqLo: number
  eqMid: number
  eqHi: number
  reverbSend: number
  drive: number
  lfoRate: number
  lfoDepth: number
  cutoff: number
  res: number
  filterType: BiquadFilterType
  octave: number
  arp: string | null
  arpRate: string | null
  chord: string | null
  inversion: string | null
  strum: number | null
}

export interface DeckError {
  line: number
  msg: string
}

/** A generator the source asked for that this package substituted `basicOsc` for. */
export interface DeckSubstitution {
  trackId: string
  generatorId: string
  reason: string
}

export interface DeckSong {
  version: number
  bpm: number
  swing: number
  songSeed: number
  scaleRoot: number | null
  scaleMode: string | null
  channels: DeckChannel[]
  anySolo: boolean
  waveTables: Record<string, number[]>
  /** Stem gating, 0..3. Everything plays at 3. */
  intensity: number
  /** The longest channel pattern, in beats. */
  loopBeats: number
  /** Total length in beats, or null when a channel loops forever. */
  totalBeats: number | null
  substitutions: DeckSubstitution[]
  /** Language features present in the source that this package does not sequence yet. */
  ignored: string[]
  errors: DeckError[]
}

export interface DeckTrigger {
  busIndex: number
  pitch: number
  vel: number
  durSec: number
  beat: number
  /** Seconds after the step, from nudge / ratchet / chord strum. */
  noteOffset: number
  lyric: string | null
}

export interface DeckPlayerOptions {
  /**
   * Reuse an existing context. Without one the player uses a single page-shared AudioContext,
   * created on the first `play()` — a context is a page-level resource, and Safari has historically
   * refused past about four.
   */
  context?: AudioContext
  /** Master gain, default 0.9. */
  gain?: number
  /** false to skip the convolution reverb bus. */
  reverb?: boolean
  /** Keep looping past the song's end. Default true. */
  loop?: boolean
  /**
   * Starting this player stops any other one that is playing. Default true — two chip songs at once
   * is noise. Pass false to layer players deliberately.
   */
  exclusive?: boolean
}

export type DeckPlayerEvent = 'step' | 'stop' | 'load' | 'error'

export interface DeckPlayer {
  /** Parse and prepare. Returns the Song so you can surface `errors` / `substitutions`. */
  load (source: string): DeckSong | null
  play (): void
  pause (): void
  stop (): void
  seek (beat: number): void
  isPlaying (): boolean
  isPaused (): boolean
  /** The beat currently being heard, not the one being scheduled. */
  position (): number
  /** Length in beats, or null when the song loops forever. */
  duration (): number | null
  song (): DeckSong | null
  /** Stem gating, 0..3. */
  setIntensity (level: number): void
  intensity (): number
  analyser (): AnalyserNode | null
  context (): AudioContext | null
  on (event: DeckPlayerEvent, handler: (payload: any) => void): void
  dispose (): void
}

export function createDeckPlayer (opts?: DeckPlayerOptions): DeckPlayer

/** How many exclusive players are currently registered. For tests and debugging. */
export function livePlayerCount (): number

export interface RenderOptions {
  sampleRate?: number
  /** Length to render. Defaults to the song's own length, else one loop. */
  beats?: number
  gain?: number
  reverb?: boolean
}

/** Render offline through the same graph and sequencer as live playback. */
export function renderDeckToBuffer (source: string, opts?: RenderOptions): Promise<AudioBuffer>

/** `.deck` source → Song IR. No AudioContext needed. */
export function parseSong (source: string): DeckSong

/** Register this package's host vocabulary with @spacedevin/deck. Idempotent; `parseSong` calls it. */
export function bootDeckRegistries (): void

/** Which notes sound at a 16th step. Pure. */
export function stepTriggers (song: DeckSong, globalStep: number): DeckTrigger[]
export function songStepCount (song: DeckSong): number | null

export function secondsPerStep (bpm: number): number
export function sixteenthSeconds (bpm: number): number
export function swingOffsetSec (step: number, secPerStep: number, swing: number): number
export function stepsToScheduleInWindow (
  startStep: number, nextStepSec: number, ctxNow: number,
  lookahead: number, secPerStep: number, maxBatch?: number
): { items: Array<{ step: number, when: number }>, nextStep: number, nextSec: number }
export function underrunsInBatch (items: Array<{ when: number }> | null, ctxNow: number): number
export function midiToHz (midi: number): number
export function automationAt (points: Array<{ beat: number, value: number }>, beat: number): number

export function portedGeneratorIds (): string[]
export function knownUnportedGeneratorIds (): string[]
export function isPortedGeneratorId (id: string): boolean
export function defaultParamsForGeneratorId (id: string): Record<string, unknown>
export function normalizeDuty (raw: unknown): '12_5' | '25' | '50' | '75'

export function snapToScale (pitch: number, root: number | null, mode: string | null): number
export function songSnapPitch (song: DeckSong, pitch: number): number
export function expandTriggerNotes (
  ch: DeckChannel, basePitch: number, durSec: number, bpm: number
): Array<{ pitch: number, offset: number, dur: number }>

/** What a voice built, so the caller can retire it. */
export interface DeckVoice {
  stopTime: number
  disconnects: AudioNode[]
}

export interface DeckChannelBus {
  chId: string
  input: AudioNode
  gainNode: GainNode
  panNode: StereoPannerNode
  filterNode: BiquadFilterNode
  eqLo: BiquadFilterNode
  eqMid: BiquadFilterNode
  eqHi: BiquadFilterNode
  reverbSend: GainNode
  driveNode: WaveShaperNode
  lfo: OscillatorNode | null
  lfoGain: GainNode | null
}

export interface DeckAudioGraph {
  buses: DeckChannelBus[]
  masterSum: GainNode
  masterGain: GainNode
  glue: DynamicsCompressorNode
  limiter: WaveShaperNode
  analyser: AnalyserNode | null
  convolver: ConvolverNode | null
  reverbIn: GainNode | null
}

export function buildAudioGraph (
  ctx: BaseAudioContext, song: DeckSong, opts?: { gain?: number, reverb?: boolean }
): DeckAudioGraph
export function disposeAudioGraph (graph: DeckAudioGraph): void
export function playStep (
  ctx: BaseAudioContext, song: DeckSong, graph: DeckAudioGraph, globalStep: number, tWhen: number
): DeckVoice[]
export function dispatchPlayNote (
  ctx: BaseAudioContext, bus: DeckChannelBus, t: number, midi: number, vel: number,
  durSec: number, ch: DeckChannel, bendSemis: number
): DeckVoice | null

export interface DeckTransportConfig {
  secPerStep (): number
  swing? (): number
  /** Return true to stop after this step. */
  onStep (step: number, when: number): boolean
  onStopped? (): void
}

export interface DeckTransport {
  start (startStep?: number): void
  pause (): void
  resume (): void
  stop (): void
  isActive (): boolean
  isPaused (): boolean
  getStep (): number
  underruns (): number
  audibleStep (): number
  dispose (): void
}

export function createTransport (ctx: AudioContext, cfg: DeckTransportConfig): DeckTransport
