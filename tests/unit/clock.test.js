import { describe, expect, it } from 'vitest'
import { flingGain, makeScrubber } from '../../src/scenes/living/clock.js'

const start = new Date(2022, 3, 20, 4, 30), end = new Date(2026, 9, 22, 20, 0)

describe('scrubber', () => {
  it('14 anticlockwise turns reach the start, clamped', () => {
    const s = makeScrubber({ start, end })
    expect(s.t()).toBe(1)
    for (let i = 0; i < 14; i++) s.angle(-2 * Math.PI)
    expect(s.t()).toBeCloseTo(0, 5)
    s.angle(-6)
    expect(s.t()).toBe(0)
    expect(+s.date()).toBe(+start)
  })

  it('fling decays and stops', () => {
    const s = makeScrubber({ start, end })
    s.fling(-20)
    let last = s.t()
    for (let i = 0; i < 200; i++) s.tick(1 / 60)
    expect(s.t()).toBeLessThan(last)
    const settled = s.t()
    s.tick(1 / 60)
    expect(s.t()).toBeCloseTo(settled, 6)
  })

  it('one turn is 1/14 of the span; clockwise winds forward; never past now', () => {
    const s = makeScrubber({ start, end })
    s.angle(-2 * Math.PI)
    expect(s.t()).toBeCloseTo(13 / 14, 6)
    expect(Math.abs(+s.date() - (+end - (end - start) / 14))).toBeLessThan(1000)
    s.angle(Math.PI)
    expect(s.t()).toBeCloseTo(1 - 0.5 / 14, 6)
    s.angle(10)
    expect(s.t()).toBe(1)
    expect(+s.date()).toBe(+end)
  })

  it('winding forward from the clamp responds immediately', () => {
    const s = makeScrubber({ start, end, turns: 2 })
    s.angle(-100)
    expect(s.t()).toBe(0)
    s.angle(Math.PI)
    expect(s.t()).toBeCloseTo(0.25, 6)
  })

  it('momentum stops at the ends', () => {
    const s = makeScrubber({ start, end, turns: 1 })
    s.fling(-50)
    for (let i = 0; i < 30; i++) s.tick(1 / 60)
    expect(s.t()).toBe(0)
    expect(s.velocity()).toBe(0)
  })

  it('set(t) jumps and kills momentum', () => {
    const s = makeScrubber({ start, end })
    s.fling(-20)
    s.set(0.5)
    expect(s.t()).toBe(0.5)
    expect(s.velocity()).toBe(0)
    s.tick(1 / 60)
    expect(s.t()).toBe(0.5)
    s.set(2)
    expect(s.t()).toBe(1)
  })

  // run momentum out; returns turns coasted (anticlockwise positive)
  const coast = (s, v) => {
    const r0 = s.rad()
    s.fling(v)
    for (let i = 0; i < 600 && s.velocity() !== 0; i++) s.tick(1 / 60)
    return (r0 - s.rad()) / (2 * Math.PI)
  }

  it('a confident flick coasts ~4 turns, so 3–4 flicks (plus the drags) reach 2022', () => {
    const one = coast(makeScrubber({ start, end }), -18)
    expect(one).toBeGreaterThan(3.4)
    expect(one).toBeLessThan(4.5)
    const s = makeScrubber({ start, end })
    let flicks = 0
    while (s.t() > 0 && flicks < 10) {
      s.angle(-Math.PI / 2) // the quarter turn her finger draws before letting go
      coast(s, -18)
      flicks++
    }
    expect(flicks).toBeGreaterThanOrEqual(3)
    expect(flicks).toBeLessThanOrEqual(4)
  })

  it('slow releases barely coast, so careful drags stay precise', () => {
    expect(coast(makeScrubber({ start, end }), -1.5)).toBeLessThan(0.05)
    expect(coast(makeScrubber({ start, end }), -4)).toBeLessThan(0.25)
  })

  it('the coast is capped: no single flick crosses more than ~a third of the span', () => {
    expect(coast(makeScrubber({ start, end }), -400)).toBeLessThan(4.5)
    expect(flingGain(60)).toBe(-flingGain(-60))
  })

  it('momentum settles within ~2.5 s', () => {
    const s = makeScrubber({ start, end })
    s.fling(-40)
    let n = 0
    while (s.velocity() !== 0 && n < 1000) {
      s.tick(1 / 60)
      n++
    }
    expect(n / 60).toBeLessThan(2.5)
  })
})
