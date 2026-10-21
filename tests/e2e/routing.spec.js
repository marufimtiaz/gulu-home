import { expect, test } from '@playwright/test'
import { collectErrors, open, ROOMS } from './helpers.js'

test('first visit lands on the door', async ({ page }) => {
  await open(page, 'house', { doorSeen: false, expect: 'door' })
  await expect(page.locator('.scene[data-scene="door"]')).toBeVisible()
})

test('every scene mounts without errors', async ({ page }) => {
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
