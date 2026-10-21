/*
 * fireworks(container, { duration = 6000 }) → Promise<void>
 *
 * Ported from the bday site's Fireworks class: rockets launch from the bottom, burst high
 * in rings of coloured spark streaks that slow, droop and fade (soft trails come from fading
 * the canvas each frame rather than clearing it). Colours are the site tokens
 * (--berry, --mustard, --pink, --sky, --butter), read from the root at call time. A canvas is
 * appended to the container; launches stop in time for the last sparks to fade, then the
 * canvas is removed and the promise resolves at `duration`.
 * Reduced motion → three still bursts, held briefly, then resolve (well under 1 s).
 *
 * Stopping early: the returned promise has .stop() (removes the canvas at once and resolves),
 * and fireworks(el, { signal }) does the same when the AbortSignal fires. Scenes call it on
 * unmount: ctx.onCleanup(() => show.stop()).
 */
import { loop, reduced } from '../ui/motion.js'

const rand = (a, b) => a + Math.random() * (b - a)
const TOKENS = ['--berry', '--mustard', '--pink', '--sky', '--butter']
const FALLBACK = { '--berry': '#c2254d', '--mustard': '#f2b134', '--pink': '#f3b6cf', '--sky': '#a9d6e5', '--butter': '#fbe3a4', '--star': '#fff7e0' }
const GRAVITY = 640 // rocket gravity, tuned for a ~1.3 s ascent

function token(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || FALLBACK[name]
}

function hexToRgb(hex) {
  const m = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(hex)
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// [core, light] per colour; the light tint is the colour mixed toward starlight
function palettes() {
  const star = hexToRgb(token('--star')) ?? [255, 247, 224]
  return TOKENS.map((t) => {
    const c = token(t)
    const rgb = hexToRgb(c)
    if (!rgb) return [c, c]
    const light = rgb.map((v, i) => Math.round(v + (star[i] - v) * 0.55))
    return [c, `rgb(${light.join(',')})`]
  })
}

/** A resolved promise that still has the .stop() handle, so callers never need to check. */
const settled = () => Object.assign(Promise.resolve(), { stop() {} })

export function fireworks(container, { duration = 6000, signal } = {}) {
  if (!container || signal?.aborted) return settled()
  if (container !== document.body && getComputedStyle(container).position === 'static') container.style.position = 'relative'

  const canvas = document.createElement('canvas')
  canvas.className = 'fireworks'
  canvas.setAttribute('aria-hidden', 'true')
  if (container === document.body) Object.assign(canvas.style, { position: 'fixed', zIndex: 'var(--z-fx)' })
  container.append(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return settled()
  }

  // one exit for every way this ends: natural finish, .stop(), or the abort signal
  let finish = null
  let ended = false
  const timers = []
  let stopLoop = () => {}
  const end = () => {
    if (ended) return
    ended = true
    timers.forEach(clearTimeout)
    stopLoop()
    removeEventListener('resize', resize)
    signal?.removeEventListener('abort', end)
    canvas.remove()
    finish?.()
  }
  const show = (promise) => {
    signal?.addEventListener('abort', end, { once: true })
    return Object.assign(promise, { stop: end })
  }

  let w = 0
  let h = 0
  const resize = () => {
    const r = container === document.body ? { width: innerWidth, height: innerHeight } : container.getBoundingClientRect()
    const dpr = Math.min(devicePixelRatio || 1, 2)
    w = Math.max(1, r.width)
    h = Math.max(1, r.height)
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()

  const colors = palettes()
  const starColor = token('--star')
  const pal = () => colors[Math.floor(Math.random() * colors.length)]
  const rockets = []
  const sparks = []

  const explode = (x, y, palette, still = false) => {
    const count = still ? 54 : Math.round(rand(64, 86))
    const base = rand(220, 320) * Math.min(1, Math.max(0.6, w / 900))
    const twoRings = Math.random() < 0.5
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + rand(-0.04, 0.04)
      const sp = base * (twoRings && i % 2 ? 0.6 : 1) * rand(0.85, 1.12)
      sparks.push({
        x,
        y,
        px: x,
        py: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        decay: rand(0.42, 0.68),
        size: rand(1.6, 2.8),
        color: i % 3 === 0 ? palette[1] : palette[0],
        gravity: 70,
        glitter: Math.random() < 0.25,
      })
    }
  }

  const launch = () => {
    const frac = rand(0.18, 0.82)
    const targetY = rand(h * 0.1, h * 0.32)
    const x = w * frac
    const vy = -Math.sqrt(2 * GRAVITY * (h - targetY))
    rockets.push({ x, y: h, px: x, py: h, vx: rand(-20, 20), vy, targetY, palette: pal() })
  }

  const draw = () => {
    // fade what was drawn instead of wiping it — leaves soft comet tails on the transparent canvas
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0,0,0,0.26)'
    ctx.fillRect(0, 0, w, h)

    // rockets: a thin warm streak with a bright head
    ctx.globalCompositeOperation = 'source-over'
    for (const r of rockets) {
      ctx.globalAlpha = 1
      ctx.lineCap = 'butt'
      ctx.strokeStyle = r.palette[1]
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(r.px, r.py)
      ctx.lineTo(r.x, r.y)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = starColor
      ctx.beginPath()
      ctx.arc(r.x, r.y, 0.9, 0, Math.PI * 2) // no wider than the streak, or the fade leaves beads
      ctx.fill()
    }

    ctx.lineCap = 'round'
    // sparks: coloured streaks (source-over keeps the colour — additive blew it out to white)
    for (const s of sparks) {
      const a = Math.max(s.life, 0)
      const flick = s.glitter && a < 0.55 ? (Math.random() < 0.5 ? 0.2 : 1) : 1
      ctx.globalAlpha = Math.min(1, a * 1.15) * flick
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.size * (0.5 + a * 0.5)
      ctx.beginPath()
      ctx.moveTo(s.px, s.py)
      ctx.lineTo(s.x, s.y)
      ctx.stroke()
    }

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  if (reduced()) {
    // three still bursts, drawn once
    ;[0.27, 0.5, 0.73].forEach((f, i) => {
      const x = w * f
      const y = h * (i === 1 ? 0.2 : 0.28)
      explode(x, y, colors[(i * 2) % colors.length], true)
    })
    for (const s of sparks) {
      const t = rand(0.35, 0.6)
      s.x += s.vx * t
      s.y += s.vy * t
      s.px = s.x - s.vx * 0.05
      s.py = s.y - s.vy * 0.05
      s.life = rand(0.6, 1)
    }
    draw()
    return show(
      new Promise((resolve) => {
        finish = resolve
        timers.push(setTimeout(end, Math.min(400, duration)))
      }),
    )
  }

  addEventListener('resize', resize, { passive: true })
  const start = performance.now()
  const quietAt = Math.max(700, duration - 1900) // stop launching so the last sparks can fade
  let nextAt = start + 120
  stopLoop = loop((dt, now) => {
    if (now >= nextAt && now - start < quietAt) {
      launch()
      if (Math.random() < 0.25) launch() // the odd double
      nextAt = now + rand(400, 700)
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]
      r.px = r.x
      r.py = r.y
      r.vy += GRAVITY * dt
      r.x += r.vx * dt
      r.y += r.vy * dt
      if (r.y <= r.targetY || r.vy >= 0) {
        explode(r.x, r.y, r.palette)
        rockets.splice(i, 1)
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]
      s.px = s.x
      s.py = s.y
      s.vx *= 0.982
      s.vy = s.vy * 0.982 + s.gravity * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.life -= s.decay * dt
      if (s.life <= 0) sparks.splice(i, 1)
    }
    draw()
  })

  return show(
    new Promise((resolve) => {
      finish = resolve
      timers.push(setTimeout(() => canvas.classList.add('fireworks--out'), Math.max(0, duration - 450)))
      timers.push(setTimeout(end, duration))
    }),
  )
}
