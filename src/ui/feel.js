/*
 * Making things feel touchable. Every scene uses these for its interactive objects.
 *
 *   press(el, { sound, scale })     instant squash on pointerdown (<100 ms), spring back on release
 *   poke(el, { sound })             DEPRECATED — use react() from ui/react.js (material-specific reactions)
 *   nudge(targets, { after })       if she's idle for `after` ms, gently draw her to the next thing;
 *                                   returns { stop(), reset(), set(targets) } — call set() as the
 *                                   "next thing" changes, stop() once it no longer applies
 *   wobble(el)                      slow idle sway that says "I can be dragged"
 *   haptic(ms | pattern)            short vibration where supported (Android); silent elsewhere
 *
 * All return cleanup functions (or objects with stop()) — hand them to ctx.onCleanup.
 */
import { gsap } from 'gsap'
import { sound } from '../sound/index.js'
import { sparkles } from '../fx/index.js'
import { reduced } from './motion.js'

export function haptic(pattern = 8) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}

/** Press feedback. Works alongside onDrag/onRotate/click handlers on the same element. */
export function press(el, { sound: name = 'tap', scale = 0.93 } = {}) {
  const down = () => {
    if (name) sound.play(name)
    haptic(6)
    if (!reduced()) gsap.to(el, { scale, duration: 0.08, ease: 'power2.out', overwrite: 'auto' })
  }
  const up = () => {
    if (!reduced()) gsap.to(el, { scale: 1, duration: 0.45, ease: 'elastic.out(1.1, 0.45)', overwrite: 'auto' })
  }
  el.addEventListener('pointerdown', down)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)
  el.addEventListener('pointerleave', up)
  return () => {
    el.removeEventListener('pointerdown', down)
    el.removeEventListener('pointerup', up)
    el.removeEventListener('pointercancel', up)
    el.removeEventListener('pointerleave', up)
  }
}

/** Decorative reaction for scenery: tap → hop + a few sparkles. Doesn't block other handlers. */
export function poke(el, { sound: name = 'pop' } = {}) {
  const tap = (e) => {
    sound.play(name)
    haptic(5)
    if (reduced()) return
    gsap.timeline({ overwrite: 'auto' })
      .to(el, { y: -6, scaleY: 1.06, scaleX: 0.96, duration: 0.12, ease: 'power2.out', transformOrigin: '50% 100%' })
      .to(el, { y: 0, scaleY: 1, scaleX: 1, duration: 0.5, ease: 'bounce.out' })
    sparkles(e.clientX, e.clientY, { count: 6 })
  }
  el.addEventListener('pointerdown', tap)
  return () => el.removeEventListener('pointerdown', tap)
}

/** Slow idle sway for draggable things. Pauses while the element is being pressed. */
export function wobble(el, { deg = 3, period = 2.4 } = {}) {
  if (reduced()) return () => {}
  const tw = gsap.to(el, { rotation: deg, duration: period / 2, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 80%' })
  gsap.set(el, { rotation: -deg })
  const pause = () => tw.pause()
  const resume = () => tw.resume()
  el.addEventListener('pointerdown', pause)
  window.addEventListener('pointerup', resume)
  return () => {
    tw.kill()
    gsap.set(el, { rotation: 0 })
    el.removeEventListener('pointerdown', pause)
    window.removeEventListener('pointerup', resume)
  }
}

/**
 * Idle guidance. After `after` ms with no pointer activity anywhere, the current target(s)
 * hint in the room's own language, repeating every `every` ms until she touches something.
 * Any pointerdown resets the idle clock and removes the hint.
 *
 *   style  how the hint looks — pick what fits the object, don't default to bouncing:
 *     'glow'     (default) a warm halo breathes on (CSS class `nudge`)
 *     'glint'    a quick light sweep across it (metal, glass, the door knob)
 *     'rattle'   a short shake in place (jar lids, locks, boxes)
 *     'sway'     swings once from its top (chains, lanterns, tags)
 *     'twinkle'  brightens and dims twice (stars, lights)
 *     'hop'      the old bounce — only for things that would really hop
 *     fn(el)     your own GSAP timeline factory
 *   arrow  true → from the 3rd hint on, a hand-drawn arrow scribbles itself in pointing at the
 *          first target (for when she's genuinely stuck). Removed the moment she touches anything.
 */
export function nudge(targets, { after = 4000, every = 3200, style = 'glow', arrow = false } = {}) {
  let list = toList(targets)
  let timer = 0
  let stopped = false
  let fired = 0
  let arrowEl = null
  const hint = (el) => {
    el.classList.add('nudge')
    if (reduced()) return
    if (typeof style === 'function') return style(el)
    const tl = gsap.timeline()
    if (style === 'glint') {
      el.classList.add('nudge--glint')
      tl.call(() => el.classList.remove('nudge--glint'), [], 0.9)
    } else if (style === 'rattle') {
      ;[3, -3, 2, -2, 1, 0].forEach((d) => tl.to(el, { rotation: d, duration: 0.05, transformOrigin: '50% 80%', ease: 'none' }))
    } else if (style === 'sway') {
      tl.to(el, { rotation: 7, duration: 0.3, transformOrigin: '50% 0%', ease: 'sine.out' })
        .to(el, { rotation: -4, duration: 0.5, ease: 'sine.inOut' })
        .to(el, { rotation: 0, duration: 0.6, ease: 'sine.out' })
    } else if (style === 'twinkle') {
      tl.to(el, { opacity: 0.45, duration: 0.18 }).to(el, { opacity: 1, duration: 0.25 }).to(el, { opacity: 0.6, duration: 0.18 }).to(el, { opacity: 1, duration: 0.3 })
    } else if (style === 'hop') {
      tl.to(el, { y: -8, duration: 0.18, ease: 'power2.out' }).to(el, { y: 0, duration: 0.6, ease: 'bounce.out' })
    }
    return tl
  }
  const drawArrow = () => {
    const el = list[0]
    const layer = document.getElementById('fx-layer')
    if (!el || !layer || arrowEl) return
    const r = el.getBoundingClientRect()
    // come in from the side with more room, aim at the near edge
    const fromLeft = r.left + r.width / 2 > innerWidth / 2
    const tipX = fromLeft ? r.left - 6 : r.right + 6
    const tipY = r.top + r.height / 2
    const sx = fromLeft ? tipX - 70 : tipX + 70
    const sy = tipY - 46
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'nudge-arrow')
    svg.setAttribute('width', innerWidth)
    svg.setAttribute('height', innerHeight)
    const head = fromLeft ? `M${tipX - 11} ${tipY - 9} L${tipX} ${tipY} L${tipX - 13} ${tipY + 3}` : `M${tipX + 11} ${tipY - 9} L${tipX} ${tipY} L${tipX + 13} ${tipY + 3}`
    svg.innerHTML = `<path pathLength="1" d="M${sx} ${sy} C${(sx + tipX) / 2} ${sy - 18} ${tipX + (fromLeft ? -30 : 30)} ${tipY - 30} ${tipX} ${tipY}"/><path pathLength="1" d="${head}"/>`
    layer.append(svg)
    arrowEl = svg
    const paths = svg.querySelectorAll('path')
    gsap.fromTo(paths, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: reduced() ? 0 : 0.5, stagger: 0.35, ease: 'power1.inOut' })
  }
  const clearArrow = () => {
    arrowEl?.remove()
    arrowEl = null
  }
  const fire = () => {
    if (stopped) return
    fired++
    for (const el of list) hint(el)
    if (arrow && fired >= 3) drawArrow()
    timer = setTimeout(fire, every)
  }
  const reset = () => {
    clearTimeout(timer)
    fired = 0
    clearArrow()
    for (const el of list) el.classList.remove('nudge', 'nudge--glint')
    if (!stopped && list.length) timer = setTimeout(fire, after)
  }
  window.addEventListener('pointerdown', reset, { capture: true })
  reset()
  return {
    reset,
    set(next) {
      for (const el of list) el.classList.remove('nudge', 'nudge--glint')
      list = toList(next)
      reset()
    },
    stop() {
      stopped = true
      clearTimeout(timer)
      clearArrow()
      for (const el of list) el.classList.remove('nudge', 'nudge--glint')
      window.removeEventListener('pointerdown', reset, { capture: true })
    },
  }
}

const toList = (t) => (!t ? [] : t instanceof Element ? [t] : [...t])
