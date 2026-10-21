/*
 * Finale — the nameplate. The hub's own house (same facade, unit for unit), every window lit,
 * the camera on its front door. A blank nameplate leans on the doormat; she
 * drags it up onto the hook, it swings and settles, and our names engrave in. A HELLO-my-name-is
 * slip pops out of the letterbox ("Bou"); she sticks it on the plate. Then one crescendo, one
 * timeline: the camera pulls back, every window flares, the fairy lights chase outward from the
 * door, the chimney puffs hearts, fireworks go up behind the roof while the music swells into the
 * chorus, and the "welcome home." card lands. Two beats later an ivory envelope slides halfway
 * out of the letterbox — tap → the reception card.
 *
 * Test hooks: [data-plate] [data-hook] [data-names] [data-slip] [data-sticker] [data-card]
 * [data-home] [data-letterbox]; window.__finale = { hang(), stick() } under ?debug.
 */
import './scene.css'
import { gsap } from 'gsap'
import { hit, onDrag } from '../../ui/drag.js'
import { EASE, T, beat, moment } from '../../ui/choreo.js'
import { haptic, nudge, press, wobble } from '../../ui/feel.js'
import { react } from '../../ui/react.js'
import { HOOK, PLATE, SLOT, U, VIEW, cu, finaleSVG, plateSVG, stickerSVG } from './art.js'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])

// all positions in canvas units (hub units × U, see art.js)
const MAT = cu(150, 547) // plate apex while it leans on the doormat
const REST = cu(150, 572) // sticker centre where it lands on the mat
const STUCK = { ...cu(178, 518), scale: 0.36, rotation: 9 } // stuck on the plate's lower-right corner, clear of the names
const SLIP = { w: 140, h: 110 } // the sticker's box (px in the art box)
const TOP = 58 // room for the corner chips
const REDUCED = 6 // reduced motion: the finale's long moments play at 6× (choreo's default is 4×)
const MIN_DOOR = 1.25 // px per hub unit while she's hanging things: the plate stays a fair target
// the windows flare one by one, in the order she actually lit them (state.litOrder())
const STEP = 0.22 // between flares

let teardown = null

export default {
  id: 'finale',

  mount(root, ctx) {
    const { t, c, sound, fx } = ctx
    const cleanups = []
    const add = (fn) => typeof fn === 'function' && cleanups.push(fn)
    const music = ctx.raw().ambient?.music !== false

    root.innerHTML = `
      <div class="fin" data-phase="door" role="group" aria-label="${esc(t('finale.scene'))}">
        <div class="fin-stars" aria-hidden="true"></div>
        <div class="fin-fw" aria-hidden="true"></div>
        <div class="fin-art">
          ${finaleSVG()}
          <div class="fin-hook" data-hook aria-hidden="true"></div>
          <div class="fin-plate" data-plate role="button" tabindex="0" aria-label="${esc(t('finale.plate'))}">
            ${plateSVG(esc(c('finale.plate')), esc(c('finale.est')))}
          </div>
          <div class="fin-slip" data-slip>
            <div class="fin-sticker" data-sticker role="button" tabindex="-1" aria-label="${esc(t('finale.sticker'))}">
              ${stickerSVG({ hello: esc(t('finale.hello')), myNameIs: esc(t('finale.myNameIs')), name: esc(c('finale.sticker')) })}
            </div>
          </div>
        </div>
        <p class="fin-prompt hand" data-prompt aria-live="polite"></p>
        <section class="fin-card" data-card aria-live="polite">
          <h2 class="fin-card__title display">${esc(c('finale.title'))}</h2>
          <p class="fin-card__plate" data-card-names>
            <span class="fin-card__names display">${esc(c('finale.plate'))}</span>
            <span class="fin-card__est">${esc(c('finale.est'))}</span>
          </p>
          <p class="fin-card__line">${esc(c('finale.line'))}</p>
          <p class="fin-card__after hand">${esc(c('finale.after'))}</p>
          <button class="btn btn--berry fin-card__home" type="button" data-home>${esc(t('finale.home'))}</button>
        </section>
        <button class="fin-mail" type="button" data-letterbox aria-label="${esc(t('finale.mailLabel'))}">
          <span class="fin-mail__hit"></span><span class="fin-mail__tag hand">${esc(t('finale.mail'))}</span>
        </button>
      </div>`

    const $ = (s) => root.querySelector(s)
    const $$ = (s) => [...root.querySelectorAll(s)]
    const fin = $('.fin')
    const art = $('.fin-art')
    const fw = $('.fin-fw')
    const plate = $('[data-plate]')
    const hookEl = $('[data-hook]')
    const slip = $('[data-slip]')
    const sticker = $('[data-sticker]')
    const prompt = $('[data-prompt]')
    const card = $('[data-card]')
    const homeBtn = $('[data-home]')
    const mailBtn = $('[data-letterbox]')
    const mailEnv = $('[data-mail]')
    const mailHalo = $('[data-mail-halo]')
    const flap = $('[data-flap]')
    const cap = $('[data-cap]')
    const chimney = $('[data-chimney]')
    const aura = $('[data-aura]')
    const lampGlow = $('[data-lamp-glow]')
    const engrave = $('[data-engrave]')
    const engraved = $$('[data-names] text')
    const twineSlack = $('[data-twine-slack]')
    const twineTaut = $('[data-twine]')
    const bulbs = $$('[data-fairy]')
    const bulbBox = $('.fairy-bulbs')
    const flare = ctx.state.litOrder().map((id) => [$(`[data-win="${id}"]`)].filter(Boolean))
    const wins = flare.flat()
    const cardBits = [...card.children]

    prompt.textContent = t('finale.hang') // laid out (hidden) so the camera can leave room for it
    // the art box is in canvas units; the hook target and the slip are placed from art.js's numbers
    art.style.width = `${VIEW.w}px`
    art.style.height = `${VIEW.h}px`
    Object.assign(hookEl.style, { left: `${HOOK.x - 34}px`, top: `${HOOK.y - VIEW.y - 6}px`, width: '68px', height: '68px' })
    Object.assign(slip.style, { left: `${REST.x - SLIP.w / 2}px`, top: `${REST.y - VIEW.y - SLIP.h / 2}px`, width: `${SLIP.w}px`, height: `${SLIP.h}px` })

    // long names squeeze to fit the plate instead of spilling off it
    const fitText = (el, max) => {
      try {
        if (el.getComputedTextLength() > max) {
          el.setAttribute('textLength', String(max))
          el.setAttribute('lengthAdjust', 'spacingAndGlyphs')
        }
      } catch {
        /* not laid out */
      }
    }
    fitText(engraved[0], 128)
    fitText(engraved[1], 128)

    // ── the camera: fit a focus band of the canvas into the free part of the screen ──
    // phase 'door': she's hanging things — the whole lit house edge to edge with clean margins
    // (the fairy-light drops whole), door on the centre line, down to the mat.
    // 'close': from the plate snapping onto its hook until the sticker is on it — the camera
    // leans in on the door and the mat, so the names read and the sticker is a fair target.
    // 'party': the crescendo — house + garden fill the width, sat low on a thin strip of lawn,
    // the whole sky above them free for the fireworks.
    // 'home': the card has landed — the same wide framing lifted above the card (portrait) or
    // beside it (landscape), with a strip of lawn under the door for the "one more thing" tag.
    let phase = 'door'
    let frame = { s: 1, x: 0, y: 0 }

    const BANDS = {
      door: { x0: 8, x1: 292, y0: 194, y1: 592 },
      party: { x0: 4, x1: 424, y0: 196, y1: 598 },
      home: { x0: 4, x1: 424, y0: 196, y1: 620 },
      close: { x0: 100, x1: 200, y0: 478, y1: 598 }, // plate + twine, letterbox, mat, the slip on it
    }
    const frameFor = (ph) => {
      const W = fin.clientWidth
      const H = fin.clientHeight
      const side = W / H >= 1.15
      if (side && ph === 'party') ph = 'home' // the card goes beside the house: one framing for both
      const close = ph === 'close'
      if (close) ph = 'door' // same free region as the door framing, a tighter band
      let region
      let low = false // sit the band on the region's floor instead of centring it
      if (side) {
        const panel = Math.round(Math.min(480, Math.max(300, W * 0.4)))
        const short = H < 560
        const y = ph === 'home' ? Math.max(short ? 36 : TOP, H * 0.16) : short ? 4 : TOP * 0.6
        region = { x: 8, y, w: W - panel - 16, h: H - y - (short ? 4 : 8), panel }
        low = ph === 'home'
      } else if (ph === 'home') {
        // the letterbox (and its tag) must stay clear above the card: the envelope comes out of it
        region = { x: 0, y: TOP, w: W, h: H - TOP - card.offsetHeight - 26 }
        low = true
      } else if (ph === 'party') {
        region = { x: 0, y: TOP, w: W, h: H - TOP - Math.max(48, prompt.offsetHeight) - 22 }
        low = true
      } else {
        region = { x: 0, y: TOP, w: W, h: H - TOP - Math.max(48, prompt.offsetHeight) - 26 }
      }
      const b = BANDS[close ? 'close' : ph]
      let k = Math.min(region.w / (b.x1 - b.x0), region.h / (b.y1 - b.y0)) // px per hub unit
      k = Math.max(k, ph === 'door' ? MIN_DOOR : 0.5)
      // close: lean in until the names read at ≥ 16 px (they're ~5.9 hub units), but no closer
      // than the band allows — the mat and the slip on it stay on screen above the prompt
      if (close) k = Math.min(k, Math.max(3.1, 1.45 * frameFor('door').s * U))
      // centre the band (or sit it low); if it can't fit, keep its bottom (door, mat) on screen
      const bandH = (b.y1 - b.y0) * k
      const top = bandH <= region.h && !low ? region.y + (region.h - bandH) / 2 : region.y + region.h - bandH
      const s = k / U
      return {
        s,
        x: region.x + region.w / 2 - ((b.x0 + b.x1) / 2) * U * s,
        y: top - (b.y0 * U - VIEW.y) * s,
        side,
        panel: region.panel ?? 0,
      }
    }

    const toScreen = (f, cx, cy) => ({ x: f.x + cx * f.s, y: f.y + (cy - VIEW.y) * f.s })

    // the envelope's tap target is centred on the envelope; its tag sits on the strip of lawn
    // below the step, to the right of the stepping stones — under the kitchen window, short of
    // the garden fence, never on anything (the camera's 'home' band leaves that strip free)
    function placeMail(f = frame) {
      const p = toScreen(f, SLOT.x, SLOT.y - 15 * U)
      const tag = toScreen(f, 172 * U, 566 * U)
      const x = Math.round(p.x - 28)
      const y = Math.round(p.y - 28)
      mailBtn.style.left = `${x}px`
      mailBtn.style.top = `${y}px`
      mailBtn.style.setProperty('--tag-x', `${Math.round(tag.x - x)}px`)
      mailBtn.style.setProperty('--tag-y', `${Math.round(tag.y - y)}px`)
    }

    function layout() {
      const f = frameFor(phase)
      if (f.side) fin.dataset.side = ''
      else delete fin.dataset.side
      fin.style.setProperty('--panel', `${f.panel}px`)
      // re-measure: the side switch moves the card/prompt, which changes the frame
      const g = frameFor(phase)
      frame = g
      gsap.killTweensOf(art, 'x,y,scale') // a camera move in flight jumps to where it was going
      gsap.set(art, { x: g.x, y: g.y, scale: g.s })
      // the fireworks fill the sky above the roof as the crescendo frames it
      const party = frameFor('party')
      fw.style.height = `${Math.max(120, Math.round(toScreen(party, 0, cu(0, 214).y).y))}px`
      placeMail(g)
    }
    gsap.set(art, { transformOrigin: '0 0' })
    layout()
    let resizeRaf = 0
    const onResize = () => {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        cancelDrag()
        layout()
      })
    }
    window.addEventListener('resize', onResize)
    add(() => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(resizeRaf)
    })

    // ── words ──
    const setPrompt = (text) => {
      prompt.textContent = text
      gsap.fromTo(prompt, { autoAlpha: 0, scale: 0.85, rotation: -5 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: T.quick * 1.6, ease: EASE.spring, overwrite: 'auto' })
    }

    // ── stage machine: plate → hanging → sticker → celebrate ──
    let stage = 'plate'
    let tl = null // the current choreographed moment
    let chase = null // the looping fairy chase after the crescendo
    let show = null // the fireworks (a promise with .stop()) — stopped on unmount

    // plate on the mat
    const placePlate = (apex) => {
      plate.style.left = `${apex.x - PLATE.ax}px`
      plate.style.top = `${apex.y - VIEW.y - PLATE.ay}px`
    }
    placePlate(MAT)
    let wobblePlate = wobble(plate, { deg: 2.5 })
    let wobbleSticker = () => {}
    add(() => wobblePlate())
    add(() => wobbleSticker())
    // press feedback while they're draggable; dropped once they're up (it would fight the snap)
    let unpressPlate = press(plate, { sound: 'tap', scale: 0.95 })
    let unpressSticker = press(sticker, { sound: 'tap', scale: 0.95 })
    add(() => unpressPlate())
    add(() => unpressSticker())
    add(press(homeBtn))
    add(press(mailBtn, { sound: 'paper' }))

    // idle guidance, each in its own language (and each is its phase's main action → arrow):
    // the plate leans up toward its hook while the hook catches the light; the sticker's corner
    // curls up ("peel me"); the envelope rattles in the letterbox and the flap clacks.
    let held = null // { el, x0, y0 } — the thing under her finger
    const coax = (el) => {
      const tl = gsap.timeline()
      if (held) return tl // never tug at something she's carrying
      if (el === plate) {
        tl.call(() => fin.classList.add('is-carrying'))
          .to(plate, { y: -18, duration: 0.35, ease: 'power2.out' })
          .to(plate, { y: 0, duration: 0.9, ease: EASE.wobble })
          .call(() => stage === 'plate' && !held && fin.classList.remove('is-carrying'))
      } else if (el === sticker) {
        const curl = sticker.querySelector('.sticker__curl')
        tl.to(curl, { scale: 2.4, transformOrigin: '100% 100%', duration: 0.3, ease: 'power2.out' }).to(curl, { scale: 1, duration: 0.8, ease: EASE.wobble })
      } else if (el === mailBtn) {
        tl.to(mailEnv, { keyframes: { rotation: [3, -3, 2, -1.5, 0] }, transformOrigin: '50% 100%', duration: 0.45, ease: 'none' })
        tl.to(flap, { scaleY: -0.6, duration: 0.08, yoyo: true, repeat: 3, ease: 'power1.out' }, 0)
      }
      return tl
    }
    const guide = nudge(plate, { style: coax, arrow: true })
    add(() => guide.stop())

    // ── dragging ──
    const s = () => frame.s
    const apexNow = () => ({ x: MAT.x + gsap.getProperty(plate, 'x'), y: MAT.y + gsap.getProperty(plate, 'y') })
    const nearHook = (p) => {
      if (hit(hookEl, p.x, p.y, 30)) return true
      const a = apexNow()
      return Math.hypot(a.x - HOOK.x, a.y - HOOK.y) < 16 * U
    }

    function cancelDrag() {
      if (!held) return
      const el = held.el
      held = null
      fin.classList.remove('is-carrying', 'is-near')
      el.classList.remove('is-held')
      springBack(el)
    }
    function springBack(el) {
      ctx.sound.play('whoosh')
      gsap.to(el, { x: 0, y: 0, duration: T.move * 1.6, ease: EASE.wobble, overwrite: 'auto' })
    }
    // a tap without a drag teaches the drag: the plate is tugged up on its twine toward the
    // hook (which lights up) and swings back down; the sticker peels up off the mat and settles
    let hop = null
    function hint(el) {
      hop?.kill()
      hop = gsap.timeline()
      if (el === plate) {
        fin.classList.add('is-carrying')
        hop.to(el, { y: -40, duration: T.quick, ease: EASE.out })
        hop.to(el, { y: 0, duration: T.move * 1.8, ease: EASE.wobble })
        hop.call(() => stage === 'plate' && !held && fin.classList.remove('is-carrying'), null, `-=${T.move}`)
      } else {
        const curl = el.querySelector('.sticker__curl')
        hop.to(curl, { scale: 2.4, transformOrigin: '100% 100%', duration: T.tap, ease: EASE.out }, 0)
        hop.to(el, { y: -34, duration: T.quick, ease: EASE.out }, 0)
        hop.to(el, { y: 0, duration: T.move * 1.4, ease: EASE.spring })
        hop.to(curl, { scale: 1, duration: T.move, ease: EASE.wobble }, '<')
      }
    }
    add(() => hop?.kill())

    add(
      onDrag(plate, {
        onStart(p) {
          if (stage !== 'plate') return false
          gsap.killTweensOf(plate, 'x,y')
          held = { el: plate, x0: gsap.getProperty(plate, 'x'), y0: gsap.getProperty(plate, 'y'), moved: false }
          plate.classList.add('is-held')
          fin.classList.add('is-carrying')
          ctx.sound.unlock()
        },
        onMove(p) {
          if (held?.el !== plate) return
          if (Math.hypot(p.dx, p.dy) > 6) held.moved = true
          gsap.set(plate, { x: held.x0 + p.dx / s(), y: held.y0 + p.dy / s() })
          fin.classList.toggle('is-near', nearHook(p))
        },
        onEnd(p) {
          if (held?.el !== plate) return
          const moved = held.moved
          held = null
          plate.classList.remove('is-held')
          fin.classList.remove('is-near')
          if (nearHook(p)) return hang()
          fin.classList.remove('is-carrying')
          if (moved) springBack(plate)
          else hint(plate)
        },
      }),
    )

    const stickerHome = () => ({ x: REST.x + gsap.getProperty(sticker, 'x'), y: REST.y + gsap.getProperty(sticker, 'y') })
    const overPlate = (p) => {
      if (hit(plate, p.x, p.y, 16)) return true
      const h = stickerHome()
      return Math.hypot(h.x - STUCK.x, h.y - STUCK.y) < 24 * U
    }
    add(
      onDrag(sticker, {
        onStart() {
          if (stage !== 'sticker') return false
          gsap.killTweensOf(sticker, 'x,y')
          held = { el: sticker, x0: gsap.getProperty(sticker, 'x'), y0: gsap.getProperty(sticker, 'y'), moved: false }
          sticker.classList.add('is-held')
        },
        onMove(p) {
          if (held?.el !== sticker) return
          if (Math.hypot(p.dx, p.dy) > 6) held.moved = true
          gsap.set(sticker, { x: held.x0 + p.dx / s(), y: held.y0 + p.dy / s() })
          plate.classList.toggle('nudge', overPlate(p))
        },
        onEnd(p) {
          if (held?.el !== sticker) return
          const moved = held.moved
          held = null
          sticker.classList.remove('is-held')
          plate.classList.remove('nudge')
          if (overPlate(p)) return stick()
          if (moved) springBack(sticker)
          else hint(sticker)
        },
      }),
    )

    const onKey = (fn) => (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      fn()
    }
    const plateKey = onKey(() => stage === 'plate' && hang())
    const stickerKey = onKey(() => stage === 'sticker' && stick())
    plate.addEventListener('keydown', plateKey)
    sticker.addEventListener('keydown', stickerKey)
    add(() => {
      plate.removeEventListener('keydown', plateKey)
      sticker.removeEventListener('keydown', stickerKey)
    })

    const center = (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }

    // ── moment 1: the plate goes up, swings, settles; the names engrave; the post arrives ──
    function hang() {
      if (stage !== 'plate') return
      stage = 'hanging'
      guide.set([])
      wobblePlate()
      wobblePlate = () => {}
      unpressPlate()
      unpressPlate = () => {}
      // rebase the plate onto the hook, keeping it where it visually is right now
      const a = apexNow()
      placePlate(HOOK)
      gsap.killTweensOf(plate)
      gsap.set(plate, { x: a.x - HOOK.x, y: a.y - HOOK.y, rotation: 0, scale: 1 })
      plate.classList.add('plate--hung')
      plate.setAttribute('tabindex', '-1')
      fin.classList.add('is-hung')
      fin.classList.remove('is-carrying', 'is-near')

      tl?.kill()
      tl = moment()
      if (ctx.reduced) tl.timeScale(REDUCED) // same timeline, just quicker (it's the longest one)
      // up onto the hook
      tl.to(plate, { x: 0, y: 0, duration: T.quick, ease: EASE.out })
      tl.to(prompt, { autoAlpha: 0, duration: T.quick }, '<')
      beat(tl, 'hang', '>')
      tl.call(() => haptic(14), null, '<')
      // it swings on the twine and settles
      tl.addLabel('swing', '<')
      tl.to(twineSlack, { opacity: 0, duration: T.tap }, 'swing')
      tl.to(twineTaut, { opacity: 1, duration: T.tap }, 'swing')
      tl.fromTo(plate, { rotation: -11 }, { rotation: 0, duration: T.moment, ease: EASE.wobble }, 'swing')
      // the camera leans in to watch the names engrave, left to right, as the swing settles —
      // and stays there (the slip lands on the mat in frame) until the sticker is on the plate
      const close = () => frameFor('close')
      tl.call(() => (phase = 'close'), null, 'swing+=0.15')
      tl.to(art, { x: () => close().x, y: () => close().y, scale: () => close().s, duration: T.moment, ease: EASE.inOut }, 'swing+=0.15')
      tl.call(() => (frame = close()), null, '>') // drags divide by the camera's scale
      tl.addLabel('engrave', 'swing+=0.7')
      tl.to(engrave, { attr: { width: 160 }, duration: T.moment, ease: 'power1.inOut' }, 'engrave')
      tl.to(engraved, { strokeDashoffset: 0, duration: T.moment, ease: 'none' }, 'engrave')
      for (let i = 0; i < 6; i++) beat(tl, 'scratch', `engrave+=${(i * T.moment) / 6}`)
      tl.to(engraved, { fillOpacity: 1, duration: T.quick }, '>')
      tl.call(() => {
        const p = center(plate)
        fx.sparkles(p.x, p.y, { count: 12 })
      }, null, '<')
      beat(tl, 'sparkle', '<')
      // the letterbox flap lifts and a slip pops out onto the mat
      tl.addLabel('post', `+=${T.reveal + 0.3}`)
      beat(tl, 'paper', 'post')
      tl.to(flap, { scaleY: -1.4, duration: T.tap, ease: EASE.out }, 'post')
      tl.set(slip, { visibility: 'visible' }, 'post')
      tl.fromTo(
        slip,
        { x: SLOT.x - REST.x, y: SLOT.y - REST.y + 8, scaleX: 0.6, scaleY: 0.1, rotation: 0 },
        { y: SLOT.y - REST.y - 40, scaleX: 1, scaleY: 1, rotation: -10, duration: T.move * 0.8, ease: 'power2.out' },
        'post+=0.05',
      )
      tl.to(flap, { scaleY: 1, duration: T.quick, ease: EASE.land }, '<0.1')
      tl.to(slip, { x: 0, y: 0, rotation: 0, duration: T.move * 1.3, ease: EASE.land }, '>')
      beat(tl, 'pop', '<0.35')
      tl.call(() => setPrompt(t('finale.post')), null, '<0.2')
      // she reads that, then it's her turn
      tl.addLabel('ready', `>+=${T.linger * 0.6}`)
      tl.call(
        () => {
          stage = 'sticker'
          setPrompt(t('finale.stick'))
          sticker.setAttribute('tabindex', '0')
          wobbleSticker = wobble(sticker, { deg: 4 })
          guide.set(sticker)
        },
        null,
        'ready',
      )
    }

    // ── moment 2: the sticker, then the whole crescendo, then the card, then the post ──
    function stick() {
      if (stage !== 'sticker') return
      stage = 'celebrate'
      guide.set([])
      wobbleSticker()
      wobbleSticker = () => {}
      unpressSticker()
      unpressSticker = () => {}
      sticker.classList.add('sticker--stuck')
      sticker.setAttribute('tabindex', '-1')
      gsap.killTweensOf(sticker)
      gsap.set(sticker, { transformOrigin: '50% 50%' })
      const party = () => frameFor('party')
      const home = () => frameFor('home')

      tl?.kill()
      tl = moment()
      if (ctx.reduced) tl.timeScale(REDUCED) // same timeline, just quicker (it's the longest one)
      // slap — it's on
      tl.to(sticker, { x: STUCK.x - REST.x, y: STUCK.y - REST.y, scale: STUCK.scale, rotation: STUCK.rotation, duration: T.quick, ease: EASE.out })
      beat(tl, 'peel', '<')
      tl.addLabel('stuck', '>')
      beat(tl, 'pop', 'stuck')
      tl.call(() => {
        haptic([10, 40, 16])
        const p = center(sticker)
        fx.sparkles(p.x, p.y, { count: 10 })
      }, null, 'stuck')
      tl.fromTo(plate, { rotation: 4 }, { rotation: 0, duration: T.moment * 0.7, ease: EASE.wobble }, 'stuck')
      tl.call(() => setPrompt(c('finale.stickerNote')), null, 'stuck+=0.15')

      // the swell: music turns to the chorus, the camera pulls back to take in house + garden,
      // sat low on the lawn, the whole sky above them left for the fireworks
      tl.addLabel('swell', `stuck+=${T.linger * 0.5}`) // the note gets a moment to be read
      tl.call(() => {
        phase = 'party'
        fin.dataset.phase = 'home'
      }, null, 'swell')
      tl.set(art, { willChange: 'transform' }, 'swell')
      tl.to(art, { x: () => party().x, y: () => party().y, scale: () => party().s, duration: T.moment, ease: EASE.inOut }, 'swell')
      tl.call(() => (frame = party()), null, '>')
      tl.set(art, { willChange: 'auto' }, '>') // re-raster crisp at the new scale

      // 1. every window flares, one at a time, one bell each
      tl.addLabel('flare', 'swell+=0.45')
      flare.forEach((pair, i) => {
        const at = `flare+=${i * STEP}`
        const glow = pair.map((w) => w.querySelector('[data-glow]'))
        const halo = pair.map((w) => w.querySelector('[data-halo]'))
        tl.to(glow, { opacity: 1, duration: T.tap, ease: EASE.out }, at)
        tl.fromTo(halo, { opacity: 0.3, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1.55, duration: T.quick, ease: EASE.out }, at)
        tl.to(halo, { opacity: 0.75, scale: 1.15, duration: T.reveal, ease: EASE.inOut }, `${at}+=${T.quick}`)
        beat(tl, 'ting', at, { i })
      })
      tl.fromTo(aura, { opacity: 0.35 }, { opacity: 0.85, duration: T.reveal, ease: EASE.out }, 'flare')
      tl.fromTo(lampGlow, { opacity: 0.85 }, { opacity: 1, scale: 1.12, transformOrigin: '50% 50%', duration: T.reveal, ease: EASE.out }, 'flare')

      // 2. the fairy lights race outward from the door, then keep chasing
      tl.addLabel('chase', `flare+=${flare.length * STEP + 0.1}`)
      tl.fromTo(
        bulbs,
        { opacity: 0.2 },
        {
          opacity: 1,
          duration: T.quick,
          ease: EASE.out,
          stagger: (i, el) => {
            const dx = Number(el.getAttribute('cx')) - 150 // out from the door (hub units)
            const dy = Number(el.getAttribute('cy')) - 470
            return Math.min(1.4, Math.hypot(dx, dy) / 220)
          },
        },
        'chase',
      )
      beat(tl, 'sparkle', 'chase')
      // then a marquee chase: every third bulb dips, stepping along like real chaser lights
      // (a class flip a few times a second — cheap, so it can run as long as she stays)
      tl.call(() => {
        gsap.set(bulbs, { clearProps: 'opacity' })
        if (ctx.reduced) return
        let k = 0
        chase = gsap.to({}, { duration: 0.18, repeat: -1, onRepeat: () => (bulbBox.dataset.chase = String(k++ % 3)) })
      }, null, 'chase+=1.6')

      // 3. the chimney puffs hearts
      tl.addLabel('hearts', 'chase+=0.5')
      for (let i = 0; i < 14; i++) {
        tl.call(() => {
          const r = chimney.getBoundingClientRect()
          const p = { x: r.left + r.width * 0.5, y: r.top }
          fx.hearts(p.x, p.y, { count: i % 3 === 0 ? 3 : 2 })
        }, null, `hearts+=${i * 0.3}`)
        tl.fromTo(cap, { y: -2 }, { y: 0, duration: 0.26, ease: EASE.land }, `hearts+=${i * 0.3}`)
      }
      beat(tl, 'pop', 'hearts')

      // 4. fireworks go up from behind the roof, and the music swells into the chorus with them
      //    (the theme crossfades over ~1.5 s, so it peaks as the first rockets burst)
      tl.addLabel('fireworks', 'hearts+=0.4')
      tl.call(() => {
        if (music) sound.theme('chorus')
        show?.stop()
        show = fx.fireworks(fw, { duration: ctx.reduced ? 1200 : 7000 })
      }, null, 'fireworks')
      for (let i = 0; i < 8; i++) beat(tl, 'firework', `fireworks+=${1.15 + i * 0.62}`)

      // 5. the card lands at the top of the swell
      tl.addLabel('card', 'fireworks+=2.8') // a couple of bursts on their own first
      tl.to(prompt, { autoAlpha: 0, duration: T.quick }, 'card-=0.25')
      tl.call(() => fx.confetti({ duration: 3200 }), null, 'card')
      // the house rises to make room for the card (beside it in landscape: it barely moves)
      tl.call(() => (phase = 'home'), null, 'card')
      tl.set(art, { willChange: 'transform' }, 'card')
      tl.to(art, { x: () => home().x, y: () => home().y, scale: () => home().s, duration: T.reveal, ease: EASE.inOut }, 'card')
      tl.call(() => (frame = home()), null, '>')
      tl.set(art, { willChange: 'auto' }, '>')
      beat(tl, 'chime', 'card')
      tl.fromTo(card, { autoAlpha: 0, y: 48, rotation: -5, scale: 0.9 }, { autoAlpha: 1, y: 0, rotation: -1.2, scale: 1, duration: T.reveal, ease: EASE.spring }, 'card')
      tl.fromTo(cardBits.slice(0, 4), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: T.quick * 1.6, ease: EASE.out, stagger: 0.3 }, `card+=${T.reveal * 0.5}`)
      tl.fromTo(homeBtn, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: T.quick * 1.6, ease: EASE.spring }, '>')
      tl.call(() => ctx.complete('finale'), null, '>')

      // 6. two beats later: post. An ivory envelope slides halfway out of the letterbox.
      tl.addLabel('mail', `>+=${T.linger * 0.8}`)
      beat(tl, 'paper', 'mail')
      tl.to(flap, { scaleY: -1.4, duration: T.tap, ease: EASE.out }, 'mail')
      tl.fromTo(mailEnv, { opacity: 1, y: 30 }, { y: 0, duration: T.move, ease: EASE.spring }, 'mail+=0.05')
      tl.call(() => placeMail(), null, '<')
      // a warm glow comes up behind it, and keeps breathing (like the lamp it came in under)
      tl.fromTo(mailHalo, { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' }, { opacity: 0.9, scale: 1, duration: T.reveal, ease: EASE.out }, '<')
      tl.call(() => {
        if (ctx.reduced) return
        breathe?.kill()
        breathe = gsap.to(mailHalo, { opacity: 0.45, scale: 0.8, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      }, null, '>')
      tl.fromTo(mailBtn, { autoAlpha: 0, scale: 0.6, transformOrigin: '28px 50%' }, { autoAlpha: 1, scale: 1, duration: T.quick * 1.6, ease: EASE.spring }, '<-0.4')
      tl.call(() => guide.set(mailBtn), null, '>')
    }
    let breathe = null
    add(() => breathe?.kill())

    // ── leaving ──
    let leaving = false
    const onHome = () => {
      if (leaving) return
      leaving = true
      ctx.go('house')
    }
    const onMail = () => {
      if (leaving) return
      leaving = true
      guide.stop()
      const out = moment()
      out.to(mailEnv, { y: -26, duration: T.quick, ease: EASE.out })
      beat(out, 'whoosh', '<')
      out.call(() => ctx.go('card'))
      add(() => out.kill())
    }
    homeBtn.addEventListener('click', onHome)
    mailBtn.addEventListener('click', onMail)
    add(() => {
      homeBtn.removeEventListener('click', onHome)
      mailBtn.removeEventListener('click', onMail)
    })

    // ── tapping around: everything answers like what it is ──
    //   windows  flicker (someone moves inside) with their room's own sound; 2nd tap: a remark
    //   moon     winks; blushes; smiles while a star shoots past
    //   cat      (puppet) looks at her; meows; slow-blinks a heart
    //   chimney  knock: the cap hops and puffs a heart (three from the 3rd tap)
    //   tank     ripple; from the 3rd tap the lid hops and splashes
    //   lamp     flicker + buzz
    //   mat      squish; once the plate is up, lifting it finds the key (we won't need it)
    //   tree     flutter: blossom drifts down · bush: flutter, every 3rd tap a firefly
    //   sky      after the crescendo, her taps send up fireworks (every 5th is all hearts)
    const live = new Set()
    const keep = (a) => (live.add(a), a)
    add(() => live.forEach((a) => a.kill()))
    const d = (v) => (ctx.reduced ? 0.01 : v)
    const svg = $('.fin-svg')
    const SVGNS = 'http://www.w3.org/2000/svg'
    const dot = (parent, cls, x, y, r) => {
      const el = document.createElementNS(SVGNS, 'circle')
      el.setAttribute('class', cls)
      el.setAttribute('cx', x)
      el.setAttribute('cy', y)
      el.setAttribute('r', r)
      parent.append(el)
      return el
    }
    const on = (el, fn) => {
      el.addEventListener('pointerdown', fn)
      add(() => el.removeEventListener('pointerdown', fn))
    }

    let sayTl = null
    function say(el, text, lift = 4) {
      if (!text) return
      sayTl?.progress(1).kill()
      const r = el.getBoundingClientRect()
      const f = fin.getBoundingClientRect()
      const n = document.createElement('p')
      n.className = 'fin-say'
      n.textContent = text
      fin.append(n)
      const w = n.offsetWidth
      const cx = Math.min(f.width - 8 - w / 2, Math.max(8 + w / 2, r.left + r.width / 2 - f.left))
      n.style.left = `${cx}px`
      n.style.top = `${Math.max(TOP + n.offsetHeight, r.top - f.top - lift)}px`
      sayTl = keep(
        gsap
          .timeline({ onComplete: () => n.remove(), onInterrupt: () => n.remove() })
          .fromTo(n, { scale: 0.6, rotation: -8, autoAlpha: 0, y: 6 }, { scale: 1, rotation: -3, autoAlpha: 1, y: 0, duration: d(0.4), ease: 'back.out(2.4)' })
          .to(n, { autoAlpha: 0, y: -8, duration: d(0.3) }, `+=${Math.max(T.linger, text.length * 0.06)}`),
      )
    }

    // windows: each remembers its room
    const ROOM_SOUND = { living: 'tick', kitchen: 'bubble', garden: 'chain', rooftop: 'ting', desk: 'scratch', empty: 'marker' }
    for (const w of $$('[data-win]')) {
      const id = w.dataset.win
      add(react(w, 'flicker', { target: w.querySelector('.w-inside') ?? w.querySelector('.w-flame'), sound: ROOM_SOUND[id], steps: [() => {}, () => say(w, t(`finale.rooms.${id}`))] }))
    }

    // the moon
    const moon = $('.fin-svg .moon')
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
      const f = fin.getBoundingClientRect()
      const st = document.createElement('i')
      st.className = 'fin-rocket'
      Object.assign(st.style, { left: `${r.left - f.left}px`, top: `${r.top - f.top + r.height * 0.7}px`, height: '2px', width: '70px', background: 'linear-gradient(90deg, transparent, var(--star))', opacity: 0 })
      fin.append(st)
      sound.play('sparkle')
      keep(gsap.timeline({ onComplete: () => st.remove(), onInterrupt: () => st.remove() }).set(st, { rotation: 158 }).to(st, { x: -220, y: 88, duration: 0.9, ease: 'power1.in' }).to(st, { opacity: 1, duration: 0.2, ease: 'none' }, 0).to(st, { opacity: 0, duration: 0.3 }, 0.6))
    }
    on(moon, () => {
      moonN++
      haptic(4)
      sound.play('ting', { i: moonN + 2 })
      const k = ((moonN - 1) % 3) + 1
      moonTl?.kill()
      const mt = (moonTl = keep(gsap.timeline()))
      mt.set([eyeL, eyeR], { scaleY: 1, opacity: 1 }).set(happy, { opacity: 0 }).set(blush, { opacity: 0 })
      mt.to(face, { opacity: 1, duration: d(0.25) })
      if (k === 1) mt.to(eyeR, { scaleY: 0.12, duration: d(0.1) }, '+=0.3').to(eyeR, { scaleY: 1, duration: d(0.15) }, '+=0.4')
      else if (k === 2) {
        mt.to(blush, { opacity: 0.75, duration: d(0.3) }, '<')
        mt.to(eyeL, { scaleY: 0.12, duration: d(0.1) }, '+=0.3').to(eyeL, { scaleY: 1, duration: d(0.15) }, '+=0.4')
      } else {
        mt.to([eyeL, eyeR], { opacity: 0, duration: d(0.1) }, '+=0.15').to(happy, { opacity: 1, duration: d(0.1) }, '<')
        mt.to(blush, { opacity: 0.75, duration: d(0.3) }, '<')
        mt.call(shoot, null, '<')
        mt.to({}, { duration: 0.6 })
      }
      mt.to(face, { opacity: 0, duration: d(0.5) }, '+=0.8')
    })

    // the cat: looks at her, meows, then gives her the slow blink (and a heart)
    const cat = $('.fin-svg .h-cat')
    const catHead = $('[data-cat-head]')
    const catEyes = $('[data-cat-eyes]')
    const eyeBits = [...catEyes.children]
    const tail = $('[data-cat-tail]')
    cat.dataset.react = 'cat'
    gsap.set(eyeBits, { transformOrigin: '50% 50%' })
    gsap.set(catHead, { transformOrigin: '50% 100%' })
    gsap.set(tail, { transformOrigin: '0% 100%' })
    let catN = 0
    let catTl = null
    on(cat, () => {
      catN++
      haptic(4)
      catTl?.kill()
      const ct = (catTl = keep(gsap.timeline()))
      ct.to(catHead, { rotation: -9, duration: d(0.3), ease: 'power2.out' })
        .set(eyeBits, { scaleY: 0.1 }, '<')
        .to(catEyes, { opacity: 1, duration: d(0.08) }, '<0.12')
        .to(eyeBits, { scaleY: 1, duration: d(0.18), ease: 'back.out(2)' })
      if (catN === 1) {
        sound.play('tap')
        ct.to(eyeBits, { scaleY: 0.12, duration: d(0.07), yoyo: true, repeat: 1 }, '+=0.7')
      } else if (catN === 2) {
        ct.call(() => sound.play('meow'), null, '<')
        ct.to(tail, { rotation: -20, duration: d(0.25), yoyo: true, repeat: 1, ease: 'sine.inOut' }, '<')
      } else {
        ct.to(eyeBits, { scaleY: 0.12, duration: d(0.35), yoyo: true, repeat: 1, ease: 'sine.inOut' }, '+=0.4')
        ct.call(() => {
          const r = catHead.getBoundingClientRect()
          fx.hearts(r.left + r.width / 2, r.top, { count: 1 })
        }, null, '<0.3')
      }
      ct.to(eyeBits, { scaleY: 0.1, duration: d(0.1) }, '+=0.9').to(catEyes, { opacity: 0, duration: d(0.08) }).to(catHead, { rotation: 0, duration: d(0.45), ease: 'sine.inOut' })
    })

    // chimney: the cap hops and puffs a heart
    add(
      react(chimney, 'knock', {
        sound: 'pop',
        steps: [
          (n) => {
            if (!ctx.reduced) keep(gsap.timeline().to(cap, { y: -5, duration: 0.1, ease: 'power2.out' }).to(cap, { y: 0, duration: 0.5, ease: 'bounce.out' }))
            const r = cap.getBoundingClientRect()
            fx.hearts(r.left + r.width / 2, r.top, { count: n >= 3 ? 3 : 1 })
          },
        ],
      }),
    )

    // the water tank
    const tank = $('.fin-svg .h-tank')
    const lid = $('[data-tank-lid]')
    const splash = () => {
      sound.play('drip')
      if (ctx.reduced) return
      keep(gsap.timeline().to(lid, { y: -6, rotation: -8, transformOrigin: '50% 100%', duration: 0.12, ease: 'power2.out' }).to(lid, { y: 0, rotation: 0, duration: 0.5, ease: 'bounce.out' }))
      for (let k = 0; k < 4; k++) {
        const c = dot(tank, 'h-drop', 190 + k * 4, 222, 1.6)
        keep(gsap.timeline({ onComplete: () => c.remove() }).to(c, { x: (k < 2 ? -1 : 1) * (6 + k * 3), y: -12 - (k % 2) * 5, duration: 0.25, ease: 'power2.out' }).to(c, { y: 26, opacity: 0, duration: 0.45, ease: 'power2.in' }))
      }
    }
    add(react(tank, 'ripple', { target: $('[data-tank-body]'), origin: '50% 100%', steps: [() => {}, () => {}, () => splash()] }))

    // the porch lamp
    add(react($('.fin-svg .sconce'), 'flicker', { target: $('.fin-svg .sconce .h-porch-bulb') }))

    // the doormat: soft; once the plate's up, lifting a corner finds the key after all
    const mat = $('.fin-svg .mat')
    let matN = 0
    let matTl = null
    mat.dataset.react = 'lift'
    on(mat, () => {
      matN++
      haptic(6)
      matTl?.kill()
      const free = stage !== 'plate'
      sound.play(free && matN >= 2 ? 'paper' : 'squish')
      if (!free || matN < 2) {
        if (!ctx.reduced) matTl = keep(gsap.timeline().to(mat, { scaleY: 0.75, scaleX: 1.06, svgOrigin: '150 576', duration: 0.1, ease: 'power2.out' }).to(mat, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1.1, 0.35)' }))
        return
      }
      say(mat, t('finale.key'), 26) // placed before the lift, clear of the corner that comes up
      matTl = keep(gsap.timeline().to(mat, { rotation: -18, svgOrigin: '127 576', duration: d(0.3), ease: 'power2.out' }).to(mat, { rotation: 0, duration: d(0.45), ease: 'power2.in' }, `+=${ctx.reduced ? 0.6 : 1.4}`).call(() => sound.play('squish')))
    })

    // the garden: blossom drifts from the tree; a firefly hides in the bush
    const garden = $('.fin-svg .h-garden')
    const blossom = $$('.g-blossom circle')
    add(
      react($('.fin-svg .g-tree'), 'flutter', {
        origin: '50% 100%',
        strength: 0.6,
        steps: [
          () => {
            if (ctx.reduced) return
            for (let k = 0; k < 2; k++) {
              const b = blossom[Math.floor(Math.random() * blossom.length)]
              const c = dot(garden, 'h-petal', b.getAttribute('cx'), b.getAttribute('cy'), 1.8)
              keep(gsap.timeline({ onComplete: () => c.remove() }).to(c, { x: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 10), y: 556 - +b.getAttribute('cy'), duration: 1.6 + Math.random() * 0.6, ease: 'sine.in' }).to(c, { opacity: 0, duration: 0.4 }))
            }
          },
        ],
      }),
    )
    const firefly = () => {
      if (ctx.reduced) return
      const c = dot(svg, 'h-firefly', 4, 540, 2.2)
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
    add(react($('.fin-svg .g-bush--l'), 'flutter', { origin: '50% 100%', strength: 1.2, steps: [(n) => n % 3 === 0 && firefly()] }))

    // the sky: once the house has celebrated, her taps send up fireworks of their own
    let fwN = 0
    fw.dataset.react = 'firework'
    const onSky = (e) => {
      if (fin.dataset.phase !== 'home') return
      if (e.target.closest?.('button, [data-card], [data-plate], [data-sticker], .pokeable')) return
      const f = fin.getBoundingClientRect()
      const sky = fw.getBoundingClientRect()
      if (e.clientY > sky.bottom - 8) return
      fwN++
      const n = fwN
      const bx = e.clientX
      const by = e.clientY
      const burst = () => {
        sound.play('firework')
        haptic(10)
        if (n % 5 === 0) fx.hearts(bx, by, { count: 8 })
        else fx.sparkles(bx, by, { count: 30 })
      }
      if (ctx.reduced) return burst()
      const rk = document.createElement('i')
      rk.className = 'fin-rocket'
      const x0 = bx - f.left + (Math.random() - 0.5) * 40
      const y0 = sky.bottom - f.top
      Object.assign(rk.style, { left: `${x0}px`, top: `${y0}px` })
      fin.append(rk)
      sound.play('whoosh')
      keep(
        gsap
          .timeline({ onComplete: () => rk.remove(), onInterrupt: () => rk.remove() })
          .set(rk, { rotation: (Math.atan2(bx - f.left - x0, y0 - (by - f.top)) * 180) / Math.PI })
          .to(rk, { x: bx - f.left - x0, y: by - f.top - y0, duration: 0.42, ease: 'power2.out' })
          .call(burst)
          .to(rk, { opacity: 0, duration: 0.08 }, '<'),
      )
    }
    fin.addEventListener('pointerdown', onSky)
    add(() => fin.removeEventListener('pointerdown', onSky))

    // ── ambient ──
    const unlock = () => sound.unlock()
    root.addEventListener('pointerdown', unlock, { once: true })
    add(() => root.removeEventListener('pointerdown', unlock))
    if (music) sound.theme('verse')
    add(fx.starfield($('.fin-stars'), { count: 40 }))
    if (!ctx.reduced) {
      add(fx.fireflies(fin, { count: 5 }))
    }

    // the first prompt, once she's had a moment to look up at the lit house
    const intro = moment({ delay: 0.6 })
    intro.call(() => setPrompt(t('finale.hang')))
    add(() => intro.kill())

    if (ctx.params.has('debug')) {
      window.__finale = {
        hang: () => hang(),
        stick: () => {
          if (stage === 'plate') hang()
          if (stage === 'hanging') tl.progress(1)
          stick()
        },
        stage: () => stage,
        fireworks: () => show,
      }
      add(() => delete window.__finale)
    }

    teardown = () => {
      tl?.kill()
      chase?.kill()
      show?.stop()
      cleanups.forEach((fn) => fn())
      gsap.killTweensOf([art, plate, sticker, slip, prompt, card, ...cardBits, mailBtn, mailEnv, mailHalo, flap, cap, aura, lampGlow, engrave, twineSlack, twineTaut, ...engraved, ...bulbs])
      for (const w of wins) gsap.killTweensOf(w.querySelectorAll('[data-glow], [data-halo]'))
    }
  },

  unmount() {
    teardown?.()
    teardown = null
  },
}
