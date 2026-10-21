/*
 * Rooftop art: the terrace we're standing on (the same roof as the house hub — stair hut,
 * water tank, railing, fairy lights, the cat), the city beyond, the moon, star glyphs and the
 * paper sketch used on a photo-less polaroid. Colours are classes (scene.css maps them onto
 * tokens), so there's no hex in here.
 *
 *   terraceSVG({ w, k }) → { svg, height, rise }  drawn in real pixels for the current width
 *   moonSVG()  starGlyph()  sketchSVG(shape)
 */

// tiny deterministic random so the skyline is the same every visit
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const r1 = (n) => Math.round(n * 10) / 10

/** Base sizes at k = 1 (a 390 px wide phone). */
export const TERRACE = {
  band: 96, // railing top → bottom of the screen
  rise: 54, // how far the stair hut / tank stand above the railing
  city: 66, // tallest building above the railing
}

function swag(a, b, sag, n) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t)])
  }
  return pts
}

/**
 * The terrace across the bottom of the screen, `w` px wide, scaled by `k`.
 * Returned svg is `height` px tall; the railing top sits `rise` px below its top edge.
 */
export function terraceSVG({ w, k = 1 }) {
  const band = TERRACE.band * k
  const rise = Math.max(TERRACE.rise, TERRACE.city) * k
  const H = band + rise
  const rail = rise // railing top, in svg px
  const rand = rng(17)

  // ── the city beyond: flat roofs, water tanks, a minaret, a few windows still awake ──
  let city = ''
  let wins = ''
  for (let x = -20; x < w + 20; ) {
    const bw = (26 + rand() * 40) * k
    const bh = (16 + rand() * (TERRACE.city - 20)) * k
    const top = rail - bh
    city += `<rect x="${r1(x)}" y="${r1(top)}" width="${r1(bw)}" height="${r1(bh + 30 * k)}"/>`
    if (rand() > 0.5) city += `<rect x="${r1(x + 4 * k + rand() * (bw - 16 * k))}" y="${r1(top - 6 * k)}" width="${r1(9 * k)}" height="${r1(6 * k)}" rx="${r1(2 * k)}"/>`
    for (let wy = top + 7 * k; wy < rail - 4 * k; wy += 11 * k) {
      for (let wx = x + 5 * k; wx < x + bw - 6 * k; wx += 9 * k) {
        if (rand() > 0.88) wins += `<rect x="${r1(wx)}" y="${r1(wy)}" width="${r1(3.5 * k)}" height="${r1(4.5 * k)}"/>`
      }
    }
    x += bw + rand() * 5 * k
  }
  // a mosque: dome + minaret, two-thirds across
  const mx = w * 0.64
  const mt = rail - 48 * k
  city += `<path d="M${r1(mx - 18 * k)} ${r1(rail)} V${r1(mt + 14 * k)} Q${r1(mx)} ${r1(mt - 12 * k)} ${r1(mx + 18 * k)} ${r1(mt + 14 * k)} V${r1(rail)} Z"/>`
  city += `<path d="M${r1(mx + 24 * k)} ${r1(rail)} V${r1(mt - 4 * k)} l${r1(3 * k)} ${r1(-8 * k)} l${r1(3 * k)} ${r1(8 * k)} V${r1(rail)} Z"/>`
  city += `<path d="M${r1(mx)} ${r1(mt - 6 * k)} v${r1(-7 * k)}"/>`

  // ── railing: top rail, balusters, mid rail, then the solid parapet ──
  const hutR = 104 * k // stair hut's right edge
  const tankL = w - 92 * k // tank stand's left edge
  let balusters = ''
  const step = 12 * k
  for (let x = step / 2; x < w; x += step) {
    balusters += `<rect x="${r1(x - 2.2 * k)}" y="${r1(rail + 7 * k)}" width="${r1(4.4 * k)}" height="${r1(34 * k)}" rx="${r1(1.5 * k)}"/>`
  }
  const railing = `
    <g class="rt-railing">
      <rect class="rt-shadow" x="-10" y="${r1(rail + 4 * k)}" width="${w + 20}" height="${r1(band)}"/>
      <g class="rt-baluster">${balusters}</g>
      <rect class="rt-rail" x="-10" y="${r1(rail)}" width="${w + 20}" height="${r1(8 * k)}" rx="${r1(2 * k)}"/>
      <rect class="rt-rail" x="-10" y="${r1(rail + 40 * k)}" width="${w + 20}" height="${r1(6 * k)}" rx="${r1(1.5 * k)}"/>
      <rect class="rt-wall" x="-10" y="${r1(rail + 46 * k)}" width="${w + 20}" height="${r1(band)}"/>
      <rect class="rt-speckle" x="-10" y="${r1(rail + 46 * k)}" width="${w + 20}" height="${r1(band)}"/>
      <path class="rt-ink" d="M-10 ${r1(rail + 46 * k)} H${w + 10}"/>
      <path class="rt-faint" d="M-10 ${r1(rail + 66 * k)} H${w + 10} M-10 ${r1(rail + 84 * k)} H${w + 10}"/>
    </g>`

  // ── a tulsi pot and a little lamp on the parapet ──
  const px = Math.min(hutR + 26 * k, w * 0.3)
  const pot = `
    <g class="rt-pot" data-poke="pot">
      <path class="rt-leaf" d="M${r1(px)} ${r1(rail - 12 * k)} q${r1(-14 * k)} ${r1(-6 * k)} ${r1(-12 * k)} ${r1(-20 * k)} q${r1(10 * k)} ${r1(4 * k)} ${r1(12 * k)} ${r1(20 * k)} q${r1(2 * k)} ${r1(-18 * k)} ${r1(14 * k)} ${r1(-24 * k)} q${r1(2 * k)} ${r1(16 * k)} ${r1(-14 * k)} ${r1(24 * k)} q${r1(12 * k)} ${r1(-10 * k)} ${r1(18 * k)} ${r1(-6 * k)} q${r1(-6 * k)} ${r1(10 * k)} ${r1(-18 * k)} ${r1(6 * k)} Z"/>
      <path class="rt-clay" d="M${r1(px - 11 * k)} ${r1(rail - 13 * k)} h${r1(22 * k)} l${r1(-3 * k)} ${r1(14 * k)} h${r1(-16 * k)} Z"/>
      <rect class="rt-clay" x="${r1(px - 13 * k)}" y="${r1(rail - 15 * k)}" width="${r1(26 * k)}" height="${r1(5 * k)}" rx="${r1(1.5 * k)}"/>
    </g>`

  // ── the cat on the railing, back to us, watching the sky ──
  const cx = Math.min(Math.max(w * 0.56, hutR + 80 * k), tankL - 40 * k)
  const cat = `
    <g class="rt-cat" data-poke="cat" transform="translate(${r1(cx)} ${r1(rail + 1)}) scale(${r1(k * 100) / 100})">
      <path class="rt-cat__tail" d="M6 -2 C14 6 18 24 10 34 C6 40 12 46 16 42" />
      <path class="rt-cat__body" d="M-12 0 C-15 -12 -10 -22 -6 -25 L-8 -36 L-1 -29 Q2 -30 5 -29 L11 -36 L10 -25 C16 -20 18 -10 13 0 Z"/>
      <rect class="rt-hit" x="-22" y="-44" width="44" height="50"/>
    </g>`

  // ── the stair hut (chilekotha), its door ajar on warm light ──
  const hb = rail - 40 * k // top of hut wall
  const hutDoorL = 30 * k
  const hutDoorW = 42 * k
  const doorTop = hb + 30 * k
  const hut = `
    <g class="rt-hut">
      <rect class="rt-shadow" x="${r1(-10 + 6 * k)}" y="${r1(hb + 6 * k)}" width="${r1(hutR + 10)}" height="${r1(H)}"/>
      <rect class="rt-wall" x="-10" y="${r1(hb)}" width="${r1(hutR + 10)}" height="${r1(H)}"/>
      <rect class="rt-speckle" x="-10" y="${r1(hb)}" width="${r1(hutR + 10)}" height="${r1(H)}"/>
      <rect class="rt-outline" x="-10" y="${r1(hb)}" width="${r1(hutR + 10)}" height="${r1(H)}"/>
      <path class="rt-roof" d="M-14 ${r1(hb - 10 * k)} L${r1(hutR + 12 * k)} ${r1(hb - 16 * k)} L${r1(hutR + 12 * k)} ${r1(hb - 4 * k)} L-14 ${r1(hb + 4 * k)} Z"/>
      <g class="rt-doorway" data-poke="door">
        <ellipse class="rt-spill" cx="${r1(hutDoorL + hutDoorW / 2)}" cy="${r1(doorTop + 26 * k)}" rx="${r1(70 * k)}" ry="${r1(56 * k)}"/>
        <path class="rt-doorlight" d="M${r1(hutDoorL)} ${r1(H + 4)} V${r1(doorTop + hutDoorW / 2)} a${r1(hutDoorW / 2)} ${r1(hutDoorW / 2)} 0 0 1 ${r1(hutDoorW)} 0 V${r1(H + 4)} Z"/>
        <path class="rt-stairs" d="M${r1(hutDoorL + 4 * k)} ${r1(H)} h${r1(10 * k)} v${r1(-12 * k)} h${r1(10 * k)} v${r1(-12 * k)} h${r1(10 * k)} v${r1(-12 * k)} h${r1(8 * k)}"/>
        <path class="rt-leafdoor" d="M${r1(hutDoorL + hutDoorW)} ${r1(H + 4)} V${r1(doorTop + hutDoorW / 2)} l${r1(16 * k)} ${r1(-10 * k)} V${r1(H + 4)} Z"/>
        <path class="rt-outline" d="M${r1(hutDoorL)} ${r1(H + 4)} V${r1(doorTop + hutDoorW / 2)} a${r1(hutDoorW / 2)} ${r1(hutDoorW / 2)} 0 0 1 ${r1(hutDoorW)} 0 V${r1(H + 4)}"/>
        <path class="rt-ink" d="M${r1(hutDoorL + hutDoorW / 2)} ${r1(hb + 4 * k)} v${r1(8 * k)}"/>
        <circle class="rt-bulb" cx="${r1(hutDoorL + hutDoorW / 2)}" cy="${r1(hb + 15 * k)}" r="${r1(4 * k)}"/>
        <rect class="rt-hit" x="${r1(hutDoorL - 6 * k)}" y="${r1(hb + 4 * k)}" width="${r1(hutDoorW + 22 * k)}" height="${r1(H - hb)}"/>
      </g>
    </g>`

  // ── the water tank on its stand ──
  const tx = tankL + 8 * k
  const tw = 70 * k
  const tt = rail - TERRACE.rise * k + 4 * k
  const tank = `
    <g class="rt-tank" data-poke="tank">
      <path class="rt-ink" d="M${r1(tx + 8 * k)} ${r1(H + 2)} V${r1(tt + 44 * k)} M${r1(tx + tw - 8 * k)} ${r1(H + 2)} V${r1(tt + 44 * k)} M${r1(tx + 8 * k)} ${r1(tt + 70 * k)} L${r1(tx + tw - 8 * k)} ${r1(tt + 100 * k)} M${r1(tx + tw - 8 * k)} ${r1(tt + 70 * k)} L${r1(tx + 8 * k)} ${r1(tt + 100 * k)}"/>
      <rect class="rt-shadow" x="${r1(tx + 5 * k)}" y="${r1(tt + 5 * k)}" width="${r1(tw)}" height="${r1(46 * k)}" rx="${r1(8 * k)}"/>
      <rect class="rt-tankbody" x="${r1(tx)}" y="${r1(tt)}" width="${r1(tw)}" height="${r1(46 * k)}" rx="${r1(8 * k)}"/>
      <path class="rt-faint" d="M${r1(tx)} ${r1(tt + 16 * k)} H${r1(tx + tw)} M${r1(tx)} ${r1(tt + 31 * k)} H${r1(tx + tw)}"/>
      <rect class="rt-tanklid" x="${r1(tx + tw / 2 - 14 * k)}" y="${r1(tt - 7 * k)}" width="${r1(28 * k)}" height="${r1(8 * k)}" rx="${r1(2 * k)}"/>
      <path class="rt-shine" d="M${r1(tx + 8 * k)} ${r1(tt + 10 * k)} v${r1(26 * k)}"/>
      <rect class="rt-hit" x="${r1(tx - 4 * k)}" y="${r1(tt - 10 * k)}" width="${r1(tw + 8 * k)}" height="${r1(64 * k)}"/>
    </g>`

  // ── fairy lights: hut roof → tank, and swags along the railing ──
  const strings = [swag([hutR + 8 * k, hb - 14 * k], [tx + 6 * k, tt + 2 * k], 30 * k, Math.max(8, Math.round((tx - hutR) / (17 * k))))]
  const segs = Math.max(2, Math.round((tankL - hutR) / (90 * k)))
  for (let s = 0; s < segs; s++) {
    const a = hutR + ((tankL - hutR) * s) / segs
    const b = hutR + ((tankL - hutR) * (s + 1)) / segs
    strings.push(swag([a, rail + 2 * k], [b, rail + 2 * k], 11 * k, 5))
  }
  let wires = ''
  let bulbs = ''
  let n = 0
  for (const s of strings) {
    wires += `<polyline points="${s.map((p) => p.map(r1).join(',')).join(' ')}"/>`
    for (const [x, y] of s.slice(1, -1)) {
      bulbs += `<circle class="rt-fairy rt-fairy--${n % 5}" style="--i:${n}" cx="${r1(x)}" cy="${r1(y + 3 * k)}" r="${r1(2.8 * k)}"/>`
      n++
    }
  }
  const fairy = `<g class="rt-lights"><g class="rt-wire">${wires}</g><g class="rt-bulbs">${bulbs}</g></g>`

  const svg = `
    <svg class="rt-terrace" width="${r1(w)}" height="${r1(H)}" viewBox="0 0 ${r1(w)} ${r1(H)}" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="rt-speckle" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="0.7"/><circle cx="10" cy="9" r="0.5"/><circle cx="7" cy="13" r="0.6"/><circle cx="12" cy="2" r="0.4"/>
        </pattern>
        <radialGradient id="rt-halo"><stop offset="0" class="rt-st-halo0"/><stop offset="1" class="rt-st-halo1"/></radialGradient>
        <linearGradient id="rt-door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="rt-st-door0"/><stop offset="1" class="rt-st-door1"/></linearGradient>
      </defs>
      <g class="rt-city">${city}</g>
      <g class="rt-citywin">${wins}</g>
      ${railing}
      ${pot}
      ${fairy}
      ${cat}
      ${tank}
      ${hut}
    </svg>`
  return { svg, height: H, rise }
}

export function moonSVG() {
  return `
    <svg class="rt-moon" data-poke="moon" viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
      <circle class="rt-moon__halo rt-moon__halo--2" r="58"/>
      <circle class="rt-moon__halo" r="46"/>
      <circle class="rt-moon__shadow" cx="3.5" cy="3.5" r="30"/>
      <circle class="rt-moon__disc" r="30"/>
      <circle class="rt-moon__crater" cx="-9" cy="-8" r="6"/>
      <circle class="rt-moon__crater" cx="10" cy="6" r="4.2"/>
      <circle class="rt-moon__crater" cx="-4" cy="13" r="2.8"/>
      <path class="rt-moon__shine" d="M-21 -12 A24 24 0 0 1 -6 -24"/>
    </svg>`
}

/** A four-point paper star. */
export const STAR_PATH = 'M0 -10 Q1.7 -1.7 10 0 Q1.7 1.7 0 10 Q-1.7 1.7 -10 0 Q-1.7 -1.7 0 -10Z'
export function starGlyph(cls = 'rt-glyph') {
  return `<svg class="${cls}" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false"><circle class="rt-glyph__halo" r="11"/><path class="rt-glyph__star" d="${STAR_PATH}"/><circle class="rt-glyph__core" r="2.2"/></svg>`
}

/**
 * The constellation, drawn in ink on the polaroid's paper (for a memory with no photo):
 * a little star-chart — faint grid circles, the line drawing, the stars.
 */
export function sketchSVG(shape) {
  const stars = shape.stars
    .map(([x, y]) => `<path class="rt-sketch__star" transform="translate(${x} ${y}) scale(0.0042)" d="${STAR_PATH}"/>`)
    .join('')
  return `
    <svg class="rt-sketch" viewBox="-0.16 -0.16 1.32 1.32" aria-hidden="true" focusable="false">
      <g class="rt-sketch__chart">
        <circle cx="0.5" cy="0.5" r="0.62"/><circle cx="0.5" cy="0.5" r="0.4"/>
        <path d="M-0.2 0.5 H1.2 M0.5 -0.2 V1.2"/>
      </g>
      <path class="rt-sketch__line" d="${shape.outline}" pathLength="1"/>
      ${stars}
    </svg>`
}
