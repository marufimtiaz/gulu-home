/*
 * The reception card (#/card) — a formal, printed Bangladeshi Bou-bhat card that lives in the
 * house's letterbox. Not a room: it never calls ctx.complete(). The router guards it behind
 * done.finale.
 *
 *   1. envelope  — ivory, her name in script, a berry wax seal. Tap or drag the seal → it
 *                  cracks, the flap lifts, the card rises out, the envelope falls away.
 *   2. gatefold  — two dusty-pink doors with a laser-cut jali meet over the card. Swipe a door
 *                  outward (or tap it) → it swings open on its hinge.
 *   3. the card  — both open: the gold alpana, arch and filigree draw themselves, the names
 *                  sparkle, the foil catches the light (pointer / phone tilt). Tap the card to
 *                  look closer (drag to look around), flip it over, save it as a PNG.
 *
 * Every multi-step moment is one timeline from moment(); sounds sit on it with beat(); text
 * appears at the end of the motion it describes; reduced motion speeds the same timelines up.
 *
 * Test hooks: [data-envelope] [data-seal] [data-gate="left|right"] [data-card-face] [data-names]
 * [data-details] [data-flip] [data-card-back] [data-save] [data-note] [data-hint];
 * window.__card = { stage(), crack(), open(side), flip(), zoom() } under ?debug.
 */
import { gsap } from 'gsap'
import './scene.css'
import { alpanaSVG, archSVG, coverSVG, dividerSVG, doorInnerSVG, envBackSVG, envFlapSVG, envPocketSVG, frameSVG, knotSVG, sealSVG } from './art.js'
import { foil, paintFoil, PARKED } from './foil.js'
import { cardToPng } from './export.js'
import { onDrag } from '../../ui/drag.js'
import { beat, EASE, moment, T } from '../../ui/choreo.js'
import { haptic, nudge, press, wobble } from '../../ui/feel.js'
import { react } from '../../ui/react.js'

const DW = 360 // design size of the card (5:7); it is laid out once at this size and scaled
const DH = 504
const OPEN_DEG = 165

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])
const isBlank = (v) => typeof v === 'string' && /^[\s—–-]+$/.test(v) // "——" = not filled in yet
const has = (v) => v !== null && v !== undefined && v !== ''
/** A card field: escaped text, a dotted blank for "——", or '' for null. */
const field = (v) => (!has(v) ? '' : isBlank(v) ? '<span class="cf-blank" aria-hidden="true"></span>' : keepWords(esc(v)))
/** Never break a hyphenated word (Bou-bhat) across lines. */
const keepWords = (html) => html.replace(/(^|\s)([^\s<>]+-[^\s<>]+)/g, '$1<span class="nowrap">$2</span>')
const slug = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'card'

function parseDay(s) {
  const m = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null
}

/** The date in the card's language (the site's): weekday, long date, and a short dotted one. */
function dateLines(iso, lang) {
  if (isBlank(iso)) return { blank: true }
  const d = parseDay(iso)
  if (!d) return null
  const loc = lang === 'bn' ? 'bn-BD' : 'en-GB'
  const p = Object.fromEntries(new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(d).map((x) => [x.type, x.value]))
  const num = new Intl.NumberFormat(loc, { useGrouping: false })
  const dd = (v, w = 2) => num.format(v).padStart(w, lang === 'bn' ? '০' : '0')
  return {
    weekday: p.weekday,
    date: `${p.day} ${p.month} ${p.year}`,
    short: `${dd(d.getDate())} · ${dd(d.getMonth() + 1)} · ${num.format(d.getFullYear())}`,
  }
}

let grainUrl = null
/** A small tile of paper tooth, drawn once (cheap to paint, survives the PNG export). */
function grain() {
  if (grainUrl !== null) return grainUrl
  grainUrl = 'none'
  try {
    const n = 140
    const cv = document.createElement('canvas')
    cv.width = cv.height = n
    const g = cv.getContext('2d')
    if (!g) return grainUrl
    for (let i = 0; i < 1500; i++) {
      const dark = Math.random() < 0.6
      g.fillStyle = dark ? `rgba(120,90,60,${0.025 + Math.random() * 0.05})` : `rgba(255,255,250,${0.1 + Math.random() * 0.2})`
      g.fillRect(Math.random() * n, Math.random() * n, Math.random() < 0.2 ? 2 : 1, 1)
    }
    grainUrl = `url(${cv.toDataURL()})`
  } catch {
    /* no canvas → flat stock */
  }
  return grainUrl
}

/** Wait for the card's faces (Bismillah, Bangla, script) — but never hold the scene for long. */
function fontsReady(card, lang) {
  if (!document.fonts?.load) return Promise.resolve()
  const want = [['15px Amiri', card.invocation || 'بسم']]
  if (lang === 'bn') {
    want.push(['31px Galada', card.title || 'বৌভাত'], ['12px "Tiro Bangla"', card.hosts || 'বাংলা'], ['600 12px "Tiro Bangla"', 'বাংলা'])
  } else {
    want.push(
      ['44px "Pinyon Script"', 'Maruf'],
      ['600 13px Cinzel', 'BOU'],
      ['13px "Cormorant Garamond"', 'the'],
      ['italic 13px "Cormorant Garamond"', 'the'],
      ['600 13px "Cormorant Garamond"', 'the'],
    )
  }
  const all = Promise.all(want.map(([f, s]) => document.fonts.load(f, s).catch(() => {})))
  return Promise.race([all, new Promise((r) => setTimeout(r, 1500))])
}

let teardown = null

export default {
  id: 'card',

  async mount(root, ctx) {
    const { t, c, sound, fx } = ctx
    const card = c('card') ?? {}
    const lang = ctx.lang?.() === 'bn' ? 'bn' : 'en' // the card is printed in the site's language
    const bn = lang === 'bn'
    const when = dateLines(card.date, lang)
    const offs = []
    const on = (el, type, fn, opts) => {
      el.addEventListener(type, fn, opts)
      offs.push(() => el.removeEventListener(type, fn, opts))
    }
    const live = new Set()
    const track = (a) => (live.add(a), a)

    const initials = [String(card.groom ?? '').trim()[0] ?? '', String(card.bride ?? '').trim()[0] ?? '']
    /** Body text: **…** turns bold; a suffix glued to a bold name ("**X**-এর") never breaks off. */
    const rich = (v) =>
      !has(v) ? '' : keepWords(esc(v).replace(/\*\*(.+?)\*\*(-[^\s,.।]+)?/g, (_, b, tail) => `<strong>${b}</strong>${tail ? `⁠${tail.replace('-', '-⁠')}` : ''}`))

    const detail = (label, value, extra = '') => `
      <div class="cf-when__item">
        ${has(label) ? `<dt class="cf-when__label">${esc(label)}</dt>` : ''}
        <dd class="cf-when__value">${value}</dd>
        ${extra}
      </div>`
    const venueExtra = has(card.address) ? `<dd class="cf-when__addr">${field(card.address)}</dd>` : ''
    const details = []
    if (when) {
      if (when.blank) details.push(detail(card.dateLabel, field('——')))
      else if (has(card.dayLabel)) details.push(detail(card.dateLabel, esc(when.date)), detail(card.dayLabel, esc(when.weekday)))
      else details.push(detail(card.dateLabel, `<span class="cf-when__day">${esc(when.weekday)},</span> ${esc(when.date)}`))
    }
    if (has(card.time)) details.push(detail(card.timeLabel, field(card.time)))
    if (has(card.venue)) details.push(detail(card.venueLabel, field(card.venue), venueExtra))
    const compliments = Array.isArray(card.compliments) ? card.compliments.filter(has) : has(card.compliments) ? [card.compliments] : []

    const faceHTML = `
      <article class="cf cf--${lang}" data-card-face lang="${lang}" aria-label="${esc(t('card.title'))}" style="--grain:${grain()}">
        ${frameSVG(DW, DH)}
        <div class="cf-body">
          <header class="cf-head">
            ${has(card.invocation) ? `<p class="cf-bism foil" lang="ar" dir="rtl" aria-label="${esc(card.invocationLabel ?? '')}">${esc(card.invocation)}</p>` : ''}
            <div class="cf-alpana" data-alpana>${alpanaSVG()}</div>
            ${has(card.title) ? `<h1 class="cf-title${bn ? '' : ' foil'}">${field(card.title)}</h1>` : ''}
            ${has(card.subtitle) ? `<p class="cf-sub">${field(card.subtitle)}</p>` : ''}
          </header>
          <section class="cf-couple" data-names>
            ${archSVG()}
            <p class="cf-couple__names">
              <span class="cf-name foil">${field(card.groom)}</span>
              ${knotSVG()}
              <span class="cf-name foil">${field(card.bride)}</span>
            </p>
          </section>
          <section class="cf-letter" data-letter>
            ${has(card.salutation) ? `<p class="cf-salute">${field(card.salutation)}</p>` : ''}
            ${has(card.greeting) ? `<p class="cf-greet">${field(card.greeting)}</p>` : ''}
            ${has(card.body) ? `<p class="cf-text">${rich(card.body)}</p>` : ''}
          </section>
          <dl class="cf-when" data-details style="grid-template-columns:${details.map((_, i) => (has(card.venue) && i === details.length - 1 ? 'minmax(0,1.45fr)' : 'minmax(0,1fr)')).join(' ')}">
            ${details.join('')}
          </dl>
          <footer class="cf-sign" data-hosts>
            ${has(card.closing) ? `<p class="cf-closing">${field(card.closing)}</p>` : ''}
            ${has(card.hosts) ? `<p class="cf-hosts">${field(card.hosts)}</p>` : ''}
            ${compliments.length ? `<p class="cf-compl">${esc(t('card.face.compliments'))} ${compliments.map(field).join(' · ')}</p>` : ''}
          </footer>
        </div>
      </article>`

    const backHTML = `
      <div class="cb cb--${lang}" data-card-back lang="${lang}" aria-hidden="true" style="--grain:${grain()}">
        ${frameSVG(DW, DH)}
        <div class="cb-body">
          <div class="cb-alpana" data-back-alpana>${alpanaSVG({ fine: true })}</div>
          ${has(card.title) ? `<p class="cb-title${bn ? '' : ' foil'}">${field(card.title)}</p>` : ''}
          ${dividerSVG()}
          <p class="cb-names"><span class="foil">${field(card.groom)}</span>${knotSVG()}<span class="foil">${field(card.bride)}</span></p>
          ${when && !when.blank ? `<p class="cb-date">${esc(when.short)}</p>` : ''}
          ${has(card.mapUrl) ? `<a class="btn cb-map" data-map href="${esc(card.mapUrl)}" target="_blank" rel="noopener">${esc(t('card.map'))}</a>` : ''}
        </div>
      </div>`

    const door = (side) => `
      <div class="door door--${side}" data-gate="${side}" role="button" tabindex="0" aria-label="${esc(t(side === 'left' ? 'card.doorLeft' : 'card.doorRight'))}" style="--grain:${grain()}">
        <div class="door__face door__out">${coverSVG(side, { initials })}<span class="door__shade"></span></div>
        <div class="door__face door__in">${doorInnerSVG()}<span class="door__shade"></span></div>
      </div>`

    root.innerHTML = `
      <div class="cs${ctx.reduced ? ' cs--still' : ''}" data-stage="envelope">
        <div class="cs-sky" aria-hidden="true"></div>
        <div class="cs-stage">
        <div class="cs-fit">
          <div class="cs-world">
            <div class="cs-rig">
              <div class="env env-back" data-envelope role="img" aria-label="${esc(t('card.envelope'))}">${envBackSVG()}</div>
              <div class="env env-flap"><div class="env-flap__face env-flap__out">${envFlapSVG('outside')}</div><div class="env-flap__face env-flap__in">${envFlapSVG('inside')}</div></div>
              <div class="leaf">
                ${faceHTML}
                ${backHTML}
                ${door('left')}${door('right')}
              </div>
              <div class="env env-pocket">${envPocketSVG()}
                <p class="env-to" data-env-name><span class="env-to__for">${esc(t('card.for'))}</span><span class="env-to__name">${field(card.bride)}</span>
                  <span class="env-to__nick" data-nick aria-hidden="true"><span class="env-to__nick-text"></span><svg class="env-to__caret" viewBox="0 0 30 22"><path d="M26 2 C 22 12, 14 17, 4 18 M4 18 l6 -5 M4 18 l7 3"/></svg></span></p>
              </div>
              <button class="env seal" type="button" data-seal aria-label="${esc(t('card.seal'))}">
                <span class="seal__half seal__half--l">${sealSVG('l')}</span>
                <span class="seal__half seal__half--r">${sealSVG('r')}</span>
              </button>
            </div>
          </div>
        </div>
        </div>
        <div class="cs-ui">
          <p class="cs-hint hand" data-hint aria-live="polite">${esc(t('card.hintSeal'))}</p>
          <div class="cs-actions" data-actions>
            <button class="btn cs-btn" type="button" data-flip>${esc(t('card.flip'))}</button>
            <button class="btn btn--berry cs-btn" type="button" data-save>${esc(t('card.save'))}</button>
          </div>
          ${has(card.note) ? `<p class="cs-note hand" data-note>${esc(card.note)}</p>` : ''}
        </div>
      </div>`

    const $ = (s) => root.querySelector(s)
    const $$ = (s) => [...root.querySelectorAll(s)]
    const scene = $('.cs')
    const fit = $('.cs-fit')
    const rig = $('.cs-rig')
    const leaf = $('.leaf')
    const faceEl = $('[data-card-face]')
    const backEl = $('[data-card-back]')
    const flap = $('.env-flap')
    const seal = $('[data-seal]')
    const halves = $$('.seal__half')
    const envParts = $$('.env')
    const doors = { left: $('[data-gate="left"]'), right: $('[data-gate="right"]') }
    const hint = $('[data-hint]')
    const actions = $('[data-actions]')
    const flipBtn = $('[data-flip]')
    const saveBtn = $('[data-save]')
    const noteEl = $('[data-note]')
    const draws = $$('.cf [data-draw]')
    const fills = $$('.cf [data-fill]')

    let stage = 'envelope' // envelope → opening → gate → open
    let flipped = false
    let zoomed = false
    let flank = false // is there room for the open doors beside the card?
    let flipTl = null
    let s = 1
    const opened = { left: false, right: false }

    /* ── layout: fit the 360 × 504 design card to the screen ─────────────────────────── */
    function layout() {
      const W = root.clientWidth || innerWidth
      const H = root.clientHeight || innerHeight
      const side = W > H * 1.15 && H < 640 // landscape phone: card left, controls right
      const pad = 12
      let availW, availH, roomW
      if (side) {
        const uiW = Math.min(280, Math.max(200, W * 0.3))
        availW = W - uiW - pad * 3
        availH = H - pad * 2
        roomW = availW
      } else {
        const top = 64 // under the corner chips
        const uiH = noteEl ? 150 : 112
        availW = W - pad * 2
        availH = H - top - uiH - pad
        roomW = W - pad * 2
      }
      s = Math.max(0.3, Math.min(availW / DW, availH / DH, 2.2))
      scene.style.setProperty('--s', s.toFixed(4))
      scene.classList.toggle('cs--side', side)
      // open doors lie beside the card only if they clear the screen edge (and, when the card
      // reaches the top, the corner chips); otherwise they fold away once open
      const chips = side ? 2 * 58 : 0
      flank = roomW >= (DW + 2 * 172) * s + chips
      scene.classList.toggle('cs--flank', flank)
      if (zoomed) unzoom(true)
      syncDoors()
    }
    layout()
    const ro = new ResizeObserver(() => layout())
    ro.observe(root)
    offs.push(() => ro.disconnect())

    /* ── ambient ────────────────────────────────────────────────────────────────────── */
    if (!ctx.reduced) offs.push(fx.starfield($('.cs-sky'), { count: 46 }))
    // the gold only needs to catch the light once the card is open, and not while it's moving
    const moving = new Set()
    const big = (tl) => (moving.add(tl), tl.eventCallback('onInterrupt', () => moving.delete(tl)), track(tl))
    offs.push(foil(scene, { reduced: ctx.reduced, paused: () => stage !== 'open' || [...moving].some((m) => m.isActive()) }))

    /* ── initial poses ──────────────────────────────────────────────────────────────── */
    gsap.set(draws, { strokeDashoffset: 1 })
    gsap.set(fills, { opacity: 0 })
    gsap.set(rig, { scale: 0.8, transformOrigin: '50% 50%', autoAlpha: 0 })
    gsap.set(doors.left, { transformOrigin: '0% 50%', rotationY: 0, z: 0.6 })
    gsap.set(doors.right, { transformOrigin: '100% 50%', rotationY: 0, z: 0.6 })
    gsap.set(flap, { transformOrigin: '50% 0%', rotationX: 0, zIndex: 4 })
    gsap.set([actions, hint], { autoAlpha: 0 })
    if (noteEl) gsap.set(noteEl, { autoAlpha: 0 })

    const setHint = (text) => {
      if (hint.textContent === text) return
      hint.textContent = text
      track(gsap.fromTo(hint, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: T.quick, ease: EASE.out, overwrite: true }))
    }

    /* ── feel: press, wobble, nudge, and things that answer like what they are ───────── */
    offs.push(press(seal, { sound: 'tap', scale: 0.9 }))
    offs.push(press(flipBtn), press(saveBtn))
    let stopWobble = wobble(seal, { deg: 4, period: 2.6 })
    const d = (v) => (ctx.reduced ? 0.01 : v)

    // idle guidance in the card's own language: the wax seal catches the light; the gatefold
    // doors breathe ajar. Each is its phase's main action, so the arrow may join in.
    let doorHeld = false
    const coax = (el) => {
      const tl = gsap.timeline()
      if (el === seal) {
        seal.classList.add('nudge--glint')
        tl.call(() => seal.classList.remove('nudge--glint'), null, 0.9)
      } else if ((el === doors.left || el === doors.right) && !doorHeld && !el.classList.contains('open')) {
        const side = el === doors.left ? 'left' : 'right'
        const sgn = side === 'left' ? -1 : 1
        tl.to(el, { rotationY: sgn * 11, duration: 0.6, ease: 'sine.inOut', onUpdate: () => shade(side) })
          .to(el, { rotationY: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)', onUpdate: () => shade(side) })
      }
      return track(tl)
    }
    let guide = nudge(seal, { after: 4000, style: coax, arrow: true })
    offs.push(() => guide.stop())

    // her name on the envelope: tap it and a pencil nickname goes up over it — a different one
    // every time, in the old jar's order, ending on the newest one
    const nick = $('[data-nick]')
    const nickText = nick.querySelector('.env-to__nick-text')
    const nicknames = t('card.nicknames')
    let nickTl = null
    offs.push(
      react($('[data-env-name]'), 'flutter', {
        sound: 'scratch',
        strength: 0.5,
        steps: [
          (n) => {
            const name = nicknames[Math.min(n, nicknames.length) - 1]
            const last = n >= nicknames.length
            nickTl?.kill()
            nickTl = track(gsap.timeline())
            if (n > 1) nickTl.to(nick, { autoAlpha: 0, y: -4, duration: d(0.12), ease: 'power1.in' })
            nickTl.call(() => {
              nickText.textContent = name
              nick.classList.toggle('env-to__nick--last', last)
            })
            nickTl.fromTo(nick, { autoAlpha: 0, y: 6, rotation: -14, scale: 0.8 }, { autoAlpha: 1, y: 0, rotation: -7, scale: 1, duration: d(0.35), ease: 'back.out(2.2)' })
            for (let k = 1; k < 4; k++) nickTl.call(() => sound.play('scratch'), null, `<${k * 0.08}`)
            if (last) {
              nickTl.call(() => {
                const r = nickText.getBoundingClientRect()
                fx.sparkles(r.left + r.width / 2, r.top + r.height / 2, { count: 12, colors: ['var(--card-gold-hi)', 'var(--card-gold)', 'var(--pink)'] })
                sound.play('sparkle')
              })
            }
          },
        ],
      }),
    )

    // the alpana: tap it and it turns a notch like a mandala, one note a turn; every sixth
    // turn it blooms — a full turn, a breath, gold sparks
    const NOTES = [0, 2, 4, 7, 9, 12]
    const mandala = (el) =>
      react(el, 'spin', {
        deg: 30,
        sound: null,
        steps: [
          (n) => {
            sound.play('xylo', { i: NOTES[(n - 1) % NOTES.length] })
            if (n % 6 || ctx.reduced) return
            track(gsap.timeline().to(el, { rotation: '+=360', scale: 1.12, duration: 1.1, ease: 'power2.inOut' }).to(el, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' }))
            const r = el.getBoundingClientRect()
            fx.sparkles(r.left + r.width / 2, r.top + r.height / 2, { count: 16, colors: ['var(--card-gold-hi)', 'var(--card-gold)', 'var(--card-ivory)'] })
            sound.play('sparkle')
          },
        ],
      })
    const frontAlpana = $('[data-alpana]')
    offs.push(mandala(frontAlpana), mandala($('[data-back-alpana]')))

    /* ── 1. the envelope: crack the seal ────────────────────────────────────────────── */
    offs.push(
      onDrag(seal, {
        onStart: () => stage === 'envelope',
        onMove(p) {
          // a little give under the finger before it breaks
          gsap.set(seal, { x: p.dx * 0.15, y: p.dy * 0.15 })
          if (Math.hypot(p.dx, p.dy) > 28) crack()
        },
        onEnd: () => crack(),
      }),
    )
    on(seal, 'click', (e) => e.detail === 0 && crack()) // keyboard

    function crack() {
      if (stage !== 'envelope') return
      stage = 'opening'
      scene.dataset.stage = 'opening'
      stopWobble()
      stopWobble = () => {}
      guide.set([])
      haptic(14)
      gsap.killTweensOf(seal)
      const tl = big(moment({ onComplete: toGate }))
      beat(tl, 'peel', 0)
      tl.to(hint, { autoAlpha: 0, duration: T.quick }, 0)
      tl.to(seal, { x: 0, y: 0, scale: 1, rotation: 0, duration: T.tap }, 0)
        .to(halves[0], { x: -16, y: 44, rotation: -40, autoAlpha: 0, duration: T.move, ease: 'power2.in' }, 0)
        .to(halves[1], { x: 16, y: 52, rotation: 34, autoAlpha: 0, duration: T.move, ease: 'power2.in' }, 0.04)
        .addLabel('flap', T.quick)
      beat(tl, 'paper', 'flap')
      tl.to(flap, { rotationX: 180, duration: T.reveal, ease: EASE.inOut }, 'flap')
        .set(flap, { zIndex: 1 }, `flap+=${T.reveal / 2}`)
        .addLabel('rise', `flap+=${T.reveal * 0.85}`)
      beat(tl, 'whoosh', 'rise')
      tl.to(leaf, { y: -250, duration: T.moment, ease: EASE.out }, 'rise')
        .to(rig, { y: 118, duration: T.moment, ease: EASE.out }, 'rise')
        .addLabel('free', `rise+=${T.moment * 0.72}`)
        .to(envParts, { y: '+=620', autoAlpha: 0, duration: T.reveal, ease: 'power2.in' }, 'free')
        .to(leaf, { y: 0, duration: T.reveal, ease: 'back.out(1.15)' }, `free+=${T.quick}`)
        .to(rig, { y: 0, scale: 1, duration: T.reveal, ease: 'back.out(1.15)' }, '<')
        .set(envParts, { display: 'none' })
    }

    /* ── 2. the gatefold: swing the doors open ──────────────────────────────────────── */
    let sway = null
    function toGate() {
      stage = 'gate'
      scene.dataset.stage = 'gate'
      setHint(t('card.hintDoors'))
      // the doors breathing (and the hint) say enough — an arrow across the jali only confuses
      guide.stop()
      guide = nudge(Object.values(doors), { after: 4000, style: coax })
      if (!ctx.reduced) {
        // the doors breathe, slightly ajar: "we open" (a few times, then nudge() takes over)
        sway = track(gsap.timeline({ repeat: 2, repeatDelay: 2.2, delay: 0.5 }))
        sway.to(doors.left, { rotationY: -9, duration: 0.7, ease: 'sine.inOut' }, 0)
          .to(doors.right, { rotationY: 9, duration: 0.7, ease: 'sine.inOut' }, 0.08)
          .to(doors.left, { rotationY: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' }, 0.7)
          .to(doors.right, { rotationY: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' }, 0.78)
      }
    }

    const shade = (side) => {
      const deg = Math.abs(gsap.getProperty(doors[side], 'rotationY'))
      doors[side].style.setProperty('--shade', (Math.sin((Math.min(deg, 180) * Math.PI) / 180) * 0.5).toFixed(3))
    }

    for (const side of ['left', 'right']) {
      const el = doors[side]
      const sign = side === 'left' ? -1 : 1
      let moved = false
      offs.push(
        onDrag(el, {
          onStart() {
            if (stage !== 'gate' || opened[side]) return false
            doorHeld = true
            moved = false
            sway?.kill()
            sway = null
            gsap.killTweensOf(el, 'rotationY')
            sound.play('tap')
            haptic(6)
          },
          onMove(p) {
            if (Math.abs(p.dx) > 6) moved = true
            const out = Math.max(0, p.dx * sign) // outward pull, px
            gsap.set(el, { rotationY: sign * Math.min(120, out * 0.75) })
            shade(side)
          },
          onEnd(p) {
            doorHeld = false
            const out = p.dx * sign
            if (!moved || out > 60) return openDoor(side)
            track(gsap.to(el, { rotationY: 0, duration: T.reveal, ease: EASE.wobble, onUpdate: () => shade(side) }))
          },
        }),
      )
      on(el, 'keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openDoor(side)))
    }

    function openDoor(side) {
      if (stage !== 'gate' || opened[side]) return
      opened[side] = true
      sway?.kill()
      sway = null
      const el = doors[side]
      el.classList.add('open')
      el.setAttribute('aria-hidden', 'true')
      el.tabIndex = -1
      const both = opened.left && opened.right
      const tl = big(moment())
      beat(tl, 'paper', 0)
      tl.to(el, { rotationY: (side === 'left' ? -1 : 1) * OPEN_DEG, duration: T.reveal, ease: 'power2.out', onUpdate: () => shade(side) }, 0)
      // no room beside the card (phones): the door folds away behind it as it lands
      if (!flank) tl.to(el, { autoAlpha: 0, duration: T.quick, ease: 'power1.in' }, `-=${T.quick}`)
      if (!both) {
        const other = doors[side === 'left' ? 'right' : 'left']
        gsap.set(other, { rotationY: 0 })
        guide.set(other)
      } else {
        guide.set([])
        tl.call(openCard, null, '>')
      }
    }

    /** After a resize/rotation: open doors lie beside the card only where they fit. */
    function syncDoors() {
      if (stage !== 'open' || flipTl?.isActive()) return
      for (const el of Object.values(doors)) gsap.set(el, { autoAlpha: flank && !flipped ? 1 : 0, x: 0 })
    }

    /* ── 3. the card itself ─────────────────────────────────────────────────────────── */
    function openCard() {
      stage = 'open'
      scene.dataset.stage = 'open'
      const names = [...faceEl.querySelectorAll('.cf-name')]
      const tl = big(
        moment({
          onComplete: () => {
            // saving it is optional: a warm glow on the button, no arrow
            guide.stop()
            guide = nudge(saveBtn, { after: 4000 })
          },
        }),
      )
      beat(tl, 'chime', T.quick)
      tl.to(draws, { strokeDashoffset: 0, duration: 2, ease: 'power1.inOut', stagger: { amount: 0.5 } }, T.quick)
        .to(fills, { opacity: 1, duration: T.reveal, ease: 'power1.out', stagger: { amount: 0.3 } }, `>-${T.reveal}`)
        .addLabel('gilded')
      beat(tl, 'sparkle', 'gilded-=0.2')
      tl.call(() => {
        for (const n of names) {
          const r = n.getBoundingClientRect()
          fx.sparkles(r.left + r.width / 2, r.top + r.height / 2, { count: 10, colors: ['var(--card-gold-hi)', 'var(--card-gold)', 'var(--card-ivory)'] })
        }
      }, null, 'gilded-=0.2')
        .call(() => setHint(t('card.hintOpen')), null, 'gilded')
        .fromTo(actions, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: T.quick, ease: EASE.out }, 'gilded')
      if (noteEl) tl.fromTo(noteEl, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: T.reveal, ease: EASE.out }, '>')
    }

    /* ── look closer: tap the card to zoom, drag to look around, tap to step back ───── */
    let zx = 0, zy = 0, Z = 1, base = null
    const clampPan = (x, y) => {
      const vw = root.clientWidth, vh = root.clientHeight, m = 10
      const w = base.width * Z, h = base.height * Z
      const cx = base.left + base.width / 2, cy = base.top + base.height / 2
      const ax = w > vw - 2 * m ? [vw - m - cx - w / 2, m - cx + w / 2] : [vw / 2 - cx, vw / 2 - cx]
      const ay = h > vh - 2 * m ? [vh - m - cy - h / 2, m - cy + h / 2] : [vh / 2 - cy, vh / 2 - cy]
      return [Math.min(ax[1], Math.max(ax[0], x)), Math.min(ay[1], Math.max(ay[0], y))]
    }
    function zoomAt(px, py) {
      if (zoomed || stage !== 'open') return
      zoomed = true
      scene.classList.add('cs--zoomed')
      base = fit.getBoundingClientRect()
      Z = Math.max(1.8, Math.min(3, 1.55 / s))
      const cx = base.left + base.width / 2, cy = base.top + base.height / 2
      ;[zx, zy] = clampPan((cx - px) * (Z - 1), (cy - py) * (Z - 1))
      sound.play('whoosh')
      setHint(t('card.hintZoom'))
      track(gsap.to(fit, { x: zx, y: zy, scale: Z, duration: T.move, ease: EASE.out, overwrite: true }))
      track(gsap.to(actions, { autoAlpha: 0, duration: T.quick, overwrite: true }))
    }
    function unzoom(instant = false) {
      if (!zoomed) return
      zoomed = false
      scene.classList.remove('cs--zoomed')
      if (!instant) sound.play('whoosh')
      setHint(t('card.hintOpen'))
      track(gsap.to(fit, { x: 0, y: 0, scale: 1, duration: instant ? 0 : T.move, ease: EASE.out, overwrite: true }))
      track(gsap.to(actions, { autoAlpha: 1, duration: T.quick, overwrite: true }))
    }
    let panFrom = null, panMoved = false, onAlpana = false
    offs.push(
      onDrag(fit, {
        onStart(p, e) {
          if (stage !== 'open' || flipped) return false
          if (!zoomed && !e.target.closest('.cf')) return false
          onAlpana = !!e.target.closest('[data-alpana]')
          if (!zoomed && onAlpana) return false // a tap on the alpana turns it (react), it doesn't zoom
          panFrom = [zx, zy]
          panMoved = false
        },
        onMove(p) {
          if (Math.hypot(p.dx, p.dy) > 8) panMoved = true
          if (!zoomed || !panMoved) return
          ;[zx, zy] = clampPan(panFrom[0] + p.dx, panFrom[1] + p.dy)
          gsap.set(fit, { x: zx, y: zy })
        },
        onEnd(p) {
          if (panMoved) return
          if (onAlpana) return // she was turning the mandala, not stepping back
          if (zoomed) unzoom()
          else zoomAt(p.x, p.y)
        },
      }),
    )

    /* ── flip: the back of the card ─────────────────────────────────────────────────── */
    function flip() {
      if (stage !== 'open' || flipTl?.isActive()) return
      if (zoomed) unzoom()
      flipped = !flipped
      const toBack = flipped
      const tl = (flipTl = big(moment()))
      beat(tl, 'paper', 0)
      if (flank) tl.to(Object.values(doors), { autoAlpha: toBack ? 0 : 1, duration: T.quick }, toBack ? 0 : T.reveal)
      tl.set(toBack ? backEl : faceEl, { visibility: 'visible' }, 0)
        .to(leaf, { rotationY: toBack ? 180 : 0, duration: T.reveal, ease: EASE.inOut }, toBack && flank ? T.quick * 0.6 : 0)
        .set(toBack ? faceEl : backEl, { visibility: 'hidden' })
        .call(() => {
          flipBtn.textContent = t(toBack ? 'card.front' : 'card.flip')
          backEl.setAttribute('aria-hidden', String(!toBack))
          faceEl.setAttribute('aria-hidden', String(toBack))
          setHint(toBack ? '' : t('card.hintOpen'))
        })
    }
    gsap.set(backEl, { visibility: 'hidden' })
    on(flipBtn, 'click', flip)

    /* ── save: the card face as a PNG ───────────────────────────────────────────────── */
    let saving = false
    let labelBack = null
    const setSaveLabel = (key) => (saveBtn.textContent = t(key))
    async function save() {
      if (saving || stage !== 'open') return
      saving = true
      guide.stop()
      labelBack?.kill()
      setSaveLabel('card.saving')
      saveBtn.setAttribute('aria-busy', 'true')
      try {
        const blob = await cardToPng(faceEl, {
          width: 1080,
          prepare(clone) {
            clone.style.visibility = 'visible'
            clone.removeAttribute('aria-hidden')
            for (const el of clone.querySelectorAll('[data-draw]')) el.style.strokeDashoffset = '0'
            for (const el of clone.querySelectorAll('[data-fill]')) el.style.opacity = '1'
            paintFoil(clone, PARKED.x, PARKED.y)
            for (const a of clone.querySelectorAll('[data-alpana]')) a.style.transform = '' // printed upright, however far she spun it
          },
        })
        const en = ctx.raw().card ?? card // file names stay latin in both languages
        const name = `${slug(en.groom)}-${slug(en.bride)}-reception.png`
        const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null
        let shared = false
        if (file && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: t('card.title') })
            shared = true
          } catch (err) {
            if (err?.name === 'AbortError') shared = true // she closed the sheet: nothing to do
          }
        }
        if (!shared) download(blob, name)
        if (!root.isConnected) return
        setSaveLabel('card.saved')
        sound.play('sparkle')
        const r = saveBtn.getBoundingClientRect()
        fx.sparkles(r.left + r.width / 2, r.top + r.height / 2, { count: 12 })
      } catch (err) {
        console.warn('[card] save failed', err)
        if (!root.isConnected) return
        setSaveLabel('card.save')
        fx.toast(t('card.saveFail'))
      } finally {
        saving = false
        saveBtn.removeAttribute('aria-busy')
        if (root.isConnected) labelBack = track(gsap.delayedCall(T.linger, () => setSaveLabel('card.save')))
      }
    }
    function download(blob, name) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.style.display = 'none'
      document.body.append(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000) // housekeeping, not choreography
    }
    on(saveBtn, 'click', save)

    /* ── debug hook ─────────────────────────────────────────────────────────────────── */
    if (ctx.params.has('debug')) {
      window.__card = {
        stage: () => stage,
        crack: () => crack(),
        open: (side) => (side ? openDoor(side) : (openDoor('left'), openDoor('right'))),
        flip: () => flip(),
        zoom: (x, y) => (zoomed ? unzoom() : zoomAt(x ?? innerWidth / 2, y ?? innerHeight / 2)),
        finish() {
          // jump every running moment to its end (tests); moments may start new ones
          for (let i = 0; i < 6; i++) [...live].filter((a) => a.isActive?.() || a.progress?.() < 1).forEach((a) => a.progress(1))
        },
        layout: () => ({ s, flank, zoomed }),
      }
    }

    let cleaned = false
    teardown = () => {
      if (cleaned) return
      cleaned = true
      offs.forEach((fn) => fn())
      live.forEach((a) => a.kill())
      live.clear()
      gsap.killTweensOf([seal, ...halves, flap, leaf, rig, fit, hint, actions, ...Object.values(doors), ...envParts])
      if (window.__card) delete window.__card
    }
    ctx.onCleanup(teardown)

    /* ── intro ──────────────────────────────────────────────────────────────────────── */
    await fontsReady(card, lang)
    if (!root.isConnected) return
    const intro = track(moment())
    intro.fromTo(rig, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: T.reveal, ease: EASE.out })
      .fromTo(hint, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: T.quick, ease: EASE.out }, '>-0.1')
  },

  unmount() {
    teardown?.()
    teardown = null
  },
}
