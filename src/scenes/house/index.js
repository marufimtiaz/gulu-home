/*
 * House hub — the paper house at night. Every window is a room; finishing a room leaves its
 * window lit. Tap a window → the house zooms toward it (GSAP), then the router crossfades in.
 * Coming back from a room, the house starts zoomed on that window and pulls back out.
 */
import { gsap } from 'gsap'
import './scene.css'
import { DOOR, VIEW, WINDOWS, farSVG, houseSVG, skyArt, windowCenter } from './art.js'
import { haptic, nudge, press } from '../../ui/feel.js'
import { react } from '../../ui/react.js'
import { T } from '../../ui/choreo.js'

const ROOMS = ['living', 'kitchen', 'garden', 'rooftop', 'desk', 'empty']
const ZOOM = 2.6

let ctx = null
let tl = null
let settle = null // fallback when a guard bounces us straight back to the house

export default {
  id: 'house',

  mount(root, c) {
    ctx = c
    const { t, state } = ctx
    const labels = Object.fromEntries(ROOMS.map((r) => [r, t(`rooms.${r}`)]))
    const sky = skyArt()

    root.innerHTML = `
      <div class="house" aria-label="${t('house.label')}">
        <div class="house-sky" aria-hidden="true">
          <div class="sky-field" data-starfield></div>
          ${sky.dots}${sky.stars}
          ${sky.moon}
          ${sky.constellations}
        </div>
        <div class="house-frame">
          <div class="house-layer house-far">${farSVG()}</div>
          <div class="house-layer house-art" data-zoomed="false">
            ${houseSVG({ labels, plate: ctx.c('finale.plate'), est: ctx.c('finale.est'), letter: t('house.letter') })}
            <div class="house-tag hand" data-tag hidden><span></span></div>
          </div>
        </div>
        <div class="house-fireflies" aria-hidden="true"></div>
        <header class="house-head">
          <p class="house-caption hand" data-caption aria-live="polite"></p>
          <div class="house-bulbs" aria-hidden="true">${ROOMS.map(() => '<i></i>').join('')}</div>
          <p class="house-prompt hand" data-prompt hidden></p>
        </header>
      </div>`

    const house = root.querySelector('.house')
    const frame = root.querySelector('.house-frame')
    const art = root.querySelector('.house-art')
    const far = root.querySelector('.house-far')
    const skyEl = root.querySelector('.house-sky')
    const head = root.querySelector('.house-head')
    const tag = root.querySelector('[data-tag]')
    const plate = root.querySelector('[data-nameplate]')
    const letter = root.querySelector('[data-letterbox]')
    const caption = root.querySelector('[data-caption]')
    const prompt = root.querySelector('[data-prompt]')
    const bulbs = [...root.querySelectorAll('.house-bulbs i')]
    const wins = Object.fromEntries(ROOMS.map((r) => [r, root.querySelector(`[data-window="${r}"]`)]))
    plate.setAttribute('aria-label', t('house.plate'))
    if (ctx.reduced) house.dataset.reduced = ''

    // idle guidance, in the house's own language: someone inside draws the next window's
    // curtains aside for a moment; windows without curtains catch the light; the nameplate
    // swings on its pin. Going to the next room is the hub's main action → the arrow may join.
    const beckon = (el) => {
      const tl = gsap.timeline()
      if (el === plate) {
        tl.to(el, { rotation: 6, transformOrigin: '50% 0%', duration: 0.3, ease: 'sine.out' })
          .to(el, { rotation: -4, duration: 0.5, ease: 'sine.inOut' })
          .to(el, { rotation: 0, duration: 0.6, ease: 'sine.out' })
          .set(el, { transformOrigin: '50% 60%' }) // back to press()'s origin
        return tl
      }
      const curtains = el.querySelectorAll('.w-curtain')
      if (curtains.length === 2) {
        tl.to(curtains[0], { scaleX: 0.55, transformOrigin: '0% 0%', duration: 0.45, ease: 'power2.out' }, 0)
          .to(curtains[1], { scaleX: 0.55, transformOrigin: '100% 0%', duration: 0.45, ease: 'power2.out' }, 0.1)
          .to(curtains, { scaleX: 1, duration: 1, ease: 'elastic.out(1, 0.5)' }, 1.1)
      } else {
        el.classList.add('nudge--glint')
        tl.call(() => el.classList.remove('nudge--glint'), null, 0.9)
      }
      return tl
    }
    const guide = nudge([], { style: beckon, arrow: true })
    ctx.onCleanup(() => guide.stop())

    // ── state → art ──
    const paint = () => {
      const s = state.get()
      const done = ROOMS.filter((r) => s.done[r])
      const sugg = state.suggested()
      const emptyOpen = state.emptyUnlocked()
      for (const r of ROOMS) {
        let st = 'dark'
        if (s.done[r]) st = 'lit'
        else if (r === 'empty' && !emptyOpen) st = 'locked'
        else if (r === sugg) st = 'suggested'
        wins[r].dataset.state = st
      }
      root.dataset.done = [...done, ...(s.done.finale ? ['finale'] : [])].join(' ')
      caption.textContent = t('house.lights', { n: done.length, total: ROOMS.length })
      bulbs.forEach((b, i) => b.classList.toggle('on', i < done.length))

      const finaleOpen = state.finaleUnlocked()
      plate.style.display = finaleOpen ? '' : 'none'
      plate.dataset.hung = s.done.finale ? 'true' : 'false'
      letter.style.display = state.isDone('finale') ? '' : 'none'
      prompt.hidden = !finaleOpen
      prompt.textContent = s.done.finale ? t('house.home') : t('house.toFinale')

      // a little paper tag over whatever's next
      let at = null
      let text = ''
      if (sugg) {
        at = sugg
        text = t(`rooms.${sugg}`)
      } else if (finaleOpen && !s.done.finale) {
        at = 'door'
        text = t('house.plate')
      }
      tag.hidden = !at
      if (at) {
        const b = at === 'door' ? { ...DOOR, y: DOOR.y - 4 } : WINDOWS[at]
        const lift = at === 'kitchen' ? 24 : at === 'desk' || at === 'empty' ? 8 : at === 'rooftop' ? -2 : 6
        tag.style.left = `${((b.x + b.w / 2) / VIEW.w) * 100}%`
        tag.style.top = `${((b.y - lift - VIEW.y) / VIEW.h) * 100}%`
        tag.firstElementChild.textContent = text
      }
      guide.set(at === 'door' ? plate : at ? wins[at] : [])
    }
    paint()
    ctx.onCleanup(state.subscribe(paint))

    // ── zoom geometry: transforms with origin 0 0 that bring a viewBox point to screen centre ──
    const target = (id, scale, depth = 1) => {
      const a = frame.getBoundingClientRect()
      const r = root.getBoundingClientRect()
      const k = a.width / VIEW.w
      const p = windowCenter(id)
      const px = a.left + p.x * k
      const py = a.top + (p.y - VIEW.y) * k
      const cx = r.left + r.width / 2
      const cy = r.top + r.height * 0.5
      const s = 1 + (scale - 1) * depth
      return { scale: s, x: cx - a.left - s * (px - a.left), y: cy - a.top - s * (py - a.top) }
    }
    const zoomIn = (id) => {
      kill()
      art.dataset.zoomed = 'true'
      tl = gsap.timeline()
      tl.to(art, { ...target(id, ZOOM), duration: 0.6, ease: 'power2.in' }, 0)
        .to(far, { ...target(id, ZOOM, 0.4), duration: 0.6, ease: 'power2.in' }, 0)
        .to(skyEl, { scale: 1.08, duration: 0.6, ease: 'power2.in' }, 0)
        .to(head, { autoAlpha: 0, y: -12, duration: 0.3 }, 0)
        .to(tag, { autoAlpha: 0, duration: 0.2 }, 0)
      return tl.then()
    }

    const zoomOut = (id, scale, duration) => {
      kill()
      art.dataset.zoomed = 'true'
      gsap.set(art, target(id, scale))
      gsap.set(far, target(id, scale, 0.4))
      gsap.set(skyEl, { scale: 1 + (scale - 1) * 0.05 })
      gsap.set(head, { autoAlpha: 0 })
      tl = gsap.timeline({ delay: 0.12, onComplete: () => (art.dataset.zoomed = 'false') })
      tl.to([art, far], { x: 0, y: 0, scale: 1, duration, ease: 'power3.out' }, 0)
        .to(skyEl, { scale: 1, duration, ease: 'power3.out' }, 0)
        .to(head, { autoAlpha: 1, y: 0, duration: 0.5 }, duration * 0.6)
        .fromTo(tag, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, duration * 0.8)
    }

    if (!ctx.reduced) {
      const from = ctx.from
      if (from && WINDOWS[from]) {
        wins[from].classList.add('win--return')
        zoomOut(from, ZOOM, 0.9)
      } else if (from === 'finale') zoomOut('door', ZOOM, 1)
      else if (from === 'door') zoomOut('door', 1.4, 1.1)
    }

    // ── taps ──
    let busy = false
    const enter = (id) => {
      if (busy) return
      if (id === 'empty' && wins.empty.dataset.state === 'locked') {
        ctx.fx.toast(t('locked.empty'))
        if (!ctx.reduced) {
          const tape = wins.empty.querySelector('[data-tape]')
          gsap.fromTo(tape, { rotation: 0 }, { rotation: 2.5, duration: 0.07, yoyo: true, repeat: 5, transformOrigin: '50% 50%', ease: 'sine.inOut', clearProps: 'transform' })
        }
        return
      }
      busy = true
      guide.set([])
      if (id === 'card') ctx.sound.play('paper') // press() already gave the tap
      const room = id === 'door' ? 'finale' : id
      const node = id === 'door' ? plate : id === 'card' ? letter : wins[id]
      node.classList.add('win--entering')
      const go = () => {
        ctx.go(room)
        // if a guard bounced us straight back, settle the house again
        settle?.kill()
        settle = gsap.delayedCall(1.6, () => {
          if (!root.isConnected || root.classList.contains('scene--leaving')) return
          node.classList.remove('win--entering')
          busy = false
          paint()
          if (!ctx.reduced) zoomOut(id === 'card' ? 'door' : id, ZOOM, 0.6)
        })
      }
      if (ctx.reduced) go()
      else zoomIn(id === 'card' ? 'door' : id).then(go)
    }

    const pick = (e) => {
      const w = e.target.closest?.('[data-window], [data-nameplate], [data-letterbox]')
      if (!w) return null
      if (w.hasAttribute('data-letterbox')) return 'card'
      return w.dataset.window ?? 'door'
    }
    const onClick = (e) => {
      const id = pick(e)
      if (id) enter(id)
    }
    const onKey = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      const id = pick(e)
      if (!id) return
      e.preventDefault()
      enter(id)
    }
    const onFirst = () => ctx.sound.unlock()
    house.addEventListener('click', onClick)
    house.addEventListener('keydown', onKey)
    house.addEventListener('pointerdown', onFirst, { once: true })
    ctx.onCleanup(() => {
      house.removeEventListener('click', onClick)
      house.removeEventListener('keydown', onKey)
      house.removeEventListener('pointerdown', onFirst)
    })

    // ── feel: everything she can tap squashes under her finger; scenery answers back ──
    for (const el of [...Object.values(wins), plate, letter]) {
      gsap.set(el, { transformOrigin: '50% 60%' })
      ctx.onCleanup(press(el, { scale: 0.95 }))
    }
    scenery(root, art, skyEl)

    // ── ambient ──
    ctx.onCleanup(ctx.fx.starfield(root.querySelector('[data-starfield]'), { count: 50, shooting: false }))
    const count = ctx.raw().ambient?.fireflies ?? 7
    if (!ctx.reduced && count > 0) ctx.onCleanup(ctx.fx.fireflies(root.querySelector('.house-fireflies'), { count, gather: true }))
    if (ctx.raw().ambient?.music !== false) ctx.sound.theme('verse')

    if (ctx.params.has('debug')) window.__house = { enter, paint }
  },

  unmount() {
    kill()
    settle?.kill()
    settle = null
    if (ctx?.root) gsap.killTweensOf(ctx.root.querySelectorAll('.house-layer, .house-sky, .house-head, [data-tag], [data-tape], .win, [data-nameplate], [data-letterbox], .h-cat, .h-tank, .h-chimney, .g-shroom, .g-bush--l'))
    delete window.__house
    ctx = null
  },
}

function kill() {
  tl?.kill()
  tl = null
}

/*
 * The scenery answers like what it is (ui/react.js kinds), and most of it escalates to a payoff:
 *   cat        (puppet) looks at her → meows → slow-blinks a heart → gets annoyed → walks off
 *              behind the water tank, and comes back a little later
 *   chimney    knock: the cap hops and puffs a heart (three from the 3rd tap; kacchi every 4th)
 *   tank       ripple: sloshes; from the 3rd the lid hops and splashes; a remark every 5th
 *   moon       winks; then blushes; then smiles and a star shoots across
 *   door       knock-knock, and the voice from the door scene answers
 *   sconce     flicker + buzz
 *   fairy      flicker: a ring of light spreads from the bulb she tapped, a note each; every 5th
 *              tap the whole string chases ("practising for later", before the finale)
 *   shrooms    squish: a puff of glowing spores
 *   bush       flutter: every 3rd tap a firefly darts out
 *   tree       flutter: blossom petals drift down
 */
function scenery(root, art, skyEl) {
  const { t } = ctx
  const $ = (s) => root.querySelector(s)
  const $$ = (s) => [...root.querySelectorAll(s)]
  const d = (s) => (ctx.reduced ? 0.01 : s) // motion durations; holds stay real time
  const nth = (list, n) => list[Math.min(n, list.length) - 1]
  const live = new Set()
  const keep = (a) => (live.add(a), a)
  ctx.onCleanup(() => live.forEach((a) => a.kill()))
  const on = (el, fn) => {
    el.addEventListener('pointerdown', fn)
    ctx.onCleanup(() => el.removeEventListener('pointerdown', fn))
  }
  const add = (el, kind, opts) => ctx.onCleanup(react(el, kind, opts))
  const SVGNS = 'http://www.w3.org/2000/svg'
  const dot = (parent, cls, x, y, r) => {
    const c = document.createElementNS(SVGNS, 'circle')
    c.setAttribute('class', cls)
    c.setAttribute('cx', x)
    c.setAttribute('cy', y)
    c.setAttribute('r', r)
    parent.append(c)
    return c
  }

  // a handwritten remark at a viewBox point (it rides the house's zoom), kept on screen
  let sayTl = null
  function say(x, y, text) {
    if (!text) return
    sayTl?.progress(1).kill()
    const el = document.createElement('p')
    el.className = 'house-say hand'
    el.textContent = text
    el.style.left = `${(x / VIEW.w) * 100}%`
    el.style.top = `${((y - VIEW.y) / VIEW.h) * 100}%`
    art.append(el)
    const r = el.getBoundingClientRect()
    const shift = Math.max(0, 8 - r.left) + Math.min(0, innerWidth - 8 - r.right)
    sayTl = keep(
      gsap
        .timeline({ onComplete: () => el.remove(), onInterrupt: () => el.remove() })
        .fromTo(el, { x: shift, scale: 0.6, rotation: -8, autoAlpha: 0, y: 6 }, { scale: 1, rotation: -3, autoAlpha: 1, y: 0, duration: d(0.4), ease: 'back.out(2.4)' })
        .to(el, { autoAlpha: 0, y: -8, duration: d(0.3), ease: 'power1.in' }, `+=${Math.max(T.linger, text.length * 0.06)}`),
    )
  }

  // ── the cat: a paper puppet with a mind of its own ──
  const cat = $('[data-cat]')
  const walk = $('[data-cat-walk]')
  const head = $('[data-cat-head]')
  const eyes = $('[data-cat-eyes]')
  const eyeBits = [...eyes.children]
  const tail = $('[data-cat-tail]')
  cat.dataset.react = 'cat'
  gsap.set(eyeBits, { transformOrigin: '50% 50%' })
  gsap.set(head, { transformOrigin: '50% 100%' })
  gsap.set(tail, { transformOrigin: '0% 100%' })
  // ambient: the tail flicks now and then
  let flick = null
  if (!ctx.reduced) {
    flick = keep(gsap.timeline({ repeat: -1, repeatDelay: 3.8, delay: 1.5 }))
    flick.to(tail, { rotation: -16, duration: 0.45, ease: 'sine.inOut' }).to(tail, { rotation: 6, duration: 0.55, ease: 'sine.inOut' }).to(tail, { rotation: 0, duration: 0.5, ease: 'sine.inOut' })
  }
  const look = (tl) =>
    tl
      .to(head, { rotation: -9, duration: d(0.3), ease: 'power2.out' })
      .set(eyeBits, { scaleY: 0.1 }, '<')
      .to(eyes, { opacity: 1, duration: d(0.08) }, '<0.12')
      .to(eyeBits, { scaleY: 1, duration: d(0.18), ease: 'back.out(2)' })
  const blink = (tl, slow = false, at = '+=0.5') => tl.to(eyeBits, { scaleY: 0.12, duration: d(slow ? 0.35 : 0.07), yoyo: true, repeat: 1, ease: 'sine.inOut' }, at)
  const away = (tl, at = '+=0.8') =>
    tl
      .to(eyeBits, { scaleY: 0.1, duration: d(0.1) }, at)
      .to(eyes, { opacity: 0, duration: d(0.08) })
      .to(head, { rotation: 0, duration: d(0.45), ease: 'sine.inOut' })
  const lash = (tl, at) => {
    for (let k = 0; k < 3; k++) tl.to(tail, { rotation: k % 2 ? 8 : -24, duration: d(0.13), ease: 'sine.inOut' }, k ? '>' : at)
    return tl.to(tail, { rotation: 0, duration: d(0.3) })
  }
  const stroll = (tl, dx, dur) => {
    tl.to(walk, { x: `+=${dx}`, duration: d(dur), ease: dx > 0 ? 'power1.in' : 'power1.out' })
    tl.to(walk, { y: '-=1.6', duration: d(0.16), yoyo: true, repeat: Math.round(dur / 0.16) | 1, ease: 'sine.inOut' }, '<')
    return tl
  }
  let catN = 0
  let gone = false
  let catTl = null
  on(cat, () => {
    if (gone) return
    catN++
    haptic(4)
    flick?.pause()
    catTl?.kill()
    const tl = (catTl = keep(gsap.timeline({ onComplete: () => flick?.restart(true) })))
    look(tl)
    if (catN === 1) {
      ctx.sound.play('tap')
      blink(tl, false, '+=0.7')
      away(tl, '+=0.9')
    } else if (catN === 2) {
      tl.call(() => ctx.sound.play('meow'), null, '<')
      tl.to(tail, { rotation: -20, duration: d(0.25), yoyo: true, repeat: 1, ease: 'sine.inOut' }, '<')
      away(tl, '+=1.1')
    } else if (catN === 3) {
      // the slow blink: cat for "I like you"
      blink(tl, true, '+=0.4')
      tl.call(() => {
        const r = head.getBoundingClientRect()
        ctx.fx.hearts(r.left + r.width / 2, r.top, { count: 1 })
      }, null, '<0.3')
      away(tl, '+=1')
    } else if (catN === 4) {
      // enough now: the eyes narrow, the tail lashes
      tl.call(() => ctx.sound.play('meow'), null, '<')
      tl.to(eyeBits, { scaleY: 0.4, duration: d(0.15) })
      lash(tl, '<')
      away(tl, '+=0.6')
    } else {
      // …so he leaves. Off along the terrace, behind the water tank. He'll be back.
      gone = true
      catN = 0
      tl.call(() => ctx.sound.play('meow'), null, '<')
      tl.to(eyeBits, { scaleY: 0.35, duration: d(0.12) })
      away(tl, '+=0.25')
      tl.to(tail, { rotation: -38, duration: d(0.3), ease: 'power2.out' })
      stroll(tl, 62, 2)
      tl.to(walk, { opacity: 0, duration: d(0.3) }, '>-0.35')
      tl.call(() => say(200, 212, t('house.catAway')), null, '<-1.2')
      // later: back from behind the tank, sits, tail down, one slow blink — forgiven
      tl.to(walk, { opacity: 1, duration: d(0.3) }, '+=8')
      stroll(tl, -62, 2.2)
      tl.to(tail, { rotation: 0, duration: d(0.5), ease: 'sine.inOut' })
      look(tl)
      blink(tl, true, '+=0.3')
      tl.call(() => say(144, 222, t('house.catBack')), null, '<')
      away(tl, '+=0.9')
      tl.call(() => (gone = false))
    }
  })

  // ── chimney: brick (knock); the cap hops and puffs a heart ──
  const chimney = $('.h-chimney')
  const cap = $('[data-cap]')
  add(chimney, 'knock', {
    sound: 'pop',
    steps: [
      (n) => {
        if (!ctx.reduced) keep(gsap.timeline().to(cap, { y: -5, duration: 0.1, ease: 'power2.out' }).to(cap, { y: 0, duration: 0.5, ease: 'bounce.out' }))
        const r = cap.getBoundingClientRect()
        ctx.fx.hearts(r.left + r.width / 2, r.top, { count: n >= 3 ? 3 : 1 })
        if (n % 4 === 0) say(253, 204, t('house.chimney'))
      },
    ],
  })

  // ── water tank: sloshes; then the lid hops and a splash jumps out ──
  const tank = $('[data-tank]')
  const lid = $('[data-tank-lid]')
  const splash = () => {
    ctx.sound.play('drip')
    if (ctx.reduced) return
    keep(gsap.timeline().to(lid, { y: -6, rotation: -8, transformOrigin: '50% 100%', duration: 0.12, ease: 'power2.out' }).to(lid, { y: 0, rotation: 0, duration: 0.5, ease: 'bounce.out' }))
    for (let k = 0; k < 4; k++) {
      const c = dot(tank, 'h-drop', 190 + k * 4, 222, 1.6)
      const side = k < 2 ? -1 : 1
      keep(gsap.timeline({ onComplete: () => c.remove() }).to(c, { x: side * (6 + k * 3), y: -12 - (k % 2) * 5, duration: 0.25, ease: 'power2.out' }).to(c, { y: 26, opacity: 0, duration: 0.45, ease: 'power2.in' }))
    }
  }
  add(tank, 'ripple', {
    target: $('[data-tank-body]'),
    origin: '50% 100%',
    steps: [() => {}, () => {}, (n) => (splash(), n % 5 === 0 && say(196, 214, t('house.tank')))],
  })

  // ── the moon: winks; blushes; smiles while a star shoots past ──
  const moon = $('.sky-moon')
  const face = $('[data-moon-face]')
  const eyeL = $('.moon-eye[data-eye="l"]')
  const eyeR = $('.moon-eye[data-eye="r"]')
  const blush = $$('.moon-blush')
  const happy = $('.moon-happy')
  gsap.set([eyeL, eyeR], { transformOrigin: '50% 50%' })
  moon.dataset.react = 'wink'
  let moonN = 0
  let moonTl = null
  const shoot = () => {
    if (ctx.reduced) return
    const r = moon.getBoundingClientRect()
    const s = document.createElement('i')
    s.className = 'house-shoot'
    s.style.left = `${r.left - 40}px`
    s.style.top = `${r.top + r.height * 0.7}px`
    skyEl.append(s)
    ctx.sound.play('sparkle')
    keep(gsap.timeline({ onComplete: () => s.remove(), onInterrupt: () => s.remove() }).set(s, { rotation: 158 }).to(s, { x: -240, y: 95, duration: 0.9, ease: 'power1.in' }).to(s, { opacity: 1, duration: 0.2, ease: 'none' }, 0).to(s, { opacity: 0, duration: 0.3 }, 0.6))
  }
  on(moon, () => {
    moonN++
    haptic(4)
    ctx.sound.play('ting', { i: moonN + 2 })
    const k = ((moonN - 1) % 3) + 1
    moonTl?.kill()
    const tl = (moonTl = keep(gsap.timeline()))
    tl.set([eyeL, eyeR], { scaleY: 1, opacity: 1 }).set(happy, { opacity: 0 }).set(blush, { opacity: 0 })
    tl.to(face, { opacity: 1, duration: d(0.25) })
    if (k === 1) {
      tl.to(eyeR, { scaleY: 0.12, duration: d(0.1) }, '+=0.3').to(eyeR, { scaleY: 1, duration: d(0.15) }, '+=0.4')
    } else if (k === 2) {
      tl.to(blush, { opacity: 0.75, duration: d(0.3) }, '<')
      tl.to(eyeL, { scaleY: 0.12, duration: d(0.1) }, '+=0.3').to(eyeL, { scaleY: 1, duration: d(0.15) }, '+=0.4')
    } else {
      tl.to([eyeL, eyeR], { opacity: 0, duration: d(0.1) }, '+=0.15').to(happy, { opacity: 1, duration: d(0.1) }, '<')
      tl.to(blush, { opacity: 0.75, duration: d(0.3) }, '<')
      tl.call(shoot, null, '<')
      tl.to({}, { duration: 0.6 })
    }
    tl.to(face, { opacity: 0, duration: d(0.5) }, '+=0.8')
  })

  // ── the front door: knock knock (the door scene's voice answers) ──
  let knockCall = null
  ctx.onCleanup(() => knockCall?.kill())
  add($('[data-door-knock]'), 'knock', {
    strength: 0.8,
    steps: [
      (n) => {
        knockCall?.kill()
        knockCall = gsap.delayedCall(0.17, () => ctx.sound.play('knock'))
        say(150, 486, nth(t('house.knock'), n))
      },
    ],
  })

  // ── the porch light: buzzes and flickers ──
  add($('[data-sconce]'), 'flicker', { target: $('[data-porch-bulb]') })

  // ── fairy lights: a ring of light spreads out from the bulb she touched ──
  const bulbs = $$('[data-fairy]').map((el) => ({ el, x: +el.getAttribute('cx'), y: +el.getAttribute('cy'), r: +el.getAttribute('r') }))
  const ripple = (x0, y0) => {
    if (ctx.reduced) return
    for (const b of bulbs) {
      const dist = Math.hypot(b.x - x0, b.y - y0)
      if (dist > 160) continue
      keep(gsap.fromTo(b.el, { attr: { r: b.r } }, { attr: { r: b.r * 1.9 }, duration: 0.14, delay: dist / 260, yoyo: true, repeat: 1, ease: 'sine.out' }))
    }
  }
  const chase = () => {
    if (ctx.reduced) return
    bulbs.forEach((b, i) => keep(gsap.fromTo(b.el, { attr: { r: b.r } }, { attr: { r: b.r * 1.8 }, duration: 0.12, delay: (i % 40) * 0.03, yoyo: true, repeat: 3, ease: 'sine.inOut' })))
  }
  add($('[data-fairy-hit]'), 'flicker', {
    target: $('.h-fairy-bulbs'),
    sound: null,
    steps: [
      (n, e) => {
        ctx.sound.play('xylo', { i: (n - 1) % 8 })
        const c = e.target.closest?.('circle')
        if (c) ripple(+c.getAttribute('cx'), +c.getAttribute('cy'))
        if (n % 5 === 0 && !ctx.state.isDone('finale')) {
          chase()
          say(150, 214, t('house.fairy'))
        }
      },
    ],
  })

  // ── the garden: toadstools puff spores; the bush hides a firefly; the tree drops blossom ──
  const garden = $('.h-garden')
  const spores = () => {
    if (ctx.reduced) return
    for (let k = 0; k < 7; k++) {
      const x = k < 4 ? 298 : 370
      const c = dot(garden, 'h-spore', x + (Math.random() - 0.5) * 8, 546, 0.9 + Math.random() * 0.6)
      keep(gsap.timeline({ onComplete: () => c.remove() }).to(c, { x: (Math.random() - 0.5) * 22, y: -18 - Math.random() * 22, duration: 1.4 + Math.random() * 0.6, ease: 'sine.out' }).to(c, { opacity: 0, duration: 0.5 }, '-=0.5'))
    }
  }
  add($('.g-shroom'), 'squish', { sound: 'spores', steps: [() => spores()] })

  const firefly = () => {
    if (ctx.reduced) return
    const c = dot(root.querySelector('.house-art svg'), 'h-firefly', 4, 540, 2.2)
    const p = { u: 0 }
    keep(
      gsap.to(p, {
        u: 1,
        duration: 3.2,
        ease: 'sine.out',
        onUpdate() {
          const u = p.u
          c.setAttribute('cx', (4 + u * 60 + Math.sin(u * 9) * 14).toFixed(1))
          c.setAttribute('cy', (540 - u * 130 + Math.cos(u * 7) * 8).toFixed(1))
          c.setAttribute('opacity', Math.min(1, u * 8, (1 - u) * 3).toFixed(2))
        },
        onComplete: () => c.remove(),
      }),
    )
  }
  add($('.g-bush--l'), 'flutter', { origin: '50% 100%', strength: 1.2, steps: [(n) => n % 3 === 0 && firefly()] })

  const blossom = $$('.g-blossom circle')
  const petals = () => {
    if (ctx.reduced) return
    for (let k = 0; k < 2; k++) {
      const b = blossom[Math.floor(Math.random() * blossom.length)]
      const c = dot(garden, 'h-petal', b.getAttribute('cx'), b.getAttribute('cy'), 1.8)
      const side = Math.random() < 0.5 ? -1 : 1
      keep(gsap.timeline({ onComplete: () => c.remove() }).to(c, { x: side * (8 + Math.random() * 10), y: 556 - +b.getAttribute('cy'), duration: 1.6 + Math.random() * 0.6, ease: 'sine.in' }).to(c, { opacity: 0, duration: 0.4 }))
    }
  }
  add($('[data-tree]'), 'flutter', { origin: '50% 100%', strength: 0.6, steps: [() => petals()] })
}
