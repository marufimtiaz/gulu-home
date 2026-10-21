import { expect, test } from '@playwright/test'
import { collectErrors, open, ROOMS, shot } from './helpers.js'

const FIVE = ['living', 'kitchen', 'garden', 'rooftop', 'desk']
const win = (page, id) => page.locator(`[data-window="${id}"]`)

test('fresh house: living suggested, others dark, empty locked', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'house')
  await expect(page.locator('[data-window]')).toHaveCount(6)
  await expect(win(page, 'living')).toHaveAttribute('data-state', 'suggested')
  for (const id of ['kitchen', 'garden', 'rooftop', 'desk']) await expect(win(page, id)).toHaveAttribute('data-state', 'dark')
  await expect(win(page, 'empty')).toHaveAttribute('data-state', 'locked')
  await expect(page.locator('[data-caption]')).toHaveText('0 of 6 lights on')
  await expect(page.locator('[data-nameplate]')).toBeHidden()
  await expect(page.locator('[data-smoke]')).toBeHidden()
  await expect(page.locator('[data-tree]')).toBeHidden()
  await page.waitForTimeout(400)
  await shot(page, 'house-fresh')
  expect(errors).toEqual([])
})

test('five lit: empty suggested, smoke and tree visible', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'house', { done: FIVE })
  for (const id of FIVE) await expect(win(page, id)).toHaveAttribute('data-state', 'lit')
  await expect(win(page, 'empty')).toHaveAttribute('data-state', 'suggested')
  await expect(page.locator('[data-smoke]')).toBeVisible()
  await expect(page.locator('[data-tree]')).toBeVisible()
  await expect(page.locator('[data-caption]')).toHaveText('5 of 6 lights on')
  await page.waitForTimeout(400)
  await shot(page, 'house-five')
  expect(errors).toEqual([])
})

test('locked empty window does not navigate', async ({ page }) => {
  await open(page, 'house')
  await win(page, 'empty').click()
  await page.waitForTimeout(900)
  await expect(page).toHaveURL(/#\/house$/)
})

test('tapping the kitchen window zooms into the kitchen', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'house')
  await win(page, 'kitchen').click()
  await expect(page).toHaveURL(/#\/kitchen$/)
  await expect(page.locator('.scene[data-scene="kitchen"]')).toBeVisible()
  expect(errors).toEqual([])
})

test('double-tapping a window mounts the room once', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'house')
  const box = await win(page, 'kitchen').boundingBox()
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  await page.mouse.click(x, y)
  await page.mouse.click(x, y)
  await page.waitForTimeout(80)
  await page.mouse.click(x, y)
  await expect(page.locator('.scene[data-scene="kitchen"]')).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(page.locator('.scene[data-scene="kitchen"]')).toHaveCount(1)
  await expect(page.locator('.scene')).toHaveCount(1)
  await expect(page).toHaveURL(/#\/kitchen$/)
  expect(errors).toEqual([])
})

test('coming back from a room zooms out of its window', async ({ page }) => {
  await open(page, 'kitchen', { done: ['kitchen'] })
  await page.locator('.chip--home').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await expect(page.locator('.house-art')).toHaveAttribute('data-zoomed', 'false', { timeout: 3000 })
  await expect(win(page, 'kitchen')).toHaveAttribute('data-state', 'lit')
})

test('state changes repaint the house live', async ({ page }) => {
  await open(page, 'house')
  await page.evaluate(() => window.__home.complete('living'))
  await expect(win(page, 'living')).toHaveAttribute('data-state', 'lit')
  await expect(win(page, 'kitchen')).toHaveAttribute('data-state', 'suggested')
  await expect(page.locator('[data-caption]')).toHaveText('1 of 6 lights on')
})

test('all six lit: nameplate leads to the finale', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'house', { done: ROOMS })
  for (const id of ROOMS) await expect(win(page, id)).toHaveAttribute('data-state', 'lit')
  await expect(page.locator('[data-nameplate]')).toBeVisible()
  await expect(page.locator('[data-letterbox]')).toBeHidden()
  await page.waitForTimeout(400)
  await shot(page, 'house-all')
  await page.locator('[data-nameplate]').click()
  await expect(page).toHaveURL(/#\/finale$/)
  await expect(page.locator('.scene[data-scene="finale"]')).toBeVisible()
  expect(errors).toEqual([])
})

test('after the finale: letterbox envelope shows, names on the plate', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'house', { done: [...ROOMS, 'finale'] })
  await expect(page.locator('[data-letterbox]')).toBeVisible()
  await expect(page.locator('[data-nameplate]')).toHaveAttribute('data-hung', 'true')
  const box = await page.locator('[data-letterbox] .w-hit').boundingBox()
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44)
  await page.waitForTimeout(400)
  await shot(page, 'house-finale')
  expect(errors).toEqual([])
})

test('windows are comfortable tap targets', async ({ page }) => {
  await open(page, 'house')
  for (const id of ROOMS) {
    const box = await page.locator(`[data-window="${id}"] .w-hit`).boundingBox()
    expect(Math.min(box.width, box.height), id).toBeGreaterThanOrEqual(44)
  }
})

test('reduced motion renders the house still', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = collectErrors(page)
  await open(page, 'house', { done: ['living', 'kitchen'] })
  await expect(win(page, 'garden')).toHaveAttribute('data-state', 'suggested')
  await win(page, 'garden').click()
  await expect(page).toHaveURL(/#\/garden$/)
  expect(errors).toEqual([])
  await context.close()
})

test('bengali caption', async ({ page }) => {
  await open(page, 'house', { lang: 'bn', done: ['living'] })
  await expect(page.locator('[data-caption]')).toHaveText('৬টার মধ্যে ১টা আলো জ্বলছে')
})

test('idle on the hub nudges the suggested window', async ({ page }) => {
  await open(page, 'house', { done: ['living'] })
  await expect(win(page, 'kitchen')).toHaveClass(/nudge/, { timeout: 7000 })
})

test('scenery answers a tap without navigating', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'house')
  for (const sel of ['[data-cat]', '.h-chimney', '.h-tank', '.sky-moon', '[data-door-knock]', '[data-sconce]', '.g-shroom', '.g-bush--l', '[data-tree]']) {
    const el = page.locator(sel).first()
    if (await el.isVisible()) await el.click({ force: true })
  }
  await page.waitForTimeout(400)
  await expect(page).toHaveURL(/#\/house$/)
  expect(errors).toEqual([])
})
