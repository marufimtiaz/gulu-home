import { expect, test } from '@playwright/test'
import { VIEWPORTS, collectErrors, open, shot } from './helpers.js'
import config from '../../src/content/config.js'
import { SHAPES } from '../../src/scenes/rooftop/shapes.js'

const MEMORIES = config.rooftop.memories
const PAPER = MEMORIES.findIndex((m) => m.shape === 'flowers') // the flower-bucket day (also used for the paper-fallback test)
const count = (i) => SHAPES[MEMORIES[i].shape].stars.length
const scene = (page) => page.locator('.scene[data-scene="rooftop"]')

async function centre(page, sel) {
  const b = await page.locator(sel).first().boundingBox()
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

/** A real tap at a star's centre (stars can sit close together; the scene picks the nearest). */
async function tapStar(page, g, j) {
  const p = await centre(page, `[data-group="${g}"] [data-star="${j}"]`)
  await page.mouse.click(p.x, p.y)
}

async function joinGroup(page, g) {
  for (let j = 0; j < count(g); j++) await tapStar(page, g, j)
}

async function completeAll(page) {
  await page.evaluate((n) => {
    for (let i = 0; i < n; i++) window.__rooftop.complete(i)
  }, MEMORIES.length)
}

/** Waits for the shooting star to be well inside the screen, then taps where it is. */
async function catchShootingStar(page) {
  const p = await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-shooting]')
      if (!el || el.hidden || Number(getComputedStyle(el).opacity) < 0.6) return null
      const r = el.getBoundingClientRect()
      const x = r.left + r.width / 2
      const y = r.top + r.height / 2
      return x > 40 && x < innerWidth - 40 && y > 40 ? { x, y } : null
    },
    null,
    { timeout: 12_000, polling: 'raf' },
  )
  const { x, y } = await p.jsonValue()
  await page.mouse.click(x, y)
}

async function holdWish(page, ms = 2400) {
  const p = await centre(page, '[data-wish]')
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
}

test('every memory is a constellation of bright stars', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'rooftop')
  await expect(page.locator('[data-group]')).toHaveCount(MEMORIES.length)
  for (let i = 0; i < MEMORIES.length; i++) await expect(page.locator(`[data-group="${i}"] [data-star]`)).toHaveCount(count(i))
  await expect(page.locator('[data-polaroid]')).toBeHidden()
  await expect(page.locator('[data-shooting]')).toBeHidden()
  await page.waitForTimeout(400)
  await shot(page, 'rooftop-start')
  expect(errors).toEqual([])
})

test('joining a group draws its lines and picture, then its polaroid', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'rooftop')
  const n = count(0)
  // any order: last star first
  await tapStar(page, 0, n - 1)
  for (let j = 0; j < n - 1; j++) await tapStar(page, 0, j)
  await expect(page.locator('[data-group="0"] line')).toHaveCount(n - 1)
  await expect(page.locator('[data-group="0"]')).toHaveClass(/is-done/)
  const pol = page.locator('[data-polaroid]')
  await expect(pol).toBeVisible()
  await expect(pol).toContainText(MEMORIES[0].title)
  await expect(page.locator('[data-polaroid-date]')).toHaveText('20 April 2022')
  await expect(pol.locator('img')).toHaveCount(1)
  await expect(pol).not.toHaveClass(/polaroid--paper/)
  // the outline has drawn itself
  await expect.poll(() => page.locator('[data-group="0"] .rt-cg__outline').evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset))).toBeLessThan(0.05)
  await page.waitForTimeout(900)
  await shot(page, 'rooftop-polaroid')
  await page.locator('[data-polaroid-close]').click()
  await expect(pol).toBeHidden()
  await expect(page.locator('[data-prompt]')).toContainText(`1 of ${MEMORIES.length}`)
  // tapping a finished constellation brings its memory back
  await tapStar(page, 0, 0)
  await expect(pol).toBeVisible()
  await expect(pol).toContainText(MEMORIES[0].title)
  expect(errors).toEqual([])
})

test('a memory whose photo is missing gets a paper polaroid instead of a broken image', async ({ page }) => {
  expect(PAPER).toBeGreaterThanOrEqual(0)
  // the photo can't be loaded (a typo in config.js, or a file not added yet) → paper fallback
  if (MEMORIES[PAPER].photo) await page.route(`**/${MEMORIES[PAPER].photo}`, (r) => r.fulfill({ status: 404 }))
  const errors = collectErrors(page)
  await open(page, 'rooftop')
  await joinGroup(page, PAPER)
  const pol = page.locator('[data-polaroid]')
  await expect(pol).toBeVisible()
  await expect(pol).toHaveClass(/polaroid--paper/)
  await expect(pol.locator('img')).toHaveCount(0)
  await expect(pol.locator('.rt-sketch path.rt-sketch__line')).toHaveCount(1)
  if (!MEMORIES[PAPER].date) await expect(page.locator('[data-polaroid-date]')).toHaveCount(0)
  await expect(pol).toContainText(MEMORIES[PAPER].title)
  await page.waitForTimeout(900)
  await shot(page, 'rooftop-polaroid-paper')
  expect(errors.filter((e) => !/404|Failed to load resource/.test(e))).toEqual([])
})

test('another group is ignored until the current one is finished', async ({ page }) => {
  await open(page, 'rooftop')
  await tapStar(page, 1, 0)
  await tapStar(page, 1, 1)
  await tapStar(page, 2, 0)
  await expect(page.locator('[data-group="2"] .rt-star.is-lit')).toHaveCount(0)
  await expect(page.locator('[data-prompt]')).toContainText('finish this one first')
  await expect(page.locator('[data-group="1"] line')).toHaveCount(1)
  // tapping a star that's already lit doesn't add a line
  await tapStar(page, 1, 1)
  await expect(page.locator('[data-group="1"] line')).toHaveCount(1)
})

test('a finger can slide through the stars', async ({ page }) => {
  await open(page, 'rooftop')
  const g = 2
  const pts = []
  for (let j = 0; j < count(g); j++) pts.push(await centre(page, `[data-group="${g}"] [data-star="${j}"]`))
  await page.mouse.move(pts[0].x, pts[0].y)
  await page.mouse.down()
  for (let j = 1; j < pts.length; j++) await page.mouse.move(pts[j].x, pts[j].y, { steps: 6 })
  await page.mouse.up()
  await expect(page.locator(`[data-group="${g}"]`)).toHaveClass(/is-done/)
  await expect(page.locator('[data-polaroid]')).toBeVisible()
})

test('all found → shooting star → catch → hold to wish → complete', async ({ page }) => {
  test.setTimeout(60_000)
  const errors = collectErrors(page)
  await open(page, 'rooftop')
  await completeAll(page)
  await expect(page.locator('[data-shooting]')).toBeVisible({ timeout: 5000 })
  await shot(page, 'rooftop-all')
  await catchShootingStar(page)
  await expect(page.locator('[data-wish]')).toBeVisible()
  await expect(page.locator('[data-wish-text]')).toContainText(config.rooftop.wish)
  await page.waitForTimeout(900)
  await shot(page, 'rooftop-wish')
  // a short hold isn't enough…
  await holdWish(page, 600)
  await expect(scene(page)).not.toHaveAttribute('data-done', 'true')
  // …but it adds up
  await holdWish(page, 1800)
  await expect(page.locator('[data-wish-text]')).toContainText(config.rooftop.wishAfter, { timeout: 5000 })
  await expect(scene(page)).toHaveAttribute('data-done', 'true')
  await expect(page.locator('[data-back]')).toBeVisible()
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.rooftop)
  expect(done).toBe(true)
  await page.waitForTimeout(700)
  await shot(page, 'rooftop-done')
  await page.locator('[data-back]').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await expect.poll(() => page.evaluate(() => typeof window.__rooftop)).toBe('undefined')
  expect(errors).toEqual([])
})

test('a missed shooting star comes round again', async ({ page }) => {
  test.setTimeout(45_000)
  await open(page, 'rooftop')
  await completeAll(page)
  const star = page.locator('[data-shooting]')
  await expect(star).toBeVisible({ timeout: 8000 })
  await expect(star).toBeHidden({ timeout: 4000 })
  await expect(star).toBeVisible({ timeout: 6000 })
})

test('re-entering a finished rooftop starts with an empty sky and completes again', async ({ page }) => {
  test.setTimeout(60_000)
  const errors = collectErrors(page)
  await open(page, 'rooftop', { done: ['rooftop'] })
  await expect(page.locator('.rt-star.is-lit')).toHaveCount(0)
  await expect(page.locator('[data-group] line')).toHaveCount(0)
  await expect(page.locator('[data-polaroid]')).toBeHidden()
  await completeAll(page)
  await expect(page.locator('[data-shooting]')).toBeVisible({ timeout: 5000 })
  await page.evaluate(() => window.__rooftop.catch())
  await expect(page.locator('[data-wish]')).toBeVisible()
  await page.waitForTimeout(800)
  await holdWish(page)
  await expect(page.locator('[data-back]')).toBeVisible({ timeout: 5000 })
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.rooftop)
  expect(done).toBe(true)
  expect(errors).toEqual([])
})

test('rotating mid-constellation keeps the stars tappable', async ({ page }) => {
  const errors = collectErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'rooftop')
  await tapStar(page, 4, 0)
  await tapStar(page, 4, 1)
  await page.setViewportSize({ width: 844, height: 390 })
  await page.waitForTimeout(400)
  for (let j = 2; j < count(4); j++) await tapStar(page, 4, j)
  await expect(page.locator('[data-group="4"]')).toHaveClass(/is-done/)
  await expect(page.locator('[data-group="4"] line')).toHaveCount(count(4) - 1)
  await expect(page.locator('[data-polaroid-close]')).toBeVisible()
  expect(errors).toEqual([])
})

test('idle for a few seconds nudges the next stars; touching stops it', async ({ page }) => {
  await open(page, 'rooftop')
  await expect(page.locator('[data-group="0"] .rt-star.nudge').first()).toBeVisible({ timeout: 7000 })
  await tapStar(page, 0, 0)
  await expect(page.locator('[data-group="0"] [data-star="0"]')).not.toHaveClass(/nudge/)
})

test('reduced motion renders and completes', async ({ browser }) => {
  test.setTimeout(45_000)
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const errors = collectErrors(page)
  await open(page, 'rooftop')
  await joinGroup(page, 0)
  await expect(page.locator('[data-polaroid]')).toBeVisible()
  await page.locator('[data-polaroid-close]').click()
  await expect(page.locator('[data-polaroid]')).toBeHidden()
  await completeAll(page)
  await expect(page.locator('[data-shooting]')).toBeVisible({ timeout: 5000 })
  await catchShootingStar(page)
  await expect(page.locator('[data-wish]')).toBeVisible()
  await holdWish(page)
  await expect(scene(page)).toHaveAttribute('data-done', 'true')
  expect(errors).toEqual([])
  await context.close()
})

test('fits and stays tappable at every screen size', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the viewport sweep runs once')
  test.setTimeout(240_000)
  const errors = collectErrors(page)
  await open(page, 'rooftop')
  const firstStars = MEMORIES.map((_, i) => `[data-group="${i}"] [data-star="0"]`)
  const lastStars = MEMORIES.map((_, i) => `[data-group="${i}"] [data-star="${count(i) - 1}"]`)
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp)
    await page.reload()
    await expect(scene(page)).toBeVisible()
    await page.waitForTimeout(350)
    await shot(page, `rooftop-${vp.name}`)
    // no two groups overlap on screen
    const boxes = await page.locator('[data-group]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        const A = boxes[a], B = boxes[b]
        const apart = A.right <= B.left + 0.5 || B.right <= A.left + 0.5 || A.bottom <= B.top + 0.5 || B.bottom <= A.top + 0.5
        expect(apart, `groups ${a} and ${b} overlap at ${vp.width}×${vp.height}`).toBe(true)
      }
    }
    // the stars stay above the railing
    const rail = await page.locator('.rt-terrace-wrap').boundingBox()
    for (const b of boxes) expect(b.bottom, `group above the terrace at ${vp.width}×${vp.height}`).toBeLessThanOrEqual(rail.y + rail.height * 0.4)

    await joinGroup(page, PAPER)
    await expect(page.locator('[data-polaroid]')).toBeVisible()
    await page.waitForTimeout(900)
    await page.waitForTimeout(350)
    await shot(page, `rooftop-${vp.name}-polaroid`)
    const pol = await page.locator('[data-polaroid]').boundingBox()
    expect(pol.y, `polaroid top at ${vp.width}×${vp.height}`).toBeGreaterThanOrEqual(0)
    expect(pol.y + pol.height, `polaroid bottom at ${vp.width}×${vp.height}`).toBeLessThanOrEqual(vp.height)
    await page.locator('[data-polaroid-close]').click()
    await expect(page.locator('[data-polaroid]')).toBeHidden()

    await completeAll(page)
    await expect(page.locator('[data-shooting]')).toBeVisible({ timeout: 6000 })
    await page.evaluate(() => window.__rooftop.catch())
    await page.waitForTimeout(900)
    await page.waitForTimeout(350)
    await shot(page, `rooftop-${vp.name}-wish`)
    await holdWish(page)
    await expect(page.locator('[data-back]')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(600)
    await page.waitForTimeout(350)
    await shot(page, `rooftop-${vp.name}-done`)
  }
  expect(errors).toEqual([])
})

// ── Task 17: the terrace answers like what it is; the cat is a character ──
test('every piece of rooftop scenery declares its reaction, and answers without errors', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'rooftop')
  const missing = await page.evaluate(() => [...document.querySelectorAll('[data-poke]')].filter((el) => !el.dataset.react).map((el) => el.dataset.poke))
  expect(missing).toEqual([])
  expect(await page.locator('[data-poke]').count()).toBeGreaterThanOrEqual(8)
  for (const sel of ['[data-poke="pot"] .rt-hit', '[data-poke="tank"] .rt-tankbody', '[data-poke="door"] .rt-hit', '[data-poke="city"] .rt-city rect', '[data-poke="rail"] .rt-wall', '.rt-moon .rt-moon__disc']) {
    const b = await page.locator(sel).first().boundingBox()
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    await page.waitForTimeout(80)
  }
  await page.waitForTimeout(300)
  expect(errors).toEqual([])
})
