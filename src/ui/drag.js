/*
 * Pointer helpers shared by every scene. All use Pointer Events with pointer capture, so
 * they work for mouse, touch and pen. Give dragged elements `touch-action: none` in CSS.
 * Every helper returns off() — call it in unmount (or pass it to ctx.onCleanup).
 */

/**
 * onDrag(el, { onStart(p,e), onMove(p,e), onEnd(p,e) })
 * p = { x, y, dx, dy, vx, vy }  — client coords, offset from start, velocity in px/s
 * onStart may return false to ignore this pointer.
 */
export function onDrag(el, { onStart, onMove, onEnd } = {}) {
  let id = null
  let sx = 0, sy = 0, lx = 0, ly = 0, lt = 0, vx = 0, vy = 0
  const point = (e) => ({ x: e.clientX, y: e.clientY, dx: e.clientX - sx, dy: e.clientY - sy, vx, vy })
  const down = (e) => {
    if (id !== null || (e.button !== undefined && e.button > 0)) return
    sx = lx = e.clientX
    sy = ly = e.clientY
    lt = performance.now()
    vx = vy = 0
    if (onStart?.(point(e), e) === false) return
    id = e.pointerId
    el.setPointerCapture?.(id)
    e.preventDefault()
  }
  const move = (e) => {
    if (e.pointerId !== id) return
    const now = performance.now()
    const dt = Math.max(1, now - lt) / 1000
    vx = 0.8 * ((e.clientX - lx) / dt) + 0.2 * vx
    vy = 0.8 * ((e.clientY - ly) / dt) + 0.2 * vy
    lx = e.clientX
    ly = e.clientY
    lt = now
    onMove?.(point(e), e)
  }
  const up = (e) => {
    if (e.pointerId !== id) return
    if (performance.now() - lt > 80) vx = vy = 0 // finger stopped before lifting
    id = null
    onEnd?.(point(e), e)
  }
  el.addEventListener('pointerdown', down)
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)
  return () => {
    el.removeEventListener('pointerdown', down)
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
    el.removeEventListener('pointercancel', up)
  }
}

/**
 * onRotate(el, { center: () => ({x,y}), onStart(angle), onRotate(delta, angle), onEnd(velocity) })
 * Angles in radians, clockwise positive (screen coords). delta is unwrapped (no ±2π jumps).
 * velocity is rad/s at release (0 if the finger paused).
 */
export function onRotate(el, { center, onStart, onRotate: rotate, onEnd } = {}) {
  let prev = 0, lt = 0, vel = 0, c = { x: 0, y: 0 }
  const angleOf = (p) => Math.atan2(p.y - c.y, p.x - c.x)
  return onDrag(el, {
    onStart(p, e) {
      c = center ? center() : rectCenter(el)
      prev = angleOf(p)
      lt = performance.now()
      vel = 0
      return onStart?.(prev, e)
    },
    onMove(p) {
      const a = angleOf(p)
      let d = a - prev
      if (d > Math.PI) d -= 2 * Math.PI
      if (d < -Math.PI) d += 2 * Math.PI
      const now = performance.now()
      vel = 0.7 * (d / (Math.max(1, now - lt) / 1000)) + 0.3 * vel
      lt = now
      prev = a
      rotate?.(d, a)
    },
    onEnd() {
      if (performance.now() - lt > 80) vel = 0
      onEnd?.(vel)
    },
  })
}

/**
 * onHold(el, { onStart(), onTick(dtMs, totalMs), onEnd(totalMs) })
 * Ticks every animation frame while a pointer is held down on el.
 * totalMs accumulates across separate holds until resetHold() is called.
 */
export function onHold(el, { onStart, onTick, onEnd } = {}) {
  let raf = 0, last = 0, total = 0, held = false
  const tick = (now) => {
    if (!held) return
    const dt = now - last
    last = now
    total += dt
    onTick?.(dt, total)
    raf = requestAnimationFrame(tick)
  }
  const off = onDrag(el, {
    onStart() {
      held = true
      last = performance.now()
      onStart?.()
      raf = requestAnimationFrame(tick)
    },
    onEnd() {
      held = false
      cancelAnimationFrame(raf)
      onEnd?.(total)
    },
  })
  const stop = () => {
    held = false
    cancelAnimationFrame(raf)
    off()
  }
  stop.reset = () => (total = 0)
  return stop
}

export function rectCenter(el) {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/** Is client point (x,y) inside el's box, grown by pad px? */
export function hit(el, x, y, pad = 0) {
  const r = el.getBoundingClientRect()
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad
}
