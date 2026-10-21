/*
 * Save the card: render the card face to a PNG.
 *
 *   cardToPng(el, { width = 1080, prepare }) → Promise<Blob>
 *     el       the card face (laid out at its design size; ancestors' transforms are ignored)
 *     prepare  optional fn(clone) to tidy the copy (finish reveals, park the foil highlight)
 *
 * How: clone the face → wrap it in an SVG <foreignObject> together with the page's CSS and
 * the card's @font-face rules (fonts inlined as data URLs, so the SVG image is
 * self-contained) → draw that SVG onto a canvas at `width` → PNG.
 *
 *   inlineFontFaces(cssText, fetcher) → Promise<cssText>
 *     rewrites every url(...) in cssText to fetcher(url) (a data URL). Pure; unit-tested.
 */

const XHTML = 'http://www.w3.org/1999/xhtml'

/** Families the card prints with — only these fonts are embedded. */
export const CARD_FONTS = ['Amiri', 'Galada', 'Tiro Bangla', 'Noto Serif Bengali', 'Pinyon Script', 'Cinzel', 'Cormorant Garamond']

const URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g

export async function inlineFontFaces(cssText, fetcher) {
  const urls = [...new Set([...cssText.matchAll(URL_RE)].map((m) => m[2]).filter((u) => !u.startsWith('data:')))]
  const map = new Map()
  await Promise.all(
    urls.map(async (u) => {
      try {
        map.set(u, await fetcher(u))
      } catch {
        /* leave it as is: the font falls back */
      }
    }),
  )
  return cssText.replace(URL_RE, (all, q, u) => (map.has(u) ? `url("${map.get(u)}")` : all))
}

/** fetch → data URL (browser). */
export async function fetchAsDataUrl(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const blob = await res.blob()
  return await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

const family = (rule) => rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim()

/** Page CSS split into the card's @font-face rules and everything else. */
function collectCss() {
  const faces = []
  const rest = []
  for (const sheet of document.styleSheets) {
    let rules
    try {
      rules = sheet.cssRules
    } catch {
      continue // cross-origin sheet
    }
    for (const rule of rules) {
      if (rule instanceof CSSFontFaceRule) {
        if (CARD_FONTS.includes(family(rule))) faces.push(rule.cssText)
      } else if (!(rule instanceof CSSImportRule) && !(rule instanceof CSSKeyframesRule)) {
        rest.push(rule.cssText)
      }
    }
  }
  return { faces: faces.join('\n'), rest: rest.join('\n') }
}

let fontCache = null

export async function cardToPng(el, { width = 1080, prepare, fetcher = fetchAsDataUrl } = {}) {
  const w0 = el.offsetWidth
  const h0 = el.offsetHeight
  const height = Math.round((h0 / w0) * width)

  const { faces, rest } = collectCss()
  fontCache ??= inlineFontFaces(faces, fetcher)
  const fontCss = await fontCache

  const clone = el.cloneNode(true)
  // resolve the custom properties the card reads from :root so the copy stands alone
  const cs = getComputedStyle(el)
  const vars = ['--card-ivory', '--card-rose', '--card-gold', '--card-gold-hi', '--card-ink', '--card-arabic', '--card-bn-display', '--card-bn', '--card-script', '--card-caps', '--card-serif', '--berry', '--berry-deep']
  for (const v of vars) clone.style.setProperty(v, cs.getPropertyValue(v).trim())
  clone.style.margin = '0'
  clone.style.transform = 'none'
  prepare?.(clone)

  const body = new XMLSerializer().serializeToString(clone)
  const css = `${fontCss}\n${rest}`.replace(/<\/style/gi, '<\\/style')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${w0} ${h0}">` +
    `<foreignObject x="0" y="0" width="${w0}" height="${h0}">` +
    `<div xmlns="${XHTML}" style="width:${w0}px;height:${h0}px;margin:0;padding:0;position:relative">` +
    `<style>${escapeXml(css)}</style>${body}</div></foreignObject></svg>`

  const img = new Image()
  img.decoding = 'sync'
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await img.decode()
  // a beat for the embedded fonts to settle before painting
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const g = canvas.getContext('2d')
  g.drawImage(img, 0, 0, width, height)
  return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'))
}

/** CSS goes inside an XHTML <style>: escape the characters XML cares about. */
function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
