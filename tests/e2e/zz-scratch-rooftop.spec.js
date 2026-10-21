import { test } from '@playwright/test'
import { collectErrors, open } from './helpers.js'

test.use({ video: 'on' })
test.describe.configure({ timeout: 120_000 })

const tapEl = async (page, sel, fy = 0.5, fx = 0.5) => {
  const b = await page.locator(sel).first().boundingBox()
  await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy)
}
const snap = (page, n) => page.screenshot({ path: `test-results/scratch/${test.info().project.name}-${n}.png` })

test('rooftop reactions', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'rooftop')
  await page.waitForTimeout(600)
  // the cat, five times
  for (let i = 0; i < 5; i++) {
    await tapEl(page, '[data-poke="cat"] .rt-hit')
    await page.waitForTimeout(i === 2 ? 900 : 700)
    await snap(page, `r-cat${i + 1}`)
    await page.waitForTimeout(1300)
  }
  await page.waitForTimeout(1000)
  await snap(page, 'r-cat-away')
  // tank ×5
  for (let i = 0; i < 5; i++) {
    await tapEl(page, '[data-poke="tank"] .rt-tankbody')
    await page.waitForTimeout(900)
    await snap(page, `r-tank${i + 1}`)
    await page.waitForTimeout(600)
  }
  // pot ×3, door ×3, city ×3, lights, moon ×3
  for (const [sel, name, n] of [['[data-poke="pot"] .rt-hit', 'pot', 3], ['[data-poke="door"] .rt-hit', 'door', 3], ['[data-poke="lights"] .rt-lights__hit polyline', 'lights', 2], ['.rt-moon .rt-moon__disc', 'moon', 3]]) {
    for (let i = 0; i < n; i++) {
      await tapEl(page, sel)
      await page.waitForTimeout(name === 'moon' ? 2600 : 500)
    }
    await snap(page, `r-${name}`)
    await page.waitForTimeout(2600)
  }
  await page.waitForTimeout(5000)
  await snap(page, 'r-cat-back')
  console.log('ERRORS', JSON.stringify(errors))
})
