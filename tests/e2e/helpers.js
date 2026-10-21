/*
 * Shared e2e helpers. Every scene spec should use these.
 *
 *   await open(page, 'kitchen', { done: ['living'], doorSeen: true, lang: 'en' })
 *     (opts.expect: the scene id to wait for, if a guard redirects; opts.query: extra URL params)
 *     → seeds localStorage, loads /?debug#/kitchen, waits for the scene to mount.
 *   collectErrors(page) → array that fills with console errors + page errors.
 *   await shot(page, 'kitchen-start') → screenshot into test-results/shots/<project>/.
 */
import { expect } from '@playwright/test'

export const ROOMS = ['living', 'kitchen', 'garden', 'rooftop', 'desk', 'empty']

export function seed({ doorSeen = true, done = [], lang = 'en', notes = [], wall = null, order = [] } = {}) {
  const d = { living: false, kitchen: false, garden: false, rooftop: false, desk: false, empty: false, finale: false }
  for (const r of done) d[r] = true
  return { v: 1, doorSeen, done: d, empty: { wall, notes }, order, lang, sound: 'off' }
}

export async function open(page, route, opts = {}) {
  const s = seed(opts)
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('our-home', value)
      sessionStorage.setItem('seeded', '1')
    }
  }, JSON.stringify(s))
  const q = opts.query ? `&${opts.query}` : ''
  await page.goto(`/?debug${q}#/${route}`)
  await expect(page.locator(`.scene[data-scene="${opts.expect ?? route}"]`)).toBeVisible()
  // let the crossfade finish
  await page.waitForTimeout(150)
}

export function collectErrors(page) {
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !/fonts\.g(oogleapis|static)/.test(m.text())) errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  return errors
}

export async function shot(page, name) {
  const project = test_info_project()
  await page.screenshot({ path: `test-results/shots/${project}/${name}.png` })
}

import { test } from '@playwright/test'
function test_info_project() {
  try {
    return test.info().project.name
  } catch {
    return 'default'
  }
}

/*
 * Responsiveness matrix. Every scene spec runs `checkLayout` across VIEWPORTS:
 *   for (const vp of VIEWPORTS) { await page.setViewportSize(vp); await checkLayout(page, ['[data-try]', …], `door-${vp.name}`) }
 * It asserts each interactive selector is visible, fully inside the viewport, and ≥ 44×44 px,
 * that nothing scrolls, and saves a screenshot per size for review.
 */
export const VIEWPORTS = [
  { name: 'small-android', width: 360, height: 640 },
  { name: 'iphone', width: 390, height: 844 },
  { name: 'pixel', width: 412, height: 915 },
  { name: 'landscape-phone', width: 844, height: 390 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1920, height: 1080 },
]

export async function checkLayout(page, selectors, name, { minTap = 44 } = {}) {
  await page.waitForTimeout(350) // let resize handlers + springs settle
  const vp = page.viewportSize()
  if (name) await shot(page, name) // before asserting, so failures still leave a picture
  for (const sel of selectors) {
    const loc = page.locator(sel).first()
    await expect(loc, `${sel} visible at ${vp.width}×${vp.height}`).toBeVisible()
    const b = await loc.boundingBox()
    expect(b.x, `${sel} left edge at ${vp.width}×${vp.height}`).toBeGreaterThanOrEqual(-1)
    expect(b.y, `${sel} top edge at ${vp.width}×${vp.height}`).toBeGreaterThanOrEqual(-1)
    expect(b.x + b.width, `${sel} right edge at ${vp.width}×${vp.height}`).toBeLessThanOrEqual(vp.width + 1)
    expect(b.y + b.height, `${sel} bottom edge at ${vp.width}×${vp.height}`).toBeLessThanOrEqual(vp.height + 1)
    expect(Math.min(b.width, b.height), `${sel} tap size at ${vp.width}×${vp.height}`).toBeGreaterThanOrEqual(minTap)
  }
  const scrolls = await page.evaluate(() => document.scrollingElement.scrollHeight > innerHeight + 1 || document.scrollingElement.scrollWidth > innerWidth + 1)
  expect(scrolls, `page scrolls at ${vp.width}×${vp.height}`).toBe(false)
}

/** Time from a real pointerdown on `sel` until its transform visibly changes (ms). Must be < 100. */
export async function pressLatency(page, sel) {
  const box = await page.locator(sel).first().boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.evaluate((s) => {
    const el = document.querySelector(s)
    const before = getComputedStyle(el).transform
    window.__pressLatency = new Promise((resolve) => {
      el.addEventListener(
        'pointerdown',
        () => {
          const t0 = performance.now()
          const check = () => {
            const dt = performance.now() - t0
            if (getComputedStyle(el).transform !== before) resolve(dt)
            else if (dt > 500) resolve(999)
            else requestAnimationFrame(check)
          }
          requestAnimationFrame(check)
        },
        { once: true, capture: true },
      )
    })
  }, sel)
  await page.mouse.down()
  const ms = await page.evaluate(() => window.__pressLatency)
  await page.mouse.up()
  return ms
}
