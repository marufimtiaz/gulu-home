import { describe, expect, it } from 'vitest'
import { makeScrubber } from '../../src/scenes/living/clock.js'

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
})
