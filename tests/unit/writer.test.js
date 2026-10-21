import { beforeEach, describe, expect, it, vi } from 'vitest'
import { write } from '../../src/scenes/desk/writer.js'

const TEXT = 'Welcome home. I know — it\'s small, and it\'s made of paper.'
const WORDS = TEXT.split(/\s+/)

beforeEach(() => {
  document.body.innerHTML = '<div id="paper" style="position:relative"><p id="p"></p><i id="nib"></i></div>'
  vi.stubGlobal('requestAnimationFrame', (fn) => setTimeout(() => fn(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id))
})

const on = (el) => el.querySelectorAll('.w.w--on').length

describe('write()', () => {
  it('with msPerChar 0 resolves with the full text, one onWord per word', async () => {
    const el = document.getElementById('p')
    const seen = []
    await write(el, TEXT, { msPerChar: 0, onWord: (w) => seen.push(w) })
    expect(el.textContent).toBe(TEXT)
    expect(seen).toEqual(WORDS)
    expect(el.querySelectorAll('.w').length).toBe(WORDS.length)
    expect(on(el)).toBe(WORDS.length)
  })

  it('keeps whitespace exactly as given', async () => {
    const el = document.getElementById('p')
    const odd = '  two  spaces\nand a line '
    await write(el, odd, { msPerChar: 0 })
    expect(el.textContent).toBe(odd)
  })

  it('reveals word by word over time', async () => {
    const el = document.getElementById('p')
    const seen = []
    const done = write(el, TEXT, { msPerChar: 6, onWord: (w) => seen.push(w), nib: document.getElementById('nib') })
    // the whole text is laid out up front (no reflow), but hidden
    expect(el.textContent).toBe(TEXT)
    await new Promise((r) => setTimeout(r, 120))
    const mid = on(el)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(WORDS.length)
    await done
    expect(on(el)).toBe(WORDS.length)
    expect(seen).toEqual(WORDS)
  })

  it('aborting mid-way finishes at once with the full text visible', async () => {
    const el = document.getElementById('p')
    const ctl = new AbortController()
    let words = 0
    const done = write(el, TEXT, { msPerChar: 40, onWord: () => words++, signal: ctl.signal })
    await new Promise((r) => setTimeout(r, 150))
    ctl.abort()
    await done
    expect(el.textContent).toBe(TEXT)
    expect(on(el)).toBe(WORDS.length)
    expect(words).toBeLessThan(WORDS.length) // the pen didn't scratch the rest
  })

  it('an already-aborted signal shows everything immediately', async () => {
    const el = document.getElementById('p')
    const ctl = new AbortController()
    ctl.abort()
    await write(el, TEXT, { signal: ctl.signal })
    expect(on(el)).toBe(WORDS.length)
  })

  it('places the nib after the last revealed word', async () => {
    const el = document.getElementById('p')
    const nib = document.getElementById('nib')
    await write(el, 'hi there', { msPerChar: 0, nib })
    expect(nib.style.transform).not.toBe('')
  })
})
