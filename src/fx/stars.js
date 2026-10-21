/*
 * starfield(container, { count = 60, shooting = false }) → stop()
 *
 * An <svg class="stars"> filling the container. Stars are placed in percentages so the
 * field reflows with the container without re-measuring. ~30% twinkle (CSS, random
 * delays); the brightest few get a warm halo. `shooting` sends a shooting star across the
 * top third every 4–7 s. Reduced motion → no twinkle, no shooting.
 */
import { reduced } from '../ui/motion.js'

const NS = 'http://www.w3.org/2000/svg'
const rand = (a, b) => a + Math.random() * (b - a)
let uid = 0

export function starfield(container, { count = 60, shooting = false } = {}) {
  if (!container) return () => {}
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative'

  const still = reduced()
  const id = `stars-${++uid}`
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('class', 'stars')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.innerHTML = `
    <defs>
      <linearGradient id="${id}-tail" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" style="stop-color: var(--star); stop-opacity: 0"/>
        <stop offset="0.75" style="stop-color: var(--butter); stop-opacity: 0.55"/>
        <stop offset="1" style="stop-color: var(--star); stop-opacity: 1"/>
      </linearGradient>
    </defs>`

  for (let i = 0; i < count; i++) {
    const c = document.createElementNS(NS, 'circle')
    // most stars small; a few bright ones (r skews low)
    const r = 0.6 + Math.pow(Math.random(), 2.2) * 1.2
    // denser towards the top of the sky
    const y = Math.pow(Math.random(), 1.35) * 100
    const o = (0.45 + (r - 0.6) / 1.2 * 0.55).toFixed(2)
    c.setAttribute('cx', `${rand(0.5, 99.5).toFixed(2)}%`)
    c.setAttribute('cy', `${y.toFixed(2)}%`)
    c.setAttribute('r', r.toFixed(2))
    c.setAttribute('opacity', o)
    c.style.setProperty('--o', o)
    let cls = r > 1.45 ? 'star--glow' : ''
    if (!still && Math.random() < 0.3) {
      cls += ' star--twinkle'
      c.style.setProperty('--tw', `${rand(2.2, 5).toFixed(2)}s`)
      c.style.setProperty('--delay', `-${rand(0, 5).toFixed(2)}s`)
    }
    if (cls.trim()) c.setAttribute('class', cls.trim())
    svg.append(c)
  }
  container.append(svg)

  let timer = 0
  let stopped = false
  const anims = new Set()

  const shoot = () => {
    if (stopped) return
    if (!document.hidden && typeof Element.prototype.animate === 'function') {
      const w = container.clientWidth || 390
      const h = container.clientHeight || 844
      const len = rand(70, 120)
      const dir = Math.random() < 0.5 ? 1 : -1 // left→right or right→left
      const angle = rand(12, 26) * (Math.PI / 180)
      const x0 = dir > 0 ? rand(0.05, 0.5) * w : rand(0.5, 0.95) * w
      const y0 = rand(0.03, 0.2) * h
      const dist = rand(0.35, 0.6) * w + 120
      const dx = Math.cos(angle) * dist * dir
      const dy = Math.sin(angle) * dist
      const deg = (Math.atan2(dy, dx) * 180) / Math.PI

      const g = document.createElementNS(NS, 'g')
      g.setAttribute('class', 'shooting')
      g.innerHTML = `
        <g transform="rotate(${deg.toFixed(1)})">
          <line x1="${-len}" y1="0" x2="0" y2="0" stroke="url(#${id}-tail)" stroke-width="1.8" stroke-linecap="round"/>
          <ellipse cx="0" cy="0" rx="1.9" ry="1.9" class="star--glow" style="fill: var(--star)"/>
        </g>`
      svg.append(g)
      const dur = rand(900, 1300)
      const a = g.animate(
        [
          { transform: `translate(${x0}px, ${y0}px)`, opacity: 0 },
          { opacity: 1, offset: 0.15 },
          { opacity: 1, offset: 0.7 },
          { transform: `translate(${x0 + dx}px, ${y0 + dy}px)`, opacity: 0 },
        ],
        { duration: dur, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'both' },
      )
      anims.add(a)
      a.onfinish = () => {
        anims.delete(a)
        g.remove()
      }
    }
    timer = setTimeout(shoot, rand(4000, 7000))
  }
  if (shooting && !still) timer = setTimeout(shoot, rand(1200, 3000))

  return () => {
    stopped = true
    clearTimeout(timer)
    anims.forEach((a) => a.cancel())
    svg.remove()
  }
}
