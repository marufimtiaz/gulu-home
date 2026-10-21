/*
 * Ambient layers: each is (ctx, bus, opts) → stop(). bus = { out, echo } (the engine passes
 * the music bus, so 'sfx' / 'off' modes mute them). Scheduled ones look ahead on a timer;
 * opts.lookahead lets an offline render schedule its whole window up front.
 */
import { click, noiseSource, pluck, sweep, tone } from './synth.js'

const rand = (a, b) => a + Math.random() * (b - a)

/** Calls schedule(time) for each event, spacing them by next() seconds. */
function scheduler(ctx, schedule, next, { lookahead = 0.25, every = 60, delay = 0.05 } = {}) {
  let at = ctx.currentTime + delay
  const tick = () => {
    if (at < ctx.currentTime - 0.3) at = ctx.currentTime + 0.02 // resumed after a pause
    while (at < ctx.currentTime + lookahead) {
      schedule(Math.max(0, at - ctx.currentTime - 0.01))
      at += next()
    }
  }
  tick()
  const timer = setInterval(tick, every)
  return () => clearInterval(timer)
}

/** A fader for the layer: fades in on start, fades out and disconnects on stop. */
function fader(ctx, bus, { fadeIn = 0.6 } = {}) {
  const g = ctx.createGain()
  const wet = ctx.createGain() // echo send, faded together with the layer
  const params = [g.gain, wet.gain]
  const t = ctx.currentTime
  for (const p of params) {
    p.setValueAtTime(0.0001, t)
    p.linearRampToValueAtTime(1, t + fadeIn)
  }
  g.connect(bus.out)
  if (bus.echo) wet.connect(bus.echo)
  return {
    bus: { out: g, echo: bus.echo ? wet : null },
    stop(onDone, fade = 0.4) {
      const n = ctx.currentTime
      for (const p of params) {
        p.cancelScheduledValues(n)
        p.setValueAtTime(p.value, n)
        p.linearRampToValueAtTime(0, n + fade)
      }
      setTimeout(() => {
        onDone?.()
        g.disconnect()
        wet.disconnect()
      }, (fade + 0.1) * 1000)
    },
  }
}

function once(fn) {
  let done = false
  return () => {
    if (done) return
    done = true
    fn()
  }
}

// ── clock: tick-tock every second, up to 12/s while she scrubs ──
const clocks = new Set()
/** Speed of every running clock layer: 0 = 1 tick/s … 1 = 12 ticks/s. */
export function setRate(r) {
  for (const c of clocks) c.rate = Math.min(1, Math.max(0, Number(r) || 0))
}
function clock(ctx, bus, opts) {
  const f = fader(ctx, bus, { fadeIn: 0.2 })
  const me = { rate: 0 }
  clocks.add(me)
  let k = 0
  const cancel = scheduler(
    ctx,
    (t) => {
      const tock = k++ % 2
      click(ctx, f.bus, t, { hz: tock ? 1500 : 1900, gain: 0.11 - me.rate * 0.03, dur: 0.025 })
    },
    () => 1 / (1 + 11 * me.rate),
    { lookahead: opts.lookahead ?? 0.12, every: 30 },
  )
  const stop = once(() => {
    clocks.delete(me)
    cancel()
    f.stop()
  })
  stop.setRate = (r) => {
    me.rate = Math.min(1, Math.max(0, Number(r) || 0))
  }
  return stop
}

// ── kettle: a pot on a low simmer, random bubbles 2–6/s ──
function kettle(ctx, bus, opts) {
  const f = fader(ctx, bus, { fadeIn: 1 })
  const simmer = continuousNoise(ctx, f.bus, { type: 'lowpass', hz: 500, gain: 0.025 })
  const cancel = scheduler(
    ctx,
    (t) => {
      const hz = rand(300, 700)
      pluck(ctx, f.bus, hz, t, { dur: 0.12, gain: rand(0.03, 0.06), to: hz * rand(1.6, 2.2), wet: 0.15 })
    },
    () => 1 / rand(2, 6),
    { lookahead: opts.lookahead },
  )
  return once(() => {
    cancel()
    f.stop(() => simmer.stop())
  })
}

// ── crickets + a little water in the garden ──
function crickets(ctx, bus, opts) {
  const f = fader(ctx, bus, { fadeIn: 1.5 })
  const water = continuousNoise(ctx, f.bus, { type: 'bandpass', hz: 1400, q: 0.7, gain: 0.018, wobble: 500 })
  const cancelChirps = scheduler(
    ctx,
    (t) => {
      const hz = rand(4300, 4900)
      const pulses = 3 + Math.floor(Math.random() * 3)
      for (let i = 0; i < pulses; i++) tone(ctx, f.bus, hz, t + i * 0.045, { dur: 0.03, gain: 0.03, attack: 0.004, wet: 0.2 })
    },
    () => rand(0.35, 1.3),
    { lookahead: opts.lookahead, delay: 0.1 },
  )
  const cancelDrips = scheduler(ctx, (t) => pluck(ctx, f.bus, rand(900, 1500), t, { dur: 0.15, gain: 0.02, to: rand(1600, 2400), wet: 0.6 }), () => rand(1.2, 3.5), {
    lookahead: opts.lookahead,
    delay: 0.6,
  })
  return once(() => {
    cancelChirps()
    cancelDrips()
    f.stop(() => water.stop())
  })
}

// ── wind: slow brown-noise swell (rooftop) ──
function wind(ctx, bus) {
  const f = fader(ctx, bus, { fadeIn: 2 })
  const air = continuousNoise(ctx, f.bus, { kind: 'brown', type: 'lowpass', hz: 420, q: 0.5, gain: 0.12, wobble: 260, swell: 0.6, rate: 0.09 })
  return once(() => f.stop(() => air.stop(), 1.2))
}

// ── pen: a faint paper-room tone; the desk plays 'scratch' per word on top ──
function pen(ctx, bus) {
  const f = fader(ctx, bus, { fadeIn: 1.5 })
  const room = continuousNoise(ctx, f.bus, { kind: 'brown', type: 'bandpass', hz: 300, q: 0.4, gain: 0.05, swell: 0.3, rate: 0.05 })
  const hum = steadyTone(ctx, f.bus, 110, 0.006)
  return once(() =>
    f.stop(() => {
      room.stop()
      hum.stop()
    }),
  )
}

// ── room: a very quiet hum and the odd floorboard creak (empty room) ──
function room(ctx, bus, opts) {
  const f = fader(ctx, bus, { fadeIn: 1.5 })
  const hum = steadyTone(ctx, f.bus, 98, 0.01)
  const air = continuousNoise(ctx, f.bus, { kind: 'brown', type: 'lowpass', hz: 250, gain: 0.03 })
  const cancel = scheduler(
    ctx,
    (t) => {
      const base = rand(95, 125)
      sweep(ctx, f.bus, base, base * 1.25, t, { dur: rand(0.5, 0.9), gain: 0.025, type: 'sawtooth', vibrato: 4, rate: 9, lowpass: 600 })
    },
    () => rand(8, 15),
    { lookahead: opts.lookahead, delay: rand(2, 5) },
  )
  return once(() => {
    cancel()
    f.stop(() => {
      hum.stop()
      air.stop()
    })
  })
}

/** Endless filtered noise with optional slow filter wobble / volume swell. Returns { stop }. */
function continuousNoise(ctx, bus, { kind = 'white', type = 'lowpass', hz = 800, q = 0.7, gain = 0.05, wobble = 0, swell = 0, rate = 0.15 } = {}) {
  const src = noiseSource(ctx, kind)
  const filt = ctx.createBiquadFilter()
  filt.type = type
  filt.frequency.value = hz
  filt.Q.value = q
  const g = ctx.createGain()
  g.gain.value = gain
  src.connect(filt)
  filt.connect(g)
  g.connect(bus.out)
  const lfos = []
  const lfo = (target, depth, r) => {
    const o = ctx.createOscillator()
    const d = ctx.createGain()
    o.frequency.value = r
    d.gain.value = depth
    o.connect(d)
    d.connect(target)
    o.start()
    lfos.push(o)
  }
  if (wobble) lfo(filt.frequency, wobble, rate * 1.3)
  if (swell) lfo(g.gain, gain * swell, rate)
  src.start(ctx.currentTime, Math.random() * 1.5)
  return {
    stop() {
      try {
        src.stop()
        lfos.forEach((o) => o.stop())
      } catch {
        /* already stopped */
      }
      g.disconnect()
    },
  }
}

function steadyTone(ctx, bus, hz, gain) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.value = hz
  g.gain.value = gain
  o.connect(g)
  g.connect(bus.out)
  o.start()
  return {
    stop() {
      try {
        o.stop()
      } catch {
        /* already stopped */
      }
      g.disconnect()
    },
  }
}

export const LAYER_FNS = { clock, kettle, crickets, wind, pen, room }

