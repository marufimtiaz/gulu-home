/*
 * A little paper label that pops up over a piece of scenery when it has something to say
 * (the payoffs: jokes, nicknames, callbacks). One at a time; a new one replaces the old.
 *
 *   const say = sayer(host, { reduced, keep, cls, avoid })   (avoid: an element the label must stay below)
 *   say(text, el | { x, y }, { hold = 2.6, small, below }) → the label element
 *
 * host: the scene's positioned root. The label sits above the point (client coords), kept
 * inside the host. Reduced motion → no travel, same timing.
 */
import { gsap } from 'gsap'

export function sayer(host, { reduced = false, keep = (a) => a, cls = 'say', avoid = null } = {}) {
  let cur = null
  let tl = null
  const clear = () => {
    tl?.kill()
    cur?.remove()
    cur = null
  }
  const say = (text, at, { hold = 2.6, small = '', below = false } = {}) => {
    clear()
    const el = document.createElement('p')
    el.className = `${cls} hand`
    el.setAttribute('role', 'status')
    el.dataset.say = ''
    el.textContent = text
    if (small) {
      const s = document.createElement('small')
      s.textContent = small
      el.append(s)
    }
    host.append(el)
    cur = el
    const hr = host.getBoundingClientRect()
    const p = at instanceof Element ? (() => {
      const r = at.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top }
    })() : at
    const w = el.offsetWidth
    const h = el.offsetHeight
    const m = 10
    const x = Math.max(m, Math.min(hr.width - w - m, p.x - hr.left - w / 2))
    // never over the header (title + prompt): if there's no room above the point, drop below it
    const head = avoid?.getBoundingClientRect()
    const minY = Math.max(m + 48, head && head.height ? head.bottom - hr.top + 8 : 0)
    let y = below ? p.y - hr.top + 12 : p.y - hr.top - h - 12
    if (y < minY) y = Math.max(minY, p.y - hr.top + 24)
    y = Math.min(hr.height - h - m, y)
    el.style.left = `${x.toFixed(0)}px`
    el.style.top = `${y.toFixed(0)}px`
    const d = reduced ? 0.01 : 1
    tl = keep(gsap.timeline({ onComplete: clear }))
    tl.fromTo(el, { opacity: 0, y: 10 * d, scale: reduced ? 1 : 0.7, rotation: -6 * d }, { opacity: 1, y: 0, scale: 1, rotation: -1.5 * d, duration: 0.45, ease: 'back.out(2.4)' })
    tl.to(el, { opacity: 0, y: -14 * d, duration: 0.5, ease: 'power1.in' }, `+=${hold}`)
    return el
  }
  say.clear = clear
  return say
}
