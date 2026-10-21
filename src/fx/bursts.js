/*
 * sparkles(x, y, { count = 14, colors }) — a pop of warm four-point glints at a client point.
 * hearts(x, y, { count = 6 })            — little paper hearts (ink outline) floating up.
 *
 * Both draw on #fx-layer and remove themselves after 1.2 s. Pure CSS animation, driven by
 * per-particle custom properties. Reduced motion → a single still frame, then removed.
 */
import { reduced } from '../ui/motion.js'

const rand = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const LIFE = 1200

const SPARKLE_COLORS = ['var(--butter)', 'var(--lamp)', 'var(--star)', 'var(--mustard)', 'var(--pink)']
const HEART_COLORS = ['var(--berry)', 'var(--pink)', 'var(--blush)', 'var(--berry)', 'var(--tomato)']
const HEART_PATH = 'M12 21s-7.6-4.6-9.6-9.4C1 8.1 3 4.5 6.6 4.5c2.2 0 3.7 1.2 5.4 3.2 1.7-2 3.2-3.2 5.4-3.2 3.6 0 5.6 3.6 4.2 7.1C19.6 16.4 12 21 12 21z'

function host(x, y) {
  const layer = document.getElementById('fx-layer')
  if (!layer) return null
  const el = document.createElement('div')
  el.className = 'burst'
  el.style.transform = `translate(${x}px, ${y}px)`
  return { layer, el }
}

function finish(layer, el) {
  if (reduced()) {
    el.classList.add('burst--still')
    layer.append(el)
    requestAnimationFrame(() => requestAnimationFrame(() => el.remove()))
    setTimeout(() => el.remove(), LIFE) // belt and braces if rAF is throttled
    return
  }
  layer.append(el)
  setTimeout(() => el.remove(), LIFE)
}

export function sparkles(x, y, { count = 14, colors = SPARKLE_COLORS } = {}) {
  const h = host(x, y)
  if (!h) return
  const palette = colors?.length ? colors : SPARKLE_COLORS
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i')
    const dot = i % 4 === 3
    p.className = dot ? 'sparkle sparkle--dot' : 'sparkle'
    const a = (Math.PI * 2 * i) / count + rand(-0.35, 0.35)
    const d = rand(34, 82)
    p.style.setProperty('--dx', `${(Math.cos(a) * d).toFixed(1)}px`)
    p.style.setProperty('--dy', `${(Math.sin(a) * d - 10).toFixed(1)}px`)
    p.style.setProperty('--rot', `${rand(-160, 160).toFixed(0)}deg`)
    p.style.setProperty('--s', `${(dot ? rand(3, 5) : rand(8, 15)).toFixed(1)}px`)
    p.style.setProperty('--c', pick(palette))
    p.style.setProperty('--delay', `${rand(0, 0.12).toFixed(2)}s`)
    h.el.append(p)
  }
  finish(h.layer, h.el)
}

export function hearts(x, y, { count = 6 } = {}) {
  const h = host(x, y)
  if (!h) return
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i')
    p.className = 'heart'
    const spread = count > 1 ? (i / (count - 1) - 0.5) * 2 : 0
    p.style.setProperty('--dx', `${(spread * rand(40, 68) + rand(-12, 12)).toFixed(1)}px`)
    p.style.setProperty('--dy', `${-rand(90, 150).toFixed(1)}px`)
    p.style.setProperty('--rot', `${(spread * 18 + rand(-12, 12)).toFixed(0)}deg`)
    p.style.setProperty('--s', `${rand(18, 28).toFixed(1)}px`)
    p.style.setProperty('--delay', `${Math.min(0.22, i * 0.03 + rand(0, 0.05)).toFixed(2)}s`)
    p.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${HEART_PATH}" style="fill: ${pick(HEART_COLORS)}; stroke: var(--ink); stroke-width: 1.6; stroke-linejoin: round"/></svg>`
    h.el.append(p)
  }
  finish(h.layer, h.el)
}
