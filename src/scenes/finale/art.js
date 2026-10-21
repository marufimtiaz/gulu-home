/*
 * Finale art — the same front door as the door scene (copied, not imported: scenes never
 * import each other), now with the porch lamp on and the whole house lit above it: the
 * upper floor's windows, the roof terrace with its fairy lights, the stair hut and the
 * chimney. Every colour is a class (scene.css mixes the tokens), so there is no hex here.
 *
 * Canvas (viewBox "0 -40 440 980", overflow visible — the facade keeps going on wide screens):
 *   y -40‥92   sky + roof terrace (stair hut, water tank, chimney, railing, fairy lights)
 *   y 92‥112   eave
 *   y 112‥298  upper floor: desk + empty-room windows (more lit windows further out)
 *   y 300‥940  the porch, exactly the door scene's 440×640 porch shifted down by 300
 *              (door opening x 110‥330, leaf top y 430; floor line y 864)
 *   the door leaf's own 220×418 units map 1:1 onto canvas at (110, 430).
 */

export const VIEW = { x: 0, y: -40, w: 440, h: 980 }
export const PORCH_Y = 300
export const LEAF = { x: 110, y: 430 }
/** Brass hook on the door (canvas units): where the plate's twine hangs. */
export const HOOK = { x: 220, y: 556 }
/** Letterbox slot centre (canvas units). */
export const SLOT = { x: 220, y: 807 }
/** Chimney mouth (canvas units) — the hearts puff out of here. */
export const CHIMNEY = { x: 365, y: -36 }

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

function defs() {
  return `<defs>
    <filter id="fin-lift" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow class="lift" dx="0" dy="5" stdDeviation="2.2"/>
    </filter>
    <filter id="fin-lift-sm" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow class="lift" dx="0" dy="3" stdDeviation="1.4"/>
    </filter>
    <filter id="fin-pop" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow class="pop" dx="3" dy="4" stdDeviation="0"/>
    </filter>
    <radialGradient id="fin-glow">
      <stop offset="0" class="st-lamp" stop-opacity=".95"/>
      <stop offset=".35" class="st-lamp" stop-opacity=".42"/>
      <stop offset="1" class="st-lamp" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="fin-pane" cx=".5" cy=".62" r=".75">
      <stop offset="0" class="st-butter"/>
      <stop offset=".55" class="st-lamp"/>
      <stop offset="1" class="st-mustard"/>
    </radialGradient>
    <radialGradient id="fin-brass" cx=".36" cy=".3" r=".8">
      <stop offset="0" class="st-butter"/>
      <stop offset=".55" class="st-mustard"/>
      <stop offset="1" class="st-brass-lo"/>
    </radialGradient>
    <clipPath id="fin-slot-clip" clipPathUnits="userSpaceOnUse">
      <rect x="150" y="700" width="140" height="${SLOT.y - 700 + 1}"/>
    </clipPath>
  </defs>`
}

// ───────────────────────────── fairy lights ─────────────────────────────

function swag(a, b, sag, n) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t)])
  }
  return pts
}

/** Bulbs come back in string order, so a chase runs along the wire. */
function fairyLights() {
  const strings = []
  // along the roof railing, both ways out from the middle
  for (let x = -700; x < 1600; x += 110) strings.push(swag([x, 54], [x + 110, 54], 12, 8))
  // overhead: stair-hut roof → chimney, wedding-house style
  strings.push(swag([112, -18], [352, -14], 34, 16))
  // the porch gable, both slopes
  strings.push(swag([30, 404], [216, 312], 10, 12))
  strings.push(swag([224, 312], [410, 404], 10, 12))
  // cascades down the facade — the morich-bati strands every wedding house wears
  const drops = []
  for (const x of [10, 430, -300, 740, -620, 1060]) drops.push(Array.from({ length: 16 }, (_, i) => [x, 120 + i * 11]))

  let wires = ''
  let bulbs = ''
  let k = 0
  for (const s of strings) {
    wires += `<polyline points="${s.map((p) => p.map(r1).join(',')).join(' ')}"/>`
    for (const [x, y] of s.slice(1, -1)) {
      bulbs += `<circle class="fairy fairy--${k % 5}" data-fairy cx="${r1(x)}" cy="${r1(y + 3)}" r="3.2"/>`
      k++
    }
  }
  for (const s of drops) {
    wires += `<path d="M${s[0][0]} 112 V${s.at(-1)[1]}"/>`
    for (const [x, y] of s) {
      bulbs += `<circle class="fairy fairy--${k % 5}" data-fairy cx="${x}" cy="${y}" r="2.8"/>`
      k++
    }
  }
  return `<g class="fairy-wire">${wires}</g><g class="fairy-bulbs">${bulbs}</g>`
}

// ───────────────────────────── windows ─────────────────────────────

// warm silhouettes through the glass (from the hub's interiors), in an 84×80 box
const INTERIORS = {
  living: `<path d="M10 72 V52 q0 -6 6 -6 h46 q6 0 6 6 V72 Z"/><rect x="6" y="54" width="10" height="14" rx="4"/><rect x="62" y="54" width="10" height="14" rx="4"/><path class="open" d="M70 72 V20 M64 20 h12 l-3 -9 h-6 Z"/><rect class="open" x="30" y="14" width="18" height="14" rx="1"/>`,
  kitchen: `<path class="open" d="M42 0 V16"/><path d="M32 24 q10 -12 20 0 Z"/><rect x="6" y="40" width="72" height="4"/><rect x="10" y="30" width="8" height="10" rx="2"/><rect x="21" y="27" width="7" height="13" rx="2"/><rect x="31" y="32" width="9" height="8" rx="2"/><path d="M52 60 h22 v-10 h-22 Z"/>`,
  desk: `<rect x="8" y="58" width="56" height="5"/><path class="open" d="M12 63 V80 M60 63 V80 M18 58 l8 -18 l10 6"/><path d="M22 34 l12 -2 l-2 10 Z"/><rect x="44" y="48" width="14" height="4"/><rect x="46" y="44" width="12" height="4"/><rect x="45" y="40" width="10" height="4"/>`,
  empty: `<path class="open" d="M42 0 V26 M14 80 L24 36 M30 80 L36 36 M20 50 h14 M17 64 h15"/><circle cx="42" cy="31" r="5"/><rect x="52" y="64" width="22" height="16" rx="1"/>`,
}

/**
 * A lit cottage window, door-scene style (shutters, trim, curtains, flower box), in a
 * 160×200 box; place it with transform. Its glow + halo flare in the celebration.
 */
function cottageWindow(id, transform, { inside = INTERIORS[id] ?? '', arch = false } = {}) {
  const glass = arch ? 'M38,158 V46 Q38,22 80,22 Q122,22 122,46 V158 Z' : 'M38,22 H122 V158 H38 Z'
  const frame = arch ? 'M28,168 V44 Q28,12 80,12 Q132,12 132,44 V168 Z' : 'M28,12 H132 V168 H28 Z'
  return `<g transform="${transform}"><g class="fwin fwin--${id} pokeable" data-win="${id}">
    <ellipse class="fw-halo" data-halo cx="80" cy="92" rx="118" ry="128" fill="url(#fin-glow)"/>
    <g filter="url(#fin-lift)">
      <rect class="shutter" x="0" y="20" width="30" height="140" rx="3"/>
      <rect class="shutter" x="130" y="20" width="30" height="140" rx="3"/>
      <path class="shutter-slat" d="M6,38 H24 M6,56 H24 M6,74 H24 M6,92 H24 M6,110 H24 M6,128 H24 M6,146 H24 M136,38 H154 M136,56 H154 M136,74 H154 M136,92 H154 M136,110 H154 M136,128 H154 M136,146 H154"/>
      <path class="trim" d="${frame}"/>
      <path class="win-glass" d="${glass}"/>
      <path class="fw-glow" data-glow d="${glass}" fill="url(#fin-pane)"/>
      <g class="win-inside" transform="translate(38 78)">${inside}</g>
      <path class="win-curtain" d="M38,22 H62 Q54,80 66,158 H38 Z M122,22 H98 Q106,80 94,158 H122 Z"/>
      <path class="win-shine" d="M48,48 L64,34 M48,64 L78,40"/>
      <path class="win-bars" d="M80,22 V158 M38,90 H122"/>
      <path class="win-edge" d="${glass}"/>
      <rect class="trim" x="22" y="164" width="116" height="10" rx="3"/>
      <rect class="pot" x="30" y="174" width="100" height="22" rx="3"/>
      ${flower(48, 168, 5, 'fl-a')}${flower(70, 164, 5.5, 'fl-b')}${flower(92, 167, 5, 'fl-a')}${flower(113, 165, 5, 'fl-b')}
    </g>
  </g></g>`
}

// ───────────────────────────── roof terrace ─────────────────────────────

function roof() {
  let balusters = ''
  for (let x = -1800; x < 2240; x += 9) balusters += `M${x} 60 V84 `
  let bricks = ''
  for (let y = -12; y < 92; y += 12) bricks += `M352 ${y} H378 `
  return `
  <g class="roof-terrace">
    <!-- the stair hut (chilekotha) every Dhaka roof has; its lamp is the rooftop's window -->
    <g class="hut pokeable" data-poke="hut">
      <rect class="shadow" x="30" y="-14" width="86" height="106"/>
      <rect class="hut__wall" x="26" y="-18" width="86" height="110"/>
      <path class="hut__roof" d="M16,-16 L122,-30 L122,-18 L16,-6 Z"/>
      <g class="fwin fwin--rooftop" data-win="rooftop">
        <ellipse class="fw-halo" data-halo cx="69" cy="34" rx="70" ry="64" fill="url(#fin-glow)"/>
        <path class="win-glass" d="M50,74 V20 a19,15 0 0 1 38,0 V74 Z"/>
        <path class="fw-glow" data-glow d="M50,74 V20 a19,15 0 0 1 38,0 V74 Z" fill="url(#fin-pane)"/>
        <path class="win-inside open" d="M54 70 h8 v-8 h8 v-8 h8 v-8 h8"/>
        <path class="win-edge" d="M50,74 V20 a19,15 0 0 1 38,0 V74 Z"/>
        <circle class="brass" cx="81" cy="52" r="2.4"/>
      </g>
    </g>
    <!-- water tank on its stand -->
    <g class="tank pokeable" data-poke="tank">
      <path class="ink-line" d="M236 84 V40 M270 84 V40 M236 60 L270 84 M270 60 L236 84"/>
      <rect class="shadow" x="232" y="8" width="46" height="36" rx="7"/>
      <rect class="tank__body" x="228" y="4" width="46" height="36" rx="7"/>
      <path class="faint" d="M228 17 H274 M228 28 H274"/>
      <rect class="tank__lid" x="240" y="-3" width="22" height="8" rx="2"/>
    </g>
    <!-- chimney: the hearts come out of here -->
    <g class="chimney" data-chimney>
      <rect class="shadow" x="356" y="-20" width="26" height="112"/>
      <rect class="brick" x="352" y="-24" width="26" height="116"/>
      <path class="faint" d="${bricks} M365 -12 V0 M359 0 V12 M371 12 V24 M361 24 V36 M369 36 V48 M359 48 V60"/>
      <rect class="chimney__cap" data-cap x="346" y="-34" width="38" height="11" rx="2"/>
    </g>
    <g class="rail">
      <path class="ink-line baluster" d="${balusters}"/>
      <rect class="rail__bar" x="-1800" y="54" width="4040" height="7" rx="2"/>
      <rect class="rail__bar" x="-1800" y="80" width="4040" height="6" rx="1"/>
    </g>
    <!-- a cat on the terrace, watching the fireworks -->
    <path class="cat pokeable" data-poke="cat" d="M178 84 q-2 -16 5 -23 l-1 -9 l6 6 q3 -1 7 0 l6 -6 l-1 9 q7 7 5 23 Z M200 82 q14 2 12 -12"/>
  </g>`
}

/** The upper floor (windows lit) and the roof edge above it. */
function upper() {
  return `
  <g class="upper">
    <rect class="eave" x="-1800" y="90" width="4040" height="22"/>
    <path class="eave__scallops" d="${scallops(-1792, 2240, 112)}"/>
    ${cottageWindow('desk', 'translate(36 120) scale(0.78)', { arch: true })}
    ${cottageWindow('empty', 'translate(279 120) scale(0.78)', { arch: true })}
    ${cottageWindow('upper-l', 'translate(-224 120) scale(0.78)', { inside: INTERIORS.desk, arch: true })}
    ${cottageWindow('upper-r', 'translate(539 120) scale(0.78)', { inside: INTERIORS.empty, arch: true })}
    ${cottageWindow('upper-ll', 'translate(-484 120) scale(0.78)', { inside: INTERIORS.living, arch: true })}
    ${cottageWindow('upper-rr', 'translate(799 120) scale(0.78)', { inside: INTERIORS.kitchen, arch: true })}
    <rect class="trim" x="-1800" y="284" width="4040" height="12"/>
    <path class="trim-line" d="M-1800 290 H2240"/>
  </g>`
}

function scallops(x0, x1, y) {
  let d = `M${x0} ${y}`
  for (let x = x0; x < x1; x += 32) d += ` a16,15 0 0 0 32,0`
  return d
}

// ───────────────────────────── the porch (from the door scene) ─────────────────────────────

function porch() {
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
  let fringe = ''
  for (let y = 580; y <= 604; y += 4) fringe += `M134,${y} h-6 M306,${y} h6 `

  return `<g class="porch" transform="translate(0 ${PORCH_Y})">
  <circle class="lamp-glow" data-lamp-glow cx="392" cy="290" r="210" fill="url(#fin-glow)"/>

  <g class="canopy" filter="url(#fin-lift)">
    <path class="wall-hi" d="M60,104 L220,30 L380,104 Z"/>
    <path class="vent" d="${heart(220, 72, 26)}"/>
    <path class="roof" d="M22,102 L220,6 L418,102 L400,117 L220,31 L40,117 Z"/>
    <path class="roof-line" d="M34,108 L220,18 L406,108"/>
    <rect class="trim" x="46" y="102" width="348" height="14" rx="3"/>
    <path class="trim" d="M54,116 H80 L54,146 Z"/>
    <path class="trim" d="M386,116 H360 L386,146 Z"/>
  </g>

  <g class="casing" filter="url(#fin-lift)">
    <path class="trim" fill-rule="evenodd" d="M92,566 V240 A128,128 0 0 1 348,240 V566 Z M110,548 V240 A110,110 0 0 1 330,240 V548 Z"/>
    <path class="trim-line" d="M101,546 V240 A119,119 0 0 1 339,240 V546"/>
    <path class="trim-hi" d="M210,111 H230 L234,133 H206 Z"/>
  </g>

  <g transform="translate(392,232) scale(1.3)"><g class="lamp pokeable" data-poke="lamp">
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
  </g></g>

  <g class="step" filter="url(#fin-lift-sm)">
    <rect class="stone-lo" x="68" y="554" width="304" height="13" rx="3"/>
    <rect class="stone" x="84" y="545" width="272" height="11" rx="3"/>
  </g>

  <g class="mat pokeable" data-poke="mat" filter="url(#fin-lift-sm)">
    <path class="mat__fringe" d="${fringe}"/>
    <rect class="mat__base" x="134" y="576" width="172" height="32" rx="6"/>
    <rect class="mat__stripe" x="142" y="582" width="156" height="20" rx="3"/>
    <path class="mat__heart" d="${heart(220, 592, 14)}"/>
  </g>

  <g class="plant pokeable" data-poke="plant" filter="url(#fin-lift)">
    ${leaves}
    <path class="pot" d="M28,520 L84,520 L78,566 L34,566 Z"/>
    <rect class="pot-rim" x="22" y="510" width="68" height="13" rx="3"/>
  </g>

  <g class="flowers pokeable" data-poke="flowers" filter="url(#fin-lift)">
    ${flowers}
    ${blooms}
    ${leaf(380, 532, -40, 26, 7, 'lf')}${leaf(400, 532, 38, 22, 6, 'lf-lo')}
    <path class="pot" d="M364,532 L414,532 L409,566 L369,566 Z"/>
    <rect class="pot-rim" x="360" y="524" width="58" height="11" rx="3"/>
  </g>
</g>`
}

/** The brass clock lock, hands resting at the answer (the time it opened). */
function lock(hour, minute) {
  let ticks = ''
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const big = i % 3 === 0
    const ri = big ? 62 : 66
    const s = Math.sin(a), c = -Math.cos(a)
    ticks += `<line class="${big ? 'tick tick--big' : 'tick'}" x1="${r1(100 + s * ri)}" y1="${r1(100 + c * ri)}" x2="${r1(100 + s * 73)}" y2="${r1(100 + c * 73)}"/>`
  }
  let rivets = ''
  for (const a of [45, 135, 225, 315]) {
    const rad = (a * Math.PI) / 180
    rivets += `<circle class="rivet" cx="${r1(100 + Math.cos(rad) * 89)}" cy="${r1(100 + Math.sin(rad) * 89)}" r="2.6"/>`
  }
  const mDeg = minute * 6
  const hDeg = ((hour % 12) * 60 + minute) * 0.5
  return `<svg class="lock" x="28" y="192" width="164" height="164" viewBox="0 0 200 200" overflow="visible">
  <g filter="url(#fin-pop)">
    <circle class="lock__bezel" cx="100" cy="100" r="96" fill="url(#fin-brass)"/>
    ${rivets}
    <circle class="lock__face" cx="100" cy="100" r="80"/>
    <circle class="lock__glow" cx="100" cy="100" r="80"/>
    ${ticks}
    <text class="lock__num" x="100" y="54">12</text>
    <text class="lock__num" x="151" y="106">3</text>
    <text class="lock__num" x="49" y="106">9</text>
    <path class="lock__keyhole" d="M100,121 a7,7 0 0 1 4,12.8 L107,148 H93 L96,133.8 A7,7 0 0 1 100,121 Z"/>
    <g class="hand" transform="rotate(${hDeg} 100 100)">
      <path d="M100,112 C93,104 92,78 100,56 C108,78 107,104 100,112 Z"/>
    </g>
    <g class="hand" transform="rotate(${mDeg} 100 100)">
      <path d="M98.2,118 L98.8,36 H101.2 L101.8,118 Z"/>
      <circle cx="100" cy="121" r="4.5"/>
      <path class="hand__heart" d="${heart(100, 29, 15)}"/>
    </g>
    <circle class="lock__pin" cx="100" cy="100" r="7.5" fill="url(#fin-brass)"/>
    <circle class="lock__pin-dot" cx="100" cy="100" r="2"/>
  </g>
</svg>`
}

/** The door leaf, closed and lit: fan window glowing, hook where the blank plate was, letterbox. */
function doorLeaf(answer) {
  const mull = [36, 72, 108, 144]
    .map((a) => {
      const rad = (a * Math.PI) / 180
      return `M110,110 L${r1(110 + 82 * Math.cos(rad))},${r1(110 - 82 * Math.sin(rad))}`
    })
    .join(' ')
  const hx = HOOK.x - LEAF.x
  const hy = HOOK.y - LEAF.y
  const sy = SLOT.y - LEAF.y
  return `<g class="leaf" transform="translate(${LEAF.x} ${LEAF.y})">
  <path class="leaf__face" d="M0,418 V110 A110,110 0 0 1 220,110 V418 Z"/>
  <path class="leaf__hi" d="M10,418 V110 A100,100 0 0 1 60,23"/>
  <path class="fan" data-fan d="M28,112 A82,82 0 0 1 192,112 Z"/>
  <path class="fan__bars" d="${mull}"/>
  <path class="fan__rim" d="M28,112 A82,82 0 0 1 192,112 Z"/>
  <rect class="leaf__rail" x="16" y="110" width="188" height="10" rx="3"/>
  <circle class="leaf__recess" cx="110" cy="277" r="86"/>
  <rect class="panel" x="20" y="368" width="84" height="36" rx="6"/>
  <rect class="panel" x="116" y="368" width="84" height="36" rx="6"/>
  <rect class="panel__bevel" x="26" y="373" width="72" height="26" rx="4"/>
  <rect class="panel__bevel" x="122" y="373" width="72" height="26" rx="4"/>
  <circle class="brass knob" cx="205" cy="272" r="8"/>
  <circle class="knob__hi" cx="202.5" cy="269.5" r="2.4"/>
  <rect class="brass-lo" x="8" y="408" width="204" height="9" rx="2"/>
  ${lock(answer.hour, answer.minute)}
  <!-- the hook, where the blank plate used to hang -->
  <g class="hook" data-hook-art>
    <circle class="hook__glow" cx="${hx}" cy="${hy + 4}" r="20" fill="url(#fin-glow)"/>
    <path class="hook__iron" d="M${hx},${hy - 12} V${hy + 1} q0 7 -6 7 q-5 0 -5 -5"/>
    <circle class="brass" cx="${hx}" cy="${hy - 12}" r="4.2"/>
  </g>
  <!-- the letterbox: brass plate, dark slot, a flap that lifts when post comes through -->
  <g class="letterbox">
    <rect class="brass" x="62" y="${sy - 13}" width="96" height="26" rx="5"/>
    <rect class="slot" x="72" y="${sy - 3}" width="76" height="7" rx="2.5"/>
    <rect class="brass flap" data-flap x="70" y="${sy - 5}" width="80" height="9" rx="3"/>
    <circle class="brass-lo" cx="68" cy="${sy}" r="2"/><circle class="brass-lo" cx="152" cy="${sy}" r="2"/>
  </g>
</g>`
}

/** An ivory envelope pushed halfway through the letterbox (the reception card). */
function mail() {
  return `<g clip-path="url(#fin-slot-clip)">
    <g class="mail" data-mail>
      <g transform="translate(${SLOT.x} ${SLOT.y}) rotate(-7)">
        <rect class="mail__paper" x="-40" y="-56" width="80" height="54" rx="3"/>
        <path class="mail__flap" d="M-40,-56 L0,-26 L40,-56"/>
        <path class="mail__edge" d="M-34,-50 H34"/>
        <circle class="mail__seal" cx="0" cy="-26" r="7"/>
        <path class="mail__seal-heart" d="${heart(0, -26, 8)}"/>
      </g>
    </g>
  </g>`
}

/** A sky moon (behind the roof) and a handful of paper stars. */
function sky() {
  const stars = [[150, -26, 6], [200, 8, 4], [420, -2, 5], [-30, 14, 5], [470, -30, 6], [-120, -20, 4], [600, 6, 5]]
  return `<g class="sky">
    <ellipse class="aura" data-aura cx="220" cy="96" rx="520" ry="230" fill="url(#fin-glow)"/>
    ${stars.map(([x, y, s]) => `<path class="pstar" d="${sparkle(x, y, s)}"/>`).join('')}
    <g transform="translate(300 -12) rotate(-12)"><g class="moon pokeable" data-poke="moon">
      <circle class="moon__halo" r="34"/>
      <path class="moon__body" d="M8,-20 A21,21 0 1 0 18,8 A17,17 0 1 1 8,-20 Z"/>
    </g></g>
  </g>`
}

export function finaleSVG({ answer = { hour: 4, minute: 30 } } = {}) {
  return `<svg class="fin-svg" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" aria-hidden="true" focusable="false">
  ${defs()}
  ${sky()}
  ${roof()}
  ${upper()}
  ${cottageWindow('living', 'translate(-263.6 492) scale(1.2625)')}
  ${cottageWindow('kitchen', 'translate(501.6 492) scale(1.2625)')}
  ${cottageWindow('far-l', 'translate(-563.6 492) scale(1.2625)', { inside: INTERIORS.kitchen })}
  ${cottageWindow('far-r', 'translate(801.6 492) scale(1.2625)', { inside: INTERIORS.living })}
  ${porch()}
  ${doorLeaf(answer)}
  ${mail()}
  ${fairyLights()}
</svg>`
}

/** The nameplate (HTML-positioned, draggable). Local box 184×100; twine apex at (92, 14). */
export const PLATE = { w: 184, h: 100, ax: 92, ay: 14 }
export function plateSVG(names, est) {
  return `<svg viewBox="0 0 ${PLATE.w} ${PLATE.h}" aria-hidden="true" focusable="false" overflow="visible">
  <defs>
    <clipPath id="fin-engrave"><rect data-engrave x="14" y="26" width="0" height="56"/></clipPath>
  </defs>
  <path class="twine twine--slack" data-twine-slack d="M30,32 q18 -14 34 -4 q14 8 26 -6 q14 -12 30 0 q16 10 34 4"/>
  <path class="twine twine--taut" data-twine d="M30,32 L92,14 L154,32"/>
  <g class="plate__body">
    <rect class="plate__shadow" x="20" y="33" width="150" height="50" rx="10"/>
    <rect class="plate__board" x="17" y="30" width="150" height="50" rx="10"/>
    <rect class="plate__edge" x="23" y="36" width="138" height="38" rx="6"/>
    <circle class="plate__screw" cx="27" cy="55" r="2"/><circle class="plate__screw" cx="157" cy="55" r="2"/>
    <g data-names clip-path="url(#fin-engrave)">
      <text class="plate__names" data-name-line x="92" y="57">${names}</text>
      <text class="plate__est" x="92" y="70.5">${est}</text>
    </g>
  </g>
</svg>`
}

/** HELLO my name is — the slip from the letterbox. Local box 112×88. */
export function stickerSVG({ hello, myNameIs, name }) {
  return `<svg viewBox="0 0 112 88" aria-hidden="true" focusable="false" overflow="visible">
  <rect class="sticker__back" x="9" y="9" width="96" height="72" rx="9"/>
  <rect class="sticker__band" x="6" y="6" width="96" height="72" rx="9"/>
  <rect class="sticker__field" x="12" y="36" width="84" height="35" rx="3"/>
  <text class="sticker__hello" x="54" y="23">${hello}</text>
  <text class="sticker__my" x="54" y="32.5">${myNameIs}</text>
  <text class="sticker__name" x="54" y="64">${name}</text>
  <path class="sticker__curl" d="M96,78 q6 -2 6 -9 l-9 9 Z"/>
</svg>`
}
