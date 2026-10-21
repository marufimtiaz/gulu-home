/*
 * Living room — the clock (verb: scrub).
 * Turn the wall clock back: every anticlockwise turn rewinds 1/14 of the time from tonight to
 * 4:30 AM on the day she texted back. Frames, plant, window sky and event cards follow the
 * scrubbed date. At the very start the room goes dark, the phone on the sofa glows; tap it →
 * the first text, then the clock spins forward to now and the counter shows.
 */
import './scene.css'
import { gsap } from 'gsap'
import { onRotate, rectCenter } from '../../ui/drag.js'
import { loop } from '../../ui/motion.js'
import { parseDate } from '../../i18n.js'
import { makeScrubber } from './clock.js'
import { CLOCK, PLANT, roomSVG } from './art.js'

const TAU = Math.PI * 2
const DAWN = 0.01 // first 1 % of the span
const DEG = 180 / Math.PI
const FRAME_ORDER = [1, 0, 2] // newest photo in the middle frame

const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180
const monthDist = (a, b) => {
  const d = Math.abs(a - b) % 12
  return Math.min(d, 12 - d)
}
const bump = (m, centre, width) => Math.max(0, 1 - monthDist(m, centre) / width)

let teardown = null

export default {
  id: 'living',
  mount(root, ctx) {
    const { t, c, sound, fx, reduced } = ctx
    const start = parseDate(ctx.raw().togetherSince)
    const end = new Date()
    const scrub = makeScrubber({ start, end })
    const pool = ctx.photos.all().filter((p) => p.date && +p.date > +start)
    const events = (c('living.events') ?? [])
      .map((e) => ({ ...e, d: parseDate(e.date) }))
      .filter((e) => e.d)
      .sort((a, b) => b.d - a.d)
    const first = ctx.photos.byFile(ctx.raw().living?.firstPhoto)

    root.innerHTML = `
      <div class="lv">
        ${roomSVG()}
        <div class="lv-ui">
          <p class="lv-hint hand" data-hint>${t('living.hint')}</p>
          <div class="lv-event" data-event hidden>
            <span class="lv-event__date"></span>
            <span class="lv-event__line hand"></span>
          </div>
          <div class="lv-phonecard" data-phonecard hidden>
            <div class="lv-phonecard__phone">
              <div class="lv-phonecard__top">
                <span class="lv-phonecard__name">${c('living.firstTextFrom') ?? ''}</span>
                <span class="lv-phonecard__time">${ctx.date(start, 'time')}</span>
              </div>
              ${first ? `<img class="lv-phonecard__shot" src="${first.src}" alt="" draggable="false" />` : ''}
              <div class="lv-bubble hand" data-bubble>${c('living.firstText') ?? ''}</div>
            </div>
            <p class="lv-phonecard__on hand">${t('living.tapOn')}</p>
          </div>
          <div class="lv-counter" data-counter hidden>
            <p class="lv-counter__text display">${c('living.counter') ?? ''}</p>
            <button class="btn" type="button" data-back>${t('reward.back')}</button>
          </div>
        </div>
      </div>`

    const $ = (s) => root.querySelector(s)
    const el = {
      clock: $('[data-clock]'),
      face: $('[data-face]'),
      minute: $('[data-hand="minute"]'),
      hour: $('[data-hand="hour"]'),
      date: $('[data-date]'),
      time: $('[data-time]'),
      plate: $('[data-plate]'),
      plant: $('[data-plant]'),
      trail: $('[data-trail]'),
      arc: $('[data-hint-arc]'),
      glow: $('[data-lampglow]'),
      bulb: $('[data-bulb]'),
      dim: $('[data-dim]'),
      dawnsky: $('[data-dawnsky]'),
      phone: $('[data-phone]'),
      phoneWrap: $('[data-phonewrap]'),
      dust: $('[data-dust]'),
      rain: $('[data-rain]'),
      blossoms: $('[data-blossoms]'),
      stars: $('[data-stars]'),
      moon: $('[data-moon]'),
      moonBite: $('[data-moon-bite]'),
      seasons: Object.fromEntries([...root.querySelectorAll('[data-season]')].map((n) => [n.dataset.season, n])),
      frames: [...root.querySelectorAll('[data-frame]')],
      hint: $('[data-hint]'),
      event: $('[data-event]'),
      card: $('[data-phonecard]'),
      bubble: $('[data-bubble]'),
      counter: $('[data-counter]'),
    }
    el.clock.setAttribute('aria-label', t('living.clock'))
    el.phone.setAttribute('aria-label', t('living.phone'))

    // ── bookkeeping: everything here is undone in teardown ──
    const tweens = new Set()
    const timers = new Set()
    const tw = (x) => (tweens.add(x), x)
    const later = (fn, ms) => {
      const id = setTimeout(() => (timers.delete(id), fn()), ms)
      timers.add(id)
      return id
    }
    const offs = []

    // ── scene state ──
    let dawn = false
    let busy = false // phone moment + spin forward
    let dragging = false
    let speed = 0 // smoothed |rad/s|, for sound + sparkle
    let lastRad = scrub.rad()
    let lastDate = scrub.date()
    let lastYear = null
    let lastStep = 0
    let lastTick = 0
    let lastMonth = -1
    let snap = null
    let eventTl = null
    let hintShown = true
    const files = ['', '', '']
    const lamp = { v: 1 }
    const blend = { v: 0 } // hands → 4:30 at dawn
    const cx = CLOCK.x, cy = CLOCK.y

    // ── rendering ──
    function renderHands() {
      const now = new Date()
      const liveMin = (now.getMinutes() + now.getSeconds() / 60) * 6
      const liveHour = ((now.getHours() % 12) + now.getMinutes() / 60) * 30
      const rad = scrub.rad()
      let m = liveMin + rad * DEG
      let h = liveHour + (rad * DEG) / 12
      if (blend.v > 0) {
        m += wrap180(180 - m) * blend.v
        h += wrap180(135 - h) * blend.v
      }
      el.minute.setAttribute('transform', `rotate(${m.toFixed(2)} ${cx} ${cy})`)
      el.hour.setAttribute('transform', `rotate(${h.toFixed(2)} ${cx} ${cy})`)
      return m
    }

    let shownDate = '', shownTime = null
    function renderPlate(d, tt) {
      const ds = ctx.date(d, 'short')
      if (ds !== shownDate) el.date.textContent = shownDate = ds
      const ts = tt >= 1 ? ctx.date(new Date(), 'time') : tt <= 0 ? ctx.date(start, 'time') : ''
      if (ts !== shownTime) el.time.textContent = shownTime = ts
      const y = d.getFullYear()
      if (lastYear !== null && y !== lastYear && !reduced) {
        tw(gsap.fromTo(el.plate, { scale: 1.12 }, { scale: 1, duration: 0.35, ease: 'back.out(3)', svgOrigin: `${cx} ${cy + CLOCK.r + 40}` }))
      }
      lastYear = y
    }

    function renderFrames(d) {
      const list = ctx.photos.upTo(d, 3, pool)
      FRAME_ORDER.forEach((slot, i) => {
        const p = list[i]
        const f = p?.file ?? ''
        if (f === files[slot]) return
        files[slot] = f
        swapFrame(el.frames[slot], p)
      })
    }

    function swapFrame(frame, p) {
      const img = frame.querySelector('[data-photo]')
      const flip = frame.querySelector('[data-flip]')
      const apply = () => {
        if (p) img.setAttribute('href', p.thumb)
        else img.removeAttribute('href')
        frame.classList.toggle('lv-photo-frame--empty', !p)
      }
      if (reduced || !frame.dataset.ready) {
        frame.dataset.ready = '1'
        apply()
        return
      }
      gsap.killTweensOf(flip)
      const b = frame.getBBox()
      const origin = `${b.x + b.width / 2} ${b.y + b.height / 2}`
      tw(
        gsap
          .timeline()
          .to(flip, { scaleX: 0, duration: 0.09, ease: 'power1.in', svgOrigin: origin, onComplete: apply })
          .to(flip, { scaleX: 1, duration: 0.22, ease: 'back.out(2.2)', svgOrigin: origin }),
      )
    }

    function renderPlant(tt) {
      const s = 0.3 + 0.7 * tt
      el.plant.setAttribute('transform', `translate(${PLANT.x} ${PLANT.y}) scale(${s.toFixed(4)}) translate(${-PLANT.x} ${-PLANT.y})`)
    }

    function renderSky(d) {
      const m = d.getMonth() + (d.getDate() - 1) / 31
      if (Math.abs(m - lastMonth) < 0.04) return
      lastMonth = m
      const spring = bump(m, 2.3, 2.2) // Falgun–Chaitra blossoms
      const monsoon = bump(m, 7, 2.6) // Asharh–Bhadro rain
      const winter = bump(m, 0.3, 2.2)
      el.seasons.spring.setAttribute('opacity', (spring * 0.75).toFixed(3))
      el.seasons.monsoon.setAttribute('opacity', (monsoon * 0.85).toFixed(3))
      el.seasons.winter.setAttribute('opacity', (winter * 0.7).toFixed(3))
      el.blossoms.setAttribute('opacity', spring.toFixed(3))
      el.rain.setAttribute('opacity', monsoon.toFixed(3))
      el.stars.setAttribute('opacity', (1 - 0.85 * monsoon).toFixed(3))
      el.moon.setAttribute('opacity', (1 - 0.7 * monsoon).toFixed(3))
      // the moon waxes and wanes as the days rush past
      const phase = ((+d / 86400000) % 29.53) / 29.53
      el.moonBite.setAttribute('cx', (470 + 22 * Math.cos(phase * TAU)).toFixed(1))
      el.moonBite.setAttribute('opacity', (1 - 0.7 * monsoon).toFixed(3))
    }

    function renderEvents(d) {
      if (busy) {
        lastDate = d
        return
      }
      if (+d < +lastDate) {
        let hit = null
        for (const e of events) if (+e.d >= +d && +e.d < +lastDate) hit = e
        if (hit) showEvent(hit)
      }
      lastDate = d
    }

    function showEvent(e) {
      el.event.querySelector('.lv-event__date').textContent = ctx.date(e.d, 'long')
      el.event.querySelector('.lv-event__line').textContent = e.line
      el.event.hidden = false
      sound.play('chime')
      eventTl?.kill()
      eventTl = tw(
        gsap
          .timeline({ onComplete: () => (el.event.hidden = true) })
          .fromTo(el.event, { opacity: 0, y: 16, rotate: -4, scale: 0.9 }, { opacity: 1, y: 0, rotate: -1.5, scale: 1, duration: reduced ? 0.01 : 0.45, ease: 'back.out(2)' })
          .to(el.event, { opacity: 0, y: -10, duration: reduced ? 0.01 : 0.4, ease: 'power1.in' }, '+=2.2'),
      )
    }

    function render() {
      const tt = scrub.t()
      const d = scrub.date()
      const m = renderHands()
      renderPlate(d, tt)
      renderFrames(d)
      renderPlant(tt)
      renderSky(d)
      renderEvents(d)
      const flicker = speed > 3 ? 1 - Math.min(0.35, speed / 70) * Math.random() : 1
      el.glow.setAttribute('opacity', (lamp.v * flicker).toFixed(3))
      el.bulb.setAttribute('opacity', (0.25 + 0.75 * lamp.v).toFixed(3))
      el.trail.setAttribute('opacity', Math.min(0.9, speed / 28).toFixed(3))
      return m
    }

    // ── time dust: little sparks flung off the rim while she spins ──
    const sparks = []
    if (!reduced) {
      const NS = 'http://www.w3.org/2000/svg'
      for (let i = 0; i < 22; i++) {
        const n = document.createElementNS(NS, 'circle')
        n.setAttribute('r', '2.4')
        n.setAttribute('opacity', '0')
        el.dust.append(n)
        sparks.push({ n, life: 0, x: 0, y: 0, vx: 0, vy: 0 })
      }
    }
    let sparkDebt = 0
    function stepSparks(dt, minuteDeg) {
      if (!sparks.length) return
      sparkDebt = speed > 4 ? Math.min(3, sparkDebt + (speed - 4) * dt * 1.4) : 0
      while (sparkDebt >= 1) {
        sparkDebt -= 1
        const s = sparks.find((p) => p.life <= 0)
        if (!s) break
        const a = ((minuteDeg + (Math.random() - 0.5) * 40) / DEG) - Math.PI / 2
        const r = CLOCK.r + 4
        s.x = cx + Math.cos(a) * r
        s.y = cy + Math.sin(a) * r
        const out = 30 + Math.random() * 50
        const tang = -Math.sign(scrub.velocity() || -1) * (20 + Math.random() * 30)
        s.vx = Math.cos(a) * out - Math.sin(a) * tang
        s.vy = Math.sin(a) * out + Math.cos(a) * tang
        s.life = 1
        s.n.setAttribute('r', (1.4 + Math.random() * 2).toFixed(1))
      }
      for (const s of sparks) {
        if (s.life <= 0) continue
        s.life -= dt * 1.4
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.vy -= 8 * dt
        s.n.setAttribute('cx', s.x.toFixed(1))
        s.n.setAttribute('cy', s.y.toFixed(1))
        s.n.setAttribute('opacity', Math.max(0, s.life).toFixed(2))
      }
    }

    function tickSound() {
      const step = Math.floor(scrub.rad() / (TAU / 12))
      if (step === lastStep) return
      lastStep = step
      const now = performance.now()
      if (now - lastTick < 45) return
      lastTick = now
      sound.play('tick', { rate: Math.min(1, speed / 25) })
    }

    // ── dawn: 4:30 AM, 20 April 2022 ──
    function snapToStart() {
      snap?.kill()
      if (reduced) {
        scrub.set(0)
        return
      }
      const o = { t: scrub.t() }
      snap = tw(gsap.to(o, { t: 0, duration: 0.7, ease: 'power2.out', onUpdate: () => scrub.set(o.t) }))
    }

    function enterDawn() {
      dawn = true
      root.classList.add('living--dawn')
      el.phone.classList.add('lv-phone--on')
      el.phone.setAttribute('tabindex', '0')
      const d = reduced ? 0.01 : 1
      tw(gsap.to(el.dim, { attr: { opacity: 0.76 }, duration: 1.4 * d, ease: 'power2.inOut' }))
      tw(gsap.to(lamp, { v: 0, duration: 0.8 * d, ease: 'steps(4)' }))
      tw(gsap.to(blend, { v: 1, duration: 1.2 * d, ease: 'power2.out' }))
      tw(gsap.to(el.dawnsky, { attr: { opacity: 1 }, duration: 2 * d, delay: 0.4 * d }))
      tw(gsap.to(el.phoneWrap, { attr: { opacity: 1 }, duration: 0.9 * d, delay: 0.9 * d }))
      setHint(t('living.tapPhone'), 1.6)
      sound.play('sparkle')
      if (!dragging) snapToStart()
    }

    function exitDawn() {
      dawn = false
      root.classList.remove('living--dawn')
      el.phone.classList.remove('lv-phone--on')
      el.phone.setAttribute('tabindex', '-1')
      gsap.killTweensOf([el.dim, lamp, blend, el.dawnsky, el.phoneWrap])
      const d = reduced ? 0.01 : 1
      tw(gsap.to(el.dim, { attr: { opacity: 0 }, duration: 0.6 * d }))
      tw(gsap.to(lamp, { v: 1, duration: 0.4 * d }))
      tw(gsap.to(blend, { v: 0, duration: 0.5 * d }))
      tw(gsap.to(el.dawnsky, { attr: { opacity: 0 }, duration: 0.5 * d }))
      tw(gsap.to(el.phoneWrap, { attr: { opacity: 0 }, duration: 0.3 * d }))
      setHint(null)
    }

    function setHint(text, delay = 0) {
      if (!text) {
        hintShown = false
        gsap.killTweensOf(el.hint)
        tw(gsap.to(el.hint, { opacity: 0, duration: 0.3 }))
        return
      }
      hintShown = true
      el.hint.textContent = text
      gsap.killTweensOf(el.hint)
      tw(gsap.fromTo(el.hint, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: reduced ? 0.01 : 0.6, delay: reduced ? 0 : delay }))
    }

    function openPhone() {
      if (!dawn || busy) return
      busy = true
      snap?.kill()
      scrub.set(0)
      sound.play('tap')
      setHint(null)
      el.phone.classList.remove('lv-phone--on')
      el.card.hidden = false
      const d = reduced ? 0.01 : 1
      tw(gsap.fromTo(el.card, { opacity: 0, y: 70, scale: 0.55, rotate: -6 }, { opacity: 1, y: 0, scale: 1, rotate: -1.5, duration: 0.75 * d, ease: 'back.out(1.5)' }))
      tw(gsap.set(el.bubble, { opacity: 0, scale: 0.4 }))
      later(() => {
        sound.play('pop')
        tw(gsap.to(el.bubble, { opacity: 1, scale: 1, duration: 0.55 * d, ease: 'back.out(2.4)' }))
        const r = el.bubble.getBoundingClientRect()
        fx.hearts?.(r.left + r.width * 0.85, r.top + r.height / 2, { count: 6 })
      }, reduced ? 0 : 1000)
      later(goOn, reduced ? 1600 : 5200)
    }

    let goneOn = false
    function goOn() {
      if (goneOn || !busy) return
      goneOn = true
      const d = reduced ? 0.01 : 1
      tw(
        gsap.to(el.card, {
          opacity: 0,
          y: 40,
          scale: 0.8,
          duration: 0.5 * d,
          ease: 'power2.in',
          onComplete: () => {
            el.card.hidden = true
            spinForward()
          },
        }),
      )
    }

    function spinForward() {
      dawn = false
      root.classList.remove('living--dawn')
      sound.play('whoosh')
      const d = reduced ? 0.01 : 1
      gsap.killTweensOf([el.dim, lamp, blend, el.dawnsky, el.phoneWrap])
      const o = { t: 0 }
      tw(gsap.to(blend, { v: 0, duration: 0.6 * d }))
      tw(gsap.to(el.phoneWrap, { attr: { opacity: 0 }, duration: 0.5 * d }))
      tw(gsap.to(el.dawnsky, { attr: { opacity: 0 }, duration: 1.4 * d }))
      tw(gsap.to(el.dim, { attr: { opacity: 0 }, duration: 2 * d, delay: 0.4 * d, ease: 'power1.inOut' }))
      tw(
        gsap.to(o, {
          t: 1,
          duration: 2.6 * d,
          ease: 'power2.inOut',
          onUpdate: () => scrub.set(o.t),
          onComplete: () => {
            scrub.set(1)
            // the lamp comes back on with a little flicker
            tw(
              gsap
                .timeline()
                .to(lamp, { v: 0.7, duration: 0.06 * d })
                .to(lamp, { v: 0.15, duration: 0.08 * d })
                .to(lamp, { v: 1, duration: 0.35 * d, ease: 'power2.out' }),
            )
            sound.play('lampOn')
            busy = false
            goneOn = false
            el.phone.setAttribute('tabindex', '-1')
            showCounter()
            ctx.complete()
          },
        }),
      )
    }

    function showCounter() {
      el.counter.hidden = false
      tw(gsap.fromTo(el.counter, { opacity: 0, y: 24, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: reduced ? 0.01 : 0.7, ease: 'back.out(1.8)' }))
    }

    function hideCounter() {
      if (el.counter.hidden) return
      gsap.killTweensOf(el.counter)
      tw(gsap.to(el.counter, { opacity: 0, duration: 0.25, onComplete: () => (el.counter.hidden = true) }))
    }

    // ── input ──
    offs.push(
      onRotate(el.clock, {
        center: () => rectCenter(el.face),
        onStart() {
          if (busy) return false
          sound.unlock()
          dragging = true
          snap?.kill()
          scrub.fling(0)
          hideCounter()
          if (hintShown && !dawn) setHint(null)
          el.arc.classList.add('lv-hint-arc--gone')
        },
        onRotate(d) {
          scrub.angle(d)
        },
        onEnd(v) {
          dragging = false
          if (dawn) snapToStart()
          else scrub.fling(v)
        },
      }),
    )

    const onKey = (e) => {
      if (busy) return
      const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key]
      if (!step) return
      e.preventDefault()
      scrub.angle((step * TAU) / 4)
    }
    el.clock.addEventListener('keydown', onKey)
    offs.push(() => el.clock.removeEventListener('keydown', onKey))

    const onPhone = (e) => {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return
      openPhone()
    }
    el.phone.addEventListener('click', onPhone)
    el.phone.addEventListener('keydown', onPhone)
    offs.push(() => {
      el.phone.removeEventListener('click', onPhone)
      el.phone.removeEventListener('keydown', onPhone)
    })
    const onCard = () => goOn()
    el.card.addEventListener('click', onCard)
    offs.push(() => el.card.removeEventListener('click', onCard))
    const onBack = () => ctx.back()
    const backBtn = root.querySelector('[data-back]')
    backBtn.addEventListener('click', onBack)
    offs.push(() => backBtn.removeEventListener('click', onBack))

    // ── run ──
    // very wide screens (a phone turned sideways): keep the clock whole, let the floor crop instead
    const art = root.querySelector('.lv-art')
    const fit = () => {
      const wide = innerWidth / Math.max(1, innerHeight) > 1.7
      art.setAttribute('preserveAspectRatio', wide ? 'xMidYMin slice' : 'xMidYMid slice')
    }
    fit()
    addEventListener('resize', fit)
    offs.push(() => removeEventListener('resize', fit))

    const stopLayer = sound.layer('clock')
    render()
    if (!reduced) setHint(t('living.hint'), 0.9)
    else el.hint.style.opacity = '1'

    const stop = loop((dt) => {
      scrub.tick(dt)
      const rad = scrub.rad()
      const inst = Math.min(60, Math.abs(rad - lastRad) / Math.max(dt, 1e-3))
      lastRad = rad
      speed = speed * 0.8 + inst * 0.2
      if (!busy && !dawn && scrub.t() < DAWN) enterDawn()
      else if (!busy && dawn && scrub.t() > DAWN * 1.6) exitDawn()
      const m = render()
      stepSparks(dt, m)
      tickSound()
    })

    if (ctx.params.has('debug')) {
      window.__living = {
        seek(x) {
          if (busy) return
          snap?.kill()
          scrub.set(x)
          lastRad = scrub.rad() // a jump is not a spin: no sparks, no tick burst
          lastStep = Math.floor(lastRad / (TAU / 12))
          render()
        },
        t: () => scrub.t(),
      }
    }

    let gone = false
    const down = () => {
      if (gone) return
      gone = true
      stop()
      stopLayer?.()
      offs.forEach((fn) => fn())
      timers.forEach(clearTimeout)
      tweens.forEach((x) => x.kill())
      gsap.killTweensOf([el.dim, lamp, blend, el.dawnsky, el.phoneWrap, el.hint, el.card, el.bubble, el.counter, el.event, el.plate])
      el.frames.forEach((f) => gsap.killTweensOf(f.querySelector('[data-flip]')))
      if (window.__living) delete window.__living
    }
    teardown = down
    ctx.onCleanup(down)
  },
  unmount() {
    teardown?.()
    teardown = null
  },
}
