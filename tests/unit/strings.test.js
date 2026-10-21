import { describe, expect, it } from 'vitest'

// Every UI string key in English must exist in Bengali (shared + every scene).
const en = import.meta.glob('../../src/scenes/*/strings.js', { eager: true, import: 'default' })
const bn = import.meta.glob('../../src/scenes/*/strings.bn.js', { eager: true, import: 'default' })
import sharedEn from '../../src/content/strings.js'
import sharedBn from '../../src/content/strings.bn.js'

const keys = (o, p = '') =>
  Object.entries(o ?? {}).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`],
  )

describe('Bengali UI strings', () => {
  for (const [path, strings] of Object.entries(en)) {
    const id = path.match(/scenes\/([^/]+)\//)[1]
    it(`${id} has every key in strings.bn.js`, () => {
      const b = bn[path.replace('strings.js', 'strings.bn.js')]
      const missing = keys(strings).filter((k) => !keys(b).includes(k))
      expect(missing).toEqual([])
    })
  }
  it('shared strings are all translated (scene sections excluded)', () => {
    const scenes = new Set(Object.keys(en).map((p) => p.match(/scenes\/([^/]+)\//)[1]))
    const top = Object.fromEntries(Object.entries(sharedEn).filter(([k]) => !scenes.has(k)))
    const missing = keys(top).filter((k) => !keys(sharedBn).includes(k) && k !== 'chrome.langLabel')
    expect(missing).toEqual([])
  })
})
