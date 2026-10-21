import { expect, test } from '@playwright/test'
import { checkLayout, collectErrors, open, pressLatency, ROOMS, shot, VIEWPORTS } from './helpers.js'

const FIVE = ROOMS.filter((r) => r !== 'empty')

async function center(locator) {
  const b = await locator.boundingBox()
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

/** Real mouse drag from the centre of `from` to the centre of `to` (a locator or a point). */
async function drag(page, from, to, steps = 14) {
  const a = await center(from)
  const b = to.x !== undefined ? to : await center(to)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps })
  await page.mouse.up()
}

const stage = (page) => page.evaluate(() => window.__finale.stage())

/**
 * helpers.pressLatency() arms its listener and starts its clock but never presses, so press for
 * it the moment the listener is in: a real PointerEvent on the element (no test-runner round trip).
 */
async function latency(page, sel) {
  await page.evaluate((s) => {
    const el = document.querySelector(s)
    const add = el.addEventListener
    el.addEventListener = function (type, fn, opts) {
      add.call(this, type, fn, opts)
      if (type === 'pointerdown' && opts?.once) {
        el.addEventListener = add
        const r = el.getBoundingClientRect()
        const at = { bubbles: true, cancelable: true, pointerId: 7, isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }
        queueMicrotask(() => {
          el.dispatchEvent(new PointerEvent('pointerdown', at))
          setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', at)), 200)
        })
      }
    }
  }, sel)
  return pressLatency(page, sel)
}

test('guarded: five rooms is not enough', async ({ page }) => {
  await open(page, 'finale', { done: FIVE, expect: 'house' })
  await expect(page).toHaveURL(/#\/house$/)
})

test('hang the plate, stick the slip, the house celebrates, the card lands', async ({ page }) => {
  test.setTimeout(60_000)
  const errors = collectErrors(page)
  await open(page, 'finale', { done: ROOMS })
  await expect(page.locator('[data-plate]')).toBeVisible()
  await expect(page.locator('[data-card]')).toBeHidden()
  await page.waitForTimeout(700)
  await shot(page, 'finale-door')

  // drag the plate up off the mat onto the hook
  await drag(page, page.locator('[data-plate]'), page.locator('[data-hook]'))
  await expect(page.locator('[data-plate]')).toHaveClass(/plate--hung/)
  await expect(page.locator('[data-names]')).toContainText('Maruf & Sneha')
  await expect(page.locator('[data-names]')).toContainText('est. 22 October 2026')

  // the slip pops out of the letterbox; once it's on the mat it can be dragged onto the plate
  await expect.poll(() => stage(page), { timeout: 8000 }).toBe('sticker')
  await expect(page.locator('[data-slip]')).toBeVisible()
  await expect(page.locator('[data-sticker]')).toContainText('Bou')
  await shot(page, 'finale-hung')
  await drag(page, page.locator('[data-sticker]'), page.locator('[data-plate]'))
  await expect(page.locator('[data-sticker]')).toHaveClass(/sticker--stuck/)

  const card = page.locator('[data-card]')
  await expect(card).toBeVisible({ timeout: 8000 })
  await expect(card).toContainText('welcome home.')
  await expect(page.locator('.scene[data-scene="finale"]')).toHaveAttribute('data-done', 'true', { timeout: 4000 })
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.finale)
  expect(done).toBe(true)
  await page.waitForTimeout(1200)
  await shot(page, 'finale-card')

  // two beats later the envelope peeks out of the letterbox
  await expect(page.locator('[data-letterbox]')).toBeVisible({ timeout: 6000 })
  await page.waitForTimeout(500)
  await shot(page, 'finale-mail')
  expect(errors).toEqual([])
})

test('the envelope in the letterbox opens the reception card', async ({ page }) => {
  await open(page, 'finale', { done: ROOMS })
  await page.evaluate(() => window.__finale.stick())
  await expect(page.locator('[data-letterbox]')).toBeVisible({ timeout: 15000 })
  await page.locator('[data-letterbox]').click()
  await expect(page).toHaveURL(/#\/card$/)
  await expect(page.locator('.scene[data-scene="card"]')).toBeVisible()
})

test('back to our house: the hub shows the hung nameplate', async ({ page }) => {
  await open(page, 'finale', { done: ROOMS })
  await page.evaluate(() => window.__finale.stick())
  await expect(page.locator('[data-home]')).toBeVisible({ timeout: 15000 })
  await page.locator('[data-home]').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  const plate = page.locator('[data-nameplate]')
  await expect(plate).toHaveAttribute('data-hung', 'true')
  await expect(plate).toContainText('Maruf & Sneha')
  await expect.poll(() => page.evaluate(() => typeof window.__finale)).toBe('undefined')
})

test('dropping the plate anywhere else springs it back to the mat', async ({ page }) => {
  await open(page, 'finale', { done: ROOMS })
  const plate = page.locator('[data-plate]')
  const before = await center(plate)
  await drag(page, plate, { x: before.x + 70, y: before.y - 120 })
  await page.waitForTimeout(1400)
  const after = await center(plate)
  expect(Math.abs(after.x - before.x)).toBeLessThan(8)
  expect(Math.abs(after.y - before.y)).toBeLessThan(8)
  await expect(plate).not.toHaveClass(/plate--hung/)
  // the sticker can't be dragged before it has arrived
  expect(await stage(page)).toBe('plate')
})

test('dropping the sticker off the plate springs it back', async ({ page }) => {
  await open(page, 'finale', { done: ROOMS })
  await page.evaluate(() => window.__finale.hang())
  await expect.poll(() => stage(page), { timeout: 8000 }).toBe('sticker')
  const sticker = page.locator('[data-sticker]')
  await page.waitForTimeout(300)
  const before = await center(sticker)
  await drag(page, sticker, { x: before.x - 120, y: before.y - 30 })
  await page.waitForTimeout(1400)
  const after = await center(sticker)
  expect(Math.abs(after.x - before.x)).toBeLessThan(10)
  await expect(sticker).not.toHaveClass(/sticker--stuck/)
})

test('rotating mid-drag springs the plate back and it still hangs', async ({ page }) => {
  const errors = collectErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'finale', { done: ROOMS })
  const plate = page.locator('[data-plate]')
  const a = await center(plate)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(a.x + 10, a.y - 90, { steps: 5 })
  await page.setViewportSize({ width: 844, height: 390 })
  await page.mouse.move(30, 30, { steps: 3 })
  await page.mouse.up()
  await page.waitForTimeout(1200)
  await expect(plate).not.toHaveClass(/plate--hung/)
  await drag(page, plate, page.locator('[data-hook]'))
  await expect(plate).toHaveClass(/plate--hung/)
  expect(errors).toEqual([])
})

test('re-entering after the finale replays it from the doormat', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'finale', { done: [...ROOMS, 'finale'] })
  await expect(page.locator('[data-plate]')).not.toHaveClass(/plate--hung/)
  await expect(page.locator('[data-card]')).toBeHidden()
  await expect(page.locator('[data-letterbox]')).toBeHidden()
  await page.evaluate(() => window.__finale.stick())
  await expect(page.locator('[data-card]')).toBeVisible({ timeout: 10000 })
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.finale)
  expect(done).toBe(true)
  expect(errors).toEqual([])
})

test('reduced motion: the whole flow completes in under 4 s', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const errors = collectErrors(page)
  await open(page, 'finale', { done: ROOMS })
  const t0 = Date.now()
  await page.evaluate(() => window.__finale.hang())
  await expect.poll(() => stage(page), { timeout: 4000, intervals: [50] }).toBe('sticker')
  await page.evaluate(() => window.__finale.stick())
  await expect(page.locator('[data-card]')).toBeVisible({ timeout: 4000 })
  await expect(page.locator('[data-letterbox]')).toBeVisible({ timeout: 4000 })
  expect(Date.now() - t0).toBeLessThan(4000)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.finale)).toBe(true)
  await shot(page, 'finale-reduced')
  expect(errors).toEqual([])
  await context.close()
})

test('Bengali renders the finale', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'finale', { done: ROOMS, lang: 'bn' })
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
  await expect(page.locator('[data-prompt]')).toContainText('দরজায়', { timeout: 3000 })
  expect(errors).toEqual([])
})

test('every viewport: plate, sticker, home and letterbox fit and are tappable', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the viewport sweep runs once')
  test.setTimeout(240_000)
  const errors = collectErrors(page)
  await open(page, 'finale', { done: ROOMS })
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp)
    await page.reload()
    await expect(page.locator('.scene[data-scene="finale"]')).toBeVisible()
    await page.waitForTimeout(900)
    await checkLayout(page, ['[data-plate]'], `finale-${vp.name}-door`)
    await page.evaluate(() => window.__finale.hang())
    await expect.poll(() => stage(page), { timeout: 8000 }).toBe('sticker')
    await checkLayout(page, ['[data-sticker]'], `finale-${vp.name}-sticker`)
    await page.evaluate(() => window.__finale.stick())
    await page.waitForTimeout(4200)
    await shot(page, `finale-${vp.name}-celebrate`)
    await expect(page.locator('[data-letterbox]')).toBeVisible({ timeout: 10000 })
    await checkLayout(page, ['[data-home]', '[data-letterbox]'], `finale-${vp.name}-card`)
    // the card never covers the letterbox or runs off screen
    const card = await page.locator('[data-card]').boundingBox()
    const mail = await page.locator('[data-letterbox] .fin-mail__hit').boundingBox()
    expect(card.y, `card top at ${vp.width}×${vp.height}`).toBeGreaterThanOrEqual(0)
    expect(card.y + card.height, `card bottom at ${vp.width}×${vp.height}`).toBeLessThanOrEqual(vp.height + 1)
    const overlap = mail.x < card.x + card.width && mail.x + mail.width > card.x && mail.y < card.y + card.height && mail.y + mail.height > card.y
    expect(overlap, `letterbox under the card at ${vp.width}×${vp.height}`).toBe(false)
  }
  expect(errors).toEqual([])
})

test('the home button answers a press within 100 ms', async ({ page }) => {
  await open(page, 'finale', { done: ROOMS })
  await page.evaluate(() => window.__finale.stick())
  await expect(page.locator('[data-letterbox]')).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(500)
  const ms = await latency(page, '[data-home]')
  expect(ms).toBeLessThan(100)
})

test('idle on the doormat nudges the plate', async ({ page }) => {
  await open(page, 'finale', { done: ROOMS })
  await expect(page.locator('[data-plate]')).toHaveClass(/nudge/, { timeout: 7000 })
})
