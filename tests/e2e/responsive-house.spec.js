import { test } from '@playwright/test'
import { checkLayout, open, VIEWPORTS } from './helpers.js'

for (const vp of VIEWPORTS) {
  test(`house fits at ${vp.name}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'viewport loop runs once')
    await page.setViewportSize(vp)
    await open(page, 'house', { done: ['living', 'kitchen', 'garden', 'rooftop', 'desk', 'empty', 'finale'] })
    await checkLayout(page, ['[data-window="living"]', '[data-window="kitchen"]', '[data-window="desk"]', '[data-window="empty"]', '[data-window="rooftop"]', '[data-window="garden"]', '[data-letterbox]', '.chip--lang', '.chip--sound'], `house-${vp.name}`)
  })
}
