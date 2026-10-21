/*
 * Living-room scenery: everything that isn't the clock or the phone answers a tap like what
 * it is, and most of it escalates to a little payoff (a quip from strings.js, cycling).
 *
 *   plant      flutter; every 3rd tap it's a touch-me-not and folds its leaves shut ("Sensitive")
 *   lamp       flicker + buzz; every 3rd tap: load-shedding — the room goes dark, stutters back
 *   window     glass ting; every 3rd tap a shooting star crosses it ("make a wish, Noni")
 *   date plate sways on its chain from the clock; every 4th tap a line
 *   frames     a knock leaves one crooked, the next tap straightens it; all three level → "Topper"
 *   sofa       squish (a cushion dents where she taps); every 3rd tap something is found
 *              between the cushions (hair clips, rickshaw fare, a lacchi straw)
 *   pillows    squish; every 3rd tap a hug (hearts) and whose side it is
 *   rug        a soft squish
 *   shelf      knock, the books jiggle; every 3rd tap the leaning book lies down ("Ledu")
 *   hoop       sways from its screw; every 3rd tap the needle re-stitches the heart
 *   mugs       tip and clink; every 3rd tap they slide together — "cha for two"
 *
 * Each element carries data-react (react() sets it; bespoke handlers set it here).
 * Reduced motion: sounds, quips and state still happen; movement is skipped or instant.
 */
import { gsap } from 'gsap'
import { react } from '../../ui/react.js'
import { haptic } from '../../ui/feel.js'
import { CLOCK, FRAMES, PLANT } from './art.js'

export function scenery(root, ctx, { quip, flick, shed, busy }) {
  const { t, sound, fx, reduced } = ctx
  const offs = []
  const tws = new Set()
  const tw = (x) => (tws.add(x), x)
  const $ = (s) => root.querySelector(s)
  const line = (key, k) => {
    const list = t(`living.${key}`)
    return Array.isArray(list) ? list[k % list.length] : list
  }
  const sideOf = (e, el) => {
    const r = el.getBoundingClientRect()
    return e.clientX < r.left + r.width / 2 ? 1 : -1
  }
  /** a bespoke reaction: marks what it is (data-react) and answers every pointerdown */
  const bespoke = (el, kind, fn) => {
    el.dataset.react = kind
    const down = (e) => {
      haptic(kind === 'knock' || kind === 'tip' ? 8 : 4)
      fn(e)
    }
    el.addEventListener('pointerdown', down)
    offs.push(() => {
      el.removeEventListener('pointerdown', down)
      delete el.dataset.react
    })
  }

  // ── plant: a touch-me-not ──
  const leaves = [...root.querySelectorAll('.lv-leaf-g')]
  let folds = 0
  offs.push(
    react($('[data-poke="plant"]'), 'flutter', {
      target: $('[data-rustle]'),
      origin: `${PLANT.x} ${PLANT.y}`,
      svgOrigin: true,
      strength: 1.4,
      steps: [
        (n) => {
          if (n % 3) return
          sound.play('rustle')
          if (!reduced) {
            gsap.killTweensOf(leaves)
            tw(
              gsap
                .timeline()
                .to(leaves, { scaleX: 0.12, scaleY: 0.92, transformOrigin: '50% 100%', duration: 0.22, ease: 'power2.in', stagger: { each: 0.035, from: 'end' } })
                .to(leaves, { scaleX: 1, scaleY: 1, duration: 1.4, ease: 'sine.inOut', stagger: 0.09 }, '+=1.8'),
            )
          }
          quip.say(line('plant', folds++), $('[data-plant]'))
        },
      ],
    }),
  )

  // ── lamp: flicker, and now and then the current goes ──
  const lampEl = $('[data-poke="lamp"]')
  let sheds = 0
  offs.push(
    react(lampEl, 'flicker', {
      target: flick,
      steps: [
        (n) => {
          if (n % 3 || busy()) return
          const tl = tw(gsap.timeline())
          tl.to(flick, { opacity: 0, duration: 0.06, overwrite: true })
            .to(shed, { attr: { opacity: 0.5 }, duration: reduced ? 0 : 0.35, ease: 'power2.out' }, 0)
            .call(() => quip.say(line('shed', sheds), lampEl), null, 0.3)
            .call(() => sound.play('lampOn'), null, 1.9)
            .to(flick, { keyframes: [{ opacity: 0.7, duration: 0.05 }, { opacity: 0.1, duration: 0.09 }, { opacity: 1, duration: 0.3 }] }, 1.9)
            .to(shed, { attr: { opacity: 0 }, duration: reduced ? 0 : 0.4 }, 1.95)
          if (reduced) tl.timeScale(4)
          sheds++
        },
      ],
    }),
  )

  // ── window: glass, and a shooting star now and then ──
  const shoot = $('[data-shoot]')
  let wishes = 0
  offs.push(
    react($('[data-poke="window"]'), 'ring', {
      strength: 0.7,
      steps: [
        (n, e) => {
          if (n % 3) return
          sound.play('sparkle')
          if (!reduced) tw(gsap.fromTo(shoot, { x: 496, y: 128, opacity: 1 }, { x: 404, y: 166, opacity: 0, duration: 0.75, ease: 'power1.in' }))
          quip.say(line('wish', wishes++), { x: e.clientX, y: e.clientY - 20 })
        },
      ],
    }),
  )

  // ── the date plate swings on its chain under the clock ──
  const plate = $('[data-plate]')
  const swing = $('[data-plate-swing]')
  let plates = 0
  offs.push(
    react(plate, 'sway', {
      target: swing,
      origin: `${CLOCK.x} ${CLOCK.y + CLOCK.r}`,
      svgOrigin: true,
      strength: 0.6,
      sound: 'chain',
      steps: [(n) => n % 4 === 0 && !busy() && quip.say(line('plate', plates++), plate)],
    }),
  )

  // ── frames: knock one crooked, tap again to straighten; all level → Topper ──
  const frames = [...root.querySelectorAll('[data-swing]')].map((swingEl, i) => ({
    swingEl,
    tilt: swingEl.querySelector('[data-tilt]'),
    nail: `${FRAMES[i].x} ${FRAMES[i].y - 16}`,
    base: FRAMES[i].tilt,
    state: 'art', // art → crooked → level → crooked …
  }))
  let toppers = 0
  for (const f of frames) {
    bespoke(f.swingEl, 'sway', (e) => {
      const side = sideOf(e, f.swingEl)
      if (f.state === 'crooked') {
        // straighten: a careful nudge to dead level, a little click
        f.state = 'level'
        sound.play('tick')
        if (!reduced) {
          gsap.killTweensOf(f.tilt)
          tw(gsap.to(f.tilt, { rotation: -f.base, svgOrigin: f.nail, duration: 0.55, ease: 'back.out(1.6)' }))
        } else gsap.set(f.tilt, { rotation: -f.base, svgOrigin: f.nail })
        if (frames.every((x) => x.state === 'level')) {
          sound.play('chime')
          const r = frames[1].swingEl.getBoundingClientRect()
          if (!reduced) fx.sparkles?.(r.left + r.width / 2, r.top + r.height / 2, { count: 16 })
          quip.say(line('straight', toppers++), frames[1].swingEl)
        }
        return
      }
      // knocked: swings on its nail and comes to rest crooked
      f.state = 'crooked'
      sound.play('knock')
      const rest = side * (8 + Math.random() * 4)
      if (reduced) return void gsap.set(f.tilt, { rotation: rest, svgOrigin: f.nail })
      gsap.killTweensOf([f.tilt, f.swingEl])
      tw(gsap.to(f.tilt, { rotation: rest, svgOrigin: f.nail, duration: 1.1, ease: 'elastic.out(1, 0.35)' }))
      tw(
        gsap
          .timeline()
          .to(f.swingEl, { rotation: 9 * side, svgOrigin: f.nail, duration: 0.14, ease: 'power2.out' })
          .to(f.swingEl, { rotation: -5 * side, svgOrigin: f.nail, duration: 0.38, ease: 'sine.inOut' })
          .to(f.swingEl, { rotation: 2 * side, svgOrigin: f.nail, duration: 0.36, ease: 'sine.inOut' })
          .to(f.swingEl, { rotation: 0, svgOrigin: f.nail, duration: 0.4, ease: 'sine.out' }),
      )
    })
  }

  // ── sofa: cushions dent where she presses; things turn up between them ──
  const sofa = $('[data-poke="sofa"]')
  const found = $('[data-found]')
  const NS = 'http://www.w3.org/2000/svg'
  const ITEMS = [
    '<rect class="lv-item lv-item--clip" x="-11" y="-4" width="22" height="8" rx="4"/><circle class="lv-item lv-item--clip" cx="-11" cy="0" r="5"/>',
    '<rect class="lv-item lv-item--clip" x="-11" y="-4" width="22" height="8" rx="4"/><circle class="lv-item lv-item--clip" cx="-11" cy="0" r="5"/>',
    '<rect class="lv-item lv-item--note" x="-13" y="-7" width="26" height="14" rx="2"/><circle class="lv-item-mark" cx="0" cy="0" r="3.4"/>',
    '<path class="lv-item lv-item--straw" d="M-2 -16 L2 14 M-2 -16 q4 -6 10 -4"/>',
  ]
  let sofaTaps = 0
  let finds = 0
  bespoke(sofa, 'squish', (e) => {
    sofaTaps++
    sound.play('squish')
    const cushion = e.target.closest('.lv-cushion')
    if (!reduced) {
      const g = cushion ?? sofa
      const k = cushion ? 1 : 0.35
      gsap.killTweensOf(g)
      tw(
        gsap
          .timeline()
          .to(g, { scaleY: 1 - 0.2 * k, scaleX: 1 + 0.08 * k, transformOrigin: '50% 100%', duration: 0.1, ease: 'power2.out' })
          .to(g, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1.1, 0.35)' }),
      )
    }
    if (sofaTaps % 3) return
    const k = finds++
    const item = document.createElementNS(NS, 'g')
    item.innerHTML = ITEMS[k % ITEMS.length]
    found.append(item)
    const dx = (Math.random() < 0.5 ? -1 : 1) * (26 + Math.random() * 20)
    sound.play('pop')
    if (reduced) gsap.set(item, { x: 600 + dx, y: 624, rotation: 20 })
    const tl = tw(gsap.timeline({ onComplete: () => item.remove() }))
    if (!reduced) {
      tl.fromTo(item, { x: 600, y: 640, rotation: 0, scale: 0.4 }, { x: 600 + dx * 0.5, y: 580, rotation: dx * 2, scale: 1.25, duration: 0.3, ease: 'power2.out' })
        .to(item, { x: 600 + dx, y: 624, rotation: dx * 4, scale: 1, duration: 0.32, ease: 'bounce.out' })
    }
    tl.call(() => quip.say(line('found', k), item), null, reduced ? 0 : 0.35).to(item, { opacity: 0, duration: 0.4 }, '+=2.4')
  })

  // ── pillows: squish; every 3rd tap, a hug ──
  for (const [sel, key] of [['[data-poke="pillow-heart"]', 'pillowHeart'], ['[data-poke="pillow-sage"]', 'pillowSage']]) {
    const el = $(sel)
    let hugs = 0
    offs.push(
      react(el, 'squish', {
        steps: [
          (n) => {
            if (n % 3) return
            const r = el.getBoundingClientRect()
            if (!reduced) {
              tw(gsap.timeline().to(el, { scaleX: 0.78, scaleY: 1.1, transformOrigin: '50% 60%', duration: 0.18, ease: 'power2.out', overwrite: true }).to(el, { scaleX: 1, scaleY: 1, duration: 0.8, ease: 'elastic.out(1.1, 0.35)' }, '+=0.25'))
              fx.hearts?.(r.left + r.width / 2, r.top, { count: 5 })
            }
            quip.say(line(key, hugs++), el)
          },
        ],
      }),
    )
  }

  offs.push(react($('[data-poke="rug"]'), 'squish', { strength: 0.25, origin: '50% 50%' }))

  // ── bookshelf (wide screens): knock, the books jiggle; the leaning one lies down ──
  const shelf = $('[data-poke="shelf"]')
  const books = [...shelf.querySelectorAll('[data-book]')]
  const lazy = shelf.querySelector('[data-lazy]')
  let shelfTaps = 0
  let lying = false
  let lazies = 0
  bespoke(shelf, 'knock', () => {
    shelfTaps++
    sound.play('knock')
    if (!reduced) {
      gsap.killTweensOf(books)
      tw(gsap.timeline().to(books, { rotation: () => (Math.random() - 0.5) * 7, transformOrigin: '50% 100%', duration: 0.07, stagger: 0.02 }).to(books, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)', stagger: 0.02 }))
    }
    if (lying) {
      lying = false
      shelfTaps = 0
      tw(gsap.to(lazy, { rotation: 0, svgOrigin: '320 600', duration: reduced ? 0 : 0.5, ease: 'back.out(1.6)' }))
      return
    }
    if (shelfTaps % 3) return
    lying = true
    tw(gsap.to(lazy, { rotation: 64, svgOrigin: '320 600', duration: reduced ? 0 : 0.7, ease: 'bounce.out', delay: reduced ? 0 : 0.1 }))
    quip.say(line('lazy', lazies++), lazy)
  })

  // ── embroidery hoop: sways on its screw; the needle re-stitches the heart ──
  const hoop = $('[data-poke="hoop"]')
  const stitch = $('[data-stitch]')
  const thread = $('[data-thread]')
  let hoops = 0
  offs.push(
    react(hoop, 'sway', {
      origin: '900 366',
      svgOrigin: true,
      strength: 0.7,
      sound: 'rustle',
      steps: [
        (n) => {
          if (n % 3) return
          if (!reduced) {
            gsap.killTweensOf([stitch, thread])
            tw(
              gsap
                .timeline()
                .to(stitch, { opacity: 0.2, duration: 0.2 })
                .fromTo(thread, { strokeDashoffset: 100, opacity: 1 }, { strokeDashoffset: 0, duration: 1.3, ease: 'power1.inOut' })
                .to(stitch, { opacity: 1, duration: 0.3 })
                .to(thread, { opacity: 0, duration: 0.4 }, '<'),
            )
          }
          quip.say(line('hoop', hoops++), hoop)
        },
      ],
    }),
  )

  // ── two mugs: tip and clink; every 3rd tap they slide together ──
  const table = $('[data-poke="mugs"]')
  const mugs = [...table.querySelectorAll('[data-mug]')]
  let mugTaps = 0
  let chais = 0
  bespoke(table, 'tip', (e) => {
    mugTaps++
    const side = sideOf(e, table)
    sound.play('ting', { i: 5 + (mugTaps % 3) })
    if (mugTaps % 3) {
      if (reduced) return
      gsap.killTweensOf(mugs)
      tw(
        gsap
          .timeline()
          .to(mugs, { rotation: 8 * side, transformOrigin: side > 0 ? '100% 100%' : '0% 100%', duration: 0.1, ease: 'power2.out', stagger: 0.05 })
          .to(mugs, { rotation: 0, duration: 0.55, ease: 'elastic.out(1, 0.4)', stagger: 0.05 }),
      )
      return
    }
    if (!reduced) {
      gsap.killTweensOf(mugs)
      tw(
        gsap
          .timeline()
          .to(mugs[0], { x: 9, rotation: 6, transformOrigin: '50% 100%', duration: 0.3, ease: 'power2.in' })
          .to(mugs[1], { x: -6, rotation: -6, transformOrigin: '50% 100%', duration: 0.3, ease: 'power2.in' }, '<')
          .call(() => {
            sound.play('ting', { i: 7 })
            const r = table.getBoundingClientRect()
            fx.hearts?.(r.left + r.width * 0.4, r.top + 4, { count: 3 })
          })
          .to(mugs, { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' })
          .to(mugs, { x: 0, duration: 0.6, ease: 'power2.inOut' }, '+=1.6'),
      )
    }
    quip.say(line('chai', chais++), table)
  })

  return () => {
    offs.forEach((fn) => fn())
    tws.forEach((x) => x.kill())
    gsap.killTweensOf([...leaves, ...books, ...mugs, lazy, stitch, thread, shoot, shed, flick, swing, ...frames.flatMap((f) => [f.swingEl, f.tilt])])
    found.replaceChildren()
  }
}
