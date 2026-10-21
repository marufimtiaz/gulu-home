import { describe, expect, it } from 'vitest'
import { TUNE, XYLO, nearestBar } from '../../src/scenes/garden/tune.js'
import en from '../../src/scenes/empty/strings.js'
import bn from '../../src/scenes/empty/strings.bn.js'
import gEn from '../../src/scenes/garden/strings.js'
import gBn from '../../src/scenes/garden/strings.bn.js'
import rEn from '../../src/scenes/rooftop/strings.js'
import rBn from '../../src/scenes/rooftop/strings.bn.js'

// Task 17: none of these scenes uses the generic hop any more
const sources = import.meta.glob('../../src/scenes/{garden,rooftop,empty}/index.js', { eager: true, query: '?raw', import: 'default' })

describe('scenery (garden, rooftop, empty)', () => {
  it('retires poke() everywhere', () => {
    expect(Object.keys(sources)).toHaveLength(3)
    for (const [path, src] of Object.entries(sources)) expect(src, path).not.toMatch(/\bpoke\(/)
  })

  it('the fence plays the opening of A Thousand Years (nearest pentatonic bars)', () => {
    // E5 F5 G5 | E5 D5 C5 D5 E5 C5 | B4 C5 D5 B4 → an octave down, F→E, B→C
    expect(TUNE.slice(0, 13)).toEqual([2, 2, 3, 2, 1, 0, 1, 2, 0, 0, 0, 1, 0])
    expect(nearestBar(65)).toBe(2) // F → E
    expect(nearestBar(59)).toBe(0) // B below the bars → C
    for (const i of TUNE) expect(XYLO[i]).toBeDefined()
  })

  it('payoff lists have a Bengali entry for every English one', () => {
    expect(bn.nicknames).toHaveLength(en.nicknames.length)
    for (const [name, note] of bn.nicknames) expect(name && note).toBeTruthy()
    expect(gBn.coupons).toHaveLength(gEn.coupons.length)
    expect(rBn.echo).toHaveLength(rEn.echo.length)
    rBn.echo.forEach((e, i) => expect(e).toHaveLength(rEn.echo[i].length))
  })
})
