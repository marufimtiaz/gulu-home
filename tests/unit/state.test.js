import { beforeEach, describe, expect, it } from 'vitest'
import * as state from '../../src/state.js'

beforeEach(() => {
  localStorage.clear()
  state._reload()
})

describe('state', () => {
  it('starts fresh', () => {
    expect(state.get().doorSeen).toBe(false)
    expect(state.doneCount()).toBe(0)
    expect(state.suggested()).toBe('living')
  })

  it('persists and reloads', () => {
    state.markDone('kitchen')
    state._reload()
    expect(state.isDone('kitchen')).toBe(true)
  })

  it('markDone is idempotent and rejects unknown rooms', () => {
    expect(state.markDone('living')).toBe(true)
    expect(state.markDone('living')).toBe(false)
    expect(() => state.markDone('attic')).toThrow()
  })

  it('locks empty until five, finale until six', () => {
    for (const r of ['living', 'kitchen', 'garden', 'rooftop']) state.markDone(r)
    expect(state.emptyUnlocked()).toBe(false)
    expect(state.suggested()).toBe('desk')
    state.markDone('desk')
    expect(state.emptyUnlocked()).toBe(true)
    expect(state.finaleUnlocked()).toBe(false)
    expect(state.suggested()).toBe('empty')
    state.markDone('empty')
    expect(state.finaleUnlocked()).toBe(true)
    expect(state.suggested()).toBe(null)
  })

  it('survives corrupt storage', () => {
    localStorage.setItem('our-home', '{not json')
    state._reload()
    expect(state.get().v).toBe(1)
  })

  it('merges old saves missing new keys', () => {
    localStorage.setItem('our-home', JSON.stringify({ v: 1, doorSeen: true, done: { living: true } }))
    state._reload()
    expect(state.get().done.kitchen).toBe(false)
    expect(state.get().empty.notes).toEqual([])
  })

  it('cleans, caps and limits notes', () => {
    expect(state.addNote('   ')).toBe(null)
    expect(state.addNote('  a   trip \n  together ').text).toBe('a trip together')
    expect(state.addNote('x'.repeat(500)).text.length).toBe(140)
    for (let i = 0; i < 40; i++) state.addNote(`n${i}`)
    expect(state.get().empty.notes.length).toBe(30)
  })

  it('notifies subscribers', () => {
    let calls = 0
    const off = state.subscribe(() => calls++)
    state.markDone('garden')
    off()
    state.markDone('desk')
    expect(calls).toBe(1)
  })
})

describe('lit order', () => {
  it('remembers the order rooms were lit, once each', () => {
    localStorage.clear()
    state._reload()
    state.markDone('desk')
    state.markDone('living')
    state.markDone('desk')
    state.markDone('finale')
    expect(state.get().order).toEqual(['desk', 'living'])
    expect(state.litOrder()).toEqual(['desk', 'living'])
  })
  it('falls back to house order for saves from before order was recorded', () => {
    localStorage.setItem('our-home', JSON.stringify({ v: 1, doorSeen: true, done: { kitchen: true, living: true } }))
    state._reload()
    state.markDone('garden')
    expect(state.litOrder()).toEqual(['garden', 'living', 'kitchen'])
  })
})
