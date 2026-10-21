import { expect, test } from '@playwright/test'
import { collectErrors, open, ROOMS } from './helpers.js'

test('first visit lands on the door', async ({ page }) => {
  await open(page, 'house', { doorSeen: false, expect: 'door' })
  await expect(page.locator('.scene[data-scene="door"]')).toBeVisible()
})

test('every scene mounts without errors', async ({ page }) => {
  test.setTimeout(120_000) // visits every scene; slow under parallel load
  const errors = collectErrors(page)
  await open(page, 'house', { done: [...ROOMS, 'finale'] })
  for (const id of ['house', ...ROOMS, 'finale', 'card', 'door']) {
    await page.evaluate((r) => window.__home.go(r), id)
    await expect(page.locator(`.scene[data-scene="${id}"]`)).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('empty room and finale are guarded', async ({ page }) => {
  await open(page, 'house')
  await page.evaluate(() => window.__home.go('empty'))
  await expect(page).toHaveURL(/#\/house$/)
  await page.evaluate(() => window.__home.go('finale'))
  await expect(page).toHaveURL(/#\/house$/)
  await page.evaluate(() => window.__home.go('card'))
  await expect(page).toHaveURL(/#\/house$/)
})

test('unknown route falls back to the house', async ({ page }) => {
  await open(page, 'house')
  await page.evaluate(() => (location.hash = '#/attic'))
  await expect(page).toHaveURL(/#\/house$/)
})

test('home chip returns to the house; language switch keeps the route', async ({ page }) => {
  await open(page, 'kitchen')
  await page.locator('.chip--home').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await page.evaluate(() => window.__home.go('kitchen'))
  await expect(page.locator('.scene[data-scene="kitchen"]')).toBeVisible()
  await page.locator('.chip--lang').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
  await expect(page).toHaveURL(/#\/kitchen$/)
})

test('language switch works from a plain address, and one-shot switches are not re-applied', async ({ page }) => {
  // regression: replace() to an identical URL with only a #hash never reloaded, so the pill did nothing
  await page.goto('/?skip#/house')
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await expect(page).toHaveURL(/\/#\/house$/) // ?skip applied once, then dropped
  await page.locator('.chip--lang').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await page.locator('.chip--lang').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  // ?reset wipes once; switching language afterwards must not wipe again
  await page.goto('/?reset#/door')
  await expect(page.locator('.scene[data-scene="door"]')).toBeVisible()
  await page.evaluate(() => {
    window.__home.state.update({ doorSeen: true })
    window.__home.complete('kitchen')
  })
  await page.goto('/#/house')
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await page.locator('.chip--lang').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.kitchen)).toBe(true)
})

test('every new visit opens at the door; reloads inside a visit stay put', async ({ browser, page }) => {
  await page.goto('/?skip#/house')
  await page.evaluate(() => window.__home.complete('living'))
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await page.reload()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible() // same visit
  // a new visit: same saved progress, fresh session
  const progress = await page.evaluate(() => localStorage.getItem('our-home'))
  const ctx = await browser.newContext()
  const fresh = await ctx.newPage()
  await fresh.addInitScript((p) => localStorage.setItem('our-home', p), progress)
  await fresh.goto(page.url().replace(/#.*/, '#/kitchen'))
  await expect(fresh.locator('.scene[data-scene="door"]')).toBeVisible()
  expect(await fresh.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.living)).toBe(true)
  await ctx.close()
})
