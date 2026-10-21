import { expect, test } from '@playwright/test'
import { open, shot, VIEWPORTS } from './helpers.js'

// screenshot-only sweep: the owner reviews the pictures (test-results/shots/desktop/house-*.png)
for (const vp of VIEWPORTS) {
  test(`house at ${vp.name}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'viewport loop runs once')
    await page.setViewportSize(vp)
    await open(page, 'house', { done: ['living', 'kitchen', 'garden', 'rooftop', 'desk', 'empty', 'finale'] })
    await expect(page.locator('[data-window="living"]')).toBeVisible()
    await page.waitForTimeout(350)
    await shot(page, `house-${vp.name}`)
  })
}
