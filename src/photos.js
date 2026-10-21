/*
 * Photos in public/photos/, listed at build time by the virtual:photos plugin (vite.config.js).
 * Dates come from camera-style filenames: IMG_20251120_154558.jpg → 20 Nov 2025 15:45.
 */
import manifest from 'virtual:photos'

export function dateFromName(file) {
  const m = String(file).match(/(20\d{2})(\d{2})(\d{2})[_-]?(\d{2})?(\d{2})?/)
  if (!m) return null
  const [, y, mo, d, h = '12', mi = '00'] = m
  const date = new Date(+y, +mo - 1, +d, +h, +mi)
  return Number.isNaN(date.getTime()) || +mo < 1 || +mo > 12 ? null : date
}

export function build(list) {
  return list.map(({ file, w, h }) => ({
    file,
    src: `/photos/${file}`,
    thumb: w ? `/photos/thumbs/${file}` : `/photos/${file}`,
    w,
    h,
    date: dateFromName(file),
  }))
}

const ALL = build(manifest)

/** Every photo, sorted by filename (≈ chronological for camera names). */
export const all = () => ALL

/** Photo by filename, or null. */
export const byFile = (file) => ALL.find((p) => p.file === file) ?? null

/** The latest `n` dated photos taken on or before `date`, newest first. */
export function upTo(date, n = 3, list = ALL) {
  const t = +date
  return list
    .filter((p) => p.date && +p.date <= t)
    .sort((a, b) => b.date - a.date)
    .slice(0, n)
}
