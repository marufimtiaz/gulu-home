/*
 * Rooftop — the night sky (verb: connect).
 *
 * We're up on the roof of the house: railing, fairy lights, stair hut, water tank, the cat.
 * Above, one bright constellation per memory (content.rooftop.memories). Tap a group's stars
 * in any order (or slide a finger across them): each one rings a note and a line joins it to
 * the last. A finished group draws its picture and a polaroid drifts down out of it: photo
 * (or, with photo: null, the constellation sketched on the paper), date, title, text.
 * All found → a shooting star crosses every ~4 s until she catches it → "make a wish" →
 * hold while it glows (~2 s) → sparkles, "it's yours. I won't ask." → complete.
 *
 * Timing: every multi-step beat (a group finishing, the polaroid, the finale, the catch, the
 * wish) is one timeline from moment(); sounds and text sit on it; complete() at its end.
 *
 * Test hooks: [data-group="i"] [data-star="j"], [data-polaroid], [data-polaroid-date],
 * [data-polaroid-close], [data-shooting], [data-wish], [data-wish-text], [data-back];
 * window.__rooftop = { complete(i), shoot(), catch(), get() } under ?debug.
 */
import { gsap } from 'gsap'
import './scene.css'
import { layout, shapeOf } from './shapes.js'
import { TERRACE, moonSVG, starGlyph, terraceSVG } from './art.js'
import { esc, fillPolaroid, polaroidShell } from './polaroid.js'
import { onDrag, onHold } from '../../ui/drag.js'
import { EASE, T, beat, moment } from '../../ui/choreo.js'
import { haptic, nudge, press } from '../../ui/feel.js'
import { react } from '../../ui/react.js'
import { sayer } from './say.js'

const HOLD_MS = 2000 // the wish
const TAP_R = 34 // px: a tap this close to a star's centre counts
const SLIDE_R = 26 // px: a finger sliding this close to a star lights it
const CATCH_R = 72 // px: the shooting star's (generous) hitbox
const GAP = 2.4 // s between shooting stars (≈ 4.2 s from one to the next)
const SIDE = 24 // px kept clear at the screen edges (half a tap target)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const centre = (el) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

let teardown = null

export default {
  id: 'rooftop',
  mount(root, ctx) {
    const { t, c, sound, fx, reduced } = ctx
    const memories = c('rooftop.memories') ?? []
    const total = memories.length

    // ── every tween / timeline / delayed call is tracked so unmount kills them all ──
    let cleaned = false
    const live = new Set()
    const keep = (a) => {
      if (live.size > 80) for (const x of live) if (!x.isActive()) live.delete(x)
      live.add(a)
      return a
    }

    root.setAttribute('aria-label', t('rooftop.label'))
    root.innerHTML = `
      <div class="rooftop${reduced ? ' rooftop--still' : ''}">
        <div class="rt-sky" data-starfield aria-hidden="true"></div>
        <div class="rt-horizon" aria-hidden="true"></div>
        ${moonSVG()}
        <header class="rt-head">
          <p class="rt-kicker hand">${esc(t('rooftop.kicker'))}</p>
          <h1 class="rt-title display">${esc(t('rooftop.title'))}</h1>
          <p class="rt-prompt hand" data-prompt aria-live="polite">${esc(t('rooftop.prompt'))}</p>
        </header>
        <div class="rt-field" data-field>
          ${memories
            .map((m, i) => {
              const sh = shapeOf(m.shape)
              return `
            <div class="rt-cg" data-group="${i}" data-shape="${esc(m.shape)}" role="group" style="--gd:-${(i * 1.3).toFixed(1)}s" aria-label="${esc(t('rooftop.group'))}">
              <svg class="rt-cg__ink" viewBox="0 0 1 1" aria-hidden="true" focusable="false">
                <path class="rt-cg__outline" d="${sh.outline}" pathLength="1"/>
                <g class="rt-cg__lines"></g>
              </svg>
              ${sh.stars
                .map(([x, y], j) => `<button class="rt-star" type="button" data-star="${j}" style="left:${(x * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%;--d:-${((i * 0.83 + j * 0.09) % 2.6).toFixed(2)}s" aria-label="${esc(t('rooftop.star'))}">${starGlyph()}</button>`)
                .join('')}
            </div>`
            })
            .join('')}
        </div>
        <div class="rt-terrace-wrap" data-terrace></div>
        <button class="rt-shoot" type="button" data-shooting hidden aria-label="${esc(t('rooftop.shooting'))}">
          <span class="rt-shoot__tail" aria-hidden="true"></span>
          ${starGlyph('rt-shoot__head')}
        </button>
        <div class="rt-wish" data-wish-panel hidden>
          <p class="rt-wish__text display" data-wish-text>${esc(c('rooftop.wish'))}</p>
          <button class="rt-wish__star" type="button" data-wish aria-label="${esc(t('rooftop.wishStar'))}">
            <svg class="rt-wish__ring" viewBox="0 0 100 100" aria-hidden="true">
              <circle class="rt-wish__track" cx="50" cy="50" r="44"/>
              <circle class="rt-wish__fill" data-wish-ring cx="50" cy="50" r="44" pathLength="1" transform="rotate(-90 50 50)"/>
            </svg>
            <span class="rt-wish__glow" aria-hidden="true">${starGlyph('rt-wish__glyph')}</span>
          </button>
          <p class="rt-wish__hint hand" data-wish-hint>${esc(t('rooftop.hold'))}</p>
          <button class="btn btn--berry rt-back" type="button" data-back hidden>${esc(t('reward.back'))}</button>
        </div>
        <div class="rt-veil" data-veil hidden></div>
        ${polaroidShell(t)}
      </div>`

    const $ = (s) => root.querySelector(s)
    const scene = $('.rooftop')
    const sky = $('[data-starfield]')
    const head = $('.rt-head')
    const moon = $('.rt-moon')
    const prompt = $('[data-prompt]')
    const field = $('[data-field]')
    const terraceWrap = $('[data-terrace]')
    const shoot = $('[data-shooting]')
    const tail = shoot.querySelector('.rt-shoot__tail')
    const wishPanel = $('[data-wish-panel]')
    const wishText = $('[data-wish-text]')
    const wishBtn = $('[data-wish]')
    const wishGlow = wishBtn.querySelector('.rt-wish__glow')
    const wishRing = $('[data-wish-ring]')
    const wishHint = $('[data-wish-hint]')
    const backBtn = $('[data-back]')
    const veil = $('[data-veil]')
    const pol = $('[data-polaroid]')
    const polClose = $('[data-polaroid-close]')

    const groups = memories.map((m, i) => {
      const el = root.querySelector(`[data-group="${i}"]`)
      return {
        i,
        m,
        el,
        shape: shapeOf(m.shape),
        stars: [...el.querySelectorAll('[data-star]')],
        lines: el.querySelector('.rt-cg__lines'),
        outline: el.querySelector('.rt-cg__outline'),
        lit: [],
        complete: false,
        photo: m.photo ? ctx.photos.byFile(m.photo) : null,
      }
    })

    let phase = 'connect' // connect → polaroid ⇄ connect → finale → shooting → caught → wish → done
    let active = null // index of the group being joined
    let finaleStarted = false
    let closing = false
    let passTl = null
    let nextPass = null
    let passes = 0
    let railY = 0
    let skyBox = { top: 0, bottom: 0 }
    const offs = []
    const on = (el, type, fn, opts) => {
      el.addEventListener(type, fn, opts)
      offs.push(() => el.removeEventListener(type, fn, opts))
    }

    // ── ambient: the starfield behind everything, the wind ──
    offs.push(fx.starfield(sky, { count: reduced ? 50 : 80, shooting: false }))
    // The wind starts right away when we arrive from another room (audio is already awake).
    // On a cold load the first touch also wakes the audio engine; starting the layer then
    // would make that first star answer late, so it waits a beat after the first touch.
    let windOff = null
    const startWind = () => {
      if (!windOff && !cleaned) windOff = sound.layer('wind')
    }
    if (ctx.from) startWind()
    else {
      const first = () => keep(gsap.delayedCall(0.35, startWind))
      root.addEventListener('pointerdown', first, { once: true })
      offs.push(() => root.removeEventListener('pointerdown', first))
    }
    offs.push(() => windOff?.())

    // ── prompt ──
    const setPrompt = (text) => {
      if (prompt.textContent === text) return
      prompt.textContent = text
      keep(gsap.fromTo(prompt, { scale: 0.9, rotation: -2, opacity: 0.4 }, { scale: 1, rotation: 0, opacity: 1, duration: reduced ? 0.01 : 0.45, ease: 'back.out(3)', overwrite: true }))
    }
    const progressText = () => {
      const n = groups.filter((g) => g.complete).length
      return n === 0 ? t('rooftop.prompt') : n < total ? t('rooftop.progress', { n, total }) : t('rooftop.allDone')
    }

    // ── guidance: the next thing to touch glows after a few idle seconds ──
    const nextTargets = () => {
      if (phase === 'polaroid') return [polClose]
      if (phase === 'wish') return [wishBtn]
      if (phase === 'done') return [backBtn]
      if (phase !== 'connect') return []
      const g = active !== null ? groups[active] : groups.find((x) => !x.complete)
      return g ? g.stars.filter((_, j) => !g.lit.includes(j)) : []
    }
    // the next star twinkles brighter (arrow if she's stuck); the wish star pulses; the rest glow
    const starHint = (el) => {
      const g = el.querySelector('.rt-glyph')
      return keep(gsap.timeline().to(g, { scale: 1.7, duration: 0.22, ease: 'power2.out' }).to(g, { scale: 1, duration: 0.7, ease: EASE.wobble }))
    }
    const wishPulse = (el) => keep(gsap.timeline().to(el.querySelector('.rt-wish__glow'), { scale: 1.3, duration: 0.3, ease: 'power2.out' }).to(el.querySelector('.rt-wish__glow'), { scale: 1, duration: 0.8, ease: EASE.wobble }))
    let guide = null
    let guideKey = ''
    const retarget = () => {
      const key = phase === 'connect' ? 'star' : phase === 'wish' ? 'wish' : 'plain'
      if (key !== guideKey) {
        guide?.stop()
        guideKey = key
        guide = nudge(nextTargets(), key === 'star' ? { style: starHint, arrow: true } : key === 'wish' ? { style: wishPulse, arrow: true } : {})
      } else guide.set(nextTargets())
    }
    retarget()
    offs.push(() => guide?.stop())

    // ── the terrace answers a tap: each thing like what it is (wired again whenever it's redrawn) ──
    const say = sayer(scene, { reduced, keep })
    const bits = new Set()
    const sceneXY = (p) => {
      const r = scene.getBoundingClientRect()
      return { x: p.x - r.left, y: p.y - r.top }
    }
    const top = (el, fy = 0) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height * fy }
    }
    let teaShown = false
    let catN = 0
    let tankN = 0
    let moonN = 0
    function wireTerrace() {
      const offsT = []
      const part = (name) => terraceWrap.querySelector(`[data-poke="${name}"]`)

      // the cat: a character, not a reaction kind (the house's rooftop cat, in spirit) —
      // she looks round, says mrrp, stretches, asks for a back scratch, then strolls off
      // behind the tank for a while and comes back.
      const cat = part('cat')
      if (cat) {
        cat.dataset.react = 'bespoke'
        const walk = cat.querySelector('.rt-cat__walk')
        const sit = cat.querySelector('.rt-cat__sit')
        const head = cat.querySelector('.rt-cat__head')
        const eyes = cat.querySelector('.rt-cat__eyes')
        const tail = cat.querySelector('.rt-cat__tail')
        let away = false
        let catTl = null
        const run = (build) => {
          catTl?.progress(1).kill()
          catTl = keep(gsap.timeline())
          build(catTl)
          if (reduced) catTl.progress(1)
        }
        const down = () => {
          if (away) return
          haptic(5)
          const step = catN++ % 5
          if (step === 0) {
            // looks round at her
            sound.play('rustle')
            run((tl) => tl
              .to(head, { rotation: -16, transformOrigin: '50% 90%', duration: 0.25, ease: 'power2.out' })
              .to(eyes, { opacity: 1, duration: 0.12 }, '<0.08')
              .to(tail, { rotation: -12, transformOrigin: '0% 0%', duration: 0.3, yoyo: true, repeat: 1 }, '<')
              .to(eyes, { opacity: 0, duration: 0.2 }, '+=1.4')
              .to(head, { rotation: 0, duration: 0.6, ease: EASE.wobble }, '<'))
          } else if (step === 1) {
            // mrrp
            sound.play('meow')
            say(t('rooftop.mew'), top(cat))
            run((tl) => tl
              .to(head, { rotation: -10, y: -2, transformOrigin: '50% 90%', duration: 0.18, ease: 'power2.out' })
              .to(eyes, { opacity: 1, duration: 0.1 }, '<')
              .to(head, { rotation: -4, y: 0, duration: 0.5, ease: EASE.wobble })
              .to(eyes, { opacity: 0, duration: 0.2 }, '+=1.2')
              .to(head, { rotation: 0, duration: 0.5 }, '<'))
          } else if (step === 2) {
            // a long stretch: front down, back up, tail straight
            sound.play('squish')
            run((tl) => tl
              .to(sit, { scaleX: 1.32, scaleY: 0.7, transformOrigin: '50% 100%', duration: 0.55, ease: 'sine.inOut' })
              .to(head, { y: 7, x: -6, rotation: 8, transformOrigin: '50% 90%', duration: 0.55, ease: 'sine.inOut' }, '<')
              .to(tail, { rotation: -70, transformOrigin: '0% 0%', duration: 0.55, ease: 'sine.inOut' }, '<')
              .to([sit, head, tail], { scaleX: 1, scaleY: 1, x: 0, y: 0, rotation: 0, duration: 0.8, ease: EASE.spring }, '+=0.5'))
          } else if (step === 3) {
            // arches into her finger and purrs: "scratch my back"
            sound.play('buzz')
            keep(gsap.delayedCall(0.35, () => sound.play('buzz')))
            say(t('rooftop.scratch'), top(cat), { small: t('rooftop.scratchSmall'), hold: 3 })
            run((tl) => tl
              .to(sit, { scaleY: 1.16, scaleX: 0.92, transformOrigin: '50% 100%', duration: 0.3, ease: 'power2.out' })
              .to(eyes, { opacity: 1, duration: 0.15 }, '<')
              .to(sit, { rotation: 2.5, transformOrigin: '50% 100%', duration: 0.09, yoyo: true, repeat: 9, ease: 'sine.inOut' })
              .to(sit, { scaleY: 1, scaleX: 1, rotation: 0, duration: 0.6, ease: EASE.wobble })
              .to(eyes, { opacity: 0, duration: 0.3 }, '<'))
          } else {
            // had enough: strolls off along the railing, behind the tank — and back later
            away = true
            sound.play('whoosh')
            const far = Math.max(140, (root.clientWidth - top(cat).x) / Math.max(0.5, cat.getCTM()?.a || 1) + 40)
            catTl?.progress(1).kill()
            catTl = keep(gsap.timeline({ onComplete: () => (away = false) }))
            if (reduced) {
              catTl.set(walk, { opacity: 0 }).set(walk, { opacity: 1 }, 4)
              return
            }
            catTl
              .to(walk, { x: far, duration: 2.6, ease: 'sine.in' })
              .to(sit, { y: -2, duration: 0.16, yoyo: true, repeat: 15, ease: 'sine.inOut' }, 0)
              .set(walk, { scaleX: -1, transformOrigin: '50% 50%' }, '+=4')
              .to(walk, { x: 0, duration: 2.8, ease: 'sine.out' })
              .to(sit, { y: -2, duration: 0.16, yoyo: true, repeat: 15, ease: 'sine.inOut' }, '<')
              .set(walk, { scaleX: 1 })
              .call(() => sound.play('meow'))
          }
        }
        cat.addEventListener('pointerdown', down)
        offsT.push(() => {
          cat.removeEventListener('pointerdown', down)
          catTl?.kill()
        })
      }

      // the plant pot on the parapet tips and its leaves shiver; the third time it nearly goes over
      const pot = part('pot')
      if (pot) {
        const leaf = pot.querySelector('[data-leaf]')
        const shiver = () => !reduced && keep(gsap.fromTo(leaf, { rotation: -6 }, { rotation: 0, transformOrigin: '50% 100%', duration: 0.8, ease: 'elastic.out(1.2, 0.25)' }))
        offsT.push(react(pot, 'tip', { origin: '50% 100%', strength: 1.3, steps: [shiver, shiver, () => {
          shiver()
          if (!reduced) keep(gsap.timeline().to(pot, { rotation: 22, transformOrigin: '100% 100%', duration: 0.22, ease: 'power2.out' }).to(pot, { rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.3)' }))
          say(t('rooftop.noni'), top(pot), { small: t('rooftop.noniSmall') })
        }] }))
      }

      // the water tank: a hollow "tung" that echoes — and what echoes back is her nicknames
      const tank = part('tank')
      if (tank) {
        const drum = tank.querySelector('.rt-drum')
        const lid = tank.querySelector('.rt-tanklid')
        const echo = (words) => {
          const p = sceneXY(top(lid))
          words.forEach((w, i) => {
            const el = document.createElement('p')
            el.className = 'rt-echo hand'
            el.setAttribute('aria-hidden', 'true')
            el.textContent = w
            scene.append(el)
            bits.add(el)
            const done = () => {
              el.remove()
              bits.delete(el)
            }
            // each echo further off, smaller and fainter, drifting away over the city
            gsap.set(el, { x: p.x - i * 46, y: p.y - 18 - i * 30, opacity: 0, scale: 1 - i * 0.22 })
            keep(gsap.timeline({ delay: 0.25 + i * 0.45, onComplete: done })
              .to(el, { opacity: 1 - i * 0.28, y: '-=10', duration: reduced ? 0.01 : 0.4, ease: EASE.out })
              .to(el, { opacity: 0, y: '-=12', duration: 0.6 }, '+=0.7'))
          })
        }
        const tung = () => {
          const n = tankN++ % 5
          // hollow, then its echo, quieter twice
          keep(gsap.delayedCall(0.22, () => sound.play('knock')))
          keep(gsap.delayedCall(0.48, () => sound.play('slosh')))
          if (n >= 1 && n <= 3) echo(t('rooftop.echo')[n - 1])
          if (n === 4) say(t('rooftop.chain'), top(lid), { small: t('rooftop.chainSmall') })
        }
        offsT.push(react(tank, 'ripple', { target: drum, origin: '50% 100%', strength: 1.3, sound: 'knock', steps: [tung] }))
      }

      // the stair hut: the bulb buzzes and flickers, the door creaks; then tea's on the step
      const door = part('door')
      if (door) {
        const leafDoor = door.querySelector('.rt-leafdoor')
        const creak = () => {
          sound.play('creak')
          if (!reduced) keep(gsap.timeline().to(leafDoor, { scaleX: 1.6, transformOrigin: '0% 50%', duration: 0.35, ease: 'power2.out' }).to(leafDoor, { scaleX: 1, duration: 1, ease: EASE.wobble }, '+=0.3'))
        }
        offsT.push(react(door, 'flicker', { target: door.querySelector('.rt-bulb'), steps: [creak, creak, () => {
          creak()
          const tea = door.querySelector('.rt-tea')
          if (!teaShown) {
            teaShown = true
            keep(gsap.fromTo(tea, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: reduced ? 0.01 : 0.6, ease: EASE.out, delay: 0.3 }))
          }
          say(t('rooftop.tea'), top(tea), { small: t('rooftop.teaSmall') })
        }] }))
      }

      // the fairy lights: a ripple of light runs along the string from her finger
      const lights = part('lights')
      if (lights) {
        const bulbs = [...lights.querySelectorAll('.rt-fairy')]
        const chase = (n, e) => {
          if (reduced || !e) return
          const order = bulbs.map((b) => ({ b, d: Math.abs(top(b, 0.5).x - e.clientX) })).sort((a, b) => a.d - b.d).map((o) => o.b)
          const r0 = Number(bulbs[0]?.getAttribute('r')) || 3
          keep(gsap.fromTo(order, { attr: { r: r0 * 2 } }, { attr: { r: r0 }, duration: 0.7, ease: 'power2.out', stagger: 0.04, immediateRender: false }))
        }
        offsT.push(react(lights, 'flicker', { target: lights.querySelector('.rt-bulbs'), sound: 'ting', strength: 0.6, steps: [chase] }))
      }

      // the city: a few more windows wake each time; the third, all of them — it's half past four
      const city = part('city')
      if (city) {
        const off = [...city.querySelectorAll('.rt-win--off')]
        const wake = (n) => {
          const sleepers = off.filter((w) => !w.classList.contains('rt-win--on'))
          for (let i = 0; i < n && sleepers.length; i++) sleepers.splice(Math.floor(Math.random() * sleepers.length), 1)[0].classList.add('rt-win--on')
        }
        offsT.push(react(city, 'flicker', { target: city.querySelector('.rt-citywin'), sound: 'tap', steps: [() => wake(4), () => wake(6), (n, e) => {
          off.forEach((w, i) => keep(gsap.delayedCall(reduced ? 0 : (i % 17) * 0.05, () => w.classList.add('rt-win--on'))))
          sound.play('chime')
          say(t('rooftop.city'), e ? { x: e.clientX, y: e.clientY - 20 } : top(city), { small: t('rooftop.citySmall') })
          keep(gsap.delayedCall(6, () => off.forEach((w) => w.classList.remove('rt-win--on'))))
        }] }))
      }

      // the railing: solid, knocks back
      const rail = part('rail')
      if (rail) offsT.push(react(rail, 'knock', { strength: 0.6 }))

      return () => offsT.forEach((f) => f())
    }

    // the moon leans in for a closer look (a bespoke move: it's the moon)
    moon.dataset.react = 'bespoke'
    const face = moon.querySelector('.rt-moon__face')
    let moonTl = null
    on(moon, 'pointerdown', () => {
      if (moonTl?.isActive()) return
      const lvl = (moonN++ % 3) + 1
      sound.play('chime')
      haptic(5)
      const r = moon.getBoundingClientRect()
      const sr = scene.getBoundingClientRect()
      const k = 0.18 + 0.1 * lvl
      const dx = (sr.left + sr.width / 2 - (r.left + r.width / 2)) * k
      const dy = (sr.top + sr.height * 0.42 - (r.top + r.height / 2)) * k
      moonTl = keep(gsap.timeline())
      moonTl.to(moon, { x: dx, y: dy, scale: 1.25 + 0.25 * lvl, duration: reduced ? 0.01 : 0.7, ease: 'power2.inOut' })
      if (lvl > 1) moonTl.to(face, { opacity: 1, duration: 0.3 }, '-=0.2')
      if (lvl === 3) moonTl.call(() => say(t('rooftop.moon'), top(moon, 1), { small: t('rooftop.moonSmall'), below: true }))
      moonTl.to({}, { duration: lvl === 3 ? 2.8 : 0.6 })
      moonTl.to(face, { opacity: 0, duration: 0.3 })
      moonTl.to(moon, { x: 0, y: 0, scale: 1, duration: reduced ? 0.01 : 1.1, ease: EASE.spring }, '<')
    })
    offs.push(() => {
      say.clear()
      bits.forEach((b) => b.remove())
      bits.clear()
    })

    // ── layout: terrace drawn for this width, constellations fitted into the sky above it ──
    let unwire = () => {}
    function place() {
      const W = root.clientWidth
      const H = root.clientHeight
      if (!W || !H) return
      const portrait = H >= W * 1.05
      const k = portrait ? clamp(Math.min(W / 390, H / 720), 0.8, 1.45) : clamp(H / 560, 0.62, 1.35)
      const terr = terraceSVG({ w: W, k, tea: teaShown })
      unwire()
      terraceWrap.innerHTML = terr.svg
      terraceWrap.style.height = `${terr.height}px`
      unwire = wireTerrace()
      railY = H - TERRACE.band * k

      const rr = root.getBoundingClientRect()
      const headBottom = Math.max(head.getBoundingClientRect().bottom, moon.getBoundingClientRect().bottom * (portrait ? 1 : 0)) - rr.top
      const top = headBottom + (portrait ? 10 : 4)
      const bottom = railY - (portrait ? 50 : 44) * k
      skyBox = { top, bottom }
      const fw = W - SIDE * 2
      const fh = Math.max(80, bottom - top)
      field.style.left = `${SIDE}px`
      field.style.top = `${top}px`
      field.style.width = `${fw}px`
      field.style.height = `${fh}px`
      const boxes = layout(memories, { w: fw, h: fh, max: clamp(Math.min(W, H) * 0.3, 120, 220) })
      for (const b of boxes) {
        const el = groups[b.i].el
        el.style.left = `${(b.cx - b.size / 2).toFixed(1)}px`
        el.style.top = `${(b.cy - b.size / 2).toFixed(1)}px`
        el.style.width = el.style.height = `${b.size.toFixed(1)}px`
        el.style.setProperty('--u', (1 / b.size).toFixed(5))
        el.style.setProperty('--s', `${b.size.toFixed(1)}px`)
      }
      wishPanel.style.setProperty('--wish-y', `${((top + railY) / 2).toFixed(0)}px`)
    }
    place()
    let raf = 0
    const replace = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(place)
    }
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(replace) : null
    if (ro) ro.observe(root)
    else on(window, 'resize', replace)
    on(window, 'orientationchange', replace)
    document.fonts?.ready.then(() => !cleaned && place())
    offs.push(() => {
      ro?.disconnect()
      cancelAnimationFrame(raf)
      unwire()
    })

    // ── stars ──
    const preload = (g) => {
      if (g.photo?.src && !g.preloaded) {
        g.preloaded = true
        const img = new Image()
        img.decoding = 'async'
        img.src = g.photo.src
      }
    }

    function nearest(x, y, r, filter) {
      let best = null
      let bd = r
      for (const g of groups) {
        g.stars.forEach((el, j) => {
          if (filter && !filter(g, j)) return
          const p = centre(el)
          const d = Math.hypot(p.x - x, p.y - y)
          if (d <= bd) {
            bd = d
            best = { g: g.i, j }
          }
        })
      }
      return best
    }

    function drawLine(g, a, b) {
      const [x1, y1] = g.shape.stars[a]
      const [x2, y2] = g.shape.stars[b]
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', x1)
      line.setAttribute('y1', y1)
      line.setAttribute('x2', x2)
      line.setAttribute('y2', y2)
      line.setAttribute('pathLength', '1')
      line.setAttribute('class', 'rt-line')
      g.lines.append(line)
      keep(gsap.fromTo(line, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: reduced ? 0.01 : T.quick, ease: EASE.out }))
    }

    function refuse(btn) {
      sound.play('tap')
      haptic(4)
      setPrompt(t('rooftop.finish'))
      keep(gsap.fromTo(btn, { x: -6 }, { x: 0, duration: reduced ? 0.01 : 0.5, ease: 'elastic.out(1.2, 0.25)', overwrite: 'auto' }))
      const g = groups[active]
      const waiting = g.stars.filter((_, j) => !g.lit.includes(j))
      if (!reduced) keep(gsap.fromTo(waiting, { y: -7 }, { y: 0, duration: 0.6, ease: EASE.land, stagger: 0.04, overwrite: 'auto' }))
    }

    function tapStar(gi, j) {
      if (phase !== 'connect') return
      const g = groups[gi]
      const btn = g.stars[j]
      if (g.complete) return openPolaroid(gi)
      if (active !== null && active !== gi) return refuse(btn)
      if (g.lit.includes(j)) {
        sound.play('tap')
        keep(gsap.fromTo(btn, { scale: 1.25 }, { scale: 1, duration: reduced ? 0.01 : 0.4, ease: EASE.spring, overwrite: 'auto' }))
        return
      }
      active = gi
      g.lit.push(j)
      const n = g.lit.length
      if (n === 1) preload(g)
      btn.classList.add('is-lit')
      btn.setAttribute('aria-pressed', 'true')
      g.el.classList.add('is-active')
      sound.play('ting', { i: n - 1 })
      haptic(8)
      // instant swell on touch, settles with a spring
      keep(gsap.fromTo(btn, { scale: 1.7 }, { scale: 1, duration: reduced ? 0.01 : 0.6, ease: EASE.wobble, overwrite: 'auto' }))
      if (n > 1) drawLine(g, g.lit[n - 2], j)
      const left = g.stars.length - n
      if (left === 0) completeGroup(gi)
      else setPrompt(left === 1 ? t('rooftop.leftOne') : t('rooftop.left', { n: left }))
      retarget()
    }

    function completeGroup(gi, { silent = false } = {}) {
      const g = groups[gi]
      if (g.complete) return
      g.complete = true
      active = null
      g.el.classList.remove('is-active')
      g.el.classList.add('is-done')
      g.stars.forEach((s) => s.classList.add('is-lit'))
      setPrompt(progressText())
      const tl = keep(moment())
      beat(tl, 'sparkle', 0)
      tl.call(() => {
        const p = centre(g.el)
        fx.sparkles(p.x, p.y, { count: 16 })
      }, [], 0)
      tl.fromTo(g.outline, { strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration: T.reveal, ease: EASE.inOut }, 0)
      tl.to(g.lines, { opacity: 0.4, duration: T.reveal }, 0)
      tl.fromTo(g.stars, { scale: 1 }, { scale: 1.35, duration: T.quick, yoyo: true, repeat: 1, stagger: 0.04, ease: 'sine.inOut' }, 0)
      if (silent) {
        tl.call(afterGroup)
        return
      }
      // the picture draws itself; nothing else is tappable until its polaroid arrives
      phase = 'drawing'
      retarget()
      tl.call(() => openPolaroid(gi), [], '>')
    }

    // ── polaroid ──
    let polGroup = null
    function openPolaroid(gi) {
      if (phase !== 'connect' && phase !== 'drawing') return
      const g = groups[gi]
      phase = 'polaroid'
      polGroup = gi
      const tilt = gi % 2 ? 2.2 : -2.4
      fillPolaroid(pol, g.m, { shape: g.shape, photo: g.photo, date: g.m.date ? ctx.date(g.m.date, 'long') : '', t, tilt })
      pol.hidden = false
      veil.hidden = false
      gsap.set(pol, { x: 0, y: 0, scale: 1, rotation: tilt, opacity: 1 })
      const from = centre(g.el)
      const to = centre(pol)
      const words = [...pol.querySelectorAll('.rt-polaroid__words > *:not([hidden])')]
      const tl = keep(moment())
      beat(tl, 'paper', 0)
      tl.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: T.quick }, 0)
      tl.fromTo(pol, { x: from.x - to.x, y: from.y - to.y, scale: 0.16, rotation: tilt - 16, opacity: 0 }, { x: 0, y: 0, scale: 1, rotation: tilt, opacity: 1, duration: T.move * 1.4, ease: EASE.spring }, 0)
      // the words only once the card has landed
      tl.addLabel('landed', '>-0.15')
      beat(tl, 'chime', 'landed')
      tl.fromTo(words, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: T.quick, stagger: 0.09, ease: EASE.out }, 'landed')
      tl.call(() => {
        polClose.focus({ preventScroll: true })
        retarget()
      })
      retarget()
    }

    function closePolaroid() {
      if (phase !== 'polaroid' || closing) return
      closing = true
      const g = groups[polGroup]
      const to = centre(g.el)
      const from = centre(pol)
      const tl = keep(moment())
      tl.to(pol, { x: to.x - from.x, y: to.y - from.y, scale: 0.12, rotation: '+=10', opacity: 0, duration: T.move, ease: 'power2.in' }, 0)
      tl.to(veil, { opacity: 0, duration: T.quick }, 0.15)
      tl.call(() => {
        pol.hidden = true
        veil.hidden = true
        closing = false
        phase = 'connect'
        keep(gsap.fromTo(g.el, { scale: 1.12 }, { scale: 1, duration: reduced ? 0.01 : 0.6, ease: EASE.wobble }))
        afterGroup()
      })
    }

    function afterGroup() {
      if (phase !== 'connect') return
      if (groups.every((g) => g.complete) && !finaleStarted) return startFinale()
      setPrompt(progressText())
      retarget()
    }

    // ── all found: the sky glows, then the shooting stars begin ──
    function startFinale() {
      finaleStarted = true
      phase = 'finale'
      retarget()
      scene.classList.add('rooftop--all')
      const tl = keep(moment())
      groups.forEach((g, i) => {
        beat(tl, 'ting', i * 0.15, { i: i + 1 })
        tl.fromTo(g.el, { scale: 1 }, { scale: 1.1, duration: 0.28, yoyo: true, repeat: 1, ease: 'sine.inOut' }, i * 0.15)
      })
      tl.call(() => setPrompt(t('rooftop.allDone')), [], '>')
      tl.to({}, { duration: T.linger * 0.45 })
      tl.call(() => {
        setPrompt(t('rooftop.shooting'))
        phase = 'shooting'
        launch()
      })
    }

    function launch() {
      if (phase !== 'shooting') return
      const W = root.clientWidth
      const span = Math.max(80, skyBox.bottom - skyBox.top)
      shoot.hidden = false
      if (reduced) {
        // still: it simply appears and waits to be caught
        gsap.set(shoot, { x: W * 0.62, y: skyBox.top + span * 0.3, rotation: 18, opacity: 0 })
        passTl = keep(gsap.to(shoot, { opacity: 1, duration: 0.3 }))
        return
      }
      const dir = passes++ % 2 ? -1 : 1
      const y0 = skyBox.top + span * (0.04 + Math.random() * 0.18)
      const y1 = y0 + span * (0.22 + Math.random() * 0.16)
      const x0 = dir > 0 ? -70 : W + 70
      const x1 = dir > 0 ? W + 70 : -70
      const at = (p) => ({ x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p })
      gsap.set(shoot, { ...at(0), rotation: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI, opacity: 0, scale: 1 })
      gsap.set(tail, { scaleX: 1 })
      const tl = gsap.timeline({
        onComplete: () => {
          shoot.hidden = true
          nextPass = keep(gsap.delayedCall(GAP, launch))
        },
      })
      beat(tl, 'whoosh', 0)
      // races in, drifts slowly across the middle (catchable), races out
      tl.to(shoot, { ...at(0.34), opacity: 1, duration: 0.5, ease: 'power2.out' })
      tl.to(tail, { scaleX: 0.55, duration: 0.5, ease: 'sine.out' }, '<')
      tl.to(shoot, { ...at(0.66), duration: 0.95, ease: 'none' })
      tl.to(shoot, { ...at(1), opacity: 0, duration: 0.45, ease: 'power2.in' })
      tl.to(tail, { scaleX: 1.25, duration: 0.35, ease: 'sine.in' }, '<')
      passTl = keep(tl)
    }

    function catchStar() {
      if (phase !== 'shooting') return
      phase = 'caught'
      passTl?.kill()
      nextPass?.kill()
      const p = centre(shoot)
      shoot.hidden = true
      fx.sparkles(p.x, p.y, { count: 14 })
      sound.play('chime')
      haptic([10, 40, 14])
      setPrompt('')
      scene.classList.add('rooftop--wishing')
      wishPanel.hidden = false
      gsap.set(wishBtn, { x: 0, y: 0, scale: 1 })
      const w = centre(wishBtn)
      const tl = keep(moment())
      tl.fromTo(wishBtn, { x: p.x - w.x, y: p.y - w.y, scale: 0.35 }, { x: 0, y: 0, scale: 1, duration: T.move * 1.3, ease: EASE.out }, 0)
      tl.fromTo(wishText, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: T.quick, ease: EASE.out }, '>')
      tl.fromTo(wishHint, { opacity: 0 }, { opacity: 1, duration: T.quick }, '>')
      tl.call(() => {
        phase = 'wish'
        retarget()
      })
    }

    // ── the wish: hold while it glows ──
    let rung = 0
    let lastSpark = 0
    const holdOff = onHold(wishBtn, {
      onStart() {
        if (phase !== 'wish') return
        wishPanel.classList.add('is-holding')
        sound.play('tap')
        haptic(6)
        if (!reduced) keep(gsap.to(wishBtn, { scale: 0.94, duration: 0.08, ease: 'power2.out', overwrite: 'auto' }))
        wishHint.textContent = t('rooftop.holding')
      },
      onTick(dt, ms) {
        if (phase !== 'wish') return
        const p = Math.min(1, ms / HOLD_MS)
        wishRing.style.strokeDashoffset = String(1 - p)
        wishBtn.dataset.progress = p.toFixed(2)
        gsap.set(wishGlow, { scale: 1 + p * 0.45 })
        const step = Math.floor(p * 6)
        if (step > rung) {
          rung = step
          sound.play('ting', { i: step + 1 })
          haptic(4)
        }
        const now = performance.now()
        if (!reduced && now - lastSpark > 260) {
          lastSpark = now
          const c0 = centre(wishBtn)
          const a = Math.random() * Math.PI * 2
          fx.sparkles(c0.x + Math.cos(a) * 46, c0.y + Math.sin(a) * 46, { count: 3 })
        }
        if (p >= 1) granted()
      },
      onEnd() {
        wishPanel.classList.remove('is-holding')
        if (phase !== 'wish') return
        if (!reduced) keep(gsap.to(wishBtn, { scale: 1, duration: 0.45, ease: EASE.wobble, overwrite: 'auto' }))
        wishHint.textContent = t('rooftop.hold')
      },
    })
    offs.push(holdOff)

    function granted() {
      if (phase !== 'wish') return
      phase = 'done'
      wishPanel.classList.remove('is-holding')
      retarget()
      const p = centre(wishBtn)
      const tl = keep(moment())
      beat(tl, 'sparkle', 0)
      tl.call(() => {
        fx.sparkles(p.x, p.y, { count: 30 })
        fx.hearts(p.x, p.y, { count: 5 })
        haptic([12, 40, 20])
      }, [], 0)
      tl.to(wishBtn, { scale: 1, duration: T.tap }, 0)
      tl.to(wishGlow, { scale: 2.6, opacity: 0, duration: T.reveal, ease: EASE.out }, 0)
      tl.to(wishBtn.querySelector('.rt-wish__ring'), { opacity: 0, scale: 1.3, duration: T.quick }, 0)
      tl.to([wishText, wishHint], { opacity: 0, y: -8, duration: T.quick }, 0)
      tl.call(() => {
        wishText.textContent = c('rooftop.wishAfter')
        wishText.classList.add('is-after')
        wishHint.hidden = true
        wishBtn.classList.add('is-spent')
      })
      tl.fromTo(wishText, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: T.reveal, ease: EASE.out })
      tl.call(() => {
        ctx.complete()
        backBtn.hidden = false
      })
      tl.fromTo(backBtn, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: T.quick * 1.6, ease: EASE.spring })
      tl.call(() => retarget())
    }

    // ── pointer: stars (tap, or slide a finger through them) ──
    offs.push(
      onDrag(field, {
        onStart(pt) {
          if (phase !== 'connect') return false
          const hitStar = nearest(pt.x, pt.y, TAP_R)
          if (!hitStar) {
            // empty sky still answers, softly
            if (!reduced) fx.sparkles(pt.x, pt.y, { count: 4 })
            return false
          }
          tapStar(hitStar.g, hitStar.j)
        },
        onMove(pt) {
          if (phase !== 'connect' || active === null) return
          const a = active
          const s = nearest(pt.x, pt.y, SLIDE_R, (g, j) => g.i === a && !g.lit.includes(j))
          if (s) tapStar(s.g, s.j)
        },
      }),
    )
    // keyboard: Enter / Space on a star (click with detail 0)
    groups.forEach((g) => g.stars.forEach((btn, j) => on(btn, 'click', (e) => e.detail === 0 && tapStar(g.i, j))))

    // the shooting star: generous — a tap anywhere near its head catches it
    on(root, 'pointerdown', (e) => {
      if (phase !== 'shooting' || shoot.hidden) return
      const p = centre(shoot)
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) <= CATCH_R) catchStar()
    })
    on(shoot, 'click', (e) => e.detail === 0 && catchStar())

    // polaroid: button, veil, Escape
    offs.push(press(polClose), press(backBtn))
    on(polClose, 'click', closePolaroid)
    on(veil, 'click', closePolaroid)
    on(window, 'keydown', (e) => e.key === 'Escape' && closePolaroid())
    on(backBtn, 'click', () => ctx.back())

    // ── debug hook ──
    if (ctx.params.has('debug')) {
      window.__rooftop = {
        complete(i) {
          const g = groups[i]
          if (!g || g.complete) return
          if (active !== null && active !== i) return
          active = i
          g.stars.forEach((_, j) => {
            if (g.lit.includes(j)) return
            g.lit.push(j)
            if (g.lit.length > 1) drawLine(g, g.lit.at(-2), j)
          })
          completeGroup(i, { silent: true })
        },
        shoot() {
          if (phase === 'shooting') return
          finaleStarted = true
          phase = 'shooting'
          launch()
        },
        catch: () => catchStar(),
        get: () => ({ phase, active, done: groups.filter((g) => g.complete).length }),
      }
    }


    teardown = () => {
      if (cleaned) return
      cleaned = true
      offs.forEach((fn) => fn())
      live.forEach((a) => a.kill())
      live.clear()
      if (window.__rooftop) delete window.__rooftop
    }
    ctx.onCleanup(teardown)
  },
  unmount() {
    teardown?.()
    teardown = null
  },
}
