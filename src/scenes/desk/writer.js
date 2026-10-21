/*
 * The pen. write(el, text, opts) lays the whole text out up front as one <span class="w"> per
 * word (so lines never reflow while it writes), then reveals the words one by one: each word
 * wipes in left → right (CSS clip-path transition, duration = its length × msPerChar) while
 * the nib glides along it in the same time. Punctuation gets a breath after it, like a hand
 * that pauses at a full stop.
 *
 *   write(el, text, { msPerChar = 35, onWord(word, i, span), signal, nib }) → Promise
 *
 * - The schedule is one GSAP timeline from moment() (reduced motion → same order, 4× faster).
 * - signal (AbortSignal) finishes at once: the rest of the words fade in together with a
 *   small stagger and the promise resolves. onWord is only called for words the pen wrote.
 * - nib: the element to glide (absolutely positioned in a positioned ancestor of el; its
 *   (0,0) should be the pen tip). Optional.
 */
import { gsap } from 'gsap'
import { moment } from '../../ui/choreo.js'

/** Extra pause after a word, in characters' worth of time. */
const BREATH = [
  [/[.!?।…]["'”’)]*$/, 9],
  [/[,;:]["'”’)]*$/, 4],
  [/^[—–-]$/, 3],
]
const breath = (word) => BREATH.find(([re]) => re.test(word))?.[1] ?? 0

export function write(el, text, { msPerChar = 35, onWord, signal, nib } = {}) {
  text = String(text ?? '')
  el.textContent = ''
  const words = []
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue
    if (/^\s+$/.test(part)) {
      el.append(part)
      continue
    }
    const w = document.createElement('span')
    w.className = 'w'
    w.textContent = part
    el.append(w)
    words.push(w)
  }

  let next = 0 // index of the first word not yet revealed
  const reveal = (i, dur) => {
    const w = words[i]
    w.style.setProperty('--d', `${Math.max(0, dur).toFixed(3)}s`)
    w.classList.add('w--on')
    next = i + 1
  }

  // with no time to spend, every word is "written" straight away
  if (!(msPerChar > 0) && !signal?.aborted) {
    words.forEach((w, i) => {
      reveal(i, 0)
      onWord?.(w.textContent, i, w)
    })
    placeNib(nib, words.at(-1), 'end')
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    let tl = null
    let finished = false
    const finish = (natural) => {
      if (finished) return
      finished = true
      tl?.kill()
      if (nib) gsap.killTweensOf(nib)
      if (!natural) {
        // the rest arrives together, a soft ripple rather than a jump
        for (let i = next, k = 0; i < words.length; i++, k++) {
          words[i].style.transitionDelay = `${Math.min(k * 12, 360)}ms`
          reveal(i, 0.2)
        }
      }
      placeNib(nib, words.at(-1), 'end')
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }
    const onAbort = () => finish(false)
    if (signal?.aborted || !words.length) return finish(!words.length)
    signal?.addEventListener('abort', onAbort, { once: true })

    tl = moment({ onComplete: () => finish(true) })
    const ms = msPerChar / 1000
    let at = 0
    words.forEach((w, i) => {
      const len = [...w.textContent].length
      const dur = len * ms
      tl.call(() => {
        const scale = tl.timeScale() || 1
        reveal(i, dur / scale)
        glide(nib, w, dur / scale)
        onWord?.(w.textContent, i, w)
      }, null, at)
      at += dur + ms * (1 + breath(w.textContent))
    })
    tl.set({}, {}, at) // the last word's breath belongs to it too
  })
}

/** Where a word sits, in the nib's positioning box: its left/right edge on the baseline. */
function spot(nib, w) {
  const box = nib.offsetParent ?? nib.parentElement
  if (!box || !w) return null
  const b = box.getBoundingClientRect()
  const r = w.getBoundingClientRect()
  const cs = getComputedStyle(w)
  const padL = parseFloat(cs.paddingLeft) || 0
  const padR = parseFloat(cs.paddingRight) || 0
  const padB = parseFloat(cs.paddingBottom) || 0
  const fs = parseFloat(cs.fontSize) || 16
  const y = r.bottom - b.top - padB - fs * 0.28 + (box.scrollTop || 0)
  return { left: r.left - b.left + padL, right: r.right - b.left - padR, y }
}

function glide(nib, w, dur) {
  if (!nib) return
  const s = spot(nib, w)
  if (!s) return
  gsap.killTweensOf(nib)
  gsap.fromTo(nib, { x: s.left, y: s.y }, { x: s.right, y: s.y, duration: Math.max(0.01, dur), ease: 'none' })
}

/** Rest the nib at the end (or start) of a word. Exported for resize / re-layout. */
export function placeNib(nib, w, where = 'end') {
  if (!nib) return
  const s = spot(nib, w)
  gsap.killTweensOf(nib)
  gsap.set(nib, s ? { x: where === 'end' ? s.right : s.left, y: s.y } : { x: 0, y: 0 })
}
