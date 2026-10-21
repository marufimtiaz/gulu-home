import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireflies, starfield, sparkles, hearts } from '../../src/fx/index.js'

beforeEach(() => {
  document.body.innerHTML = '<div id="fx-layer"></div><div id="box" style="width:300px;height:300px"></div>'
  vi.stubGlobal('requestAnimationFrame', (fn) => setTimeout(() => fn(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id))
})

describe('fx', () => {
  it('fireflies adds count elements and stop removes them', () => {
    const box = document.getElementById('box')
    const stop = fireflies(box, { count: 5 })
    expect(box.querySelectorAll('.firefly').length).toBe(5)
    stop()
    expect(box.querySelectorAll('.firefly').length).toBe(0)
  })
  it('starfield renders the requested number of stars', () => {
    const box = document.getElementById('box')
    const stop = starfield(box, { count: 12 })
    expect(box.querySelectorAll('.stars circle').length).toBe(12)
    stop()
    expect(box.querySelector('.stars')).toBe(null)
  })
  it('bursts draw on the fx layer and clean themselves up', async () => {
    sparkles(10, 10, { count: 3 })
    hearts(10, 10, { count: 2 })
    const layer = document.getElementById('fx-layer')
    expect(layer.children.length).toBeGreaterThan(0)
    await new Promise((r) => setTimeout(r, 1500))
    expect(layer.children.length).toBe(0)
  })
})
