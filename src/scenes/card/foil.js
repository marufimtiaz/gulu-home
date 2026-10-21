/*
 * foil(el) → stop()
 *
 * Gold foil that catches the light. A specular band slides across every gold element inside
 * `el` as the pointer moves (desktop) or the phone tilts (deviceorientation). When nothing
 * moves for a while the light drifts on its own, slowly, so the gold never looks printed flat.
 *
 * Writes CSS vars on `el`:  --fx, --fy  (0%…100%) — HTML gold text uses them as its
 * background-position; and slides the gradientTransform of every `linearGradient[data-foil]`
 * (SVG gold) by the same amount, so the whole card shines as one sheet of foil.
 *
 * iOS asks permission for motion: we ask only after a tap (`pointerup`), once, and silently
 * carry on with pointer + drift if it's refused. Reduced motion: a fixed, static highlight.
 * `paused()` (optional) skips frames — e.g. while big moves run, or while the card is closed.
 */
import { loop, reduced as prefersReduced } from '../../ui/motion.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export const STILL = { x: 24, y: 20 } // reduced motion: one fixed glint
export const PARKED = { x: 6, y: 8 } // the saved PNG: the glint parked at the top-left edge

/** Paint the highlight at (x, y) percent onto el and its SVG gradients. */
export function paintFoil(el, x, y) {
  el.style.setProperty('--fx', `${x.toFixed(1)}%`)
  el.style.setProperty('--fy', `${y.toFixed(1)}%`)
  // the band sits at the gradient's middle; slide it ±60% of the span
  const ox = (x / 100 - 0.5) * 1.2
  const oy = (y / 100 - 0.5) * 1.2
  for (const g of el.querySelectorAll('linearGradient[data-foil]')) {
    const w = +g.dataset.w || 100
    const h = +g.dataset.h || 100
    g.setAttribute('gradientTransform', `translate(${(ox * w).toFixed(1)} ${(oy * h).toFixed(1)})`)
  }
}

export function foil(el, { reduced = prefersReduced(), paused = () => false } = {}) {
  if (!el) return () => {}
  if (reduced) {
    paintFoil(el, STILL.x, STILL.y)
    return () => {}
  }

  let x = 50, y = 40 // shown
  let tx = 50, ty = 40 // target
  let lastInput = -1e9

  // the phone's tilt leads on touch screens — except while her finger is on the glass: then the
  // light follows the finger (and lingers there a moment after she lets go)
  let fingerUntil = 0
  const onMove = (e) => {
    tx = clamp((e.clientX / innerWidth) * 100, 0, 100)
    ty = clamp((e.clientY / innerHeight) * 100, 0, 100)
    lastInput = performance.now()
    if (e.pointerType === 'touch') fingerUntil = lastInput + 1400
  }
  const onTilt = (e) => {
    if (e.gamma == null || e.beta == null) return
    if (performance.now() < fingerUntil) return
    // gamma: left/right −90…90; beta: front/back, ~45° when held to read
    tx = clamp(50 + e.gamma * 1.6, 0, 100)
    ty = clamp(50 + (e.beta - 45) * 1.3, 0, 100)
    lastInput = performance.now()
  }
  const listenTilt = () => window.addEventListener('deviceorientation', onTilt)

  // iOS 13+: permission must be requested from a user gesture
  const DOE = typeof window !== 'undefined' ? window.DeviceOrientationEvent : undefined
  const needsAsk = typeof DOE?.requestPermission === 'function'
  const ask = () => {
    window.removeEventListener('pointerup', ask)
    DOE.requestPermission()
      .then((r) => r === 'granted' && listenTilt())
      .catch(() => {}) // refused or unavailable → pointer + drift only
  }
  if (needsAsk) window.addEventListener('pointerup', ask)
  else if (DOE) listenTilt()

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onMove, { passive: true })

  let px = -1, py = -1, acc = 0
  const stopLoop = loop((dt, now) => {
    if (paused()) return
    acc += dt
    if (acc < 1 / 30) return // 30 fps is plenty for a glint, and halves the repaints
    dt = acc
    acc = 0
    if (now - lastInput > 2600) {
      // idle: a slow figure-of-eight drift
      tx = 50 + Math.sin(now / 2300) * 42
      ty = 42 + Math.sin(now / 1700) * 22
    }
    const k = Math.min(1, dt * 5)
    x += (tx - x) * k
    y += (ty - y) * k
    if (Math.abs(x - px) < 0.08 && Math.abs(y - py) < 0.08) return
    px = x
    py = y
    paintFoil(el, x, y)
  })

  return () => {
    stopLoop()
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onMove)
    window.removeEventListener('pointerup', ask)
    window.removeEventListener('deviceorientation', onTilt)
  }
}
