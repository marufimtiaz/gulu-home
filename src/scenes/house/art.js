/*
 * The house: a paper-cutout two-storey Dhaka house at night, cut away into windows.
 * Every colour is a class (scene.css maps them onto tokens), so this file has no hex.
 *
 * Coordinate space: viewBox 0 0 400 640 (portrait). The SVGs use overflow: visible, so the
 * ground, hills and city keep going past the edges on wide screens.
 *
 *   farSVG()    hills + city skyline (parallax layer, zooms less than the house)
 *   houseSVG()  ground, house, roof terrace, garden, fairy lights, windows
 *   skyArt()    moon, paper stars, constellation sketches (fixed sky layer, HTML-positioned)
 */

// Each room's "window": frame box (x, y, w, h) in viewBox units + hit box. Centres drive the zoom.
export const WINDOWS = {
  desk: { x: 44, y: 322, w: 84, h: 80 },
  empty: { x: 172, y: 322, w: 84, h: 80 },
  living: { x: 44, y: 454, w: 84, h: 72 },
  kitchen: { x: 172, y: 454, w: 84, h: 72 },
  rooftop: { x: 52, y: 230, w: 36, h: 52, hit: { x: 28, y: 196, w: 88, h: 96 } },
  garden: { x: 328, y: 492, w: 14, h: 22, hit: { x: 300, y: 462, w: 72, h: 98 } },
}
export const DOOR = { x: 134, y: 472, w: 32, h: 88 }
export const VIEW = { x: 0, y: 120, w: 400, h: 520 }

/** Centre of a window in viewBox units. */
export function windowCenter(id) {
  const b = id === 'door' ? DOOR : WINDOWS[id]
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
}

// tiny deterministic random so the art is the same every visit
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const r1 = (n) => Math.round(n * 10) / 10

// ───────────────────────────── far layer ─────────────────────────────

export function farSVG() {
  const rand = rng(7)
  // city skyline: blocks of flats with water tanks, a few windows still awake
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
  // rolling hills, two paper layers
  const hill = (y0, amp, step, seed) => {
    const rr = rng(seed)
    let d = `M-1200 ${y0}`
    for (let x = -1200; x <= 1600; x += step) {
      const y = y0 - amp * (0.4 + rr())
      d += ` Q${x + step / 2} ${r1(y)} ${x + step} ${y0}`
    }
    return `${d} L1600 1000 L-1200 1000 Z`
  }
  // far round trees on the hills
  const tr = rng(11)
  let trees = ''
  for (let x = -1150; x < 1550; x += 46 + Math.floor(tr() * 70)) {
    if (x > 10 && x < 390) continue // the house stands here
    const r = 9 + tr() * 9
    const y = 548 - r * 0.6
    trees += `<path d="M${x} 560 V${r1(y)}" class="ink-line"/><circle cx="${x}" cy="${r1(y - r)}" r="${r1(r)}"/>`
  }
  return `
  <svg class="house-svg" viewBox="0 120 400 520" aria-hidden="true" focusable="false">
    <g class="f-city">${city}</g>
    <g class="f-city-win">${wins}</g>
    <path class="f-hill f-hill--back" d="${hill(556, 26, 120, 3)}"/>
    <g class="f-tree">${trees}</g>
    <path class="f-hill f-hill--front" d="${hill(566, 16, 90, 5)}"/>
  </svg>`
}

// ───────────────────────────── sky layer ─────────────────────────────

/** Paper stars, moon and constellation sketches. Positions are % of the scene. */
export function skyArt() {
  const rand = rng(23)
  let stars = ''
  for (let i = 0; i < 26; i++) {
    const x = r1(3 + rand() * 94)
    const y = r1(3 + rand() * 52)
    const s = r1(7 + rand() * 9)
    const d = r1(rand() * 5)
    stars += `<svg class="sky-star" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:-${d}s" viewBox="-10 -10 20 20" aria-hidden="true"><path d="M0 -10 Q1.6 -1.6 10 0 Q1.6 1.6 0 10 Q-1.6 1.6 -10 0 Q-1.6 -1.6 0 -10Z"/></svg>`
  }
  let dots = ''
  for (let i = 0; i < 44; i++) {
    const x = r1(rand() * 100)
    const y = r1(rand() * 62)
    dots += `<i class="sky-dot" style="left:${x}%;top:${y}%;animation-delay:-${r1(rand() * 6)}s"></i>`
  }
  // constellations appear after the rooftop: a heart and a teacup, sketched in chalk
  const heart = [[20, 34], [8, 20], [10, 8], [22, 6], [30, 16], [38, 6], [50, 8], [52, 20], [40, 34], [30, 44], [20, 34]]
  const cup = [[68, 60], [70, 82], [96, 82], [98, 60], [68, 60], [98, 64], [108, 66], [104, 76], [96, 76]]
  const poly = (pts) => pts.map((p) => p.join(',')).join(' ')
  const nodes = (pts) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2"/>`).join('')
  const constellations = `
    <svg class="sky-constellations" data-constellations viewBox="0 0 120 100" aria-hidden="true">
      <polyline points="${poly(heart)}"/>
      <polyline points="${poly(cup)}"/>
      <path d="M78 56 q3 -7 0 -12 M88 56 q3 -7 0 -12"/>
      <g>${nodes(heart.slice(0, -1))}${nodes(cup.slice(0, 7))}</g>
    </svg>`
  const moon = `
    <svg class="sky-moon" viewBox="-60 -60 120 120" aria-hidden="true">
      <circle class="moon-halo moon-halo--2" r="58"/>
      <circle class="moon-halo" r="46"/>
      <circle class="moon-shadow" cx="3.5" cy="3.5" r="30"/>
      <circle class="moon-disc" r="30"/>
      <circle class="moon-crater" cx="-9" cy="-8" r="6"/>
      <circle class="moon-crater" cx="10" cy="6" r="4.2"/>
      <circle class="moon-crater" cx="-4" cy="13" r="2.8"/>
      <path class="moon-shine" d="M-21 -12 A24 24 0 0 1 -6 -24"/>
    </svg>`
  return { stars, dots, constellations, moon }
}

// ───────────────────────────── house ─────────────────────────────

// fairy lights: points along a sagging string between anchors
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
  // roofline: across the railing in four swags
  const rail = [[20, 258], [84, 258], [148, 258], [212, 258], [280, 258]]
  for (let i = 0; i < rail.length - 1; i++) strings.push(swag(rail[i], rail[i + 1], 10, 7))
  // overhead: from the stair hut roof to the chimney, wedding-house style
  strings.push(swag([110, 210], [244, 228], 22, 14))
  // corner cascades down the facade (the morich-bati strands every wedding house wears)
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
      bulbs += `<circle data-fairy class="fairy fairy--${k % 5}" style="--i:${k}" cx="${r1(x)}" cy="${r1(y + 2.6)}" r="2.6"/>`
      k++
    }
  }
  for (const s of drops) {
    wires += `<path d="M${s[0][0]} 300 V${s.at(-1)[1]}"/>`
    for (const [x, y] of s) {
      bulbs += `<circle data-fairy class="fairy fairy--${k % 5}" style="--i:${k}" cx="${x}" cy="${y}" r="2.2"/>`
      k++
    }
  }
  return `<g class="h-fairy"><g class="h-fairy-wire">${wires}</g><g class="h-fairy-bulbs">${bulbs}</g></g>`
}

// warm silhouettes seen through a lit window
const INTERIORS = {
  living: `
    <path d="M10 72 V52 q0 -6 6 -6 h46 q6 0 6 6 V72 Z"/>
    <rect x="6" y="54" width="10" height="14" rx="4"/><rect x="62" y="54" width="10" height="14" rx="4"/>
    <path d="M70 72 V20 M64 20 h12 l-3 -9 h-6 Z"/>
    <rect x="30" y="14" width="18" height="14" rx="1" class="i-frame"/>`,
  kitchen: `
    <path d="M42 0 V16 M32 24 q10 -12 20 0 Z"/>
    <rect x="6" y="40" width="72" height="4"/>
    <rect x="10" y="30" width="8" height="10" rx="2"/><rect x="21" y="27" width="7" height="13" rx="2"/><rect x="31" y="32" width="9" height="8" rx="2"/>
    <path d="M52 60 h22 v-10 h-22 Z M50 50 h26"/><path d="M58 47 q4 -6 0 -10 M66 47 q4 -6 0 -10" class="i-steam"/>`,
  desk: `
    <rect x="8" y="58" width="56" height="5"/><path d="M12 63 V80 M60 63 V80"/>
    <path d="M18 58 l8 -18 l10 6 M22 34 l12 -2 l-2 10 Z"/>
    <rect x="44" y="48" width="14" height="4"/><rect x="46" y="44" width="12" height="4"/><rect x="45" y="40" width="10" height="4"/>
    <path d="M70 80 V46 q0 -4 4 -4 h4"/>`,
  empty: `
    <path d="M42 0 V26"/><circle cx="42" cy="31" r="5"/>
    <path d="M14 80 L24 36 M30 80 L36 36 M20 50 h14 M17 64 h15"/>
    <rect x="52" y="64" width="22" height="16" rx="1"/>`,
  rooftop: `
    <path d="M4 52 h8 v-8 h8 v-8 h8 v-8 h8"/>`,
}

function windowGroup(id, label, { arch = false, awning = false, box = false, shutters = false } = {}) {
  const b = WINDOWS[id]
  const hit = b.hit ?? { x: b.x - 8, y: b.y - 10, w: b.w + 16, h: b.h + 22 }
  const { x, y, w, h } = b
  const top = arch ? `M${x} ${y + h} V${y + 16} Q${x} ${y} ${x + 16} ${y} H${x + w - 16} Q${x + w} ${y} ${x + w} ${y + 16} V${y + h} Z` : null
  const shape = top
    ? `<path class="w-pane" d="${top}"/>`
    : `<rect class="w-pane" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`
  const clip = `clip-${id}`
  const clipShape = top ? `<path d="${top}"/>` : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`
  const cx = x + w / 2
  const extra = []
  if (awning) {
    // striped paper awning (the kitchen)
    let stripes = ''
    for (let i = 0; i < 6; i++) {
      const sx = x - 8 + i * ((w + 16) / 6)
      stripes += `<path class="${i % 2 ? 'aw-a' : 'aw-b'}" d="M${r1(sx)} ${y - 18} h${r1((w + 16) / 6)} l1 14 q-${r1((w + 16) / 12)} 7 -${r1((w + 16) / 6)} 0 Z"/>`
    }
    extra.push(`<g class="w-awning"><path class="ink-shadow" d="M${x - 5} ${y - 15} h${w + 16} v15 h-${w + 16} Z"/>${stripes}<path class="ink-line" d="M${x - 8} ${y - 18} H${x + w + 8}"/></g>`)
  }
  if (box) {
    // flower box under the sill (the living room)
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
  const tape =
    id === 'empty'
      ? `<g class="w-tape" data-tape>
          <path d="M${x - 10} ${y + 10} L${x + w + 8} ${y + h - 12} l2 12 L${x - 8} ${y + 22} Z" />
          <path d="M${x + w + 10} ${y + 6} L${x - 6} ${y + h - 8} l-1 12 L${x + w + 11} ${y + 18} Z" />
          <path class="w-tape-edge" d="M${x - 10} ${y + 10} l-2 4 l2 3 l-1 5 M${x + w + 10} ${y + 6} l2 4 l-2 4 l2 4"/>
        </g>`
      : ''
  // curtains: two soft paper drapes tied back
  const curtains = `
    <path class="w-curtain" d="M${x} ${y} h${w * 0.24} q-6 ${h * 0.45} ${w * 0.04} ${h * 0.62} q-${w * 0.18} ${h * 0.14} -${w * 0.28} ${h * 0.38} Z"/>
    <path class="w-curtain" d="M${x + w} ${y} h-${w * 0.24} q6 ${h * 0.45} -${w * 0.04} ${h * 0.62} q${w * 0.18} ${h * 0.14} ${w * 0.28} ${h * 0.38} Z"/>`
  return `
  <g class="win win--${id}" data-window="${id}" data-state="dark" role="button" tabindex="0" aria-label="${label}">
    <defs><clipPath id="${clip}">${clipShape}</clipPath></defs>
    <ellipse class="w-halo" cx="${cx}" cy="${y + h / 2}" rx="${w * 0.95}" ry="${h * 0.95}"/>
    ${extra.join('')}
    <g class="w-shadow"><rect x="${x + 4}" y="${y + 4}" width="${w}" height="${h}" rx="4"/></g>
    ${shape}
    <g clip-path="url(#${clip})">
      <rect class="w-glow" x="${x}" y="${y}" width="${w}" height="${h}"/>
      <g class="w-inside" transform="translate(${x + (w - 84) / 2} ${y + h - 80})">${INTERIORS[id] ?? ''}</g>
      ${id === 'empty' ? '' : curtains}
      <path class="w-glint" d="M${x + 8} ${y + h - 10} L${x + 26} ${y + 8} M${x + 16} ${y + h - 6} L${x + 32} ${y + 18}"/>
    </g>
    <path class="w-mullion" d="M${cx} ${y} V${y + h} M${x} ${y + h * 0.48} H${x + w}"/>
    ${top ? `<path class="w-frame" d="${top}"/>` : `<rect class="w-frame" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`}
    <rect class="w-sill" x="${x - 6}" y="${y + h}" width="${w + 12}" height="7" rx="2"/>
    ${tape}
    <rect class="w-hit" x="${hit.x}" y="${hit.y}" width="${hit.w}" height="${hit.h}"/>
  </g>`
}

function rooftopWindow(label) {
  const b = WINDOWS.rooftop
  const hit = b.hit
  return `
  <g class="win win--rooftop" data-window="rooftop" data-state="dark" role="button" tabindex="0" aria-label="${label}">
    <defs><clipPath id="clip-rooftop"><path d="M${b.x} ${b.y + b.h} V${b.y + 14} a${b.w / 2} 14 0 0 1 ${b.w} 0 V${b.y + b.h} Z"/></clipPath></defs>
    <ellipse class="w-halo" cx="${b.x + b.w / 2}" cy="${b.y + b.h / 2}" rx="56" ry="50"/>
    <!-- the stair hut (chilekotha) every Dhaka roof has -->
    <rect class="ink-shadow" x="40" y="218" width="68" height="74"/>
    <rect class="p-wall" x="36" y="214" width="68" height="76"/>
    <rect class="p-speckle" x="36" y="214" width="68" height="76"/>
    <path class="p-roof" d="M28 216 L112 206 L112 216 L28 224 Z"/>
    <path class="w-pane" d="M${b.x} ${b.y + b.h} V${b.y + 14} a${b.w / 2} 14 0 0 1 ${b.w} 0 V${b.y + b.h} Z"/>
    <g clip-path="url(#clip-rooftop)">
      <rect class="w-glow" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
      <g class="w-inside" transform="translate(${b.x - 4} ${b.y})">${INTERIORS.rooftop}</g>
    </g>
    <path class="w-frame" d="M${b.x} ${b.y + b.h} V${b.y + 14} a${b.w / 2} 14 0 0 1 ${b.w} 0 V${b.y + b.h} Z"/>
    <circle class="p-brass" cx="${b.x + b.w - 7}" cy="${b.y + b.h - 22}" r="2"/>
    <rect class="w-hit" x="${hit.x}" y="${hit.y}" width="${hit.w}" height="${hit.h}"/>
  </g>`
}

function gardenWindow(label) {
  const b = WINDOWS.garden
  const hit = b.hit
  const cx = b.x + b.w / 2
  return `
  <g class="win win--garden" data-window="garden" data-state="dark" role="button" tabindex="0" aria-label="${label}">
    <ellipse class="w-halo" cx="${cx}" cy="${b.y + b.h / 2}" rx="40" ry="40"/>
    <!-- gate: two posts, an arch, a little door -->
    <rect class="ink-shadow" x="314" y="484" width="9" height="78"/><rect class="ink-shadow" x="351" y="484" width="9" height="78"/>
    <rect class="p-wood" x="310" y="480" width="9" height="80" rx="2"/>
    <rect class="p-wood" x="347" y="480" width="9" height="80" rx="2"/>
    <path class="p-arch" d="M308 484 Q333 458 358 484 L358 490 Q333 466 308 490 Z"/>
    <g class="g-gate">
      <rect class="p-gate" x="319" y="514" width="28" height="44" rx="2"/>
      <path class="ink-faint" d="M326 516 V556 M333 516 V556 M340 516 V556"/>
      <path class="ink-line" d="M319 526 H347 M319 548 H347 M320 548 L346 526"/>
    </g>
    <!-- the lantern on the gate is the garden's window -->
    <path class="ink-line" d="M${cx} 470 V${b.y}"/>
    <path class="p-lantern-cap" d="M${b.x - 3} ${b.y + 2} L${cx} ${b.y - 5} L${b.x + b.w + 3} ${b.y + 2} Z"/>
    <rect class="w-pane" x="${b.x}" y="${b.y + 2}" width="${b.w}" height="${b.h - 4}" rx="2"/>
    <rect class="w-glow" x="${b.x}" y="${b.y + 2}" width="${b.w}" height="${b.h - 4}" rx="2"/>
    <path class="w-flame" d="M${cx} ${b.y + 8} q3 4 0 8 q-3 -4 0 -8Z"/>
    <rect class="w-frame" x="${b.x}" y="${b.y + 2}" width="${b.w}" height="${b.h - 4}" rx="2"/>
    <path class="ink-line" d="M${cx} ${b.y + 2} V${b.y + b.h - 2}"/>
    <rect class="p-lantern-cap" x="${b.x - 2}" y="${b.y + b.h - 3}" width="${b.w + 4}" height="4" rx="1"/>
    <rect class="w-hit" x="${hit.x}" y="${hit.y}" width="${hit.w}" height="${hit.h}"/>
  </g>`
}

function garden() {
  // the birthday garden, grown: mushrooms, flowers, a soil patch waiting for a tree
  const fr = rng(5)
  let flowers = ''
  for (let i = 0; i < 9; i++) {
    const x = 288 + i * 13 + fr() * 6
    if (x > 306 && x < 362) continue // gate
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
    <g class="g-tree" data-tree>
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
    <g class="g-patch" data-patch>
      <ellipse class="p-soil" cx="380" cy="556" rx="16" ry="5"/>
      <path class="g-stem" d="M380 554 q-1 -6 0 -10"/><path class="g-leaf" d="M380 546 q-7 -5 -9 0 q5 3 9 0 M380 548 q6 -6 9 -1 q-5 3 -9 1"/>
      <path class="p-wood-line" d="M393 556 V538"/><rect class="p-wood" x="386" y="530" width="15" height="9" rx="1.5" transform="rotate(-6 393 534)"/>
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

function foreground() {
  const rand = rng(41)
  // paper lawn layers stepping toward the viewer, each a shade deeper
  const wave = (y0, amp, step, seed) => {
    const rr = rng(seed)
    let d = `M-1200 ${y0}`
    for (let x = -1200; x < 1600; x += step) d += ` q${step / 2} ${r1(-amp * (0.3 + rr()))} ${step} 0`
    return `${d} V1000 H-1200 Z`
  }
  let out = `<path class="g-lawn g-lawn--1" d="${wave(612, 10, 70, 2)}"/><path class="g-lawn g-lawn--2" d="${wave(676, 14, 95, 4)}"/><path class="g-lawn g-lawn--3" d="${wave(744, 16, 120, 6)}"/>`
  for (let i = 0; i < 16; i++) {
    const x = r1(-20 + rand() * 440)
    if (x > 118 && x < 182) continue // the path
    const y = r1(590 + rand() * 150)
    const k = r1(0.8 + rand() * 0.8)
    out += `<g transform="translate(${x} ${y}) scale(${k})"><path class="g-tuft" d="M-7 0 q2 -9 -1 -15 q5 6 5 15 q1 -12 4 -18 q1 10 0 18 q3 -8 7 -11 q-3 6 -2 11 Z"/>${rand() > 0.45 ? `<circle class="fl fl--${i % 3}" cx="${r1(rand() * 8 - 4)}" cy="-16" r="3"/>` : ''}</g>`
  }
  return `<g class="h-fore">${out}</g>`
}

export function houseSVG({ labels, plate, est, letter = '' }) {
  const rand = rng(3)
  // clapboard lines on the facade
  let boards = ''
  for (let y = 312; y < 556; y += 12) boards += `M30 ${y} H270 `
  // grass tufts along the ground line
  let grass = ''
  for (let x = -1000; x < 1400; x += 9 + Math.floor(rand() * 10)) {
    grass += `M${x} 562 q2 -6 4 -9 q1 5 2 9 `
  }
  // stepping stones from the door
  const stones = [[150, 570, 13], [146, 586, 15], [152, 604, 17], [147, 626, 19], [153, 652, 21], [146, 682, 23], [152, 716, 25]]
    .map(([x, y, r]) => `<ellipse class="p-stone" cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.36}"/>`)
    .join('')
  // railing balusters
  let balusters = ''
  for (let x = 30; x < 276; x += 8) balusters += `M${x} 264 V290 `
  return `
  <svg class="house-svg" viewBox="0 120 400 520" role="group" focusable="false">
    <defs>
      <radialGradient id="h-glow" cx="50%" cy="58%" r="70%">
        <stop offset="0" class="st-glow-0"/><stop offset="0.55" class="st-glow-1"/><stop offset="1" class="st-glow-2"/>
      </radialGradient>
      <radialGradient id="h-halo"><stop offset="0" class="st-halo-0"/><stop offset="1" class="st-halo-1"/></radialGradient>
      <radialGradient id="h-spill" cx="50%" cy="0%" r="100%"><stop offset="0" class="st-halo-0"/><stop offset="1" class="st-halo-1"/></radialGradient>
      <pattern id="h-speckle" width="14" height="14" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="4" r="0.7"/><circle cx="10" cy="9" r="0.5"/><circle cx="7" cy="13" r="0.6"/><circle cx="12" cy="2" r="0.4"/>
      </pattern>
    </defs>

    <!-- ground -->
    <path class="p-ground" d="M-1200 560 H1600 V1000 H-1200 Z"/>
    <path class="g-grass" d="${grass}"/>
    <path class="ink-line" d="M-1200 560 H1600"/>
    <ellipse class="h-spill" cx="150" cy="566" rx="150" ry="14"/>
    ${foreground()}
    ${stones}
    <path class="g-bush g-bush--l" d="M-30 560 q0 -30 22 -30 q10 -18 28 -6 q14 4 12 36 Z"/>

    <!-- house body: one sheet of paper, ink outline, a dropped shadow -->
    <rect class="ink-shadow" x="33" y="305" width="244" height="260"/>
    <rect class="p-wall" x="28" y="300" width="244" height="260"/>
    <rect class="p-speckle" x="28" y="300" width="244" height="260"/>
    <path class="ink-faint" d="${boards}"/>
    <rect class="p-wall-shade" x="28" y="300" width="244" height="10"/>
    <rect class="p-wall-outline" x="28" y="300" width="244" height="260"/>
    <!-- floor ledge + cornice -->
    <rect class="ink-shadow" x="25" y="433" width="256" height="8"/>
    <rect class="p-trim" x="22" y="428" width="256" height="9" rx="2"/>
    <rect class="p-wall" x="18" y="288" width="264" height="14" rx="2"/>
    <rect class="p-trim" x="18" y="296" width="264" height="6" rx="1"/>
    <rect class="p-wall-outline" x="18" y="288" width="264" height="14" rx="2"/>

    <!-- the roof terrace: water tank, chimney, railing -->
    <g class="h-roof">
      <g class="h-chimney">
        <rect class="ink-shadow" x="248" y="230" width="18" height="62"/>
        <rect class="p-brick" x="244" y="226" width="18" height="64"/>
        <path class="ink-faint" d="M244 238 H262 M244 250 H262 M244 262 H262 M244 274 H262 M253 226 V238 M249 238 V250 M257 250 V262 M251 262 V274"/>
        <rect class="p-trim" x="240" y="220" width="26" height="8" rx="1.5"/>
      </g>
      <g class="h-smoke smoke" data-smoke aria-hidden="true">
        <circle cx="253" cy="208" r="7"/><circle cx="257" cy="196" r="9"/><circle cx="251" cy="180" r="11"/>
      </g>
      <g class="h-tank">
        <path class="ink-line" d="M182 290 V262 M214 290 V262 M182 276 L214 290 M214 276 L182 290"/>
        <rect class="ink-shadow" x="180" y="232" width="40" height="32" rx="6"/>
        <rect class="p-tank" x="176" y="228" width="40" height="32" rx="6"/>
        <path class="ink-faint" d="M176 240 H216 M176 250 H216"/>
        <rect class="p-tank-lid" x="186" y="222" width="20" height="7" rx="2"/>
      </g>
      ${rooftopWindow(labels.rooftop)}
      <g class="h-rail">
        <path class="ink-line h-baluster" d="${balusters}"/>
        <rect class="p-rail" x="20" y="260" width="260" height="6" rx="2"/>
        <rect class="p-rail" x="20" y="284" width="260" height="5" rx="1"/>
      </g>
      <!-- a cat on the terrace, watching the moon -->
      <path class="h-cat" transform="translate(4 -30)" d="M128 290 q-2 -14 4 -20 l-1 -8 l5 5 q3 -1 6 0 l5 -5 l-1 8 q6 6 4 20 Z M148 288 q12 2 10 -10"/>
    </g>

    ${fairyLights()}

    <!-- windows -->
    ${windowGroup('desk', labels.desk, { arch: true, shutters: true })}
    ${windowGroup('empty', labels.empty, { arch: true })}
    ${windowGroup('living', labels.living, { box: true })}
    ${windowGroup('kitchen', labels.kitchen, { awning: true })}

    <!-- front door, porch light, nameplate -->
    <g class="h-door">
      <ellipse class="h-porch-glow" cx="150" cy="470" rx="34" ry="30"/>
      <path class="ink-shadow" d="M138 564 V492 a16 16 0 0 1 32 0 V564 Z"/>
      <path class="p-door" d="M134 560 V488 a16 16 0 0 1 32 0 V560 Z"/>
      <path class="ink-faint" d="M140 500 h20 v22 h-20 Z M140 528 h20 v24 h-20 Z"/>
      <circle class="p-brass" cx="160" cy="526" r="2.4"/>
      <!-- letterbox slot (the finale's slip comes out of here) -->
      <rect class="p-brass" x="139" y="537" width="22" height="6" rx="1.5"/>
      <rect class="h-slot" x="141" y="539" width="18" height="2.2" rx="1"/>
      <rect class="p-step" x="126" y="556" width="48" height="7" rx="2"/>
      <path class="ink-line" d="M150 452 v6"/><path class="p-sconce" d="M144 458 h12 l-2 9 h-8 Z"/>
      <circle class="h-porch-bulb" cx="150" cy="469" r="2.6"/>
    </g>
    <g class="h-plate" data-nameplate role="button" tabindex="0" aria-label="${plate}">
      <ellipse class="plate-halo" cx="150" cy="512" rx="34" ry="22"/>
      <path class="ink-line" d="M143 500 L150 494 L157 500"/><circle class="p-brass" cx="150" cy="494" r="1.6"/>
      <rect class="ink-shadow" x="125" y="502" width="52" height="20" rx="4"/>
      <rect class="plate-board" x="123" y="500" width="52" height="20" rx="4"/>
      <text class="plate-names" x="149" y="510.5" textLength="44" lengthAdjust="spacingAndGlyphs">${plate}</text>
      <text class="plate-est" x="149" y="517">${est}</text>
      <rect class="w-hit" x="118" y="476" width="64" height="52"/>
    </g>
    <g class="h-letter" data-letterbox role="button" tabindex="0" aria-label="${letter}">
      <g class="letter-env">
        <rect class="ink-shadow" x="143.5" y="528.5" width="15" height="11" rx="1"/>
        <rect class="letter-paper" x="142" y="527" width="15" height="12" rx="1"/>
        <path class="ink-line letter-flap" d="M142 527.5 L149.5 533 L157 527.5"/>
        <circle class="letter-seal" cx="149.5" cy="533" r="1.6"/>
      </g>
      <rect class="h-slot-lip" x="139" y="538" width="22" height="5" rx="1.5"/>
      <path class="letter-glint" d="M144 529 l3 -3 M146 530 l1.5 -1.5"/>
      <rect class="w-hit" x="126" y="528" width="48" height="48"/>
    </g>

    ${garden()}
    ${gardenWindow(labels.garden)}
  </svg>`
}
