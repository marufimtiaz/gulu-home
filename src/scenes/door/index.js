/*
 * Door — the unsuspecting intro. A plain front door at night whose lock is a little brass
 * clock. Set the hands to the answer (content.door.answer) and "try": wrong → escalating hint,
 * right → lock clicks, porch lamp flickers on, the door swings in onto warm light, the camera
 * pulls back and up, and we go to the house.
 */
import './scene.css'
import { gsap } from 'gsap'
import { onRotate, rectCenter } from '../../ui/drag.js'
import { beat, EASE, moment, T } from '../../ui/choreo.js'
import { haptic, nudge, press } from '../../ui/feel.js'
import { react } from '../../ui/react.js'
import { defsSVG, insideSVG, leafSVG, lockSVG, porchSVG, skySVG, windowSVG } from './art.js'

const TAU = Math.PI * 2
const mod = (n, m) => ((n % m) + m) % m
/** Smallest angle between two angles (radians). */
const gap = (a, b) => Math.abs(mod(a - b + Math.PI, TAU) - Math.PI)

let teardown = null
let grainUrl = null

/** A small tile of paper fibres, drawn once and reused as a CSS background (cheap to paint). */
function grain() {
  if (grainUrl !== null) return grainUrl
  grainUrl = ''
  try {
    const n = 160
    const cv = document.createElement('canvas')
    cv.width = cv.height = n
    const g = cv.getContext('2d')
    if (!g) return grainUrl
    for (let i = 0; i < 1400; i++) {
      const dark = Math.random() < 0.72
      g.fillStyle = dark ? `rgba(20,12,30,${0.05 + Math.random() * 0.12})` : `rgba(255,246,225,${0.03 + Math.random() * 0.07})`
      const w = Math.random() < 0.15 ? 2 + Math.random() * 3 : 1
      g.fillRect(Math.random() * n, Math.random() * n, w, 1)
    }
    grainUrl = `url(${cv.toDataURL()})`
  } catch {
    /* no canvas (tests) → flat paper */
  }
  return grainUrl
}

export default {
  id: 'door',

  mount(root, ctx) {
    const { t } = ctx
    const answer = ctx.c('door.answer') ?? { hour: 4, minute: 30 }
    const hints = ctx.c('door.hints') ?? []
    const cleanups = []

    root.innerHTML = `
      ${defsSVG()}
      <div class="dw">
        <div class="dw__sky">${skySVG()}</div>
        <div class="dw__facade">
          <div class="dw__eave"></div>
          <div class="wall porch">
            <div class="porch__win porch__win--l">${windowSVG()}</div>
            <div class="porch__win porch__win--r">${windowSVG()}</div>
            <div class="door">
              <div class="door__inside">${insideSVG()}</div>
              <div class="door__leaf">
                ${leafSVG()}
                <div class="lock" role="slider" tabindex="0"
                     aria-label="${t('door.lock')}" aria-valuemin="0" aria-valuemax="715">
                  ${lockSVG()}
                </div>
                <div class="door__shade"></div>
              </div>
            </div>
            ${porchSVG()}
            <p class="who hand" data-who>${t('door.who')}</p>
          </div>
          <div class="dw__controls">
            <p class="hint hand" data-hint aria-live="polite">${t('door.howto')}</p>
            <button class="btn" type="button" data-try>${t('door.try')}</button>
          </div>
        </div>
      </div>`

    const $ = (s) => root.querySelector(s)
    const tile = grain()
    if (tile) root.style.setProperty('--grain', tile)
    const world = $('.dw')
    const door = $('.door')
    const lock = $('.lock')
    const hourHand = $('[data-hand="hour"]')
    const minHand = $('[data-hand="minute"]')
    const hint = $('[data-hint]')
    const tryBtn = $('[data-try]')
    const who = $('[data-who]')
    const controls = $('.dw__controls')
    const glows = root.querySelectorAll('[data-lamp-glow], [data-lamp]')
    const leaf = $('.door__leaf')
    const shade = $('.door__shade')
    const spill = $('[data-spill]')

    // ── the clock ──
    let mins = 600 // 0‥719 — starts at 10:00: hands apart, nothing given away
    let shownM = 0, shownH = 300 // unwrapped degrees, so hands never spin the long way round
    let busy = false
    let attempt = 0

    const hourOf = (m) => Math.floor(m / 60) % 12 || 12
    const pad = (n) => String(n).padStart(2, '0')

    function render() {
      const m = mins % 60
      const targetM = m * 6
      const targetH = (mins % 720) * 0.5
      shownM += ((targetM - shownM) % 360 + 540) % 360 - 180
      shownH += ((targetH - shownH) % 360 + 540) % 360 - 180
      minHand.style.transform = `rotate(${shownM}deg)`
      hourHand.style.transform = `rotate(${shownH}deg)`
      lock.setAttribute('aria-valuenow', String(mins))
      lock.setAttribute('aria-valuetext', ctx.fill(t('door.time'), { h: hourOf(mins), m: pad(m) }))
    }

    function setMins(v, { quiet = false } = {}) {
      v = mod(Math.round(v), 720)
      if (v === mins) return
      mins = v
      render()
      if (!quiet) ctx.sound.play('tick', { rate: 0.2 })
    }

    const snap5 = (v) => Math.round(v / 5) * 5
    const lockFace = lock.querySelector('svg')

    // ── nudges: if she does nothing for a while, point at the next thing to touch, in the
    // porch's own language. phase 'lock' (she hasn't turned the hands since the last try): the
    // brass catches the light and the lock rattles, as if someone tried it from outside.
    // phase 'try' (she has): the button warms up like the lamp it's about to switch on.
    // Both are the main action of their phase, so a hand-drawn arrow joins in if she's stuck.
    let phase = 'lock'
    let nudgeTl = null
    const hintStyle = (el) => {
      const cls = el === lock ? 'nudge-lock' : 'nudge-try'
      nudgeTl?.progress(1).kill()
      root.classList.add(cls)
      nudgeTl = gsap.timeline({ onComplete: () => root.classList.remove(cls) })
      if (el === lock) {
        nudgeTl
          .call(() => lockFace.classList.add('nudge--glint'))
          .to(lockFace, { rotation: -7, duration: 0.14, ease: 'power2.out', transformOrigin: '50% 50%' })
          .to(lockFace, { rotation: 6, duration: 0.16, ease: 'power1.inOut' })
          .to(lockFace, { rotation: 0, duration: 0.7, ease: 'elastic.out(1.1, 0.35)' })
          .call(() => lockFace.classList.remove('nudge--glint'))
      } else {
        nudgeTl.to({}, { duration: 1.6 }) // the glow (CSS) breathes on, then lets go
      }
      return nudgeTl
    }
    const guide = nudge(lock, { style: hintStyle, arrow: true })
    cleanups.push(() => guide.stop())
    /** Point the nudge at whatever's next (nothing while the door is opening). */
    const idle = () => guide.set(busy ? [] : phase === 'lock' ? lock : tryBtn)

    // which hand did she grab? the one nearest her finger; a tie goes to the minute hand
    let which = null, rawM = 0, rawH = 0
    const clockAngle = (a) => mod(a + Math.PI / 2, TAU) // screen angle → 0 at 12 o'clock
    cleanups.push(
      onRotate(lock, {
        center: () => rectCenter(lock),
        onStart(a) {
          if (busy) return false
          guide.set([]) // no hints while her finger is on it
          nudgeTl?.progress(1).kill()
          const ca = clockAngle(a)
          const dm = gap(ca, ((mins % 60) / 60) * TAU)
          const dh = gap(ca, ((mins % 720) / 720) * TAU)
          which = dh + 0.2 < dm ? 'hour' : 'minute'
          rawM = mins
          rawH = Math.floor(mins / 60)
          lock.classList.add('is-turning')
          ;(which === 'hour' ? hourHand : minHand).classList.add('is-held')
          // press: the brass squashes in under her finger
          ctx.sound.play('tap')
          gsap.to(lockFace, { scale: 0.95, duration: 0.08, ease: 'power2.out', transformOrigin: '50% 50%', overwrite: 'auto' })
        },
        onRotate(d) {
          const before = mins
          if (which === 'minute') {
            rawM += (d / TAU) * 60
            setMins(snap5(rawM))
          } else {
            rawH += (d / TAU) * 12
            setMins(mod(Math.round(rawH), 12) * 60 + (mins % 60))
          }
          if (mins !== before) phase = 'try'
        },
        onEnd() {
          lock.classList.remove('is-turning')
          hourHand.classList.remove('is-held')
          minHand.classList.remove('is-held')
          which = null
          gsap.to(lockFace, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)', overwrite: 'auto' })
          idle()
        },
      }),
    )

    const onKey = (e) => {
      if (busy) return
      const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 60, PageDown: -60 }[e.key]
      if (step) {
        e.preventDefault()
        setMins(mins + step)
        phase = 'try'
        idle()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        check()
      }
    }
    lock.addEventListener('keydown', onKey)
    cleanups.push(() => lock.removeEventListener('keydown', onKey))

    // ── trying the lock ──
    let tl = null // the one timeline for the current multi-step moment (wrong try, or opening)

    function check() {
      if (busy) return
      guide.set([])
      nudgeTl?.progress(1).kill()
      const ok = Math.floor(mins / 60) % 12 === answer.hour % 12 && mins % 60 === answer.minute
      if (ok) open()
      else wrong()
    }

    function wrong() {
      const line = hints[Math.min(attempt, hints.length - 1)]
      attempt++
      phase = 'lock'
      tl?.progress(1).kill()
      const showHint = () => {
        if (line) hint.textContent = line
        hint.classList.add('hint--wrong')
      }
      // the lock rattles first (knock — the button's press was the first knock); the hint
      // lands once the rattle has. Reduced motion: the same timeline, compressed.
      tl = moment({ onComplete: idle })
      tl.to(lock, { keyframes: { x: [0, -9, 8, -6, 4, -2, 0] }, duration: 0.42, ease: 'none' })
      beat(tl, 'tap', 0.14)
      tl.call(showHint)
      tl.fromTo(hint, { scale: 0.7, rotation: -8 }, { scale: 1, rotation: -2, duration: T.move, ease: 'back.out(2.6)' })
    }

    function finish() {
      ctx.state.update({ doorSeen: true })
      ctx.go('house')
    }

    function open() {
      busy = true
      guide.stop()
      voiceTl?.kill()
      tl?.progress(1).kill()
      tryBtn.disabled = true
      lock.setAttribute('aria-disabled', 'true')
      root.classList.add('is-unlocked')

      // ONE timeline: click → lamp → creak + swing → "welcome" → pull-back → house.
      // Reduced motion runs the same beats compressed (moment() timeScale), with a fade
      // instead of the camera pull-back.
      tl = moment({ onComplete: finish })
      // 1. the lock clicks: a little brass jump
      beat(tl, 'lockClick', 0)
      tl.to(lock, { scale: 1.08, duration: T.tap, yoyo: true, repeat: 1, ease: 'power2.out' }, 0)
      tl.to(controls, { opacity: 0, y: 16, duration: 0.4, ease: 'power1.in' }, 0.25)
      // 2. the porch lamp stutters on — the hum starts with the first flicker
      tl.addLabel('lamp', T.move)
      beat(tl, 'lampOn', 'lamp')
      tl.to(
        glows,
        {
          keyframes: [
            { opacity: 0.8, duration: 0.05 },
            { opacity: 0.08, duration: 0.09 },
            { opacity: 0.95, duration: 0.05 },
            { opacity: 0.3, duration: 0.12 },
            { opacity: 1, duration: 0.3 },
          ],
        },
        'lamp',
      )
      tl.call(() => root.classList.add('is-lit'), null, 'lamp+=0.61')
      // 3. the door swings in onto warm light; the creak starts as the leaf moves
      tl.addLabel('swing', 'lamp+=0.8')
      beat(tl, 'creak', 'swing')
      tl.call(() => door.classList.add('door--open'), null, 'swing')
      tl.to(leaf, { rotationY: 74, duration: T.moment, ease: EASE.inOut }, 'swing')
      tl.to(shade, { opacity: 0.55, duration: T.moment, ease: 'power1.in' }, 'swing')
      tl.to(spill, { opacity: 1, duration: 1.1, ease: 'power1.out' }, 'swing+=0.4')
      // 4. only once it's open does the voice inside answer
      tl.addLabel('open', `swing+=${T.moment}`)
      tl.to(who, { scale: 0.6, opacity: 0, duration: 0.14, ease: 'power1.in' }, 'open-=0.3')
      tl.call(() => {
        who.textContent = t('door.welcome')
        who.classList.remove('who--long')
      }, null, 'open-=0.16')
      tl.to(who, { scale: 1, opacity: 1, duration: T.move, ease: 'back.out(2.2)' }, 'open-=0.16')
      beat(tl, 'chime', 'open')
      // 5. the camera pulls back and up: the porch shrinks into the house above it
      if (ctx.reduced) {
        tl.to(world, { opacity: 0, duration: 1.2 }, 'open+=0.45') // 0.3 s once compressed
      } else {
        tl.set(world, { willChange: 'transform' }, 'open+=0.45')
        tl.to(world, { scale: 0.7, yPercent: 10, duration: 0.95, ease: EASE.inOut }, 'open+=0.45')
      }
    }

    const onTry = () => check()
    tryBtn.addEventListener('click', onTry)
    cleanups.push(press(tryBtn))
    cleanups.push(() => tryBtn.removeEventListener('click', onTry))

    // first touch anywhere unlocks audio (iOS needs a gesture); nudge() restarts its own wait
    const unlock = () => ctx.sound.unlock()
    root.addEventListener('pointerdown', unlock, { once: true })
    cleanups.push(() => root.removeEventListener('pointerdown', unlock))

    // ── tapping around: everything on the porch answers like what it is ──
    // The voice behind the door (the speech bubble) answers some of it; small handwritten
    // notes pop up by others. Lists escalate one line per tap; the last line repeats.
    const $$ = (s) => [...root.querySelectorAll(s)]
    const porch = $('.porch')
    const nth = (list, n) => (Array.isArray(list) ? list[Math.min(n, list.length) - 1] : list)
    const d = (s) => (ctx.reduced ? 0.01 : s) // motion durations (holds stay real time)
    const pokeables = [] // everything tweened here, for teardown
    const on = (el, fn) => {
      el.addEventListener('pointerdown', fn)
      cleanups.push(() => el.removeEventListener('pointerdown', fn))
    }
    const scenery = (el, kind, opts) => {
      el.classList.add('pokeable')
      pokeables.push(el, opts?.target ?? el)
      cleanups.push(react(el, kind, opts))
    }

    // the voice behind the door: the bubble ducks, says its line, then goes back to asking
    let voiceTl = null
    function voice(text) {
      if (busy || !text) return
      voiceTl?.kill()
      voiceTl = gsap
        .timeline()
        .to(who, { scale: 0.75, opacity: 0, duration: d(0.1), ease: 'power1.in' })
        .call(() => {
          who.textContent = text
          who.classList.toggle('who--long', text.length > 18)
        })
        .to(who, { scale: 1, opacity: 1, duration: d(0.42), ease: 'back.out(2.4)' })
        .to(who, { scale: 0.75, opacity: 0, duration: d(0.1), ease: 'power1.in' }, `+=${Math.max(T.linger, text.length * 0.06)}`)
        .call(() => {
          who.textContent = t('door.who')
          who.classList.remove('who--long')
        })
        .to(who, { scale: 1, opacity: 1, duration: d(0.3), ease: 'back.out(2)' })
    }

    // a handwritten note above something she touched (lives in the porch, so it rides the camera)
    let noteTl = null
    function note(el, text) {
      if (busy || !text) return
      noteTl?.progress(1).kill()
      const r = el.getBoundingClientRect()
      const p = porch.getBoundingClientRect()
      const n = document.createElement('p')
      n.className = 'door-note'
      n.textContent = text
      porch.append(n)
      // centred over the thing, kept on screen
      const w = n.offsetWidth
      const cx = Math.min(innerWidth - 8 - w / 2, Math.max(8 + w / 2, r.left + r.width / 2))
      n.style.left = `${cx - p.left}px`
      n.style.top = `${Math.max(r.top, 48 + n.offsetHeight) - p.top - 4}px`
      noteTl = gsap
        .timeline({ onComplete: () => n.remove(), onInterrupt: () => n.remove() })
        .fromTo(n, { scale: 0.6, rotation: -9, opacity: 0, y: 8 }, { scale: 1, rotation: -3, opacity: 1, y: 0, duration: d(0.4), ease: 'back.out(2.4)' })
        .to(n, { opacity: 0, y: -10, duration: d(0.3), ease: 'power1.in' }, `+=${T.linger}`)
    }
    cleanups.push(() => noteTl?.kill())

    // the speech bubble: paper, so it flutters — and the voice guesses who's knocking
    scenery(who, 'flutter', { origin: '90% 100%', sound: 'paper', steps: [(n) => voice(nth(t('door.guesses'), n))] })

    // the door itself: wood. Two knocks; the voice asks again, less patiently each time
    const knock = $('[data-knock]')
    let knockCall = null
    scenery(knock, 'knock', {
      target: leaf,
      strength: 1.6,
      steps: [
        (n) => {
          knockCall?.kill()
          knockCall = gsap.delayedCall(0.17, () => ctx.sound.play('knock'))
          voice(nth(t('door.knocks'), n))
        },
      ],
    })
    cleanups.push(() => knockCall?.kill())

    // the knob turns half-way, clunks against the bolt — locked — and springs back
    const knob = $('[data-knob]')
    const knobTurn = $('[data-knob-turn]')
    let knobN = 0
    let knobTl = null
    knob.classList.add('pokeable')
    knob.dataset.react = 'turn'
    pokeables.push(knob, knobTurn)
    on(knob, () => {
      knobN++
      haptic(8)
      ctx.sound.play('tick')
      knobTl?.kill()
      knobTl = gsap
        .timeline()
        .to(knobTurn, { rotation: -60, svgOrigin: '205 272', duration: d(0.2), ease: 'power2.out' })
        .call(() => {
          ctx.sound.play('knock') // the bolt: it doesn't give
          haptic(14)
        })
        .to(knob, { keyframes: { x: [1.4, -1.2, 0.7, 0] }, duration: d(0.2), ease: 'none' })
        .to(knobTurn, { rotation: 0, duration: d(0.6), ease: 'elastic.out(1.1, 0.4)' }, '+=0.12')
      voice(nth(t('door.knob'), knobN))
    })

    // the doormat: lift a corner and there's a key-shaped patch of clean floor. No key.
    const mat = $('.porch-art .mat')
    let matN = 0
    let matTl = null
    mat.classList.add('pokeable')
    mat.dataset.react = 'lift'
    pokeables.push(mat)
    on(mat, () => {
      matN++
      haptic(6)
      ctx.sound.play('paper')
      matTl?.kill()
      matTl = gsap
        .timeline()
        .to(mat, { rotation: -12, svgOrigin: '128 607', duration: d(0.3), ease: 'power2.out' })
        .to(mat, { rotation: 0, duration: d(0.45), ease: 'power2.in' }, `+=${ctx.reduced ? 0.6 : 1.1}`)
        .call(() => ctx.sound.play('squish'))
        .to(mat, { keyframes: { scaleY: [0.92, 1] }, svgOrigin: '220 607', duration: d(0.3), ease: 'power1.out' })
      voice(nth(t('door.mat'), matN))
    })

    // moths: they live in the plant and come out for the porch lamp
    const moths = $$('[data-moth]')
    const mothTweens = new Set()
    const LAMP = { x: 392, y: 294 } // the lantern glass, porch units
    function mothFly() {
      if (ctx.reduced) return
      const m = moths.find((x) => !x.dataset.flying)
      if (!m) return
      m.dataset.flying = '1'
      const i = moths.indexOf(m)
      const wings = m.querySelector('.moth__wings')
      const flap = gsap.to(wings, { scaleX: 0.3, duration: 0.06, repeat: -1, yoyo: true, ease: 'sine.inOut', transformOrigin: '50% 40%' })
      const from = { x: 50 + i * 12, y: 440 + i * 14 }
      const exit = { x: 300 + i * 40, y: -40 }
      const spin = 2.2 + i * 0.4 // orbits of the lamp
      const a0 = Math.PI * (0.9 + i * 0.6)
      const at = (u) => {
        const a = a0 + u * spin * Math.PI * 2
        return { x: LAMP.x + Math.cos(a) * (30 + i * 6), y: LAMP.y + Math.sin(a) * (20 + i * 3) + Math.sin(u * 40 + i) * 3 }
      }
      const mix = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k })
      const ease = (k) => k * k * (3 - 2 * k)
      let last = from
      const p = { u: 0 }
      const tw = gsap.to(p, {
        u: 1,
        duration: 5 + i * 0.6,
        ease: 'none',
        onUpdate() {
          const u = p.u
          let pos
          if (u < 0.22) pos = mix({ x: from.x, y: from.y - Math.sin((u / 0.22) * Math.PI) * 60 }, at(0), ease(u / 0.22))
          else if (u < 0.84) pos = at((u - 0.22) / 0.62)
          else pos = mix(at(1), exit, ease((u - 0.84) / 0.16))
          const ang = (Math.atan2(pos.y - last.y, pos.x - last.x) * 180) / Math.PI + 90
          last = pos
          m.setAttribute('transform', `translate(${pos.x.toFixed(1)},${pos.y.toFixed(1)}) rotate(${ang.toFixed(0)}) scale(1.8)`)
          m.setAttribute('opacity', String(Math.min(1, u / 0.05, (1 - u) / 0.08)))
        },
        onComplete: done,
      })
      function done() {
        flap.kill()
        mothTweens.delete(tw)
        delete m.dataset.flying
        m.setAttribute('opacity', '0')
      }
      mothTweens.add(tw)
      mothTweens.add(flap)
    }
    cleanups.push(() => mothTweens.forEach((tw) => tw.kill()))

    // the plant: paper leaves flutter; from the second tap on, a moth comes out of it
    const leaves = $('.plant__leaves')
    scenery($('.porch-art .plant'), 'flutter', { target: leaves, origin: '56 514', svgOrigin: true, strength: 1.5, steps: [() => {}, () => mothFly()] })

    // the lamp: swings on its arm, flickers hopefully (it isn't on yet), and the moths come
    const lantern = $('.lamp__lantern')
    const lampLight = $('.porch-art [data-lamp]')
    scenery($('.porch-art .lamp'), 'sway', {
      target: lantern,
      origin: '50% 0%',
      strength: 0.8,
      sound: 'chain',
      steps: [
        (n) => {
          if (busy) return
          if (!ctx.reduced) gsap.fromTo(lampLight, { opacity: 0.8 }, { keyframes: { opacity: [0.3, 0.65, 0.25] }, duration: 0.5, ease: 'none' })
          for (let k = 0; k < Math.min(n, 3); k++) mothFly()
          if (n >= 3) voice(t('door.lamp'))
        },
      ],
    })

    // the flowers: she plucks a petal per tap (loves me, loves me not — it always comes out right)
    const flowers = $('.porch-art .flowers')
    const blooms = $('.flowers__top')
    const petals = $$('.flowers__top .petal')
    const petalTweens = new Set()
    function pluck() {
      const left = petals.filter((x) => !x.dataset.gone)
      if (!left.length) return
      const src = left[Math.floor(Math.random() * left.length)]
      src.dataset.gone = '1'
      const fall = src.cloneNode()
      fall.classList.add('petal--fall')
      blooms.append(fall)
      gsap.set(src, { opacity: 0 })
      const side = Math.random() < 0.5 ? -1 : 1
      const tl = gsap.timeline({ onComplete: () => (fall.remove(), petalTweens.delete(tl)) })
      if (!ctx.reduced) tl.to(fall, { x: side * (14 + Math.random() * 16), y: 46 + Math.random() * 20, rotation: side * 140, duration: 1.5, ease: 'sine.in' })
      tl.to(fall, { opacity: 0, duration: d(0.4) }, '-=0.4')
      // it grows back while she isn't looking
      tl.to(src, { opacity: 1, duration: 1.2, onComplete: () => delete src.dataset.gone }, '+=4')
      petalTweens.add(tl)
    }
    cleanups.push(() => petalTweens.forEach((tl) => tl.kill()))
    scenery(flowers, 'flutter', {
      target: blooms,
      origin: '389 534',
      svgOrigin: true,
      steps: [
        (n) => {
          pluck()
          note(flowers, nth(t('door.petals'), n))
        },
      ],
    })

    // the cat in the gable vent: eyes open in the dark heart. Glances; meows; then looks at the lock.
    const vent = $('[data-vent]')
    const eyes = $('[data-vent-eyes]')
    const eyeEls = $$('.vent-cat__eye')
    const pupils = $$('.vent-cat__pupil')
    gsap.set([...eyeEls, ...pupils], { transformOrigin: '50% 50%' })
    let ventN = 0
    let ventTl = null
    vent.dataset.react = 'cat'
    vent.classList.add('pokeable')
    pokeables.push(eyes, ...eyeEls, ...pupils)
    on(vent, () => {
      ventN++
      haptic(4)
      ventTl?.kill()
      const tl = (ventTl = gsap.timeline())
      tl.set(pupils, { x: 0, y: 0 })
        .set(eyeEls, { scaleY: 0.1 })
        .to(eyes, { opacity: 1, duration: d(0.12) })
        .to(eyeEls, { scaleY: 1, duration: d(0.2), ease: 'back.out(2)' })
      if (ventN === 1) {
        ctx.sound.play('tap')
        tl.to(pupils, { x: -1.6, duration: d(0.25) }, '+=0.35')
          .to(pupils, { x: 1.6, duration: d(0.35) }, '+=0.3')
          .to(pupils, { x: 0, duration: d(0.2) }, '+=0.25')
      } else if (ventN === 2) {
        tl.call(() => {
          ctx.sound.play('meow')
          note($('.porch-art .canopy'), t('door.cat'))
        })
          .to(eyeEls, { scaleY: 0.1, duration: d(0.07), yoyo: true, repeat: 1 }, '+=0.7')
      } else {
        // it looks down at the lock — and gives her a slow blink (cat for "I like you")
        ctx.sound.play('meow', { rate: 0.8 })
        tl.to(pupils, { y: 1.8, x: -0.4, duration: d(0.3) }, '+=0.3')
          .to(eyeEls, { scaleY: 0.12, duration: d(0.4), ease: 'sine.inOut' }, '+=0.7')
          .to(eyeEls, { scaleY: 1, duration: d(0.4), ease: 'sine.inOut' }, '+=0.25')
          .to(pupils, { y: 0, x: 0, duration: d(0.3) }, '+=0.2')
      }
      tl.to(eyeEls, { scaleY: 0.1, duration: d(0.12) }, '+=0.7').to(eyes, { opacity: 0, duration: d(0.15) })
    })

    // the blank nameplate on twine: it swings; then someone pencils on it
    const pencil = $('[data-plate-pencil]')
    let pencilTl = null
    function scribble(text) {
      if (pencil.textContent === text) return
      pencilTl?.kill()
      pencilTl = gsap.timeline()
      if (pencil.textContent) pencilTl.to(pencil, { opacity: 0, duration: d(0.2) })
      pencilTl.call(() => (pencil.textContent = text))
      for (let k = 0; k < 4; k++) pencilTl.call(() => ctx.sound.play('scratch'), null, `>+=${k ? 0.09 : 0}`)
      pencilTl.fromTo(pencil, { opacity: 0 }, { opacity: 0.85, duration: d(0.5), ease: 'power1.out' }, '<-0.25')
    }
    cleanups.push(() => pencilTl?.kill())
    scenery($('.leaf-art .plate'), 'sway', {
      origin: '110 136',
      svgOrigin: true,
      strength: 1.1,
      steps: [() => {}, () => scribble(nth(t('door.plate'), 1)), () => scribble(nth(t('door.plate'), 2))],
    })

    // the paper moon hangs on a thread: it swings, and every third tap a star falls
    const sky = $('.dw__sky')
    let shootTl = null
    function shootingStar() {
      if (ctx.reduced) return
      shootTl?.kill()
      const s = document.createElement('i')
      s.className = 'door-shoot'
      s.style.left = `${20 + Math.random() * 35}%`
      s.style.top = `${18 + Math.random() * 30}%`
      sky.append(s)
      ctx.sound.play('sparkle')
      shootTl = gsap
        .timeline({ onComplete: () => s.remove(), onInterrupt: () => s.remove() })
        .set(s, { rotation: 12 })
        .to(s, { x: 220, y: 46, duration: 0.85, ease: 'power1.in' })
        .to(s, { opacity: 1, duration: 0.2, ease: 'none' }, 0)
        .to(s, { opacity: 0, duration: 0.3, ease: 'none' }, 0.55)
    }
    cleanups.push(() => shootTl?.kill())
    scenery($('.dw__sky .moon'), 'sway', {
      target: $('.moon__swing'),
      origin: '50% -40%',
      strength: 0.7,
      sound: 'ting',
      steps: [(n) => n % 3 === 0 && shootingStar()],
    })

    // the paper stars: each one spins and rings a note, a little higher every time
    let starNote = 0
    for (const star of $$('.dw__sky .pstar')) {
      scenery(star, 'spin', { deg: 72, sound: null, steps: [() => ctx.sound.play('ting', { i: starNote++ })] })
    }

    // the dark windows either side (wide screens): glass rings; curtains twitch; then a remark
    for (const win of $$('.window-art')) {
      const curtains = win.querySelectorAll('.win-curtain')
      pokeables.push(...curtains)
      scenery(win, 'ring', {
        strength: 1.3,
        steps: [
          () => {},
          () => !ctx.reduced && gsap.fromTo(curtains, { skewY: 0 }, { keyframes: { skewY: [3, -2.5, 1.5, 0] }, transformOrigin: '50% 0%', duration: 0.7, ease: 'sine.inOut' }),
          (n) => note(win, nth(t('door.window'), n - 2)),
        ],
      })
    }

    // ambient
    // the sky is a strip above the roof: density per width so wide screens aren't bare
    const skyW = $('.dw__sky').clientWidth || 390
    cleanups.push(ctx.fx.starfield($('.dw__sky'), { count: Math.round(Math.min(64, Math.max(28, skyW / 26))) }))
    if (!ctx.reduced) cleanups.push(ctx.fx.fireflies($('.porch'), { count: 5 }))

    // the voice behind the door pipes up once she's had a moment to look
    // (its resting tilt is CSS `rotate`, so GSAP's rotation stays free for the reactions)
    if (!ctx.reduced) gsap.fromTo(who, { scale: 0.4, rotation: -8, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.6, delay: 0.5, ease: 'back.out(2.2)' })

    render()
    idle()

    if (ctx.params.has('debug')) {
      window.__door = {
        set: (h, m) => {
          setMins((h % 12) * 60 + m, { quiet: true })
          phase = 'try'
          idle()
        },
        get: () => ({ hour: hourOf(mins), minute: mins % 60 }),
      }
      cleanups.push(() => delete window.__door)
    }

    teardown = () => {
      tl?.kill()
      nudgeTl?.kill()
      voiceTl?.kill()
      knobTl?.kill()
      matTl?.kill()
      ventTl?.kill()
      gsap.killTweensOf([world, lock, lockFace, hint, controls, tryBtn, who, leaf, shade, spill, ...glows, ...pokeables])
      for (const el of pokeables) gsap.killTweensOf(el.querySelectorAll('*'))
      cleanups.forEach((fn) => fn())
    }
  },

  unmount() {
    teardown?.()
    teardown = null
  },
}
