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

    // which hand did she grab? the one nearest her finger; a tie goes to the minute hand
    let which = null, rawM = 0, rawH = 0
    const clockAngle = (a) => mod(a + Math.PI / 2, TAU) // screen angle → 0 at 12 o'clock
    cleanups.push(
      onRotate(lock, {
        center: () => rectCenter(lock),
        onStart(a) {
          if (busy) return false
          const ca = clockAngle(a)
          const dm = gap(ca, ((mins % 60) / 60) * TAU)
          const dh = gap(ca, ((mins % 720) / 720) * TAU)
          which = dh + 0.2 < dm ? 'hour' : 'minute'
          rawM = mins
          rawH = Math.floor(mins / 60)
          lock.classList.add('is-turning')
          ;(which === 'hour' ? hourHand : minHand).classList.add('is-held')
        },
        onRotate(d) {
          if (which === 'minute') {
            rawM += (d / TAU) * 60
            setMins(snap5(rawM))
          } else {
            rawH += (d / TAU) * 12
            setMins(mod(Math.round(rawH), 12) * 60 + (mins % 60))
          }
        },
        onEnd() {
          lock.classList.remove('is-turning')
          hourHand.classList.remove('is-held')
          minHand.classList.remove('is-held')
          which = null
        },
      }),
    )

    const onKey = (e) => {
      if (busy) return
      const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 60, PageDown: -60 }[e.key]
      if (step) {
        e.preventDefault()
        setMins(mins + step)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        check()
      }
    }
    lock.addEventListener('keydown', onKey)
    cleanups.push(() => lock.removeEventListener('keydown', onKey))

    // ── trying the lock ──
    let tl = null

    function check() {
      if (busy) return
      const ok = Math.floor(mins / 60) % 12 === answer.hour % 12 && mins % 60 === answer.minute
      if (ok) open()
      else wrong()
    }

    function wrong() {
      ctx.sound.play('tap')
      const line = hints[Math.min(attempt, hints.length - 1)]
      attempt++
      if (line) hint.textContent = line
      hint.classList.add('hint--wrong')
      if (ctx.reduced) return
      gsap.fromTo(lock, { x: 0 }, { keyframes: { x: [0, -9, 8, -6, 4, -2, 0] }, duration: 0.5, ease: 'none' })
      gsap.fromTo(hint, { scale: 0.86, rotate: -6 }, { scale: 1, rotate: -2, duration: 0.45, ease: 'back.out(2.4)' })
    }

    function finish() {
      ctx.state.update({ doorSeen: true })
      ctx.go('house')
    }

    function open() {
      busy = true
      tryBtn.disabled = true
      lock.setAttribute('aria-disabled', 'true')
      ctx.sound.play('lockClick')
      root.classList.add('is-unlocked')

      if (ctx.reduced) {
        gsap.set(glows, { opacity: 1 })
        root.classList.add('is-lit')
        door.classList.add('door--open')
        who.textContent = t('door.welcome')
        ctx.sound.play('lampOn')
        tl = gsap.timeline({ delay: 0.6 }).to(world, { opacity: 0, duration: 0.3 }).call(finish)
        return
      }

      tl = gsap.timeline()
      tl.to(lock, { scale: 1.07, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }, 0)
      tl.call(() => ctx.sound.play('lampOn'), null, 0.5)
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
        0.5,
      )
      tl.call(() => root.classList.add('is-lit'), null, 1.0)
      tl.to(controls, { opacity: 0, y: 16, duration: 0.4, ease: 'power1.in' }, 1.1)
      tl.call(
        () => {
          ctx.sound.play('creak')
          door.classList.add('door--open')
          who.textContent = t('door.welcome')
        },
        null,
        1.25,
      )
      // the camera pulls back and up: the porch shrinks into the house above it
      tl.set(world, { willChange: 'transform' }, 2.6)
      tl.to(world, { scale: 0.7, yPercent: 10, duration: 0.95, ease: 'power2.inOut' }, 2.65)
      tl.call(finish, null, 3.5)
    }

    const onTry = () => check()
    tryBtn.addEventListener('click', onTry)
    cleanups.push(() => tryBtn.removeEventListener('click', onTry))

    // first touch anywhere unlocks audio (iOS needs a gesture)
    const unlock = () => ctx.sound.unlock()
    root.addEventListener('pointerdown', unlock, { once: true })
    cleanups.push(() => root.removeEventListener('pointerdown', unlock))

    // ambient
    cleanups.push(ctx.fx.starfield($('.dw__sky'), { count: 36 }))
    if (!ctx.reduced) cleanups.push(ctx.fx.fireflies($('.porch'), { count: 5 }))

    render()

    if (ctx.params.has('debug')) {
      window.__door = {
        set: (h, m) => setMins((h % 12) * 60 + m, { quiet: true }),
        get: () => ({ hour: hourOf(mins), minute: mins % 60 }),
      }
      cleanups.push(() => delete window.__door)
    }

    teardown = () => {
      tl?.kill()
      gsap.killTweensOf([world, lock, hint, controls, ...glows])
      cleanups.forEach((fn) => fn())
    }
  },

  unmount() {
    teardown?.()
    teardown = null
  },
}
