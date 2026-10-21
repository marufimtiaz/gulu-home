import { test } from '@playwright/test'
import { open } from './helpers.js'

const FIVE = ['living', 'kitchen', 'garden', 'rooftop', 'desk']
test('medal', async ({ page }) => {
  await open(page, 'empty', { done: FIVE })
  for (let i = 0; i < 3; i++) {
    const b = await page.locator('[data-ladder]').boundingBox()
    await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.6)
    await page.waitForTimeout(300)
  }
  await page.waitForTimeout(900)
  const info = await page.evaluate(() => ({
    ladder: document.querySelector('[data-ladder]').getBoundingClientRect().toJSON(),
    medal: document.querySelector('.l-medal').getBoundingClientRect().toJSON(),
    tf: document.querySelector('.l-medal').getAttribute('transform'),
    st: document.querySelector('.l-medal').getAttribute('style'),
  }))
  console.log(JSON.stringify(info))
  await page.screenshot({ path: 'test-results/scratch/medal.png' })
})
