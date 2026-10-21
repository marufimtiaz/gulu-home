/*
 * Scene stylesheets stay loaded after a scene is left. If two scenes share a class name, the
 * one visited later restyles the other (this once turned the house walls black after the
 * finale). For each scene: record its computed colours/fonts, visit every other scene, come
 * back, and require identical styles. vite.config.js scopes scene CSS to prevent this.
 */
import { expect, test } from '@playwright/test'
import { open } from './helpers.js'

const ALL = ['door', 'house', 'living', 'kitchen', 'garden', 'rooftop', 'desk', 'empty', 'finale', 'card']
const DONE = ['living', 'kitchen', 'garden', 'rooftop', 'desk', 'empty', 'finale']

const snapshot = (page, id) =>
  page.evaluate((sid) => {
    const root = document.querySelector(`.scene[data-scene="${sid}"]`)
    // fx elements (stars, fireflies) are randomised per mount — not comparable, and not scene CSS
    const els = [...root.querySelectorAll('*')].filter((el) => !el.closest('.stars, .firefly, .fireworks, canvas')).slice(0, 600)
    return els.map((el) => {
      const s = getComputedStyle(el)
      // per-mount unique paint-server ids (url(#cf-frame-19)) → url(#cf-frame-N)
      const norm = (v) => v.replace(/(url\("?#[\w-]*?)-\d+(-[\w-]+)?("?\))/g, '$1-N$2$3')
      return [el.tagName, el.getAttribute('class') ?? '', norm(s.fill), norm(s.stroke), s.backgroundColor, s.color, s.fontFamily].join('|')
    })
  }, id)

async function visit(page, id) {
  await page.evaluate((r) => window.__home.go(r), id)
  await expect(page.locator(`.scene[data-scene="${id}"]`)).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.scene')).toHaveCount(1, { timeout: 15_000 }) // crossfade finished
}

for (const id of ALL) {
  test(`${id} looks the same after visiting every other scene`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'style isolation is viewport-independent')
    test.setTimeout(120_000)
    // first load: only this scene's CSS (and what boot needs) is in the page
    await open(page, id, { done: DONE })
    await expect(page.locator('.scene')).toHaveCount(1, { timeout: 15_000 })
    await page.waitForTimeout(400)
    const before = await snapshot(page, id)
    for (const other of ALL) if (other !== id && other !== 'door') await visit(page, other)
    await visit(page, id)
    await page.waitForTimeout(400)
    const after = await snapshot(page, id)
    const n = Math.min(before.length, after.length)
    const diffs = []
    for (let i = 0; i < n; i++) if (before[i] !== after[i]) diffs.push(`${before[i]}\n   → ${after[i]}`)
    expect(diffs.slice(0, 8).join('\n'), `${diffs.length} elements restyled`).toBe('')
  })
}
