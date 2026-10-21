/*
 * Synthesized Web Audio engine (no audio files). Ported from site two's sound.js:
 * context + unlock, master → compressor, a soft feedback echo, and a separate music bus
 * (theme + ambient layers) so 'sfx' mode can mute music while keeping effects.
 *
 * Browsers only allow audio after a real gesture, so the context is created/resumed on the
 * first pointer/touch/click/key; theme and layers asked for before that start then.
 * Every call is a safe no-op when unsupported, muted, or given an unknown name.
 */
import { get, update } from '../state.js'
import { bell, click, midiToHz, noise, pluck, sweep, tone } from './synth.js'
import { LAYER_FNS, setRate } from './layers.js'
import { createPlayer, PARTS } from './theme.js'

const MODES = ['all', 'sfx', 'off']
const VOLUME = 0.9
const FADE = 0.3 // mode changes
const XFADE = 1.5 // theme part changes

let ctx = null
let gestured = false
let g = null // the graph: { master, music, sfx, musicBus }

/** Builds master/echo/music routing on any (offline) AudioContext. */
export function buildGraph(ac, m = mode()) {
  const master = ac.createGain()
  master.gain.value = m === 'off' ? 0 : VOLUME
  const comp = ac.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.ratio.value = 4
  master.connect(comp)
  comp.connect(ac.destination)
  // soft feedback echo: the dreamy tail on the bells
  const echo = ac.createGain()
  echo.gain.value = 0.3
  const delay = ac.createDelay(1)
  delay.delayTime.value = 0.26
  const damp = ac.createBiquadFilter()
  damp.type = 'lowpass'
  damp.frequency.value = 2400
  const fb = ac.createGain()
  fb.gain.value = 0.34
  echo.connect(delay)
  delay.connect(damp)
  damp.connect(fb)
  fb.connect(delay)
  damp.connect(master)
  // theme + layers get their own fader (muted unless mode is 'all')
  const music = ac.createGain()
  music.gain.value = m === 'all' ? 1 : 0
  music.connect(master)
  // music's echo send has its own fader too, so muted music leaves no tails
  const musicWet = ac.createGain()
  musicWet.gain.value = m === 'all' ? 1 : 0
  musicWet.connect(echo)
  return {
    master,
    music,
    musicWet,
    sfx: { out: master, echo },
    musicBus: { out: music, echo: musicWet },
  }
}

const PENTA = [72, 74, 76, 79, 81, 84, 86, 88] // C5 D5 E5 G5 A5 C6 D6 E6
const hz = midiToHz

/* ── effects: (ac, bus, opts) → void ── */
export const EFFECT_FNS = {
  // generic
  tap: (ac, b) => click(ac, b, 0, { hz: 2200, gain: 0.3, dur: 0.02 }),
  pop: (ac, b) => pluck(ac, b, hz(84), 0, { dur: 0.5, gain: 0.16 }),
  sparkle: (ac, b) => [84, 88, 91].forEach((n, i) => bell(ac, b, hz(n), i * 0.07, { dur: 1.1, gain: 0.09 })),
  whoosh: (ac, b) => noise(ac, b, 0, { dur: 0.6, filterHz: 500, to: 3600, q: 0.7, gain: 0.12, attack: 0.4 }),
  chime: (ac, b) => {
    bell(ac, b, hz(79), 0, { dur: 1.8, gain: 0.14 })
    bell(ac, b, hz(84), 0.12, { dur: 2, gain: 0.12 })
  },
  success: (ac, b) => [72, 76, 79, 84].forEach((n, i) => bell(ac, b, hz(n), i * 0.11, { dur: i === 3 ? 2.4 : 1.4, gain: 0.12 })),

  // door / chrome
  lockClick: (ac, b) => {
    click(ac, b, 0, { hz: 1400, gain: 0.3, dur: 0.03 })
    click(ac, b, 0.06, { hz: 900, gain: 0.34, dur: 0.04 })
  },
  creak: (ac, b) =>
    sweep(ac, b, 110, 140, 0, { dur: 1.3, gain: 0.09, type: 'sawtooth', vibrato: 6, rate: 11, lowpass: 900, attack: 0.25 }),
  lampOn: (ac, b) => {
    click(ac, b, 0, { hz: 2600, gain: 0.2, dur: 0.02 })
    tone(ac, b, 120, 0.02, { dur: 1.2, gain: 0.05, attack: 0.25, wet: 0 })
    tone(ac, b, 240, 0.02, { dur: 1, gain: 0.02, attack: 0.25, wet: 0, type: 'triangle' })
  },

  // living (rate is for the clock layer; the tick itself stays the same)
  tick: (ac, b) => click(ac, b, 0, { hz: 1800, gain: 0.28, dur: 0.025 }),

  // kitchen
  plop: (ac, b) => pluck(ac, b, 520, 0, { dur: 0.25, gain: 0.2, to: 180, wet: 0.2 }),
  splash: (ac, b) => noise(ac, b, 0, { dur: 0.45, filterHz: 2600, to: 1200, q: 0.9, gain: 0.14, attack: 0.08 }),
  bubble: (ac, b) => {
    for (let i = 0; i < 3; i++) {
      const f = 380 + Math.random() * 420
      pluck(ac, b, f, i * (0.06 + Math.random() * 0.06), { dur: 0.12, gain: 0.08, to: f * 2, wet: 0.2 })
    }
  },
  lidPop: (ac, b) => {
    noise(ac, b, 0, { dur: 0.09, filterHz: 1800, q: 0.6, gain: 0.25, attack: 0.05 })
    tone(ac, b, 300, 0, { dur: 0.12, gain: 0.15, to: 700, wet: 0 })
    bell(ac, b, hz(88), 0.08, { dur: 1.4, gain: 0.12 })
  },

  // garden
  seed: (ac, b) => {
    click(ac, b, 0, { hz: 700, gain: 0.3, dur: 0.04 })
    noise(ac, b, 0.02, { dur: 0.12, filterHz: 900, q: 0.5, gain: 0.05, type: 'lowpass' })
  },
  grow: (ac, b) => [72, 76, 79, 81, 84, 88].forEach((n, i) => bell(ac, b, hz(n), i * 0.09, { dur: 1.2, gain: 0.08 })),
  pour: (ac, b) => noise(ac, b, 0, { dur: 0.8, filterHz: 1500, q: 0.6, gain: 0.1, attack: 0.15 }),

  // rooftop: one pentatonic bell per connected star
  ting: (ac, b, o = {}) => {
    const i = Math.abs(Math.floor(Number(o.i) || 0)) % PENTA.length
    bell(ac, b, hz(PENTA[i]), 0, { dur: 1.8, gain: 0.13 })
  },

  // desk
  chain: (ac, b) => {
    click(ac, b, 0, { hz: 3200, gain: 0.16, dur: 0.02 })
    click(ac, b, 0.07, { hz: 2700, gain: 0.14, dur: 0.02 })
  },
  paper: (ac, b) => noise(ac, b, 0, { dur: 0.22, filterHz: 3000, to: 4500, q: 0.6, gain: 0.1 }),
  scratch: (ac, b) => noise(ac, b, 0, { dur: 0.06 + Math.random() * 0.04, filterHz: 3800 + Math.random() * 1500, q: 2.5, gain: 0.2, attack: 0.3 }),
  stamp: (ac, b) => {
    noise(ac, b, 0, { dur: 0.18, filterHz: 80, q: 0.7, gain: 0.6, type: 'lowpass', attack: 0.04 })
    tone(ac, b, 110, 0, { dur: 0.16, gain: 0.3, to: 55, wet: 0 })
    bell(ac, b, hz(81), 0.1, { dur: 1.6, gain: 0.12 })
  },

  // empty room
  roller: (ac, b) => noise(ac, b, 0, { dur: 0.4, filterHz: 700, q: 0.5, gain: 0.16, type: 'lowpass', attack: 0.3 }),
  marker: (ac, b) => {
    const f = 2400 + Math.random() * 900
    noise(ac, b, 0, { dur: 0.14, filterHz: f, to: f * 1.25, q: 9, gain: 0.3, attack: 0.3 })
  },

  // finale
  hang: (ac, b) => {
    tone(ac, b, 220, 0, { type: 'triangle', dur: 0.12, gain: 0.25, to: 140, wet: 0 })
    noise(ac, b, 0, { dur: 0.06, filterHz: 1200, q: 1, gain: 0.12 })
    bell(ac, b, hz(84), 0.08, { dur: 1.8, gain: 0.12 })
  },
  peel: (ac, b) => noise(ac, b, 0, { dur: 0.35, filterHz: 1500, to: 6000, q: 1.2, gain: 0.12, attack: 0.5 }),
  firework: (ac, b) => {
    noise(ac, b, 0, { dur: 0.6, filterHz: 900, to: 300, q: 0.5, gain: 0.22, type: 'lowpass', attack: 0.02 })
    noise(ac, b, 0.02, { dur: 0.9, filterHz: 5000, q: 0.5, gain: 0.04, type: 'highpass', attack: 0.1 })
    const n = PENTA[Math.floor(Math.random() * PENTA.length)]
    bell(ac, b, hz(n + 12), 0.1, { dur: 1.2, gain: 0.07 })
    bell(ac, b, hz(n + 7), 0.18, { dur: 1.2, gain: 0.06 })
  },

  // scenery reactions (ui/react.js): one sound per material
  knock: (ac, b) => {
    tone(ac, b, 190, 0, { type: 'triangle', dur: 0.09, gain: 0.3, to: 120, wet: 0.1 })
    noise(ac, b, 0, { dur: 0.05, filterHz: 900, q: 1.2, gain: 0.1 })
  },
  squish: (ac, b) => {
    noise(ac, b, 0, { dur: 0.22, filterHz: 400, to: 260, q: 0.7, gain: 0.14, type: 'lowpass', attack: 0.3 })
    tone(ac, b, 160, 0, { dur: 0.18, gain: 0.08, to: 110, wet: 0 })
  },
  drip: (ac, b) => pluck(ac, b, 1400, 0, { dur: 0.18, gain: 0.14, to: 2600, wet: 0.5 }),
  rustle: (ac, b) => {
    noise(ac, b, 0, { dur: 0.35, filterHz: 3200, to: 5200, q: 0.5, gain: 0.07, attack: 0.4 })
    noise(ac, b, 0.12, { dur: 0.25, filterHz: 2600, q: 0.6, gain: 0.05, attack: 0.3 })
  },
  slosh: (ac, b) => {
    noise(ac, b, 0, { dur: 0.5, filterHz: 500, to: 900, q: 0.9, gain: 0.14, type: 'lowpass', attack: 0.25 })
    pluck(ac, b, 300, 0.12, { dur: 0.2, gain: 0.06, to: 520, wet: 0.3 })
  },
  buzz: (ac, b) => tone(ac, b, 100, 0, { type: 'sawtooth', dur: 0.4, gain: 0.03, attack: 0.02, wet: 0 }),
  meow: (ac, b) => {
    sweep(ac, b, 520, 880, 0, { dur: 0.22, gain: 0.07, type: 'triangle', vibrato: 12, rate: 7, lowpass: 2400, attack: 0.1 })
    sweep(ac, b, 880, 460, 0.2, { dur: 0.42, gain: 0.07, type: 'triangle', vibrato: 18, rate: 6, lowpass: 2000, attack: 0.02 })
  },
  // a wooden xylophone bar on the pentatonic scale (opts.i) — fence pickets play tunes
  xylo: (ac, b, o = {}) => {
    const i = Math.abs(Math.floor(Number(o.i) || 0)) % PENTA.length
    pluck(ac, b, hz(PENTA[i] - 12), 0, { dur: 0.45, gain: 0.2, wet: 0.35 })
    tone(ac, b, hz(PENTA[i] + 7), 0, { dur: 0.08, gain: 0.04, wet: 0 })
  },
  spores: (ac, b) => [0, 0.05, 0.11].forEach((t, i) => pluck(ac, b, 2200 + i * 500, t, { dur: 0.12, gain: 0.04, wet: 0.6 })),
}

/* ── mode ── */
export const mode = () => (MODES.includes(get().sound) ? get().sound : 'all')

function ramp(param, value) {
  const t = ctx.currentTime
  param.cancelScheduledValues(t)
  param.setValueAtTime(param.value, t)
  param.linearRampToValueAtTime(value, t + FADE)
}
function applyMode() {
  if (!g) return
  const m = mode()
  ramp(g.master.gain, m === 'off' ? 0 : VOLUME)
  ramp(g.music.gain, m === 'all' ? 1 : 0)
  ramp(g.musicWet.gain, m === 'all' ? 1 : 0)
}

export function cycleMode() {
  const next = MODES[(MODES.indexOf(mode()) + 1) % MODES.length]
  update({ sound: next })
  applyMode()
  return next
}

/* ── context + unlock ── */
const running = () => !!ctx && ctx.state === 'running'

function init() {
  if (ctx) return true
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) return false
  try {
    ctx = new AC()
  } catch {
    return false
  }
  g = buildGraph(ctx)
  ctx.onstatechange = () => {
    if (running()) wake()
  }
  return true
}

export function unlock() {
  if (!init()) return
  if (ctx.state !== 'running') {
    ctx.resume().then(wake, () => {})
    // iOS: a silent one-sample buffer inside the gesture unlocks the output
    try {
      const src = ctx.createBufferSource()
      src.buffer = ctx.createBuffer(1, 1, 22050)
      src.connect(ctx.destination)
      src.start(0)
    } catch {
      /* ignore */
    }
  } else wake()
}

if (typeof window !== 'undefined') {
  // Create the (suspended) context while the page is idle, so the first tap only has to
  // resume() it — constructing an AudioContext inside the tap stalled it for ~0.5 s.
  const warm = () => init()
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 1500 })
  else setTimeout(warm, 300)
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
    window.addEventListener(type, unlock, { capture: true, passive: true })
  }
  // don't play to an empty room
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) ctx.suspend().catch(() => {})
    else if (gestured) ctx.resume().catch(() => {})
  })
}

/** Context became usable: start whatever was asked for before. */
function wake() {
  if (!running()) return
  gestured = true
  if (want && !player) startTheme(want)
  for (const rec of layers) if (!rec.stop) startLayer(rec)
}

/* ── effects ── */
export function play(name, opts) {
  const fn = EFFECT_FNS[name]
  if (!fn || mode() === 'off' || !running()) return
  try {
    if (name === 'tick' && opts && opts.rate != null) setRate(opts.rate)
    fn(ctx, g.sfx, opts ?? {})
  } catch {
    /* a sound must never break the page */
  }
}

/* ── layers ── */
const layers = new Set()
function startLayer(rec) {
  try {
    rec.stop = LAYER_FNS[rec.name](ctx, g.musicBus, {})
    if (rec.rate != null) rec.stop.setRate?.(rec.rate)
  } catch {
    rec.stop = () => {}
  }
}

export function layer(name) {
  if (!LAYER_FNS[name]) {
    const noop = () => {}
    noop.setRate = () => {}
    return noop
  }
  const rec = { name, stop: null, rate: null }
  layers.add(rec)
  if (running()) startLayer(rec)
  const stop = () => {
    if (!layers.has(rec)) return
    layers.delete(rec)
    try {
      rec.stop?.()
    } catch {
      /* ignore */
    }
  }
  // clock only: 0..1 → 1 to 12 ticks a second
  stop.setRate = (r) => {
    rec.rate = r
    rec.stop?.setRate?.(r)
  }
  return stop
}

/* ── theme ── */
let want = null // 'verse' | 'chorus' | null
let player = null

function startTheme(part) {
  player?.stop(XFADE)
  player = createPlayer(ctx, g.music, part, { fadeIn: XFADE, echo: g.musicBus.echo, audible: () => mode() === 'all' })
}

export function theme(part) {
  const next = PARTS[part] ? part : null
  if (next === want) return
  want = next
  if (!running()) {
    if (!next && player) {
      player.stop(0)
      player = null
    }
    return
  }
  if (next) startTheme(next)
  else {
    player?.stop(XFADE)
    player = null
  }
}

/* ── test hook: render a sound offline and measure it ── */
/**
 * Renders an effect, layer or theme part into an OfflineAudioContext and returns
 * { peak, rms } of the result. Used by the e2e "sounds sane" check.
 *   _renderOffline({ effect: 'chime' }) · ({ layer: 'wind', seconds: 3 }) · ({ part: 'verse', seconds: 8 })
 */
export async function _renderOffline({ effect, opts, layer: layerName, part, seconds = 2, sampleRate = 22050 } = {}) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext
  const off = new OAC(2, Math.ceil(seconds * sampleRate), sampleRate)
  const graph = buildGraph(off, 'all')
  let stop = () => {}
  if (effect) EFFECT_FNS[effect](off, graph.sfx, opts ?? {})
  if (layerName) stop = LAYER_FNS[layerName](off, graph.musicBus, { lookahead: seconds })
  if (part) {
    const p = createPlayer(off, graph.music, part, { lookahead: seconds, echo: graph.musicBus.echo })
    stop = () => p.stop(0)
  }
  const buf = await off.startRendering()
  stop()
  let peak = 0
  let sum = 0
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i])
      if (v > peak) peak = v
      sum += v * v
    }
  }
  return { peak, rms: Math.sqrt(sum / (buf.length * buf.numberOfChannels)) }
}

/** Test/debug: the live context state ('none' before unlock). */
export const _state = () => (ctx ? ctx.state : 'none')
