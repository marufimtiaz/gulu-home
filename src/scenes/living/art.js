/*
 * Living room art: one paper-cut diorama in a 1200×866 viewBox, drawn with `slice` so a phone
 * sees the centre column (x ≈ 405–795) and a desktop sees the whole wall.
 * Colours come from classes in scene.css (tokens only).
 */
export const VIEW = { w: 1200, h: 866 }
export const CLOCK = { x: 604, y: 214, r: 100 }
export const PLANT = { x: 441, y: 662 }
// what must always be on screen: clock (with its grab ring), plate, frames, sofa, phone
export const SAFE = { x: 400, y: 84, w: 408, h: 640 }
// backdrop bounds (wall, floor, overlays) — well past the viewBox in every direction
const X0 = -1200, Y0 = -700, BW = 3600, BH = 2400

function planks() {
  let d = ''
  for (const y of [760, 806, 852, 898, 944]) d += `M${X0} ${y} H${X0 + BW} `
  const rows = [718, 760, 806, 852, 898, 944]
  rows.slice(0, -1).forEach((y, r) => {
    for (let x = X0 + ((r * 130) % 280); x < X0 + BW; x += 280) d += `M${x} ${y} V${rows[r + 1]} `
  })
  return d
}
export const FRAMES = [
  { x: 486, y: 402, tilt: -4, wood: 'mustard' },
  { x: 600, y: 396, tilt: 2, wood: 'berry' },
  { x: 714, y: 402, tilt: -2, wood: 'sage' },
]
const FW = 98, FH = 122

const leaf = (x, y, len, w, rot) =>
  `<g transform="translate(${x} ${y}) rotate(${rot})">
    <path class="lv-leaf ink" d="M0 0 Q${w} ${-len * 0.45} 0 ${-len} Q${-w} ${-len * 0.45} 0 0 Z"/>
    <path class="lv-rib" d="M0 -2 L0 ${-len * 0.82}"/>
  </g>`

function plant() {
  const { x, y } = PLANT
  const stems = [
    [x - 2, y, x - 26, 600, x - 40, 580],
    [x, y, x + 2, 600, x - 6, 550],
    [x + 2, y, x + 26, 620, x + 34, 600],
    [x - 1, y, x - 18, 630, x - 48, 626],
    [x + 1, y, x + 18, 636, x + 40, 632],
  ]
  return `<g data-poke="bottom">
    <g class="lv-plant" data-plant>
      <g class="lv-plant__sway">
        ${stems.map(([a, b, c, d, e, f]) => `<path class="lv-stem" d="M${a} ${b} Q${c} ${d} ${e} ${f}"/>`).join('')}
        ${leaf(x - 40, 582, 58, 22, -30)}
        ${leaf(x - 6, 552, 62, 24, -8)}
        ${leaf(x + 34, 602, 52, 21, 34)}
        ${leaf(x - 48, 628, 44, 18, -64)}
        ${leaf(x + 40, 634, 44, 18, 62)}
        ${leaf(x - 16, 616, 40, 16, -22)}
        ${leaf(x + 14, 606, 42, 17, 20)}
      </g>
    </g>
    <path class="lv-pot ink" d="M${x - 27} ${y + 2} L${x + 27} ${y + 2} L${x + 21} ${y + 60} L${x - 21} ${y + 60} Z"/>
    <rect class="lv-pot ink" x="${x - 31}" y="${y - 6}" width="62" height="13" rx="3"/>
    <path class="lv-pot-band" d="M${x - 25} ${y + 22} L${x + 25} ${y + 22}"/></g>`
}

function windowArt() {
  const x = 406, y = 104, w = 84, h = 184
  const ix = x + 7, iy = y + 7, iw = w - 14, ih = h - 14
  const stars = [
    [424, 128], [446, 150], [430, 176], [476, 186], [452, 120], [482, 132], [420, 210], [468, 222], [440, 198],
  ]
  const rain = Array.from({ length: 14 }, (_, i) => {
    const rx = ix + 4 + ((i * 37) % (iw - 6))
    const ry = iy + ((i * 53) % (ih - 30))
    return `<path d="M${rx} ${ry} l-5 16"/>`
  }).join('')
  const blossoms = [
    [ix + 6, iy + 34], [ix + 20, iy + 46], [ix + 12, iy + 60], [ix + 32, iy + 54], [ix + 26, iy + 30], [ix + 40, iy + 66],
  ]
  return `
    <g class="lv-window" data-poke="top">
      <rect class="lv-pop" x="${x + 5}" y="${y + 5}" width="${w}" height="${h}" rx="6"/>
      <rect class="lv-frame-paper ink" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>
      <g clip-path="url(#lv-sky-clip)">
        <g data-sky>
          <rect class="lv-sky lv-sky--base" x="${ix}" y="${iy}" width="${iw}" height="${ih}" />
          <rect class="lv-sky lv-sky--spring" data-season="spring" x="${ix}" y="${iy}" width="${iw}" height="${ih}" opacity="0"/>
          <rect class="lv-sky lv-sky--monsoon" data-season="monsoon" x="${ix}" y="${iy}" width="${iw}" height="${ih}" opacity="0"/>
          <rect class="lv-sky lv-sky--winter" data-season="winter" x="${ix}" y="${iy}" width="${iw}" height="${ih}" opacity="0"/>
          <g class="lv-stars" data-stars>${stars.map(([sx, sy], i) => `<circle cx="${sx}" cy="${sy}" r="${i % 3 ? 1.3 : 2}"/>`).join('')}</g>
          <circle class="lv-moon ink-thin" data-moon cx="470" cy="146" r="11"/>
          <circle class="lv-moon-bite" data-moon-bite cx="476" cy="142" r="9"/>
          <path class="lv-city" d="M${ix} 286 V262 h12 v-14 h10 v8 h14 v-22 h8 v10 h12 v-6 h10 v18 h6 V286 Z"/>
          <g class="lv-city-lights"><rect x="${ix + 26}" y="250" width="3" height="3"/><rect x="${ix + 38}" y="244" width="3" height="3"/><rect x="${ix + 58}" y="262" width="3" height="3"/></g>
          <path class="lv-branch" d="M${ix - 2} ${iy + 50} Q${ix + 20} ${iy + 46} ${ix + 44} ${iy + 62} M${ix + 16} ${iy + 48} Q${ix + 22} ${iy + 32} ${ix + 34} ${iy + 28}"/>
          <g class="lv-blossoms" data-blossoms opacity="0">${blossoms.map(([bx, by]) => `<circle cx="${bx}" cy="${by}" r="3.4"/>`).join('')}</g>
          <g class="lv-rain" data-rain opacity="0">${rain}</g>
        </g>
      </g>
      <path class="lv-muntin" d="M${x + w / 2} ${iy} V${iy + ih} M${ix} ${y + h * 0.48} H${ix + iw}"/>
      <rect class="lv-frame-in" x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="3"/>
      <path class="lv-valance ink" d="M${x - 8} ${y - 8} H${x + w + 8} V${y + 14} q-11 10 -22 0 q-11 10 -22 0 q-11 10 -22 0 q-11 10 -22 0 q-11 10 -22 0 Z"/>
      <rect class="lv-frame-paper ink" x="${x - 8}" y="${y + h}" width="${w + 16}" height="10" rx="3"/>
    </g>`
}

function clock() {
  const { x, y, r } = CLOCK
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2
    const big = i % 5 === 0
    const r1 = r - 18, r2 = big ? r - 30 : r - 23
    const s = Math.sin(a), c = -Math.cos(a)
    return `<path class="${big ? 'lv-tick lv-tick--big' : 'lv-tick'}" d="M${(x + s * r1).toFixed(1)} ${(y + c * r1).toFixed(1)} L${(x + s * r2).toFixed(1)} ${(y + c * r2).toFixed(1)}"/>`
  }).join('')
  const nums = [
    ['12', 0, -1], ['3', 1, 0], ['6', 0, 1], ['9', -1, 0],
  ].map(([n, dx, dy]) => `<text class="lv-num" x="${x + dx * (r - 46)}" y="${y + dy * (r - 46) + 7}">${n}</text>`).join('')
  // anticlockwise hint arrow over the top of the rim
  const ar = r + 22
  const p = (deg) => [x + ar * Math.sin((deg * Math.PI) / 180), y - ar * Math.cos((deg * Math.PI) / 180)]
  const [ax, ay] = p(48), [bx, by] = p(-48)
  return `
    <g class="lv-clock" data-clock role="slider" tabindex="0">
      <circle class="lv-hit" cx="${x}" cy="${y}" r="${r + 26}"/>
      <path class="lv-hint-arc" data-hint-arc d="M${ax.toFixed(1)} ${ay.toFixed(1)} A${ar} ${ar} 0 0 0 ${bx.toFixed(1)} ${by.toFixed(1)} m-2 -12 l2 12 l11 -5"/>
      <circle class="lv-trail" data-trail cx="${x}" cy="${y}" r="${r + 8}" opacity="0"/>
      <circle class="lv-progress-track" cx="${x}" cy="${y}" r="${r + 13}"/>
      <circle class="lv-progress" data-progress cx="${x}" cy="${y}" r="${r + 13}" pathLength="1" stroke-dasharray="0 2"
        transform="matrix(-1 0 0 1 ${2 * x} 0) rotate(-90 ${x} ${y})"/>
      <circle class="lv-pop" cx="${x + 6}" cy="${y + 6}" r="${r}"/>
      <circle class="lv-rim ink" cx="${x}" cy="${y}" r="${r}"/>
      <circle class="lv-rim-in" cx="${x}" cy="${y}" r="${r - 7}"/>
      <circle class="lv-face ink-thin" data-face cx="${x}" cy="${y}" r="${r - 12}"/>
      ${ticks}
      ${nums}
      <path class="lv-face-heart" d="M${x} ${y + 24} c-6 -6 -12 -2 -12 3 c0 6 12 12 12 12 c0 0 12 -6 12 -12 c0 -5 -6 -9 -12 -3 z"/>
      <g data-hand="hour"><path class="lv-hand lv-hand--hour" d="M${x - 5} ${y + 12} L${x - 3.5} ${y - 46} Q${x} ${y - 54} ${x + 3.5} ${y - 46} L${x + 5} ${y + 12} Z"/></g>
      <g data-hand="minute"><path class="lv-hand lv-hand--minute ink-thin" d="M${x - 3.6} ${y + 18} L${x - 2.2} ${y - 66} L${x} ${y - 78} L${x + 2.2} ${y - 66} L${x + 3.6} ${y + 18} Z"/>
        <path class="lv-hand-heart ink-thin" d="M${x} ${y - 58} c-4 -4.5 -9 -1.5 -9 2.5 c0 4.5 9 9 9 9 c0 0 9 -4.5 9 -9 c0 -4 -5 -7 -9 -2.5 z"/></g>
      <circle class="lv-cap ink-thin" cx="${x}" cy="${y}" r="7"/>
    </g>
    <path class="lv-chain" d="M${x} ${y + r} V${y + r + 18}"/>
    <g class="lv-plate" data-plate data-poke="top">
      <rect class="lv-pop" x="${x - 78 + 4}" y="${y + r + 18 + 4}" width="156" height="50" rx="9"/>
      <rect class="lv-plate__card ink" x="${x - 78}" y="${y + r + 18}" width="156" height="50" rx="9"/>
      <circle class="lv-nailhead" cx="${x}" cy="${y + r + 24}" r="2.4"/>
      <text class="lv-date" data-date x="${x}" y="${y + r + 46}"></text>
      <text class="lv-time" data-time x="${x}" y="${y + r + 63}"></text>
    </g>`
}

function lamp() {
  return `
    <g class="lv-lamp" data-poke="top">
      <rect class="lv-frame-paper ink" x="756" y="196" width="16" height="30" rx="4"/>
      <path class="lv-lamp-arm" d="M764 210 Q786 168 744 132"/>
      <path class="lv-bulb" data-bulb d="M736 152 a8 8 0 0 0 16 0 Z"/>
      <path class="lv-shade ink" d="M722 154 L766 154 L756 126 L732 126 Z"/>
      <path class="lv-shade-line" d="M726 146 L762 146"/>
    </g>`
}

function frames() {
  return FRAMES.map(({ x, y, tilt, wood }, i) => {
    const left = x - FW / 2
    const top = y + 6
    return `
    <g data-poke="top"><g class="lv-hang">
      <path class="lv-string" d="M${x - 30} ${top + 2} L${x} ${y - 16} L${x + 30} ${top + 2}"/>
      <circle class="lv-nailhead" cx="${x}" cy="${y - 16}" r="3"/>
    </g>
    <g class="lv-photo-frame" data-frame="${i}" transform="rotate(${tilt} ${x} ${y})">
      <g class="lv-flip" data-flip>
        <rect class="lv-pop" x="${left + 4}" y="${top + 4}" width="${FW}" height="${FH}" rx="3"/>
        <rect class="lv-wood lv-wood--${wood} ink" x="${left}" y="${top}" width="${FW}" height="${FH}" rx="3"/>
        <rect class="lv-mat ink-thin" x="${left + 8}" y="${top + 8}" width="${FW - 16}" height="${FH - 16}"/>
        <g class="lv-empty-frame">
          <rect class="lv-empty-dash" x="${left + 16}" y="${top + 16}" width="${FW - 32}" height="${FH - 32}" rx="2"/>
          <path class="lv-empty-heart" d="M${x} ${top + FH / 2 + 10} c-7 -7 -14 -2 -14 3.5 c0 7 14 14 14 14 c0 0 14 -7 14 -14 c0 -5.5 -7 -10.5 -14 -3.5 z" transform="translate(0 -14)"/>
        </g>
        <image data-photo x="${left + 13}" y="${top + 13}" width="${FW - 26}" height="${FH - 26}" preserveAspectRatio="xMidYMid slice" clip-path="url(#lv-photo-clip-${i})" />
        <rect class="lv-photo-edge" x="${left + 13}" y="${top + 13}" width="${FW - 26}" height="${FH - 26}"/>
      </g>
    </g></g>`
  }).join('')
}

function sofa() {
  return `
    <g class="lv-sofa" data-poke="squash">
      <rect class="lv-sofa-back ink" x="452" y="556" width="296" height="98" rx="24"/>
      <path class="lv-seam" d="M600 566 V640"/>
      <path class="lv-tuft" d="M526 590 h0.1 M674 590 h0.1 M526 620 h0.1 M674 620 h0.1"/>
      <rect class="lv-sofa-base ink" x="440" y="672" width="320" height="34" rx="9"/>
      <rect class="lv-cushion ink" x="468" y="630" width="132" height="50" rx="13"/>
      <rect class="lv-cushion ink" x="600" y="630" width="132" height="50" rx="13"/>
      <rect class="lv-sofa-arm ink" x="422" y="600" width="56" height="106" rx="24"/>
      <rect class="lv-sofa-arm ink" x="722" y="600" width="56" height="106" rx="24"/>
      <path class="lv-leg" d="M456 706 v12 M744 706 v12"/>
      <g data-poke="squash"><g transform="rotate(12 694 608)">
        <rect class="lv-pillow ink" x="668" y="584" width="54" height="48" rx="12"/>
        <path class="lv-pillow-heart" d="M695 612 c-5 -5 -11 -1.5 -11 3 c0 5 11 10 11 10 c0 0 11 -5 11 -10 c0 -4.5 -6 -8 -11 -3 z" transform="translate(0 -8)"/>
      </g></g>
      <g data-poke="squash"><g transform="rotate(-10 506 612)">
        <rect class="lv-pillow lv-pillow--sage ink" x="482" y="590" width="48" height="44" rx="12"/>
        <path class="lv-pillow-stripe" d="M486 604 h40 M486 614 h40 M486 624 h40"/>
      </g></g>
    </g>`
}

function extras() {
  // only seen on wide screens
  const books = [
    [196, 30, 'berry'], [228, 22, 'sage'], [252, 26, 'sky'], [280, 18, 'butter'], [300, 28, 'pink'],
  ]
  const books2 = [[196, 24, 'mustard'], [222, 30, 'sky'], [254, 22, 'berry'], [278, 26, 'sage']]
  return `
    <g class="lv-shelf" data-poke="bottom">
      <rect class="lv-pop" x="186" y="386" width="170" height="330" rx="4"/>
      <rect class="lv-wood lv-wood--mustard ink" x="180" y="380" width="170" height="330" rx="4"/>
      <rect class="lv-shelf-in ink-thin" x="190" y="390" width="150" height="310"/>
      <path class="lv-shelf-board" d="M190 490 H340 M190 600 H340"/>
      ${books.map(([bx, bw, col], i) => `<rect class="lv-book lv-book--${col} ink-thin" x="${bx}" y="${490 - 60 - (i % 3) * 10}" width="${bw}" height="${60 + (i % 3) * 10}" rx="2"/>`).join('')}
      ${books2.map(([bx, bw, col], i) => `<rect class="lv-book lv-book--${col} ink-thin" x="${bx}" y="${600 - 70 + (i % 2) * 12}" width="${bw}" height="${70 - (i % 2) * 12}" rx="2"/>`).join('')}
      <path class="lv-book lv-book--berry ink-thin" d="M306 600 l26 -62 l14 6 l-26 62 z"/>
      <path class="lv-pot ink" d="M206 700 L246 700 L242 664 L210 664 Z"/>
      ${leaf(226, 664, 34, 13, -26)}${leaf(226, 664, 38, 14, 18)}
      <rect class="lv-frame-paper ink" x="270" y="652" width="54" height="48" rx="3"/>
      <path class="lv-empty-heart" d="M297 680 c-5 -5 -11 -1.5 -11 3 c0 5 11 10 11 10 c0 0 11 -5 11 -10 c0 -4.5 -6 -8 -11 -3 z" transform="translate(0 -6)"/>
    </g>
    <g class="lv-hoop" data-poke="top">
      <circle class="lv-pop" cx="904" cy="424" r="48"/>
      <circle class="lv-hoop-cloth ink" cx="900" cy="420" r="48"/>
      <circle class="lv-hoop-ring" cx="900" cy="420" r="48"/>
      <path class="lv-stitch" d="M900 444 c-14 -12 -30 -22 -30 -36 c0 -10 8 -16 16 -16 c6 0 11 4 14 9 c3 -5 8 -9 14 -9 c8 0 16 6 16 16 c0 14 -16 24 -30 36 z"/>
      <rect class="lv-hoop-screw ink-thin" x="894" y="364" width="12" height="10" rx="2"/>
    </g>
    <g class="lv-table" data-poke="bottom">
      <rect class="lv-pop" x="844" y="628" width="130" height="14" rx="4"/>
      <rect class="lv-wood lv-wood--berry ink" x="840" y="624" width="130" height="14" rx="4"/>
      <path class="lv-leg" d="M856 638 V718 M954 638 V718 M856 690 H954"/>
      <path class="lv-mug ink" d="M866 590 h30 v30 a6 6 0 0 1 -6 6 h-18 a6 6 0 0 1 -6 -6 Z"/>
      <path class="lv-mug-handle" d="M896 598 q12 0 12 9 q0 9 -12 9"/>
      <path class="lv-mug lv-mug--sage ink" d="M914 594 h28 v26 a6 6 0 0 1 -6 6 h-16 a6 6 0 0 1 -6 -6 Z"/>
      <path class="lv-mug-handle" d="M914 602 q-11 0 -11 8 q0 8 11 8"/>
      <path class="lv-steam" d="M876 580 q-6 -10 0 -18 q6 -8 0 -16 M928 584 q-6 -10 0 -18 q6 -8 0 -16"/>
    </g>`
}

export function roomSVG() {
  const { w, h } = VIEW
  return `
<svg class="lv-art" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="false">
  <defs>
    <pattern id="lv-paper-dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="7" cy="7" r="1.6" class="lv-dot"/><circle cx="21" cy="21" r="1.6" class="lv-dot"/>
      <path d="M21 4 l1.4 3 l-1.4 3 l-1.4 -3 z" class="lv-dot"/>
    </pattern>
    <filter id="lv-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <radialGradient id="lv-lampglow" cx="744" cy="160" r="440" gradientUnits="userSpaceOnUse">
      <stop offset="0" class="lv-stop-lamp" stop-opacity="1"/>
      <stop offset="0.35" class="lv-stop-lamp" stop-opacity="0.42"/>
      <stop offset="1" class="lv-stop-lamp" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lv-phoneglow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" class="lv-stop-lamp" stop-opacity="0.95"/>
      <stop offset="0.4" class="lv-stop-lamp" stop-opacity="0.35"/>
      <stop offset="1" class="lv-stop-lamp" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="lv-dawn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="lv-stop-dusk" stop-opacity="0"/>
      <stop offset="0.7" class="lv-stop-dusk" stop-opacity="0.55"/>
      <stop offset="1" class="lv-stop-lamp" stop-opacity="0.75"/>
    </linearGradient>
    <radialGradient id="lv-vignette" cx="640" cy="330" r="720" gradientUnits="userSpaceOnUse">
      <stop offset="0.35" class="lv-stop-night" stop-opacity="0"/>
      <stop offset="1" class="lv-stop-night" stop-opacity="0.6"/>
    </radialGradient>
    <clipPath id="lv-sky-clip"><rect x="413" y="111" width="70" height="170" rx="3"/></clipPath>
    ${FRAMES.map(({ x, y }, i) => `<clipPath id="lv-photo-clip-${i}"><rect x="${x - FW / 2 + 13}" y="${y + 6 + 13}" width="${FW - 26}" height="${FH - 26}"/></clipPath>`).join('')}
  </defs>

  <!-- wall and floor run far past the viewBox: the camera (index.js fit) may show more -->
  <rect class="lv-wall" x="${X0}" y="${Y0}" width="${BW}" height="${718 - Y0}"/>
  <rect fill="url(#lv-paper-dots)" x="${X0}" y="${Y0}" width="${BW}" height="${718 - Y0}"/>
  <rect class="lv-grain" filter="url(#lv-grain)" x="0" y="0" width="${w}" height="${h}"/>
  <rect class="lv-night" x="${X0}" y="${Y0}" width="${BW}" height="${BH}"/>
  <rect class="lv-lampglow" data-lampglow fill="url(#lv-lampglow)" x="${X0}" y="${Y0}" width="${BW}" height="${718 - Y0}"/>
  <path class="lv-rail" d="M${X0} 66 H${X0 + BW}"/>
  <path class="lv-rail-shadow" d="M${X0} 71 H${X0 + BW}"/>

  <rect class="lv-floor" x="${X0}" y="718" width="${BW}" height="${Y0 + BH - 718}"/>
  <path class="lv-plank" d="${planks()}"/>
  <rect class="lv-floor-shade" x="${X0}" y="718" width="${BW}" height="${Y0 + BH - 718}"/>
  <rect class="lv-skirting ink" x="${X0}" y="704" width="${BW}" height="16"/>

  ${extras()}
  ${windowArt()}
  <g class="lv-motes" data-motes>
    <circle cx="716" cy="230" r="1.8"/><circle cx="770" cy="262" r="1.4"/><circle cx="742" cy="300" r="2"/>
    <circle cx="790" cy="214" r="1.2"/><circle cx="700" cy="330" r="1.5"/><circle cx="760" cy="350" r="1.3"/>
  </g>
  ${lamp()}
  ${frames()}
  <ellipse class="lv-rug ink" cx="600" cy="792" rx="252" ry="42"/>
  <ellipse class="lv-rug-in" cx="600" cy="792" rx="226" ry="31"/>
  ${sofa()}
  ${plant()}
  ${clock()}
  <g class="lv-dust" data-dust></g>
  <rect class="lv-vignette" fill="url(#lv-vignette)" x="${X0}" y="${Y0}" width="${BW}" height="${BH}"/>

  <rect class="lv-dim" data-dim x="${X0}" y="${Y0}" width="${BW}" height="${BH}" opacity="0"/>
  <rect class="lv-dawnsky" data-dawnsky x="413" y="111" width="70" height="170" rx="3" fill="url(#lv-dawn)" opacity="0"/>

  <g class="lv-phone-wrap" data-phonewrap opacity="0">
  <circle class="lv-phone-glow" cx="548" cy="640" r="70" fill="url(#lv-phoneglow)"/>
  <g class="lv-phone" data-phone role="button" tabindex="-1">
    <circle class="lv-hit" cx="548" cy="640" r="40"/>
    <g transform="rotate(-9 548 640)">
      <rect class="lv-phone-body ink-thin" x="528" y="628" width="40" height="22" rx="4"/>
      <rect class="lv-phone-screen" x="531" y="631" width="34" height="16" rx="2"/>
      <path class="lv-phone-heart" d="M548 641 c-3 -3 -6 -1 -6 1.6 c0 2.8 6 5.4 6 5.4 c0 0 6 -2.6 6 -5.4 c0 -2.6 -3 -4.6 -6 -1.6 z" transform="translate(0 -4)"/>
    </g>
  </g>
  </g>
</svg>`
}
