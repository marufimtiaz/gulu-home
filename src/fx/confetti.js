/*
 * confetti({ duration = 3000 }) → Promise<void>
 *
 * Little cut-paper rectangles (ink-edged, in the site's paper colours) flutter down over
 * #fx-layer. Every piece lands within `duration`; then the layer is cleaned and the promise
 * resolves. Reduced motion → skipped (resolves at once).
 */
import { reduced } from '../ui/motion.js'

const rand = (a, b) => a + Math.random() * (b - a)
const COLORS = ['var(--berry)', 'var(--mustard)', 'var(--pink)', 'var(--sky)', 'var(--butter)', 'var(--sage)', 'var(--paper)', 'var(--tomato)']

export function confetti({ duration = 3000 } = {}) {
  const layer = document.getElementById('fx-layer')
  if (!layer || reduced()) return Promise.resolve()

  const wrap = document.createElement('div')
  wrap.className = 'confetti'
  const small = innerWidth < 720
  const n = small ? 56 : 90
  for (let i = 0; i < n; i++) {
    const b = document.createElement('b')
    const p = document.createElement('i')
    const fall = rand(0.55, 0.85) * duration
    const delay = rand(0, Math.max(0, duration - fall - 120))
    const long = Math.random() < 0.7
    b.style.cssText = [
      `--x:${rand(-2, 100).toFixed(1)}%`,
      `--fall:${fall.toFixed(0)}ms`,
      `--delay:${delay.toFixed(0)}ms`,
      `--drift:${rand(-70, 70).toFixed(0)}px`,
      `--r0:${rand(0, 360).toFixed(0)}deg`,
    ].join(';')
    p.style.cssText = [
      `--w:${(long ? rand(8, 14) : rand(6, 8)).toFixed(1)}px`,
      `--h:${(long ? rand(5, 7) : rand(6, 8)).toFixed(1)}px`,
      `--c:${COLORS[i % COLORS.length]}`,
      `--flip:${rand(0.6, 1.4).toFixed(2)}s`,
      `--ax:${rand(-0.6, 0.9).toFixed(2)}`,
    ].join(';')
    if (!long && Math.random() < 0.5) p.className = 'round'
    b.append(p)
    wrap.append(b)
  }
  layer.append(wrap)

  return new Promise((resolve) => {
    setTimeout(() => {
      wrap.remove()
      resolve()
    }, duration)
  })
}
