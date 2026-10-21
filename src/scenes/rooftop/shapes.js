/*
 * Memory constellations: hand-placed star layouts and the line drawing that fades in when a
 * group is complete. Everything lives in a 0..1 unit box (y down).
 *
 * Every layout keeps its stars at least 0.2 apart on one axis, so that at the smallest
 * phone size (~90 px groups) no two stars' 44 px tap targets cover each other's centres.
 *
 *   SHAPES[name] = { stars: [[x, y], …] (5–8), outline: 'svg path d' }
 *   layout(memories, { w, h }) → [{ i, cx, cy, size }]  non-overlapping square boxes
 */

// a flower head: five petals round a centre (bouquet)
const bloom = (cx, cy, r = 0.075) => {
  let d = ''
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2
    const px = cx + Math.cos(a) * r * 0.75
    const py = cy + Math.sin(a) * r * 0.75
    const pr = r * 0.48
    d += `M${f(px - pr)} ${f(py)} a${f(pr)} ${f(pr)} 0 1 0 ${f(pr * 2)} 0 a${f(pr)} ${f(pr)} 0 1 0 ${f(-pr * 2)} 0 `
  }
  return d
}
const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)} Z `
function f(n) {
  return Math.round(n * 1000) / 1000
}

export const SHAPES = {
  // the bouquet from the flower-bucket day
  flowers: {
    stars: [[0.5, 0.08], [0.2, 0.22], [0.8, 0.22], [0.5, 0.34], [0.22, 0.5], [0.78, 0.5], [0.5, 0.94]],
    outline:
      bloom(0.5, 0.1) + bloom(0.22, 0.24) + bloom(0.78, 0.24) + bloom(0.5, 0.34, 0.06) +
      'M0.24 0.31 L0.44 0.66 M0.5 0.18 V0.66 M0.5 0.4 V0.66 M0.76 0.31 L0.56 0.66 ' +
      'M0.2 0.48 H0.8 L0.54 0.94 H0.46 Z M0.36 0.48 L0.48 0.94 M0.64 0.48 L0.52 0.94 ' +
      'M0.5 0.7 C0.38 0.6 0.34 0.78 0.5 0.72 C0.66 0.78 0.62 0.6 0.5 0.7 Z',
  },
  // a Rajshahi rickshaw: hood, seat, big back wheel, little front wheel, handlebar
  rickshaw: {
    stars: [[0.36, 0.1], [0.08, 0.4], [0.52, 0.5], [0.9, 0.5], [0.62, 0.72], [0.3, 0.76], [0.84, 0.86]],
    outline:
      'M0.1 0.52 C0.04 0.2 0.2 0.08 0.38 0.1 C0.5 0.12 0.54 0.3 0.5 0.5 ' +
      'M0.06 0.52 H0.54 L0.5 0.64 H0.12 Z ' +
      circle(0.3, 0.76, 0.17) + circle(0.84, 0.86, 0.09) +
      'M0.3 0.76 L0.5 0.64 M0.48 0.64 L0.84 0.86 M0.84 0.86 L0.88 0.5 M0.82 0.5 H0.96 ' +
      'M0.3 0.6 V0.92 M0.14 0.76 H0.46',
  },
  // a cup of tea, steam rising
  teacup: {
    stars: [[0.42, 0.1], [0.12, 0.4], [0.72, 0.4], [0.93, 0.6], [0.42, 0.8], [0.02, 0.88], [0.86, 0.9]],
    outline:
      'M0.12 0.4 H0.72 C0.72 0.62 0.62 0.8 0.42 0.8 C0.22 0.8 0.12 0.62 0.12 0.4 Z ' +
      'M0.72 0.46 C0.9 0.4 0.98 0.54 0.92 0.62 C0.86 0.7 0.76 0.68 0.68 0.66 ' +
      'M0.02 0.88 C0.2 0.97 0.66 0.97 0.86 0.9 ' +
      'M0.32 0.32 C0.26 0.25 0.38 0.19 0.32 0.11 M0.5 0.32 C0.44 0.25 0.56 0.19 0.5 0.11',
  },
  // the phone that said "I love you toooo"
  phone: {
    stars: [[0.24, 0.06], [0.76, 0.06], [0.5, 0.1], [0.5, 0.47], [0.5, 0.88], [0.24, 0.94], [0.76, 0.94]],
    outline:
      'M0.3 0.04 H0.7 Q0.78 0.04 0.78 0.12 V0.88 Q0.78 0.96 0.7 0.96 H0.3 Q0.22 0.96 0.22 0.88 V0.12 Q0.22 0.04 0.3 0.04 Z ' +
      'M0.28 0.17 H0.72 V0.8 H0.28 Z M0.44 0.105 H0.56 ' +
      circle(0.5, 0.88, 0.03) +
      'M0.5 0.57 C0.4 0.5 0.35 0.44 0.39 0.38 C0.43 0.33 0.48 0.35 0.5 0.4 C0.52 0.35 0.57 0.33 0.61 0.38 C0.65 0.44 0.6 0.5 0.5 0.57 Z',
  },
  // the ring
  ring: {
    stars: [[0.5, 0.08], [0.29, 0.41], [0.71, 0.41], [0.2, 0.62], [0.8, 0.62], [0.29, 0.83], [0.71, 0.83], [0.5, 0.92]],
    outline:
      circle(0.5, 0.62, 0.3) + circle(0.5, 0.62, 0.23) +
      'M0.5 0.32 L0.37 0.21 L0.44 0.08 H0.56 L0.63 0.21 Z M0.37 0.21 H0.63 M0.44 0.08 L0.47 0.21 L0.5 0.32 M0.56 0.08 L0.53 0.21',
  },
  // the birthday cake
  cake: {
    stars: [[0.5, 0.06], [0.28, 0.38], [0.72, 0.38], [0.08, 0.62], [0.92, 0.62], [0.08, 0.92], [0.92, 0.92]],
    outline:
      'M0.08 0.62 H0.92 V0.92 H0.08 Z M0.28 0.38 H0.72 V0.62 H0.28 Z ' +
      'M0.08 0.7 Q0.17 0.77 0.26 0.7 Q0.35 0.77 0.44 0.7 Q0.53 0.77 0.62 0.7 Q0.71 0.77 0.8 0.7 Q0.86 0.75 0.92 0.7 ' +
      'M0.28 0.45 Q0.39 0.5 0.5 0.45 Q0.61 0.5 0.72 0.45 ' +
      'M0.5 0.38 V0.2 M0.5 0.19 C0.44 0.13 0.48 0.08 0.5 0.03 C0.52 0.08 0.56 0.13 0.5 0.19 Z',
  },
  heart: {
    stars: [[0.5, 0.3], [0.27, 0.13], [0.73, 0.13], [0.06, 0.34], [0.94, 0.34], [0.2, 0.62], [0.8, 0.62], [0.5, 0.92]],
    outline: 'M0.5 0.3 C0.42 0.1 0.06 0.08 0.06 0.33 C0.06 0.57 0.36 0.76 0.5 0.92 C0.64 0.76 0.94 0.57 0.94 0.33 C0.94 0.08 0.58 0.1 0.5 0.3 Z',
  },
  // our house
  house: {
    stars: [[0.5, 0.06], [0.72, 0.12], [0.1, 0.44], [0.9, 0.44], [0.5, 0.68], [0.18, 0.94], [0.82, 0.94]],
    outline:
      'M0.1 0.44 L0.5 0.06 L0.9 0.44 M0.18 0.37 V0.94 H0.82 V0.37 ' +
      'M0.42 0.94 V0.68 H0.58 V0.94 M0.26 0.5 H0.38 V0.62 H0.26 Z M0.62 0.5 H0.74 V0.62 H0.62 Z ' +
      'M0.68 0.26 V0.12 H0.76 V0.33',
  },
}

/** Shape for a memory (unknown names fall back to the heart). */
export const shapeOf = (name) => SHAPES[name] ?? SHAPES.heart

// tiny deterministic random: the sky looks the same every visit
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * Places one square box per memory inside a w×h area. Boxes never overlap: each sits in
 * its own grid cell (the grid shape that gives the biggest boxes), jittered within the cell's
 * slack so the sky doesn't look like a spreadsheet. An unfilled last row is centred.
 *   { fill = 0.88 }  box side as a share of the cell's short side
 *   { max = 210 }    largest box side in px (big screens keep constellations star-sized)
 */
export function layout(memories, { w, h, fill = 0.88, max = 210 } = {}) {
  const n = memories.length
  if (!n || !(w > 0) || !(h > 0)) return []
  let best = null
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols)
    if (rows * cols - n >= cols) continue // an empty row
    const s = Math.min(w / cols, h / rows)
    // prefer bigger boxes; on ties prefer the grid closer to the area's shape
    const score = s - Math.abs(w / cols - h / rows) * 0.001
    if (!best || score > best.score) best = { cols, rows, score }
  }
  const { cols, rows } = best
  const cw = w / cols
  const ch = h / rows
  const size = Math.min(max, Math.min(cw, ch) * fill)
  const rand = rng(97 + n)
  const out = []
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols)
    const inRow = r === rows - 1 ? n - r * cols : cols
    const c = i % cols
    const offset = ((cols - inRow) * cw) / 2
    const slackX = (cw - size) / 2
    const slackY = (ch - size) / 2
    // alternate rows lean opposite ways, plus a little randomness
    const lean = (r % 2 ? -1 : 1) * 0.35
    const jx = Math.max(-1, Math.min(1, lean + (rand() - 0.5) * 1.1)) * slackX * 0.85
    const jy = (rand() - 0.5) * 2 * slackY * 0.85
    out.push({ i, cx: offset + cw * (c + 0.5) + jx, cy: ch * (r + 0.5) + jy, size })
  }
  return out
}
