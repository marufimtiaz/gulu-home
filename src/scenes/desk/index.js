/*
 * Desk — the letter (verb: read).
 *
 * A dark study. Pull the lamp's chain (drag it down — or just tap it) → the lamp stutters on
 * and a pool of warm light opens over the desk. Tap the envelope → the seal pops, the flap
 * opens, the letter rises out, grows and unfolds. Then the letter writes itself behind a
 * gliding pen nib (writer.js), paragraph by paragraph, with a pen scratch per word. Tap the
 * paper = hurry the current paragraph; hold = show it all. Long letters scroll inside the
 * paper (the nib is followed unless she scrolls back to reread). Sign-off → the heart stamp
 * lands → complete. Each press of the heart writes the next P.S. (the last one stays).
 *
 * Timing: every multi-step moment (light on, opening, signing, each heart press) is one
 * moment() timeline; sounds and text sit on it. The writing is one writer timeline per
 * paragraph, chained by awaits.
 *
 * Test hooks: [data-chain] [data-lamp] [data-envelope] [data-letter] [data-nib] [data-heart]
 * [data-ps] [data-back]; window.__desk = { skip(), phase() } under ?debug.
 */
import { gsap } from 'gsap'
import './scene.css'
import { DESK, deskSVG, envelopeSVG, heartSVG, nibSVG, ringSVG, windowSVG } from './art.js'
import { placeNib, write } from './writer.js'
import { onDrag } from '../../ui/drag.js'
import { EASE, T, beat, moment } from '../../ui/choreo.js'
import { haptic, nudge, poke, press, wobble } from '../../ui/feel.js'

const MS = 35 // per character, the letter's pace
const MS_PS = 26 // the P.S. lines are quicker, giddier
const PULL = 28 // px of pull that clicks the lamp on
const MAX_PULL = 70
const HOLD = 0.6 // s — hold the paper this long to read it all
const GAPS = { hello: 0.55, para: 0.8, off: 0.45 } // breaths between paragraphs (s)

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])

let teardown = null

export default {
  id: 'desk',
  mount(root, ctx) {
    const { t, c, sound, fx, reduced } = ctx
    const paragraphs = c('letter.paragraphs') ?? []
    const psLines = c('letter.ps') ?? []

    root.innerHTML = `
      <div class="study${reduced ? ' study--still' : ''}" data-phase="dark">
        <p class="study__prompt hand" data-prompt aria-live="polite">${esc(t('desk.dark'))}</p>
        <div class="study__window">${windowSVG()}</div>
        <div class="study__desk" data-desk>
          ${deskSVG()}
          <button class="chain" type="button" data-chain aria-label="${esc(t('desk.chain'))}">
            <span class="chain__sway"><span class="chain__links"></span><span class="chain__bead"></span></span>
          </button>
          <button class="envelope" type="button" data-envelope aria-label="${esc(t('desk.envelope'))}">
            ${envelopeSVG()}
            <span class="envelope__to hand">${esc(t('desk.to'))}</span>
          </button>
        </div>
        <div class="study__dark" aria-hidden="true"></div>
        <div class="study__glow" aria-hidden="true"></div>

        <article class="sheet sheet--closed" data-letter aria-label="${esc(t('desk.letter'))}">
          <span class="sheet__tape sheet__tape--l" aria-hidden="true"></span>
          <span class="sheet__tape sheet__tape--r" aria-hidden="true"></span>
          <div class="sheet__scroll" data-scroll>
            <div class="sheet__body hand" data-body>
              <p class="l-hello" data-hello></p>
              ${paragraphs.map(() => '<p class="l-p"></p>').join('')}
              <p class="l-off"></p>
              <p class="l-sig"></p>
              <div class="l-ps" aria-live="polite"></div>
              <div class="l-end" data-end hidden>
                <button class="btn btn--berry" type="button" data-back>${esc(t('reward.back'))}</button>
              </div>
              <i class="nib" data-nib aria-hidden="true">${nibSVG()}</i>
              <span class="rule-probe" aria-hidden="true">x<i></i></span>
            </div>
          </div>
          <span class="sheet__crease sheet__crease--1" aria-hidden="true"></span>
          <span class="sheet__crease sheet__crease--2" aria-hidden="true"></span>
          <p class="sheet__hint" data-hint aria-hidden="true">${esc(t('desk.hurry'))}</p>
          <button class="stamp" type="button" data-heart aria-label="${esc(t('desk.heart'))}" hidden>
            <span class="stamp__face">${heartSVG()}</span>
            <span class="stamp__press hand" aria-hidden="true">${esc(t('desk.press'))}</span>
          </button>
        </article>
        <div class="hold-ring" data-ring aria-hidden="true">${ringSVG()}</div>
      </div>`

    const $ = (s) => root.querySelector(s)
    const study = $('.study')
    const prompt = $('[data-prompt]')
    const deskBox = $('[data-desk]')
    const windowEl = $('.study__window')
    const deskArt = deskBox.querySelector('.desk-art')
    const chain = $('[data-chain]')
    const sway = $('.chain__sway')
    const lamp = $('[data-lamp]')
    const beam = $('.d-beam')
    const glow = $('.study__glow')
    const envelope = $('[data-envelope]')
    const envSvg = envelope.querySelector('svg')
    const seal = $('[data-seal]')
    const flap = $('[data-flap]')
    const flapOpen = $('[data-flap-open]')
    const envLetter = $('[data-env-letter]')
    const sheet = $('[data-letter]')
    const scroller = $('[data-scroll]')
    const body = $('[data-body]')
    const nib = $('[data-nib]')
    const creases = root.querySelectorAll('.sheet__crease')
    const hint = $('[data-hint]')
    const heart = $('[data-heart]')
    const heartFace = $('.stamp__face')
    const pressLabel = $('.stamp__press')
    const psList = $('.l-ps')
    const end = $('[data-end]')
    const backBtn = $('[data-back]')
    const ring = $('[data-ring]')
    const ringFill = ring.querySelector('.ring-fill')
    const probe = $('.rule-probe i')
    const sig = $('.l-sig')

    // ── bookkeeping: everything that runs gets killed on unmount ──
    const live = new Set()
    const track = (a) => {
      if (live.size > 80) for (const x of live) if (!x.isActive() && x.progress() === 1) live.delete(x)
      live.add(a)
      return a
    }
    const offs = []
    const on = (el, type, fn, opts) => {
      el.addEventListener(type, fn, opts)
      offs.push(() => el.removeEventListener(type, fn, opts))
    }
    let dead = false

    let phase = 'dark' // dark → lighting → lit → opening → writing → signed
    const setPhase = (p) => {
      phase = p
      study.dataset.phase = p
    }

    // ── the prompt line ──
    const setPrompt = (text) => {
      if (prompt.textContent === text) return
      prompt.textContent = text
      track(gsap.fromTo(prompt, { scale: 0.9, rotation: -2, autoAlpha: 0.4 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: reduced ? 0.01 : 0.45, ease: 'back.out(2.6)', overwrite: true }))
    }

    // ── ruled paper: every baseline sits on a rule ──
    // The rules are a background tiled every line-height; the probe (a zero-size inline-block in
    // one line of the letter's font) tells us where the baseline falls in a line box, so the
    // tile is shifted to put its rule just under it. Every block is a whole number of lines tall,
    // so one offset fits all. The signature is bigger (two lines tall): it is nudged onto a rule.
    function alignRules() {
      const fs = parseFloat(getComputedStyle(body).fontSize) || 20
      const lh = parseFloat(getComputedStyle(body).lineHeight) || fs * 1.5
      const base = probe.getBoundingClientRect().top - probe.parentElement.getBoundingClientRect().top // baseline, from the top of its line box
      const y = base + fs * 0.07 + 1.5 - lh // tile bottom = the rule's bottom edge
      body.style.setProperty('--rule-y', `${y.toFixed(2)}px`)
      // the signature is set bigger, in a box two lines tall: shift it so its baseline lands on a rule
      const scs = getComputedStyle(sig)
      const sfs = parseFloat(scs.fontSize) || fs * 1.6
      const slh = parseFloat(scs.lineHeight) || lh * 2
      const sigBase = slh / 2 + (base - lh / 2) * (sfs / fs) // half-leading model, same font
      let d = (base - sigBase) % lh
      if (d > lh / 2) d -= lh
      if (d < -lh / 2) d += lh
      sig.style.setProperty('--sig-y', `${d.toFixed(2)}px`)
    }
    document.fonts?.ready.then(() => !dead && alignRules())

    // ── layout: where the lamp's pool sits on screen (live on resize) ──
    let lastWord = null
    function layout() {
      alignRules()
      const a = deskArt.getBoundingClientRect()
      const r = root.getBoundingClientRect()
      const s = a.width / DESK.w
      study.style.setProperty('--lx', `${(a.left - r.left + DESK.pool.x * s).toFixed(1)}px`)
      study.style.setProperty('--ly', `${(a.top - r.top + DESK.pool.y * s).toFixed(1)}px`)
      study.style.setProperty('--pool-r', `${Math.max(a.width * 0.62, 180).toFixed(1)}px`)
      if (lastWord && !nib.classList.contains('nib--writing')) placeNib(nib, lastWord)
    }
    layout()
    on(window, 'resize', layout)

    // ── idle guidance: the next thing to touch ──
    const guide = nudge(chain)
    offs.push(() => guide.stop())

    // ── the chain ──
    offs.push(wobble(sway, { deg: 3.5, period: 2.8 }))
    offs.push(press(chain, { sound: 'tap', scale: 0.96 }))
    const setPull = (px) => chain.style.setProperty('--pull', `${Math.max(0, px).toFixed(1)}px`)
    const pullNow = () => parseFloat(chain.style.getPropertyValue('--pull')) || 0
    const springBack = () => track(gsap.to(chain, { '--pull': '0px', duration: reduced ? 0.01 : T.reveal, ease: EASE.wobble, overwrite: true }))
    let clicked = false
    let moved = false
    offs.push(
      onDrag(chain, {
        onStart() {
          moved = false
          clicked = false
          gsap.killTweensOf(chain, '--pull')
        },
        onMove(p) {
          if (Math.abs(p.dy) > 4) moved = true
          const d = Math.max(0, p.dy)
          const px = d < MAX_PULL ? d : MAX_PULL + (d - MAX_PULL) * 0.15 // rubber band past the end
          setPull(px)
          if (!clicked && px >= PULL) {
            clicked = true
            sound.play('chain')
            haptic(12)
          } else if (clicked && px < PULL * 0.6) clicked = false
        },
        onEnd() {
          if (!moved) return tug()
          if (pullNow() >= PULL) return lightOn({ clickedAlready: clicked })
          springBack()
          if (phase === 'dark') setPrompt(t('desk.further'))
        },
      }),
    )
    on(chain, 'click', (e) => e.detail === 0 && tug()) // keyboard

    /** A tap on the chain: the hand pulls it for her. */
    function tug() {
      if (phase === 'lighting') return
      const tl = track(moment())
      tl.to(chain, { '--pull': `${PULL + 12}px`, duration: T.quick * 0.7, ease: 'power2.in', overwrite: true })
      tl.call(() => lightOn())
    }

    // ── the lamp ──
    let lightTl = null
    function lightOn({ clickedAlready = false } = {}) {
      if (phase !== 'dark') return blink(clickedAlready)
      setPhase('lighting')
      guide.set([])
      const tl = (lightTl = track(moment({ onComplete: () => {
        setPhase('lit')
        guide.set(envelope)
      } })))
      if (!clickedAlready) tl.call(() => (sound.play('chain'), haptic(12)), null, 0)
      tl.to(chain, { '--pull': '0px', duration: T.reveal, ease: EASE.wobble, overwrite: true }, 0)
      tl.addLabel('click', 0.08)
      beat(tl, 'lampOn', 'click')
      tl.call(() => lamp.classList.add('on'), null, 'click')
      // the bulb stutters, then holds
      tl.to([glow, beam], {
        keyframes: [
          { opacity: 0.85, duration: 0.05 },
          { opacity: 0.1, duration: 0.08 },
          { opacity: 1, duration: 0.05 },
          { opacity: 0.35, duration: 0.1 },
          { opacity: 1, duration: 0.24 },
        ],
      }, 'click')
      // the room comes up into the pool of light
      tl.to(study, { '--pool': 1, duration: T.reveal, ease: EASE.out }, 'click+=0.3')
      tl.call(() => {
        const r = envelope.getBoundingClientRect()
        fx.sparkles(r.left + r.width / 2, r.top + r.height * 0.4, { count: 10 })
      }, null, '>-0.25')
      beat(tl, 'sparkle', '<')
      tl.call(() => setPrompt(t('desk.lit')), null, '<')
    }

    /** Already on: the chain clicks and the bulb blinks. */
    function blink(clickedAlready) {
      if (!clickedAlready) sound.play('chain')
      springBack()
      if (phase === 'lighting') return
      const tl = track(moment())
      tl.to([glow, beam], { keyframes: [{ opacity: 0.2, duration: 0.06 }, { opacity: 1, duration: 0.2 }] }, 0.06)
    }

    // tapping the lamp itself
    on(lamp, 'pointerdown', (e) => {
      if (phase === 'dark') {
        sound.play('tap')
        track(gsap.fromTo(chain, { y: 0 }, { keyframes: { y: [0, 6, -3, 0] }, duration: 0.5, ease: 'none', overwrite: 'auto' }))
        guide.reset()
      } else {
        blink(false)
        fx.sparkles(e.clientX, e.clientY, { count: 5 })
      }
    })

    // ── decorations answer a tap ──
    for (const el of root.querySelectorAll('[data-poke]')) offs.push(poke(el))

    // ── the envelope ──
    offs.push(press(envelope, { sound: 'tap', scale: 0.95 }))
    on(envelope, 'click', () => {
      if (phase === 'dark' || phase === 'lighting') {
        setPrompt(t('desk.tooDark'))
        track(gsap.fromTo(chain, { y: 0 }, { keyframes: { y: [0, 8, -4, 0] }, duration: 0.55, ease: 'none', overwrite: 'auto' }))
        return
      }
      if (phase === 'lit') openLetter()
    })

    let openTl = null
    function openLetter() {
      setPhase('opening')
      guide.set([])
      envelope.disabled = true
      study.classList.add('study--reading')

      // geometry: the folded sheet starts exactly where the little letter in the envelope ends up
      sheet.classList.remove('sheet--closed')
      gsap.set(sheet, { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 })
      const sr = sheet.getBoundingClientRect()
      const lr = envLetter.getBoundingClientRect()
      const k = envSvg.getBoundingClientRect().width / 160
      const RISE = 46
      const fromX = lr.left + lr.width / 2 - (sr.left + sr.width / 2)
      const fromY = lr.top - RISE * k - sr.top
      gsap.set(sheet, { transformOrigin: '50% 0%', x: fromX, y: fromY, scaleX: lr.width / sr.width, scaleY: lr.height / sr.height, autoAlpha: 0 })
      placeNibAtStart()

      const tl = (openTl = track(moment({ onComplete: startWriting })))
      beat(tl, 'paper', 0)
      tl.to(seal, { scale: 0, rotation: 80, svgOrigin: '80 60', duration: T.quick, ease: 'back.in(2)' }, 0)
      tl.to(flap, { scaleY: 0, svgOrigin: '80 12', duration: T.quick * 0.8, ease: 'power2.in' }, 0.12)
      tl.fromTo(flapOpen, { scaleY: 0 }, { scaleY: 1, svgOrigin: '80 12', duration: T.quick, ease: 'power2.out', immediateRender: false }, '>')
      tl.to(envLetter, { y: -RISE, duration: T.move * 0.8, ease: EASE.out }, '>-0.05')
      tl.to(prompt, { autoAlpha: 0, duration: T.quick }, '<')
      // the letter leaves the envelope: grows to full width, still folded in three…
      tl.addLabel('lift')
      tl.set(envLetter, { autoAlpha: 0 }, 'lift')
      tl.set(sheet, { autoAlpha: 1 }, 'lift')
      tl.to(sheet, { x: 0, y: 0, scaleX: 1, scaleY: 1 / 3, duration: T.move, ease: EASE.out }, 'lift')
      tl.to(envelope, { y: 40, autoAlpha: 0, duration: T.move, ease: 'power2.in' }, 'lift')
      tl.to(study, { '--dim': 1, duration: T.reveal, ease: 'power1.out' }, 'lift')
      tl.to(windowEl, { opacity: 0.4, duration: T.reveal, ease: 'power1.out' }, 'lift')
      // …and unfolds
      tl.addLabel('unfold')
      beat(tl, 'paper', 'unfold')
      tl.to(sheet, { scaleY: 1, duration: T.reveal * 0.7, ease: EASE.out }, 'unfold')
      tl.to(creases, { opacity: 0, duration: T.reveal, ease: 'power1.in' }, 'unfold+=0.2')
      tl.fromTo(nib, { autoAlpha: 0, y: '-=14' }, { autoAlpha: 1, y: '+=14', duration: T.quick, ease: EASE.out }, '>-0.35')
      tl.fromTo(hint, { autoAlpha: 0 }, { autoAlpha: 1, duration: T.quick }, '<')
    }

    function placeNibAtStart() {
      const hello = $('[data-hello]')
      const fs = parseFloat(getComputedStyle(body).fontSize) || 20
      gsap.set(nib, { x: hello.offsetLeft, y: hello.offsetTop + fs * 1.05 })
    }

    // ── following the pen: the paper scrolls to keep the nib in view, unless she scrolls back ──
    let following = true
    let autoScrolling = false
    let scrollTw = null
    function autoScroll(top, dur = T.reveal) {
      const max = scroller.scrollHeight - scroller.clientHeight
      top = Math.max(0, Math.min(max, top))
      if (Math.abs(top - scroller.scrollTop) < 2) return
      scrollTw?.kill()
      autoScrolling = true
      scrollTw = track(gsap.to(scroller, { scrollTop: top, duration: reduced ? 0.01 : dur, ease: EASE.inOut, onComplete: () => (autoScrolling = false), onInterrupt: () => (autoScrolling = false) }))
    }
    function follow(span) {
      if (!following || !span) return
      const sr = scroller.getBoundingClientRect()
      const r = span.getBoundingClientRect()
      const bottom = r.bottom - sr.top + scroller.scrollTop
      const view = scroller.clientHeight
      if (bottom > scroller.scrollTop + view * 0.66) autoScroll(bottom - view * 0.4)
    }
    const nibInView = () => {
      const sr = scroller.getBoundingClientRect()
      const r = nib.getBoundingClientRect()
      return r.top > sr.top - 10 && r.top < sr.bottom - 20
    }
    const userScroll = () => {
      scrollTw?.kill()
      autoScrolling = false
      following = false
    }
    on(scroller, 'wheel', userScroll, { passive: true })
    on(scroller, 'touchmove', userScroll, { passive: true })
    on(scroller, 'scroll', () => {
      if (!autoScrolling && !following && nibInView()) following = true
    }, { passive: true })

    // ── writing ──
    const onWord = (_w, _i, span) => {
      sound.play('scratch')
      lastWord = span
      follow(span)
    }
    let allCtl = new AbortController() // "show it all"
    let paraCtl = null // "hurry this paragraph"
    let gapCall = null
    let gapDone = null
    const wait = (s) =>
      new Promise((resolve) => {
        if (allCtl.signal.aborted || !s) return resolve()
        gapDone = resolve
        gapCall = track(gsap.delayedCall(reduced ? s / 4 : s, () => {
          gapDone = null
          resolve()
        }))
      })
    const skipGap = () => {
      gapCall?.kill()
      const r = gapDone
      gapDone = null
      r?.()
    }

    async function startWriting() {
      if (dead || phase !== 'opening') return
      setPhase('writing')
      nib.classList.add('nib--writing')
      const blocks = [
        [$('[data-hello]'), c('letter.hello'), GAPS.hello],
        ...[...root.querySelectorAll('.l-p')].map((el, i) => [el, paragraphs[i], GAPS.para]),
        [$('.l-off'), c('letter.signOff'), GAPS.off],
        [$('.l-sig'), c('myName'), 0, MS * 1.6], // the name, slower: signed, not written
      ]
      for (const [el, text, gap, ms] of blocks) {
        if (dead) return
        paraCtl = new AbortController()
        if (allCtl.signal.aborted) paraCtl.abort()
        await write(el, text, { msPerChar: ms ?? MS, onWord, signal: paraCtl.signal, nib })
        if (dead) return
        lastWord = el.querySelector('.w:last-of-type') ?? lastWord
        follow(lastWord)
        await wait(gap)
      }
      if (!dead) signed()
    }

    function hurry() {
      if (phase !== 'writing') return
      following = true
      haptic(6)
      hideHint()
      if (paraCtl && !paraCtl.signal.aborted) paraCtl.abort()
      else skipGap()
      if (lastWord) follow(lastWord)
    }

    function showAll() {
      if (phase !== 'writing') return
      haptic([8, 40, 8])
      sound.play('paper')
      hideHint()
      allCtl.abort()
      paraCtl?.abort()
      skipGap()
    }

    let hintHidden = false
    function hideHint() {
      if (hintHidden) return
      hintHidden = true
      track(gsap.to(hint, { autoAlpha: 0, duration: T.quick, overwrite: true }))
    }

    // tap = hurry; hold = everything (with a ring that fills while she holds)
    let hold = null
    function cancelHold() {
      if (!hold) return
      hold.tl.kill()
      gsap.set(ring, { autoAlpha: 0 })
      hold = null
    }
    on(scroller, 'pointerdown', (e) => {
      if (phase !== 'writing' || (e.button !== undefined && e.button > 0)) return
      cancelHold()
      const rr = root.getBoundingClientRect()
      gsap.set(ring, { x: e.clientX - rr.left, y: e.clientY - rr.top, autoAlpha: 0 })
      const h = (hold = { x: e.clientX, y: e.clientY, fired: false, tl: track(gsap.timeline()) })
      h.tl
        .set(ring, { autoAlpha: 1 }, 0.15)
        .fromTo(ringFill, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: HOLD - 0.15, ease: 'none' }, 0.15)
        .call(() => {
          h.fired = true
          gsap.set(ring, { autoAlpha: 0 })
          showAll()
        }, null, HOLD)
    })
    on(scroller, 'pointermove', (e) => {
      if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 10) cancelHold()
    })
    on(scroller, 'pointerup', (e) => {
      if (!hold) return
      const tap = !hold.fired && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) <= 10
      cancelHold()
      if (tap) hurry()
    })
    on(scroller, 'pointercancel', cancelHold)
    on(scroller, 'pointerleave', cancelHold)

    /**
     * Scroll position for the signed letter: as far down as it goes, but never so far that the
     * sign-off slides under the "a light came on" toast (top of the screen, 2.6 s) — the toast
     * arrives exactly when she reaches the signature.
     */
    function signedTop() {
      const sr = scroller.getBoundingClientRect()
      const toasts = document.getElementById('toasts')
      const clear = toasts ? Math.max(0, toasts.getBoundingClientRect().top + 60 - sr.top) : 0
      const offTop = $('.l-off').getBoundingClientRect().top - sr.top + scroller.scrollTop
      return Math.min(scroller.scrollHeight, offTop - clear)
    }

    // ── signed: the stamp lands, the room is lit ──
    function signed() {
      setPhase('signed')
      nib.classList.remove('nib--writing')
      cancelHold()
      hideHint()
      end.hidden = false
      gsap.set(end, { autoAlpha: 0 })
      heart.hidden = false
      gsap.set(heart, { scale: 0, rotation: -40 })
      gsap.set(pressLabel, { autoAlpha: 0 })
      const tl = track(moment({ onComplete: () => {
        ctx.complete()
        guide.set(heart)
      } }))
      // read-it-all glides down to the end; otherwise just keep the signature in view
      if (allCtl.signal.aborted) {
        following = true
        tl.call(() => autoScroll(signedTop(), T.moment), null, 0)
      } else tl.call(() => following && autoScroll(signedTop()), null, 0)
      tl.to(heart, { scale: 1, rotation: 0, duration: T.move, ease: EASE.spring }, 0.25)
      beat(tl, 'stamp', '<0.18')
      tl.call(() => {
        const r = heart.getBoundingClientRect()
        fx.sparkles(r.left + r.width / 2, r.top + r.height / 2, { count: 14 })
      }, null, '<')
      tl.to(pressLabel, { autoAlpha: 1, duration: T.quick }, '>')
      tl.to(end, { autoAlpha: 1, duration: T.quick }, '<')
    }

    // ── the heart: every press writes the next P.S. ──
    offs.push(press(heart, { sound: null, scale: 0.9 }))
    let presses = 0
    let shown = 0
    let psCtl = null
    let lastPs = null
    function writePs(el, text) {
      psCtl?.abort()
      const mine = (psCtl = new AbortController())
      following = true
      nib.classList.add('nib--writing')
      write(el, text, { msPerChar: MS_PS, onWord, signal: mine.signal, nib }).then(() => {
        if (dead || psCtl !== mine) return
        nib.classList.remove('nib--writing')
        follow(el.querySelector('.w:last-of-type'))
        if (shown === psLines.length && !confettiDone) {
          confettiDone = true
          fx.confetti({ duration: 2600 })
          sound.play('sparkle')
        }
      })
    }
    let confettiDone = false
    function pressHeart() {
      if (phase !== 'signed') return
      presses++
      haptic(10)
      if (presses === 1) {
        guide.stop()
        track(gsap.to(pressLabel, { autoAlpha: 0, duration: T.quick, overwrite: true }))
      }
      const grow = Math.min(1 + presses * 0.035, 1.25)
      const tl = track(moment())
      beat(tl, 'stamp', 0)
      tl.fromTo(heartFace, { scale: grow * 1.25 }, { scale: grow, duration: T.reveal, ease: EASE.wobble, overwrite: 'auto' }, 0)
      tl.call(() => {
        const r = heart.getBoundingClientRect()
        fx.hearts(r.left + r.width / 2, r.top + r.height * 0.3, { count: Math.min(3 + presses, 10) })
      }, null, 0.04)
      if (shown < psLines.length) {
        const i = shown++
        const line = document.createElement('p')
        line.className = 'l-ps__line'
        line.dataset.ps = String(i)
        psList.append(line)
        lastPs = line
        // the words arrive once the stamp has landed
        tl.call(() => writePs(line, psLines[i]), null, T.tap)
      } else if (lastPs) {
        tl.fromTo(lastPs, { rotation: -2.5, scale: 1.04 }, { rotation: 0, scale: 1, duration: T.reveal, ease: EASE.wobble, transformOrigin: '0% 50%', overwrite: 'auto' }, 0.05)
      }
    }
    on(heart, 'click', pressHeart)
    on(backBtn, 'click', () => ctx.back())
    offs.push(press(backBtn, { sound: 'tap' }))

    // ── room tone ──
    const penOff = sound.layer('pen')
    offs.push(() => penOff?.())

    // ── debug ──
    if (ctx.params.has('debug')) {
      window.__desk = {
        phase: () => phase,
        skip() {
          if (phase === 'dark') lightOn()
          if (phase === 'lighting') lightTl?.progress(1)
          if (phase === 'lit') openLetter()
          if (phase === 'opening') openTl?.progress(1)
          showAll()
        },
      }
      offs.push(() => delete window.__desk)
    }

    teardown = () => {
      if (dead) return
      dead = true
      allCtl.abort()
      paraCtl?.abort()
      psCtl?.abort()
      cancelHold()
      skipGap()
      live.forEach((a) => a.kill())
      live.clear()
      offs.forEach((fn) => fn())
      gsap.killTweensOf([study, windowEl, chain, sway, glow, beam, envelope, seal, flap, flapOpen, envLetter, sheet, scroller, nib, hint, heart, heartFace, pressLabel, end, ring, ringFill, prompt, ...creases])
    }
    ctx.onCleanup(teardown)
  },
  unmount() {
    teardown?.()
    teardown = null
  },
}
