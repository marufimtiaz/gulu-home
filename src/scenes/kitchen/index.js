/*
 * Kitchen — recipe for us (verb: drag & stir).
 *
 * A shelf of labelled jars (content.kitchen.ingredients). Drag one onto the pot, or tap it:
 * it flies in, plop + splash, the broth blends toward its colour and its note pops up.
 * All in → a spoon appears; stir (circular drag on the pot) three turns. Then the lid lands,
 * rattles, pops; steam draws a heart; a plate slides out: content.kitchen.dish → complete.
 *
 * Timing: each multi-step moment (one jar going in; the cook-and-serve finale) is a single
 * GSAP timeline, with sounds/text/state placed on it via .call(), so text only appears once
 * the motion it describes has landed.
 *
 * Test hooks: [data-jar="i"] [data-pot] [data-note] [data-spoon] [data-stir] [data-plate];
 * window.__kitchen = { add(i), stir(turns) } under ?debug.
 */
import { gsap } from 'gsap'
import './scene.css'
import { BROTH, belonSVG, jarSVG, ladleSVG, plateSVG, potSVG, tapSVG } from './art.js'
import { hit, onDrag, onRotate } from '../../ui/drag.js'
import { loop } from '../../ui/motion.js'
import { haptic, nudge } from '../../ui/feel.js'
import { makeQuip } from './quip.js'
import { scenery } from './scenery.js'

const TURNS = 3
const MIX = 0.4 // each ingredient pulls the broth 40% toward its colour
const ROW = 4 // jars per shelf

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])

function hexToRgb(hex) {
  const h = String(hex).trim().replace('#', '')
  const f = h.length === 3 ? h.replace(/./g, '$&$&') : h
  const n = parseInt(f, 16)
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [169, 214, 229]
}
const rgbStr = ([r, g, b]) => `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`
const lerpRgb = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

let teardown = null

export default {
  id: 'kitchen',
  mount(root, ctx) {
    const { t, c, sound, fx, reduced } = ctx
    const ingredients = c('kitchen.ingredients') ?? []
    const T = (s) => (reduced ? 0.01 : s)

    // every tween/timeline/delayed call goes through G so unmount can kill them all
    const live = new Set()
    const track = (a) => {
      if (live.size > 120) for (const x of live) if (!x.isActive() && x.progress() === 1) live.delete(x)
      live.add(a)
      return a
    }
    const G = {
      to: (...a) => track(gsap.to(...a)),
      fromTo: (...a) => track(gsap.fromTo(...a)),
      tl: (o) => track(gsap.timeline(o)),
      later: (s, fn) => track(gsap.delayedCall(s, fn)),
    }

    const rows = []
    for (let i = 0; i < ingredients.length; i += ROW) rows.push(ingredients.slice(i, i + ROW).map((ing, k) => [i + k, ing]))

    root.innerHTML = `
      <div class="kitchen${reduced ? ' kitchen--still' : ''}">
        <header class="k-head">
          <p class="k-kicker hand">${esc(t('kitchen.kicker'))}</p>
          <h1 class="k-title display">${esc(t('kitchen.title'))}</h1>
          <p class="k-prompt hand" data-prompt aria-live="polite">${esc(t('kitchen.prompt'))}</p>
        </header>
        <div class="k-shelves">
          ${rows
            .map(
              (row, r) => `
            <div class="shelf">
              ${row
                .map(
                  ([i, ing]) => `
                <div class="slot">
                  <button class="jar" type="button" data-jar="${i}" style="--c:${esc(ing.color)}; --tilt:${((i * 37) % 7) - 3}deg; --delay:${(i * 0.37) % 2.2}s"
                    aria-label="${esc(t('kitchen.add', { label: ing.label }))}">
                    <span class="jar__body">${jarSVG(i)}<span class="jar__label hand">${esc(ing.label)}</span></span>
                  </button>
                </div>`,
                )
                .join('')}
              <div class="shelf__plank" data-plank aria-hidden="true"></div>
              ${r === rows.length - 1 ? `<span class="k-tool k-tool--ladle" data-tool="ladle" aria-hidden="true">${ladleSVG()}</span><span class="k-tool k-tool--belon" data-tool="belon" aria-hidden="true">${belonSVG()}</span>` : ''}
            </div>`,
            )
            .join('')}
        </div>
        <div class="k-stove">
          <div class="k-note" data-note aria-live="polite"></div>
          <div class="k-pot" data-pot role="img" aria-label="${esc(t('kitchen.pot'))}">${potSVG()}</div>
        </div>
        <div class="k-tap" data-tap aria-hidden="true">${tapSVG()}</div>
        <div class="k-counter" aria-hidden="true"><span class="knob" data-knob></span><span class="knob" data-knob></span></div>
        <div class="k-plate" data-plate hidden>
          <p class="k-plate__kicker hand">${esc(t('kitchen.special'))}</p>
          <div class="k-plate__dish">${plateSVG()}</div>
          <h2 class="k-plate__name display">${esc(c('kitchen.dish'))}</h2>
          <p class="k-plate__note hand">${esc(c('kitchen.dishNote'))}</p>
          <button class="btn btn--berry" type="button" data-back>${esc(t('reward.back'))}</button>
        </div>
      </div>`

    const $ = (s) => root.querySelector(s)
    const kitchen = $('.kitchen')
    const prompt = $('[data-prompt]')
    const note = $('[data-note]')
    const potWrap = $('[data-pot]')
    const potSvg = potWrap.querySelector('svg')
    const broth = $('[data-broth]')
    const swirl = $('[data-swirl]')
    const bubbles = $('[data-bubbles]')
    const ripples = $('[data-ripples]')
    const splash = $('[data-splash]')
    const spoon = $('[data-spoon]')
    const lid = $('[data-lid]')
    const steam = $('[data-steam]')
    const flames = $('.flames')
    const ring = $('[data-stir]')
    const plate = $('[data-plate]')
    const backBtn = $('[data-back]')
    const jars = [...root.querySelectorAll('[data-jar]')]
    const knobs = [...root.querySelectorAll('[data-knob]')]
    const SVGNS = 'http://www.w3.org/2000/svg'

    let color = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue('--sky') || '#a9d6e5')
    const paintBroth = (rgb) => {
      const s = rgbStr(rgb)
      broth.style.fill = s
      kitchen.style.setProperty('--broth', s)
    }
    paintBroth(color)

    const used = ingredients.map(() => false)
    let started = 0 // jars sent toward the pot
    let added = 0 // jars landed in the pot
    let stage = 'adding' // adding → stirring → cooking → served
    let stirAbs = 0 // |radians| stirred
    let spoonAngle = Math.PI * 0.15
    let shownSpoon = spoonAngle
    let heat = 0 // bubble rate, grows with ingredients
    let kettleOff = null
    const offs = []
    const on = (el, type, fn, opts) => {
      el.addEventListener(type, fn, opts)
      offs.push(() => el.removeEventListener(type, fn, opts))
    }

    // ── face moods (state only; the CSS swaps eyes/mouths/brows) ──
    // '' · o · happy · squeeze · giggle · annoyed · dizzy · hot
    let moodReset = null
    let hot = false // the stove knob is turned right up
    const baseMood = () => (stage === 'cooking' ? 'squeeze' : stage === 'served' ? 'happy' : hot ? 'hot' : '')
    const mood = (m, hold = 0.7) => {
      potWrap.dataset.mood = m
      moodReset?.kill()
      if (hold) moodReset = G.later(hold, () => (potWrap.dataset.mood = baseMood()))
    }
    const quip = makeQuip(kitchen)
    offs.push(() => quip.kill())
    const line = (key, k) => {
      const list = t(`kitchen.${key}`)
      return Array.isArray(list) ? list[k % list.length] : list
    }

    // ── prompt / notes ──
    const setPrompt = (text) => {
      if (prompt.textContent === text) return
      prompt.textContent = text
      G.fromTo(prompt, { scale: 0.88, rotation: -2 }, { scale: 1, rotation: 0, duration: T(0.45), ease: 'back.out(3)', overwrite: true })
    }
    let noteHide = null
    const showNote = (ing) => {
      note.innerHTML = `<b>${esc(ing.label)}</b><span>${esc(ing.note)}</span>`
      note.style.setProperty('--c', ing.color)
      note.classList.add('is-on')
      G.fromTo(note, { y: 14, scale: 0.85, rotation: -4 }, { y: 0, scale: 1, rotation: -1.5, duration: T(0.45), ease: 'back.out(2.4)', overwrite: true })
      noteHide?.kill()
      noteHide = G.later(2.8, () => note.classList.remove('is-on'))
    }

    // ── idle guidance (ui/feel nudge), in the kitchen's own language:
    //    adding   → the next jar's lid rattles, as if something inside wants out (+ arrow if stuck)
    //    stirring → the spoon takes a little turn round the pot and the stir arc shows
    //    served   → the back button glows
    const lidRattle = (jar) => {
      const lid = jar.querySelector('.jar__lidg')
      return G.tl()
        .to(lid, { keyframes: { rotation: [0, -9, 8, -7, 6, -3, 0], y: [0, -3, 0, -2, 0, -1, 0] }, transformOrigin: '50% 100%', duration: 0.5, ease: 'none' })
        .to(lid, { keyframes: { rotation: [0, -6, 5, -3, 0] }, transformOrigin: '50% 100%', duration: 0.32, ease: 'none' }, '+=0.15')
    }
    const spoonNudge = { a: 0 }
    const stirHint = () => {
      kitchen.classList.add('kitchen--nudge')
      return G.tl()
        .to(spoonNudge, { a: 1.1, duration: 0.6, ease: 'sine.inOut', onUpdate: () => placeSpoon(shownSpoon + spoonNudge.a) })
        .to(spoonNudge, { a: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)', onUpdate: () => placeSpoon(shownSpoon + spoonNudge.a) })
    }
    const nextJar = () => jars.find((_, i) => !used[i])
    // the jars are the main action of the first phase: the hand-drawn arrow may come if she's stuck
    const guide = nudge(nextJar(), { style: lidRattle, arrow: true })
    offs.push(() => guide.stop())
    // stirring has its own arrow (the arc round the pot), so its nudge brings no second one
    let stirGuide = null
    offs.push(() => stirGuide?.stop())
    const clearNudge = () => kitchen.classList.remove('kitchen--nudge')
    on(root, 'pointerdown', clearNudge, true)

    // ── pot geometry in client coords ──
    const brothPoint = () => {
      const r = potSvg.getBoundingClientRect()
      const s = r.width / 260
      return { x: r.left + BROTH.cx * s, y: r.top + BROTH.cy * s, s }
    }

    // ── splash visuals: droplets arc out, a ripple spreads (each on its own fresh element) ──
    function splashBits(hex) {
      if (reduced) return
      const dropColor = rgbStr(hexToRgb(hex))
      for (let k = 0; k < 9; k++) {
        const d = document.createElementNS(SVGNS, 'circle')
        const r = 3 + Math.random() * 4
        d.setAttribute('r', r)
        d.setAttribute('cx', BROTH.cx)
        d.setAttribute('cy', BROTH.cy)
        d.style.fill = dropColor
        d.classList.add('drop')
        splash.append(d)
        const dx = (Math.random() - 0.5) * 170
        const up = 40 + Math.random() * 60
        G.tl({ onComplete: () => d.remove() })
          .to(d, { attr: { cx: BROTH.cx + dx * 0.6 }, duration: 0.55, ease: 'none' }, 0)
          .to(d, { attr: { cy: BROTH.cy - up }, duration: 0.25, ease: 'power2.out' }, 0)
          .to(d, { attr: { cy: BROTH.cy + 6, r: r * 0.6 }, duration: 0.3, ease: 'power2.in' }, 0.25)
      }
      const rip = document.createElementNS(SVGNS, 'ellipse')
      rip.setAttribute('cx', BROTH.cx)
      rip.setAttribute('cy', BROTH.cy)
      rip.setAttribute('rx', 6)
      rip.setAttribute('ry', 1.5)
      rip.classList.add('ripple')
      ripples.append(rip)
      G.to(rip, { attr: { rx: 80, ry: 14 }, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => rip.remove() })
    }

    // ── add an ingredient: one timeline from shelf to note ──
    function add(i, { fromDrag = false } = {}) {
      if (stage !== 'adding' || used[i] == null || used[i]) return
      used[i] = true
      started++
      const last = started === ingredients.length
      const jar = jars[i]
      const ing = ingredients[i]
      jar.classList.add('jar--flying')
      jar.disabled = true
      guide.set(nextJar() ?? [])
      gsap.killTweensOf(jar)
      const jr = jar.getBoundingClientRect()
      const target = brothPoint()
      const x0 = gsap.getProperty(jar, 'x')
      const y0 = gsap.getProperty(jar, 'y')
      const dx = target.x - (jr.left + jr.width / 2)
      const dy = target.y - (jr.top + jr.height / 2)
      const from = { rgb: null }
      const mix = { t: 0 }

      const lid = jar.querySelector('.jar__lidg')
      const tl = G.tl()
      tl.call(() => {
        sound.play('tap')
        if (!fromDrag) mood('o', 0)
      })
        .to(jar, { x: x0 + dx, y: y0 + dy - 70 * target.s, rotation: -24, scale: 0.92, duration: T(0.34), ease: 'power2.out' })
        // at the top of the arc the lid pops off, then it pours
        .call(() => sound.play('pop'), null, `<${T(0.22)}`)
        .to(lid, { y: -46, x: 26, rotation: 70, opacity: 0, transformOrigin: '50% 50%', duration: T(0.4), ease: 'power2.out' }, '<')
        .to(jar, { rotation: 140, duration: T(0.12), ease: 'power1.in' })
        .to(jar, { y: y0 + dy + 10, scale: 0.2, opacity: 0, duration: T(0.14), ease: 'power2.in' })
        .addLabel('land')
        .call(() => {
          jar.hidden = true
          sound.play('plop')
          splashBits(ing.color)
          from.rgb = [...color]
          color = lerpRgb(color, hexToRgb(ing.color), MIX)
          mood('happy', 0.9)
          added++
          heat = Math.min(1, added / ingredients.length)
          if (added === 1) {
            kitchen.classList.add('kitchen--simmer')
            kettleOff = sound.layer('kettle')
          }
        }, null, 'land')
        .fromTo(potWrap, { scaleY: 0.9, scaleX: 1.07 }, { scaleY: 1, scaleX: 1, duration: T(0.6), ease: 'elastic.out(1.1, 0.4)', transformOrigin: '50% 92%', immediateRender: false, overwrite: 'auto' }, 'land')
        .to(mix, { t: 1, duration: T(0.7), ease: 'power1.out', onUpdate: () => from.rgb && paintBroth(lerpRgb(from.rgb, color, mix.t)) }, 'land')
        .call(() => sound.play('splash'), null, `land+=${T(0.08)}`)
        // the note and the count only once the splash has landed
        .call(() => {
          showNote(ing)
          const left = ingredients.length - added
          if (left > 1) setPrompt(t('kitchen.left', { n: left }))
          else if (left === 1) setPrompt(t('kitchen.leftOne'))
        }, null, `land+=${T(0.18)}`)
      if (last) tl.call(readyToStir, null, `land+=${T(0.9)}`)
    }

    // ── jars: drag or tap ──
    jars.forEach((jar, i) => {
      let moved = false
      offs.push(
        onDrag(jar, {
          onStart() {
            if (stage !== 'adding' || used[i]) return false
            moved = false
            gsap.killTweensOf(jar)
            jar.classList.add('jar--held')
            G.to(jar, { scale: 1.1, rotation: -4, duration: 0.1, ease: 'power2.out' }) // lifted off the shelf, at once
            sound.play('tap')
          },
          onMove(p) {
            if (Math.hypot(p.dx, p.dy) > 8) moved = true
            const tilt = Math.max(-28, Math.min(28, p.vx / 45))
            gsap.set(jar, { x: p.dx, y: p.dy, rotation: tilt })
            look(p.x, p.y)
            const over = hit(potWrap, p.x, p.y, 24)
            if (over !== potWrap.classList.contains('k-pot--hungry')) {
              potWrap.classList.toggle('k-pot--hungry', over)
              potWrap.dataset.mood = over ? 'o' : ''
            }
          },
          onEnd(p) {
            look(null)
            jar.classList.remove('jar--held')
            potWrap.classList.remove('k-pot--hungry')
            if (!moved) return add(i)
            if (hit(potWrap, p.x, p.y, 24)) return add(i, { fromDrag: true })
            potWrap.dataset.mood = ''
            G.to(jar, { x: 0, y: 0, rotation: 0, scale: 1, duration: T(0.8), ease: 'elastic.out(1, 0.45)', overwrite: true })
          },
        }),
      )
      // keyboard (Enter/Space): click with detail 0
      on(jar, 'click', (e) => e.detail === 0 && add(i))
    })

    // ── stirring ──
    function readyToStir() {
      if (stage !== 'adding') return
      stage = 'stirring'
      kitchen.classList.add('kitchen--stir', 'kitchen--nudge') // show the stir arrow straight away
      guide.stop()
      stirGuide = nudge(potWrap, { style: stirHint })
      spoon.dataset.on = ''
      placeSpoon(spoonAngle)
      G.fromTo(spoon, { y: -80, opacity: 0 }, { y: 0, opacity: 1, duration: T(0.6), ease: 'bounce.out', onComplete: () => {
        sound.play('chime')
        setPrompt(t('kitchen.stir'))
      } })
    }

    function placeSpoon(a) {
      const x = BROTH.cx + Math.cos(a) * BROTH.rx * 0.62
      const y = BROTH.cy + Math.sin(a) * BROTH.ry * 0.62
      spoon.firstElementChild.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(Math.cos(a) * 10).toFixed(1)})`)
      swirl.setAttribute('transform', `translate(${BROTH.cx} ${BROTH.cy}) scale(1 ${(BROTH.ry / BROTH.rx).toFixed(3)}) rotate(${((a * 180) / Math.PI) * 0.8})`)
    }

    let lastBubbleSound = 0
    let dizzied = false
    function stir(d) {
      if (stage !== 'stirring') return
      stirAbs += Math.abs(d)
      spoonAngle += d
      const p = Math.min(1, stirAbs / (TURNS * 2 * Math.PI - 1e-6))
      ring.dataset.stir = p >= 1 ? '1' : p.toFixed(3)
      ring.style.strokeDashoffset = String(1 - p)
      heat = 1 + p
      if (reduced) placeSpoon(spoonAngle) // no loop to smooth it
      const now = performance.now()
      if (Math.abs(d) > 0.05 && now - lastBubbleSound > 260) {
        lastBubbleSound = now
        sound.play('bubble')
      }
      if (!dizzied && p >= 0.45) {
        dizzied = true
        quip.say(t('kitchen.dizzy'), potWrap)
      }
      if (p < 1) setPrompt(t(p > 0.72 ? 'kitchen.almost' : 'kitchen.stirring'))
      else cook()
    }

    offs.push(
      onRotate(potWrap, {
        center: () => brothPoint(),
        onStart: () => {
          if (stage !== 'stirring') return false
          mood('dizzy', 0) // round and round: spiral eyes
        },
        onRotate: (d) => stir(d),
        onEnd: () => {
          if (stage === 'stirring') mood('happy', 0.8)
        },
      }),
    )

    // ── the pot is a little character: it looks at the jar she carries, and has moods when
    //    poked — tickled → giggles → "hey." → annoyed (brows, huffs of steam, a word for her);
    //    left alone for a few seconds it forgives her. Served, it's full: hearts and a burp.
    //    (bespoke reaction, documented: data-react="face")
    const look = (x, y) => {
      const eyes = potWrap.querySelector('[data-look]')
      if (x == null || reduced) return G.to(eyes, { x: 0, y: 0, duration: 0.3, overwrite: true })
      const r = potSvg.getBoundingClientRect()
      const s = r.width / 260
      const dx = (x - (r.left + 130 * s)) / s
      const dy = (y - (r.top + 126 * s)) / s
      const d = Math.hypot(dx, dy) || 1
      gsap.set(eyes, { x: (dx / d) * Math.min(5, d / 20), y: (dy / d) * Math.min(4, d / 20) })
    }
    const puffs = potWrap.querySelector('[data-puffs]')
    function huff() {
      if (reduced) return
      for (const [x, dir] of [[14, -1], [246, 1]]) {
        const c = document.createElementNS(SVGNS, 'circle')
        c.setAttribute('cx', x)
        c.setAttribute('cy', 104)
        c.setAttribute('r', 7)
        c.classList.add('puff')
        puffs.append(c)
        G.tl({ onComplete: () => c.remove() })
          .to(c, { attr: { cx: x + dir * 34, cy: 86, r: 15 }, duration: 0.55, ease: 'power2.out' })
          .to(c, { opacity: 0, duration: 0.3 }, '-=0.25')
      }
    }
    // speak from just above the face (the plate may cover the rim once served)
    const faceAt = () => {
      const r = potSvg.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height * 0.42 }
    }
    let pokes = 0
    let giggles = 0
    let huffs = 0
    let burps = 0
    let fullTaps = 0
    let forgive = null
    potWrap.dataset.react = 'face'
    on(potWrap, 'pointerdown', () => {
      if (stage === 'served') {
        haptic(4)
        sound.play('bubble')
        mood('happy', 0)
        const b = brothPoint()
        fx.hearts(b.x, b.y - 60 * b.s, { count: 4 })
        G.fromTo(steam, { scale: 1.15 }, { scale: 1, svgOrigin: '130 -40', duration: T(0.6), ease: 'back.out(3)', overwrite: 'auto' })
        if (++fullTaps % 2 === 1) quip.say(line('full', burps++), faceAt())
        return
      }
      if (stage !== 'adding') return
      haptic(5)
      pokes++
      forgive?.kill()
      forgive = G.later(3.2, () => {
        if (pokes >= 5 && stage === 'adding') {
          mood('happy', 1.2)
          quip.say(t('kitchen.calm'), potWrap)
        }
        pokes = 0
      })
      const origin = { transformOrigin: '50% 92%' }
      if (pokes === 1) {
        // tickled: a squirm
        sound.play('bubble')
        mood('squeeze', 0.9)
        G.tl().to(potWrap, { keyframes: { rotation: [0, -4, 4, -3, 2, 0] }, ...origin, duration: T(0.45), ease: 'none', overwrite: 'auto' })
      } else if (pokes <= 3) {
        // giggles: shaking with laughter
        sound.play('bubble')
        G.later(0.14, () => sound.play('bubble'))
        mood('giggle', 1.2)
        G.tl().to(potWrap, { keyframes: { y: [0, -5, 0, -4, 0, -3, 0, -1, 0], rotation: [0, 2, -2, 2, -2, 1, -1, 0, 0] }, ...origin, duration: T(0.7), ease: 'none', overwrite: 'auto' })
        if (pokes === 3) quip.say(line('giggle', giggles++), potWrap)
      } else if (pokes === 4) {
        // a warning look
        sound.play('tap')
        mood('o', 1.4)
        G.fromTo(potWrap, { scaleY: 1.04 }, { scaleY: 1, ...origin, duration: T(0.5), ease: 'back.out(3)', overwrite: 'auto' })
        quip.say(t('kitchen.hey'), potWrap)
      } else {
        // annoyed: brows down, a huff of steam from both handles, turns a shoulder
        sound.play('slosh')
        mood('annoyed', 3.2)
        huff()
        G.tl()
          .to(potWrap, { scaleY: 1.06, scaleX: 0.97, ...origin, duration: T(0.14), ease: 'power2.out', overwrite: 'auto' })
          .to(potWrap, { scaleY: 1, scaleX: 1, rotation: 3, duration: T(0.5), ease: 'elastic.out(1, 0.4)' })
          .to(potWrap, { rotation: 0, duration: T(0.6), ease: 'sine.inOut' }, '+=1.4')
        if (pokes === 5 || pokes % 3 === 2) quip.say(line('annoyed', huffs++), potWrap)
      }
    })

    // ── the rest of the room: knobs, tools, the tap, the shelves (scenery.js) ──
    offs.push(
      scenery(root, ctx, {
        quip,
        line,
        flames,
        setHot(v) {
          hot = v
          if (!potWrap.dataset.mood || ['', 'hot'].includes(potWrap.dataset.mood)) potWrap.dataset.mood = baseMood()
        },
        potWrap,
        G,
      }),
    )

    // ── the end: one timeline — lid lands, rattles, pops; steam heart; plate; complete ──
    function cook() {
      stage = 'cooking'
      clearNudge()
      kitchen.classList.remove('kitchen--stir')
      kitchen.classList.add('kitchen--cook')
      setPrompt(t('kitchen.cooking'))
      potWrap.dataset.mood = 'squeeze'
      const heart = steam.querySelector('.heart')
      const heartFill = steam.querySelector('.heart-fill')
      stirGuide?.stop()
      const tl = G.tl({ onComplete: () => offs.push(nudge(backBtn).stop) })
      tl.to(spoon, { y: -70, opacity: 0, duration: T(0.35), ease: 'power2.in' })
        .call(() => delete spoon.dataset.on)
        .call(() => sound.play('tap'))
        .fromTo(lid, { y: -90, opacity: 0 }, { y: 0, opacity: 1, duration: T(0.5), ease: 'bounce.out' }, '<')
      if (!reduced) {
        tl.to(lid, { rotation: 3, y: -4, svgOrigin: '130 60', duration: 0.07, yoyo: true, repeat: 9, ease: 'sine.inOut' })
          .call(() => sound.play('bubble'), null, '<0.2')
          .call(() => sound.play('bubble'), null, '<0.45')
          .to(lid, { rotation: -4, y: -8, svgOrigin: '130 60', duration: 0.06, yoyo: true, repeat: 5, ease: 'sine.inOut' })
      }
      tl.addLabel('pop')
        .call(() => {
          sound.play('lidPop')
          mood('happy', 0)
          kitchen.classList.add('kitchen--served')
          kettleOff?.()
          kettleOff = null
        }, null, 'pop')
        .to(lid, { y: -220, x: 90, rotation: 40, opacity: 0, duration: T(0.7), ease: 'power2.out' }, 'pop')
        .fromTo(heart, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: T(1), ease: 'power1.inOut' }, `pop+=${T(0.1)}`)
        .fromTo(heartFill, { opacity: 0 }, { opacity: 1, duration: T(0.5) })
        .call(() => {
          const b = brothPoint()
          fx.hearts(b.x, b.y - 60 * b.s, { count: 7 })
        }, null, '<')
        .addLabel('serve')
        .call(() => {
          stage = 'served'
          plate.hidden = false
        }, null, 'serve')
        .fromTo(plate, { xPercent: 130, rotation: 8 }, { xPercent: 0, rotation: -1.5, duration: T(0.7), ease: 'back.out(1.6)', immediateRender: false }, 'serve')
        // the words and the reward only once the plate has landed
        .call(() => {
          const r = plate.querySelector('.k-plate__dish').getBoundingClientRect()
          fx.sparkles(r.left + r.width / 2, r.top + r.height / 2, { count: 18 })
          sound.play('sparkle')
          setPrompt(t('kitchen.done'))
          ctx.complete()
        })
    }

    on(backBtn, 'click', () => ctx.back())

    // ── ambient: bubbles on the broth, smooth spoon ──
    let bubbleClock = 0
    function spawnBubble() {
      const b = document.createElementNS(SVGNS, 'circle')
      const a = Math.random() * Math.PI * 2
      const rr = Math.sqrt(Math.random()) * 0.8
      b.setAttribute('cx', (BROTH.cx + Math.cos(a) * BROTH.rx * rr).toFixed(1))
      b.setAttribute('cy', (BROTH.cy + Math.sin(a) * BROTH.ry * rr).toFixed(1))
      b.setAttribute('r', '0')
      b.classList.add('bubble')
      bubbles.append(b)
      const size = 2.5 + Math.random() * 4 * (0.6 + heat * 0.4)
      G.tl({ onComplete: () => b.remove() })
        .to(b, { attr: { r: size }, duration: 0.5 + Math.random() * 0.5, ease: 'power1.out' })
        .to(b, { attr: { r: size * 1.5 }, opacity: 0, duration: 0.12 })
    }
    if (!reduced) {
      offs.push(
        loop((dt) => {
          if (stage === 'served') return
          if (heat > 0) {
            bubbleClock += dt * heat * 7
            while (bubbleClock > 1) {
              bubbleClock -= 1
              if (bubbles.childElementCount < 18) spawnBubble()
            }
          }
          if (stage === 'stirring' && shownSpoon !== spoonAngle) {
            shownSpoon += (spoonAngle - shownSpoon) * Math.min(1, dt * 18)
            placeSpoon(shownSpoon)
          }
        }),
      )
    }

    // ── debug hook ──
    if (ctx.params.has('debug')) {
      window.__kitchen = {
        add: (i) => add(i),
        stir: (turns) => {
          const total = turns * 2 * Math.PI
          const step = Math.PI / 18
          for (let a = 0; a < total && stage === 'stirring'; a += step) stir(Math.min(step, total - a))
        },
        get: () => ({ stage, added, stir: Number(ring.dataset.stir) }),
      }
    }

    let cleaned = false
    teardown = () => {
      if (cleaned) return
      cleaned = true
      offs.forEach((fn) => fn())
      live.forEach((a) => a.kill())
      live.clear()
      kettleOff?.()
      if (window.__kitchen) delete window.__kitchen
    }
    ctx.onCleanup(teardown)
  },
  unmount() {
    teardown?.()
    teardown = null
  },
}
