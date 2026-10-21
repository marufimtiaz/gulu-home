/*
 * fireflies(container, { count = 7, gather = true }) → stop()
 *
 * Little warm lights that wander the container on a slow random walk and pulse on their
 * own rhythm. When `gather` is on and a pointer is over the container they drift over and
 * circle it (within ~60 px) — the bday butterflies, inverted: they come to you.
 * Reduced motion → static, dim, no loop.
 */
import { loop, reduced } from '../ui/motion.js'

const rand = (a, b) => a + Math.random() * (b - a)
const TAU = Math.PI * 2

export function fireflies(container, { count = 7, gather = true } = {}) {
  if (!container) return () => {}
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative'

  const still = reduced()
  let w = container.clientWidth || 300
  let h = container.clientHeight || 300
  const flies = []

  for (let i = 0; i < count; i++) {
    const el = document.createElement('i')
    el.className = still ? 'firefly firefly--still' : 'firefly'
    el.setAttribute('aria-hidden', 'true')
    el.style.setProperty('--pulse', `${rand(2, 4).toFixed(2)}s`)
    el.style.setProperty('--delay', `-${rand(0, 4).toFixed(2)}s`)
    const f = {
      el,
      x: rand(0.06, 0.94) * w,
      y: rand(0.08, 0.92) * h,
      heading: rand(0, TAU),
      speed: rand(0.3, 0.8) * 60, // px per second (0.3–0.8 px per frame at 60 fps)
      vx: 0,
      vy: 0,
      orbit: rand(0, TAU),
      orbitR: rand(22, 60),
      orbitSpin: rand(0.6, 1.3) * (Math.random() < 0.5 ? -1 : 1),
      bob: rand(0, TAU),
    }
    place(f)
    container.append(el)
    flies.push(f)
  }

  if (still) return () => flies.forEach((f) => f.el.remove())

  // pointer, in container coordinates; null when away
  let pointer = null
  const onMove = (e) => {
    const r = container.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    pointer = x >= 0 && y >= 0 && x <= r.width && y <= r.height ? { x, y } : null
  }
  const onGone = (e) => {
    if (!e || e.pointerType !== 'mouse') pointer = null
  }
  const onLeave = () => (pointer = null)
  if (gather) {
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    window.addEventListener('pointerup', onGone, { passive: true })
    window.addEventListener('pointercancel', onGone, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
  }

  const measure = () => {
    w = container.clientWidth || w
    h = container.clientHeight || h
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
  ro?.observe(container)

  const stopLoop = loop((dt, now) => {
    const t = now / 1000
    for (const f of flies) {
      let tvx
      let tvy
      if (pointer) {
        // circle the pointer, each on its own ring and direction
        f.orbit += f.orbitSpin * dt
        const tx = pointer.x + Math.cos(f.orbit) * f.orbitR
        const ty = pointer.y + Math.sin(f.orbit) * f.orbitR * 0.8
        const dx = tx - f.x
        const dy = ty - f.y
        const d = Math.hypot(dx, dy) || 1
        const sp = Math.min(220, 30 + d * 1.4)
        tvx = (dx / d) * sp
        tvy = (dy / d) * sp
      } else {
        // slow random walk: the heading meanders, and turns home near the edges
        f.heading += rand(-1, 1) * 2.2 * dt
        const m = 24
        if (f.x < m || f.x > w - m || f.y < m || f.y > h - m) {
          const home = Math.atan2(h / 2 - f.y, w / 2 - f.x)
          let diff = ((home - f.heading + Math.PI * 3) % TAU) - Math.PI
          f.heading += diff * Math.min(1, dt * 2.5)
        }
        tvx = Math.cos(f.heading) * f.speed
        tvy = Math.sin(f.heading) * f.speed
      }
      // ease velocity so changes of mind are soft
      const k = Math.min(1, dt * (pointer ? 2.2 : 1.6))
      f.vx += (tvx - f.vx) * k
      f.vy += (tvy - f.vy) * k
      f.x += f.vx * dt
      f.y += f.vy * dt + Math.sin(t * 1.7 + f.bob) * 0.12
      f.x = Math.min(w + 10, Math.max(-10, f.x))
      f.y = Math.min(h + 10, Math.max(-10, f.y))
      place(f)
    }
  })

  return () => {
    stopLoop()
    ro?.disconnect()
    if (gather) {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('pointerup', onGone)
      window.removeEventListener('pointercancel', onGone)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
    flies.forEach((f) => f.el.remove())
  }
}

function place(f) {
  f.el.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0)`
}
