/*
 * Garden — the birthday garden, grown (verb: hold).
 *
 * The night garden behind the house: bday's eight-petal flowers, toadstools, paper lanterns,
 * a sagging string of fairy lights, the picket fence, the wishing well. A patch of soil and a
 * little sign. Tap the soil → a seed drops in. Hold (the soil or the can) → the can tilts and
 * pours while held; the sapling grows while held (~2.5 s in all) and pauses when released.
 * Grown → it pops, a wooden tag swings on it (content.garden.tag), the sign flips to
 * "what will it look like?". Tap it → a time-lapse, one GSAP timeline: a year at a time the
 * moon crosses, the tree grows a ring, blossoms burst and fall; in year five a swing, two
 * chairs and lanterns. Then it eases back to the tree's real age (tree.js) with
 * content.garden.after → complete.
 *
 * Tree age is real: re-entering a finished garden shows today's tree (no soil); on the
 * anniversary week it blossoms and says so.
 *
 * Test hooks: [data-soil] [data-can] [data-growth] [data-tag] [data-future] [data-anniversary]
 * [data-after] [data-back]; window.__garden = { plant(), hold(ms), future(), get() } under ?debug.
 */
import { gsap } from 'gsap'
import './scene.css'
import { onHold } from '../../ui/drag.js'
import { EASE, T, beat, moment } from '../../ui/choreo.js'
import { nudge, press } from '../../ui/feel.js'
import { react } from '../../ui/react.js'
import { SONG_RUN, TUNE } from './tune.js'
import { sayer } from './say.js'
import { treeAge, treeStage } from './tree.js'
import { BASE, BOX, G, LEAVES, POUR_AT, SPOUT, STAGE_SCALE, W, H, canSVG, frontSVG, gardenSVG, soilSVG } from './art.js'

const GROW_MS = 2500 // total hold time to grow the sapling
const YEAR = 2.2 // seconds per year in the time-lapse
const ORIGIN = `${BASE.x} ${BASE.y}` // the tree grows from here (svgOrigin)

// the can's pouring pose: tilted, spout tip over the soil
const TILT = -38
const TIP = { x: POUR_AT.x + 24, y: POUR_AT.y - 58 }

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])
const place = (b) => `left:${(b.x / W) * 100}%;top:${(b.y / H) * 100}%;width:${(b.w / W) * 100}%;height:${(b.h / H) * 100}%`
const easeOut = (x) => 1 - Math.pow(1 - x, 2.2)

/** Translation (in % of the can box) that puts the spout tip on TIP when tilted by TILT.
 *  shift: how far (stage units) CSS has shifted the can's resting box (--can-dx, tall phones). */
function liftPose(shift = 0) {
  const k = BOX.can.w / 100 // stage units per can-SVG unit
  const dx = (SPOUT.x - 50) * k
  const dy = (SPOUT.y - 42) * k
  const a = (TILT * Math.PI) / 180
  const rx = dx * Math.cos(a) - dy * Math.sin(a)
  const ry = dx * Math.sin(a) + dy * Math.cos(a)
  const cx = BOX.can.x + BOX.can.w / 2
  const cy = BOX.can.y + BOX.can.h / 2
  return {
    xPercent: ((TIP.x - rx - cx - shift) / BOX.can.w) * 100,
    yPercent: ((TIP.y - ry - cy) / BOX.can.h) * 100,
    rotation: TILT,
  }
}

let teardown = null

export default {
  id: 'garden',
  mount(root, ctx) {
    const { t, c, sound, fx, reduced } = ctx
    const wedding = ctx.raw().weddingDate
    const age = treeAge(wedding, new Date())
    const current = treeStage(age.years)
    const anniversary = age.anniversaryWeek && age.years >= 1
    const wasDone = ctx.state.isDone('garden')
    const weddingYear = Number(String(wedding).slice(0, 4)) || new Date().getFullYear()

    root.innerHTML = `
      <div class="garden${reduced ? ' garden--still' : ''}" data-phase="${wasDone ? 'after' : 'plant'}">
        <div class="g-sky" aria-hidden="true"></div>
        <div class="g-dawn" aria-hidden="true"></div>
        <header class="g-head">
          <p class="g-kicker hand">${esc(t('garden.kicker'))}</p>
          <h1 class="g-title display">${esc(t('garden.title'))}</h1>
          <div class="g-anniv" data-anniversary ${anniversary ? '' : 'hidden'}>
            <span class="g-bunting" aria-hidden="true">${'<i></i>'.repeat(7)}</span>
            <p class="hand">${esc(c('garden.anniversary'))}</p>
          </div>
          <p class="g-prompt hand" data-prompt aria-live="polite">${esc(wasDone ? '' : t('garden.plant'))}</p>
          <div class="g-end" data-end ${wasDone ? '' : 'hidden'}>
            <p class="g-after hand" data-after>${esc(c('garden.after'))}</p>
            <button class="btn btn--berry" type="button" data-back>${esc(t('reward.back'))}</button>
          </div>
        </header>
        <div class="g-world">
          <div class="g-stage">
            ${gardenSVG()}
            <button class="g-soil" type="button" data-soil style="${place(BOX.soil)}" aria-label="${esc(t('garden.soil'))}" ${wasDone ? 'hidden' : ''}>
              ${soilSVG()}
            </button>
            ${frontSVG(wasDone ? current : 0, { blossoms: wasDone && age.anniversaryWeek })}
            <span class="g-growth" data-growth="${wasDone ? 1 : 0}" hidden></span>
            <div class="g-tag" data-tag style="${place(BOX.tag)}" ${wasDone ? '' : 'hidden'}>
              <span class="g-tag__card hand">${esc(c('garden.tag'))}</span>
            </div>
            <div class="g-signboard" style="${place(BOX.sign)}">
              <div class="g-sign g-sign--face hand" data-sign ${wasDone ? 'hidden' : ''}><span>${esc(c('garden.sign'))}</span></div>
              <button class="g-sign g-sign--future hand" type="button" data-future ${wasDone ? '' : 'hidden'}><span>${esc(c('garden.future'))}</span></button>
            </div>
            <button class="g-can" type="button" data-can style="${place(BOX.can)}" aria-label="${esc(t('garden.can'))}">
              <span class="g-can__lift">${canSVG()}</span>
            </button>
            <p class="g-year display" data-year style="${place(BOX.year)}" aria-hidden="true"></p>
          </div>
        </div>
      </div>`

    const $ = (s) => root.querySelector(s)
    const $$ = (s) => [...root.querySelectorAll(s)]
    const garden = $('.garden')
    const prompt = $('[data-prompt]')
    const end = $('[data-end]')
    const backBtn = $('[data-back]')
    const soilBtn = $('[data-soil]')
    const wet = $('[data-wet]')
    const canBtn = $('[data-can]')
    const canLift = $('.g-can__lift')
    const signboard = $('.g-signboard')
    const signFace = $('[data-sign]')
    const futureBtn = $('[data-future]')
    const tag = $('[data-tag]')
    const yearEl = $('[data-year]')
    const growthEl = $('[data-growth]')
    const moon = $('[data-moon]')
    const dawn = $('.g-dawn')
    const tree = $('[data-tree]')
    const treeScale = $('.tree-scale')
    const sapling = $('[data-sapling]')
    const sapScale = $('.sap-scale')
    const leaves = $$('.sap-leaf').map((g) => {
      // wrap each leaf's art so it can unfold from its stalk (the outer <g> keeps its placement)
      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      inner.append(...g.childNodes)
      g.append(inner)
      return inner
    })
    const seed = $('[data-seed]')
    const stream = $('[data-stream]')
    const petals = $$('.petal')

    // stream: a falling arc from the tilted spout to the soil
    const streamD = `M${TIP.x} ${TIP.y} C${TIP.x - 6} ${TIP.y + 10} ${POUR_AT.x + 4} ${POUR_AT.y - 34} ${POUR_AT.x} ${POUR_AT.y - 2}`
    stream.querySelectorAll('path').forEach((p) => p.setAttribute('d', streamD))

    const offs = []
    const on = (el, type, fn, opts) => {
      el.addEventListener(type, fn, opts)
      offs.push(() => el.removeEventListener(type, fn, opts))
    }
    // every tween/timeline we start is tracked so unmount can kill it
    const live = new Set()
    const track = (a) => {
      if (live.size > 80) for (const x of live) if (!x.isActive()) live.delete(x)
      live.add(a)
      return a
    }

    // ── state ──
    let phase = wasDone ? 'after' : 'plant' // plant → seeding → water → sprouting → grown → future → after
    let growth = wasDone ? 1 : 0
    let shownStage = wasDone ? current : 0
    let pouring = false
    let pourClock = 0
    let tl = null // the current multi-step moment
    let pourTl = null
    const leafShown = LEAVES.map(() => wasDone)
    const setPhase = (p) => {
      phase = p
      garden.dataset.phase = p
    }

    // ── first paint ──
    gsap.set(sapScale, { scale: wasDone ? 1 : 0.22, svgOrigin: ORIGIN })
    gsap.set(leaves, { scale: wasDone ? 1 : 0, transformOrigin: '0% 60%' })
    gsap.set(treeScale, { scale: STAGE_SCALE[shownStage], svgOrigin: ORIGIN })
    if (wasDone) {
      if (current === 0) gsap.set(sapling, { opacity: 1 })
      gsap.set(tree, { opacity: current === 0 ? 0 : 1 })
      gsap.set(wet, { opacity: 0.5 })
    } else {
      gsap.set(tree, { opacity: 0 })
      gsap.set(wet, { opacity: 0 })
    }

    // ── prompt ──
    const setPrompt = (text) => {
      if (prompt.textContent === text) return
      prompt.textContent = text
      if (text) track(gsap.fromTo(prompt, { scale: 0.88, rotation: -2 }, { scale: 1, rotation: 0, duration: reduced ? 0.01 : 0.45, ease: 'back.out(3)', overwrite: true }))
    }

    // ── feel: press, nudge ──
    offs.push(press(soilBtn, { sound: null }))
    offs.push(press(canBtn, { sound: null, scale: 0.95 }))
    offs.push(press(futureBtn))
    offs.push(press(backBtn))

    // little HTML bits over the art (spores, notes, drips) — tracked so unmount removes them
    const bits = new Set()
    const at = (el, fy = 0.5, fx0 = 0.5) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width * fx0, y: r.top + r.height * fy }
    }
    const bit = (cls, p, text = '') => {
      const el = document.createElement('i')
      el.className = cls
      el.setAttribute('aria-hidden', 'true')
      if (text) el.textContent = text
      const r = garden.getBoundingClientRect()
      gsap.set(el, { x: p.x - r.left, y: p.y - r.top })
      garden.append(el)
      bits.add(el)
      return el
    }
    const drop = (el) => {
      el.remove()
      bits.delete(el)
    }
    const say = sayer(garden, { reduced, keep: track, avoid: $('.g-head') })

    // ── idle guidance, in the garden's own language ──
    // soil: it sparkles. can: a drop dribbles from the spout and it leans in, wanting to pour.
    // the sign: it turns on its nails, inviting the question. Home: a warm glow, no arrow.
    const soilHint = (el) => {
      const p = at(el, 0.45)
      fx.sparkles(p.x, p.y, { count: 5 })
    }
    const canHint = (el) => {
      const r = el.getBoundingClientRect()
      const d = bit('g-drip', { x: r.left + (r.width * SPOUT.x) / 100, y: r.top + (r.height * SPOUT.y) / 84 })
      const tl = track(gsap.timeline())
      tl.to(canLift, { rotation: -9, duration: 0.35, ease: 'sine.out', transformOrigin: '70% 90%' }, 0)
      tl.to(canLift, { rotation: 0, duration: 0.7, ease: EASE.wobble }, 0.45)
      tl.fromTo(d, { scale: 0.3 }, { scale: 1, duration: 0.25, ease: 'power1.out' }, 0.15)
      tl.to(d, { y: '+=30', opacity: 0, duration: 0.5, ease: 'power2.in', onComplete: () => drop(d) }, 0.4)
      return tl
    }
    const signHint = (el) => track(gsap.timeline()
      .to(el, { rotationY: 24, duration: 0.3, ease: 'sine.out' })
      .to(el, { rotationY: -12, duration: 0.4, ease: 'sine.inOut' })
      .to(el, { rotationY: 0, duration: 0.6, ease: EASE.wobble }))
    let nd = null
    const guide = (targets, opts = {}) => {
      nd?.stop()
      nd = nudge(targets, opts)
    }
    if (wasDone) guide([backBtn])
    else guide([soilBtn], { style: soilHint, arrow: true })
    offs.push(() => nd?.stop())

    // ── growth ──
    function paintGrowth() {
      growthEl.dataset.growth = growth >= 1 ? '1' : growth.toFixed(3)
      if (growth > 0) gsap.set(sapling, { opacity: 1 })
      gsap.set(sapScale, { scale: 0.22 + 0.78 * easeOut(growth), svgOrigin: ORIGIN })
      gsap.set(wet, { opacity: Math.min(0.9, growth * 1.6) })
      LEAVES.forEach(([, , , th], i) => {
        if (leafShown[i] || growth < th) return
        leafShown[i] = true
        track(gsap.fromTo(leaves[i], { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, transformOrigin: '0% 60%', duration: reduced ? 0.01 : 0.55, ease: EASE.spring }))
        sound.play('pop')
      })
    }

    function grow(ms) {
      if (phase !== 'water') return
      growth = Math.min(1, growth + ms / GROW_MS)
      paintGrowth()
      if (growth >= 1) return sprout()
      setPrompt(t(growth > 0.72 ? 'garden.almost' : 'garden.watering'))
    }

    // ── pouring (the can lifts, tilts, water runs while held) ──
    const stage = $('.g-stage')
    function startPour() {
      if (pouring) return
      const lift = liftPose(parseFloat(getComputedStyle(stage).getPropertyValue('--can-dx')) || 0)
      pouring = true
      pourClock = 0
      garden.classList.add('g--pouring')
      pourTl?.kill()
      pourTl = track(moment())
      pourTl.to(canLift, { ...lift, duration: T.quick, ease: EASE.out })
      pourTl.to(stream, { opacity: 1, duration: 0.12 })
      sound.play('pour')
    }
    function stopPour() {
      if (!pouring) return
      pouring = false
      garden.classList.remove('g--pouring')
      pourTl?.kill()
      pourTl = track(moment())
      pourTl.to(stream, { opacity: 0, duration: 0.12 })
      pourTl.to(canLift, { xPercent: 0, yPercent: 0, rotation: 0, duration: T.move * 1.4, ease: EASE.spring }, 0.04)
    }
    // a released sapling settles with a spring
    function settle() {
      track(gsap.fromTo(sapScale, { rotation: 6 }, { rotation: 0, svgOrigin: ORIGIN, duration: reduced ? 0.01 : 0.9, ease: EASE.wobble }))
    }

    // ── 1. plant: the seed drops in ──
    function plant() {
      if (phase !== 'plant') return
      setPhase('seeding')
      tl = track(moment())
      tl.set(seed, { opacity: 1 })
      tl.fromTo(seed, { y: -150, rotation: -60 }, { y: 0, rotation: 0, duration: T.move, ease: 'power2.in' })
      beat(tl, 'seed', '>-0.02')
      tl.to(seed, { scaleY: 0.6, scaleX: 1.3, transformOrigin: '50% 100%', duration: 0.08 })
      tl.fromTo(soilBtn.querySelector('.soil-svg'), { scaleY: 0.86, scaleX: 1.05 }, { scaleY: 1, scaleX: 1, transformOrigin: '50% 80%', duration: T.reveal, ease: EASE.wobble }, '<')
      tl.to(seed, { scale: 0.3, y: 6, opacity: 0, duration: T.quick, ease: 'power2.in' })
      // the words only once the seed is in
      tl.call(() => {
        setPhase('water')
        setPrompt(t('garden.water'))
        guide([canBtn], { style: canHint, arrow: true })
      })
    }
    // pressing the can before there's anything to water
    function plantFirst() {
      setPrompt(t('garden.plantFirst'))
      const shake = track(moment())
      shake.to(canLift, { keyframes: { rotation: [0, 8, -7, 5, -3, 0] }, duration: 0.5, ease: 'none' })
      shake.call(() => soilBtn.classList.add('nudge'))
      shake.call(() => soilBtn.classList.remove('nudge'), null, '+=0.9')
    }

    // ── 2. grown: pop, the tag swings on, the sign turns round ──
    function sprout() {
      setPhase('sprouting')
      stopPour()
      nd.set([])
      tl = track(moment())
      beat(tl, 'grow', 0)
      tl.to(sapScale, { scale: 1.14, duration: T.quick, ease: EASE.out, svgOrigin: ORIGIN }, 0)
      tl.to(sapScale, { scale: 1, duration: T.reveal, ease: EASE.wobble, svgOrigin: ORIGIN })
      tl.call(() => {
        const r = sapling.getBoundingClientRect()
        fx.sparkles(r.left + r.width / 2, r.top + r.height * 0.2, { count: 16 })
      }, null, T.quick)
      tl.addLabel('tag', T.quick + 0.2)
      tl.call(() => (tag.hidden = false), null, 'tag')
      tl.fromTo(tag, { y: -24, rotation: -50, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, transformOrigin: '4% 0%', duration: T.moment, ease: EASE.wobble }, 'tag')
      beat(tl, 'tap', 'tag+=0.1')
      // the words only once the tag has landed
      tl.call(() => setPrompt(t('garden.grown')), null, 'tag+=0.5')
      tl.addLabel('sign', 'tag+=1.0')
      tl.to(signFace, { rotationY: 90, duration: T.quick, ease: 'power2.in' }, 'sign')
      // the button is live the moment it shows (a tap mid-flip just finishes the flip)
      tl.call(() => {
        signFace.hidden = true
        futureBtn.hidden = false
        setPhase('grown')
        sound.play('chime')
      })
      tl.fromTo(futureBtn, { rotationY: -90 }, { rotationY: 0, duration: T.move, ease: EASE.spring })
      tl.call(() => {
        setPrompt(t('garden.ask'))
        guide([futureBtn], { style: signHint, arrow: true })
      })
    }

    // ── 3. the time-lapse: one timeline, a year at a time, then back to today ──
    // Branches draw out from the trunk; every crown and its shadow grow from the crown's centre
    // (svgOrigin), so nothing floats loose mid-animation and overlapping crowns never cross-fade.
    const branchesAt = (k) => $$(`.tree .br[data-st="${k}"]`)
    const crownsAt = (k) => $$(`.tree .cr[data-st="${k}"], .tree .cr-shadow[data-st="${k}"]`)
    const originOf = (el) => `${el.dataset.cx} ${el.dataset.cy}`
    function growParts(tl, k, at) {
      branchesAt(k).forEach((br, j) => {
        const strokes = br.querySelectorAll('path')
        tl.set(br, { opacity: 1 }, at)
        tl.fromTo(strokes, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out' }, `${at}+=${j * 0.05}`)
      })
      crownsAt(k).forEach((el) => {
        const i = +el.dataset.i
        tl.set(el, { opacity: 1 }, `${at}+=0.25`)
        tl.fromTo(el, { scale: 0 }, { scale: 1, svgOrigin: originOf(el), duration: 0.7, ease: EASE.spring, immediateRender: false }, `${at}+=${0.25 + (i % 5) * 0.04}`)
      })
    }
    function shrinkLater(tl, keep, at) {
      const later = (sel) => $$(sel).filter((el) => +el.dataset.st > keep)
      later('.tree .cr, .tree .cr-shadow').forEach((el) => {
        tl.to(el, { scale: 0, svgOrigin: originOf(el), duration: 0.7, ease: 'power2.in' }, at)
        tl.set(el, { opacity: 0 }, `${at}+=0.7`)
      })
      later('.tree .br').forEach((br) => {
        tl.to(br.querySelectorAll('path'), { strokeDashoffset: 1, duration: 0.6, ease: 'power2.in' }, `${at}+=0.3`)
        tl.set(br, { opacity: 0 }, `${at}+=0.9`)
      })
      tl.to(later('.tree .swing, .tree .chairs, .tree .tree-lanterns'), { opacity: 0, duration: 0.5 }, at)
    }
    const blossomsUpTo = (k) => $$('.tree .bl').filter((b) => +b.dataset.st <= k)
    const swing = $('.tree .swing')
    const chairs = $('.tree .chairs')
    const treeLanterns = $('.tree .tree-lanterns')
    const CROWNS = $$('.tree .cr circle').map((cEl) => ({ x: +cEl.getAttribute('cx'), y: +cEl.getAttribute('cy'), st: +cEl.parentNode.dataset.st }))
    // --treefit: tall phones draw the whole tree a little smaller (scene.css), so its crown stays out of the header
    const treeFit = () => parseFloat(getComputedStyle(tree).getPropertyValue('--treefit')) || 1
    const toWorld = (p, s) => {
      const k = s * treeFit()
      return { x: BASE.x + (p.x - BASE.x) * k, y: BASE.y + (p.y - BASE.y) * k }
    }

    function future() {
      if (phase !== 'grown' && phase !== 'after') return
      const wasAfter = phase === 'after'
      setPhase('future')
      nd.set([])
      futureBtn.disabled = true
      tl?.progress(1).kill() // e.g. the sign's flip, if she was quick
      const from = shownStage
      const years = []
      for (let k = Math.max(1, from + 1); k <= 5; k++) years.push(k)
      if (!years.length) years.push(5)

      tl = track(moment({ onComplete: finish }))
      // clear the stage
      beat(tl, 'whoosh', 0)
      tl.to([signboard, canBtn], { opacity: 0, y: 16, duration: T.quick, ease: 'power1.in' }, 0)
      if (wasAfter) tl.to(end, { opacity: 0, duration: T.quick }, 0)
      tl.call(() => setPrompt(t('garden.ahead')), null, 0.05)
      let at = T.move
      let petal = 0
      years.forEach((k, i) => {
        const L = `y${i}`
        const s = STAGE_SCALE[k]
        tl.addLabel(L, at)
        // a year passes: the moon crosses, the sky warms for a moment
        tl.set(moon, { x: 70, y: 40 }, L)
        tl.to(moon, { x: -430, duration: YEAR, ease: 'none' }, L)
        tl.to(moon, { y: -16, duration: YEAR / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, L)
        tl.to(dawn, { opacity: 0.55, duration: YEAR * 0.25, ease: 'sine.inOut', yoyo: true, repeat: 1 }, `${L}+=${YEAR * 0.2}`)
        // the year
        tl.call(() => (yearEl.textContent = t('garden.year', { year: weddingYear + k })), null, L)
        tl.fromTo(yearEl, { scale: 0.6, opacity: 0, y: 8 }, { scale: 1, opacity: 1, y: 0, duration: T.quick, ease: EASE.spring }, L)
        // the tree grows a ring
        beat(tl, 'grow', `${L}+=0.2`)
        if (from === 0 && i === 0) {
          tl.to(sapling, { opacity: 0, duration: 0.5 }, `${L}+=0.2`)
          tl.to(sapScale, { scale: 1.6, duration: 0.6, ease: 'power1.in', svgOrigin: ORIGIN }, `${L}+=0.2`)
          tl.to(tree, { opacity: 1, duration: 0.5 }, `${L}+=0.2`)
        }
        tl.to(treeScale, { scale: s, duration: 1.1, ease: EASE.spring, svgOrigin: ORIGIN }, `${L}+=0.2`)
        growParts(tl, k, `${L}+=0.3`)
        tl.call(() => (shownStage = k), null, `${L}+=0.3`)
        // spring: blossoms burst, then a few petals fall
        const bls = blossomsUpTo(k)
        beat(tl, 'sparkle', `${L}+=1.0`)
        tl.fromTo(bls, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, transformOrigin: '50% 50%', duration: 0.4, ease: EASE.spring, stagger: { each: 0.012, from: 'random' } }, `${L}+=1.0`)
        CROWNS.filter((cr) => cr.st <= k).slice(0, 4).forEach((cr, j) => {
          const p = toWorld(cr, s)
          const el = petals[petal++ % petals.length]
          tl.fromTo(el, { x: p.x, y: p.y, opacity: 1, rotation: 0 }, { x: p.x + (j % 2 ? 22 : -18), y: G - 4, rotation: 240, opacity: 0, duration: 1.1, ease: 'power1.in' }, `${L}+=${1.35 + j * 0.08}`)
        })
        if (k < 5) tl.to(bls, { opacity: 0, duration: 0.4 }, `${L}+=${YEAR - 0.45}`)
        at = `${L}+=${YEAR}`
      })
      // year five: a swing, two chairs, lanterns
      const last = `y${years.length - 1}`
      tl.fromTo(swing, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, `${last}+=0.9`)
      tl.fromTo(swing, { rotation: 16 }, { rotation: 0, svgOrigin: '134 322', duration: 1.8, ease: EASE.wobble }, `${last}+=1.3`)
      tl.fromTo(chairs, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: EASE.spring }, `${last}+=1.2`)
      tl.fromTo(treeLanterns, { opacity: 0 }, { opacity: 1, duration: 0.5 }, `${last}+=1.5`)
      beat(tl, 'chime', `${last}+=1.5`)
      tl.addLabel('full', `${last}+=${YEAR}`)
      tl.call(() => garden.classList.add('g--full'), null, 'full')
      // linger, then ease back to today's tree
      tl.addLabel('back', `full+=${T.linger * 0.8}`)
      tl.call(() => garden.classList.remove('g--full'), null, 'back')
      tl.to(yearEl, { opacity: 0, duration: 0.5 }, 'back')
      tl.to(moon, { x: 0, y: 0, duration: 1.5, ease: EASE.inOut }, 'back')
      const keepBlossoms = age.anniversaryWeek ? blossomsUpTo(current) : []
      tl.to(blossomsUpTo(5).filter((b) => !keepBlossoms.includes(b)), { opacity: 0, duration: 0.6 }, 'back')
      shrinkLater(tl, current, 'back')
      tl.to(treeScale, { scale: STAGE_SCALE[current], duration: 1.5, ease: EASE.inOut, svgOrigin: ORIGIN }, 'back')
      if (current === 0) {
        tl.to(tree, { opacity: 0, duration: 0.6 }, 'back+=0.9')
        tl.fromTo(sapScale, { scale: 0.5 }, { scale: 1, duration: 0.9, ease: EASE.spring, svgOrigin: ORIGIN }, 'back+=0.9')
        tl.to(sapling, { opacity: 1, duration: 0.4 }, 'back+=0.9')
      }
      tl.call(() => (shownStage = current), null, 'back+=1.5')
      tl.to([signboard, canBtn], { opacity: 1, y: 0, duration: T.quick }, 'back+=1.2')
      // the line only once the tree is home
      tl.addLabel('after', 'back+=1.6')
      tl.call(() => {
        setPrompt('')
        end.hidden = false
      }, null, 'after')
      tl.fromTo(end, { opacity: 0, y: 10, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: T.reveal, ease: EASE.spring }, 'after')
    }

    function finish() {
      setPhase('after')
      futureBtn.disabled = false
      ctx.complete()
      guide([backBtn])
    }

    // ── wiring ──
    const holdOpts = (who) => ({
      onStart() {
        if (phase === 'plant') return who === 'soil' ? plant() : plantFirst()
        if (phase === 'water' || phase === 'grown' || phase === 'after') startPour()
      },
      onTick(dt) {
        if (phase === 'water') {
          if (!pouring) startPour()
          grow(dt)
        }
        if (pouring && (pourClock += dt) > 700) {
          pourClock = 0
          sound.play('pour')
        }
      },
      onEnd() {
        const was = pouring
        stopPour()
        if (phase === 'water' && growth > 0) {
          settle()
          setPrompt(t('garden.more'))
        } else if (was && (phase === 'grown' || phase === 'after')) {
          // watering a grown tree: it's happy
          const r = (shownStage === 0 ? sapling : tree).getBoundingClientRect()
          fx.sparkles(r.left + r.width / 2, r.top + r.height * 0.3, { count: 8 })
          sound.play('sparkle')
        }
      },
    })
    offs.push(onHold(soilBtn, holdOpts('soil')))
    offs.push(onHold(canBtn, holdOpts('can')))
    on(soilBtn, 'click', (e) => e.detail === 0 && phase === 'plant' && plant()) // keyboard
    on(futureBtn, 'click', () => future())
    on(backBtn, 'click', () => ctx.back())

    // ── scenery answers a tap — each thing like what it is, a few with a payoff ──
    const svgNS = 'http://www.w3.org/2000/svg'
    const svgEl = (tag, attrs, parent) => {
      const el = document.createElementNS(svgNS, tag)
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      parent.append(el)
      return el
    }
    const lights = $$('.g-lights .bulb-glow')
    /** The fairy lights flash in a wave outward from client x. */
    function chase(x) {
      if (reduced) return
      const byDist = lights
        .map((b) => ({ b, d: Math.abs(at(b).x - x) }))
        .sort((a, b) => a.d - b.d)
        .map((o) => o.b)
      track(gsap.fromTo(byDist, { opacity: 0.85, attr: { r: 13 } }, { opacity: 0.22, attr: { r: 7 }, duration: 0.9, ease: 'power2.out', stagger: 0.045, immediateRender: false }))
    }

    // the fence: a xylophone (see TUNE). The melody starts at the first picket she can see
    // (phones only show part of the fence), so left → right always plays the opening; eight in
    // a row and the garden sings along.
    const pickets = $$('.g-fence .picket')
    const firstSeen = () => {
      const left = garden.getBoundingClientRect().left
      return Math.max(0, pickets.findIndex((p) => p.getBoundingClientRect().left >= left - 2))
    }
    let runK = -9
    let run = 0
    let runAt = 0
    let songs = 0
    function sing(pk) {
      sound.play('chime')
      chase(at(pk).x)
      const again = songs++ > 0
      say(t(again ? 'garden.songAgain' : 'garden.song'), at(pk, 0), { small: t(again ? 'garden.songAgainSmall' : 'garden.songSmall'), hold: 3.4 }).classList.add('say--song')
      if (reduced) return
      track(gsap.fromTo($$('.g-back .lt-glow'), { opacity: 0.18 }, { opacity: 0.6, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' }))
      // the pickets she played take a bow, one after another
      const end = pickets.indexOf(pk)
      const row = pickets.slice(Math.max(0, end - SONG_RUN + 1), end + 1)
      track(gsap.timeline({ delay: 0.3 })
        .to(row, { rotation: -7, transformOrigin: '50% 100%', duration: 0.2, ease: 'power2.out', stagger: 0.07 })
        .to(row, { rotation: 0, transformOrigin: '50% 100%', duration: 0.7, ease: EASE.wobble, stagger: 0.07 }, 0.22))
    }
    for (const pk of pickets) {
      const k = +pk.dataset.k
      // the bar it plays depends on where the fence starts on this screen (set just before react plays it)
      const note = { i: 0 }
      on(pk, 'pointerdown', () => (note.i = TUNE[(k - firstSeen()) % TUNE.length]), { capture: true })
      offs.push(
        react(pk, 'ring', {
          origin: '50% 100%',
          strength: 1.8,
          sound: 'xylo',
          soundOpts: note,
          steps: [
            () => {
              const now = performance.now()
              run = k === runK + 1 && now - runAt < 2200 ? run + 1 : 1
              runK = k
              runAt = now
              // the struck bar lights up for a moment, like a key on a toy xylophone
              pk.classList.add('is-struck')
              track(gsap.delayedCall(0.12, () => pk.classList.remove('is-struck')))
              if (!reduced) {
                const n = bit('g-note', at(pk, 0.05), k % 3 ? '♪' : '♫')
                track(gsap.fromTo(n, { scale: 0.4, opacity: 1 }, { scale: 1, y: '-=48', x: `+=${k % 2 ? 9 : -9}`, rotation: k % 2 ? 16 : -16, opacity: 0, duration: 1.2, ease: 'power1.out', onComplete: () => drop(n) }))
              }
              if (run === SONG_RUN) sing(pk)
            },
          ],
        }),
      )
    }

    // the fairy lights: a wave of light runs out from her finger; the fourth time they beat
    // like a heart — "heart beats fast", the song's first line
    const lightString = $('.g-back .g-lights')
    let beating = false
    const wave = (n, e) => e && chase(e.clientX)
    offs.push(react(lightString, 'flicker', { sound: 'ting', strength: 0.6, steps: [wave, wave, wave, (n, e) => {
      if (beating) return
      beating = true
      sound.play('sparkle')
      say(t('garden.heart'), e ? { x: e.clientX, y: e.clientY - 14 } : at(lightString, 0), { small: t('garden.heartSmall') })
      const tl = track(gsap.timeline({ onComplete: () => (beating = false) }))
      for (let i = 0; i < 3; i++) {
        const b = i * 0.9
        tl.call(() => sound.play('knock'), null, b)
        tl.call(() => sound.play('knock'), null, b + 0.26)
        if (reduced) continue
        // ba-dum
        tl.to(lights, { opacity: 0.95, attr: { r: 12 }, duration: 0.1, ease: 'power2.out' }, b)
        tl.to(lights, { opacity: 0.4, attr: { r: 8 }, duration: 0.14 }, b + 0.1)
        tl.to(lights, { opacity: 0.85, attr: { r: 11 }, duration: 0.1, ease: 'power2.out' }, b + 0.26)
        tl.to(lights, { opacity: 0.22, attr: { r: 7 }, duration: 0.45, ease: 'sine.out' }, b + 0.36)
      }
    }] }))

    // flowers nod on their stems and wake (the birthday garden: "you woke up every flower in it")
    const awake = new Set()
    let allAwake = false
    let flowerTaps = 0
    const flowers = $$('.g-back .fl')
    function wake(fl, delay = 0) {
      fl.classList.add('fl--awake')
      awake.add(fl)
      if (!reduced) track(gsap.to(fl.querySelector('.fl-head'), { rotation: '+=45', transformOrigin: '50% 50%', duration: 0.8, delay, ease: EASE.spring }))
    }
    function wakeAll(from) {
      allAwake = true
      const x = at(from).x
      sound.play('grow')
      flowers
        .map((fl) => ({ fl, d: Math.abs(at(fl).x - x) }))
        .sort((a, b) => a.d - b.d)
        .forEach(({ fl }, i) => wake(fl, 0.15 + i * 0.07))
      say(t('garden.awake'), at(from, 0), { small: t('garden.awakeSmall') })
    }
    for (const fl of flowers) {
      offs.push(react(fl, 'sway', { origin: '50% 100%', strength: 0.7, sound: 'rustle', steps: [() => {
        wake(fl)
        // phones only see two or three of the bed: four taps on any of them wake the lot
        if (++flowerTaps >= 4 && !allAwake) wakeAll(fl)
      }] }))
    }
    for (const w of $$('.g-back .wild')) offs.push(react(w, 'flutter', { origin: '50% 100%', strength: 1.5 }))

    // toadstools squish and puff spores; the third puff hangs in the air as a heart
    function spores(cap, n, heart = false) {
      sound.play('spores')
      if (reduced) return
      const p = at(cap, 0.15)
      for (let i = 0; i < n; i++) {
        const el = bit(heart ? 'g-spore g-spore--heart' : 'g-spore', p)
        const tl = track(gsap.timeline({ onComplete: () => drop(el) }))
        if (heart) {
          const a = (i / n) * Math.PI * 2
          const hx = 16 * Math.sin(a) ** 3
          const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))
          tl.to(el, { x: `+=${(hx * 2.2).toFixed(1)}`, y: `+=${(-70 + hy * 2.2).toFixed(1)}`, duration: 1, ease: 'power3.out' })
          tl.to(el, { y: '-=24', opacity: 0, duration: 1.1, ease: 'power1.in' }, '+=0.7')
        } else {
          tl.to(el, { x: `+=${(Math.random() * 60 - 30).toFixed(1)}`, y: `-=${(40 + Math.random() * 50).toFixed(1)}`, opacity: 0, scale: 0.4, duration: 1.3 + Math.random() * 0.5, ease: 'power1.out' })
        }
      }
    }
    for (const sh of $$('.g-back .shroom')) {
      offs.push(react(sh, 'squish', { strength: 1.1, steps: [() => spores(sh, 6), () => spores(sh, 10), () => spores(sh, 18, true)] }))
    }

    // paper lanterns swing from their hooks and glow brighter; the third tap sends the light
    // running down the fairy lights
    let lightsSaid = false
    for (const el of $$('.g-back .pk-swing')) {
      const glow = el.querySelector('.lt-glow')
      const brighten = (lvl) => !reduced && track(gsap.fromTo(glow, { opacity: 0.18 + 0.16 * lvl, scale: 1 + 0.15 * lvl }, { opacity: 0.18, scale: 1, transformOrigin: '50% 50%', duration: 1.8, ease: 'sine.out' }))
      offs.push(react(el, 'sway', { origin: el.dataset.hook, svgOrigin: true, strength: 1.1, steps: [() => brighten(1), () => brighten(2), () => {
        brighten(3)
        sound.play('sparkle')
        chase(at(el).x)
        if (!lightsSaid) {
          lightsSaid = true
          say(t('garden.lights'), at(el, 0), { small: t('garden.lightsSmall') })
        }
      }] }))
    }

    // the moon gets shy: blushes, turns away a little; the third time, a nickname
    let moonN = 0
    moon.dataset.react = 'bespoke'
    const blush = moon.querySelector('.moon-blush')
    const cheeks = [...moon.querySelectorAll('.moon-cheek')]
    on(moon, 'pointerdown', () => {
      if (phase === 'future') return
      const lvl = (moonN++ % 3) + 1
      sound.play('ting', { i: 8 - lvl })
      const tl = track(gsap.timeline())
      tl.to(blush, { opacity: [0.25, 0.42, 0.55][lvl - 1], duration: reduced ? 0.01 : 0.3 }, 0)
      tl.to(cheeks, { opacity: lvl > 1 ? 0.8 : 0, duration: reduced ? 0.01 : 0.3 }, 0)
      if (!reduced) {
        tl.to(moon, { rotation: -10 * lvl, svgOrigin: '350 56', duration: 0.4, ease: 'power2.out' }, 0)
        tl.to(moon, { rotation: 0, svgOrigin: '350 56', duration: 1, ease: EASE.wobble }, 1.6)
      }
      tl.to([blush, ...cheeks], { opacity: 0, duration: 0.8 }, 2.2)
      if (lvl === 3) say(t('garden.moonShy'), at(moon.querySelector('.moon-disc'), 0), { small: t('garden.moonShySmall') })
    })

    // the round trees past the fence rustle and drop leaves; the third shake drops a mango
    for (const rt of $$('.g-back .rtree')) {
      const leaf = () => {
        if (reduced) return
        for (let i = 0; i < 2; i++) {
          const x = Math.random() * 60 - 30
          const l = svgEl('ellipse', { class: 'g-fallleaf', cx: 0, cy: 0, rx: 5, ry: 2.6 }, rt)
          track(gsap.fromTo(l, { x, y: -90 - Math.random() * 20, rotation: 0 }, { x: x + (i ? 18 : -14), y: -4, rotation: 220, duration: 1.6 + i * 0.3, ease: 'sine.in', onComplete: () => l.remove() }))
        }
      }
      const mango = () => {
        const m = svgEl('g', { class: 'g-mango' }, rt)
        m.innerHTML = '<path class="mango" d="M0 -9 C7 -9 10 -2 8 4 C6 9 -1 10 -5 6 C-9 2 -7 -9 0 -9 Z"/><path class="mango-leaf" d="M1 -9 c4 -6 10 -6 12 -4 c-3 4 -8 5 -12 4 Z"/>'
        const tl = track(gsap.timeline({ onComplete: () => m.remove() }))
        if (reduced) tl.set(m, { x: 22, y: -8 })
        else {
          tl.fromTo(m, { x: 16, y: -84 }, { y: -8, duration: 0.55, ease: 'power2.in' })
          tl.call(() => {
            sound.play('knock')
            say(t('garden.mango'), at(m, 0), { small: t('garden.mangoSmall') })
          })
          tl.to(m, { y: -22, duration: 0.18, ease: 'power1.out' }).to(m, { y: -8, duration: 0.2, ease: 'power1.in' })
          tl.to(m, { x: 40, rotation: 160, duration: 0.8, ease: 'power2.out' })
        }
        if (reduced) tl.call(() => say(t('garden.mango'), at(m, 0), { small: t('garden.mangoSmall') }))
        tl.to(m, { opacity: 0, duration: 0.6 }, '+=3')
      }
      offs.push(react(rt, 'flutter', { origin: '50% 100%', strength: 0.5, sound: 'rustle', steps: [leaf, leaf, mango] }))
    }

    // the wishing well: the water ripples, the bucket swings, then a coin goes in
    for (const well of $$('.g-back .g-well')) {
      const water = well.querySelector('.g-water')
      const bucket = [well.querySelector('.p-bucket'), ...well.querySelectorAll('path.ink-line')]
      const swingBucket = () => !reduced && track(gsap.timeline()
        .to(bucket, { rotation: 12, svgOrigin: '0 -122', duration: 0.2, ease: 'power2.out' })
        .to(bucket, { rotation: 0, svgOrigin: '0 -122', duration: 1.6, ease: 'elastic.out(1.2, 0.2)' }))
      const coin = () => {
        swingBucket()
        const c0 = svgEl('circle', { class: 'p-brass', cx: 0, cy: 0, r: 4 }, well)
        const tl = track(gsap.timeline({ onComplete: () => c0.remove() }))
        tl.fromTo(c0, { x: -20, y: -150, opacity: 1 }, { x: -4, y: -48, duration: reduced ? 0.01 : 0.6, ease: 'power2.in' })
        tl.call(() => {
          sound.play('drip')
          sound.play('ting', { i: 5 })
          say(t('garden.wish'), at(well, 0.1), { small: t('garden.wishSmall') })
        })
        tl.to(c0, { opacity: 0, scaleY: 0.3, duration: 0.15 })
        if (!reduced) tl.fromTo(water, { scaleX: 1.12, scaleY: 0.8 }, { scaleX: 1, scaleY: 1, transformOrigin: '50% 50%', duration: 0.8, ease: EASE.wobble }, '<')
      }
      offs.push(react(well, 'ripple', { target: water, origin: '50% 50%', strength: 1.6, steps: [() => {}, swingBucket, coin] }))
    }

    // the bench knocks like wood; the gift on it pops its lid on a coupon (site two's, honoured)
    for (const b of $$('.g-back .g-bench')) offs.push(react(b, 'knock', { strength: 1.4 }))
    let coupon = 0
    for (const g of $$('.g-back .g-gift__box')) {
      const top = g.querySelector('.gift-top')
      offs.push(react(g, 'tip', { origin: '50% 100%', sound: 'pop', strength: 1.3, steps: [() => {
        const list = t('garden.coupons')
        const [title, fine] = list[coupon++ % list.length]
        if (!reduced) track(gsap.timeline().to(top, { y: -12, rotation: -24, transformOrigin: '0% 100%', duration: 0.18, ease: 'power2.out' }).to(top, { y: 0, rotation: 0, duration: 0.6, ease: 'bounce.out' }, '+=0.5'))
        sound.play('paper')
        say(title, at(g, 0), { small: fine })
      }] }))
    }

    // the cat on the back sill: tail flick, then a mrrp, then off it goes — and back
    for (const cat of $$('.g-back .g-cat')) {
      let n = 0
      let away = false
      cat.dataset.react = 'bespoke'
      const tail = cat.querySelector('.cat-tail')
      on(cat, 'pointerdown', () => {
        if (away) return
        const step = n++ % 3
        if (step === 0) {
          sound.play('rustle')
          if (!reduced) track(gsap.timeline().to(tail, { rotation: -40, svgOrigin: '10 -2', duration: 0.18, ease: 'power2.out' }).to(tail, { rotation: 0, svgOrigin: '10 -2', duration: 0.9, ease: EASE.wobble }))
        } else if (step === 1) {
          sound.play('meow')
          if (!reduced) track(gsap.fromTo(cat, { scaleY: 0.86 }, { scaleY: 1, transformOrigin: '50% 100%', duration: 0.6, ease: EASE.wobble }))
          say(t('garden.mew'), at(cat, 0))
        } else {
          away = true
          sound.play('whoosh')
          const tl = track(gsap.timeline({ onComplete: () => (away = false) }))
          tl.to(cat, { y: -18, x: 14, opacity: 0, duration: reduced ? 0.01 : 0.4, ease: 'power2.out' })
          tl.to(cat, { y: 0, x: 0, opacity: 1, duration: reduced ? 0.01 : 0.5, ease: EASE.land }, '+=3.5')
        }
      })
    }

    // the potted plant by the back door tips; the third time, there's the spare key
    for (const pot of $$('.g-back .g-pot')) {
      const key = $('.g-back .g-key')
      offs.push(react(pot, 'tip', { origin: '50% 100%', strength: 1.5, steps: [() => {}, () => {}, () => {
        sound.play('ting', { i: 6 })
        const tl = track(gsap.timeline())
        tl.fromTo(key, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: reduced ? 0.01 : 0.4, ease: EASE.out })
        tl.call(() => {
          const p = at(key)
          fx.sparkles(p.x, p.y, { count: 6 })
          say(t('garden.key'), p)
        })
        tl.to(key, { opacity: 0, duration: 0.5 }, '+=3')
      }] }))
    }

    // the drainpipe rings like tin and lets one drop go; the back door knocks — who's there?
    for (const pipe of $$('.g-back .g-pipe')) {
      const dropEl = pipe.querySelector('.pipe-drop')
      offs.push(react(pipe, 'ring', { origin: '50% 0%', sound: 'drip', strength: 0.6, steps: [() => {
        if (!reduced) track(gsap.fromTo(dropEl, { opacity: 1, y: 0, scale: 1 }, { opacity: 0, y: 10, scale: 0.5, transformOrigin: '50% 50%', duration: 0.6, ease: 'power2.in' }))
      }] }))
    }
    for (const door of $$('.g-back .g-door')) {
      offs.push(react(door, 'knock', { strength: 1.6, steps: [() => {}, () => track(gsap.delayedCall(0.16, () => sound.play('knock'))), () => {
        track(gsap.delayedCall(0.16, () => sound.play('knock')))
        say(t('garden.knock'), at(door, 0.2), { small: t('garden.knockSmall') })
      }] }))
    }

    // the name tag swings on its string; the third swing turns it over
    const tagCard = tag.querySelector('.g-tag__card')
    const tagFront = tagCard.textContent
    let tagFlipped = false
    offs.push(react(tag, 'sway', { origin: '4% 0%', strength: 1.3, steps: [() => {}, () => {}, () => {
      if (tagFlipped) return
      tagFlipped = true
      sound.play('paper')
      const d = reduced ? 0.01 : 0.22
      track(gsap.timeline({ onComplete: () => (tagFlipped = false) })
        .to(tagCard, { rotationY: 90, duration: d, ease: 'power2.in' })
        .call(() => {
          tagCard.textContent = t('garden.tagBack')
          tagCard.classList.add('g-tag__card--back')
        })
        .to(tagCard, { rotationY: 0, duration: d * 1.6, ease: EASE.out })
        .to(tagCard, { rotationY: 90, duration: d, ease: 'power2.in' }, '+=3')
        .call(() => {
          tagCard.textContent = tagFront
          tagCard.classList.remove('g-tag__card--back')
        })
        .to(tagCard, { rotationY: 0, duration: d * 1.6, ease: EASE.out }))
    }] }))

    // the grown tree rustles and lets a few petals go; the third time it blossoms for a moment
    const frontSvg = $('.g-front')
    const toSvg = (x, y) => {
      const pt = frontSvg.createSVGPoint()
      pt.x = x
      pt.y = y
      return pt.matrixTransform(frontSvg.getScreenCTM().inverse())
    }
    let petalI = 0
    const shed = (n, e) => {
      if (reduced || !e) return
      const p = toSvg(e.clientX, e.clientY)
      for (let i = 0; i < 3; i++) {
        const el = petals[petalI++ % petals.length]
        track(gsap.fromTo(el, { x: p.x + i * 8 - 8, y: p.y, opacity: 1, rotation: 0 }, { x: p.x + (i - 1) * 22, y: G - 4, rotation: 200, opacity: 0, duration: 1.3 + i * 0.2, ease: 'power1.in' }))
      }
    }
    offs.push(react(tree, 'flutter', { target: treeScale, origin: ORIGIN, svgOrigin: true, strength: 0.35, steps: [shed, shed, (n, e) => {
      shed(n, e)
      sound.play('sparkle')
      const bls = blossomsUpTo(shownStage)
      const keepOn = age.anniversaryWeek
      track(gsap.timeline()
        .fromTo(bls, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, transformOrigin: '50% 50%', duration: reduced ? 0.01 : 0.4, ease: EASE.spring, stagger: { each: 0.01, from: 'random' } })
        .to(bls, { opacity: keepOn ? 1 : 0, duration: 0.8 }, '+=2'))
    }] }))
    // the sapling (tonight's tree) shivers its leaves; the third time its bud opens, showing off
    const bud = $('.sap-bud')
    offs.push(react(sapling, 'flutter', { target: sapScale, origin: ORIGIN, svgOrigin: true, strength: 0.8, steps: [() => {}, () => {}, () => {
      sound.play('sparkle')
      const p = at(bud)
      fx.sparkles(p.x, p.y, { count: 10 })
      bud.classList.add('sap-bud--open')
      track(gsap.timeline()
        .fromTo(bud, { scale: 0.6 }, { scale: 1.9, transformOrigin: '50% 50%', duration: reduced ? 0.01 : 0.6, ease: EASE.spring })
        .call(() => say(t('garden.sapling'), at(sapling, 0), { small: t('garden.saplingSmall') }))
        .to(bud, { scale: 1, duration: 0.6, ease: EASE.out }, '+=2.6')
        .call(() => bud.classList.remove('sap-bud--open')))
    }] }))

    // fireflies scatter from a tap — then, curious, drift back to the finger
    on(garden, 'pointerdown', (e) => {
      if (reduced) return
      for (const f of garden.querySelectorAll(':scope > .firefly')) {
        const p = at(f)
        const dx = p.x - e.clientX
        const dy = p.y - e.clientY
        const d = Math.hypot(dx, dy)
        if (d > 120) continue
        const k = (((120 - d) / 120) * 70) / (d || 1)
        track(gsap.timeline()
          .to(f, { '--sx': `${(dx * k).toFixed(0)}px`, '--sy': `${(dy * k).toFixed(0)}px`, duration: 0.25, ease: 'power3.out' })
          .to(f, { '--sx': '0px', '--sy': '0px', duration: 1.6, ease: 'sine.inOut' }, '+=0.3'))
      }
    }, { capture: true })

    // ── ambient ──
    offs.push(fx.starfield($('.g-sky'), { count: 46 }))
    if (!reduced) offs.push(fx.fireflies(garden, { count: 11, gather: true }))
    const cricketsOff = sound.layer('crickets')
    offs.push(() => cricketsOff?.())

    // anniversary week: the tree blossoms and says so
    if (anniversary) fx.toast(c('garden.anniversary'))

    // ── debug hook ──
    if (ctx.params.has('debug')) {
      window.__garden = {
        plant() {
          if (phase === 'plant') plant()
          if (phase === 'seeding') tl.progress(1)
        },
        hold(ms) {
          this.plant()
          grow(ms)
          return growth
        },
        future: () => future(),
        // jump the time-lapse to a label ('full', 'after+=1'), firing its calls on the way
        seek: (label) => phase === 'future' && tl.seek(label, false),
        get:() => ({ phase, growth, stage: shownStage, current, anniversary }),
      }
    }

    let cleaned = false
    teardown = () => {
      if (cleaned) return
      cleaned = true
      offs.forEach((fn) => fn())
      live.forEach((a) => a.kill())
      live.clear()
      gsap.killTweensOf([prompt, tag, canLift, soilBtn, canBtn, futureBtn, backBtn, signboard, end, moon, dawn, yearEl])
      say.clear()
      bits.forEach((b) => b.remove())
      bits.clear()
      if (window.__garden) delete window.__garden
    }
    ctx.onCleanup(teardown)
  },
  unmount() {
    teardown?.()
    teardown = null
  },
}
