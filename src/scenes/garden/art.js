/*
 * The garden behind the house: the birthday garden, grown — at night.
 * Every colour is a class (scene.css maps them onto tokens), so this file has no hex.
 *
 * Coordinate space: a 400 × 520 design canvas (the "stage"), ground line at y = 434.
 * The back layer uses overflow: visible, so the house wall keeps going left and the garden
 * (fence, well, bench, round trees) keeps going right on wide screens.
 *
 *   gardenSVG()          back layer: sky glow, moon, fairy lights, house wall, fence, flowers…
 *   frontSVG(stage, o)   front layer: the tree (stages 1–5), the sapling, seed, water, petals
 *   soilSVG() canSVG()   art inside the HTML buttons (so press() squashes them)
 *   BOX                  overlay boxes in stage units (soil, can, sign, tag)
 */

export const W = 400
export const H = 520
export const G = 434 // ground line
export const BASE = { x: 200, y: G } // where the tree stands

/** Overlay boxes (stage units). The scene positions HTML over the SVG with these. */
export const BOX = {
  soil: { x: 134, y: 398, w: 132, h: 66 },
  can: { x: 294, y: 392, w: 84, h: 71 },
  sign: { x: 18, y: 286, w: 132, h: 70 },
  tag: { x: 200, y: 350, w: 124, h: 42 },
  year: { x: 100, y: 8, w: 200, h: 50 },
}

/** The watering can's spout tip, in can-SVG units (viewBox 0 0 100 84). */
export const SPOUT = { x: 4, y: 20 }
/** Where the water lands. */
export const POUR_AT = { x: 212, y: 426 }

/** Size of the tree at each stage (stage 0 is the sapling, drawn separately). */
export const STAGE_SCALE = [0.3, 0.42, 0.56, 0.7, 0.85, 1]

// tiny deterministic random so the art is the same every visit
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const r1 = (n) => Math.round(n * 10) / 10

// ───────────────────────────── small pieces ─────────────────────────────

/** The bday flower: eight petals, alternating shades, a round centre — on a tall stem. */
function flower(x, y, s, kind, stem = 46, lean = 0) {
  let petals = ''
  for (let i = 0; i < 8; i++) {
    petals += `<ellipse class="${i % 2 ? 'pt-b' : 'pt-a'}" cx="0" cy="-9" rx="4.6" ry="8.6" transform="rotate(${i * 45})"/>`
  }
  const sx = r1(lean)
  return `
  <g transform="translate(${r1(x)} ${r1(y)}) scale(${s})"><g class="pk fl fl--${kind}">
    <path class="g-stem" d="M0 0 C${r1(sx * 0.2 - 3)} ${r1(-stem * 0.4)} ${r1(sx + 3)} ${r1(-stem * 0.7)} ${sx} ${-stem}"/>
    <path class="g-leaf" d="M${r1(sx * 0.3)} ${r1(-stem * 0.38)} c-14 -2 -18 -12 -14 -15 c8 0 13 6 14 15 Z"/>
    <path class="g-leaf" d="M${r1(sx * 0.45)} ${r1(-stem * 0.55)} c13 -3 17 -13 13 -16 c-8 1 -12 7 -13 16 Z"/>
    <g transform="translate(${sx} ${-stem})">
      <circle class="fl-glow" r="17"/>
      ${petals}
      <circle class="fl-c" r="5.6"/>
      <circle class="fl-shine" cx="-1.8" cy="-1.8" r="1.8"/>
    </g>
  </g></g>`
}

/** Little five-dot wildflower (bday's grass scatter). */
function wild(x, y, s, kind) {
  let p = ''
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 * Math.PI) / 180
    p += `<circle cx="${r1(Math.cos(a) * 4.6)}" cy="${r1(Math.sin(a) * 4.6 - 16)}" r="3.4"/>`
  }
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})"><g class="pk wild wild--${kind}">
    <path class="g-stem g-stem--thin" d="M0 0 Q-2 -8 0 -15"/><g class="wild-p">${p}</g><circle class="fl-c" cy="-16" r="2.2"/></g></g>`
}

/** A spotted toadstool. */
function shroom(x, y, s, kind = 'berry', flip = 1) {
  return `
  <g transform="translate(${r1(x)} ${r1(y)}) scale(${s * flip} ${s})"><g class="pk shroom shroom--${kind}">
    <path class="sh-stalk" d="M-5 0 C-6 -8 -4 -15 -4 -18 L4 -18 C4 -15 6 -8 5 0 Z"/>
    <path class="sh-gill" d="M-15 -17 Q0 -12 15 -17 Z"/>
    <path class="sh-cap" d="M-17 -16 C-17 -30 -8 -36 0 -36 C8 -36 17 -30 17 -16 Q0 -12 -17 -16 Z"/>
    <circle class="sh-dot" cx="-7" cy="-26" r="2.6"/><circle class="sh-dot" cx="4" cy="-30" r="2.1"/>
    <circle class="sh-dot" cx="10" cy="-21" r="2.3"/><circle class="sh-dot" cx="-1" cy="-21" r="1.5"/>
  </g></g>`
}

/** A ribbed paper lantern hanging from (x, y), glowing. */
function lantern(x, y, s = 1, kind = 'mustard', cord = 14) {
  return `
  <g class="pk-swing lantern lantern--${kind}" data-hook="${r1(x)} ${r1(y)}">
    <path class="ink-line ink-thin" d="M${r1(x)} ${r1(y)} V${r1(y + cord * s)}"/>
    <g transform="translate(${r1(x)} ${r1(y + cord * s)}) scale(${s})">
      <circle class="lt-glow" cy="17" r="34"/>
      <rect class="lt-cap" x="-6" y="-1" width="12" height="5" rx="1.5"/>
      <path class="lt-body" d="M-6 4 C-19 6 -21 28 -6 31 L6 31 C21 28 19 6 6 4 Z"/>
      <path class="lt-rib" d="M-1.5 4.5 C-8 9 -8 26 -1.5 30.5 M1.5 4.5 C8 9 8 26 1.5 30.5 M-6 17.5 H6"/>
      <rect class="lt-cap" x="-6" y="30" width="12" height="4.5" rx="1.5"/>
      <path class="lt-tassel" d="M0 34.5 V42 M-2 42 H2"/>
    </g>
  </g>`
}

function tuft(x, y, s) {
  return `<path class="g-tuft" transform="translate(${r1(x)} ${r1(y)}) scale(${r1(s)})" d="M-8 0 q2 -10 -2 -17 q6 7 6 17 q1 -14 5 -21 q1 12 0 21 q3 -10 8 -13 q-3 7 -2 13 Z"/>`
}

/** bday's round tree: a trunk and a cluster of circles. */
function roundTree(x, y, s, tone = 'a') {
  return `
  <g transform="translate(${x} ${y}) scale(${s})"><g class="pk rtree rtree--${tone}">
    <path class="p-trunk" d="M-7 0 C-9 -30 -5 -54 -3 -72 L3 -72 C5 -54 9 -30 7 0 Z"/>
    <circle class="rt-c rt-c--b" cx="-30" cy="-74" r="30"/>
    <circle class="rt-c rt-c--b" cx="32" cy="-78" r="31"/>
    <circle class="rt-c" cx="0" cy="-92" r="40"/>
    <circle class="rt-c rt-c--hi" cx="-10" cy="-114" r="27"/>
    <circle class="rt-c rt-c--hi" cx="17" cy="-108" r="23"/>
  </g></g>`
}

// ───────────────────────────── back layer ─────────────────────────────

export function gardenSVG() {
  const rand = rng(17)

  // fairy-light strings: sampled from the same sag curve as the bulbs, so bulbs sit on the wire
  const string = (x0, y0, x1, y1, sag, n, off = 0) => {
    const pt = (t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag]
    let d = ''
    for (let i = 0; i <= 40; i++) {
      const [x, y] = pt(i / 40)
      d += `${i ? 'L' : 'M'}${r1(x)} ${r1(y)} `
    }
    let bulbs = ''
    for (let i = 1; i < n; i++) {
      const [x, y] = pt(i / n)
      bulbs += `<g class="bulb bulb--${(i + off) % 3}" style="animation-delay:-${r1((i * 0.37) % 2.4)}s"><circle class="bulb-glow" cx="${r1(x)}" cy="${r1(y + 4)}" r="7"/><path class="bulb-cap" d="M${r1(x - 1.6)} ${r1(y)} h3.2 v2.2 h-3.2 Z"/><ellipse class="bulb-glass" cx="${r1(x)}" cy="${r1(y + 5)}" rx="2.6" ry="3.4"/></g>`
    }
    return `<path class="wire" d="${d}"/>${bulbs}`
  }

  // fence: pickets all the way along, vines and blooms climbing it (overgrown)
  let pickets = ''
  for (let x = 30; x < 1360; x += 21) pickets += `<path d="M${x} ${G + 2} V${G - 46} l6 -9 l6 9 V${G + 2} Z"/>`
  let vine = 'M24 ' + (G - 32)
  for (let x = 24; x < 1360; x += 30) vine += ` q8 ${r1(-10 - rand() * 8)} 15 0 q7 ${r1(9 + rand() * 6)} 15 0`
  let vineBits = ''
  const vr = rng(29)
  for (let x = 40; x < 1360; x += 26 + Math.floor(vr() * 30)) {
    const y = G - 32 - vr() * 10
    vineBits += vr() > 0.45
      ? `<path class="g-leaf" d="M${r1(x)} ${r1(y)} c-8 -2 -10 -9 -7 -11 c5 1 7 5 7 11 Z"/>`
      : `<g class="vine-bloom vine-bloom--${Math.floor(vr() * 3)}"><circle cx="${r1(x)}" cy="${r1(y - 3)}" r="3.6"/><circle class="fl-c" cx="${r1(x)}" cy="${r1(y - 3)}" r="1.3"/></g>`
  }

  // the far hill behind the fence
  const hill = (y0, amp, step, seed) => {
    const rr = rng(seed)
    let d = `M-1000 ${y0}`
    for (let x = -1000; x <= 1500; x += step) d += ` Q${x + step / 2} ${r1(y0 - amp * (0.4 + rr()))} ${x + step} ${y0}`
    return `${d} L1500 ${G + 20} L-1000 ${G + 20} Z`
  }

  // lawn: three paper layers stepping toward the viewer
  const lawn = (y0, amp, step, seed, cls) => {
    const rr = rng(seed)
    let d = `M-1000 ${y0}`
    for (let x = -1000; x < 1500; x += step) d += ` q${step / 2} ${r1(-amp * (0.3 + rr()))} ${step} 0`
    return `<path class="g-lawn ${cls}" d="${d} V1600 H-1000 Z"/>`
  }

  // flowers: tall bday blooms in the bed along the fence (none where the soil and can sit)
  const kinds = ['rose', 'sun', 'tulip', 'blue', 'peach']
  const bed = [
    [34, 440, 0.95, 54, -4], [62, 446, 0.8, 40, 5], [104, 444, 0.72, 34, -3],
    [372, 446, 0.92, 50, 4], [394, 452, 0.7, 36, -5],
    [430, 444, 0.9, 52, 3], [470, 448, 0.75, 38, -4], [610, 446, 0.95, 56, 3], [650, 450, 0.7, 34, -3],
    [770, 446, 0.88, 48, -4], [900, 448, 0.92, 52, 4], [940, 452, 0.7, 36, -2], [1060, 446, 0.85, 46, 3],
    [1190, 448, 0.9, 50, -4], [-60, 450, 0.8, 40, 4],
  ]
  const flowers = bed.map(([x, y, s, h, l], i) => flower(x, y, s, kinds[(i * 3) % 5], h, l)).join('')

  // foreground scatter: wildflowers, mushrooms, grass
  let front = ''
  const fr = rng(41)
  for (let i = 0; i < 46; i++) {
    const x = -700 + fr() * 2000
    const y = 472 + fr() * 70
    if (x > 120 && x < 290 && y < 486) continue // keep the soil clear
    front += fr() > 0.42 ? tuft(x, y, 0.8 + fr() * 0.7) : wild(x, y, 0.8 + fr() * 0.5, Math.floor(fr() * 4))
  }
  const shrooms = [
    shroom(118, 480, 0.85, 'berry'), shroom(100, 488, 0.6, 'tomato', -1), shroom(300, 486, 0.9, 'tomato', -1),
    shroom(322, 492, 0.55, 'berry'), shroom(24, 500, 0.7, 'mustard'),
    shroom(540, 486, 0.8, 'berry'), shroom(560, 494, 0.55, 'tomato', -1), shroom(820, 490, 0.85, 'mustard'),
    shroom(1010, 488, 0.8, 'berry', -1), shroom(-140, 486, 0.8, 'tomato'),
  ].join('')

  return `
  <svg class="g-art g-back" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="g-warm" cx="50%" cy="50%" r="50%">
        <stop offset="0" class="stop-lamp" stop-opacity="0.5"/>
        <stop offset="0.55" class="stop-lamp" stop-opacity="0.14"/>
        <stop offset="1" class="stop-lamp" stop-opacity="0"/>
      </radialGradient>
      <pattern id="g-speckle" width="23" height="19" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="4" r="0.7"/><circle cx="14" cy="9" r="0.5"/><circle cx="8" cy="15" r="0.6"/><circle cx="20" cy="16" r="0.4"/>
      </pattern>
    </defs>

    <!-- moon: arcs across the sky once a year in the time-lapse -->
    <g class="pk g-moon" data-moon>
      <circle class="moon-halo" cx="350" cy="56" r="44"/>
      <circle class="moon-halo" cx="350" cy="56" r="32"/>
      <circle class="moon-disc" cx="350" cy="56" r="21"/>
      <circle class="moon-crater" cx="343" cy="51" r="4"/><circle class="moon-crater" cx="356" cy="63" r="3"/><circle class="moon-crater" cx="357" cy="48" r="2"/>
      <path class="moon-shine" d="M336 47 a16 16 0 0 1 8 -9"/>
    </g>

    <!-- far: a hill and round trees past the fence -->
    <path class="g-hill" d="${hill(G - 30, 34, 140, 3)}"/>
    ${roundTree(470, G - 22, 0.62, 'b')}${roundTree(-40, G - 24, 0.55, 'b')}${roundTree(1130, G - 20, 0.7, 'b')}

    <!-- one warm light: the lanterns over the soil -->
    <ellipse class="g-warm" cx="230" cy="380" rx="300" ry="220" fill="url(#g-warm)"/>

    <!-- fairy lights from the house's eave to the lantern post, and on along the fence -->
    <g class="g-lights">
      ${string(24, 150, 382, 262, 70, 15, 0)}
      ${string(382, 262, 640, 236, 46, 10, 1)}
      ${string(640, 236, 980, 250, 52, 13, 2)}
    </g>

    <!-- the fence, overgrown -->
    <g class="g-fence">${pickets}
      <rect class="g-rail" x="24" y="${G - 36}" width="1340" height="8" rx="3"/>
      <rect class="g-rail" x="24" y="${G - 14}" width="1340" height="8" rx="3"/>
    </g>
    <path class="g-vine" d="${vine}"/>
    ${vineBits}

    <!-- bday's wishing well and bench, out past the gate (wide screens) -->
    <g transform="translate(540 ${G + 6})"><g class="pk g-well">
      <ellipse class="ink-shadow" cx="4" cy="4" rx="54" ry="10"/>
      <path class="p-stone" d="M-48 4 L-42 -46 L42 -46 L48 4 Z"/>
      <path class="ink-faint" d="M-45 -20 H45 M-44 -34 H44 M-20 -46 V-34 M14 -34 V-20 M-6 -20 V4 M26 -20 V4 M-30 -20 V4"/>
      <ellipse class="g-water" cx="0" cy="-46" rx="42" ry="10"/>
      <rect class="p-wood" x="-46" y="-126" width="10" height="82" rx="3"/>
      <rect class="p-wood" x="36" y="-126" width="10" height="82" rx="3"/>
      <path class="p-roof" d="M-62 -122 L0 -164 L62 -122 Z"/>
      <path class="ink-line" d="M0 -122 V-84"/><rect class="p-bucket" x="-8" y="-86" width="16" height="13" rx="2"/>
    </g></g>
    <g transform="translate(760 ${G + 6})"><g class="pk g-bench">
      <rect class="p-wood" x="-44" y="-12" width="7" height="24" rx="2"/><rect class="p-wood" x="37" y="-12" width="7" height="24" rx="2"/>
      <rect class="p-wood" x="-52" y="-16" width="104" height="10" rx="4"/>
      <rect class="p-wood" x="-52" y="-44" width="104" height="8" rx="4"/><rect class="p-wood" x="-52" y="-32" width="104" height="8" rx="4"/>
      <rect class="p-wood" x="-46" y="-46" width="6" height="32" rx="2"/><rect class="p-wood" x="40" y="-46" width="6" height="32" rx="2"/>
      <g class="g-gift" transform="translate(-14 -16)">
        <rect class="gift-box" x="-11" y="-18" width="22" height="18" rx="2"/>
        <rect class="gift-lid" x="-13" y="-22" width="26" height="6" rx="2"/>
        <rect class="gift-ribbon" x="-2.5" y="-22" width="5" height="22"/>
        <path class="gift-ribbon" d="M0 -22 C-6 -32 -14 -28 -9 -23 Z M0 -22 C6 -32 14 -28 9 -23 Z"/>
      </g>
    </g></g>
    ${roundTree(900, G + 4, 0.95, 'a')}${roundTree(1040, G + 8, 0.75, 'a')}

    <!-- the back of the house, on the left -->
    <g class="g-house">
      <rect class="p-wall" x="-1000" y="-260" width="1024" height="${G + 262}"/>
      <rect class="p-speckle" x="-1000" y="-260" width="1024" height="${G + 262}"/>
      <path class="ink-faint" d="${Array.from({ length: 30 }, (_, i) => `M-1000 ${-240 + i * 23} H22`).join(' ')}"/>
      <rect class="p-wall-shade" x="6" y="-260" width="18" height="${G + 262}"/>
      <path class="p-wall-edge" d="M24 -260 V${G + 2}"/>
      <!-- eave + the hook the fairy lights hang from -->
      <path class="p-trim" d="M-1000 132 H32 V142 H-1000 Z"/>
      <circle class="p-brass" cx="24" cy="150" r="2.6"/>
      <!-- drainpipe -->
      <rect class="p-pipe" x="12" y="142" width="8" height="${G - 142}"/>
      <rect class="p-pipe" x="9" y="${G - 14}" width="14" height="14" rx="3"/>
      <rect class="p-pipe" x="10" y="200" width="12" height="6" rx="2"/><rect class="p-pipe" x="10" y="320" width="12" height="6" rx="2"/>
      <!-- a lit back window with a cat on the sill (wide screens) -->
      <g class="g-backwin">
        <rect class="win-glow" x="-176" y="200" width="104" height="112" rx="6"/>
        <rect class="win-light" x="-168" y="210" width="88" height="94" rx="3"/>
        <path class="win-curtain" d="M-168 210 h26 q-6 46 4 94 h-30 Z M-80 210 h-26 q6 46 -4 94 h30 Z"/>
        <path class="ink-line" d="M-124 210 V304 M-168 256 H-80"/>
        <rect class="win-frame" x="-168" y="210" width="88" height="94" rx="3"/>
        <rect class="p-trim" x="-180" y="304" width="112" height="9" rx="2"/>
        <g transform="translate(-104 304)"><g class="pk g-cat">
          <path class="cat" d="M-14 0 C-16 -12 -10 -20 -4 -21 L-6 -30 L0 -24 L6 -30 L5 -20 C11 -17 13 -8 11 0 Z"/>
          <path class="cat-tail" d="M10 -2 C20 -2 22 8 16 12"/>
        </g></g>
      </g>
      <!-- the back door, a step, a potted plant -->
      <g class="g-backdoor">
        <rect class="p-door" x="-330" y="300" width="62" height="${G - 300}" rx="4"/>
        <rect class="win-light win-light--dim" x="-320" y="312" width="42" height="30" rx="3"/>
        <circle class="p-brass" cx="-278" cy="372" r="3"/>
        <rect class="p-step" x="-342" y="${G - 6}" width="86" height="10" rx="2"/>
        <g transform="translate(-226 ${G + 2})"><g class="pk g-pot">
          <path class="p-potc" d="M-14 0 L-17 -24 H17 L14 0 Z"/>
          <path class="g-leaf" d="M0 -24 c-16 -6 -22 -24 -14 -28 c10 4 14 14 14 28 Z M0 -24 c14 -8 22 -26 14 -30 c-10 4 -14 16 -14 30 Z M0 -24 c-2 -14 2 -30 6 -34 c3 10 0 24 -6 34 Z"/>
        </g></g>
      </g>
    </g>

    <!-- lantern post by the soil: the garden's one warm light -->
    <g class="g-post">
      <rect class="ink-shadow" x="385" y="252" width="8" height="${G - 248}"/>
      <rect class="p-wood" x="380" y="248" width="8" height="${G - 246}" rx="2"/>
      <path class="p-wood" d="M384 260 H352 v-5 H384 Z"/>
      <circle class="p-brass" cx="384" cy="250" r="3"/>
      ${lantern(358, 260, 1.05, 'mustard', 10)}
    </g>
    <g class="g-post">
      <rect class="p-wood" x="636" y="230" width="8" height="${G - 228}" rx="2"/>
      <path class="p-wood" d="M640 242 H668 v-5 H640 Z"/>
      ${lantern(662, 242, 0.9, 'berry', 10)}
    </g>
    <!-- paper lanterns strung on the lights -->
    ${lantern(142, 196, 0.72, 'berry', 6)}${lantern(258, 237, 0.62, 'pink', 6)}${lantern(820, 260, 0.75, 'pink', 6)}

    <!-- ground -->
    ${lawn(G, 6, 80, 2, 'g-lawn--1')}
    <!-- the sign's post; the board is a button on top -->
    <g class="g-signpost"><rect class="ink-shadow" x="85" y="352" width="8" height="${G - 348}"/><rect class="p-wood" x="80" y="348" width="8" height="${G - 344}" rx="2"/></g>
    <!-- the little bed the soil sits in -->
    <ellipse class="g-mound" cx="${BASE.x}" cy="${G + 4}" rx="78" ry="16"/>
    ${flowers}
    ${lawn(466, 10, 110, 4, 'g-lawn--2')}
    ${shrooms}
    <g class="g-front-scatter">${front}</g>
    ${lawn(512, 12, 130, 6, 'g-lawn--3')}
  </svg>`
}

// ───────────────────────────── front layer ─────────────────────────────

/*
 * The tree is drawn once at full size (stage 5) and grown by scaling from its base; parts
 * carry data-st="k" and appear from stage k on. Blossoms (.bl) belong to their cluster's stage.
 * The swing, the two chairs and the hanging lanterns are stage 5.
 */
const CROWN = [
  // [cx, cy, r, stage]
  [150, 214, 46, 1], [252, 210, 48, 1], [200, 186, 60, 1],
  [124, 250, 36, 2], [278, 248, 36, 2], [172, 146, 46, 2], [234, 146, 48, 2],
  [112, 190, 40, 3], [292, 186, 40, 3], [200, 112, 46, 3],
  [140, 118, 38, 4], [262, 110, 40, 4], [318, 228, 30, 4], [86, 236, 30, 4],
  [96, 150, 30, 5], [306, 144, 32, 5], [200, 70, 36, 5], [154, 80, 28, 5], [248, 78, 30, 5],
]
const BRANCHES = [
  // [d, stage]
  ['M197 318 C176 298 152 284 132 252', 1],
  ['M203 296 C222 276 246 262 268 236', 2],
  ['M199 262 C186 236 168 214 150 186', 3],
  ['M202 250 C220 222 240 196 262 168', 4],
  ['M196 334 C170 326 140 322 104 318', 5], // the swing branch
  ['M204 330 C232 318 270 300 306 262', 5],
]

export function treeSVG(stage = 0, { blossoms = false } = {}) {
  const rand = rng(53)
  const hidden = (k) => (k > stage ? ' style="opacity:0"' : '')
  const branches = BRANCHES.map(([d, k]) => `<g class="br" data-st="${k}"${hidden(k)}><path class="br-ink" d="${d}"/><path class="br-wood" d="${d}"/></g>`).join('')
  const shadows = CROWN.map(([x, y, r, k]) => `<circle class="cr-shadow" data-st="${k}" cx="${x + 5}" cy="${y + 6}" r="${r}"${hidden(k)}/>`).join('')
  const crown = CROWN.map(([x, y, r, k], i) => `<g class="cr cr--${i % 3}" data-st="${k}"${hidden(k)}><circle cx="${x}" cy="${y}" r="${r}"/><path class="cr-hi" d="M${x - r * 0.62} ${y - r * 0.25} a${r * 0.7} ${r * 0.7} 0 0 1 ${r * 0.5} ${-r * 0.48}"/></g>`).join('')
  let bl = ''
  CROWN.forEach(([x, y, r, k]) => {
    for (let j = 0; j < 3; j++) {
      const a = rand() * Math.PI * 2
      const d = r * (0.25 + rand() * 0.55)
      const bx = r1(x + Math.cos(a) * d)
      const by = r1(y + Math.sin(a) * d)
      let p = ''
      for (let q = 0; q < 5; q++) {
        const pa = (q * 72 * Math.PI) / 180
        p += `<circle cx="${r1(bx + Math.cos(pa) * 3.6)}" cy="${r1(by + Math.sin(pa) * 3.6)}" r="3"/>`
      }
      bl += `<g class="bl bl--${(j + k) % 2}" data-st="${k}"${!blossoms || k > stage ? ' style="opacity:0"' : ''}>${p}<circle class="bl-c" cx="${bx}" cy="${by}" r="1.7"/></g>`
    }
  })
  const fut = (k = 5) => `data-st="${k}"${hidden(k)}`
  return `
  <g class="tree" data-tree data-stage="${stage}">
    <g class="tree-scale">
      <ellipse class="tree-shadow" cx="204" cy="${G + 3}" rx="54" ry="8"/>
      ${branches}
      <path class="trunk-ink" d="M174 ${G} C186 ${G - 6} 190 ${G - 30} 189 ${G - 70} C188 330 191 270 193 222 L207 222 C209 270 212 330 211 ${G - 70} C210 ${G - 30} 214 ${G - 6} 228 ${G} Z"/>
      <path class="trunk" d="M174 ${G} C186 ${G - 6} 190 ${G - 30} 189 ${G - 70} C188 330 191 270 193 222 L207 222 C209 270 212 330 211 ${G - 70} C210 ${G - 30} 214 ${G - 6} 228 ${G} Z"/>
      <path class="trunk-line" d="M197 ${G - 8} C195 390 198 340 197 300 M205 ${G - 20} C207 380 204 350 206 320 M184 ${G - 3} q8 -6 10 -16"/>
      <ellipse class="knot" cx="205" cy="352" rx="3" ry="4.5"/>
      ${shadows}
      ${crown}
      ${bl}
      <!-- stage 5: the swing on the low left branch -->
      <g class="swing" ${fut()}>
        <path class="rope" d="M118 323 V398 M150 322 V398"/>
        <rect class="p-wood" x="110" y="396" width="48" height="8" rx="3"/>
      </g>
      <!-- lanterns hung in the branches -->
      <g class="tree-lanterns" ${fut()}>
        ${lantern(282, 268, 0.7, 'mustard', 16)}${lantern(246, 300, 0.6, 'pink', 10)}${lantern(166, 232, 0.6, 'berry', 12)}
      </g>
    </g>
    <!-- the two chairs stay full size: they don't grow with the tree -->
    <g class="chairs" ${fut()}>
      <g transform="translate(272 ${G}) scale(-1 1)">${chair()}</g>
      <g transform="translate(330 ${G})">${chair()}</g>
    </g>
  </g>`
}

function chair() {
  return `<path class="ink-shadow" d="M3 2 H27 V-2 H3 Z"/>
    <path class="p-chair" d="M-2 -40 h6 v18 h20 v6 h-2 v16 h-5 v-16 h-10 v16 h-5 v-16 h-4 Z"/>
    <path class="ink-line ink-thin" d="M4 -34 H-1 M4 -28 H-1"/>`
}

/** The sapling: a thin stem and leaves that unfold as it's watered. Base at (200, G). */
export const LEAVES = [
  // [x offset, y offset on the stem, angle, growth threshold] — leaves drawn pointing right
  [0, -12, -40, 0.1],
  [-1, -26, 210, 0.26],
  [1, -40, -30, 0.44],
  [-1, -54, 200, 0.6],
  [0, -66, -60, 0.76],
  [0, -70, 240, 0.86],
]
export function saplingSVG() {
  const leaves = LEAVES.map(([x, y, a], i) => `
    <g class="sap-leaf" data-leaf="${i}" transform="translate(${BASE.x + x} ${G + y}) rotate(${a})">
      <path class="leaf" d="M0 0 C6 -9 20 -10 27 -2 C20 6 7 7 0 0 Z"/>
      <path class="leaf-vein" d="M1 0 Q13 -2 24 -2"/>
    </g>`).join('')
  return `
  <g class="sapling" data-sapling style="opacity:0">
    <g class="sap-scale">
      <path class="sap-stem-ink" d="M200 ${G} C198 ${G - 22} 203 ${G - 46} 200 ${G - 80}"/>
      <path class="sap-stem" d="M200 ${G} C198 ${G - 22} 203 ${G - 46} 200 ${G - 80}"/>
      <path class="sap-stem sap-twig" d="M201 ${G - 68} q8 -2 12 -8"/>
      ${leaves}
      <g class="sap-bud"><circle class="bud" cx="200" cy="${G - 82}" r="4.5"/></g>
    </g>
  </g>`
}

export function frontSVG(stage, { blossoms = false } = {}) {
  let petals = ''
  for (let i = 0; i < 14; i++) petals += `<ellipse class="petal petal--${i % 2}" cx="0" cy="0" rx="3.4" ry="2.2" style="opacity:0"/>`
  return `
  <svg class="g-art g-front" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
    ${treeSVG(stage, { blossoms })}
    ${saplingSVG()}
    <g class="seed" data-seed style="opacity:0">
      <ellipse class="seed-body" cx="${BASE.x}" cy="${G - 7}" rx="4.2" ry="6"/>
      <path class="seed-shine" d="M${BASE.x - 1.5} ${G - 11} q-1 3 0 6"/>
    </g>
    <g class="stream" data-stream style="opacity:0">
      <path class="stream-ink" d=""/>
      <path class="stream-water" d=""/>
      <path class="stream-dash" d=""/>
      <g class="drops">
        <circle class="drop" cx="${POUR_AT.x - 10}" cy="${POUR_AT.y}" r="2.4"/>
        <circle class="drop" cx="${POUR_AT.x + 9}" cy="${POUR_AT.y - 2}" r="2"/>
        <circle class="drop" cx="${POUR_AT.x}" cy="${POUR_AT.y + 2}" r="2.6"/>
      </g>
    </g>
    <g class="petals">${petals}</g>
  </svg>`
}

// ───────────────────────────── button art ─────────────────────────────

/** Tilled soil in a bed of little stones. viewBox matches BOX.soil (132 × 66). */
export function soilSVG() {
  return `
  <svg class="soil-svg" viewBox="0 0 132 66" aria-hidden="true" focusable="false">
    <ellipse class="soil-shadow" cx="68" cy="47" rx="60" ry="15"/>
    <path class="soil" d="M8 42 C10 30 36 26 66 26 C96 26 122 30 124 42 C122 54 96 58 66 58 C36 58 10 54 8 42 Z"/>
    <path class="soil-wet" data-wet d="M22 42 C24 34 42 31 66 31 C90 31 108 34 110 42 C108 50 90 53 66 53 C42 53 24 50 22 42 Z"/>
    <path class="soil-furrow" d="M24 40 Q66 33 108 40 M30 47 Q66 41 102 47"/>
    <path class="soil-dimple" d="M58 38 Q66 43 74 38"/>
    <ellipse class="pebble" cx="12" cy="44" rx="5" ry="3.4"/><ellipse class="pebble" cx="22" cy="53" rx="4.4" ry="3"/>
    <ellipse class="pebble" cx="38" cy="58" rx="5" ry="3.2"/><ellipse class="pebble" cx="60" cy="61" rx="4.6" ry="3"/>
    <ellipse class="pebble" cx="84" cy="60" rx="5" ry="3.3"/><ellipse class="pebble" cx="104" cy="55" rx="4.4" ry="3"/>
    <ellipse class="pebble" cx="119" cy="47" rx="5" ry="3.4"/><ellipse class="pebble" cx="116" cy="35" rx="3.6" ry="2.6"/>
    <ellipse class="pebble" cx="16" cy="34" rx="3.6" ry="2.6"/>
  </svg>`
}

/** The watering can, spout to the left. viewBox 0 0 100 84 (matches BOX.can's 88 × 74). */
export function canSVG() {
  return `
  <svg class="can-svg" viewBox="0 0 100 84" aria-hidden="true" focusable="false">
    <ellipse class="can-shadow" cx="56" cy="80" rx="34" ry="4"/>
    <path class="can-spout" d="M34 50 L6 20 L1 22 L4 14 L14 13 L11 17 L38 42 Z"/>
    <path class="can-rose" d="M1 22 L4 14 L-2 12 L-4 23 Z"/>
    <path class="can-handle" d="M56 22 C60 4 92 4 92 30 C92 40 88 46 84 50" />
    <path class="can-body" d="M30 30 C30 26 34 24 40 24 L76 24 C82 24 86 26 86 30 L88 74 C88 78 84 80 78 80 L38 80 C32 80 28 78 28 74 Z"/>
    <path class="can-band" d="M29 40 H87"/>
    <path class="can-band" d="M28.5 66 H87.5"/>
    <path class="can-shine" d="M38 34 V70"/>
    <g class="can-heart"><path d="M58 56 c-6 -5 -11 -8 -11 -13 c0 -3 3 -5 5.5 -5 c2 0 4 1 5.5 3 c1.5 -2 3.5 -3 5.5 -3 c2.5 0 5.5 2 5.5 5 c0 5 -5 8 -11 13 Z"/></g>
    <ellipse class="can-top" cx="58" cy="25" rx="18" ry="3.5"/>
  </svg>`
}
