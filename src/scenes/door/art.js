/*
 * Door art — inline SVG strings, cut-paper style. Colours come from classes in scene.css
 * (which mix the design tokens), so nothing here carries a hex value.
 *
 * Coordinate systems:
 *   porch   viewBox 0 0 440 640 — the opening is x 110‥330, arch centre (220,240) r 110,
 *           sill at y 548, floor line at y 564 (88.125 %).
 *   leaf / inside   viewBox 0 0 220 418 — the opening itself.
 *   lock    viewBox 0 0 200 200 — centre (100,100).
 */

const r1 = (n) => Math.round(n * 10) / 10

/** A heart centred on (cx, cy), roughly s wide. */
export function heart(cx, cy, s) {
  const k = s / 20
  const p = (x, y) => `${r1(cx + x * k)},${r1(cy + y * k)}`
  return `M${p(0, 7)} C${p(-3, 4)} ${p(-10, 0)} ${p(-10, -4.5)} C${p(-10, -9)} ${p(-5, -11)} ${p(0, -6)} C${p(5, -11)} ${p(10, -9)} ${p(10, -4.5)} C${p(10, 0)} ${p(3, 4)} ${p(0, 7)} Z`
}

/** A four-point paper star. */
const sparkle = (cx, cy, s) =>
  `M${cx},${cy - s} Q${cx + s * 0.18},${cy - s * 0.18} ${cx + s},${cy} Q${cx + s * 0.18},${cy + s * 0.18} ${cx},${cy + s} Q${cx - s * 0.18},${cy + s * 0.18} ${cx - s},${cy} Q${cx - s * 0.18},${cy - s * 0.18} ${cx},${cy - s} Z`

/** A leaf from (0,0) growing up, length l, half-width w — rotate it into place. */
const leafPath = (l, w) => `M0,0 C${-w},${-l * 0.3} ${-w * 0.8},${-l * 0.8} 0,${-l} C${w * 0.8},${-l * 0.8} ${w},${-l * 0.3} 0,0 Z`

function leaf(x, y, angle, l, w, cls) {
  return `<g transform="translate(${x},${y}) rotate(${angle})">
    <path class="${cls}" d="${leafPath(l, w)}"/>
    <path class="rib" d="M0,-2 Q${w * 0.12},${-l * 0.5} 0,${-l * 0.9}"/>
  </g>`
}

function flower(x, y, r, cls) {
  let petals = ''
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    petals += `<circle class="${cls}" cx="${r1(x + Math.cos(a) * r)}" cy="${r1(y + Math.sin(a) * r)}" r="${r1(r * 0.78)}"/>`
  }
  return `${petals}<circle class="fl-eye" cx="${x}" cy="${y}" r="${r1(r * 0.55)}"/>`
}

/** Shared <defs>: shadows, glow gradients. Rendered once in a zero-size svg. */
export function defsSVG() {
  return `<svg class="door-defs" width="0" height="0" aria-hidden="true" focusable="false">
  <defs>
    <filter id="door-lift" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow class="lift" dx="0" dy="5" stdDeviation="2.2"/>
    </filter>
    <filter id="door-lift-sm" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow class="lift" dx="0" dy="3" stdDeviation="1.4"/>
    </filter>
    <radialGradient id="door-glow">
      <stop offset="0" class="st-lamp" stop-opacity=".95"/>
      <stop offset=".35" class="st-lamp" stop-opacity=".42"/>
      <stop offset="1" class="st-lamp" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="door-spill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="st-lamp" stop-opacity=".85"/>
      <stop offset="1" class="st-lamp" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="door-inside" cx=".5" cy=".28" r=".85">
      <stop offset="0" class="st-moon"/>
      <stop offset=".3" class="st-lamp"/>
      <stop offset="1" class="st-mustard"/>
    </radialGradient>
    <radialGradient id="door-brass" cx=".36" cy=".3" r=".8">
      <stop offset="0" class="st-butter"/>
      <stop offset=".55" class="st-mustard"/>
      <stop offset="1" class="st-brass-lo"/>
    </radialGradient>
    <clipPath id="door-arch" clipPathUnits="userSpaceOnUse">
      <path d="M0,418 V110 A110,110 0 0 1 220,110 V418 Z"/>
    </clipPath>
  </defs>
</svg>`
}

/** Sky strip: a paper moon and a few cut-paper stars (the fx starfield twinkles behind). */
export function skySVG() {
  const stars = [
    [8, 30, 7], [22, 68, 5], [37, 22, 4], [55, 58, 6], [64, 18, 4], [90, 62, 5], [47, 80, 3],
  ]
  return `${stars
    .map(([x, y, s]) => `<svg class="pstar" style="left:${x}%;top:${y}%" width="${s * 2 + 4}" height="${s * 2 + 4}" viewBox="${-s - 2} ${-s - 2} ${s * 2 + 4} ${s * 2 + 4}" aria-hidden="true"><path d="${sparkle(0, 0, s)}"/></svg>`)
    .join('')}
  <svg class="moon" viewBox="0 0 80 80" aria-hidden="true">
    <circle class="moon__halo" cx="40" cy="40" r="38"/>
    <path class="moon__body" d="M52,12 A30,30 0 1 0 66,52 A24,24 0 1 1 52,12 Z"/>
    <circle class="moon__pit" cx="30" cy="50" r="3"/>
    <circle class="moon__pit" cx="40" cy="62" r="2"/>
  </svg>`
}

/** Front layer of the porch: canopy, casing, lamp, step, mat, plants, light spill. */
export function porchSVG() {
  // left plant: tall paper leaves fanning from the pot
  const leaves = [
    [-32, 112, 20, 'lf'], [-14, 140, 22, 'lf-lo'], [4, 128, 21, 'lf'], [22, 100, 19, 'lf-lo'],
    [-50, 82, 17, 'lf-lo'], [38, 76, 16, 'lf'],
  ]
    .map(([a, l, w, cls]) => leaf(56, 514, a, l, w, cls))
    .join('')
  const stems = [[376, 470], [392, 456], [406, 478], [384, 492]]
  const flowers = stems
    .map(([x, y], i) => `<path class="stem" d="M${386 + (i % 2) * 6},534 Q${(x + 388) / 2 + 4},${(y + 534) / 2} ${x},${y}"/>`)
    .join('')
  const blooms = stems.map(([x, y], i) => flower(x, y, 6.5, i % 2 ? 'fl-b' : 'fl-a')).join('')
  // doormat fringe
  let fringe = ''
  for (let y = 580; y <= 604; y += 4) fringe += `M134,${y} h-6 M306,${y} h6 `

  return `<svg class="porch-art" viewBox="0 0 440 640" aria-hidden="true" focusable="false">
  <circle class="lamp-glow" data-lamp-glow cx="392" cy="290" r="210" fill="url(#door-glow)"/>

  <g class="canopy" filter="url(#door-lift)">
    <path class="wall-hi" d="M60,104 L220,30 L380,104 Z"/>
    <path class="vent" d="${heart(220, 72, 26)}"/>
    <path class="roof" d="M22,102 L220,6 L418,102 L400,117 L220,31 L40,117 Z"/>
    <path class="roof-line" d="M34,108 L220,18 L406,108"/>
    <rect class="trim" x="46" y="102" width="348" height="14" rx="3"/>
    <path class="trim" d="M54,116 H80 L54,146 Z"/>
    <path class="trim" d="M386,116 H360 L386,146 Z"/>
  </g>

  <g class="casing" filter="url(#door-lift)">
    <path class="trim" fill-rule="evenodd" d="M92,566 V240 A128,128 0 0 1 348,240 V566 Z M110,548 V240 A110,110 0 0 1 330,240 V548 Z"/>
    <path class="trim-line" d="M101,546 V240 A119,119 0 0 1 339,240 V546"/>
    <path class="trim-hi" d="M210,111 H230 L234,133 H206 Z"/>
  </g>

  <g class="lamp" transform="translate(392,232) scale(1.3)">
    <rect class="iron" x="-31" y="2" width="10" height="38" rx="4"/>
    <path class="iron-arm" d="M-21,16 H-6 Q0,16 0,10 V6"/>
    <circle class="iron" cx="0" cy="5" r="3"/>
    <g class="lamp__light" data-lamp>
      <path class="lamp__glass" d="M-11,22 H11 L8,56 H-8 Z"/>
      <ellipse class="lamp__bulb" cx="0" cy="40" rx="4.5" ry="6.5"/>
    </g>
    <path class="lamp__bars" d="M0,22 V56 M-5.5,22 L-4,56 M5.5,22 L4,56"/>
    <path class="iron" d="M-14,22 H14 L7,9 H-7 Z"/>
    <rect class="iron" x="-11" y="55" width="22" height="5" rx="2"/>
    <circle class="iron" cx="0" cy="64" r="2.6"/>
  </g>

  <g class="step" filter="url(#door-lift-sm)">
    <rect class="stone-lo" x="68" y="554" width="304" height="13" rx="3"/>
    <rect class="stone" x="84" y="545" width="272" height="11" rx="3"/>
  </g>

  <g class="mat" filter="url(#door-lift-sm)">
    <path class="mat__fringe" d="${fringe}"/>
    <rect class="mat__base" x="134" y="576" width="172" height="32" rx="6"/>
    <rect class="mat__stripe" x="142" y="582" width="156" height="20" rx="3"/>
    <path class="mat__heart" d="${heart(220, 592, 14)}"/>
  </g>

  <path class="spill" data-spill d="M110,548 H330 L436,640 H4 Z" fill="url(#door-spill)"/>

  <g class="plant" filter="url(#door-lift)">
    ${leaves}
    <path class="pot" d="M28,520 L84,520 L78,566 L34,566 Z"/>
    <rect class="pot-rim" x="22" y="510" width="68" height="13" rx="3"/>
  </g>

  <g class="flowers" filter="url(#door-lift)">
    ${flowers}
    ${blooms}
    ${leaf(380, 532, -40, 26, 7, 'lf')}${leaf(400, 532, 38, 22, 6, 'lf-lo')}
    <path class="pot" d="M364,532 L414,532 L409,566 L369,566 Z"/>
    <rect class="pot-rim" x="360" y="524" width="58" height="11" rx="3"/>
  </g>
</svg>`
}

/** What she sees through the open door: a warm little hallway. */
export function insideSVG() {
  return `<svg class="inside-art" viewBox="0 0 220 418" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <g clip-path="url(#door-arch)">
    <rect class="in-wall" x="0" y="0" width="220" height="418"/>
    <rect x="0" y="0" width="220" height="418" fill="url(#door-inside)" opacity=".9"/>
    <path class="in-floor" d="M0,338 H220 V418 H0 Z"/>
    <path class="in-board" d="M0,338 H220 M60,338 L30,418 M110,338 V418 M160,338 L190,418"/>
    <path class="in-rug" d="M70,356 H150 L172,412 H48 Z"/>
    <rect class="in-frame" x="78" y="176" width="64" height="52" rx="3"/>
    <path class="in-heart" d="${heart(110, 202, 22)}"/>
    <path class="in-cord" d="M110,0 V92"/>
    <circle class="in-bulb" cx="110" cy="104" r="11"/>
  </g>
</svg>`
}

/** The door leaf itself (rotates open on its left hinge). The lock sits on top in HTML. */
export function leafSVG() {
  const mull = [36, 72, 108, 144]
    .map((a) => {
      const rad = (a * Math.PI) / 180
      return `M110,110 L${r1(110 + 82 * Math.cos(rad))},${r1(110 - 82 * Math.sin(rad))}`
    })
    .join(' ')
  return `<svg class="leaf-art" viewBox="0 0 220 418" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path class="leaf__face" d="M0,418 V110 A110,110 0 0 1 220,110 V418 Z"/>
  <path class="leaf__hi" d="M10,418 V110 A100,100 0 0 1 60,23"/>
  <path class="fan" data-fan d="M28,112 A82,82 0 0 1 192,112 Z"/>
  <path class="fan__bars" d="${mull}"/>
  <path class="fan__rim" d="M28,112 A82,82 0 0 1 192,112 Z"/>
  <rect class="leaf__rail" x="16" y="110" width="188" height="10" rx="3"/>

  <g class="plate" data-plate filter="url(#door-lift-sm)">
    <path class="twine" d="M110,136 L76,152 M110,136 L144,152"/>
    <circle class="brass" cx="110" cy="136" r="3.5"/>
    <rect class="plate__board" x="68" y="150" width="84" height="30" rx="8"/>
    <rect class="plate__edge" x="73" y="155" width="74" height="20" rx="5"/>
  </g>

  <circle class="leaf__recess" cx="110" cy="277" r="86"/>

  <rect class="panel" x="20" y="368" width="84" height="36" rx="6"/>
  <rect class="panel" x="116" y="368" width="84" height="36" rx="6"/>
  <rect class="panel__bevel" x="26" y="373" width="72" height="26" rx="4"/>
  <rect class="panel__bevel" x="122" y="373" width="72" height="26" rx="4"/>

  <circle class="brass knob" cx="205" cy="272" r="8"/>
  <circle class="knob__hi" cx="202.5" cy="269.5" r="2.4"/>
  <rect class="brass-lo" x="8" y="408" width="204" height="9" rx="2"/>
</svg>`
}

/** The brass clock-face lock: bezel, face, ticks, keyhole and the two hands. */
export function lockSVG() {
  let ticks = ''
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const big = i % 3 === 0
    const ri = big ? 62 : 66
    const ro = 73
    const s = Math.sin(a), c = -Math.cos(a)
    ticks += `<line class="${big ? 'tick tick--big' : 'tick'}" x1="${r1(100 + s * ri)}" y1="${r1(100 + c * ri)}" x2="${r1(100 + s * ro)}" y2="${r1(100 + c * ro)}"/>`
  }
  let rivets = ''
  for (const a of [45, 135, 225, 315]) {
    const rad = (a * Math.PI) / 180
    rivets += `<circle class="rivet" cx="${r1(100 + Math.cos(rad) * 89)}" cy="${r1(100 + Math.sin(rad) * 89)}" r="2.6"/>`
  }
  return `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
  <circle class="lock__bezel" cx="100" cy="100" r="96" fill="url(#door-brass)"/>
  ${rivets}
  <circle class="lock__face" cx="100" cy="100" r="80"/>
  <circle class="lock__glow" cx="100" cy="100" r="80"/>
  ${ticks}
  <text class="lock__num" x="100" y="54">12</text>
  <text class="lock__num" x="151" y="106">3</text>
  <text class="lock__num" x="49" y="106">9</text>
  <path class="lock__keyhole" d="M100,121 a7,7 0 0 1 4,12.8 L107,148 H93 L96,133.8 A7,7 0 0 1 100,121 Z"/>
  <g class="hand hand--hour" data-hand="hour">
    <path d="M100,112 C93,104 92,78 100,56 C108,78 107,104 100,112 Z"/>
  </g>
  <g class="hand hand--minute" data-hand="minute">
    <path d="M98.2,118 L98.8,36 H101.2 L101.8,118 Z"/>
    <circle cx="100" cy="121" r="4.5"/>
    <path class="hand__heart" d="${heart(100, 29, 15)}"/>
  </g>
  <circle class="lock__pin" cx="100" cy="100" r="7.5" fill="url(#door-brass)"/>
  <circle class="lock__pin-dot" cx="100" cy="100" r="2"/>
</svg>`
}

/** A dark cottage window with shutters and a flower box — wide screens only, to fill the wall. */
export function windowSVG() {
  return `<svg class="window-art" viewBox="0 0 160 200" aria-hidden="true" focusable="false">
  <g filter="url(#door-lift)">
    <rect class="shutter" x="0" y="20" width="30" height="140" rx="3"/>
    <rect class="shutter" x="130" y="20" width="30" height="140" rx="3"/>
    <path class="shutter-slat" d="M6,38 H24 M6,56 H24 M6,74 H24 M6,92 H24 M6,110 H24 M6,128 H24 M6,146 H24 M136,38 H154 M136,56 H154 M136,74 H154 M136,92 H154 M136,110 H154 M136,128 H154 M136,146 H154"/>
    <rect class="trim" x="28" y="12" width="104" height="156" rx="4"/>
    <rect class="win-glass" x="38" y="22" width="84" height="136" rx="2"/>
    <path class="win-curtain" d="M38,22 H62 Q54,80 66,158 H38 Z M122,22 H98 Q106,80 94,158 H122 Z"/>
    <path class="win-shine" d="M48,40 L64,28 M48,56 L78,32"/>
    <path class="win-bars" d="M80,22 V158 M38,90 H122"/>
    <rect class="trim" x="22" y="164" width="116" height="10" rx="3"/>
    <rect class="pot" x="30" y="174" width="100" height="22" rx="3"/>
    ${flower(48, 168, 5, 'fl-a')}${flower(70, 164, 5.5, 'fl-b')}${flower(92, 167, 5, 'fl-a')}${flower(113, 165, 5, 'fl-b')}
  </g>
</svg>`
}
