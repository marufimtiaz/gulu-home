import { expect, test } from '@playwright/test'
import { collectErrors, open, shot } from './helpers.js'
import config from '../../src/content/config.js'

const INGREDIENTS = config.kitchen.ingredients

async function center(locator) {
  const b = await locator.boundingBox()
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height }
}

/** Real circular mouse drag around the pot: `turns` full turns, 36 steps per turn. */
async function stirByMouse(page, turns) {
  const pot = await center(page.locator('[data-pot]'))
  const r = Math.min(pot.w, pot.h) * 0.28
  const at = (a) => ({ x: pot.x + r * Math.cos(a), y: pot.y + r * Math.sin(a) })
  const p0 = at(0)
  await page.mouse.move(p0.x, p0.y)
  await page.mouse.down()
  for (let i = 1; i <= turns * 36; i++) {
    const p = at((i / 36) * 2 * Math.PI)
    await page.mouse.move(p.x, p.y)
  }
  await page.mouse.up()
}

test('jars render with labels from config', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'kitchen')
  await expect(page.locator('[data-jar]')).toHaveCount(INGREDIENTS.length)
  for (let i = 0; i < INGREDIENTS.length; i++) {
    await expect(page.locator(`[data-jar="${i}"]`)).toContainText(INGREDIENTS[i].label)
  }
  await expect(page.locator('[data-spoon]')).toBeHidden()
  await shot(page, 'kitchen-start')
  expect(errors).toEqual([])
})

test('tapping a jar adds it and shows its note', async ({ page }) => {
  await open(page, 'kitchen')
  await page.locator('[data-jar="0"]').click()
  await expect(page.locator('[data-jar="0"]')).toBeHidden()
  await expect(page.locator('[data-note]')).toContainText('lacchi')
  await shot(page, 'kitchen-note')
})

test('dragging a jar onto the pot adds it; dropping elsewhere springs back', async ({ page }) => {
  await open(page, 'kitchen')
  const jar = page.locator('[data-jar="1"]')
  const from = await center(jar)

  // miss: drop it off to the side of the shelf → stays on the shelf
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 30, from.y + 40, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(900)
  await expect(jar).toBeVisible()

  // hit: drag it onto the pot
  const back = await center(jar)
  const pot = await center(page.locator('[data-pot]'))
  await page.mouse.move(back.x, back.y)
  await page.mouse.down()
  await page.mouse.move(pot.x, pot.y, { steps: 14 })
  await shot(page, 'kitchen-drag')
  await page.mouse.up()
  await expect(jar).toBeHidden()
  await expect(page.locator('[data-note]')).toContainText(INGREDIENTS[1].note.slice(0, 12))
})

test('all in → spoon; three real turns → plate, done', async ({ page }) => {
  test.setTimeout(90_000) // ~115 real mouse moves; slow when the machine is busy
  const errors = collectErrors(page)
  await open(page, 'kitchen')
  await page.evaluate((n) => {
    for (let i = 0; i < n; i++) window.__kitchen.add(i)
  }, INGREDIENTS.length)
  await expect(page.locator('[data-spoon]')).toBeVisible()
  await page.waitForTimeout(400)
  await shot(page, 'kitchen-stir')

  // stirring before the spoon is ready does nothing; now it counts
  await stirByMouse(page, 1)
  const partial = Number(await page.locator('[data-stir]').getAttribute('data-stir'))
  expect(partial).toBeGreaterThan(0.2)
  expect(partial).toBeLessThan(0.5)
  await stirByMouse(page, 2.2)
  await expect(page.locator('[data-stir]')).toHaveAttribute('data-stir', '1')
  await expect(page.locator('[data-plate]')).toBeVisible({ timeout: 6000 })
  await expect(page.locator('[data-plate]')).toContainText(config.kitchen.dish)
  await expect(page.locator('.scene[data-scene="kitchen"]')).toHaveAttribute('data-done', 'true')
  await page.waitForTimeout(800)
  await shot(page, 'kitchen-done')
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.kitchen)
  expect(done).toBe(true)
  expect(errors).toEqual([])
})

test('stirring is ignored until every jar is in', async ({ page }) => {
  test.setTimeout(60_000)
  await open(page, 'kitchen')
  await page.evaluate(() => window.__kitchen.add(0))
  await stirByMouse(page, 1)
  expect(Number(await page.locator('[data-stir]').getAttribute('data-stir'))).toBe(0)
})

test('re-entering a finished kitchen replays from a full shelf', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'kitchen', { done: ['kitchen'] })
  for (let i = 0; i < INGREDIENTS.length; i++) await expect(page.locator(`[data-jar="${i}"]`)).toBeVisible()
  await expect(page.locator('[data-plate]')).toBeHidden()
  await page.evaluate((n) => {
    for (let i = 0; i < n; i++) window.__kitchen.add(i)
  }, INGREDIENTS.length)
  await expect(page.locator('[data-spoon]')).toBeVisible()
  await page.evaluate(() => window.__kitchen.stir(3))
  await expect(page.locator('[data-plate]')).toBeVisible({ timeout: 6000 })
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.kitchen)
  expect(done).toBe(true)
  // leaving cleans up the debug hook
  await page.locator('[data-plate] .btn').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await expect.poll(() => page.evaluate(() => typeof window.__kitchen)).toBe('undefined')
  expect(errors).toEqual([])
})

test('reduced motion renders and completes', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const errors = collectErrors(page)
  await open(page, 'kitchen')
  await page.evaluate((n) => {
    for (let i = 0; i < n; i++) window.__kitchen.add(i)
  }, INGREDIENTS.length)
  await expect(page.locator('[data-spoon]')).toBeVisible()
  await page.evaluate(() => window.__kitchen.stir(3))
  await expect(page.locator('[data-plate]')).toBeVisible()
  expect(errors).toEqual([])
  await context.close()
})

// ── responsive: every interactive thing inside the viewport and ≥ 44×44, at every size ──
const SIZES = [
  [360, 640], [390, 844], [412, 915], [844, 390], [768, 1024], [1280, 800], [1920, 1080],
]

async function expectTappable(page, selector, vw, vh) {
  const boxes = await page.locator(selector).evaluateAll((els) =>
    els.filter((e) => e.checkVisibility()).map((e) => {
      const r = e.getBoundingClientRect()
      return { x: r.left, y: r.top, w: r.width, h: r.height }
    }),
  )
  expect(boxes.length, `${selector} visible at ${vw}×${vh}`).toBeGreaterThan(0)
  for (const b of boxes) {
    const where = `${selector} at ${vw}×${vh}: ${JSON.stringify(b)}`
    expect(b.w, where).toBeGreaterThanOrEqual(44)
    expect(b.h, where).toBeGreaterThanOrEqual(44)
    expect(b.x, where).toBeGreaterThanOrEqual(0)
    expect(b.y, where).toBeGreaterThanOrEqual(0)
    expect(b.x + b.w, where).toBeLessThanOrEqual(vw + 0.5)
    expect(b.y + b.h, where).toBeLessThanOrEqual(vh + 0.5)
  }
}

test('fits and stays tappable at every screen size', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the viewport sweep runs once')
  test.setTimeout(150_000)
  const errors = collectErrors(page)
  await open(page, 'kitchen')
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h })
    await page.reload()
    await expect(page.locator('.scene[data-scene="kitchen"]')).toBeVisible()
    await page.waitForTimeout(300)
    await expectTappable(page, '[data-jar]', w, h)
    await expectTappable(page, '[data-pot]', w, h)
    await expectTappable(page, '[data-knob]', w, h)
    await shot(page, `kitchen-${w}x${h}-start`)
    await page.evaluate((n) => {
      for (let i = 0; i < n; i++) window.__kitchen.add(i)
    }, INGREDIENTS.length)
    await expect(page.locator('[data-spoon]')).toBeVisible()
    await expectTappable(page, '[data-pot]', w, h)
    await page.waitForTimeout(400)
    await shot(page, `kitchen-${w}x${h}-stir`)
    await page.evaluate(() => window.__kitchen.stir(3))
    await expect(page.locator('[data-plate]')).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(900)
    await expectTappable(page, '[data-plate] .btn', w, h)
    const plate = await page.locator('[data-plate]').boundingBox()
    expect(plate.y, `plate top at ${w}×${h}`).toBeGreaterThanOrEqual(0)
    expect(plate.y + plate.height, `plate bottom at ${w}×${h}`).toBeLessThanOrEqual(h)
    await shot(page, `kitchen-${w}x${h}-done`)
  }
  expect(errors).toEqual([])
})

test('rotating mid-drag springs the jar back and keeps working', async ({ page }) => {
  const errors = collectErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'kitchen')
  const jar = page.locator('[data-jar="2"]')
  const from = await center(jar)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 20, from.y + 60, { steps: 5 })
  await page.setViewportSize({ width: 844, height: 390 })
  await page.mouse.move(20, 20, { steps: 3 })
  await page.mouse.up()
  await page.waitForTimeout(1000)
  await expectTappable(page, '[data-jar]', 844, 390)
  await jar.click()
  await expect(jar).toBeHidden()
  expect(errors).toEqual([])
})

test('idle for a few seconds nudges the next jar (its lid rattles); touching stops it', async ({ page }) => {
  await open(page, 'kitchen')
  await expect(page.locator('.jar.nudge')).toHaveCount(0)
  await expect(page.locator('[data-jar="0"]')).toHaveClass(/\bnudge\b/, { timeout: 7000 })
  await page.locator('[data-pot]').click()
  await expect(page.locator('.jar.nudge')).toHaveCount(0)
  // once a jar is in, the nudge moves on to the next one
  await page.locator('[data-jar="0"]').click()
  await expect(page.locator('[data-jar="1"]')).toHaveClass(/\bnudge\b/, { timeout: 7000 })
})
