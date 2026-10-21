import { test } from '@playwright/test'
import { open } from './helpers.js'

test.use({ video: 'on' })
test.describe.configure({ timeout: 120_000 })

const tapEl = async (page, sel, i = 0, fy = 0.5) => {
  const b = await page.locator(sel).nth(i).boundingBox()
  await page.mouse.click(b.x + b.width / 2, b.y + b.height * fy)
}
const snap = (page, n) => page.screenshot({ path: `test-results/scratch/${test.info().project.name}-${n}.png` })

test('garden wide reactions', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await open(page, 'garden')
  await page.waitForTimeout(600)
  await snap(page, 'g2-start')
  const seq = [
    ['.g-back .g-gift__box', 'gift', 2],
    ['.g-back .g-well .g-water', 'well', 3],
    ['.g-back .g-pot', 'pot', 3],
    ['.g-back .g-cat', 'cat', 3],
    ['.g-back .g-door', 'door', 3],
    ['.g-back .g-pipe', 'pipe', 2],
    ['.g-back .rtree', 'tree', 3],
    ['.g-back .shroom', 'shroom', 3],
  ]
  for (const [sel, name, n] of seq) {
    for (let i = 0; i < n; i++) {
      await tapEl(page, sel, 0, 0.5)
      await page.waitForTimeout(450)
    }
    await page.waitForTimeout(name === 'tree' || name === 'shroom' ? 900 : 300)
    await snap(page, `g2-${name}`)
    await page.waitForTimeout(2200)
  }
  // grown: sapling + tag
  await page.evaluate(() => window.__garden.hold(3000))
  await page.waitForTimeout(3500)
  for (let i = 0; i < 3; i++) {
    await tapEl(page, '[data-tag]')
    await page.waitForTimeout(400)
  }
  await page.waitForTimeout(400)
  await snap(page, 'g2-tag')
  await page.waitForTimeout(3500)
  for (let i = 0; i < 3; i++) {
    await tapEl(page, '.sap-leaf', 2)
    await page.waitForTimeout(450)
  }
  await page.waitForTimeout(700)
  await snap(page, 'g2-sapling')
})
