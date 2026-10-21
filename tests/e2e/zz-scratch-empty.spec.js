import { test } from '@playwright/test'
import { collectErrors, open } from './helpers.js'

test.use({ video: 'on' })
test.describe.configure({ timeout: 120_000 })

const FIVE = ['living', 'kitchen', 'garden', 'rooftop', 'desk']
const tapEl = async (page, sel, fy = 0.5, fx = 0.5) => {
  const b = await page.locator(sel).first().boundingBox()
  await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy)
}
const snap = (page, n) => page.screenshot({ path: `test-results/scratch/${test.info().project.name}-${n}.png` })

test('empty reactions', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'empty', { done: FIVE })
  await page.waitForTimeout(600)
  for (let i = 0; i < 3; i++) {
    await tapEl(page, '[data-wall]', 0.6, 0.3)
    await page.waitForTimeout(500)
  }
  await snap(page, 'e-knock')
  await page.waitForTimeout(3500)
  for (let i = 0; i < 3; i++) {
    await tapEl(page, '[data-bulb] .b-glass')
    await page.waitForTimeout(i === 2 ? 600 : 900)
  }
  await snap(page, 'e-dark')
  await page.waitForTimeout(2600)
  await snap(page, 'e-lightson')
  for (let i = 0; i < 3; i++) {
    await tapEl(page, '[data-ladder]', 0.6)
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(500)
  await snap(page, 'e-topper')
  await page.waitForTimeout(3500)
  for (let i = 0; i < 3; i++) {
    await tapEl(page, '[data-box]', 0.6, 0.3)
    await page.waitForTimeout(900)
    await snap(page, `e-box${i + 1}`)
    await page.waitForTimeout(2800)
  }
  await page.waitForTimeout(7000)
  await snap(page, 'e-nudge')
  console.log('ERRORS', JSON.stringify(errors))
})
