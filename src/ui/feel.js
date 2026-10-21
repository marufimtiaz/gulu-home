/*
 * Making things feel touchable. Every scene uses these for its interactive objects.
 *
 *   press(el, { sound, scale })     instant squash on pointerdown (<100 ms), spring back on release
 *   poke(el, { sound })             decorative tap reaction: bounce + sparkle (for "tap anything")
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
 * bounce and glow (adds class `nudge` for CSS glow), repeating every `every` ms until she
 * touches something. Any pointerdown resets the idle clock.
 */
export function nudge(targets, { after = 4000, every = 3200 } = {}) {
  let list = toList(targets)
  let timer = 0
  let stopped = false
  const fire = () => {
    if (stopped) return
    for (const el of list) {
      el.classList.add('nudge')
      if (!reduced()) {
        gsap.timeline()
          .to(el, { y: -8, duration: 0.18, ease: 'power2.out' })
          .to(el, { y: 0, duration: 0.6, ease: 'bounce.out' })
      }
    }
    timer = setTimeout(fire, every)
  }
  const reset = () => {
    clearTimeout(timer)
    for (const el of list) el.classList.remove('nudge')
    if (!stopped && list.length) timer = setTimeout(fire, after)
  }
  window.addEventListener('pointerdown', reset, { capture: true })
  reset()
  return {
    reset,
    set(next) {
      for (const el of list) el.classList.remove('nudge')
      list = toList(next)
      reset()
    },
    stop() {
      stopped = true
      clearTimeout(timer)
      for (const el of list) el.classList.remove('nudge')
      window.removeEventListener('pointerdown', reset, { capture: true })
    },
  }
}

const toList = (t) => (!t ? [] : t instanceof Element ? [t] : [...t])
