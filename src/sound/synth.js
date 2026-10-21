/*
 * A tiny voice kit on a given AudioContext. Ported from site two's sound.js.
 *
 * Every voice takes (ctx, bus, …, t, opts) where
 *   bus = { out: AudioNode, echo?: AudioNode }   (dry destination + optional echo send)
 *   t   = seconds from now (scheduled against ctx.currentTime + t)
 * Voices create their own nodes and stop them when done; nothing to clean up.
 */

export const midiToHz = (n) => 440 * 2 ** ((n - 69) / 12)

const at = (ctx, t = 0) => ctx.currentTime + 0.01 + Math.max(0, t)
const dest = (bus) => bus.out ?? bus

/** One enveloped oscillator. The building block for everything pitched. */
export function tone(ctx, bus, hz, t, { dur = 0.5, gain = 0.2, attack = 0.005, type = 'sine', to = null, wet = 0.4 } = {}) {
  const s = at(ctx, t)
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(hz, s)
  if (to) o.frequency.exponentialRampToValueAtTime(to, s + dur)
  g.gain.setValueAtTime(0.0001, s)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), s + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, s + Math.max(dur, attack + 0.01))
  o.connect(g)
  g.connect(dest(bus))
  if (wet && bus.echo) {
    const w = ctx.createGain()
    w.gain.value = wet
    g.connect(w)
    w.connect(bus.echo)
  }
  o.start(s)
  o.stop(s + dur + 0.05)
  return o
}

/** Music-box / celesta: sine + 2.4× partial (and two faint upper ones), fast attack, long decay. */
export function bell(ctx, bus, hz, t, { dur = 1.6, gain = 0.2, wet = 0.55 } = {}) {
  ;[
    [1, 1],
    [2.4, 0.32],
    [3.01, 0.12],
    [4.18, 0.05],
  ].forEach(([mul, amp], i) => tone(ctx, bus, hz * mul, t, { dur: dur / (1 + i * 0.7), gain: gain * amp, attack: 0.004, wet }))
}

/** Harp-ish pluck: triangle body + a short octave shimmer. opts.to bends the pitch. */
export function pluck(ctx, bus, hz, t, { dur = 0.9, gain = 0.16, to = null, wet = 0.5 } = {}) {
  tone(ctx, bus, hz, t, { type: 'triangle', dur, gain, attack: 0.003, to, wet })
  tone(ctx, bus, hz * 2, t, { dur: dur * 0.4, gain: gain * 0.25, to: to ? to * 2 : null, wet: wet * 0.6 })
}

const noiseBufs = new WeakMap()
function noiseBuffer(ctx, kind = 'white') {
  const key = noiseBufs.get(ctx) ?? {}
  if (!key[kind]) {
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02
        d[i] = last * 3.5
      } else d[i] = w
    }
    key[kind] = buf
    noiseBufs.set(ctx, key)
  }
  return key[kind]
}

/** Looping noise source (white or brown), not started. */
export function noiseSource(ctx, kind = 'white') {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, kind)
  src.loop = true
  return src
}

/** Filtered noise burst. opts.to sweeps the filter; opts.attack is a fraction of dur. */
export function noise(ctx, bus, t, { dur = 0.3, filterHz = 2000, to = null, q = 0.8, gain = 0.1, type = 'bandpass', attack = 0.25, wet = 0 } = {}) {
  const s = at(ctx, t)
  const src = noiseSource(ctx)
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.setValueAtTime(filterHz, s)
  if (to) f.frequency.exponentialRampToValueAtTime(to, s + dur)
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, s)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), s + Math.max(0.002, dur * attack))
  g.gain.exponentialRampToValueAtTime(0.0001, s + dur)
  src.connect(f)
  f.connect(g)
  g.connect(dest(bus))
  if (wet && bus.echo) {
    const w = ctx.createGain()
    w.gain.value = wet
    g.connect(w)
    w.connect(bus.echo)
  }
  src.start(s, Math.random() * 1.5)
  src.stop(s + dur + 0.05)
}

/** A short woody/metallic click: a tiny highpassed noise tick plus a pitched blip. */
export function click(ctx, bus, t, { hz = 1800, gain = 0.2, dur = 0.03 } = {}) {
  noise(ctx, bus, t, { dur, filterHz: hz * 1.6, q: 1.2, gain: gain * 0.8, attack: 0.05 })
  tone(ctx, bus, hz, t, { dur: dur * 1.4, gain: gain * 0.5, attack: 0.001, to: hz * 0.6, wet: 0 })
}

/** Oscillator glide fromHz → toHz. opts.vibrato adds a wobble (Hz depth), opts.lowpass softens. */
export function sweep(ctx, bus, fromHz, toHz, t, { dur = 0.6, gain = 0.1, type = 'sine', vibrato = 0, rate = 6, lowpass = 0, attack = 0.05 } = {}) {
  const s = at(ctx, t)
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(fromHz, s)
  o.frequency.exponentialRampToValueAtTime(toHz, s + dur)
  let lfo = null
  if (vibrato) {
    lfo = ctx.createOscillator()
    const lg = ctx.createGain()
    lfo.frequency.value = rate
    lg.gain.value = vibrato
    lfo.connect(lg)
    lg.connect(o.frequency)
    lfo.start(s)
    lfo.stop(s + dur + 0.05)
  }
  g.gain.setValueAtTime(0.0001, s)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), s + Math.min(attack, dur / 2))
  g.gain.setValueAtTime(gain, s + dur * 0.7)
  g.gain.exponentialRampToValueAtTime(0.0001, s + dur)
  let node = o
  if (lowpass) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = lowpass
    o.connect(f)
    node = f
  }
  node.connect(g)
  g.connect(dest(bus))
  o.start(s)
  o.stop(s + dur + 0.05)
}
