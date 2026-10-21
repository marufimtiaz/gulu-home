/*
 * House hub — the paper house at night. Every window is a room; finishing a room leaves its
 * window lit. Tap a window → the house zooms toward it (GSAP), then the router crossfades in.
 * Coming back from a room, the house starts zoomed on that window and pulls back out.
 */
import { gsap } from 'gsap'
import './scene.css'
import { DOOR, VIEW, WINDOWS, farSVG, houseSVG, skyArt, windowCenter } from './art.js'
import { nudge, poke, press } from '../../ui/feel.js'

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

    // idle guidance: the next window (or the nameplate) bounces after ~4 s of stillness
    const guide = nudge([])
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
    for (const el of root.querySelectorAll('.h-cat, .h-tank, .h-chimney, .g-shroom, .g-bush--l')) ctx.onCleanup(poke(el))

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
