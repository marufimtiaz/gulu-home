/*
 * Desk art — inline SVG, paper cut-outs with ink outlines. Colours live in scene.css (classes),
 * so this file is shapes only.
 *
 *   deskSVG()      the desk vignette, viewBox 0 0 400 340: books, lamp (+ beam), inkpot & pen,
 *                  desk with a drawer. The chain and the envelope are HTML laid over it at
 *                  the points in DESK below.
 *   windowSVG()    the study window: arched, shutters open, moon and stars (viewBox 0 0 200 250)
 *   envelopeSVG()  sealed envelope (viewBox 0 0 160 100; the open flap grows above it)
 *   nibSVG()       a fountain pen whose tip is at (0, 0)
 *   heartSVG()     the stamp's heart
 *   ringSVG()      progress ring for the long-press
 */

/** Where things sit in the desk vignette (viewBox units), for the HTML laid over it. */
export const DESK = {
  w: 400,
  h: 340,
  chain: { x: 130, y: 129 }, // where the pull-chain hangs from the shade
  pool: { x: 168, y: 232 }, // centre of the lamp's pool of light on the desk
  envelope: { x: 166, y: 162, w: 150, h: 94 },
}

export const HEART = 'M12 21s-7.5-4.6-10-9.3C.3 8.5 1.6 4.6 5.2 3.7 7.6 3.1 10 4.2 12 6.6c2-2.4 4.4-3.5 6.8-2.9 3.6.9 4.9 4.8 3.2 8C19.5 16.4 12 21 12 21z'

const motes = () => {
  // dust in the lamp beam (only visible once the lamp is on)
  const pts = [[70, 160], [98, 182], [128, 150], [150, 204], [84, 214], [176, 196], [118, 226], [204, 222], [60, 196], [142, 176]]
  return pts.map(([x, y], i) => `<circle class="mote" cx="${x}" cy="${y}" r="${(1 + (i % 3) * 0.4).toFixed(1)}" style="--i:${i}"/>`).join('')
}

export function deskSVG() {
  return `
  <svg class="desk-art" viewBox="0 0 400 340" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="desk-beam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--lamp)" stop-opacity=".55"/>
        <stop offset="1" stop-color="var(--lamp)" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <!-- the desk's top face (objects stand on it) -->
    <path class="d-top" d="M20 224 H380 L396 238 H4 Z"/>
    <path class="d-grain" d="M60 230 H170 M220 228 H330 M110 234 H260"/>

    <!-- books -->
    <g class="d-books" data-poke>
      <rect class="bk bk--a" x="8" y="222" width="54" height="14" rx="2"/>
      <path class="ink-thin" d="M16 222 v14 M54 222 v14"/>
      <rect class="bk bk--b" x="13" y="209" width="46" height="13" rx="2"/>
      <path class="ink-thin" d="M20 209 v13"/>
      <rect class="bk bk--c" x="6" y="197" width="50" height="12" rx="2"/>
      <path class="ink-thin" d="M48 197 v12"/>
    </g>

    <!-- the lamp's beam and the dust in it -->
    <path class="d-beam" d="M44 130 L136 130 L322 236 L-14 236 Z" fill="url(#desk-beam)"/>
    <g class="d-motes">${motes()}</g>

    <!-- the lamp -->
    <g class="d-lamp" data-lamp>
      <path class="lamp-brass" d="M54 236 q0 -11 36 -11 q36 0 36 11 Z"/>
      <rect class="lamp-brass" x="86" y="124" width="8" height="104" rx="3"/>
      <circle class="lamp-brass" cx="90" cy="226" r="4"/>
      <path class="lamp-rim" d="M44 131 q46 10 92 0"/>
      <path class="lamp-bulb" d="M77 131 a13 11 0 0 0 26 0 Z"/>
      <path class="lamp-shade" d="M38 131 Q38 76 90 66 Q142 76 142 131 Z"/>
      <path class="lamp-shine" d="M56 118 Q58 88 84 78"/>
      <path class="ink-line" d="M36 131 H144"/>
      <circle class="lamp-brass" cx="90" cy="64" r="5"/>
    </g>

    <!-- inkpot and pen -->
    <g class="d-ink" data-poke>
      <path class="pen-body" d="M358 212 L374 160 q2 -5 6 -3 q4 2 2 7 L366 214 Z"/>
      <path class="pen-band" d="M369 176 l9 3.5 l-1.6 4 l-9 -3.5 Z"/>
      <path class="pot" d="M332 236 q-7 0 -7 -7 v-13 q0 -8 10 -9 h26 q10 1 10 9 v13 q0 7 -7 7 Z"/>
      <rect class="pot-neck" x="339" y="199" width="20" height="9" rx="2"/>
      <path class="pot-shine" d="M332 216 v8"/>
    </g>

    <!-- desk front, drawer, legs -->
    <rect class="d-edge" x="4" y="237" width="392" height="13" rx="3"/>
    <rect class="d-apron" x="16" y="250" width="368" height="34"/>
    <g class="d-drawer" data-poke>
      <rect class="d-drawer__face" x="146" y="255" width="108" height="24" rx="3"/>
      <circle class="lamp-brass" cx="200" cy="267" r="4.5"/>
    </g>
    <rect class="d-leg" x="26" y="284" width="18" height="60"/>
    <rect class="d-leg" x="356" y="284" width="18" height="60"/>
  </svg>`
}

export function windowSVG() {
  const stars = [[70, 64, 1.6], [86, 104, 1.1], [132, 128, 1.4], [76, 150, 1.2], [118, 176, 1.6], [138, 196, 1], [66, 196, 1.3], [104, 58, 1]]
  return `
  <svg class="win-art" viewBox="0 0 200 250" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="desk-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--night-deep)"/>
        <stop offset="1" stop-color="var(--indigo)"/>
      </linearGradient>
      <clipPath id="desk-pane"><path d="M56 222 V84 Q56 44 100 44 Q144 44 144 84 V222 Z"/></clipPath>
    </defs>
    <g class="shutter shutter--l" data-poke>
      <path class="sh" d="M6 52 H44 V226 H6 Z"/>
      <path class="ink-thin" d="M12 72 H38 M12 92 H38 M12 112 H38 M12 132 H38 M12 152 H38 M12 172 H38 M12 192 H38 M12 212 H38"/>
    </g>
    <g class="shutter shutter--r" data-poke>
      <path class="sh" d="M156 52 H194 V226 H156 Z"/>
      <path class="ink-thin" d="M162 72 H188 M162 92 H188 M162 112 H188 M162 132 H188 M162 152 H188 M162 172 H188 M162 192 H188 M162 212 H188"/>
    </g>
    <path class="win-frame" d="M44 230 V82 Q44 32 100 32 Q156 32 156 82 V230 Z"/>
    <path d="M56 222 V84 Q56 44 100 44 Q144 44 144 84 V222 Z" fill="url(#desk-sky)"/>
    <g clip-path="url(#desk-pane)">
      <g class="win-stars">${stars.map(([x, y, r], i) => `<circle class="wstar" cx="${x}" cy="${y}" r="${r}" style="--i:${i}"/>`).join('')}</g>
      <g class="win-moon" data-poke>
        <circle class="moon-glow" cx="120" cy="88" r="30"/>
        <circle class="moon" cx="120" cy="88" r="15"/>
        <circle class="moon-dent" cx="114" cy="84" r="3"/><circle class="moon-dent" cx="125" cy="94" r="2"/>
      </g>
      <path class="roofs" d="M56 222 V196 h14 v-10 h12 v14 h10 v-22 l8 -8 l8 8 v18 h14 v-8 h12 v12 h10 V222 Z"/>
      <g class="roof-lights"><rect x="72" y="192" width="4" height="4"/><rect x="104" y="186" width="4" height="4"/><rect x="128" y="200" width="4" height="4"/></g>
    </g>
    <path class="win-bar" d="M100 44 V222 M56 140 H144"/>
    <path class="ink-line" d="M56 222 V84 Q56 44 100 44 Q144 44 144 84 V222 Z" fill="none"/>
    <rect class="win-sill" x="34" y="224" width="132" height="12" rx="3"/>
    <g class="sill-plant" data-poke>
      <path class="leaf" d="M128 210 q-12 -14 -2 -24 q8 10 2 24 Z"/>
      <path class="leaf" d="M132 210 q8 -16 20 -14 q-4 12 -20 14 Z"/>
      <path class="plant-pot" d="M120 224 l3 -14 h18 l3 14 Z"/>
    </g>
  </svg>`
}

export function envelopeSVG() {
  return `
  <svg class="env" viewBox="0 0 160 100" aria-hidden="true" focusable="false">
    <rect class="env-shadow" x="8" y="16" width="152" height="86" rx="5"/>
    <rect class="env-back" x="4" y="10" width="152" height="86" rx="4"/>
    <path class="env-flap-open" data-flap-open d="M4 12 L80 -36 L156 12 Z"/>
    <g class="env-letter" data-env-letter>
      <rect x="14" y="14" width="132" height="72" rx="2"/>
      <path class="env-lines" d="M28 30 H118 M28 40 H130 M28 50 H110"/>
    </g>
    <path class="env-front" d="M4 14 L80 62 L156 14 V92 q0 4 -4 4 H8 q-4 0 -4 -4 Z"/>
    <path class="env-fold" d="M6 94 L64 52 M154 94 L96 52"/>
    <path class="env-flap" data-flap d="M4 12 L80 62 L156 12 Z"/>
    <g class="env-seal" data-seal>
      <circle cx="80" cy="60" r="13"/>
      <path class="env-seal__heart" d="${HEART}" transform="translate(72.2 52.4) scale(.65)"/>
    </g>
  </svg>`
}

export function nibSVG() {
  // tip at (0,0); the pen leans up and to the right, held in a right hand
  return `
  <svg viewBox="-30 -62 60 64" aria-hidden="true" focusable="false">
    <g transform="rotate(34)">
      <rect class="nib-body" x="-5.5" y="-62" width="11" height="40" rx="4"/>
      <rect class="nib-band" x="-5.5" y="-44" width="11" height="3.5"/>
      <rect class="nib-grip" x="-4.6" y="-24" width="9.2" height="7" rx="1.5"/>
      <path class="nib-tip" d="M0 0 L-4.6 -12 Q-4.6 -17 0 -18 Q4.6 -17 4.6 -12 Z"/>
      <path class="nib-slit" d="M0 -1 V-10"/>
      <circle class="nib-hole" cx="0" cy="-11" r="1.2"/>
    </g>
  </svg>`
}

export const heartSVG = () => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${HEART}"/></svg>`

export const ringSVG = () => `
  <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <circle class="ring-track" cx="24" cy="24" r="20"/>
    <circle class="ring-fill" cx="24" cy="24" r="20" pathLength="1"/>
  </svg>`
