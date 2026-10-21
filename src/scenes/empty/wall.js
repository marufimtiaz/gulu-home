/*
 * Where each note goes on the wall. Pure and deterministic: a note's jitter and tilt are
 * seeded by its index, so it keeps its little lean however many notes join it.
 *
 *   place(notes, { w, h, cols = 2, gap = 60 }) → [{ x, y, rot, w, h, col, row }]
 *
 * Notes fill a `cols`-column grid row by row. When the rows would come closer than `gap`
 * px, columns are added instead (a crowded wall gets denser, never overlapping). Each note
 * gets a box (w × h) inside its cell; jitter only moves the box within the cell's spare
 * room, so boxes never overlap and neighbours in a column stay ≥ gap apart.
 */
const JX = 0.16 // share of the cell width used for sideways jitter
const JY = 0.12 // share of the cell height used for vertical jitter
const ROT = 3.5 // degrees either way

/** Small seeded PRNG (mulberry32). */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function place(notes, { w, h, cols = 2, gap = 60 } = {}) {
  const n = notes?.length ?? 0
  if (!n || !(w > 0) || !(h > 0)) return []
  const maxRows = Math.max(1, Math.floor((h * (1 - JY)) / gap))
  let c = Math.max(1, Math.min(cols, n))
  while (Math.ceil(n / c) > maxRows && c < n) c++
  const rows = Math.ceil(n / c)
  const cw = w / c
  const ch = h / rows
  const bw = cw * (1 - JX) - 2
  const bh = ch * (1 - JY) - 2
  const out = []
  for (let i = 0; i < n; i++) {
    const r = rng(i * 9973 + 17)
    const col = i % c
    const row = Math.floor(i / c)
    out.push({
      x: col * cw + 1 + r() * cw * JX,
      y: row * ch + 1 + r() * ch * JY,
      rot: (r() * 2 - 1) * ROT,
      w: bw,
      h: bh,
      col,
      row,
    })
  }
  return out
}
