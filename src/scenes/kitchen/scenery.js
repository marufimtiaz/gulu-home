/*
 * Kitchen scenery (the pot's own moods live in index.js):
 *
 *   left knob   the stove dial: each tap clicks it round a notch (low → medium → high → off);
 *               the flames follow and stay there. Right up high, the pot sweats ("too hot!")
 *   right knob  the igniter: spins with a tick-tick, sparks at the burner, the flame flares
 *   ladle       sways on its hook with a metal ting; every 3rd tap it says something
 *   belon       the rolling pin sways on its string with a wooden knock; every 3rd tap a
 *               bigger, slightly menacing swing ("for emergencies. for me.")
 *   tap         (wide screens) the handle gives a quarter turn and one drop falls; every 4th
 *               tap it runs for a moment — "who left the tap running?"
 *   shelves     knock on a plank and the jars standing on it clink
 *
 * Each element carries data-react (react() sets it; bespoke ones are set here).
 */
import { gsap } from 'gsap'
import { react } from '../../ui/react.js'
import { haptic } from '../../ui/feel.js'
import { SPOUT } from './art.js'

export function scenery(root, ctx, { quip, line, flames, setHot, potWrap, G }) {
  const { sound, fx, reduced } = ctx
  const offs = []
  const D = (s) => (reduced ? 0.01 : s)
  const bespoke = (el, kind, fn) => {
    el.dataset.react = kind
    const down = (e) => {
      haptic(kind === 'knock' || kind === 'spin' ? 8 : 4)
      fn(e)
    }
    el.addEventListener('pointerdown', down)
    offs.push(() => {
      el.removeEventListener('pointerdown', down)
      delete el.dataset.react
    })
  }

  // ── the stove dial: three heats and off ──
  const [dial, igniter] = root.querySelectorAll('[data-knob]')
  const HEAT = [1, 1.3, 1.65]
  let heat = 0
  let hots = 0
  const setFlames = (k, pop = false) => {
    if (pop && !reduced) G.fromTo(flames, { scaleY: HEAT[k] * 1.25 }, { scaleY: HEAT[k], svgOrigin: '130 226', duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: true })
    else G.to(flames, { scaleY: HEAT[k], svgOrigin: '130 226', duration: D(0.5), ease: 'power2.out', overwrite: true })
  }
  bespoke(dial, 'spin', () => {
    heat = (heat + 1) % HEAT.length
    dial.dataset.heat = String(heat)
    sound.play('tick')
    G.to(dial, { rotation: heat * 75, duration: D(0.35), ease: 'back.out(2.2)', overwrite: true })
    setFlames(heat, heat > 0)
    if (heat === HEAT.length - 1) {
      setHot(true)
      quip.say(line('hot', hots++), potWrap)
    } else if (heat === 0) setHot(false)
  })
  dial.dataset.heat = '0'
  offs.push(() => delete dial.dataset.heat)

  offs.push(
    react(igniter, 'spin', {
      deg: 120,
      sound: null,
      steps: [
        () => {
          sound.play('tick')
          G.later(0.09, () => sound.play('tick'))
          G.later(0.18, () => sound.play('tick'))
          const r = potWrap.getBoundingClientRect()
          if (!reduced) fx.sparkles?.(r.left + r.width / 2, r.top + r.height * 0.93, { count: 8 })
          setFlames(heat, true)
        },
      ],
    }),
  )

  // ── things hanging under the shelf ──
  const ladle = root.querySelector('[data-tool="ladle"]')
  const belon = root.querySelector('[data-tool="belon"]')
  let ladles = 0
  let belons = 0
  offs.push(
    react(ladle, 'sway', {
      sound: 'ting',
      soundOpts: { i: 6 },
      steps: [(n) => n % 3 === 0 && quip.say(line('ladle', ladles++), ladle)],
    }),
  )
  offs.push(
    react(belon, 'sway', {
      sound: 'knock',
      steps: [
        (n) => {
          if (n % 3) return
          if (!reduced) {
            G.tl()
              .to(belon, { rotation: 32, transformOrigin: '50% 0%', duration: 0.25, ease: 'power2.out', overwrite: true })
              .to(belon, { rotation: -22, duration: 0.45, ease: 'sine.inOut' })
              .to(belon, { rotation: 0, duration: 1.1, ease: 'elastic.out(1, 0.3)' })
          }
          quip.say(line('belon', belons++), belon)
        },
      ],
    }),
  )

  // ── the tap (wide screens): one drop; every 4th tap it runs ──
  const tap = root.querySelector('[data-tap]')
  const handle = tap.querySelector('[data-tap-handle]')
  const water = tap.querySelector('[data-water]')
  const NS = 'http://www.w3.org/2000/svg'
  let taps = 0
  let runs = 0
  const drop = (delay = 0) => {
    const d = document.createElementNS(NS, 'path')
    d.setAttribute('d', 'M0 -5 q4 6 0 9 q-4 -3 0 -9 z')
    d.classList.add('tap__drop')
    water.append(d)
    G.tl({ delay, onComplete: () => d.remove() })
      .fromTo(d, { x: SPOUT.x, y: SPOUT.y, scale: 0.3, transformOrigin: '50% 0%' }, { scale: 1, duration: D(0.25), ease: 'power1.in' })
      .call(() => sound.play('drip'))
      .to(d, { y: 122, duration: D(0.34), ease: 'power2.in' })
      .to(d, { scaleY: 0.2, scaleX: 2.2, opacity: 0, duration: D(0.16) })
  }
  bespoke(tap, 'drip', () => {
    taps++
    G.tl()
      .to(handle, { rotation: 35, svgOrigin: '48 30', duration: D(0.18), ease: 'power2.out', overwrite: true })
      .to(handle, { rotation: 0, duration: D(0.5), ease: 'back.out(2)' }, taps % 4 ? '+=0.1' : '+=1.1')
    if (taps % 4) return drop()
    sound.play('pour')
    if (!reduced) {
      const stream = document.createElementNS(NS, 'rect')
      stream.setAttribute('x', SPOUT.x - 2.5)
      stream.setAttribute('y', SPOUT.y)
      stream.setAttribute('width', 5)
      stream.setAttribute('height', 0)
      stream.setAttribute('rx', 2.5)
      stream.classList.add('tap__stream')
      water.append(stream)
      G.tl({ onComplete: () => stream.remove() })
        .to(stream, { attr: { height: 60 }, duration: 0.18, ease: 'power1.in' })
        .to(stream, { attr: { y: 124, height: 0 }, duration: 0.25, ease: 'power1.in' }, '+=0.9')
      drop(1.35)
    }
    quip.say(line('tap', runs++), tap)
  })

  // ── shelves: knock on a plank and its jars clink ──
  for (const plank of root.querySelectorAll('[data-plank]')) {
    const svgs = [...plank.parentElement.querySelectorAll('.jar:not([hidden]) .jar__svg')]
    bespoke(plank, 'knock', () => {
      sound.play('knock')
      sound.play('ting', { i: 3 + Math.floor(Math.random() * 3) })
      if (reduced) return
      G.tl()
        .to(plank, { y: 2, duration: 0.05, ease: 'power2.out', overwrite: true })
        .to(plank, { y: 0, duration: 0.35, ease: 'elastic.out(1, 0.4)' })
      G.tl()
        .to(svgs, { y: -3, rotation: () => (Math.random() - 0.5) * 8, transformOrigin: '50% 100%', duration: 0.08, ease: 'power2.out', stagger: 0.03, overwrite: true })
        .to(svgs, { y: 0, rotation: 0, duration: 0.4, ease: 'bounce.out', stagger: 0.03 })
    })
  }

  return () => offs.forEach((fn) => fn())
}
