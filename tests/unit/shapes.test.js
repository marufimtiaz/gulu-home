import { describe, expect, it } from 'vitest'
import { SHAPES, layout, shapeOf } from '../../src/scenes/rooftop/shapes.js'
import config from '../../src/content/config.js'

const NAMES = ['flowers', 'rickshaw', 'teacup', 'phone', 'ring', 'cake', 'heart', 'house']
const overlap = (a, b) =>
  Math.abs(a.cx - b.cx) < (a.size + b.size) / 2 && Math.abs(a.cy - b.cy) < (a.size + b.size) / 2

describe('shapes', () => {
  it('defines all eight shapes', () => {
    expect(Object.keys(SHAPES).sort()).toEqual([...NAMES].sort())
  })

  it.each(NAMES)('%s has 5–8 stars inside the unit box and an outline', (name) => {
    const { stars, outline } = SHAPES[name]
    expect(stars.length).toBeGreaterThanOrEqual(5)
    expect(stars.length).toBeLessThanOrEqual(8)
    for (const [x, y] of stars) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(1)
    }
    expect(outline).toMatch(/^M/)
    // every number in the outline stays near the unit box
    for (const n of outline.match(/-?\d*\.?\d+/g).map(Number)) expect(Math.abs(n)).toBeLessThanOrEqual(1.2)
  })

  it.each(NAMES)('%s keeps its stars far enough apart for fingers', (name) => {
    const { stars } = SHAPES[name]
    for (let a = 0; a < stars.length; a++) {
      for (let b = a + 1; b < stars.length; b++) {
        const d = Math.max(Math.abs(stars[a][0] - stars[b][0]), Math.abs(stars[a][1] - stars[b][1]))
        expect(d, `${name} stars ${a} and ${b}`).toBeGreaterThanOrEqual(0.199)
      }
    }
  })

  it('unknown shapes fall back to the heart', () => {
    expect(shapeOf('zeppelin')).toBe(SHAPES.heart)
  })
})

describe('layout', () => {
  const seven = Array.from({ length: 7 }, (_, i) => ({ i }))

  it('places 7 memories in 390×600 without overlap', () => {
    const boxes = layout(seven, { w: 390, h: 600 })
    expect(boxes).toHaveLength(7)
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) expect(overlap(boxes[a], boxes[b]), `${a} vs ${b}`).toBe(false)
    }
  })

  it.each([
    [312, 410], [346, 590], [370, 680], [790, 230], [720, 640], [1220, 520], [1860, 760],
  ])('keeps every box inside %i×%i and never overlapping', (w, h) => {
    const boxes = layout(config.rooftop.memories, { w, h })
    expect(boxes.map((b) => b.i)).toEqual([0, 1, 2, 3, 4, 5, 6])
    for (const b of boxes) {
      expect(b.size).toBeGreaterThan(60)
      expect(b.cx - b.size / 2).toBeGreaterThanOrEqual(-0.01)
      expect(b.cy - b.size / 2).toBeGreaterThanOrEqual(-0.01)
      expect(b.cx + b.size / 2).toBeLessThanOrEqual(w + 0.01)
      expect(b.cy + b.size / 2).toBeLessThanOrEqual(h + 0.01)
    }
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) expect(overlap(boxes[a], boxes[b])).toBe(false)
    }
  })

  it('is deterministic and handles odd inputs', () => {
    expect(layout(seven, { w: 400, h: 500 })).toEqual(layout(seven, { w: 400, h: 500 }))
    expect(layout([], { w: 400, h: 500 })).toEqual([])
    expect(layout(seven, { w: 0, h: 500 })).toEqual([])
    expect(layout([{}], { w: 300, h: 300 })).toHaveLength(1)
  })

  it('caps the size on big screens', () => {
    for (const b of layout(seven, { w: 1860, h: 760, max: 200 })) expect(b.size).toBeLessThanOrEqual(200)
  })
})
