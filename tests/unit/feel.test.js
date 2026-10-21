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
