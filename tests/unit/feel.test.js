import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nudge } from '../../src/ui/feel.js'
import { moment, T } from '../../src/ui/choreo.js'

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = '<button id="a"></button><button id="b"></button>'
})
afterEach(() => vi.useRealTimers())

describe('nudge', () => {
  it('fires after idle, resets on pointerdown, retargets, stops', () => {
    const a = document.getElementById('a')
    const b = document.getElementById('b')
    const n = nudge(a, { after: 4000, every: 3000 })
    vi.advanceTimersByTime(3900)
    expect(a.classList.contains('nudge')).toBe(false)
    vi.advanceTimersByTime(200)
    expect(a.classList.contains('nudge')).toBe(true)
    window.dispatchEvent(new Event('pointerdown'))
    expect(a.classList.contains('nudge')).toBe(false)
    n.set(b)
    vi.advanceTimersByTime(4100)
    expect(b.classList.contains('nudge')).toBe(true)
    expect(a.classList.contains('nudge')).toBe(false)
    n.stop()
    expect(b.classList.contains('nudge')).toBe(false)
    vi.advanceTimersByTime(10000)
    expect(b.classList.contains('nudge')).toBe(false)
  })
})

describe('choreo', () => {
  it('has ordered durations and builds timelines', () => {
    expect(T.tap).toBeLessThan(T.quick)
    expect(T.quick).toBeLessThan(T.move)
    expect(T.move).toBeLessThan(T.reveal)
    expect(T.reveal).toBeLessThan(T.moment)
    expect(typeof moment().to).toBe('function')
  })
})

describe('react', () => {
  it('declares its kind, plays steps in order and repeats the last', async () => {
    const { react } = await import('../../src/ui/react.js')
    document.body.innerHTML = '<div id="c" style="width:40px;height:40px"></div>'
    const el = document.getElementById('c')
    const seen = []
    const off = react(el, 'tip', { sound: null, steps: [(n) => seen.push(`a${n}`), (n) => seen.push(`b${n}`)] })
    expect(el.dataset.react).toBe('tip')
    for (let i = 0; i < 3; i++) el.dispatchEvent(new Event('pointerdown'))
    expect(seen).toEqual(['a1', 'b2', 'b3'])
    off()
    expect(el.dataset.react).toBeUndefined()
  })
  it('rejects unknown kinds', async () => {
    const { react } = await import('../../src/ui/react.js')
    expect(() => react(document.body, 'bob')).toThrow()
  })
})

describe('nudge styles', () => {
  it('draws the arrow from the third hint and clears it on touch', () => {
    document.body.innerHTML = '<div id="fx-layer"></div><button id="a"></button>'
    const a = document.getElementById('a')
    const n = nudge(a, { after: 1000, every: 1000, style: 'rattle', arrow: true })
    vi.advanceTimersByTime(1000 + 1000)
    expect(document.querySelector('.nudge-arrow')).toBe(null)
    vi.advanceTimersByTime(1000)
    expect(document.querySelector('.nudge-arrow')).not.toBe(null)
    window.dispatchEvent(new Event('pointerdown'))
    expect(document.querySelector('.nudge-arrow')).toBe(null)
    n.stop()
  })
})
