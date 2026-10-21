/*
 * The tree's real age. Pure — no DOM, no config import — so it unit-tests cleanly.
 *
 *   treeAge(weddingDate, now) → { years, anniversaryWeek }
 *     years           whole years since the wedding (0 before it and during the first year)
 *     anniversaryWeek the 7 days starting on the wedding day / each anniversary
 *   treeStage(years) → 0..5   0 = the sapling; every anniversary adds a ring, up to 5
 */

function toDate(d) {
  if (d instanceof Date) return d
  const m = String(d ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null
}

export function treeAge(weddingDate, now = new Date()) {
  const w = toDate(weddingDate)
  if (!w || now < w) return { years: 0, anniversaryWeek: false }
  const on = (y) => new Date(w.getFullYear() + y, w.getMonth(), w.getDate())
  let years = now.getFullYear() - w.getFullYear()
  if (now < on(years)) years--
  const since = (now - on(years)) / 86400000
  return { years, anniversaryWeek: since < 7 }
}

export const treeStage = (years) => Math.max(0, Math.min(5, Math.floor(Number(years) || 0)))
