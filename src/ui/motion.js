/** True when the user asked the OS for less motion. Scenes and fx must honour it. */
export const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** rAF loop that pauses while the tab is hidden. fn(dtSeconds, nowMs). Returns stop(). */
export function loop(fn) {
  let id = 0
  let last = performance.now()
  let stopped = false
  const frame = (now) => {
    if (stopped) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    fn(dt, now)
    id = requestAnimationFrame(frame)
  }
  const onVis = () => {
    if (document.hidden) cancelAnimationFrame(id)
    else if (!stopped) {
      last = performance.now()
      id = requestAnimationFrame(frame)
    }
  }
  document.addEventListener('visibilitychange', onVis)
  id = requestAnimationFrame(frame)
  return () => {
    stopped = true
    cancelAnimationFrame(id)
    document.removeEventListener('visibilitychange', onVis)
  }
}
