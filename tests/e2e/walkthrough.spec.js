/*
 * The whole night, start to finish, on a phone: fresh storage → the door → every room through
 * the house → the finale → the reception card → back to a fully lit house.
 *
 * Navigation is always real (tapping windows, the home chip, the letterbox). Long gestures that
 * each scene's own spec already drives with a real pointer use the scene's ?debug hooks here, so
 * this test checks the joins between scenes, not every gesture twice. Recorded as video.
 */
import { expect, test } from '@playwright/test'
import { collectErrors, shot } from './helpers.js'

test.use({ video: 'on', viewport: { width: 390, height: 844 }, hasTouch: false })
test.setTimeout(420_000)

const scene = (page, id) => page.locator(`.scene[data-scene="${id}"]`)

async function enter(page, room) {
  await expect(scene(page, 'house')).toBeVisible()
  await page.waitForTimeout(500)
  await page.locator(`[data-window="${room}"]`).click()
  await expect(scene(page, room)).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(900)
}

async function home(page, room) {
  await expect(scene(page, room)).toHaveAttribute('data-done', 'true', { timeout: 30_000 })
  await page.waitForTimeout(1200) // let her see the reward
  await page.locator('.chip--home').click()
  await expect(scene(page, 'house')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator(`[data-window="${room}"]`)).toHaveAttribute('data-state', 'lit', { timeout: 5000 })
}

test('the whole night, on a phone', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/?debug&reset')
  await expect(scene(page, 'door')).toBeVisible()

  // ── the door ──
  await page.waitForTimeout(1200)
  await shot(page, 'walk-01-door')
  await page.evaluate(() => window.__door.set(4, 15))
  await page.locator('[data-try]').click()
  await expect(page.locator('[data-hint]')).toBeVisible()
  await page.waitForTimeout(800)
  await page.evaluate(() => window.__door.set(4, 30))
  await page.locator('[data-try]').click()
  await expect(scene(page, 'house')).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1500)
  await shot(page, 'walk-02-house')
  await expect(page.locator('[data-window="living"]')).toHaveAttribute('data-state', 'suggested')
  await expect(page.locator('[data-window="empty"]')).toHaveAttribute('data-state', 'locked')

  // ── living room ──
  await enter(page, 'living')
  await page.evaluate(() => window.__living.seek(0.5))
  await page.waitForTimeout(800)
  await page.evaluate(() => window.__living.seek(0))
  await expect(page.locator('[data-phone]')).toBeVisible({ timeout: 10_000 })
  await page.locator('[data-phone]').click()
  await page.waitForTimeout(2500)
  await shot(page, 'walk-03-living-text')
  await page.mouse.click(195, 700)
  await home(page, 'living')

  // ── kitchen ──
  await enter(page, 'kitchen')
  const jars = await page.locator('[data-jar]').count()
  for (let i = 0; i < jars; i++) {
    await page.evaluate((n) => window.__kitchen.add(n), i)
    await page.waitForTimeout(250)
  }
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.__kitchen.stir(3))
  await expect(page.locator('[data-plate]')).toBeVisible({ timeout: 20_000 })
  await shot(page, 'walk-04-kitchen')
  await home(page, 'kitchen')

  // ── garden ──
  await enter(page, 'garden')
  await page.evaluate(() => window.__garden.hold(3000))
  await expect(page.locator('[data-future]')).toBeVisible({ timeout: 12_000 })
  await page.locator('[data-future]').click()
  await page.waitForTimeout(9000) // watch the time-lapse
  await shot(page, 'walk-05-garden')
  await home(page, 'garden')

  // ── rooftop ──
  await enter(page, 'rooftop')
  const groups = await page.locator('[data-group]').count()
  for (let i = 0; i < groups; i++) {
    await page.evaluate((n) => window.__rooftop.complete(n), i)
    await page.waitForTimeout(300)
    if (await page.locator('[data-polaroid-close]').isVisible()) await page.locator('[data-polaroid-close]').click()
  }
  // catch the shooting star with a real tap, as she would
  const at = await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-shooting]')
      if (!el || el.hidden || Number(getComputedStyle(el).opacity) < 0.6) return null
      const r = el.getBoundingClientRect()
      const x = r.left + r.width / 2
      const y = r.top + r.height / 2
      return x > 40 && x < innerWidth - 40 && y > 40 ? { x, y } : null
    },
    null,
    { timeout: 15_000, polling: 'raf' },
  )
  const { x, y } = await at.jsonValue()
  await page.mouse.click(x, y)
  const wish = page.locator('[data-wish]')
  await expect(wish).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(1300) // the wish panel settles before it listens
  // hold to wish — holds add up, so keep holding until it's granted
  for (let i = 0; i < 4 && (await scene(page, 'rooftop').getAttribute('data-done')) !== 'true'; i++) {
    const b = await wish.boundingBox()
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(2400)
    await page.mouse.up()
    await page.waitForTimeout(600)
  }
  await shot(page, 'walk-06-rooftop')
  await home(page, 'rooftop')

  // ── desk ──
  await enter(page, 'desk')
  const chain = await page.locator('[data-chain]').boundingBox()
  await page.mouse.move(chain.x + chain.width / 2, chain.y + chain.height / 2)
  await page.mouse.down()
  await page.mouse.move(chain.x + chain.width / 2, chain.y + chain.height / 2 + 70, { steps: 8 })
  await page.mouse.up()
  await expect(page.locator('[data-envelope]')).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(600)
  await page.locator('[data-envelope]').click()
  await page.waitForTimeout(4000)
  await shot(page, 'walk-07-desk-writing')
  await page.evaluate(() => window.__desk.skip())
  await home(page, 'desk')

  // ── empty room (unlocked now) ──
  await expect(page.locator('[data-window="empty"]')).toHaveAttribute('data-state', 'suggested')
  await enter(page, 'empty')
  await page.evaluate(() => window.__empty.paint(2))
  await page.waitForTimeout(2500)
  await page.locator('[data-input]').fill('a balcony full of chillies and one stubborn rose')
  await page.locator('[data-add]').click()
  await page.waitForTimeout(1500)
  await shot(page, 'walk-08-empty')
  await home(page, 'empty')

  // ── finale ──
  await expect(page.locator('[data-nameplate]')).toBeVisible({ timeout: 10_000 })
  await shot(page, 'walk-09-house-lit')
  await page.locator('[data-nameplate]').click()
  await expect(scene(page, 'finale')).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(1200)
  await page.evaluate(() => window.__finale.hang())
  await page.waitForTimeout(3000)
  await page.evaluate(() => window.__finale.stick())
  await expect(page.locator('[data-card]')).toBeVisible({ timeout: 30_000 })
  await shot(page, 'walk-10-finale')
  await expect(page.locator('[data-letterbox]')).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(800)
  await page.locator('[data-letterbox]').click()

  // ── the reception card ──
  await expect(scene(page, 'card')).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(1200)
  await page.locator('[data-seal]').click()
  await expect(page.locator('[data-gate="right"]')).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.__card.open())
  await expect(page.locator('[data-card-face]')).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(3000)
  await shot(page, 'walk-11-card')

  // ── back home: everything lit, names on the door, the envelope stays in the letterbox ──
  await page.locator('.chip--home').click()
  await expect(scene(page, 'house')).toBeVisible({ timeout: 10_000 })
  for (const r of ['living', 'kitchen', 'garden', 'rooftop', 'desk', 'empty']) {
    await expect(page.locator(`[data-window="${r}"]`)).toHaveAttribute('data-state', 'lit')
  }
  await expect(page.locator('[data-letterbox]')).toBeVisible()
  await page.waitForTimeout(1500)
  await shot(page, 'walk-12-home')
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')))
  expect(saved.done.finale).toBe(true)
  expect(saved.order).toEqual(['living', 'kitchen', 'garden', 'rooftop', 'desk', 'empty'])
  expect(errors).toEqual([])
})
