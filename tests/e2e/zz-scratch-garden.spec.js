import { test } from '@playwright/test'
import { open } from './helpers.js'

test.use({ video: 'on' })
test.describe.configure({ timeout: 120_000 })

const tapEl = async (page, sel, i = 0, fy = 0.5) => {
  const b = await page.locator(sel).nth(i).boundingBox()
  await page.mouse.click(b.x + b.width / 2, b.y + b.height * fy)
}
const snap = (page, n) => page.screenshot({ path: `test-results/scratch/${test.info().project.name}-${n}.png` })

test('garden reactions', async ({ page }) => {
  await open(page, 'garden')
  await page.waitForTimeout(600)
  // fence tune
  for (let k = 0; k < 9; k++) {
    await tapEl(page, `.picket[data-k="${k}"]`, 0, 0.12)
    await page.waitForTimeout(260)
  }
  await page.waitForTimeout(300)
  await snap(page, 'g-song')
  await page.waitForTimeout(3500)
  // toadstool x3
  for (let i = 0; i < 3; i++) {
    await tapEl(page, '.g-back .shroom', 0, 0.3)
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(500)
  await snap(page, 'g-spores')
  await page.waitForTimeout(1500)
  // lantern x3
  for (let i = 0; i < 3; i++) {
    await tapEl(page, '.g-post .lantern', 0, 0.7)
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(200)
  await snap(page, 'g-lantern')
  await page.waitForTimeout(2500)
  // moon x3
  for (let i = 0; i < 3; i++) {
    await tapEl(page, '.g-moon .moon-disc')
    await page.waitForTimeout(500)
  }
  await snap(page, 'g-moon')
  await page.waitForTimeout(3000)
  // flowers
  const n = await page.locator('.g-back .fl').count()
  let woke = 0
  for (let i = 0; i < n && woke < 5; i++) {
    const b = await page.locator('.g-back .fl .fl-head').nth(i).boundingBox()
    const vp = page.viewportSize()
    if (!b || b.x < 0 || b.x + b.width > vp.width) continue
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    woke++
    await page.waitForTimeout(400)
  }
  await page.waitForTimeout(300)
  await snap(page, 'g-flowers')
  await page.waitForTimeout(3000)
})
