import { beforeEach, describe, expect, it } from 'vitest'
import * as state from '../../src/state.js'
import { CHORUS, CHORUS_PAD, CHORDS, VERSE, VERSE_PAD, parse } from '../../src/sound/theme.js'
import { midiToHz } from '../../src/sound/synth.js'
import { sound, EFFECTS, LAYERS } from '../../src/sound/index.js'
import { EFFECT_FNS } from '../../src/sound/engine.js'
import { LAYER_FNS } from '../../src/sound/layers.js'

const beats = (list) => list.reduce((s, e) => s + e.d, 0)

beforeEach(() => {
  localStorage.clear()
  state._reload()
})

describe('theme tables', () => {
  for (const [name, table, pad] of [
    ['VERSE', VERSE, VERSE_PAD],
    ['CHORUS', CHORUS, CHORUS_PAD],
  ]) {
    it(`${name} is a list of { n, d } in whole 4/4 bars`, () => {
      expect(table.length).toBeGreaterThan(20)
      for (const e of table) {
        expect(Object.keys(e).sort()).toEqual(['d', 'n'])
        expect(e.d).toBeGreaterThan(0)
        if (e.n !== null) {
          expect(Number.isInteger(e.n)).toBe(true)
          expect(e.n).toBeGreaterThanOrEqual(48)
          expect(e.n).toBeLessThanOrEqual(96)
        }
      }
      expect(beats(table) % 4).toBe(0)
    })
    it(`${name} pad lines up with the melody and uses known chords`, () => {
      expect(beats(pad)).toBe(beats(table))
      for (const p of pad) expect(CHORDS[p.chord]).toBeTruthy()
    })
  }

  it('parses note names and rests', () => {
    expect(parse('C4:2 A4:1 -:1 Bb3:.5')).toEqual([
      { n: 60, d: 1 },
      { n: 69, d: 0.5 },
      { n: null, d: 0.5 },
      { n: 58, d: 0.25 },
    ])
  })
})

describe('synth', () => {
  it('midiToHz', () => {
    expect(midiToHz(69)).toBe(440)
    expect(midiToHz(81)).toBeCloseTo(880)
    expect(midiToHz(60)).toBeCloseTo(261.63, 1)
  })
})

describe('engine', () => {
  it('implements every effect and layer named in the contract', () => {
    for (const n of EFFECTS) expect(typeof EFFECT_FNS[n], n).toBe('function')
    for (const n of LAYERS) expect(typeof LAYER_FNS[n], n).toBe('function')
  })

  it('cycles all → sfx → off → all and persists through state', () => {
    expect(sound.mode()).toBe('all')
    expect(sound.cycleMode()).toBe('sfx')
    expect(state.get().sound).toBe('sfx')
    expect(sound.cycleMode()).toBe('off')
    state._reload()
    expect(sound.mode()).toBe('off')
    expect(sound.cycleMode()).toBe('all')
    expect(state.get().sound).toBe('all')
  })

  it('treats an unknown stored mode as all', () => {
    state.update({ sound: 'loud' })
    expect(sound.mode()).toBe('all')
  })

  it('is a safe no-op without Web Audio and for unknown names', () => {
    expect(() => sound.play('nope')).not.toThrow()
    expect(() => sound.play('chime')).not.toThrow()
    expect(() => sound.theme('verse')).not.toThrow()
    expect(() => sound.theme('verse')).not.toThrow()
    expect(() => sound.theme('off')).not.toThrow()
    const stop = sound.layer('nope')
    expect(typeof stop).toBe('function')
    expect(() => stop()).not.toThrow()
    const clock = sound.layer('clock')
    expect(() => clock.setRate(0.5)).not.toThrow()
    expect(() => clock()).not.toThrow()
    expect(() => clock()).not.toThrow()
    expect(() => sound.unlock()).not.toThrow()
  })
})
