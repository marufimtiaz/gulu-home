/*
 * The living-room rewind, as pure maths (no DOM).
 *
 *   const s = makeScrubber({ start, end, turns = 14 })
 *   s.angle(deltaRad) → t     accumulate hand rotation (clockwise +); t is 0..1, 1 = end (now)
 *   s.fling(radPerSec)        start momentum (decays to ~8 % per second)
 *   s.tick(dt) → t            advance momentum by dt seconds
 *   s.t(), s.date()           current position, as 0..1 and as a Date between start and end
 *   s.set(t)                  jump (clamped) and stop momentum — used by seek and the spin forward
 *   s.velocity(), s.rad()     current momentum (rad/s) and accumulated angle (≤ 0)
 *
 * Linear: one full anticlockwise turn rewinds 1/turns of the span.
 */
const TAU = Math.PI * 2
const DECAY = 0.08 // fraction of velocity left after one second
const STOP = 0.05 // rad/s

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
      v = Number.isFinite(radPerSec) ? radPerSec : 0
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
