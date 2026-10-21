/*
 * Scenery that answers like what it is. Replaces the one-size hop of feel.poke():
 * every decorative object gets a reaction that matches its material, and — wherever a scene
 * can — a little payoff (a joke, a nickname, a callback) through `steps`.
 *
 *   react(el, kind, opts) → off()
 *
 * kinds (pick by what the object IS):
 *   'sway'     hanging things: lanterns, bulbs, fairy lights, swings, nameplates on twine.
 *              Damped pendulum about the top (opts.origin, default '50% 0%').
 *   'tip'      standing things: pots, mugs, cans, books, chairs. Tilts away from the finger
 *              about its base corner and rocks back.
 *   'spin'     wheels, knobs, fans, the alpana: turns by opts.deg (default 90) with a ratchet.
 *   'ripple'   liquids: broth, water tank, ink. A squash wave through the surface.
 *   'flutter'  paper, curtains, leaves, petals: a quick decaying shiver.
 *   'flicker'  lights: a stutter of brightness, then steady.
 *   'ring'     glass, brass, metal: a tiny fast shake and a pitched ting.
 *   'squish'   soft things: cushions, mats, dough, toadstools. Flattens and puffs back.
 *   'knock'    wood you can't move (doors, fences, frames): a small recoil and a knock.
 *
 * opts:
 *   origin     transform origin (CSS/GSAP syntax, or 'x y' in SVG user units via svgOrigin: true)
 *   svgOrigin  true → treat origin as SVG user units
 *   sound      override the material's sound (null for silent); soundOpts passed to play()
 *   strength   0.4–2, scales the motion (default 1)
 *   steps      [fn(n, e)] — called on the 1st, 2nd, … tap after the motion; the last step repeats.
 *              Use it for escalation and payoffs: 1st look, 2nd meow, 5th walk off.
 *   target     element to animate if different from the tap target (e.g. tap a hitbox, sway a lantern)
 *
 * Everything is reduced-motion aware (motion skipped, sound + steps still run) and
 * overwrite-safe (tapping fast restarts the reaction rather than stacking).
 */
import { gsap } from 'gsap'
import { sound } from '../sound/index.js'
import { haptic } from './feel.js'
import { reduced } from './motion.js'

const SOUNDS = {
  sway: 'tap',
  tip: 'knock',
  spin: 'tick',
  ripple: 'slosh',
  flutter: 'rustle',
  flicker: 'buzz',
  ring: 'ting',
  squish: 'squish',
  knock: 'knock',
}
export const KINDS = Object.keys(SOUNDS)

let tingNote = 0

function motion(kind, el, side, k, o) {
  const origin = o.origin
  const orig = o.svgOrigin ? { svgOrigin: origin } : { transformOrigin: origin }
  const tl = gsap.timeline()
  switch (kind) {
    case 'sway': {
      const a = 14 * k * side
      tl.to(el, { rotation: a, duration: 0.18, ease: 'power2.out', ...(origin ? orig : { transformOrigin: '50% 0%' }) })
        .to(el, { rotation: -a * 0.6, duration: 0.42, ease: 'sine.inOut' })
        .to(el, { rotation: a * 0.3, duration: 0.42, ease: 'sine.inOut' })
        .to(el, { rotation: -a * 0.12, duration: 0.4, ease: 'sine.inOut' })
        .to(el, { rotation: 0, duration: 0.5, ease: 'sine.out' })
      break
    }
    case 'tip': {
      const a = 9 * k * side
      const o2 = origin ? orig : { transformOrigin: side > 0 ? '100% 100%' : '0% 100%' }
      tl.to(el, { rotation: a, duration: 0.12, ease: 'power2.out', ...o2 })
        .to(el, { rotation: -a * 0.35, duration: 0.22, ease: 'power1.inOut' })
        .to(el, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
      break
    }
    case 'spin': {
      const deg = (o.deg ?? 90) * side
      tl.to(el, { rotation: `+=${deg}`, duration: 0.5, ease: 'back.out(2.2)', ...(origin ? orig : { transformOrigin: '50% 50%' }) })
      break
    }
    case 'ripple': {
      const o2 = origin ? orig : { transformOrigin: '50% 100%' }
      tl.to(el, { scaleY: 1 - 0.12 * k, scaleX: 1 + 0.06 * k, duration: 0.12, ease: 'power2.out', ...o2 })
        .to(el, { scaleY: 1 + 0.07 * k, scaleX: 1 - 0.03 * k, duration: 0.2, ease: 'sine.inOut' })
        .to(el, { scaleY: 1 - 0.03 * k, scaleX: 1 + 0.015 * k, duration: 0.2, ease: 'sine.inOut' })
        .to(el, { scaleY: 1, scaleX: 1, duration: 0.3, ease: 'sine.out' })
      break
    }
    case 'flutter': {
      const o2 = origin ? orig : { transformOrigin: '50% 100%' }
      const seq = [6, -5, 4, -3, 2, -1, 0]
      seq.forEach((d, i) => tl.to(el, { rotation: d * k * side, skewX: (d / 2) * k, duration: 0.06 + i * 0.012, ease: 'sine.inOut', ...o2 }))
      break
    }
    case 'flicker': {
      const seq = [0.35, 1, 0.5, 1, 0.8, 1]
      seq.forEach((v) => tl.to(el, { opacity: v, duration: 0.05 + Math.random() * 0.06, ease: 'none' }))
      break
    }
    case 'ring': {
      const o2 = origin ? orig : { transformOrigin: '50% 50%' }
      ;[1.6, -1.4, 1.1, -0.8, 0.5, 0].forEach((d) => tl.to(el, { rotation: d * k, duration: 0.035, ease: 'none', ...o2 }))
      break
    }
    case 'squish': {
      const o2 = origin ? orig : { transformOrigin: '50% 100%' }
      tl.to(el, { scaleY: 1 - 0.22 * k, scaleX: 1 + 0.14 * k, duration: 0.1, ease: 'power2.out', ...o2 })
        .to(el, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1.1, 0.35)' })
      break
    }
    case 'knock': {
      const o2 = origin ? orig : { transformOrigin: '50% 50%' }
      tl.to(el, { x: -2 * k * side, duration: 0.05, ease: 'power2.out', ...o2 }).to(el, { x: 0, duration: 0.25, ease: 'elastic.out(1, 0.5)' })
      break
    }
    default:
      throw new Error(`react: unknown kind "${kind}"`)
  }
  return tl
}

export function react(el, kind, opts = {}) {
  if (!SOUNDS[kind]) throw new Error(`react: unknown kind "${kind}"`)
  const target = opts.target ?? el
  const k = Math.max(0.4, Math.min(2, opts.strength ?? 1))
  let taps = 0
  let tl = null
  el.dataset.react = kind // tests: every piece of scenery declares what it is
  const down = (e) => {
    const r = target.getBoundingClientRect()
    const side = e.clientX < r.left + r.width / 2 ? 1 : -1 // push away from the finger
    const name = opts.sound === undefined ? SOUNDS[kind] : opts.sound
    if (name) sound.play(name, kind === 'ring' ? { i: tingNote++, ...opts.soundOpts } : opts.soundOpts)
    haptic(kind === 'knock' || kind === 'tip' ? 8 : 4)
    if (!reduced()) {
      tl?.kill()
      tl = motion(kind, target, side, k, opts)
    }
    taps++
    const steps = opts.steps
    if (steps?.length) steps[Math.min(taps, steps.length) - 1](taps, e)
  }
  el.addEventListener('pointerdown', down)
  return () => {
    el.removeEventListener('pointerdown', down)
    tl?.kill()
    delete el.dataset.react
  }
}
