/*
 * The living-room rewind, as pure maths (no DOM).
 *
 *   const s = makeScrubber({ start, end, turns = 14 })
 *   s.angle(deltaRad) → t     accumulate hand rotation (clockwise +); t is 0..1, 1 = end (now)
 *   s.fling(radPerSec)        start momentum from a release velocity (see flingGain)
 *   s.tick(dt) → t            advance momentum by dt seconds
 *   s.t(), s.date()           current position, as 0..1 and as a Date between start and end
 *   s.set(t)                  jump (clamped) and stop momentum — used by seek and the spin forward
 *   s.velocity(), s.rad()     current momentum (rad/s) and accumulated angle (≤ 0)
 *
 * Linear: one full anticlockwise turn rewinds 1/turns of the span.
 *
 * Momentum: a release velocity v coasts DECAY-shaped for ≈ v·gain / ln(1/DECAY) radians.
 * The gain is speed-dependent so slow, careful releases barely coast (precise scrubbing)
 * while a confident flick (≳ 16 rad/s — a quarter turn in ~0.1 s) coasts ≈ 3.9 turns:
 * with the turn or so her finger drew, 3–4 flicks cross the 14 turns back to 2022.
 */
const TAU = Math.PI * 2
const DECAY = 0.1 // fraction of velocity left after one second (most of the coast is in the first ~1.5 s)
const STOP = 0.3 // rad/s — below this the hand has visibly stopped
export const FLING = { slow: 2, fast: 16, minGain: 0.5, maxGain: 3.5, max: 56 }

/** Release velocity (rad/s) → coasting velocity: gentle releases damped, hard flicks boosted, capped. */
export function flingGain(v) {
  const a = Math.abs(v)
  const x = Math.min(1, Math.max(0, (a - FLING.slow) / (FLING.fast - FLING.slow)))
  const s = x * x * (3 - 2 * x) // smoothstep
  const out = a * (FLING.minGain + (FLING.maxGain - FLING.minGain) * s)
  return Math.sign(v) * Math.min(FLING.max, out)
}

export function makeScrubber({ start, end, turns = 14 }) {
  const t0 = +start
  const span = Math.max(0, +end - t0)
  const full = turns * TAU
  let acc = 0 // radians, in [-full, 0]
  let v = 0

  const clampAcc = () => {
    if (acc <= -full) {
      acc = -full
      if (v < 0) v = 0
    } else if (acc >= 0) {
      acc = 0
      if (v > 0) v = 0
    }
  }
  const t = () => {
    const x = 1 + acc / full
    return x <= 0 ? 0 : x >= 1 ? 1 : x
  }

  return {
    t,
    angle(delta) {
      acc += delta
      clampAcc()
      return t()
    },
    fling(radPerSec) {
      v = Number.isFinite(radPerSec) ? flingGain(radPerSec) : 0
      return t()
    },
    tick(dt) {
      if (v === 0) return t()
      acc += v * dt
      v *= Math.pow(DECAY, dt)
      if (Math.abs(v) < STOP) v = 0
      clampAcc()
      return t()
    },
    set(x) {
      const c = Math.min(1, Math.max(0, x))
      acc = (c - 1) * full
      v = 0
      return t()
    },
    date: () => new Date(t0 + t() * span),
    velocity: () => v,
    rad: () => acc,
  }
}
