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
import { CLOCK, PLANT, SAFE, VIEW, roomSVG } from './art.js'

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
      progress: $('[data-progress]'),
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
      on: $('.lv-phonecard__on'),
      counter: $('[data-counter]'),
    }
    el.clock.setAttribute('aria-label', t('living.clock'))
    el.phone.setAttribute('aria-label', t('living.phone'))

    // ── bookkeeping: everything here is undone in teardown ──
    const tweens = new Set()
    const tw = (x) => {
      if (tweens.size > 120) for (const old of tweens) if (!old.isActive()) tweens.delete(old)
      tweens.add(x)
      return x
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
      let m = liveMin + rad * DEG + nudge.v
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
        gsap.killTweensOf(el.plate, 'scale')
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
      // continuous progress: how far back she has wound, as an arc round the rim
      el.progress.setAttribute('stroke-dasharray', `${(1 - tt).toFixed(4)} 2`)
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

    // ── moments: each is ONE timeline; starting a new one kills the last, so no two ever
    //    animate the same property. Sounds, text and state changes sit on the timeline. ──
    const D = reduced ? 0.01 : 1
    let moment = null
    const newMoment = () => {
      moment?.kill()
      moment = tw(gsap.timeline())
      return moment
    }

    function snapToStart() {
      snap?.kill()
      if (reduced) {
        scrub.set(0)
        return
      }
      const o = { t: scrub.t() }
      snap = tw(gsap.to(o, { t: 0, duration: 0.7, ease: 'power2.out', onUpdate: () => scrub.set(o.t) }))
    }

    // ── nudges: if she does nothing for ~4 s, point at the next thing to touch ──
    const nudge = { v: 0 } // degrees added to the minute hand
    let engaged = false
    let idleCall = null
    function armNudge() {
      idleCall?.kill()
      idleCall = reduced ? null : gsap.delayedCall(4, doNudge)
    }
    function stopNudge() {
      idleCall?.kill()
      idleCall = null
    }
    function doNudge() {
      if (busy) return
      if (dawn) {
        gsap.killTweensOf(el.phoneWrap, 'scale')
        tw(
          gsap
            .timeline()
            .to(el.phoneWrap, { scale: 1.35, svgOrigin: '548 640', duration: 0.18, ease: 'power2.out' })
            .to(el.phoneWrap, { scale: 1, svgOrigin: '548 640', duration: 0.8, ease: 'elastic.out(1, 0.35)' }),
        )
      } else if (!engaged) {
        gsap.killTweensOf(nudge)
        tw(gsap.timeline().to(nudge, { v: -18, duration: 0.25, ease: 'power2.out' }).to(nudge, { v: 0, duration: 1, ease: 'elastic.out(1, 0.3)' }))
        tw(gsap.fromTo(el.arc, { scale: 1.07, svgOrigin: `${cx} ${cy}` }, { scale: 1, svgOrigin: `${cx} ${cy}`, duration: 0.7, ease: 'back.out(3)' }))
      } else return
      armNudge()
    }

    // ── dawn: 4:30 AM, 20 April 2022 ──
    function enterDawn() {
      dawn = true
      hideCounter()
      root.classList.add('living--dawn')
      el.phone.classList.add('lv-phone--on')
      el.phone.setAttribute('tabindex', '0')
      setHint(null)
      stopNudge()
      if (!dragging) snapToStart()
      newMoment()
        .call(() => sound.play('sparkle'))
        .to(lamp, { v: 0, duration: 0.8 * D, ease: 'steps(4)' }, 0)
        .to(el.dim, { attr: { opacity: 0.76 }, duration: 1.4 * D, ease: 'power2.inOut' }, 0)
        .to(blend, { v: 1, duration: 1.2 * D, ease: 'power2.out' }, 0)
        .to(el.dawnsky, { attr: { opacity: 1 }, duration: 2 * D }, 0.4 * D)
        .to(el.phoneWrap, { attr: { opacity: 1 }, duration: 0.9 * D }, 0.9 * D)
        // the hint only once the phone is actually glowing
        .call(() => {
          setHint(t('living.tapPhone'))
          armNudge()
        })
    }

    function exitDawn() {
      dawn = false
      root.classList.remove('living--dawn')
      el.phone.classList.remove('lv-phone--on')
      el.phone.setAttribute('tabindex', '-1')
      setHint(null)
      stopNudge()
      newMoment()
        .to(el.dim, { attr: { opacity: 0 }, duration: 0.6 * D }, 0)
        .to(lamp, { v: 1, duration: 0.4 * D }, 0)
        .to(blend, { v: 0, duration: 0.5 * D }, 0)
        .to(el.dawnsky, { attr: { opacity: 0 }, duration: 0.5 * D }, 0)
        .to(el.phoneWrap, { attr: { opacity: 0 }, duration: 0.3 * D }, 0)
    }

    function setHint(text) {
      gsap.killTweensOf(el.hint)
      if (!text) {
        hintShown = false
        tw(gsap.to(el.hint, { opacity: 0, duration: 0.3 * D }))
        return
      }
      hintShown = true
      el.hint.textContent = text
      tw(gsap.fromTo(el.hint, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6 * D, ease: 'back.out(2)' }))
    }

    // the phone → the first text → the clock spins back to tonight → the counter
    function openPhone() {
      if (!dawn || busy) return
      busy = true
      snap?.kill()
      scrub.set(0)
      stopNudge()
      sound.play('tap')
      setHint(null)
      el.phone.classList.remove('lv-phone--on')
      el.phone.setAttribute('tabindex', '-1')
      el.card.hidden = false
      const o = { t: 0 }
      const tl = newMoment()
      tl.set(el.bubble, { opacity: 0, scale: 0.4 })
        .set(el.on, { opacity: 0 })
        .fromTo(el.card, { opacity: 0, y: 70, scale: 0.55, rotate: -6 }, { opacity: 1, y: 0, scale: 1, rotate: -1.5, duration: 0.75 * D, ease: 'back.out(1.5)' })
        .call(() => sound.play('pop'))
        .to(el.bubble, { opacity: 1, scale: 1, duration: 0.55 * D, ease: 'back.out(2.4)' })
        .call(() => {
          const r = el.bubble.getBoundingClientRect()
          fx.hearts?.(r.left + r.width * 0.85, r.top + r.height / 2, { count: 6 })
        })
        .to(el.on, { opacity: 0.9, duration: 0.4 * D }, reduced ? '>' : '+=0.6')
        .addLabel('read')
        .addLabel('out', reduced ? '+=0.8' : '+=2.6')
        .to(el.card, { opacity: 0, y: 40, scale: 0.8, duration: 0.5 * D, ease: 'power2.in' }, 'out')
        .call(() => {
          el.card.hidden = true
          dawn = false
          root.classList.remove('living--dawn')
          sound.play('whoosh')
        })
        .addLabel('spin')
        .to(blend, { v: 0, duration: 0.6 * D }, 'spin')
        .to(el.phoneWrap, { attr: { opacity: 0 }, duration: 0.5 * D }, 'spin')
        .to(el.dawnsky, { attr: { opacity: 0 }, duration: 1.4 * D }, 'spin')
        .to(el.dim, { attr: { opacity: 0 }, duration: 2 * D, ease: 'power1.inOut' }, `spin+=${0.4 * D}`)
        .to(o, { t: 1, duration: 2.6 * D, ease: 'power2.inOut', onUpdate: () => scrub.set(o.t) }, 'spin')
        // the lamp comes back on with a little flicker, then the counter
        .call(() => {
          scrub.set(1)
          sound.play('lampOn')
        })
        .to(lamp, { v: 0.7, duration: 0.06 * D })
        .to(lamp, { v: 0.15, duration: 0.08 * D })
        .to(lamp, { v: 1, duration: 0.35 * D, ease: 'power2.out' })
        .call(() => {
          busy = false
          el.counter.hidden = false
          ctx.complete()
        })
        .fromTo(el.counter, { opacity: 0, y: 24, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.7 * D, ease: 'back.out(1.8)' })
    }

    // tapping the phone card skips the wait (only once the text has landed)
    function goOn() {
      const tl = moment
      if (!busy || !tl || tl.labels.read === undefined) return
      if (tl.time() >= tl.labels.read && tl.time() < tl.labels.out) tl.seek('out', false)
    }

    function hideCounter() {
      if (el.counter.hidden) return
      gsap.killTweensOf(el.counter)
      tw(gsap.to(el.counter, { opacity: 0, duration: 0.25, onComplete: () => (el.counter.hidden = true) }))
    }

    // ── decorative things react when tapped ──
    const art = root.querySelector('.lv-art')
    const onPoke = (e) => {
      const g = e.target.closest?.('[data-poke]')
      if (!g) return
      const kind = g.dataset.poke
      gsap.killTweensOf(g)
      sound.play('tap')
      fx.sparkles?.(e.clientX, e.clientY, { count: 8 })
      if (reduced) return
      if (kind === 'squash') {
        tw(
          gsap
            .timeline()
            .to(g, { scaleY: 0.9, scaleX: 1.05, transformOrigin: '50% 100%', duration: 0.09, ease: 'power2.out' })
            .to(g, { scaleY: 1, scaleX: 1, transformOrigin: '50% 100%', duration: 0.7, ease: 'elastic.out(1, 0.35)' }),
        )
      } else {
        const origin = kind === 'top' ? '50% 0%' : '50% 100%'
        const dir = Math.random() < 0.5 ? -1 : 1
        tw(
          gsap
            .timeline()
            .to(g, { rotation: 5 * dir, transformOrigin: origin, duration: 0.09, ease: 'power2.out' })
            .to(g, { rotation: 0, transformOrigin: origin, duration: 0.9, ease: 'elastic.out(1.1, 0.3)' }),
        )
      }
    }
    art.addEventListener('pointerdown', onPoke)
    offs.push(() => art.removeEventListener('pointerdown', onPoke))

    // ── input ──
    offs.push(
      onRotate(el.clock, {
        center: () => rectCenter(el.face),
        onStart() {
          if (busy) return false
          sound.unlock()
          sound.play('tap')
          dragging = true
          engaged = true
          if (!dawn) stopNudge()
          gsap.killTweensOf(nudge)
          nudge.v = 0
          snap?.kill()
          scrub.fling(0)
          hideCounter()
          if (hintShown && !dawn) setHint(null)
          el.arc.classList.add('lv-hint-arc--gone')
          // press: the clock gives a little under her finger
          gsap.killTweensOf(el.clock, 'scale')
          tw(gsap.to(el.clock, { scale: 0.965, svgOrigin: `${cx} ${cy}`, duration: 0.08, ease: 'power2.out' }))
        },
        onRotate(d) {
          scrub.angle(d)
        },
        onEnd(v) {
          dragging = false
          gsap.killTweensOf(el.clock, 'scale')
          tw(gsap.to(el.clock, { scale: 1, svgOrigin: `${cx} ${cy}`, duration: 0.7, ease: 'elastic.out(1, 0.4)' }))
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
    // Fit the camera to the screen: always keep the clock, frames, sofa and phone
    // (x 400–808, y 84–724) in view; show as much of the room as the shape allows.
    const fit = () => {
      const r = root.getBoundingClientRect()
      if (!r.width || !r.height) return
      const a = r.width / r.height
      const h = Math.max(SAFE.h, Math.min(VIEW.h, VIEW.w / a), SAFE.w / a)
      const w = h * a
      const y0 = h >= VIEW.h ? VIEW.h / 2 - h / 2 : Math.min(SAFE.y, Math.max(SAFE.y + SAFE.h - h, VIEW.h / 2 - h / 2))
      art.setAttribute('viewBox', `${(VIEW.w / 2 - w / 2).toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`)
    }
    fit()
    addEventListener('resize', fit)
    offs.push(() => removeEventListener('resize', fit))

    const stopLayer = sound.layer('clock')
    render()
    if (!reduced) tw(gsap.delayedCall(0.9, () => !engaged && !dawn && setHint(t('living.hint'))))
    else el.hint.style.opacity = '1'
    armNudge()

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
      stopNudge()
      moment?.kill()
      tweens.forEach((x) => x.kill())
      gsap.killTweensOf([el.dim, lamp, blend, nudge, el.dawnsky, el.phoneWrap, el.hint, el.card, el.bubble, el.on, el.counter, el.event, el.plate, el.clock, el.arc])
      root.querySelectorAll('[data-poke]').forEach((g) => gsap.killTweensOf(g))
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
