import { expect, test } from '@playwright/test'
import { checkLayout, collectErrors, open, pressLatency, shot, VIEWPORTS } from './helpers.js'

async function setClock(page, hour, minute) {
  await page.evaluate(([h, m]) => window.__door.set(h, m), [hour, minute])
}

test('wrong time shows a hint, right time opens the door', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'door', { doorSeen: false })
  await page.waitForTimeout(900) // let the bubble settle for the screenshot
  await shot(page, 'door-start')
  await setClock(page, 4, 15)
  await page.locator('[data-try]').click()
  await expect(page.locator('[data-hint]')).toContainText('the minute')
  await shot(page, 'door-hint')
  await setClock(page, 4, 30)
  await page.locator('[data-try]').click()
  await expect(page.locator('.door')).toHaveClass(/door--open/)
  await shot(page, 'door-open')
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible({ timeout: 5000 })
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).doorSeen)
  expect(saved).toBe(true)
  expect(errors).toEqual([])
})

test('dragging the minute hand snaps to 5 minutes', async ({ page }) => {
  await open(page, 'door', { doorSeen: false })
  expect(await page.evaluate(() => window.__door.get())).toEqual({ hour: 10, minute: 0 })
  const box = await page.locator('.lock').boundingBox()
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2
  await page.mouse.move(cx, cy - 40)
  await page.mouse.down()
  await page.mouse.move(cx + 40, cy, { steps: 8 }) // 12 → 3 o'clock = 15 min
  await page.mouse.up()
  const m = await page.evaluate(() => window.__door.get().minute)
  expect(m).toBe(15)
})

test('dragging the hour hand sets the hour and keeps the minutes', async ({ page }) => {
  await open(page, 'door', { doorSeen: false })
  await setClock(page, 12, 30) // minute hand points at 6, hour hand near 12
  const box = await page.locator('.lock').boundingBox()
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2
  await page.mouse.move(cx, cy - 30)
  await page.mouse.down()
  await page.mouse.move(cx + 30, cy, { steps: 8 }) // a quarter turn of the hour hand = 3 hours
  await page.mouse.up()
  const t = await page.evaluate(() => window.__door.get())
  expect(t).toEqual({ hour: 3, minute: 30 })
})

test('hints escalate and never lock out', async ({ page }) => {
  await open(page, 'door', { doorSeen: false })
  for (let i = 0; i < 5; i++) {
    await setClock(page, 1, 0)
    await page.locator('[data-try]').click()
  }
  await expect(page.locator('[data-hint]')).toContainText('half past four')
  await expect(page.locator('[data-try]')).toBeEnabled()
})

test('the lock works from the keyboard', async ({ page }) => {
  await open(page, 'door', { doorSeen: false })
  await page.locator('.lock').focus()
  // starts at 10:00 → six hours back, six five-minute steps forward
  for (let i = 0; i < 6; i++) await page.keyboard.press('PageDown')
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight')
  expect(await page.evaluate(() => window.__door.get())).toEqual({ hour: 4, minute: 30 })
  await expect(page.locator('.lock')).toHaveAttribute('aria-valuetext', '4:30')
  await page.keyboard.press('Enter')
  await expect(page.locator('.door')).toHaveClass(/door--open/)
})

test('reduced motion still opens the door and reaches the house', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors = collectErrors(page)
  await open(page, 'door', { doorSeen: false })
  await setClock(page, 4, 30)
  await page.locator('[data-try]').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible({ timeout: 3000 })
  expect(errors).toEqual([])
})

test('?door replays the door even after it was seen', async ({ page }) => {
  await open(page, 'door', { doorSeen: true, query: 'door' })
  await expect(page.locator('.scene[data-scene="door"]')).toBeVisible()
  await expect(page.locator('[data-hand="minute"]')).toBeVisible()
})

test('leaving the door removes its debug hook', async ({ page }) => {
  await open(page, 'door', { doorSeen: false })
  expect(await page.evaluate(() => typeof window.__door)).toBe('object')
  await setClock(page, 4, 30)
  await page.locator('[data-try]').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible({ timeout: 5000 })
  await expect.poll(() => page.evaluate(() => typeof window.__door)).toBe('undefined')
})

test('every control is on screen and finger-sized at every size; the chips have clear sky', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'viewport sweep runs once')
  test.setTimeout(120_000)
  const errors = collectErrors(page)
  await open(page, 'door', { doorSeen: false })
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp)
    await checkLayout(page, ['.lock', '[data-try]', '.chip--lang'], `door-${vp.name}`)
    for (const sel of ['.door', '[data-hint]']) {
      const b = await page.locator(sel).boundingBox()
      expect(b.y, `${sel} top @${vp.name}`).toBeGreaterThanOrEqual(0)
      expect(b.y + b.height, `${sel} bottom @${vp.name}`).toBeLessThanOrEqual(vp.height)
    }
    const lock = await page.locator('.lock').boundingBox()
    const btn = await page.locator('[data-try]').boundingBox()
    const apart = btn.y >= lock.y + lock.height || btn.x >= lock.x + lock.width
    expect(apart, `try button clear of the lock @${vp.name}`).toBe(true)
    // the language chip sits in open sky, above the roof edge (eave + its scallops)
    const chip = await page.locator('.chip--lang').boundingBox()
    const eave = await page.locator('.dw__eave').boundingBox()
    expect(chip.y + chip.height, `chip clear of the roof edge @${vp.name}`).toBeLessThanOrEqual(eave.y)
  }
  // still works after all that resizing (live layout, no stale geometry)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(200)
  await page.evaluate(() => window.__door.set(12, 0))
  const box = await page.locator('.lock').boundingBox()
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2
  await page.mouse.move(cx, cy - box.height * 0.35)
  await page.mouse.down()
  await page.mouse.move(cx + box.width * 0.35, cy, { steps: 8 })
  await page.mouse.up()
  expect(await page.evaluate(() => window.__door.get().minute)).toBe(15)
  expect(errors).toEqual([])
})

test('the try button and the lock squash under a press within 100 ms', async ({ page }) => {
  await open(page, 'door', { doorSeen: false })
  expect(await pressLatency(page, '[data-try]')).toBeLessThan(100)
  expect(await pressLatency(page, '.lock svg')).toBeLessThan(100)
})

test('touching the lock answers at once; idle nudges point at the next thing', async ({ page }) => {
  await open(page, 'door', { doorSeen: false })
  const box = await page.locator('.lock').boundingBox()
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2
  await page.mouse.move(cx, cy - box.height * 0.35)
  await page.mouse.down()
  await page.waitForTimeout(100)
  await expect(page.locator('.lock')).toHaveClass(/is-turning/)
  const pressed = await page.evaluate(() => getComputedStyle(document.querySelector('.lock svg')).transform)
  expect(pressed).not.toBe('none')
  await page.mouse.up()
  // she grabbed but turned nothing → after ~4 s the lock is nudged
  await expect(page.locator('.scene--door')).toHaveClass(/nudge-lock/, { timeout: 6000 })
  // once she has turned the hands, the nudge moves on to the button
  await page.locator('.lock').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.scene--door')).toHaveClass(/nudge-try/, { timeout: 6000 })
})

test('decorations answer a tap', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'door', { doorSeen: false })
  for (const sel of ['.porch-art .plant', '.porch-art .mat', '.leaf-art .plate', '.porch-art .lamp']) {
    const b = await page.locator(sel).boundingBox()
    await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.7)
  }
  await page.waitForTimeout(120)
  const moved = await page.evaluate(() => document.querySelector('.porch-art .mat').getAttribute('transform') || getComputedStyle(document.querySelector('.porch-art .mat')).transform)
  expect(moved).not.toBe('none')
  expect(moved).toBeTruthy()
  expect(errors).toEqual([])
})
