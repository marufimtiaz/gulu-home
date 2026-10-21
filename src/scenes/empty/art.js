/*
 * Empty room art — inline SVG strings, cut-paper style (flat fills, ink outlines).
 * Same props as the house's window silhouette: a bare bulb, a ladder, a box.
 * Fills come from classes styled in scene.css (tokens only); paint colours from --c / --roll.
 */

/** The bare bulb on its cord. The whole svg swings from the ceiling (transform-origin top). */
export const bulbSVG = () => `
<svg class="e-bulb__svg" viewBox="-40 0 80 150" aria-hidden="true" focusable="false">
  <circle class="b-halo" cx="0" cy="112" r="38"/>
  <path class="b-cord" d="M0 0 V82"/>
  <path class="b-cord b-cord--twist" d="M-1.5 20 q3 4 0 8 q-3 4 0 8 q3 4 0 8 q-3 4 0 8"/>
  <rect class="b-socket" x="-8" y="80" width="16" height="16" rx="2.5"/>
  <path class="b-ink" d="M-8 86 h16 M-8 91 h16"/>
  <path class="b-glass" d="M-7 96 C-7 101 -17 104 -17 116 C-17 127 -9 134 0 134 C9 134 17 127 17 116 C17 104 7 101 7 96 Z"/>
  <path class="b-filament" d="M-4 98 V110 q2 -5 4 0 q2 5 4 0 V98"/>
  <path class="b-shine" d="M-10 112 q0 -6 4 -9"/>
</svg>`

/** A wooden ladder leaning against the wall (front view, slightly tapered). */
export const ladderSVG = () => {
  let rungs = ''
  for (let i = 0; i < 6; i++) {
    const y = 24 + i * 34
    const t = y / 230
    const l = 22 - 14 * t + 7
    const r = 50 + 10 * t - 7
    rungs += `<rect class="l-wood" x="${l.toFixed(1)}" y="${y}" width="${(r - l).toFixed(1)}" height="9" rx="2"/>`
  }
  return `
<svg class="e-ladder__svg" viewBox="0 0 80 232" aria-hidden="true" focusable="false">
  <path class="e-ink-shadow" d="M14 232 L26 6 L36 6 L26 232 Z M56 232 L50 6 L60 6 L68 232 Z" transform="translate(5 3)"/>
  ${rungs}
  <path class="l-wood" d="M8 230 L22 4 L31 4 L19 230 Z"/>
  <path class="l-wood" d="M52 230 L46 4 L55 4 L64 230 Z"/>
  <path class="l-drip" d="M24 60 q2 8 0 14 q-1 3 1 6 M50 120 q2 6 1 11"/>
  <rect class="l-foot" x="4" y="222" width="20" height="9" rx="3"/>
  <rect class="l-foot" x="48" y="222" width="20" height="9" rx="3"/>
</svg>`
}

/** A moving box: open flaps, tape, a scribbled heart. */
export const boxSVG = () => `
<svg class="e-box__svg" viewBox="0 0 132 108" aria-hidden="true" focusable="false">
  <path class="e-ink-shadow" d="M16 34 H122 V106 H16 Z" transform="translate(5 2)"/>
  <path class="x-flap x-flap--back" d="M22 34 L36 10 H108 L116 34 Z"/>
  <path class="x-side" d="M14 34 H118 V104 H14 Z"/>
  <path class="x-flap" d="M14 34 L2 54 L46 58 L58 34 Z"/>
  <path class="x-flap" d="M118 34 L130 52 L88 58 L76 34 Z"/>
  <rect class="x-tape" x="58" y="34" width="18" height="70"/>
  <path class="x-scribble" d="M30 78 c-6 -8 4 -14 8 -6 c4 -8 14 -2 8 6 l-8 9 Z"/>
  <path class="x-arrow" d="M96 92 V70 m-6 7 l6 -7 l6 7 M92 98 h8"/>
</svg>`

/** Paint tray on the floor, the roller resting in it (hidden while the roller works). */
export const traySVG = () => `
<svg class="e-tray__svg" viewBox="0 0 140 58" aria-hidden="true" focusable="false">
  <path class="e-ink-shadow" d="M6 30 H134 L124 56 H16 Z" transform="translate(4 2)"/>
  <path class="t-tray" d="M4 28 H136 L124 54 H16 Z"/>
  <path class="t-paint" d="M22 32 H118 L110 48 H30 Z"/>
  <path class="t-ridges" d="M84 34 l-4 12 M94 34 l-4 12 M104 34 l-4 12"/>
  <g class="t-roller" data-tray-roller>
    <path class="r-frame" d="M104 20 H122 V6 H140" fill="none"/>
    <rect class="r-grip" x="136" y="-2" width="10" height="26" rx="4" transform="rotate(70 141 11)"/>
    <rect class="r-roll" x="34" y="10" width="72" height="20" rx="9"/>
    <path class="r-nap" d="M44 14 v12 M56 14 v12 M68 14 v12 M80 14 v12 M92 14 v12"/>
  </g>
</svg>`

/** One paint can; its open lid shows the colour (--c on the button). */
export const canSVG = () => `
<svg class="e-can__svg" viewBox="0 0 64 70" aria-hidden="true" focusable="false">
  <path class="c-handle" d="M8 26 C8 2 56 2 56 26" fill="none"/>
  <path class="e-ink-shadow" d="M8 22 H56 V64 Q32 72 8 64 Z" transform="translate(3 2)"/>
  <path class="c-body" d="M7 22 H57 V62 Q32 70 7 62 Z"/>
  <path class="c-band" d="M7 34 H57 V50 Q32 56 7 50 Z"/>
  <ellipse class="c-rim" cx="32" cy="22" rx="25" ry="8"/>
  <ellipse class="c-paint" cx="32" cy="22" rx="20" ry="5.2"/>
  <path class="c-drip" d="M48 26 V36 q0 4 -3 4 q-3 0 -3 -4 V26 Z"/>
  <path class="c-shine" d="M14 38 V54"/>
</svg>`

/** The roller that paints the wall (absolute, moves over it). --roll is the paint colour. */
export const rollerSVG = () => `
<svg class="e-roller__svg" viewBox="0 0 96 150" aria-hidden="true" focusable="false">
  <path class="e-ink-shadow" d="M6 6 H90 V34 H6 Z" transform="translate(4 3)"/>
  <path class="r-frame" d="M90 20 H96 V60 H48 V96" fill="none"/>
  <rect class="r-grip" x="40" y="94" width="16" height="54" rx="7"/>
  <rect class="r-roll" x="2" y="4" width="88" height="32" rx="14"/>
  <path class="r-nap" d="M16 10 v20 M30 10 v20 M44 10 v20 M58 10 v20 M72 10 v20"/>
</svg>`

/** Marker pen icon for the "write it" button. */
export const markerSVG = () => `
<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  <path class="m-body" d="M21 4 L28 11 L13 26 L6 19 Z"/>
  <path class="m-cap" d="M21 4 L28 11 L25 14 L18 7 Z"/>
  <path class="m-tip" d="M6 19 L13 26 L6 28 L4 26 Z"/>
</svg>`
