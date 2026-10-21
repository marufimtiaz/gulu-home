/*
 * The memory polaroid (paper-craft, after site two's photo wall): taped corners, a photo or —
 * for a memory with no photo yet — its constellation sketched in ink on the paper, then a
 * handwritten title, the date (omitted when null) and the memory's text.
 *
 *   polaroidShell(t)                 → static HTML for the card (filled per memory)
 *   fillPolaroid(el, memory, opts)   → writes one memory into the card; returns { paper }
 */
import { sketchSVG } from './art.js'

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])

export function polaroidShell(t) {
  return `
    <article class="rt-polaroid" data-polaroid role="dialog" aria-modal="true" aria-labelledby="rt-pol-title" hidden>
      <span class="rt-tape rt-tape--l" aria-hidden="true"></span>
      <span class="rt-tape rt-tape--r" aria-hidden="true"></span>
      <div class="rt-polaroid__photo" data-polaroid-photo></div>
      <div class="rt-polaroid__words">
        <h2 class="rt-polaroid__title hand" id="rt-pol-title" data-polaroid-title></h2>
        <p class="rt-polaroid__date" data-polaroid-date-slot></p>
        <p class="rt-polaroid__text" data-polaroid-text></p>
        <button class="btn rt-polaroid__close" type="button" data-polaroid-close>${esc(t('rooftop.keep'))} <span aria-hidden="true">✦</span></button>
      </div>
    </article>`
}

/**
 * opts: { shape, photo: {src}|null, date: 'formatted'|'' , t, tilt }
 * A missing or broken photo falls back to the paper sketch.
 */
export function fillPolaroid(el, memory, { shape, photo, date, t, tilt = -2 }) {
  const box = el.querySelector('[data-polaroid-photo]')
  const paper = () => {
    el.classList.add('polaroid--paper')
    box.innerHTML = `${sketchSVG(shape)}<span class="rt-polaroid__drawn hand">${esc(t('rooftop.drawn'))}</span>`
  }
  el.classList.remove('polaroid--paper')
  el.style.setProperty('--tilt', `${tilt}deg`)
  if (photo?.src) {
    box.innerHTML = `<img alt="" decoding="async" src="${esc(photo.src)}">`
    const img = box.querySelector('img')
    img.addEventListener('error', paper, { once: true })
  } else {
    paper()
  }
  el.querySelector('[data-polaroid-title]').textContent = memory.title ?? ''
  // the date line exists only when there is a date (date: null omits it entirely)
  const slot = el.querySelector('[data-polaroid-date-slot]')
  slot.innerHTML = date ? `<span data-polaroid-date>${esc(date)}</span>` : ''
  slot.hidden = !date
  el.querySelector('[data-polaroid-text]').textContent = memory.text ?? ''
  return { paper: !photo?.src }
}
