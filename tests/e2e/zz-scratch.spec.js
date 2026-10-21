import { test } from '@playwright/test'
import { collectErrors, open } from './helpers.js'

test.use({ video: { mode: 'on', size: { width: 1280, height: 800 } } })

const tap = async (page, sel, dx = 0.5, dy = 0.5) => {
  const b = await page.locator(sel).first().boundingBox()
  await page.mouse.click(b.x + b.width * dx, b.y + b.height * dy)
}
const snap = (page, n) => page.screenshot({ path: `test-results/s17b/${n}.png` })

for (const [w, h] of [[1280, 800], [390, 844]]) {
  test(`kitchen reactions ${w}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop')
    test.setTimeout(120_000)
    const errors = collectErrors(page)
    await page.setViewportSize({ width: w, height: h })
    await open(page, 'kitchen')
    await page.waitForTimeout(600)
    const pot = '[data-pot]'
    for (let i = 1; i <= 6; i++) {
      await tap(page, pot, 0.5, 0.6)
      await page.waitForTimeout(250)
      if ([1, 3, 4, 5].includes(i)) await snap(page, `k${w}-pot-${i}`)
      await page.waitForTimeout(300)
    }
    await page.waitForTimeout(3600)
    await snap(page, `k${w}-pot-calm`)
    for (let i = 0; i < 2; i++) { await tap(page, '[data-knob]'); await page.waitForTimeout(500) }
    await snap(page, `k${w}-hot`)
    await tap(page, '[data-knob]')
    for (const tool of ['ladle', 'belon']) {
      for (let i = 0; i < 3; i++) { await tap(page, `[data-tool="${tool}"]`); await page.waitForTimeout(350) }
      await snap(page, `k${w}-${tool}`)
      await page.waitForTimeout(1500)
    }
    if (w > 600) {
      for (let i = 0; i < 4; i++) { await tap(page, '[data-tap]'); await page.waitForTimeout(400) }
      await snap(page, `k${w}-tap`)
    }
    // drag a jar part-way: the pot watches it
    const j = await page.locator('[data-jar="2"]').boundingBox()
    await page.mouse.move(j.x + j.width / 2, j.y + j.height / 2)
    await page.mouse.down()
    await page.mouse.move(j.x + j.width / 2 + 60, j.y + j.height / 2 + 80, { steps: 6 })
    await page.waitForTimeout(150)
    await snap(page, `k${w}-look`)
    await page.mouse.up()
    await page.waitForTimeout(800)
    await page.evaluate(() => { for (let i = 0; i < 7; i++) window.__kitchen.add(i) })
    await page.waitForTimeout(6500)
    await snap(page, `k${w}-stir-nudge`)
    const p = await page.locator(pot).boundingBox()
    const cx = p.x + p.width / 2, cy = p.y + p.height * 0.3, r = p.width * 0.25
    await page.mouse.move(cx + r, cy)
    await page.mouse.down()
    for (let i = 1; i <= 24; i++) await page.mouse.move(cx + r * Math.cos(i / 12 * Math.PI), cy + r * Math.sin(i / 12 * Math.PI))
    await snap(page, `k${w}-dizzy`)
    await page.mouse.up()
    await page.evaluate(() => window.__kitchen.stir(3))
    await page.waitForTimeout(4000)
    await tap(page, pot, 0.5, 0.6)
    await page.waitForTimeout(500)
    await snap(page, `k${w}-full`)
    console.log('ERR', JSON.stringify(errors))
  })
}
