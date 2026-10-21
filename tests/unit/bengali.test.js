import { describe, expect, it } from 'vitest'
import en from '../../src/content/config.js'
import bn from '../../src/content/config.bn.js'

// Lists in config.bn.js are matched to config.js by position — a length mismatch
// silently pairs the wrong lines, so pin it.
const LISTS = [
  'door.hints',
  'living.events',
  'kitchen.ingredients',
  'rooftop.memories',
  'letter.paragraphs',
  'letter.ps',
  'empty.starters',
]
const at = (o, p) => p.split('.').reduce((x, k) => x?.[k], o)

describe('config.bn.js mirrors config.js', () => {
  for (const path of LISTS) {
    it(`${path} has the same length`, () => {
      const b = at(bn, path)
      if (b === undefined) return // untranslated → English fallback, fine
      expect(b.length).toBe(at(en, path).length)
    })
  }
  it('only uses keys that exist in English', () => {
    const walk = (b, e, path) => {
      if (Array.isArray(b) || !b || typeof b !== 'object') return
      for (const k of Object.keys(b)) {
        expect(e && k in e, `unknown key ${path}${k}`).toBe(true)
        walk(b[k], e?.[k], `${path}${k}.`)
      }
    }
    walk(bn, en, '')
  })
})
