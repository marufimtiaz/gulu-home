/*
 * The study's scenery answers a tap like what it is (the lamp, chain, envelope and stamp are
 * the room's operated things and live in index.js):
 *
 *   books      the stack shifts; from the 2nd tap a book slides out, titled with one of her
 *              names ("Sensitive" — a memoir, "How to Be a Topper", by Gulu …)
 *   inkpot     the ink ripples; every 3rd tap a drop jumps out and leaves a heart-ish blot
 *   pen        rattles in the pot; every 3rd tap it tips out, rolls, and stops teetering at
 *              the desk's edge ("phew"); the next tap pops it back in
 *   drawer     sticks (rattle) — then slides open on the next tap: what's inside (cycles)
 *   desk       knock-knock: a running joke, one line per knock ("Orangotang er bou …")
 *   shutters   swing on their hinges with a creak
 *   moon       ducks behind the rooftops and peeks back up; every 2nd time a line
 *   sill plant flutters
 *
 * Every element carries data-react (react() sets it; bespoke handlers set it here).
 */
import { gsap } from 'gsap'
import { react } from '../../ui/react.js'
import { haptic } from '../../ui/feel.js'
import { HEART } from './art.js'

export function scenery(root, ctx, { quip }) {
  const { t, sound, reduced } = ctx
  const offs = []
  const live = new Set()
  const G = (x) => (live.add(x), x)
  const $ = (s) => root.querySelector(s)
  const line = (key, k) => {
    const list = t(`desk.${key}`)
    return Array.isArray(list) ? list[k % list.length] : list
  }
  const bespoke = (el, kind, fn) => {
    el.dataset.react = kind
    const down = (e) => {
      haptic(kind === 'knock' || kind === 'tip' ? 8 : 4)
      fn(e)
    }
    el.addEventListener('pointerdown', down)
    offs.push(() => {
      el.removeEventListener('pointerdown', down)
      delete el.dataset.react
    })
  }
  const counter = () => {
    let n = 0
    return () => ++n
  }

  // ── books: one slides out with a title ──
  const books = $('[data-poke="books"]')
  const bookEls = [...books.querySelectorAll('[data-book]')]
  const bookTap = counter()
  let titles = 0
  bespoke(books, 'tip', () => {
    const n = bookTap()
    sound.play('knock')
    if (n < 2) {
      if (!reduced) G(gsap.timeline().to(bookEls[2], { x: 3, rotation: -4, svgOrigin: '6 209', duration: 0.1 }).to(bookEls[2], { x: 0, rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }))
      return
    }
    const k = titles++
    const b = bookEls[k % bookEls.length]
    sound.play('paper')
    if (!reduced) {
      gsap.killTweensOf(b)
      G(gsap.timeline().to(b, { x: 22, duration: 0.3, ease: 'power2.out' }).to(b, { x: 0, duration: 0.5, ease: 'power2.inOut' }, '+=2'))
    }
    quip.say(line('books', k), b)
  })

  // ── inkpot: ripples; every 3rd tap a drop jumps out and blots ──
  const inkpot = $('[data-poke="inkpot"]')
  const blots = $('[data-blots]')
  const NS = 'http://www.w3.org/2000/svg'
  let blotN = 0
  offs.push(
    react(inkpot, 'ripple', {
      target: $('[data-ink]'),
      origin: '50% 50%',
      strength: 2,
      steps: [
        (n) => {
          if (n % 3) return
          const k = blotN++
          const x = 296 + ((k * 17) % 26)
          const drop = document.createElementNS(NS, 'circle')
          drop.setAttribute('r', 2.6)
          drop.classList.add('d-drop')
          blots.append(drop)
          const blot = document.createElementNS(NS, 'path')
          blot.setAttribute('d', HEART)
          blot.classList.add('d-blot')
          blot.setAttribute('transform', `translate(${x - 7} ${222}) scale(0.6)`)
          const g = document.createElementNS(NS, 'g')
          g.append(blot)
          blots.append(g)
          while (blots.querySelectorAll('.d-blot').length > 3) blots.querySelector('.d-blot').parentElement.remove()
          const tl = G(gsap.timeline())
          if (!reduced) {
            tl.fromTo(drop, { attr: { cx: 349, cy: 198 } }, { attr: { cx: (349 + x) / 2 }, duration: 0.25, ease: 'none' })
              .to(drop, { attr: { cy: 180 }, duration: 0.25, ease: 'power2.out' }, 0)
              .to(drop, { attr: { cx: x }, duration: 0.25, ease: 'none' })
              .to(drop, { attr: { cy: 230 }, duration: 0.25, ease: 'power2.in' }, '<')
          }
          tl.call(() => {
            drop.remove()
            sound.play('drip')
          })
            .fromTo(g, { scale: 0.2, opacity: 0, svgOrigin: `${x} 229` }, { scale: 1, opacity: 1, duration: reduced ? 0.01 : 0.35, ease: 'back.out(3)' })
            .call(() => quip.say(line('blot', k), g))
        },
      ],
    }),
  )

  // ── the pen: rattles; tips out and teeters at the edge; hops back ──
  const penHit = $('[data-poke="pen"]')
  const pen = $('[data-pen]')
  const penTap = counter()
  let fallen = false
  let saves = 0
  const PIVOT = '362 213'
  bespoke(penHit, 'tip', () => {
    const n = penTap()
    gsap.killTweensOf(pen)
    if (fallen) {
      fallen = false
      sound.play('ting', { i: 4 })
      G(gsap.to(pen, { rotation: 0, x: 0, y: 0, svgOrigin: PIVOT, duration: reduced ? 0.01 : 0.45, ease: 'back.out(1.6)' }))
      return
    }
    if (n % 3) {
      sound.play('ting', { i: 2 + (n % 3) })
      if (!reduced) G(gsap.to(pen, { keyframes: { rotation: [0, -5, 4, -3, 2, 0] }, svgOrigin: PIVOT, duration: 0.35, ease: 'none' }))
      return
    }
    fallen = true
    sound.play('knock')
    const tl = G(gsap.timeline())
    if (!reduced) {
      tl.to(pen, { rotation: 70, svgOrigin: PIVOT, duration: 0.35, ease: 'power2.in' })
        .to(pen, { y: 18, duration: 0.15, ease: 'power2.in' }, '-=0.12')
        .call(() => sound.play('knock'))
        .to(pen, { x: 10, duration: 0.5, ease: 'power1.out' })
        // over the edge… teeter… stay
        .to(pen, { keyframes: { rotation: [70, 78, 66, 75, 68, 72, 70] }, svgOrigin: PIVOT, duration: 1, ease: 'sine.inOut' })
    } else tl.set(pen, { rotation: 70, y: 18, x: 10, svgOrigin: PIVOT })
    tl.call(() => quip.say(line('pen', saves++), pen))
  })

  // ── the drawer: sticks, then slides open on the next tap ──
  const drawerEl = $('[data-poke="drawer"]')
  const face = $('[data-drawer]')
  const gap = $('[data-drawer-gap]')
  const drawerTap = counter()
  let finds = 0
  bespoke(drawerEl, 'knock', () => {
    const n = drawerTap()
    sound.play('knock')
    gsap.killTweensOf([face, gap])
    if (n % 2) {
      if (!reduced) G(gsap.to(face, { keyframes: { x: [0, -2, 2, -1.5, 1, 0] }, duration: 0.3, ease: 'none' }))
      return
    }
    G(
      gsap
        .timeline()
        .to(face, { y: 7, scale: 1.05, svgOrigin: '200 267', duration: reduced ? 0.01 : 0.3, ease: 'power2.out' })
        .to(gap, { attr: { height: 8 }, duration: reduced ? 0.01 : 0.3, ease: 'power2.out' }, '<')
        .call(() => sound.play('rustle'))
        .to(face, { y: 0, scale: 1, svgOrigin: '200 267', duration: reduced ? 0.01 : 0.4, ease: 'power2.inOut' }, '+=2.4')
        .to(gap, { attr: { height: 0 }, duration: reduced ? 0.01 : 0.4, ease: 'power2.inOut' }, '<')
        .call(() => sound.play('knock')),
    )
    quip.say(line('drawer', finds++), drawerEl)
  })

  // ── the desk itself: knock-knock ──
  const onDesk = [...bookEls, pen, $('[data-inkpot]'), $('[data-lamp]')]
  const knockTap = counter()
  for (const el of root.querySelectorAll('[data-poke="desk-top"], [data-poke="desk-front"]')) {
    bespoke(el, 'knock', (e) => {
      const n = knockTap()
      sound.play('knock')
      G(gsap.delayedCall(0.16, () => sound.play('knock')))
      if (!reduced) {
        G(gsap.timeline().to(onDesk, { y: '-=2', duration: 0.06, ease: 'power2.out', stagger: 0.015 }).to(onDesk, { y: '+=2', duration: 0.3, ease: 'bounce.out', stagger: 0.015 }))
      }
      const m = (n - 1) % 5
      if (m > 0) quip.say(line('knock', m - 1), { x: e.clientX, y: e.clientY - 10 })
    })
  }

  // ── shutters: swing on their hinges ──
  for (const [sel, hinge] of [['[data-poke="shutter-l"]', '44 140'], ['[data-poke="shutter-r"]', '156 140']]) {
    const sh = $(sel)
    bespoke(sh, 'sway', () => {
      sound.play('creak')
      if (reduced) return
      gsap.killTweensOf(sh)
      G(
        gsap
          .timeline()
          .to(sh, { scaleX: 0.3, svgOrigin: hinge, duration: 0.45, ease: 'power2.out' })
          .to(sh, { scaleX: 1, svgOrigin: hinge, duration: 1, ease: 'elastic.out(1, 0.45)' }),
      )
    })
  }

  // ── the moon: ducks behind the rooftops, peeks back ──
  const moon = $('[data-poke="moon"]')
  const moonTap = counter()
  let moons = 0
  bespoke(moon, 'flicker', () => {
    const n = moonTap()
    sound.play('ting', { i: 7 })
    if (!reduced) {
      gsap.killTweensOf(moon)
      G(gsap.timeline().to(moon, { y: 120, duration: 0.4, ease: 'power2.in' }).to(moon, { y: 70, duration: 0.6, ease: 'power2.out' }, '+=0.7').to(moon, { y: 0, duration: 0.8, ease: 'back.out(1.4)' }, '+=0.5'))
    }
    if (n % 2 === 0) quip.say(line('moon', moons++), moon)
  })

  offs.push(react($('[data-poke="sill-plant"]'), 'flutter', { origin: '132 222', svgOrigin: true, strength: 1.4 }))

  return () => {
    offs.forEach((fn) => fn())
    live.forEach((x) => x.kill())
    gsap.killTweensOf([...onDesk, face, gap, moon])
    blots.replaceChildren()
  }
}
