/*
 * Empty room — ours to fill (verb: write).
 *
 * A bare room: plaster wall, one bulb on a cord, a ladder, a paint tray, a moving box.
 * Pick one of five paint cans (content.empty.walls) → the roller rises from the floor and
 * paints the wall in four strokes → the room is complete (the wall colour is saved). Then
 * a marker line on the wall: "things we'll do" (content.empty.prompt). Each note she adds
 * is written onto the wall in berry, at a free spot (wall.js place()); Maruf's starters
 * (content.empty.starters) are already there in ink. Tap a note to read it up close.
 * Notes (≤ 140 chars, ≤ 30) and the wall colour persist via state.setWall / addNote.
 *
 * Phone keyboard: while the input has focus, the room is sized to the visual viewport, so
 * the wall and the marker line reflow into the space above the keyboard.
 *
 * Test hooks: [data-swatch="i"] [data-wall] [data-input] [data-add] [data-note][data-who]
 * [data-full]; window.__empty = { paint(i), add(text), get() } under ?debug.
 */
import { gsap } from 'gsap'
import './scene.css'
import { boxSVG, bulbSVG, canSVG, ladderSVG, markerSVG, rollerSVG, traySVG } from './art.js'
import { place } from './wall.js'
import { beat, EASE, moment, T } from '../../ui/choreo.js'
import { haptic, nudge, press } from '../../ui/feel.js'
import { react } from '../../ui/react.js'
import { sayer } from './say.js'

const MAX_NOTES = 30
const MAX_LEN = 140
const STRIPS = 4 // roller strokes across the wall
const WARN_AT = 20 // show "n letters left" from here

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

let teardown = null

export default {
  id: 'empty',
  mount(root, ctx) {
    const { t, c, sound, fx, state } = ctx
    const walls = (c('empty.walls') ?? []).filter(Boolean)
    const starters = (c('empty.starters') ?? []).filter((s) => String(s ?? '').trim())
    // the prompt is content; until config.bn.js translates it, the scene's own string stands in
    const promptText = (() => {
      const v = c('empty.prompt')
      if (!v || (ctx.lang() !== 'en' && v === ctx.raw().empty?.prompt)) return t('empty.prompt')
      return v
    })()

    root.innerHTML = `
      <div class="empty" data-phase="bare">
        <header class="e-head">
          <p class="e-kicker hand">${esc(t('empty.kicker'))}</p>
          <h1 class="e-title display">${esc(t('empty.title'))}</h1>
          <p class="e-prompt hand" data-prompt aria-live="polite">${esc(t('empty.pick'))}</p>
        </header>

        <div class="e-room">
          <div class="e-wall" data-wall>
            <div class="e-strips" data-strips aria-hidden="true"></div>
            <div class="e-shade" aria-hidden="true"></div>
            <p class="e-heading hand" data-heading aria-hidden="true">${esc(promptText)}</p>
            <div class="e-board" data-board role="list"></div>
            <p class="e-full hand" data-full hidden>${esc(t('empty.full'))}</p>
            <form class="e-write" data-write hidden autocomplete="off">
              <label class="sr-only" for="e-input">${esc(t('empty.input'))}</label>
              <input id="e-input" class="e-input hand" data-input type="text" maxlength="${MAX_LEN}"
                placeholder="${esc(promptText)}" enterkeyhint="send" autocomplete="off" autocapitalize="off" spellcheck="false">
              <span class="e-count" data-count aria-live="polite"></span>
              <button class="e-add" type="submit" data-add aria-label="${esc(t('empty.add'))}">${markerSVG()}</button>
            </form>
            <div class="e-roller" data-roller aria-hidden="true">${rollerSVG()}</div>
          </div>
          <div class="e-bulb" data-bulb aria-hidden="true"><div class="e-bulb__swing">${bulbSVG()}</div></div>
        </div>

        <div class="e-floor" aria-hidden="true">
          <div class="e-ladder" data-ladder>${ladderSVG()}</div>
          <div class="e-tray" data-tray>${traySVG()}</div>
          <div class="e-box" data-box>${boxSVG()}</div>
        </div>

        <div class="e-cans" role="group" aria-label="${esc(t('empty.swatches'))}">
          ${walls
            .map(
              (col, i) => `
            <button class="e-can" type="button" data-swatch="${i}" style="--c:${esc(col)}; --tilt:${((i * 41) % 9) - 4}deg"
              aria-pressed="false" aria-label="${esc(t('empty.swatch', { n: i + 1, total: walls.length }))}">${canSVG()}</button>`,
            )
            .join('')}
        </div>

        <div class="e-dark" data-dark aria-hidden="true"></div>
        <div class="e-read" data-read hidden>
          <div class="e-read__card" role="dialog" aria-modal="true">
            <p class="e-read__text hand" data-read-text></p>
            <p class="e-read__close">${esc(t('empty.close'))}</p>
          </div>
        </div>
      </div>`

    const $ = (s) => root.querySelector(s)
    const room = $('.empty')
    const prompt = $('[data-prompt]')
    const wall = $('[data-wall]')
    const strips = $('[data-strips]')
    const heading = $('[data-heading]')
    const board = $('[data-board]')
    const full = $('[data-full]')
    const form = $('[data-write]')
    const input = $('[data-input]')
    const count = $('[data-count]')
    const addBtn = $('[data-add]')
    const roller = $('[data-roller]')
    const bulb = $('[data-bulb]')
    const swing = $('.e-bulb__swing')
    const halo = $('.b-halo')
    const trayRoller = $('[data-tray-roller]')
    const read = $('[data-read]')
    const readCard = $('.e-read__card')
    const readText = $('[data-read-text]')
    const cans = [...root.querySelectorAll('[data-swatch]')]

    // ── bookkeeping: every listener, tween and timeline is undone in teardown ──
    const offs = []
    const on = (el, type, fn, opts) => {
      el.addEventListener(type, fn, opts)
      offs.push(() => el.removeEventListener(type, fn, opts))
    }
    const live = new Set()
    const keep = (a) => {
      if (live.size > 80) for (const x of live) if (!x.isActive()) live.delete(x)
      live.add(a)
      return a
    }

    let phase = 'bare' // bare → painting → painted
    const setPhase = (p) => {
      phase = p
      room.dataset.phase = p
    }

    const setPrompt = (text) => {
      if (prompt.textContent === text) return
      prompt.textContent = text
      keep(gsap.fromTo(prompt, { scale: 0.9, rotation: -2, opacity: 0.4 }, { scale: 1, rotation: 0, opacity: 1, duration: T.quick * 1.6, ease: EASE.spring, overwrite: true }))
    }

    // ── notes ──
    const her = () => state.get().empty.notes
    const allNotes = () => [...starters.map((text) => ({ text, who: 'me' })), ...her()]
    const isFull = () => her().length >= MAX_NOTES
    const noteEls = [] // index-aligned with allNotes()

    function makeNote(n, i) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'e-note hand'
      el.dataset.note = String(i)
      el.dataset.who = n.who === 'me' ? 'me' : 'her'
      el.setAttribute('role', 'listitem')
      el.innerHTML = `<span class="e-note__text">${esc(n.text)}</span>`
      board.append(el)
      offs.push(press(el, { sound: 'pop', scale: 0.95 }))
      on(el, 'click', () => openNote(el, n))
      return el
    }

    /** Positions every note for the board's current size. animate → spring there. */
    function layout({ animate = false } = {}) {
      const w = board.clientWidth
      const h = board.clientHeight
      const notes = allNotes()
      const cols = clamp(Math.round(w / 230), 2, 4)
      const spots = place(notes, { w, h, cols, gap: 40 })
      spots.forEach((p, i) => {
        const el = noteEls[i]
        if (!el) return
        const fs = clamp(Math.min(p.w * 0.13, p.h * 0.42), 13, 27)
        const lines = Math.max(1, Math.floor((p.h - 4) / (fs * 1.08)))
        el.style.width = `${p.w}px`
        el.style.maxHeight = `${p.h}px`
        el.style.setProperty('--lines', lines)
        const to = { x: p.x, y: p.y, rotation: p.rot, fontSize: fs }
        if (animate && el.dataset.placed) keep(gsap.to(el, { ...to, duration: T.move, ease: EASE.out, overwrite: 'auto' }))
        else gsap.set(el, to)
        el.dataset.placed = '1'
      })
    }

    /** The marker writing a note onto the wall: a left-to-right wipe, squeaks on the way. */
    function writeIn(tl, el, at) {
      const len = el.textContent.length
      const dur = clamp(0.3 + len * 0.018, 0.45, 1.6)
      tl.set(el, { visibility: 'visible' }, at)
      tl.fromTo(el, { clipPath: 'inset(-20% 102% -20% -6%)' }, { clipPath: 'inset(-20% -6% -20% -6%)', duration: dur, ease: 'power1.inOut', clearProps: 'clipPath' }, at)
      for (let k = 0; k < Math.max(1, Math.round(dur / 0.4)); k++) beat(tl, 'marker', `<${(k * 0.4).toFixed(2)}`)
      return tl
    }

    function syncFull() {
      const f = isFull()
      full.hidden = !f
      input.disabled = f
      addBtn.disabled = f
      form.classList.toggle('e-write--full', f)
    }

    function updateCount() {
      const left = MAX_LEN - input.value.length
      count.textContent = left <= WARN_AT ? t('empty.left', { n: left }) : ''
    }

    // ── painting ──
    let busy = null // the current paint timeline
    function paint(i) {
      const color = walls[i]
      if (!color || phase === 'painting') return
      const first = phase === 'bare'
      closeNote(true)
      setPhase('painting')
      cans.forEach((cn, k) => cn.setAttribute('aria-pressed', String(k === i)))
      cans[i].classList.add('e-can--picked')
      setPrompt(t('empty.painting'))
      guide.set([])
      input.blur()

      const W = wall.clientWidth
      const H = wall.clientHeight
      const rw = Math.min(W / STRIPS + 10, 150)
      roller.style.width = `${rw}px`
      room.style.setProperty('--roll', color) // the tray's paint and the roller
      trayRoller?.style.setProperty('visibility', 'hidden')
      const rh = rw * (150 / 96)
      const rollMid = rh * (20 / 150) // the roll's centre line in the roller's own box
      const sx = (k) => (W / STRIPS) * (k + 0.5) - rw * 0.47
      const ry = (edge) => edge - rollMid

      strips.innerHTML = ''
      const parts = []
      for (let k = 0; k < STRIPS; k++) {
        const s = document.createElement('i')
        s.className = 'e-strip'
        s.style.left = `${(k * 100) / STRIPS - 0.6}%`
        s.style.width = `${100 / STRIPS + 1.2}%`
        s.style.background = color
        s.style.clipPath = k % 2 === 0 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)'
        strips.append(s)
        parts.push(s)
      }

      const tl = keep(moment({ onComplete: () => painted(color, first) }))
      busy = tl
      tl.set(roller, { opacity: 1, x: sx(0), y: H + 30, rotation: -14 })
      tl.to(roller, { y: ry(H - 6), rotation: 0, duration: T.move, ease: EASE.spring })
      for (let k = 0; k < STRIPS; k++) {
        const up = k % 2 === 0
        const s = parts[k]
        const p = { v: 0 }
        beat(tl, 'roller', '>')
        tl.to(p, {
          v: 1,
          duration: 0.46,
          ease: 'power1.inOut',
          onUpdate: () => {
            const v = p.v
            s.style.clipPath = up ? `inset(${((1 - v) * 100).toFixed(2)}% 0 0 0)` : `inset(0 0 ${((1 - v) * 100).toFixed(2)}% 0)`
            gsap.set(roller, { y: ry(up ? (H - 6) * (1 - v) + 6 : 6 + (H - 12) * v), rotation: (up ? -1 : 1) * Math.sin(v * Math.PI) * 4 })
          },
        }, '<')
        if (k < STRIPS - 1) tl.to(roller, { x: sx(k + 1), duration: 0.16, ease: 'power1.inOut' })
      }
      // the paint is on: one flat coat replaces the strokes, saved straight away
      tl.call(() => {
        wall.style.backgroundColor = color
        wall.classList.add('e-wall--painted')
        strips.innerHTML = ''
        state.setWall(color)
      })
      tl.to(roller, { y: H + 40, rotation: 12, duration: T.quick * 1.6, ease: 'power2.in' })
      tl.set(roller, { opacity: 0 })
      tl.call(() => trayRoller?.style.removeProperty('visibility'))
    }

    /** The wall is painted: complete, then (the first time) write the list onto it. */
    function painted(color, first) {
      busy = null
      setPhase('painted')
      cans.forEach((cn) => cn.classList.remove('e-can--picked'))
      ctx.complete()
      const r = wall.getBoundingClientRect()
      fx.sparkles(r.left + r.width / 2, r.top + r.height * 0.35, { count: 16 })
      if (!first) {
        setPrompt(t('empty.write'))
        guide.set(isFull() ? [] : [form])
        return
      }
      const tl = keep(moment())
      tl.call(() => setPrompt(t('empty.write')))
      writeIn(tl, heading, '>')
      noteEls.forEach((el, i) => writeIn(tl, el, i === 0 ? '>' : '>-0.15'))
      tl.call(() => (form.hidden = false))
      tl.fromTo(form, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: T.move, ease: EASE.spring })
      tl.call(() => guide.set(isFull() ? [] : [form]))
    }

    // ── writing ──
    function shake() {
      sound.play('tap')
      haptic([10, 40, 10])
      form.classList.add('e-write--shake')
      form.dataset.refused = String(Number(form.dataset.refused ?? 0) + 1) // how many tries were turned away
      keep(gsap.fromTo(form, { x: 0 }, { keyframes: { x: [0, -10, 9, -6, 4, -2, 0] }, duration: 0.42, ease: 'none', overwrite: 'auto', onComplete: () => form.classList.remove('e-write--shake') }))
    }

    function submit(e) {
      e?.preventDefault()
      if (phase !== 'painted') return
      if (isFull()) return shake()
      const note = state.addNote(input.value, 'her')
      if (!note) {
        setPrompt(t('empty.nothing'))
        return shake()
      }
      input.value = ''
      updateCount()
      // the subscriber below puts it on the wall
    }

    let rendered = her().length
    function sync() {
      const notes = allNotes()
      const n = her().length
      if (n < rendered) {
        // notes went away (reset) → redraw from scratch
        board.innerHTML = ''
        noteEls.length = 0
        notes.forEach((x, i) => noteEls.push(makeNote(x, i)))
        rendered = n
        layout()
        syncFull()
        return
      }
      const fresh = []
      for (let i = noteEls.length; i < notes.length; i++) {
        const el = makeNote(notes[i], i)
        el.style.visibility = 'hidden'
        noteEls.push(el)
        fresh.push(el)
      }
      rendered = n
      if (!fresh.length) return
      layout({ animate: true })
      const tl = keep(moment())
      tl.to({}, { duration: T.quick }) // let the others shuffle over first
      fresh.forEach((el) => writeIn(tl, el, '>'))
      tl.call(() => {
        // the hearts come off the marker that wrote it, never over the words themselves
        const pen = addBtn.getBoundingClientRect()
        const r = pen.width ? pen : fresh.at(-1).getBoundingClientRect()
        fx.hearts(r.left + r.width / 2, r.top + r.height * 0.3, { count: 4 })
        syncFull()
        setPrompt(isFull() ? t('empty.full') : t(n === 1 ? 'empty.added' : 'empty.more'))
        guide.set(isFull() ? [] : [document.querySelector('.chip--home')].filter(Boolean))
      })
    }
    offs.push(state.subscribe(() => her().length !== rendered && sync()))

    on(form, 'submit', submit)
    on(input, 'input', updateCount)
    // tapping the marker must not steal focus from the input (keeps the phone keyboard up)
    on(addBtn, 'pointerdown', (e) => document.activeElement === input && e.preventDefault())
    offs.push(press(addBtn, { sound: null, scale: 0.88 }))

    // ── reading a note up close ──
    let readTl = null
    function openNote(el, n) {
      if (phase === 'painting') return
      readText.textContent = n.text
      readText.dataset.who = el.dataset.who
      read.hidden = false
      const nr = el.getBoundingClientRect()
      const cr = readCard.getBoundingClientRect()
      readTl?.kill()
      readTl = keep(moment())
      readTl
        .fromTo(read, { opacity: 0 }, { opacity: 1, duration: T.quick })
        .fromTo(
          readCard,
          { x: nr.left + nr.width / 2 - (cr.left + cr.width / 2), y: nr.top + nr.height / 2 - (cr.top + cr.height / 2), scale: 0.4, rotation: gsap.getProperty(el, 'rotation') },
          { x: 0, y: 0, scale: 1, rotation: -1.5, duration: T.move, ease: EASE.spring },
          0,
        )
    }
    function closeNote(instant = false) {
      if (read.hidden) return
      readTl?.kill()
      if (instant) {
        read.hidden = true
        return
      }
      readTl = keep(moment({ onComplete: () => (read.hidden = true) }))
      readTl.to(readCard, { scale: 0.85, y: 20, duration: T.quick, ease: 'power2.in' }).to(read, { opacity: 0, duration: T.quick }, 0)
    }
    on(read, 'click', () => closeNote())
    on(window, 'keydown', (e) => e.key === 'Escape' && closeNote())

    // ── paint cans ──
    // picking one up: the paint sloshes inside and the handle flips up
    cans.forEach((cn, i) => {
      offs.push(press(cn, { sound: 'slosh', scale: 0.94 }))
      on(cn, 'pointerdown', () => {
        if (ctx.reduced || phase === 'painting') return
        keep(gsap.timeline()
          .to(cn.querySelector('.c-paint'), { scaleX: 0.82, scaleY: 1.3, x: 3, svgOrigin: '32 22', duration: 0.12, ease: 'power2.out' })
          .to(cn.querySelector('.c-paint'), { scaleX: 1, scaleY: 1, x: 0, svgOrigin: '32 22', duration: 0.6, ease: 'elastic.out(1, 0.35)' }))
        keep(gsap.timeline()
          .to(cn.querySelector('.c-handle'), { scaleY: 1.25, svgOrigin: '32 26', duration: 0.14, ease: 'power2.out' })
          .to(cn.querySelector('.c-handle'), { scaleY: 1, svgOrigin: '32 26', duration: 0.5, ease: EASE.wobble }))
      })
      on(cn, 'click', () => paint(i))
    })

    // ── the room answers back: each thing like what it is ──
    const say = sayer(room, { reduced: ctx.reduced, keep })
    const slip = sayer(room, { reduced: ctx.reduced, keep, cls: 'x-slip' })
    const top = (el, fy = 0) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height * fy }
    }
    offs.push(() => {
      say.clear()
      slip.clear()
    })

    // the bulb swings on its cord, and the light pool and every shadow in the room swing with it.
    // Second time it buzzes and stutters; third time the lights go out — her call.
    const dark = $('[data-dark]')
    const glass = $('.b-glass')
    let bulbN = 0
    let outTl = null
    const flick = () => {
      sound.play('buzz')
      if (!ctx.reduced) keep(gsap.timeline().to([glass, halo], { opacity: 0.35, duration: 0.05 }).to([glass, halo], { opacity: 1, duration: 0.05 }).to([glass, halo], { opacity: 0.5, duration: 0.06 }).to([glass, halo], { opacity: 1, duration: 0.1 }).set([glass, halo], { clearProps: 'opacity' }))
    }
    const lightsOut = () => {
      if (outTl?.isActive()) return
      sound.play('buzz')
      outTl = keep(gsap.timeline())
      outTl.to([glass, halo], { opacity: 0.15, duration: 0.08 })
      outTl.to(dark, { opacity: 0.86, duration: 0.12 }, '<')
      outTl.call(() => say(t('empty.ledu'), top(bulb, 1), { small: t('empty.leduSmall'), below: true, hold: 2 }))
      outTl.to({}, { duration: 1.9 })
      outTl.call(() => sound.play('lampOn'))
      outTl.to([glass, halo], { opacity: 1, duration: 0.05 })
      outTl.to([glass, halo], { opacity: 0.4, duration: 0.05 })
      outTl.to([glass, halo], { opacity: 1, duration: 0.08 })
      outTl.to(dark, { opacity: 0, duration: 0.25 }, '<')
      outTl.set([glass, halo], { clearProps: 'opacity' })
    }
    offs.push(react(bulb, 'sway', { target: swing, origin: '50% 0%', strength: 1.3, steps: [() => {
      const n = bulbN++ % 3
      if (n === 1) flick()
      if (n === 2) phase === 'painting' ? flick() : lightsOut()
    }] }))
    if (!ctx.reduced) {
      const cord = () => bulb.getBoundingClientRect().height * 0.8
      let last = 0
      const follow = () => {
        const deg = Number(gsap.getProperty(swing, 'rotation')) + Number(gsap.getProperty(bulb, 'rotation'))
        const shx = -Math.sin((deg * Math.PI) / 180) * cord()
        if (Math.abs(shx - last) < 0.3) return
        last = shx
        room.style.setProperty('--shx', shx.toFixed(1))
      }
      gsap.ticker.add(follow)
      offs.push(() => gsap.ticker.remove(follow))
    }

    // the ladder wobbles on its feet and settles; the third time, a rosette appears on top: Topper
    const ladder = $('[data-ladder]')
    const medal = ladder.querySelector('.l-medal')
    offs.push(react(ladder, 'tip', { origin: '50% 100%', strength: 1.2, steps: [() => {}, () => {}, () => {
      sound.play('chime')
      keep(gsap.timeline()
        .fromTo(medal, { opacity: 0, scale: 0.3, rotation: -200 }, { opacity: 1, scale: 1, rotation: 0, svgOrigin: '36 -14', duration: ctx.reduced ? 0.01 : 0.8, ease: EASE.spring })
        .call(() => say(t('empty.topper'), top(medal), { small: t('empty.topperSmall') }))
        .to(medal, { opacity: 0, duration: 0.5 }, '+=3'))
    }] }))

    // the moving box: a soft cardboard squish, the flaps fly open, and one of her nicknames
    // is inside on a slip — a different one every time (the jar from site two, unpacked)
    const box = $('[data-box]')
    const flaps = [...box.querySelectorAll('.x-flap--l, .x-flap--r')]
    let nick = 0
    let boxTl = null
    offs.push(react(box, 'squish', { sound: 'paper', strength: 0.6, steps: [() => {
      const list = t('empty.nicknames')
      const [name, note] = list[nick++ % list.length]
      sound.play('pop')
      boxTl?.kill()
      boxTl = keep(gsap.timeline())
      if (!ctx.reduced) boxTl.to(flaps, { scaleY: -0.75, svgOrigin: '66 34', duration: 0.22, ease: 'back.out(2.5)', stagger: 0.04 })
      boxTl.call(() => slip(name, top(box, 0.2), { small: note, hold: 2.8 }))
      if (!ctx.reduced) boxTl.to(flaps, { scaleY: 1, svgOrigin: '66 34', duration: 0.5, ease: 'bounce.out' }, '+=2.9')
    }] }))

    // the paint tray: the paint ripples, the roller rocks in it
    const tray = $('[data-tray]')
    offs.push(react(tray, 'ripple', { target: tray.querySelector('.t-paint'), origin: '50% 50%', strength: 1.5, steps: [() => {
      if (!ctx.reduced && trayRoller) keep(gsap.timeline().to(trayRoller, { x: -7, duration: 0.18, ease: 'power1.out' }).to(trayRoller, { x: 0, duration: 0.6, ease: EASE.wobble }))
    }] }))

    // the bare wall knocks back. Knock knock. — who's there?
    let knocks = 0
    wall.dataset.react = 'knock'
    on(wall, 'pointerdown', (e) => {
      if (e.target !== wall || phase === 'painting') return
      const n = knocks++ % 3
      sound.play('knock')
      haptic(8)
      if (n >= 1) keep(gsap.delayedCall(0.17, () => sound.play('knock')))
      if (!ctx.reduced) keep(gsap.fromTo(wall, { x: 1.5 }, { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.5)', clearProps: 'transform' }))
      if (n === 2) say(t('empty.knock'), { x: e.clientX, y: e.clientY - 10 }, { small: t('empty.knockSmall'), hold: 3.2 })
    })
    // the floorboards creak
    const floor = $('.e-floor')
    floor.dataset.react = 'knock'
    on(floor, 'pointerdown', (e) => e.target === floor && sound.play('creak'))

    // ── idle guidance: cans until painted, then the marker line, then home ──
    // the paint cans' lids rattle (with an arrow if she's stuck); later, a soft glow
    const lidHint = (el) => {
      const lid = el.querySelectorAll('.c-rim, .c-paint')
      const tl = keep(gsap.timeline())
      ;[-2.5, 0, -1.8, 0, -1, 0].forEach((y, i) => tl.to(lid, { y, rotation: i % 4 === 0 ? -4 : i % 4 === 2 ? 3 : 0, svgOrigin: '32 22', duration: 0.06, ease: 'none' }))
      return tl
    }
    let nd = null
    let ndKey = ''
    const guide = {
      set(targets) {
        const key = targets.length && targets.every((x) => cans.includes(x)) ? 'cans' : 'plain'
        if (key !== ndKey) {
          nd?.stop()
          ndKey = key
          nd = nudge(targets, key === 'cans' ? { after: 4000, style: lidHint, arrow: true } : {})
        } else nd.set(targets)
      },
    }
    guide.set(cans)
    offs.push(() => nd?.stop())

    // ── phone keyboard: fit the room to the visible part of the screen while typing ──
    const vv = window.visualViewport
    let fitRaf = 0
    function fit() {
      cancelAnimationFrame(fitRaf)
      fitRaf = requestAnimationFrame(() => {
        const focused = document.activeElement === input && vv && Math.abs(vv.scale - 1) < 0.01
        if (focused) {
          root.style.setProperty('--vvh', `${Math.round(vv.height)}px`)
          root.style.setProperty('--vvt', `${Math.round(vv.offsetTop)}px`)
        } else {
          root.style.removeProperty('--vvh')
          root.style.removeProperty('--vvt')
        }
        // a keyboard is up (not just a focused field on a desktop): give the wall everything
        room.classList.toggle('empty--typing', !!focused && window.innerHeight - vv.height > 80)
        unshift()
      })
    }
    /** Undo any scroll the browser gave the room's containers to bring the field into view. */
    function unshift() {
      for (let el = root; el && el !== document.body; el = el.parentElement) {
        if (el.scrollTop || el.scrollLeft) el.scrollTo(0, 0)
      }
      if (document.scrollingElement?.scrollTop || document.scrollingElement?.scrollLeft) document.scrollingElement.scrollTo(0, 0)
    }
    if (vv) {
      on(vv, 'resize', fit)
      on(vv, 'scroll', fit)
    }
    on(input, 'focus', fit)
    on(input, 'blur', fit)
    offs.push(() => cancelAnimationFrame(fitRaf))

    // relayout when the wall changes size (rotation, keyboard, window resize)
    let roRaf = 0
    let lastSize = ''
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(roRaf)
      roRaf = requestAnimationFrame(() => {
        const size = `${board.clientWidth}x${board.clientHeight}`
        if (size === lastSize) return
        const animate = lastSize !== ''
        lastSize = size
        layout({ animate })
      })
    })
    ro.observe(board)
    offs.push(() => {
      ro.disconnect()
      cancelAnimationFrame(roRaf)
    })

    // ── ambient ──
    let stopRoom = sound.layer('room')
    offs.push(() => stopRoom?.())
    if (!ctx.reduced) {
      // a slow idle drift on the outer bulb (taps swing the inner one, so the two never fight)
      keep(gsap.fromTo(bulb, { rotation: -1.6 }, { rotation: 1.6, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 0%' }))
    }

    // ── first paint: the saved wall, or bare plaster ──
    allNotes().forEach((n, i) => noteEls.push(makeNote(n, i)))
    const saved = state.get().empty.wall
    if (saved) {
      wall.style.backgroundColor = saved
      room.style.setProperty('--roll', saved)
      wall.classList.add('e-wall--painted')
      setPhase('painted')
      form.hidden = false
      prompt.textContent = t('empty.write')
      const k = walls.indexOf(saved)
      cans.forEach((cn, i) => cn.setAttribute('aria-pressed', String(i === k)))
      guide.set(isFull() ? [] : [form])
      if (!state.isDone('empty')) ctx.complete()
    } else {
      gsap.set([heading, ...noteEls], { visibility: 'hidden' })
    }
    syncFull()
    updateCount()
    layout()
    lastSize = `${board.clientWidth}x${board.clientHeight}`

    if (ctx.params.has('debug')) {
      window.__empty = {
        paint: (i) => paint(i),
        add: (text) => {
          input.value = text
          submit()
        },
        get: () => ({ phase, notes: allNotes().length, painting: !!busy }),
      }
      offs.push(() => delete window.__empty)
    }

    let cleaned = false
    teardown = () => {
      if (cleaned) return
      cleaned = true
      offs.forEach((fn) => fn())
      live.forEach((a) => a.kill())
      live.clear()
      gsap.killTweensOf(root.querySelectorAll('*'))
      stopRoom = null
    }
    ctx.onCleanup(teardown)
  },
  unmount() {
    teardown?.()
    teardown = null
  },
}
