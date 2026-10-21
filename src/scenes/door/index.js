/*
 * Door — the unsuspecting intro. A plain front door at night whose lock is a little brass
 * clock. Set the hands to the answer (content.door.answer) and "try": wrong → escalating hint,
 * right → lock clicks, porch lamp flickers on, the door swings in onto warm light, the camera
 * pulls back and up, and we go to the house.
 */
import './scene.css'
import { gsap } from 'gsap'
import { onRotate, rectCenter } from '../../ui/drag.js'
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

    // ── nudges: if she does nothing for a while, point at the next thing to touch ──
    // phase 'lock' (she hasn't turned the hands since the last try) → wiggle the lock;
    // phase 'try' (she has) → bounce the button. Any touch restarts the wait.
    let phase = 'lock'
    let nudgeCall = null
    let nudgeTl = null
    function idle() {
      nudgeCall?.kill()
      if (busy || ctx.reduced) return
      nudgeCall = gsap.delayedCall(4, nudge)
    }
    function nudge() {
      if (busy) return
      nudgeTl?.progress(1).kill()
      if (phase === 'lock') {
        nudgeTl = gsap
          .timeline()
          .to(lockFace, { rotation: -7, duration: 0.14, ease: 'power2.out', transformOrigin: '50% 50%' })
          .to(lockFace, { rotation: 6, duration: 0.16, ease: 'power1.inOut' })
          .to(lockFace, { rotation: 0, duration: 0.7, ease: 'elastic.out(1.1, 0.35)' })
      } else {
        nudgeTl = gsap
          .timeline()
          .to(tryBtn, { y: -10, duration: 0.18, ease: 'power2.out' })
          .to(tryBtn, { y: 0, duration: 0.6, ease: 'bounce.out' })
      }
      root.classList.add(`nudge-${phase}`)
      nudgeTl.call(() => root.classList.remove('nudge-lock', 'nudge-try'))
      nudgeCall = gsap.delayedCall(4, nudge) // keep nudging gently until she engages
    }

    // which hand did she grab? the one nearest her finger; a tie goes to the minute hand
    let which = null, rawM = 0, rawH = 0
    const clockAngle = (a) => mod(a + Math.PI / 2, TAU) // screen angle → 0 at 12 o'clock
    cleanups.push(
      onRotate(lock, {
        center: () => rectCenter(lock),
        onStart(a) {
          if (busy) return false
          nudgeCall?.kill()
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
      nudgeCall?.kill()
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
      ctx.sound.play('tap')
      if (ctx.reduced) {
        showHint()
        idle()
        return
      }
      // the lock rattles first; the hint lands once the rattle has
      tl = gsap.timeline({ onComplete: idle })
      tl.to(lock, { keyframes: { x: [0, -9, 8, -6, 4, -2, 0] }, duration: 0.42, ease: 'none' })
      tl.call(showHint)
      tl.fromTo(hint, { scale: 0.7, rotation: -8 }, { scale: 1, rotation: -2, duration: 0.5, ease: 'back.out(2.6)' })
    }

    function finish() {
      ctx.state.update({ doorSeen: true })
      ctx.go('house')
    }

    function open() {
      busy = true
      tl?.progress(1).kill()
      tryBtn.disabled = true
      lock.setAttribute('aria-disabled', 'true')
      ctx.sound.play('lockClick')
      root.classList.add('is-unlocked')

      if (ctx.reduced) {
        tl = gsap.timeline({ onComplete: finish })
        tl.set(glows, { opacity: 1 })
        tl.set(spill, { opacity: 1 })
        tl.call(() => {
          ctx.sound.play('lampOn')
          root.classList.add('is-lit')
          door.classList.add('door--open')
          gsap.set(leaf, { rotationY: 74 })
          gsap.set(shade, { opacity: 0.55 })
          who.textContent = t('door.welcome')
        })
        tl.to(world, { opacity: 0, duration: 0.3 }, 0.9)
        return
      }

      tl = gsap.timeline({ onComplete: finish })
      // 1. the lock clicks: a little brass jump
      tl.to(lock, { scale: 1.08, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }, 0)
      tl.to(controls, { opacity: 0, y: 16, duration: 0.4, ease: 'power1.in' }, 0.25)
      // 2. the porch lamp stutters on
      tl.addLabel('lamp', 0.5)
      tl.call(() => ctx.sound.play('lampOn'), null, 'lamp')
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
      // 3. the door swings in onto warm light
      tl.addLabel('swing', 'lamp+=0.8')
      tl.call(
        () => {
          ctx.sound.play('creak')
          door.classList.add('door--open')
        },
        null,
        'swing',
      )
      tl.to(leaf, { rotationY: 74, duration: 1.5, ease: 'power2.inOut' }, 'swing')
      tl.to(shade, { opacity: 0.55, duration: 1.5, ease: 'power1.in' }, 'swing')
      tl.to(spill, { opacity: 1, duration: 1.1, ease: 'power1.out' }, 'swing+=0.4')
      // 4. only once it's open does the voice inside answer
      tl.addLabel('open', 'swing+=1.5')
      tl.to(who, { scale: 0.6, opacity: 0, duration: 0.14, ease: 'power1.in' }, 'open-=0.3')
      tl.call(() => (who.textContent = t('door.welcome')), null, 'open-=0.16')
      tl.to(who, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)' }, 'open-=0.16')
      // 5. the camera pulls back and up: the porch shrinks into the house above it
      tl.set(world, { willChange: 'transform' }, 'open+=0.45')
      tl.to(world, { scale: 0.7, yPercent: 10, duration: 0.95, ease: 'power2.inOut' }, 'open+=0.45')
    }

    const onTry = () => check()
    tryBtn.addEventListener('click', onTry)
    cleanups.push(() => tryBtn.removeEventListener('click', onTry))

    // first touch anywhere unlocks audio (iOS needs a gesture); any touch restarts the idle wait
    const unlock = () => ctx.sound.unlock()
    root.addEventListener('pointerdown', unlock, { once: true })
    root.addEventListener('pointerdown', idle)
    cleanups.push(() => {
      root.removeEventListener('pointerdown', unlock)
      root.removeEventListener('pointerdown', idle)
    })

    // ── tapping around: the little things answer back ──
    const POKE = {
      '.porch-art .plant': 'sway',
      '.porch-art .flowers': 'sway',
      '.porch-art .lamp': 'lamp',
      '.porch-art .mat': 'squash',
      '.porch-art .vent': 'pop',
      '.leaf-art .plate': 'swing',
      '.leaf-art .knob': 'pop',
      '.moon': 'pop',
      '.window-art': 'pop',
      '.who': 'wiggle',
    }
    const pokeables = []
    for (const [sel, kind] of Object.entries(POKE)) {
      for (const el of root.querySelectorAll(sel)) {
        el.classList.add('pokeable')
        pokeables.push(el)
        const onPoke = (e) => {
          if (ctx.reduced) return ctx.sound.play('tap')
          poke(el, kind, e)
        }
        el.addEventListener('pointerdown', onPoke)
        cleanups.push(() => el.removeEventListener('pointerdown', onPoke))
      }
    }
    function poke(el, kind, e) {
      ctx.sound.play(kind === 'lamp' ? 'tap' : 'pop')
      if (kind !== 'lamp') ctx.fx.sparkles(e.clientX, e.clientY, { count: 6 })
      const o = { overwrite: 'auto' }
      if (kind === 'sway') {
        gsap.timeline()
          .to(el, { rotation: -6, scaleY: 0.94, duration: 0.1, transformOrigin: '50% 100%', ...o })
          .to(el, { rotation: 0, scaleY: 1, duration: 0.9, ease: 'elastic.out(1.2, 0.3)' })
      } else if (kind === 'squash') {
        gsap.timeline()
          .to(el, { scaleY: 0.82, scaleX: 1.06, duration: 0.08, transformOrigin: '50% 100%', ...o })
          .to(el, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1.2, 0.35)' })
      } else if (kind === 'swing') {
        gsap.timeline()
          .to(el, { rotation: 14, duration: 0.12, svgOrigin: '110 136', ...o })
          .to(el, { rotation: 0, duration: 1.4, ease: 'elastic.out(1.3, 0.18)' })
      } else if (kind === 'wiggle') {
        gsap.timeline()
          .to(el, { rotation: -12, duration: 0.1, ...o })
          .to(el, { rotation: -6, duration: 0.8, ease: 'elastic.out(1.4, 0.3)' })
      } else if (kind === 'lamp') {
        // not yet: a tiny hopeful flicker, then dark again (until the door opens)
        if (busy) return
        const light = el.querySelector('[data-lamp]')
        gsap.timeline()
          .to(el, { rotation: 8, duration: 0.1, svgOrigin: '392 236', ...o })
          .to(el, { rotation: 0, duration: 1, ease: 'elastic.out(1.3, 0.2)' })
          .fromTo(light, { opacity: 0.7 }, { opacity: 0.25, duration: 0.35 }, 0)
      } else {
        gsap.timeline()
          .to(el, { scale: 0.88, duration: 0.08, transformOrigin: '50% 50%', ...o })
          .to(el, { scale: 1, duration: 0.6, ease: 'back.out(3)' })
      }
    }

    // ambient
    cleanups.push(ctx.fx.starfield($('.dw__sky'), { count: 36 }))
    if (!ctx.reduced) cleanups.push(ctx.fx.fireflies($('.porch'), { count: 5 }))

    // the voice behind the door pipes up once she's had a moment to look
    if (!ctx.reduced) gsap.fromTo(who, { scale: 0.4, rotation: -14, opacity: 0 }, { scale: 1, rotation: -6, opacity: 1, duration: 0.6, delay: 0.5, ease: 'back.out(2.2)' })
    else gsap.set(who, { rotation: -6 })

    render()
    idle()

    if (ctx.params.has('debug')) {
      window.__door = {
        set: (h, m) => {
          setMins((h % 12) * 60 + m, { quiet: true })
          phase = 'try'
        },
        get: () => ({ hour: hourOf(mins), minute: mins % 60 }),
      }
      cleanups.push(() => delete window.__door)
    }

    teardown = () => {
      tl?.kill()
      nudgeTl?.kill()
      nudgeCall?.kill()
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
