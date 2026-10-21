/*
 * Finale art — the hub's house, the very same one (copied from src/scenes/house/art.js, not
 * imported: scenes never import each other), every window lit, a doormat at the front door, a
 * brass hook where the nameplate goes. The geometry is the hub's, unit for unit: two floors ×
 * two windows with the front door between living room (flower box) and kitchen (awning), desk
 * (shutters) and empty room upstairs, the roof terrace with stair hut / water tank / chimney /
 * cat and fairy lights, the garden gate with its lantern on the right.
 *
 * Units: the SVG viewBox is in hub units ("0 100 440 540"). The HTML art box around it is U px
 * per hub unit, so the draggable plate (184×100 px) is exactly the hub's 52-unit nameplate and
 * the camera only ever scales the art down (crisp) — it never has to blow a raster up.
 * Everything exported below is in art-box ("canvas") units = hub units × U, which is what the
 * scene's camera and drag maths work in.
 */

export const U = 2.875
const VB = { x: 0, y: 100, w: 440, h: 540 } // hub units
/** The art box in canvas units (x is always 0). */
export const VIEW = { x: 0, y: VB.y * U, w: VB.w * U, h: VB.h * U }
/** Hub units → canvas units. */
export const cu = (hx, hy) => ({ x: hx * U, y: hy * U })

/** Brass hook on the door: where the plate's twine hangs (the hub plate's pin). */
export const HOOK = cu(150, 494)
/** Letterbox slot centre. */
export const SLOT = cu(150, 540)
/** Chimney mouth — the hearts puff out of here. */
export const CHIMNEY = cu(253, 220)

// tiny deterministic random so the art is the same every visit (same seeds as the hub)
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const r1 = (n) => Math.round(n * 10) / 10

/** A heart centred on (cx, cy), roughly s wide. */
export function heart(cx, cy, s) {
  const k = s / 20
  const p = (x, y) => `${r1(cx + x * k)},${r1(cy + y * k)}`
  return `M${p(0, 7)} C${p(-3, 4)} ${p(-10, 0)} ${p(-10, -4.5)} C${p(-10, -9)} ${p(-5, -11)} ${p(0, -6)} C${p(5, -11)} ${p(10, -9)} ${p(10, -4.5)} C${p(10, 0)} ${p(3, 4)} ${p(0, 7)} Z`
}

const sparkle = (cx, cy, s) =>
  `M${cx},${cy - s} Q${cx + s * 0.18},${cy - s * 0.18} ${cx + s},${cy} Q${cx + s * 0.18},${cy + s * 0.18} ${cx},${cy + s} Q${cx - s * 0.18},${cy + s * 0.18} ${cx - s},${cy} Q${cx - s * 0.18},${cy - s * 0.18} ${cx},${cy - s} Z`

// ───────────────────────────── far layer (hub farSVG) ─────────────────────────────

function far() {
  const rand = rng(7)
  let city = ''
  let wins = ''
  for (let x = -1100; x < 1500; ) {
    const w = 26 + Math.floor(rand() * 34)
    const h = 40 + Math.floor(rand() * 90)
    const top = 548 - h
    city += `<rect x="${x}" y="${top}" width="${w}" height="${h + 20}"/>`
    if (rand() > 0.55) city += `<rect x="${x + 4 + Math.floor(rand() * (w - 14))}" y="${top - 7}" width="9" height="7" rx="2"/>`
    for (let wy = top + 8; wy < 530; wy += 13) {
      for (let wx = x + 5; wx < x + w - 6; wx += 10) {
        if (rand() > 0.9) wins += `<rect x="${wx}" y="${wy}" width="4" height="5"/>`
      }
    }
    x += w + Math.floor(rand() * 6)
  }
  const hill = (y0, amp, step, seed) => {
    const rr = rng(seed)
    let d = `M-1200 ${y0}`
    for (let x = -1200; x <= 1600; x += step) {
      const y = y0 - amp * (0.4 + rr())
      d += ` Q${x + step / 2} ${r1(y)} ${x + step} ${y0}`
    }
    return `${d} L1600 1000 L-1200 1000 Z`
  }
  const tr = rng(11)
  let trees = ''
  for (let x = -1150; x < 1550; x += 46 + Math.floor(tr() * 70)) {
    if (x > 10 && x < 390) continue
    const r = 9 + tr() * 9
    const y = 548 - r * 0.6
    trees += `<path d="M${x} 560 V${r1(y)}" class="ink-line"/><circle cx="${x}" cy="${r1(y - r)}" r="${r1(r)}"/>`
  }
  return `<g class="h-far">
    <g class="f-city">${city}</g>
    <g class="f-city-win">${wins}</g>
    <path class="f-hill f-hill--back" d="${hill(556, 26, 120, 3)}"/>
    <g class="f-tree">${trees}</g>
    <path class="f-hill f-hill--front" d="${hill(566, 16, 90, 5)}"/>
  </g>`
}

// ───────────────────────────── sky: the hub's moon, clear of the roof ─────────────────────────────

function sky() {
  const stars = [[40, 150, 4], [96, 128, 3], [196, 150, 3.5], [292, 128, 3], [410, 196, 3.5], [-20, 210, 3], [420, 132, 2.5]]
  return `<g class="sky">
    <ellipse class="aura" data-aura cx="150" cy="420" rx="300" ry="200" fill="url(#fh-glow-soft)"/>
    ${stars.map(([x, y, s]) => `<path class="pstar" d="${sparkle(x, y, s)}"/>`).join('')}
    <g transform="translate(352 156) scale(0.5)"><g class="moon pokeable" data-poke="moon">
      <circle class="moon-halo moon-halo--2" r="58"/>
      <circle class="moon-halo" r="46"/>
      <circle class="moon-shadow" cx="3.5" cy="3.5" r="30"/>
      <circle class="moon-disc" r="30"/>
      <circle class="moon-crater" cx="-9" cy="-8" r="6"/>
      <circle class="moon-crater" cx="10" cy="6" r="4.2"/>
      <circle class="moon-crater" cx="-4" cy="13" r="2.8"/>
      <path class="moon-shine" d="M-21 -12 A24 24 0 0 1 -6 -24"/>
      <g class="moon-face" data-moon-face opacity="0">
        <circle class="moon-blush" cx="-14" cy="8" r="4.5" opacity="0"/>
        <circle class="moon-blush" cx="14" cy="8" r="4.5" opacity="0"/>
        <g class="moon-eye" data-eye="l"><ellipse cx="-8" cy="-1" rx="2.4" ry="3.2"/></g>
        <g class="moon-eye" data-eye="r"><ellipse cx="8" cy="-1" rx="2.4" ry="3.2"/></g>
        <path class="moon-happy" d="M-11 -1 q3 -4 6 0 M5 -1 q3 -4 6 0" opacity="0"/>
        <path class="moon-smile" d="M-5 9 q5 5 10 0"/>
      </g>
      <circle class="moon-hit" r="46"/>
    </g></g>
  </g>`
}

// ───────────────────────────── fairy lights (hub) ─────────────────────────────

function swag(a, b, sag, n) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t)])
  }
  return pts
}

function fairyLights() {
  const strings = []
  const rail = [[20, 258], [84, 258], [148, 258], [212, 258], [280, 258]]
  for (let i = 0; i < rail.length - 1; i++) strings.push(swag(rail[i], rail[i + 1], 10, 7))
  strings.push(swag([110, 210], [244, 228], 22, 14))
  const drops = []
  for (const x of [24, 31, 269, 276]) {
    const len = x === 24 || x === 276 ? 150 : 118
    drops.push(Array.from({ length: Math.round(len / 11) }, (_, i) => [x, 300 + 6 + i * 11]))
  }
  let wires = ''
  let bulbs = ''
  let k = 0
  for (const s of strings) {
    wires += `<polyline points="${s.map((p) => p.map(r1).join(',')).join(' ')}"/>`
    for (const [x, y] of s.slice(1, -1)) {
      bulbs += `<circle data-fairy class="fairy fairy--${k % 5}" cx="${r1(x)}" cy="${r1(y + 2.6)}" r="2.6"/>`
      k++
    }
  }
  for (const s of drops) {
    wires += `<path d="M${s[0][0]} 300 V${s.at(-1)[1]}"/>`
    for (const [x, y] of s) {
      bulbs += `<circle data-fairy class="fairy fairy--${k % 5}" cx="${x}" cy="${y}" r="2.2"/>`
      k++
    }
  }
  return `<g class="h-fairy"><g class="h-fairy-wire">${wires}</g><g class="fairy-bulbs">${bulbs}</g></g>`
}

// ───────────────────────────── windows (hub geometry, all lit) ─────────────────────────────

const WINDOWS = {
  desk: { x: 44, y: 322, w: 84, h: 80 },
  empty: { x: 172, y: 322, w: 84, h: 80 },
  living: { x: 44, y: 454, w: 84, h: 72 },
  kitchen: { x: 172, y: 454, w: 84, h: 72 },
  rooftop: { x: 52, y: 230, w: 36, h: 52 },
  garden: { x: 328, y: 492, w: 14, h: 22 },
}

const INTERIORS = {
  living: `
    <path d="M10 72 V52 q0 -6 6 -6 h46 q6 0 6 6 V72 Z"/>
    <rect x="6" y="54" width="10" height="14" rx="4"/><rect x="62" y="54" width="10" height="14" rx="4"/>
    <path class="open" d="M70 72 V20 M64 20 h12 l-3 -9 h-6 Z"/>
    <rect x="30" y="14" width="18" height="14" rx="1" class="open"/>`,
  kitchen: `
    <path class="open" d="M42 0 V16"/><path d="M32 24 q10 -12 20 0 Z"/>
    <rect x="6" y="40" width="72" height="4"/>
    <rect x="10" y="30" width="8" height="10" rx="2"/><rect x="21" y="27" width="7" height="13" rx="2"/><rect x="31" y="32" width="9" height="8" rx="2"/>
    <path d="M52 60 h22 v-10 h-22 Z"/><path class="open" d="M50 50 h26"/><path class="open i-steam" d="M58 47 q4 -6 0 -10 M66 47 q4 -6 0 -10"/>`,
  desk: `
    <rect x="8" y="58" width="56" height="5"/><path class="open" d="M12 63 V80 M60 63 V80"/>
    <path class="open" d="M18 58 l8 -18 l10 6"/><path d="M22 34 l12 -2 l-2 10 Z"/>
    <rect x="44" y="48" width="14" height="4"/><rect x="46" y="44" width="12" height="4"/><rect x="45" y="40" width="10" height="4"/>
    <path class="open" d="M70 80 V46 q0 -4 4 -4 h4"/>`,
  empty: `
    <path class="open" d="M42 0 V26"/><circle cx="42" cy="31" r="5"/>
    <path class="open" d="M14 80 L24 36 M30 80 L36 36 M20 50 h14 M17 64 h15"/>
    <rect x="52" y="64" width="22" height="16" rx="1"/>`,
}

function windowGroup(id, { arch = false, awning = false, box = false, shutters = false } = {}) {
  const { x, y, w, h } = WINDOWS[id]
  const top = arch ? `M${x} ${y + h} V${y + 16} Q${x} ${y} ${x + 16} ${y} H${x + w - 16} Q${x + w} ${y} ${x + w} ${y + 16} V${y + h} Z` : null
  const shape = top ? `<path class="w-pane" d="${top}"/>` : `<rect class="w-pane" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`
  const clipShape = top ? `<path d="${top}"/>` : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`
  const cx = x + w / 2
  const extra = []
  if (awning) {
    let stripes = ''
    for (let i = 0; i < 6; i++) {
      const sx = x - 8 + i * ((w + 16) / 6)
      stripes += `<path class="${i % 2 ? 'aw-a' : 'aw-b'}" d="M${r1(sx)} ${y - 18} h${r1((w + 16) / 6)} l1 14 q-${r1((w + 16) / 12)} 7 -${r1((w + 16) / 6)} 0 Z"/>`
    }
    extra.push(`<g class="w-awning"><path class="ink-shadow" d="M${x - 5} ${y - 15} h${w + 16} v15 h-${w + 16} Z"/>${stripes}<path class="ink-line" d="M${x - 8} ${y - 18} H${x + w + 8}"/></g>`)
  }
  if (box) {
    let flowers = ''
    const fr = rng(id.length * 31)
    for (let i = 0; i < 7; i++) {
      const fx = x + 6 + i * ((w - 12) / 6)
      const fy = y + h + 6 - fr() * 5
      flowers += `<path class="ink-line" d="M${r1(fx)} ${y + h + 12} V${r1(fy)}"/><circle class="fl fl--${i % 3}" cx="${r1(fx)}" cy="${r1(fy)}" r="${r1(3.4 + fr())}"/>`
    }
    extra.push(`<g class="w-box">${flowers}<rect class="p-wood" x="${x + 2}" y="${y + h + 10}" width="${w - 4}" height="10" rx="2"/></g>`)
  }
  if (shutters) {
    extra.push(`
      <g class="w-shutters">
        <rect class="p-shutter" x="${x - 16}" y="${y + 2}" width="14" height="${h - 4}" rx="2"/>
        <rect class="p-shutter" x="${x + w + 2}" y="${y + 2}" width="14" height="${h - 4}" rx="2"/>
        <path class="ink-faint" d="${[0.25, 0.42, 0.59, 0.76].map((t) => `M${x - 13} ${r1(y + h * t)} h8 M${x + w + 5} ${r1(y + h * t)} h8`).join(' ')}"/>
      </g>`)
  }
  const curtains = id === 'empty' ? '' : `
    <path class="w-curtain" d="M${x} ${y} h${w * 0.24} q-6 ${h * 0.45} ${w * 0.04} ${h * 0.62} q-${w * 0.18} ${h * 0.14} -${w * 0.28} ${h * 0.38} Z"/>
    <path class="w-curtain" d="M${x + w} ${y} h-${w * 0.24} q6 ${h * 0.45} -${w * 0.04} ${h * 0.62} q${w * 0.18} ${h * 0.14} ${w * 0.28} ${h * 0.38} Z"/>`
  return `
  <g class="win win--${id} pokeable" data-win="${id}">
    <defs><clipPath id="fh-clip-${id}">${clipShape}</clipPath></defs>
    <ellipse class="w-halo" data-halo cx="${cx}" cy="${y + h / 2}" rx="${w * 0.95}" ry="${h * 0.95}"/>
    ${extra.join('')}
    <g class="w-shadow"><rect x="${x + 4}" y="${y + 4}" width="${w}" height="${h}" rx="4"/></g>
    ${shape}
    <g clip-path="url(#fh-clip-${id})">
      <rect class="w-glow" data-glow x="${x}" y="${y}" width="${w}" height="${h}"/>
      <g class="w-inside" transform="translate(${x + (w - 84) / 2} ${y + h - 80})">${INTERIORS[id] ?? ''}</g>
      ${curtains}
      <path class="w-glint" d="M${x + 8} ${y + h - 10} L${x + 26} ${y + 8} M${x + 16} ${y + h - 6} L${x + 32} ${y + 18}"/>
    </g>
    <path class="w-mullion" d="M${cx} ${y} V${y + h} M${x} ${y + h * 0.48} H${x + w}"/>
    ${top ? `<path class="w-frame" d="${top}"/>` : `<rect class="w-frame" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`}
    <rect class="w-sill" x="${x - 6}" y="${y + h}" width="${w + 12}" height="7" rx="2"/>
  </g>`
}

function rooftopWindow() {
  const b = WINDOWS.rooftop
  const arch = `M${b.x} ${b.y + b.h} V${b.y + 14} a${b.w / 2} 14 0 0 1 ${b.w} 0 V${b.y + b.h} Z`
  return `
  <g class="win win--rooftop pokeable" data-win="rooftop">
    <defs><clipPath id="fh-clip-rooftop"><path d="${arch}"/></clipPath></defs>
    <ellipse class="w-halo" data-halo cx="${b.x + b.w / 2}" cy="${b.y + b.h / 2}" rx="56" ry="50"/>
    <rect class="ink-shadow" x="40" y="218" width="68" height="74"/>
    <rect class="p-wall" x="36" y="214" width="68" height="76"/>
    <rect class="p-speckle" x="36" y="214" width="68" height="76"/>
    <path class="p-roof" d="M28 216 L112 206 L112 216 L28 224 Z"/>
    <path class="w-pane" d="${arch}"/>
    <g clip-path="url(#fh-clip-rooftop)">
      <rect class="w-glow" data-glow x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
      <g class="w-inside" transform="translate(${b.x - 4} ${b.y})"><path class="open" d="M4 52 h8 v-8 h8 v-8 h8 v-8 h8"/></g>
    </g>
    <path class="w-frame" d="${arch}"/>
    <circle class="p-brass" cx="${b.x + b.w - 7}" cy="${b.y + b.h - 22}" r="2"/>
  </g>`
}

function gardenWindow() {
  const b = WINDOWS.garden
  const cx = b.x + b.w / 2
  return `
  <g class="win win--garden pokeable" data-win="garden">
    <ellipse class="w-halo" data-halo cx="${cx}" cy="${b.y + b.h / 2}" rx="40" ry="40"/>
    <rect class="ink-shadow" x="314" y="484" width="9" height="78"/><rect class="ink-shadow" x="351" y="484" width="9" height="78"/>
    <rect class="p-wood" x="310" y="480" width="9" height="80" rx="2"/>
    <rect class="p-wood" x="347" y="480" width="9" height="80" rx="2"/>
    <path class="p-arch" d="M308 484 Q333 458 358 484 L358 490 Q333 466 308 490 Z"/>
    <g class="g-gate">
      <rect class="p-gate" x="319" y="514" width="28" height="44" rx="2"/>
      <path class="ink-faint" d="M326 516 V556 M333 516 V556 M340 516 V556"/>
      <path class="ink-line" d="M319 526 H347 M319 548 H347 M320 548 L346 526"/>
    </g>
    <path class="ink-line" d="M${cx} 470 V${b.y}"/>
    <path class="p-lantern-cap" d="M${b.x - 3} ${b.y + 2} L${cx} ${b.y - 5} L${b.x + b.w + 3} ${b.y + 2} Z"/>
    <rect class="w-pane" x="${b.x}" y="${b.y + 2}" width="${b.w}" height="${b.h - 4}" rx="2"/>
    <rect class="w-glow" data-glow x="${b.x}" y="${b.y + 2}" width="${b.w}" height="${b.h - 4}" rx="2"/>
    <path class="w-flame" d="M${cx} ${b.y + 8} q3 4 0 8 q-3 -4 0 -8Z"/>
    <rect class="w-frame" x="${b.x}" y="${b.y + 2}" width="${b.w}" height="${b.h - 4}" rx="2"/>
    <path class="ink-line" d="M${cx} ${b.y + 2} V${b.y + b.h - 2}"/>
    <rect class="p-lantern-cap" x="${b.x - 2}" y="${b.y + b.h - 3}" width="${b.w + 4}" height="4" rx="1"/>
  </g>`
}

// ───────────────────────────── garden, ground (hub) ─────────────────────────────

function garden() {
  const fr = rng(5)
  let flowers = ''
  for (let i = 0; i < 9; i++) {
    const x = 288 + i * 13 + fr() * 6
    if (x > 306 && x < 362) continue
    const y = 530 - fr() * 18
    flowers += `<path class="g-stem" d="M${r1(x)} 548 Q${r1(x - 3)} ${r1((y + 548) / 2)} ${r1(x)} ${r1(y)}"/><circle class="fl fl--${i % 3}" cx="${r1(x)}" cy="${r1(y)}" r="3.6"/><circle class="fl-c" cx="${r1(x)}" cy="${r1(y)}" r="1.2"/>`
  }
  let pickets = ''
  for (let x = 282; x < 400; x += 10) {
    if (x > 300 && x < 360) continue
    pickets += `<path d="M${x} 560 V530 l4 -6 l4 6 V560 Z"/>`
  }
  return `
  <g class="h-garden">
    <path class="g-bush" d="M282 548 q-2 -26 22 -28 q8 -16 26 -4 q20 -8 26 12 q22 -2 22 20 q14 0 22 8 V560 H282 Z"/>
    <g class="g-tree pokeable" data-poke="tree">
      <path class="ink-shadow" d="M378 560 C376 520 380 500 372 478 L384 478 C392 500 388 530 390 560 Z" transform="translate(3 3)"/>
      <path class="p-trunk" d="M378 560 C376 520 380 500 372 478 L384 478 C392 500 388 530 390 560 Z"/>
      <path class="ink-line" d="M381 500 q-12 -6 -18 -16 M386 512 q10 -4 14 -14"/>
      <circle class="g-crown g-crown--b" cx="360" cy="452" r="24"/>
      <circle class="g-crown g-crown--b" cx="398" cy="448" r="22"/>
      <circle class="g-crown" cx="378" cy="430" r="30"/>
      <circle class="g-crown" cx="356" cy="470" r="16"/>
      <circle class="g-crown" cx="400" cy="470" r="16"/>
      <g class="g-blossom">
        <circle cx="366" cy="424" r="2.6"/><circle cx="388" cy="418" r="2.2"/><circle cx="378" cy="442" r="2.4"/>
        <circle cx="356" cy="452" r="2.2"/><circle cx="398" cy="452" r="2.6"/><circle cx="392" cy="434" r="2"/>
        <circle cx="362" cy="468" r="2"/><circle cx="402" cy="468" r="2"/>
      </g>
      <rect class="p-tag" x="384" y="488" width="14" height="9" rx="1.5" transform="rotate(8 391 492)"/>
    </g>
    ${flowers}
    <g class="g-shroom">
      <path class="g-stalk" d="M296 558 v-8 h5 v8 Z"/><path class="g-cap" d="M291 551 q7 -12 15 0 Z"/>
      <path class="g-stalk" d="M368 558 v-6 h4 v6 Z"/><path class="g-cap" d="M364 553 q6 -9 12 0 Z"/>
      <circle class="g-dot" cx="296" cy="547" r="1.1"/><circle class="g-dot" cx="301" cy="548" r="1"/><circle class="g-dot" cx="370" cy="549" r="0.9"/>
    </g>
    <g class="g-fence">${pickets}<path d="M282 540 H306 M360 540 H400 M282 552 H306 M360 552 H400" class="ink-line"/></g>
  </g>`
}

function ground() {
  const rand = rng(3)
  let grass = ''
  for (let x = -1000; x < 1400; x += 9 + Math.floor(rand() * 10)) grass += `M${x} 562 q2 -6 4 -9 q1 5 2 9 `
  const fr = rng(41)
  const wave = (y0, amp, step, seed) => {
    const rr = rng(seed)
    let d = `M-1200 ${y0}`
    for (let x = -1200; x < 1600; x += step) d += ` q${step / 2} ${r1(-amp * (0.3 + rr()))} ${step} 0`
    return `${d} V1000 H-1200 Z`
  }
  let fore = `<path class="g-lawn g-lawn--1" d="${wave(612, 10, 70, 2)}"/><path class="g-lawn g-lawn--2" d="${wave(676, 14, 95, 4)}"/><path class="g-lawn g-lawn--3" d="${wave(744, 16, 120, 6)}"/>`
  for (let i = 0; i < 16; i++) {
    const x = r1(-20 + fr() * 440)
    if (x > 118 && x < 182) continue
    const y = r1(590 + fr() * 150)
    const k = r1(0.8 + fr() * 0.8)
    fore += `<g transform="translate(${x} ${y}) scale(${k})"><path class="g-tuft" d="M-7 0 q2 -9 -1 -15 q5 6 5 15 q1 -12 4 -18 q1 10 0 18 q3 -8 7 -11 q-3 6 -2 11 Z"/>${fr() > 0.45 ? `<circle class="fl fl--${i % 3}" cx="${r1(fr() * 8 - 4)}" cy="-16" r="3"/>` : ''}</g>`
  }
  // stepping stones from the door — the first one is under the doormat tonight
  const stones = [[146, 590, 15], [152, 608, 17], [147, 630, 19], [153, 656, 21], [146, 686, 23], [152, 720, 25]]
    .map(([x, y, r]) => `<ellipse class="p-stone" cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.36}"/>`)
    .join('')
  return `
    <path class="p-ground" d="M-1200 560 H1600 V1000 H-1200 Z"/>
    <path class="g-grass" d="${grass}"/>
    <path class="ink-line" d="M-1200 560 H1600"/>
    <ellipse class="h-spill" data-lamp-glow cx="150" cy="566" rx="150" ry="14"/>
    <g class="h-fore">${fore}</g>
    ${stones}
    <path class="g-bush g-bush--l pokeable" data-poke="bush" d="M-30 560 q0 -30 22 -30 q10 -18 28 -6 q14 4 12 36 Z"/>`
}

// ───────────────────────────── the house ─────────────────────────────

function house() {
  let boards = ''
  for (let y = 312; y < 556; y += 12) boards += `M30 ${y} H270 `
  let balusters = ''
  for (let x = 30; x < 276; x += 8) balusters += `M${x} 264 V290 `
  return `
    <rect class="ink-shadow" x="33" y="305" width="244" height="260"/>
    <rect class="p-wall" x="28" y="300" width="244" height="260"/>
    <rect class="p-speckle" x="28" y="300" width="244" height="260"/>
    <path class="ink-faint" d="${boards}"/>
    <rect class="p-wall-shade" x="28" y="300" width="244" height="10"/>
    <rect class="p-wall-outline" x="28" y="300" width="244" height="260"/>
    <rect class="ink-shadow" x="25" y="433" width="256" height="8"/>
    <rect class="p-trim" x="22" y="428" width="256" height="9" rx="2"/>
    <rect class="p-wall" x="18" y="288" width="264" height="14" rx="2"/>
    <rect class="p-trim" x="18" y="296" width="264" height="6" rx="1"/>
    <rect class="p-wall-outline" x="18" y="288" width="264" height="14" rx="2"/>

    <g class="h-roof">
      <g class="h-chimney pokeable" data-chimney data-poke="chimney">
        <rect class="ink-shadow" x="248" y="230" width="18" height="62"/>
        <rect class="p-brick" x="244" y="226" width="18" height="64"/>
        <path class="ink-faint" d="M244 238 H262 M244 250 H262 M244 262 H262 M244 274 H262 M253 226 V238 M249 238 V250 M257 250 V262 M251 262 V274"/>
        <rect class="p-trim chimney-cap" data-cap x="240" y="220" width="26" height="8" rx="1.5"/>
      </g>
      <g class="h-tank pokeable" data-poke="tank">
        <path class="ink-line" d="M182 290 V262 M214 290 V262 M182 276 L214 290 M214 276 L182 290"/>
        <g class="tank-body" data-tank-body>
          <rect class="ink-shadow" x="180" y="232" width="40" height="32" rx="6"/>
          <rect class="p-tank" x="176" y="228" width="40" height="32" rx="6"/>
          <path class="ink-faint" d="M176 240 H216 M176 250 H216"/>
        </g>
        <rect class="p-tank-lid" data-tank-lid x="186" y="222" width="20" height="7" rx="2"/>
      </g>
      ${rooftopWindow()}
      <g class="h-rail">
        <path class="ink-line h-baluster" d="${balusters}"/>
        <rect class="p-rail" x="20" y="260" width="260" height="6" rx="2"/>
        <rect class="p-rail" x="20" y="284" width="260" height="5" rx="1"/>
      </g>
      <g class="h-cat pokeable" data-poke="cat">
        <g class="cat-walk" transform="translate(4 -30)">
          <path class="cat-tail" data-cat-tail d="M148 288 q12 2 10 -10"/>
          <path class="cat-body" d="M128 290 q-2 -12 5 -18 h14 q7 6 5 18 Z"/>
          <g class="cat-head" data-cat-head>
            <path class="cat-skull" d="M132 274 q-2 -6 1 -9 l-1 -8 l5 5 q3 -1.2 6 0 l5 -5 l-1 8 q3 3 1 9 q-8 4 -16 0 Z"/>
            <g class="cat-eyes" data-cat-eyes opacity="0">
              <ellipse class="cat-eye" cx="137" cy="268.6" rx="1.9" ry="2.3"/>
              <ellipse class="cat-eye" cx="143.4" cy="268.6" rx="1.9" ry="2.3"/>
              <ellipse class="cat-pupil" cx="137" cy="268.6" rx="0.6" ry="1.8"/>
              <ellipse class="cat-pupil" cx="143.4" cy="268.6" rx="0.6" ry="1.8"/>
            </g>
          </g>
          <rect class="hit" x="120" y="250" width="44" height="44"/>
        </g>
      </g>
    </g>

    ${fairyLights()}

    ${windowGroup('desk', { arch: true, shutters: true })}
    ${windowGroup('empty', { arch: true })}
    ${windowGroup('living', { box: true })}
    ${windowGroup('kitchen', { awning: true })}`
}

/** The front door: hub geometry, porch light on, a brass hook where the plate goes, the letterbox. */
function door() {
  return `
  <g class="h-door">
    <ellipse class="h-porch-glow" cx="150" cy="470" rx="34" ry="30"/>
    <path class="ink-shadow" d="M138 564 V492 a16 16 0 0 1 32 0 V564 Z"/>
    <path class="p-door" d="M134 560 V488 a16 16 0 0 1 32 0 V560 Z"/>
    <path class="ink-faint" d="M140 500 h20 v22 h-20 Z M140 528 h20 v24 h-20 Z"/>
    <circle class="p-brass" cx="160" cy="526" r="2.4"/>
    <rect class="p-step" x="126" y="556" width="48" height="7" rx="2"/>
    <g class="sconce pokeable" data-poke="lamp">
      <path class="ink-line" d="M150 452 v6"/><path class="p-sconce" d="M144 458 h12 l-2 9 h-8 Z"/>
      <circle class="h-porch-bulb" cx="150" cy="469" r="2.6"/>
    </g>
    <g class="hook" data-hook-art>
      <circle class="hook__glow" cx="150" cy="497" r="9"/>
      <path class="hook__iron" d="M150 492 V497.5 q0 2.6 -2.2 2.6 q-1.8 0 -1.8 -1.8"/>
      <circle class="p-brass" cx="150" cy="492" r="1.7"/>
    </g>
  </g>`
}

/** Letterbox: brass plate, dark slot, a flap that lifts; the ivory envelope hides behind it. */
function letterbox() {
  return `
  <defs><clipPath id="fh-slot-clip" clipPathUnits="userSpaceOnUse"><rect x="128" y="470" width="44" height="70.5"/></clipPath></defs>
  <ellipse class="mail__halo" data-mail-halo cx="150" cy="525" rx="32" ry="27" opacity="0"/>
  <g clip-path="url(#fh-slot-clip)">
    <g class="mail" data-mail>
      <g transform="translate(150 540) rotate(-6)">
        <rect class="mail__paper" x="-19" y="-28" width="38" height="26" rx="2"/>
        <path class="mail__flap" d="M-19,-28 L0,-14 L19,-28"/>
        <circle class="mail__seal" cx="0" cy="-14" r="3.8"/>
      </g>
    </g>
  </g>
  <g class="letterbox">
    <rect class="p-brass" x="139" y="537" width="22" height="6" rx="1.5"/>
    <rect class="h-slot" x="141" y="539" width="18" height="2.2" rx="1"/>
    <rect class="p-brass flap" data-flap x="140" y="538.2" width="20" height="2.6" rx="1"/>
  </g>`
}

/** The doormat the blank plate leans on (the hub's first stepping stone is under it). */
function mat() {
  let fringe = ''
  for (let x = 129; x <= 171; x += 3) fringe += `M${x} 575.5 v2.5 `
  // under the mat tonight: the key the door scene never had (she won't need it)
  const key = (x, y) =>
    `M${x - 4},${y} a2.6,2.6 0 1 0 5.2,0 a2.6,2.6 0 1 0 -5.2,0 Z M${x + 1.2},${y - 0.7} H${x + 10} V${y + 0.7} H${x + 9} V${y + 2.2} H${x + 7.6} V${y + 0.7} H${x + 6.4} V${y + 1.8} H${x + 5} V${y + 0.7} H${x + 1.2} Z`
  return `<path class="mat-key" data-mat-key d="${key(156, 571.5)}"/>
  <g class="mat pokeable" data-poke="mat">
    <rect class="hit" x="124" y="560" width="52" height="22"/>
    <path class="mat__fringe" d="${fringe}"/>
    <rect class="mat__base" x="127" y="565" width="46" height="11" rx="2"/>
    <rect class="mat__stripe" x="130" y="567" width="40" height="7" rx="1"/>
    <path class="mat__heart" d="${heart(150, 570.6, 5)}"/>
  </g>`
}

function defs() {
  return `<defs>
    <radialGradient id="fh-glow" cx="50%" cy="58%" r="70%">
      <stop offset="0" class="st-butter"/><stop offset="0.55" class="st-lamp"/><stop offset="1" class="st-mustard"/>
    </radialGradient>
    <radialGradient id="fh-halo"><stop offset="0" class="st-halo-0"/><stop offset="1" class="st-halo-1"/></radialGradient>
    <radialGradient id="fh-glow-soft"><stop offset="0" class="st-halo-0" stop-opacity=".5"/><stop offset="1" class="st-halo-1"/></radialGradient>
    <radialGradient id="fh-spill" cx="50%" cy="0%" r="100%"><stop offset="0" class="st-halo-0"/><stop offset="1" class="st-halo-1"/></radialGradient>
    <pattern id="fh-speckle" width="14" height="14" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="4" r="0.7"/><circle cx="10" cy="9" r="0.5"/><circle cx="7" cy="13" r="0.6"/><circle cx="12" cy="2" r="0.4"/>
    </pattern>
  </defs>`
}

export function finaleSVG() {
  return `<svg class="fin-svg" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" aria-hidden="true" focusable="false">
  ${defs()}
  ${sky()}
  ${far()}
  ${ground()}
  ${house()}
  ${door()}
  ${letterbox()}
  ${mat()}
  ${garden()}
  ${gardenWindow()}
</svg>`
}

/** The nameplate (HTML-positioned, draggable). Local box 184×100 px; twine apex at (92, 14). */
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

/** HELLO my name is — the slip from the letterbox. Local box 112×88 (drawn larger by CSS). */
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
