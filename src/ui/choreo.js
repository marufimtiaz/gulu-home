/*
 * Timing rules, in code. The previous sites drifted because steps were chained with
 * setTimeout and CSS animations raced GSAP. Here:
 *
 *   1. Every multi-step moment is ONE timeline from moment(). Sounds, text and state
 *      changes are placed ON it (beat / tl.call) — never in setTimeout.
 *   2. Durations come from T. If two things should feel related they share a T value.
 *   3. Text appears after the motion it describes lands: place it at the previous tween's
 *      end ('>'), not at a guessed absolute time.
 *   4. Navigation / completion happen in the timeline's end (await moment's .then or
 *      onComplete), never on a guessed delay.
 *   5. Reduced motion: moment() compresses the whole timeline (timeScale) instead of each
 *      scene hand-writing a second path, so order and sync are identical either way.
 */
import { gsap } from 'gsap'
import { sound } from '../sound/index.js'
import { reduced } from './motion.js'

/** Shared durations (seconds). Mirrored in tokens.css as --t-* for CSS-only bits. */
export const T = {
  tap: 0.12, // press feedback
  quick: 0.25, // small state changes, hover, toggles
  move: 0.5, // objects travelling across the screen
  reveal: 0.9, // things appearing (cards, light coming on)
  moment: 1.6, // the big beat of a room (door opening, lid popping)
  linger: 2.2, // how long a one-line caption stays before the next beat
}

export const EASE = {
  out: 'power3.out',
  inOut: 'power2.inOut',
  spring: 'back.out(1.7)', // released objects settling
  wobble: 'elastic.out(1, 0.45)',
  land: 'bounce.out',
}

/**
 * A choreographed moment. Returns a paused-free gsap timeline that resolves (as a promise
 * via .then) when finished. Register it for cleanup: ctx.onCleanup(() => tl.kill()).
 */
export function moment(opts = {}) {
  const tl = gsap.timeline(opts)
  if (reduced()) tl.timeScale(4)
  return tl
}

/** Place a sound at a position on a timeline: beat(tl, 'lockClick', '<0.1'). */
export function beat(tl, name, position, opts) {
  return tl.call(() => sound.play(name, opts), [], position)
}

/** Resolve after a timeline (or tween) completes — for `await` in async flows. */
export const done = (tl) => new Promise((resolve) => tl.then(() => resolve()))
