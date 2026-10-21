/*
 * Finale — the nameplate. The same front door as the very first scene, now with the porch lamp
 * on and every window of the house lit above it. A blank nameplate leans on the doormat; she
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
import { haptic, nudge, poke, press, wobble } from '../../ui/feel.js'
import { CHIMNEY, HOOK, PLATE, SLOT, VIEW, finaleSVG, plateSVG, stickerSVG } from './art.js'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])

const MAT = { x: 220, y: 846 } // plate apex while it leans on the doormat
const REST = { x: 228, y: 878 } // sticker centre where it lands on the mat (canvas units)
const STUCK = { x: 300, y: 626, scale: 0.52, rotation: 9 } // sticker centre on the plate's corner
const TOP = 58 // room for the corner chips
const REDUCED = 6 // reduced motion: the finale's long moments play at 6× (choreo's default is 4×)
// windows flare in pairs, from the door outward and upward, one bell per pair
const FLARE = [['living', 'kitchen'], ['far-l', 'far-r'], ['desk', 'empty'], ['upper-l', 'upper-r'], ['upper-ll', 'upper-rr'], ['rooftop']]

let grainUrl = null
/** A small tile of paper fibres (as the door scene), drawn once and reused as a CSS background. */
function grain() {
  if (grainUrl !== null) return grainUrl
  grainUrl = ''
  try {
    const n = 160
    const cv = document.createElement('canvas')
    cv.width = cv.height = n
    const g = cv.getContext('2d')
    if (!g) return grainUrl
    for (let i = 0; i < 1400; i++) {
      const dark = Math.random() < 0.72
      g.fillStyle = dark ? `rgba(20,12,30,${0.05 + Math.random() * 0.12})` : `rgba(255,246,225,${0.03 + Math.random() * 0.07})`
      g.fillRect(Math.random() * n, Math.random() * n, Math.random() < 0.15 ? 2 + Math.random() * 3 : 1, 1)
    }
    grainUrl = `url(${cv.toDataURL()})`
  } catch {
    /* no canvas → flat paper */
  }
  return grainUrl
}

let teardown = null

export default {
  id: 'finale',

  mount(root, ctx) {
    const { t, c, sound, fx } = ctx
    const cleanups = []
    const add = (fn) => typeof fn === 'function' && cleanups.push(fn)
    const answer = c('door.answer') ?? { hour: 4, minute: 30 }
    const music = ctx.raw().ambient?.music !== false

    root.innerHTML = `
      <div class="fin" data-phase="door" role="group" aria-label="${esc(t('finale.scene'))}">
        <div class="fin-stars" aria-hidden="true"></div>
        <div class="fin-fw" aria-hidden="true"></div>
        <div class="fin-art">
          <div class="fin-wall" aria-hidden="true"></div>
          <div class="fin-floor" aria-hidden="true"></div>
          ${finaleSVG({ answer })}
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
    const flare = FLARE.map((ids) => ids.map((id) => $(`[data-win="${id}"]`)).filter(Boolean))
    const wins = flare.flat()
    const cardBits = [...card.children]

    prompt.textContent = t('finale.hang') // laid out (hidden) so the camera can leave room for it
    const tile = grain()
    if (tile) root.style.setProperty('--grain', tile)

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
    // phase 'door': she's hanging things — the whole lit house, door big. 'home': pulled back,
    // room left for the card (below in portrait, beside in landscape) and for fireworks above.
    let phase = 'door'
    let frame = { s: 1, x: 0, y: 0 }

    const frameFor = (ph) => {
      const W = fin.clientWidth
      const H = fin.clientHeight
      const side = W / H >= 1.15
      let region
      let focus
      if (side) {
        const panel = Math.round(Math.min(480, Math.max(300, W * 0.4)))
        const short = H < 560
        const y = ph === 'home' ? Math.max(short ? 36 : TOP, H * 0.2) : short ? 10 : TOP * 0.6
        region = { x: 8, y, w: W - panel - 16, h: H - y - 8, panel }
        focus = ph === 'home' || !short ? [-40, 940] : [276, 930] // short: the porch, cut cleanly at the floor trim
      } else {
        if (ph === 'home') {
          const y = Math.max(TOP, H * 0.25)
          // the letterbox (y 807) must stay clear above the card: the envelope comes out of it
          region = { x: 0, y, w: W, h: H - y - card.offsetHeight - 46 }
          focus = [-40, 822]
        } else {
          region = { x: 0, y: TOP, w: W, h: H - TOP - Math.max(48, prompt.offsetHeight) - 26 }
          focus = [-40, 940]
        }
      }
      const fh = focus[1] - focus[0]
      const s = Math.max(0.2, Math.min(region.w / 470, region.h / fh))
      const midY = (focus[0] + focus[1]) / 2 - VIEW.y
      return {
        s,
        x: region.x + region.w / 2 - 220 * s,
        y: region.y + region.h / 2 - midY * s,
        side,
        panel: region.panel ?? 0,
      }
    }

    const toScreen = (f, cx, cy) => ({ x: f.x + cx * f.s, y: f.y + (cy - VIEW.y) * f.s })

    /** The door frame, leaning in k× around the nameplate (it stays put on screen). */
    const leanIn = (k) => {
      const f = frameFor('door')
      const p = toScreen(f, HOOK.x, HOOK.y + 40)
      return { x: p.x - (p.x - f.x) * k, y: p.y - (p.y - f.y) * k, s: f.s * k }
    }

    function placeMail(f = frame) {
      const p = toScreen(f, SLOT.x, SLOT.y - 30)
      mailBtn.style.left = `${Math.round(p.x - 28)}px`
      mailBtn.style.top = `${Math.round(p.y - 28)}px`
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
      const home = frameFor('home')
      fw.style.height = `${Math.max(120, Math.round(home.y + (300 - VIEW.y) * home.s))}px`
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
    add(press(plate, { sound: 'tap', scale: 0.95 }))
    add(press(sticker, { sound: 'tap', scale: 0.95 }))
    add(press(homeBtn))
    add(press(mailBtn, { sound: 'paper' }))

    const guide = nudge(plate)
    add(() => guide.stop())

    // ── dragging ──
    let held = null // { el, x0, y0 }
    const s = () => frame.s
    const apexNow = () => ({ x: MAT.x + gsap.getProperty(plate, 'x'), y: MAT.y + gsap.getProperty(plate, 'y') })
    const nearHook = (p) => {
      if (hit(hookEl, p.x, p.y, 30)) return true
      const a = apexNow()
      return Math.hypot(a.x - HOOK.x, a.y - HOOK.y) < 46
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
    // a tap without a drag: the thing hops toward where it wants to go (teaches the drag)
    function hint(el, dy) {
      gsap.timeline()
        .to(el, { y: dy, duration: T.quick, ease: EASE.out })
        .to(el, { y: 0, duration: T.move * 1.4, ease: EASE.land })
      if (el === plate) {
        fin.classList.add('is-carrying')
        gsap.delayedCall(T.reveal, () => stage === 'plate' && !held && fin.classList.remove('is-carrying'))
      }
    }

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
          else hint(plate, -26)
        },
      }),
    )

    const stickerHome = () => ({ x: REST.x + gsap.getProperty(sticker, 'x'), y: REST.y + gsap.getProperty(sticker, 'y') })
    const overPlate = (p) => {
      if (hit(plate, p.x, p.y, 16)) return true
      const h = stickerHome()
      return Math.hypot(h.x - STUCK.x, h.y - (STUCK.y - 18)) < 70
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
          else hint(sticker, -30)
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
      // the camera leans in to watch the names engrave, left to right, as the swing settles
      tl.to(art, { x: () => leanIn(1.45).x, y: () => leanIn(1.45).y, scale: () => leanIn(1.45).s, duration: T.moment, ease: EASE.inOut }, 'swing+=0.15')
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
      // …and eases back out just before the post arrives
      tl.to(art, { x: () => frameFor('door').x, y: () => frameFor('door').y, scale: () => frameFor('door').s, duration: T.reveal, ease: EASE.inOut }, `post-=${T.reveal}`)
      beat(tl, 'paper', 'post')
      tl.to(flap, { scaleY: -1.4, duration: T.tap, ease: EASE.out }, 'post')
      tl.set(slip, { visibility: 'visible' }, 'post')
      tl.fromTo(
        slip,
        { x: SLOT.x - REST.x, y: SLOT.y - REST.y + 20, scaleX: 0.6, scaleY: 0.1, rotation: 0 },
        { y: SLOT.y - REST.y - 74, scaleX: 1, scaleY: 1, rotation: -10, duration: T.move * 0.8, ease: 'power2.out' },
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
      sticker.classList.add('sticker--stuck')
      sticker.setAttribute('tabindex', '-1')
      gsap.killTweensOf(sticker)
      gsap.set(sticker, { transformOrigin: '50% 50%' })
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

      // the swell: music turns to the chorus, the camera pulls back to take in the whole house
      tl.addLabel('swell', `stuck+=${T.linger * 0.5}`) // the note gets a moment to be read
      tl.call(() => {
        phase = 'home'
        fin.dataset.phase = 'home'
      }, null, 'swell')
      tl.set(art, { willChange: 'transform' }, 'swell')
      tl.to(art, { x: () => home().x, y: () => home().y, scale: () => home().s, duration: T.moment, ease: EASE.inOut }, 'swell')
      tl.call(() => (frame = home()), null, '>')
      tl.set(art, { willChange: 'auto' }, '>') // re-raster crisp at the new scale

      // 1. every window flares, ground floor up, one bell each
      tl.addLabel('flare', 'swell+=0.45')
      flare.forEach((pair, i) => {
        const at = `flare+=${i * 0.16}`
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
      tl.addLabel('chase', `flare+=${flare.length * 0.16 + 0.1}`)
      tl.fromTo(
        bulbs,
        { opacity: 0.2 },
        {
          opacity: 1,
          duration: T.quick,
          ease: EASE.out,
          stagger: (i, el) => {
            const dx = Number(el.getAttribute('cx')) - 220
            const dy = Number(el.getAttribute('cy')) - 330
            return Math.min(1.4, Math.hypot(dx, dy) / 520)
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
        tl.fromTo(cap, { y: -4 }, { y: 0, duration: 0.26, ease: EASE.land }, `hearts+=${i * 0.3}`)
      }
      beat(tl, 'pop', 'hearts')

      // 4. fireworks go up from behind the roof, and the music swells into the chorus with them
      //    (the theme crossfades over ~1.5 s, so it peaks as the first rockets burst)
      tl.addLabel('fireworks', 'hearts+=0.4')
      tl.call(() => {
        if (music) sound.theme('chorus')
        fx.fireworks(fw, { duration: ctx.reduced ? 1200 : 7000 })
      }, null, 'fireworks')
      for (let i = 0; i < 8; i++) beat(tl, 'firework', `fireworks+=${1.15 + i * 0.62}`)

      // 5. the card lands at the top of the swell
      tl.addLabel('card', 'fireworks+=2.8') // a couple of bursts on their own first
      tl.to(prompt, { autoAlpha: 0, duration: T.quick }, 'card-=0.25')
      tl.call(() => fx.confetti({ duration: 3200 }), null, 'card')
      beat(tl, 'chime', 'card')
      tl.fromTo(card, { autoAlpha: 0, y: 48, rotation: -5, scale: 0.9 }, { autoAlpha: 1, y: 0, rotation: -1.2, scale: 1, duration: T.reveal, ease: EASE.spring }, 'card')
      tl.fromTo(cardBits.slice(0, 3), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: T.quick * 1.6, ease: EASE.out, stagger: 0.3 }, `card+=${T.reveal * 0.5}`)
      tl.fromTo(homeBtn, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: T.quick * 1.6, ease: EASE.spring }, '>')
      tl.call(() => ctx.complete('finale'), null, '>')

      // 6. two beats later: post. An ivory envelope slides halfway out of the letterbox.
      tl.addLabel('mail', `>+=${T.linger * 0.8}`)
      beat(tl, 'paper', 'mail')
      tl.to(flap, { scaleY: -1.4, duration: T.tap, ease: EASE.out }, 'mail')
      tl.fromTo(mailEnv, { opacity: 1, y: 64 }, { y: 0, duration: T.move, ease: EASE.spring }, 'mail+=0.05')
      tl.call(() => placeMail(), null, '<')
      tl.fromTo(mailBtn, { autoAlpha: 0, scale: 0.6, transformOrigin: '28px 50%' }, { autoAlpha: 1, scale: 1, duration: T.quick * 1.6, ease: EASE.spring }, '>-0.1')
      tl.call(() => guide.set(mailBtn), null, '>')
    }

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

    // ── tapping around: the little things answer back ──
    for (const el of $$('.fin-svg .pokeable')) add(poke(el))

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
      }
      add(() => delete window.__finale)
    }

    teardown = () => {
      tl?.kill()
      chase?.kill()
      cleanups.forEach((fn) => fn())
      gsap.killTweensOf([art, plate, sticker, slip, prompt, card, ...cardBits, mailBtn, mailEnv, flap, cap, aura, lampGlow, engrave, twineSlack, twineTaut, ...engraved, ...bulbs])
      for (const w of wins) gsap.killTweensOf(w.querySelectorAll('[data-glow], [data-halo]'))
    }
  },

  unmount() {
    teardown?.()
    teardown = null
  },
}
