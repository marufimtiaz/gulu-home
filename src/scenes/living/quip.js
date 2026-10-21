/*
 * A paper speech-tag that pops beside the thing she just tapped — how this room's scenery
 * answers back (payoffs, jokes, nicknames). One at a time: a new one replaces the last.
 *
 *   const quip = makeQuip(root)
 *   quip.say(text, anchorEl | { x, y })   anchor = element or a client point
 *   quip.kill()                           on unmount
 *
 * Sits above the anchor (below it if there is no room under the chips), clamped to the
 * screen, with its tail pointing at the thing. Reduced motion: no pop, same hold.
 */
import { gsap } from 'gsap'
import { reduced } from '../../ui/motion.js'

export function makeQuip(root, { hold = 2.4, top = 64 } = {}) {
  const el = document.createElement('p')
  el.className = 'quip hand'
  el.setAttribute('aria-live', 'polite')
  el.hidden = true
  root.append(el)
  let tl = null

  function say(text, at) {
    if (!text) return
    const r = at?.getBoundingClientRect ? at.getBoundingClientRect() : { left: at.x, right: at.x, top: at.y, bottom: at.y, width: 0 }
    const rr = root.getBoundingClientRect()
    tl?.kill()
    el.textContent = text
    el.hidden = false
    el.classList.remove('quip--below')
    gsap.set(el, { clearProps: 'transform,opacity,visibility' })
    const w = el.offsetWidth
    const h = el.offsetHeight
    const cx = r.left + r.width / 2
    const x = Math.max(rr.left + 8, Math.min(rr.right - 8 - w, cx - w / 2))
    let y = r.top - h - 14
    const below = y < rr.top + top
    if (below) y = Math.min(r.bottom + 14, rr.bottom - h - 8)
    el.classList.toggle('quip--below', below)
    el.style.left = `${(x - rr.left).toFixed(1)}px`
    el.style.top = `${(y - rr.top).toFixed(1)}px`
    const tail = Math.max(14, Math.min(w - 14, cx - x))
    el.style.setProperty('--tail', `${tail.toFixed(1)}px`)
    const origin = `${tail}px ${below ? '0%' : '100%'}`
    const tilt = (Math.random() - 0.5) * 5
    tl = gsap.timeline({ onComplete: () => (el.hidden = true) })
    if (reduced()) {
      tl.set(el, { autoAlpha: 1, rotation: tilt }).set(el, { autoAlpha: 0 }, hold + 0.4)
    } else {
      tl.fromTo(el, { autoAlpha: 0, scale: 0.5, rotation: tilt - 8, y: below ? -8 : 8, transformOrigin: origin }, { autoAlpha: 1, scale: 1, rotation: tilt, y: 0, duration: 0.38, ease: 'back.out(2.4)' })
        .to(el, { autoAlpha: 0, y: below ? 6 : -6, duration: 0.3, ease: 'power1.in' }, `+=${hold}`)
    }
    return tl
  }

  return {
    say,
    el,
    kill() {
      tl?.kill()
      el.remove()
    },
  }
}
