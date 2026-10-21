import { describe, expect, it, vi } from 'vitest'
import { CARD_FONTS, inlineFontFaces } from '../../src/scenes/card/export.js'

const css = `@font-face { font-family: 'Amiri'; src: url(/fonts/Amiri-400-arabic.woff2) format('woff2'); }
@font-face { font-family: 'Cinzel'; src: url("/fonts/Cinzel.woff2") format('woff2'); }
@font-face { font-family: 'Amiri'; font-weight: 700; src: url('/fonts/Amiri-400-arabic.woff2') format('woff2'); }`

describe('inlineFontFaces', () => {
  it('rewrites every url() to the fetcher result, fetching each url once', async () => {
    const fetcher = vi.fn(async (u) => `data:font/woff2;base64,${btoa(u)}`)
    const out = await inlineFontFaces(css, fetcher)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(out).not.toMatch(/url\(["']?\/fonts/)
    expect(out).toContain(`url("data:font/woff2;base64,${btoa('/fonts/Cinzel.woff2')}")`)
    expect(out.match(/data:font\/woff2/g)).toHaveLength(3)
    expect(out).toContain("format('woff2')")
  })

  it('leaves a url alone when its fetch fails, and skips data urls', async () => {
    const fetcher = vi.fn(async (u) => {
      if (u.includes('Cinzel')) throw new Error('404')
      return 'data:x'
    })
    const out = await inlineFontFaces(`${css}\n@font-face { src: url(data:font/woff2;base64,AAA); }`, fetcher)
    expect(out).toContain('url("/fonts/Cinzel.woff2")')
    expect(out).toContain('url("data:x")')
    expect(out).toContain('url(data:font/woff2;base64,AAA)')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('embeds every family the card prints with', () => {
    for (const f of ['Amiri', 'Galada', 'Tiro Bangla', 'Noto Serif Bengali', 'Pinyon Script', 'Cinzel', 'Cormorant Garamond']) expect(CARD_FONTS).toContain(f)
  })
})
