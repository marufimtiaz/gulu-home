import { describe, expect, it } from 'vitest'
import { place } from '../../src/scenes/empty/wall.js'

const notes = (n) => Array.from({ length: n }, (_, i) => ({ text: `note ${i}`, who: i % 2 ? 'her' : 'me' }))

describe('place()', () => {
  it('30 notes in 390×560: all placed, inside, ≥ 60 px apart vertically within a column', () => {
    const W = 390, H = 560
    const out = place(notes(30), { w: W, h: H })
    expect(out).toHaveLength(30)
    for (const p of out) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.x + p.w).toBeLessThanOrEqual(W)
      expect(p.y + p.h).toBeLessThanOrEqual(H)
      expect(Math.abs(p.rot)).toBeLessThanOrEqual(4)
    }
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i], b = out[j]
        if (a.col !== b.col) continue
        expect(Math.abs(a.y - b.y), `notes ${i} and ${j}`).toBeGreaterThanOrEqual(60)
      }
    }
  })

  it('note boxes never overlap', () => {
    for (const n of [1, 3, 7, 12, 30, 33]) {
      const out = place(notes(n), { w: 390, h: 560 })
      for (let i = 0; i < out.length; i++) {
        for (let j = i + 1; j < out.length; j++) {
          const a = out[i], b = out[j]
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
          expect(apart, `n=${n}: ${i} vs ${j}`).toBe(true)
        }
      }
    }
  })

  it('is deterministic', () => {
    expect(place(notes(17), { w: 390, h: 560 })).toEqual(place(notes(17), { w: 390, h: 560 }))
  })

  it('a note keeps its tilt as the wall fills up', () => {
    const few = place(notes(3), { w: 390, h: 560 })
    const many = place(notes(20), { w: 390, h: 560 })
    for (let i = 0; i < 3; i++) expect(many[i].rot).toBe(few[i].rot)
  })

  it('keeps two columns while they fit, adds more when the wall gets crowded', () => {
    expect(new Set(place(notes(3), { w: 390, h: 560 }).map((p) => p.col)).size).toBe(2)
    expect(new Set(place(notes(30), { w: 390, h: 560 }).map((p) => p.col)).size).toBeGreaterThan(2)
  })

  it('handles an empty wall and a zero-sized wall', () => {
    expect(place([], { w: 390, h: 560 })).toEqual([])
    expect(place(notes(3), { w: 0, h: 0 })).toEqual([])
  })
})
