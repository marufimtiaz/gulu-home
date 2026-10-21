/*
 * Real touch input (CDP touch events, not mouse). Regression: the living-room clock hand worked
 * with a mouse but not a finger — touch-action on an SVG <g> is ignored, so the browser took the
 * drag as a pan and fired pointercancel after a few moves. base.css sets it on every scene <svg>.
 */
import { expect, test } from '@playwright/test'
import { open } from './helpers.js'

test.use({ hasTouch: true, isMobile: true })

async function touchDrag(page, points) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points[0]] })
  for (const p of points.slice(1)) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function arc(page, sel, turns, dir) {
  const box = await page.locator(sel).first().boundingBox()
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const r = Math.min(box.width, box.height) * 0.38
  const pts = []
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + dir * turns * 2 * Math.PI * (i / 24)
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
  }
  return pts
}

const countCancels = (page) =>
  page.addInitScript(() => addEventListener('pointercancel', () => (window.__cancels = (window.__cancels || 0) + 1), true))

test('a finger can turn the living-room clock back', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'touch')
  await countCancels(page)
  await open(page, 'living')
  const before = await page.evaluate(() => window.__living.t())
  await touchDrag(page, await arc(page, '[data-clock]', 0.4, -1))
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => window.__cancels || 0)).toBe(0)
  expect(await page.evaluate(() => window.__living.t())).toBeLessThan(before - 0.01)
})

test('a finger can turn the door lock', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'touch')
  await countCancels(page)
  await open(page, 'door', { doorSeen: false })
  const before = await page.evaluate(() => window.__door.get().minute)
  await touchDrag(page, await arc(page, '.lock', 0.25, 1))
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => window.__cancels || 0)).toBe(0)
  expect(await page.evaluate(() => window.__door.get().minute)).not.toBe(before)
})
