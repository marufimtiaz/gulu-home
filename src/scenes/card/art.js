/*
 * Reception card art — inline SVG, built procedurally so every ornament is truly symmetric.
 * Print, not paper craft: thin gold foil lines, dusty-pink roses, an ivory stock.
 *
 * Gold is a gradient per SVG (`<linearGradient data-foil …>`, userSpaceOnUse over that SVG's
 * viewBox) so foil.js can slide one specular band across every gold line at once.
 * Lines that draw themselves carry `data-draw` (pathLength = 1, dash reveal in index.js);
 * fills that fade in after them carry `data-fill`.
 */

let uid = 0
const f = (n) => +n.toFixed(2)
const TAU = Math.PI * 2

/** A foil gradient spanning [x, x+w] × [y, y+h] of the SVG's user space. */
function foilGrad(id, x, y, w, h, { live = true } = {}) {
  return `<linearGradient id="${id}" ${live ? 'data-foil' : ''} data-w="${w}" data-h="${h}" gradientUnits="userSpaceOnUse"
      x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}">
    <stop offset="0" style="stop-color: var(--gold-deep)"/>
    <stop offset="0.36" style="stop-color: var(--gold-mid)"/>
    <stop offset="0.46" style="stop-color: var(--card-gold-hi)"/>
    <stop offset="0.5" style="stop-color: var(--gold-white)"/>
    <stop offset="0.54" style="stop-color: var(--card-gold-hi)"/>
    <stop offset="0.64" style="stop-color: var(--gold-mid)"/>
    <stop offset="1" style="stop-color: var(--gold-deep)"/>
  </linearGradient>`
}

const rot = (k, n) => `rotate(${f((360 / n) * k)})`
const ring = (n, fn) => Array.from({ length: n }, (_, k) => fn(k)).join('')

/* ── lotus (used on its own and inside other pieces) ─────────────────────────────────── */

/** A small frontal lotus, centred at 0,0, ~ 24 wide × 14 tall, sitting on y = 0. */
function lotusPaths(g, { draw = true } = {}) {
  const d = draw ? ' data-draw pathLength="1"' : ''
  return `
    <path${d} d="M0 0 C -3 -4, -3 -10, 0 -14 C 3 -10, 3 -4, 0 0 Z" fill="var(--card-rose)" fill-opacity=".55" stroke="url(#${g})" stroke-width=".7"/>
    <path${d} d="M-1 0 C -6 -2, -9 -7, -9 -11 C -5 -9, -2 -5, -1 0 Z" fill="var(--card-rose)" fill-opacity=".35" stroke="url(#${g})" stroke-width=".7"/>
    <path${d} d="M1 0 C 6 -2, 9 -7, 9 -11 C 5 -9, 2 -5, 1 0 Z" fill="var(--card-rose)" fill-opacity=".35" stroke="url(#${g})" stroke-width=".7"/>
    <path${d} d="M-2 0 C -7 0, -11 -2, -13 -5 C -8 -5, -4 -3, -2 0 Z" fill="none" stroke="url(#${g})" stroke-width=".6"/>
    <path${d} d="M2 0 C 7 0, 11 -2, 13 -5 C 8 -5, 4 -3, 2 0 Z" fill="none" stroke="url(#${g})" stroke-width=".6"/>
    <path${d} d="M-10 1.2 Q 0 3.4, 10 1.2" fill="none" stroke="url(#${g})" stroke-width=".6"/>`
}

/* ── the alpana medallion ─────────────────────────────────────────────────────────────── */

/**
 * Concentric alpana in a -50..50 box: lotus heart, petal ring, dot ring, scallops, outer
 * leaf points with dots. `fine` adds an extra hairline ring (for larger renderings).
 */
export function alpanaSVG({ fine = false, label = '' } = {}) {
  const g = `cf-alp-${++uid}`
  const sw = fine ? 0.6 : 1.35
  const draw = 'data-draw pathLength="1"'
  // lotus heart: 8 petals
  const heart = ring(8, (k) => `<path ${draw} transform="${rot(k, 8)}" d="M0 -3.2 C 3.6 -6, 3.8 -10.5, 0 -14.5 C -3.8 -10.5, -3.6 -6, 0 -3.2 Z"
      fill="var(--card-rose)" fill-opacity=".5" stroke="url(#${g})" stroke-width="${sw}"/>`)
  const heartTips = ring(8, (k) => `<circle data-fill transform="${rot(k + 0.5, 8)}" cx="0" cy="-12" r="${fine ? 0.9 : 1.1}" fill="url(#${g})"/>`)
  // petal ring: 16 teardrops with a centre vein
  const petals = ring(16, (k) => `<g transform="${rot(k, 16)}">
      <path ${draw} d="M0 -19 C 3.8 -22, 4.4 -27, 0 -31.5 C -4.4 -27, -3.8 -22, 0 -19 Z" fill="${fine ? 'var(--gold-wash)' : 'var(--card-gold-hi)'}" stroke="url(#${g})" stroke-width="${sw}"/>
      ${fine ? `<path ${draw} d="M0 -21 L0 -29" stroke="url(#${g})" stroke-width=".4"/>` : ''}
    </g>`)
  // dots between petals
  const between = ring(16, (k) => `<circle data-fill transform="${rot(k + 0.5, 16)}" cx="0" cy="-27" r="${fine ? 0.7 : 0.95}" fill="url(#${g})"/>`)
  // scallop ring: 24 arcs at r 34 → 37
  const sc = []
  for (let k = 0; k < 24; k++) {
    const a0 = (k / 24) * TAU - Math.PI / 2
    const a1 = ((k + 1) / 24) * TAU - Math.PI / 2
    const am = (a0 + a1) / 2
    const p = (a, r) => `${f(Math.cos(a) * r)} ${f(Math.sin(a) * r)}`
    sc.push(`M${p(a0, 34)} Q${p(am, 39.5)} ${p(a1, 34)}`)
  }
  const scallops = `<path ${draw} d="${sc.join(' ')}" fill="none" stroke="url(#${g})" stroke-width="${sw}"/>`
  // outer: 12 pointed leaves + tip dots
  const leaves = ring(12, (k) => `<g transform="${rot(k + 0.5, 12)}">
      <path ${draw} d="M0 -38.5 C 2.6 -41, 2.8 -44, 0 -47 C -2.8 -44, -2.6 -41, 0 -38.5 Z" fill="var(--card-rose)" fill-opacity=".45" stroke="url(#${g})" stroke-width="${sw}"/>
      <circle data-fill cx="0" cy="-49" r="${fine ? 0.8 : 1}" fill="url(#${g})"/>
    </g>`)
  const smallDots = ring(12, (k) => `<circle data-fill transform="${rot(k, 12)}" cx="0" cy="-41" r="${fine ? 0.55 : 0.75}" fill="url(#${g})"/>`)
  return `<svg class="alpana" viewBox="-51 -51 102 102" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>
    <defs>${foilGrad(g, -50, -50, 100, 100)}</defs>
    <circle ${draw} r="16.5" fill="none" stroke="url(#${g})" stroke-width="${sw}"/>
    ${fine ? `<circle ${draw} r="33" fill="none" stroke="url(#${g})" stroke-width=".35"/>` : ''}
    ${petals}${between}${scallops}${leaves}${smallDots}${heart}${heartTips}
    <circle data-fill r="${fine ? 2.2 : 2.6}" fill="url(#${g})"/>
  </svg>`
}

/* ── divider: hairlines, a lozenge and two leaf curls ─────────────────────────────────── */

export function dividerSVG() {
  const g = `cf-div-${++uid}`
  return `<svg class="cf-divider" viewBox="0 0 160 12" aria-hidden="true">
    <defs>${foilGrad(g, 0, 0, 160, 12)}</defs>
    <path data-draw pathLength="1" d="M8 6 H62" stroke="url(#${g})" stroke-width=".7" fill="none"/>
    <path data-draw pathLength="1" d="M98 6 H152" stroke="url(#${g})" stroke-width=".7" fill="none"/>
    <path data-draw pathLength="1" d="M62 6 C 66 2, 70 2, 72 6 C 70 10, 66 10, 62 6 Z" fill="none" stroke="url(#${g})" stroke-width=".6"/>
    <path data-draw pathLength="1" d="M98 6 C 94 2, 90 2, 88 6 C 90 10, 94 10, 98 6 Z" fill="none" stroke="url(#${g})" stroke-width=".6"/>
    <path data-fill d="M80 1.2 L84.6 6 L80 10.8 L75.4 6 Z" fill="url(#${g})"/>
    <circle data-fill cx="4" cy="6" r="1" fill="url(#${g})"/>
    <circle data-fill cx="156" cy="6" r="1" fill="url(#${g})"/>
  </svg>`
}

/* ── roses ────────────────────────────────────────────────────────────────────────────── */

/** An open rose seen from above, centred at x,y, radius r: dusty pink petals, gold edges. */
function rose(x, y, r, g, { draw = true } = {}) {
  const d = draw ? ' data-draw pathLength="1"' : ''
  const petals = ring(5, (k) => {
    const a = (k / 5) * TAU + 0.3
    const px = Math.cos(a) * r * 0.55
    const py = Math.sin(a) * r * 0.55
    return `<circle cx="${f(px)}" cy="${f(py)}" r="${f(r * 0.55)}"/>`
  })
  return `<g transform="translate(${f(x)} ${f(y)})">
    <g fill="var(--card-rose)" stroke="url(#${g})" stroke-width="${f(Math.max(0.4, r * 0.07))}">${petals}</g>
    <circle r="${f(r * 0.62)}" fill="var(--rose-deep)" fill-opacity=".55"/>
    <path${d} d="M${f(-r * 0.32)} 0 A ${f(r * 0.32)} ${f(r * 0.32)} 0 1 1 ${f(r * 0.08)} ${f(r * 0.3)} A ${f(r * 0.2)} ${f(r * 0.2)} 0 1 1 ${f(r * 0.05)} ${f(-r * 0.12)}"
      fill="none" stroke="url(#${g})" stroke-width="${f(Math.max(0.4, r * 0.08))}" stroke-linecap="round"/>
  </g>`
}

/** An almond leaf at x,y pointing along angle a (radians), length l. */
function leaf(x, y, a, l, g, { draw = true } = {}) {
  const d = draw ? ' data-draw pathLength="1"' : ''
  const deg = f((a * 180) / Math.PI)
  return `<path${d} transform="translate(${f(x)} ${f(y)}) rotate(${deg})"
    d="M0 0 C ${f(l * 0.3)} ${f(-l * 0.32)}, ${f(l * 0.75)} ${f(-l * 0.3)}, ${l} 0 C ${f(l * 0.75)} ${f(l * 0.3)}, ${f(l * 0.3)} ${f(l * 0.32)}, 0 0 Z M0 0 L ${f(l * 0.85)} 0"
    fill="var(--gold-wash)" stroke="url(#${g})" stroke-width=".55"/>`
}

/* ── bezier helpers for the vines ─────────────────────────────────────────────────────── */

const bez = (p0, p1, p2, p3, t) => {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}

/** Sample a chain of cubic segments [[p0,p1,p2,p3], …] into n points with tangents. */
function sample(segs, n) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * segs.length
    const s = Math.min(segs.length - 1, Math.floor(u))
    const t = u - s
    const [a, b, c, d] = segs[s]
    const p = bez(a, b, c, d, t)
    const q = bez(a, b, c, d, Math.min(1, t + 0.01))
    const r = bez(a, b, c, d, Math.max(0, t - 0.01))
    pts.push({ x: p[0], y: p[1], a: Math.atan2(q[1] - r[1], q[0] - r[0]) })
  }
  return pts
}

/** A vine that winds along `segs`: a wavy stem, alternating leaves, the odd bud. */
function vine(segs, g, { n = 48, amp = 2.2, waves = 7, leaves = 9, size = 7, buds = [] } = {}) {
  const pts = sample(segs, n)
  const stem = pts
    .map((p, i) => {
      const w = Math.sin((i / n) * waves * TAU) * amp
      const x = p.x + Math.cos(p.a + Math.PI / 2) * w
      const y = p.y + Math.sin(p.a + Math.PI / 2) * w
      return `${i ? 'L' : 'M'}${f(x)} ${f(y)}`
    })
    .join(' ')
  let out = `<path data-draw pathLength="1" d="${stem}" fill="none" stroke="url(#${g})" stroke-width=".6" stroke-linecap="round"/>`
  for (let k = 0; k < leaves; k++) {
    const i = Math.round(((k + 0.5) / leaves) * n)
    const p = pts[Math.min(n, i)]
    const side = k % 2 ? 1 : -1
    out += leaf(p.x, p.y, p.a + side * 0.9, size * (0.85 + ((k * 7) % 3) * 0.1), g)
  }
  for (const b of buds) {
    const p = pts[Math.round(b * n)]
    out += rose(p.x, p.y, 2.6, g)
  }
  return out
}

/* ── the arch of rose vines over the names ──────────────────────────────────────────── */

/**
 * A Mughal ogee arch over the names, 300 × 104: a double gold line springing from two rose
 * clusters, a rose vine climbing its outside, a lotus finial at the apex.
 */
export function archSVG() {
  const g = `cf-arch-${++uid}`
  const W = 300
  const m = (segs) => segs.map((s) => s.map(([x, y]) => [W - x, y]))
  // left half, foot → apex
  const L = [
    [[12, 79], [12, 68], [12, 56], [15, 46]],
    [[15, 46], [21, 26], [60, 25], [98, 22]],
    [[98, 22], [127, 19], [144, 16], [150, 7]],
  ]
  const R = m(L)
  const path = (segs) => segs.map(([a, b, c, d], i) => `${i ? '' : `M${a[0]} ${a[1]} `}C ${b[0]} ${b[1]}, ${c[0]} ${c[1]}, ${d[0]} ${d[1]}`).join(' ')
  const shift = (segs, k) => segs.map((s) => s.map(([x, y]) => [x < 150 ? x + k : x > 150 ? x - k : x, y + k * 0.95]))
  const inner = (segs) => shift(segs, 4)
  const outer = (segs) => shift(segs, -4.5)
  const rev = (segs) => segs.slice().reverse().map(([a, b, c, d]) => [d, c, b, a])
  const wash = `${path(inner(L))} ${path(rev(inner(R))).replace(/^M[^C]+/, '')} Z`
  return `<svg class="cf-arch" viewBox="0 0 ${W} 96" aria-hidden="true">
    <defs>
      ${foilGrad(g, 0, 0, W, 96)}
      <linearGradient id="${g}-wash" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style="stop-color: var(--card-rose); stop-opacity: .26"/>
        <stop offset=".9" style="stop-color: var(--card-rose); stop-opacity: 0"/>
      </linearGradient>
    </defs>
    <path data-fill d="${wash}" fill="url(#${g}-wash)"/>
    <path data-draw pathLength="1" d="${path(L)}" fill="none" stroke="url(#${g})" stroke-width="1"/>
    <path data-draw pathLength="1" d="${path(R)}" fill="none" stroke="url(#${g})" stroke-width="1"/>
    <path data-draw pathLength="1" d="${path(inner(L))}" fill="none" stroke="url(#${g})" stroke-width=".45"/>
    <path data-draw pathLength="1" d="${path(inner(R))}" fill="none" stroke="url(#${g})" stroke-width=".45"/>
    ${vine(outer(L), g, { n: 72, amp: 1.5, waves: 11, leaves: 17, size: 4.6, buds: [0.3, 0.68] })}
    ${vine(outer(R), g, { n: 72, amp: 1.5, waves: 11, leaves: 17, size: 4.6, buds: [0.3, 0.68] })}
    ${leaf(8, 74, -2.5, 8, g)}${leaf(18, 79, -0.25, 7, g)}
    ${leaf(W - 8, 74, -0.64, 8, g)}${leaf(W - 18, 79, -2.89, 7, g)}
    ${rose(12, 77, 5.2, g)}${rose(15, 46, 4, g)}
    ${rose(W - 12, 77, 5.2, g)}${rose(W - 15, 46, 4, g)}
    <g transform="translate(150 6.5) scale(.74)">${lotusPaths(g)}</g>
  </svg>`
}

/** The little flower between the two names. */
export function knotSVG() {
  const g = `cf-knot-${++uid}`
  return `<svg class="cf-knot" viewBox="-12 -12 24 24" aria-hidden="true">
    <defs>${foilGrad(g, -12, -12, 24, 24)}</defs>
    ${ring(6, (k) => `<path data-draw pathLength="1" transform="${rot(k, 6)}" d="M0 -1.6 C 2.6 -3.5, 2.6 -7.5, 0 -10 C -2.6 -7.5, -2.6 -3.5, 0 -1.6 Z" fill="var(--card-rose)" fill-opacity=".6" stroke="url(#${g})" stroke-width=".7"/>`)}
    <circle data-fill r="1.8" fill="url(#${g})"/>
  </svg>`
}

/* ── the card face frame: double gold rule, corner filigree, crown lotus ──────────────── */

function cornerFiligree(g) {
  // the top-left corner: a rosette between the two rules, a small fleuron inside the notch
  const r = 12 // inner rule's concave corner radius
  const o = 15.5
  return `
    <g transform="translate(11.5 11.5)">
      ${ring(4, (k) => `<path data-fill transform="${rot(k + 0.5, 4)}" d="M0 -1 C 1.8 -2.2, 1.8 -4.4, 0 -5.6 C -1.8 -4.4, -1.8 -2.2, 0 -1 Z" fill="url(#${g})"/>`)}
      <circle data-fill r="1.1" fill="url(#${g})"/>
    </g>
    ${leaf(o + r * 0.62, o + r * 0.62, Math.PI / 4, 9, g)}
    ${leaf(o + r * 0.62, o + r * 0.62, Math.PI / 4 - 0.75, 6, g)}
    ${leaf(o + r * 0.62, o + r * 0.62, Math.PI / 4 + 0.75, 6, g)}`
}

export function frameSVG(w = 360, h = 504) {
  const g = `cf-frame-${++uid}`
  const corner = cornerFiligree(g)
  const o = 15.5, r = 12
  // inner rule with concave (quarter-round) corners
  const inner = `M${o + r} ${o} H${w - o - r} A ${r} ${r} 0 0 0 ${w - o} ${o + r} V${h - o - r} A ${r} ${r} 0 0 0 ${w - o - r} ${h - o}
    H${o + r} A ${r} ${r} 0 0 0 ${o} ${h - o - r} V${o + r} A ${r} ${r} 0 0 0 ${o + r} ${o} Z`
  return `<svg class="cf-frame" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <defs>${foilGrad(g, 0, 0, w, h)}</defs>
    <rect data-fill x="7.5" y="7.5" width="${w - 15}" height="${h - 15}" fill="none" stroke="url(#${g})" stroke-width="1.1"/>
    <path data-draw pathLength="1" d="${inner}" fill="none" stroke="url(#${g})" stroke-width=".5"/>
    <g>${corner}</g>
    <g transform="translate(${w} 0) scale(-1 1)">${corner}</g>
    <g transform="translate(0 ${h}) scale(1 -1)">${corner}</g>
    <g transform="translate(${w} ${h}) scale(-1 -1)">${corner}</g>
    <rect x="${w / 2 - 15}" y="4" width="30" height="13" fill="var(--card-ivory)"/>
    <g transform="translate(${w / 2} 14) scale(.72)">${lotusPaths(g, { draw: false })}</g>
    <rect x="${w / 2 - 10}" y="${h - 17}" width="20" height="13" fill="var(--card-ivory)"/>
    <path data-fill d="M${w / 2} ${h - 15} L${w / 2 + 4} ${h - 11} L${w / 2} ${h - 7} L${w / 2 - 4} ${h - 11} Z" fill="url(#${g})"/>
  </svg>`
}

/* ── gatefold cover: dusty pink stock, jali medallion straddling the seam ─────────────── */

/** Eight-pointed star (two squares) centred at cx, cy. */
function star8(cx, cy, R) {
  const r = R * 0.77
  const pts = []
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU - Math.PI / 2
    const rr = k % 2 ? r : R
    pts.push(`${f(cx + Math.cos(a) * rr)},${f(cy + Math.sin(a) * rr)}`)
  }
  return pts.join(' ')
}

/**
 * One door's outer face. The whole cover (360 × 504) is drawn once and each door shows its
 * half through the viewBox, so the medallion, monogram and ornaments meet exactly at the seam.
 */
export function coverSVG(side, { initials = ['', ''] } = {}) {
  const id = `cf-cov-${++uid}`
  const g = `${id}-g`
  const W = 360, H = 504, cx = 180, cy = 244
  const vx = side === 'left' ? 0 : 180
  const C = 14 // jali cell
  const holes = `<pattern id="${id}-pat" patternUnits="userSpaceOnUse" x="${cx - C / 2}" y="${cy - C / 2}" width="${C}" height="${C}">
      <polygon points="${star8(C / 2, C / 2, 5.4)}" fill="#000"/>
      <path d="M0 -1.9 L1.9 0 L0 1.9 L-1.9 0 Z M${C} -1.9 L${C + 1.9} 0 L${C} 1.9 L${C - 1.9} 0 Z M0 ${C - 1.9} L1.9 ${C} L0 ${C + 1.9} L-1.9 ${C} Z M${C} ${C - 1.9} L${C + 1.9} ${C} L${C} ${C + 1.9} L${C - 1.9} ${C} Z" fill="#000"/>
    </pattern>
    <pattern id="${id}-edge" patternUnits="userSpaceOnUse" x="${cx - C / 2}" y="${cy - C / 2}" width="${C}" height="${C}">
      <polygon points="${star8(C / 2, C / 2, 5.4)}" fill="none" stroke="var(--card-gold)" stroke-width=".55"/>
    </pattern>`
  const corner = (tx, ty, sx, sy) => `<g transform="translate(${tx} ${ty}) scale(${sx} ${sy})">
      <path d="M22 70 C 22 40, 34 26, 64 22" fill="none" stroke="url(#${g})" stroke-width=".9"/>
      <path d="M30 60 C 32 44, 42 33, 56 31" fill="none" stroke="url(#${g})" stroke-width=".55"/>
      ${leaf(64, 22, 0.15, 9, g, { draw: false })}${leaf(22, 70, 1.42, 9, g, { draw: false })}
      <circle cx="31" cy="31" r="2.2" fill="url(#${g})"/>
    </g>`
  return `<svg class="door__art" viewBox="${vx} 0 180 ${H}" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      ${foilGrad(g, 0, 0, W, H, { live: false })}
      ${holes}
      <radialGradient id="${id}-stock" cx=".5" cy=".42" r=".75">
        <stop offset="0" style="stop-color: var(--rose-light)"/>
        <stop offset="1" style="stop-color: var(--card-rose)"/>
      </radialGradient>
      <mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
        <rect width="${W}" height="${H}" fill="#fff"/>
        <circle cx="${cx}" cy="${cy}" r="84" fill="url(#${id}-pat)"/>
        <circle cx="${cx}" cy="${cy}" r="33" fill="#fff"/>
      </mask>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#${id}-stock)" mask="url(#${id}-mask)"/>
    <circle cx="${cx}" cy="${cy}" r="84" fill="url(#${id}-edge)"/>
    <rect x="12.5" y="12.5" width="${W - 25}" height="${H - 25}" fill="none" stroke="url(#${g})" stroke-width="1.3"/>
    <rect x="17.5" y="17.5" width="${W - 35}" height="${H - 35}" fill="none" stroke="url(#${g})" stroke-width=".5"/>
    ${corner(0, 0, 1, 1)}${corner(W, 0, -1, 1)}${corner(0, H, 1, -1)}${corner(W, H, -1, -1)}
    <circle cx="${cx}" cy="${cy}" r="86.5" fill="none" stroke="url(#${g})" stroke-width="1.4"/>
    <circle cx="${cx}" cy="${cy}" r="91" fill="none" stroke="url(#${g})" stroke-width=".5"/>
    ${ring(36, (k) => {
      const a = (k / 36) * TAU
      return `<circle cx="${f(cx + Math.cos(a) * 95)}" cy="${f(cy + Math.sin(a) * 95)}" r="1.15" fill="url(#${g})"/>`
    })}
    ${ring(12, (k) => {
      const a = ((k + 0.5) / 12) * TAU
      return leaf(cx + Math.cos(a) * 99, cy + Math.sin(a) * 99, a, 8, g, { draw: false })
    })}
    <circle cx="${cx}" cy="${cy}" r="33" fill="none" stroke="url(#${g})" stroke-width="1.3"/>
    <circle cx="${cx}" cy="${cy}" r="29" fill="none" stroke="url(#${g})" stroke-width=".5"/>
    <text x="${cx - 13.5}" y="${cy + 9}" text-anchor="middle" class="door__mono" fill="url(#${g})">${initials[0]}</text>
    <text x="${cx + 13.5}" y="${cy + 9}" text-anchor="middle" class="door__mono" fill="url(#${g})">${initials[1]}</text>
    <g transform="translate(${cx} ${cy - 112}) scale(1.25)">${lotusPaths(g, { draw: false })}</g>
    <g transform="translate(${cx} ${cy + 112}) scale(1.25 -1.25)">${lotusPaths(g, { draw: false })}</g>
    <path d="M${cx} ${cy + 150} L${cx + 5} ${cy + 156} L${cx} ${cy + 162} L${cx - 5} ${cy + 156} Z" fill="url(#${g})"/>
    <path d="M${cx - 40} ${cy + 156} H${cx - 10} M${cx + 10} ${cy + 156} H${cx + 40}" stroke="url(#${g})" stroke-width=".6"/>
    <line x1="${side === 'left' ? 179.6 : 180.4}" y1="0" x2="${side === 'left' ? 179.6 : 180.4}" y2="${H}" stroke="var(--rose-deep)" stroke-opacity=".5" stroke-width=".8"/>
  </svg>`
}

/** A door's inner face: ivory, a rose vine running round the border, a lotus at the centre. */
export function doorInnerSVG() {
  const g = `cf-in-${++uid}`
  const W = 180, H = 504, m = 16
  const top = [[[m, m + 30], [m, m + 8], [m + 8, m], [m + 30, m]], [[m + 30, m], [70, m - 2], [110, m + 2], [W - m - 30, m]]]
  const side = [[[m, m + 30], [m - 2, 160], [m + 2, 340], [m, H - m - 30]]]
  const sideR = [[[W - m, m + 30], [W - m + 2, 160], [W - m - 2, 340], [W - m, H - m - 30]]]
  const bottom = [[[m, H - m - 30], [m, H - m - 8], [m + 8, H - m], [m + 30, H - m]], [[m + 30, H - m], [70, H - m + 2], [110, H - m - 2], [W - m - 30, H - m]]]
  return `<svg class="door__art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <defs>${foilGrad(g, 0, 0, W, H, { live: false })}</defs>
    <rect width="${W}" height="${H}" fill="var(--card-ivory)"/>
    <rect x="8.5" y="8.5" width="${W - 17}" height="${H - 17}" fill="none" stroke="url(#${g})" stroke-width=".8"/>
    ${vine(top, g, { n: 40, amp: 2.2, waves: 6, leaves: 8, size: 6, buds: [0.6] })}
    ${vine(bottom, g, { n: 40, amp: 2.2, waves: 6, leaves: 8, size: 6, buds: [0.6] })}
    ${vine(side, g, { n: 60, amp: 2.6, waves: 10, leaves: 14, size: 6, buds: [0.33, 0.66] })}
    ${vine(sideR, g, { n: 60, amp: 2.6, waves: 10, leaves: 14, size: 6, buds: [0.33, 0.66] })}
    ${rose(m + 2, m + 2, 7, g, { draw: false })}${rose(W - m - 2, m + 2, 7, g, { draw: false })}
    ${rose(m + 2, H - m - 2, 7, g, { draw: false })}${rose(W - m - 2, H - m - 2, 7, g, { draw: false })}
    <g transform="translate(${W / 2} ${H / 2 + 8}) scale(1.4)">${lotusPaths(g, { draw: false })}</g>
  </svg>`
}

/* ── the envelope ─────────────────────────────────────────────────────────────────────── */

export const ENV = { w: 392, h: 536, x: -16, y: -14, tip: 296 }

/** Envelope back panel (what shows inside the V): dusty pink liner with gold dots. */
export function envBackSVG() {
  const id = `cf-env-${++uid}`
  const { w, h } = ENV
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <defs>
      <pattern id="${id}-dots" patternUnits="userSpaceOnUse" width="12" height="12">
        <circle cx="3" cy="3" r=".9" fill="var(--card-gold)" fill-opacity=".7"/>
        <circle cx="9" cy="9" r=".9" fill="var(--card-gold)" fill-opacity=".7"/>
      </pattern>
    </defs>
    <rect width="${w}" height="${h}" rx="5" fill="var(--rose-deep)"/>
    <rect width="${w}" height="${h}" rx="5" fill="url(#${id}-dots)"/>
  </svg>`
}

/** Envelope pocket: the ivory body with a V opening at the top. */
export function envPocketSVG() {
  const { w, h } = ENV
  const v = 238
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <path d="M0 5 Q0 0 5 0 L${w / 2} ${v} L${w - 5} 0 Q${w} 0 ${w} 5 L${w} ${h - 5} Q${w} ${h} ${w - 5} ${h} L5 ${h} Q0 ${h} 0 ${h - 5} Z" fill="var(--env-paper)"/>
    <path d="M0 ${h} L${w / 2} ${v + 70} L${w} ${h}" fill="var(--env-shade)" fill-opacity=".55"/>
    <path d="M2 2 L${w / 2} ${v} L${w - 2} 2" fill="none" stroke="var(--env-edge)" stroke-width="1.4"/>
    <path d="M0 ${h} L${w / 2} ${v + 70} L${w} ${h}" fill="none" stroke="var(--env-edge)" stroke-opacity=".6" stroke-width=".8"/>
  </svg>`
}

/** The flap: ivory outside, liner inside (two faces, flipped with rotateX). */
export function envFlapSVG(face) {
  const id = `cf-flap-${++uid}`
  const { w, tip } = ENV
  const d = `M0 5 Q0 0 5 0 L${w - 5} 0 Q${w} 0 ${w} 5 L${w / 2 + 14} ${tip - 6} Q${w / 2} ${tip + 4} ${w / 2 - 14} ${tip - 6} Z`
  if (face === 'inside') {
    return `<svg viewBox="0 0 ${w} ${tip + 6}" aria-hidden="true">
      <defs><pattern id="${id}-dots" patternUnits="userSpaceOnUse" width="12" height="12">
        <circle cx="3" cy="3" r=".9" fill="var(--card-gold)" fill-opacity=".8"/><circle cx="9" cy="9" r=".9" fill="var(--card-gold)" fill-opacity=".8"/>
      </pattern></defs>
      <path d="${d}" fill="var(--rose-deep)"/><path d="${d}" fill="url(#${id}-dots)"/>
      <path d="${d}" fill="none" stroke="var(--card-gold)" stroke-width="1"/>
    </svg>`
  }
  return `<svg viewBox="0 0 ${w} ${tip + 6}" aria-hidden="true">
    <path d="${d}" fill="var(--env-shade)" transform="translate(0 3)" fill-opacity=".5"/>
    <path d="${d}" fill="var(--env-paper-hi)"/>
    <path d="M14 8 L${w / 2} ${tip - 22} L${w - 14} 8" fill="none" stroke="var(--card-gold)" stroke-opacity=".75" stroke-width=".8"/>
  </svg>`
}

/** Wax seal (berry), one half: 'l' | 'r'. The crack runs in a jagged line down the middle. */
export function sealSVG(half) {
  const id = `cf-seal-${++uid}`
  const R = 30
  // irregular wax edge
  const edge = []
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * TAU
    const r = R + Math.sin(k * 2.7) * 1.6 + Math.cos(k * 1.3) * 1.1
    edge.push(`${f(Math.cos(a) * r)},${f(Math.sin(a) * r)}`)
  }
  const crack = 'M2 -34 L-2 -22 L3 -12 L-3 -1 L2 9 L-2 20 L1 34'
  const clip = half === 'l' ? `${crack} L-40 34 L-40 -34 Z` : `${crack} L40 34 L40 -34 Z`
  return `<svg viewBox="-36 -36 72 72" aria-hidden="true">
    <defs>
      <clipPath id="${id}-c"><path d="${clip}"/></clipPath>
      <radialGradient id="${id}-w" cx=".38" cy=".32" r=".8">
        <stop offset="0" style="stop-color: color-mix(in srgb, var(--berry) 70%, var(--card-ivory))"/>
        <stop offset=".45" style="stop-color: var(--berry)"/>
        <stop offset="1" style="stop-color: var(--berry-deep)"/>
      </radialGradient>
    </defs>
    <g clip-path="url(#${id}-c)">
      <polygon points="${edge.join(' ')}" fill="url(#${id}-w)"/>
      <circle r="21" fill="none" stroke="var(--berry-deep)" stroke-width="2.2" stroke-opacity=".7"/>
      <circle r="21" fill="none" stroke="color-mix(in srgb, var(--berry) 55%, var(--card-ivory))" stroke-width=".8" stroke-opacity=".55" transform="translate(-.7 -.7)"/>
      <g transform="translate(0 7) scale(1.25)" fill="var(--berry-deep)" fill-opacity=".85" stroke="color-mix(in srgb, var(--berry) 50%, var(--card-ivory))" stroke-opacity=".5" stroke-width=".5">
        <path d="M0 0 C -3 -4, -3 -10, 0 -14 C 3 -10, 3 -4, 0 0 Z"/>
        <path d="M-1 0 C -6 -2, -9 -7, -9 -11 C -5 -9, -2 -5, -1 0 Z"/>
        <path d="M1 0 C 6 -2, 9 -7, 9 -11 C 5 -9, 2 -5, 1 0 Z"/>
        <path d="M-10 1.6 Q 0 4, 10 1.6" fill="none"/>
      </g>
    </g>
  </svg>`
}
