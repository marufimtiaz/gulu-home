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
import { nudge, poke, press } from '../../ui/feel.js'
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

/** Translation (in % of the can box) that puts the spout tip on TIP when tilted by TILT. */
function liftPose() {
  const k = BOX.can.w / 100 // stage units per can-SVG unit
  const dx = (SPOUT.x - 50) * k
  const dy = (SPOUT.y - 42) * k
  const a = (TILT * Math.PI) / 180
  const rx = dx * Math.cos(a) - dy * Math.sin(a)
  const ry = dx * Math.sin(a) + dy * Math.cos(a)
  const cx = BOX.can.x + BOX.can.w / 2
  const cy = BOX.can.y + BOX.can.h / 2
  return {
    xPercent: ((TIP.x - rx - cx) / BOX.can.w) * 100,
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
    const nd = nudge(wasDone ? [backBtn] : [soilBtn])
    offs.push(() => nd.stop())

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
    const lift = liftPose()
    function startPour() {
      if (pouring) return
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
        nd.set([canBtn])
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
        nd.set([futureBtn])
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
    const toWorld = (p, s) => ({ x: BASE.x + (p.x - BASE.x) * s, y: BASE.y + (p.y - BASE.y) * s })

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
      nd.set([backBtn])
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

    // ── scenery answers a tap ──
    for (const el of $$('.g-back .pk')) offs.push(poke(el))
    for (const el of $$('.g-back .pk-swing')) {
      on(el, 'pointerdown', () => {
        sound.play('chime')
        if (reduced) return
        const [x, y] = el.dataset.hook.split(' ')
        track(gsap.timeline())
          .to(el, { rotation: 14, duration: 0.14, svgOrigin: `${x} ${y}`, ease: 'power2.out', overwrite: 'auto' })
          .to(el, { rotation: 0, duration: 1.6, svgOrigin: `${x} ${y}`, ease: 'elastic.out(1.2, 0.2)' })
      })
    }
    // the grown tree / tag rustle when touched
    on(tree, 'pointerdown', (e) => {
      if (phase !== 'after' && phase !== 'grown') return
      sound.play('pop')
      fx.sparkles(e.clientX, e.clientY, { count: 6 })
      if (!reduced) track(gsap.fromTo(treeScale, { rotation: 2.5 }, { rotation: 0, svgOrigin: ORIGIN, duration: 1, ease: EASE.wobble }))
    })
    on(sapling, 'pointerdown', (e) => {
      if (phase !== 'after' && phase !== 'grown') return
      sound.play('pop')
      fx.sparkles(e.clientX, e.clientY, { count: 6 })
      settle()
    })
    on(tag, 'pointerdown', () => {
      sound.play('tap')
      if (!reduced) track(gsap.fromTo(tag, { rotation: 18 }, { rotation: 0, transformOrigin: '4% 0%', duration: 1.4, ease: 'elastic.out(1.2, 0.2)', overwrite: 'auto' }))
    })

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
      if (window.__garden) delete window.__garden
    }
    ctx.onCleanup(teardown)
  },
  unmount() {
    teardown?.()
    teardown = null
  },
}
