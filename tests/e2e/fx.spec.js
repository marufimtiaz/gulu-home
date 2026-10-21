import { expect, test } from '@playwright/test'
import { collectErrors, open, shot } from './helpers.js'

async function loadFx(page) {
  await page.evaluate(async () => {
    window.__fx = await import('/src/fx/index.js')
  })
}

test('effects render on the page without errors', async ({ page }) => {
  test.setTimeout(60_000)
  const errors = collectErrors(page)
  await open(page, 'house')
  await loadFx(page)
  const vp = page.viewportSize()

  // starfield + shooting star
  await page.evaluate(() => {
    window.__stopStars = window.__fx.starfield(document.body, { count: 90, shooting: true })
  })
  await expect(page.locator('body > svg.stars circle')).toHaveCount(90)
  await page.waitForTimeout(400)
  await shot(page, 'fx-stars')

  // fireflies, gathering around the pointer
  await page.evaluate(() => {
    window.__stopFlies = window.__fx.fireflies(document.body, { count: 9 })
  })
  await expect(page.locator('body > .firefly')).toHaveCount(9)
  await page.waitForTimeout(600)
  await shot(page, 'fx-fireflies')
  await page.mouse.move(vp.width * 0.5, vp.height * 0.45)
  await page.mouse.move(vp.width * 0.52, vp.height * 0.46)
  // they drift over gently (slow on a wide desktop), so poll rather than guess a delay
  const nearPointer = () =>
    page.evaluate(
      ([px, py]) =>
        [...document.querySelectorAll('body > .firefly')].filter((el) => {
          const r = el.getBoundingClientRect()
          return Math.hypot(r.x + r.width / 2 - px, r.y + r.height / 2 - py) < 140
        }).length,
      [vp.width * 0.52, vp.height * 0.46],
    )
  await expect.poll(nearPointer, { timeout: 15000 }).toBeGreaterThanOrEqual(5)
  await shot(page, 'fx-fireflies-gather')

  // bursts
  await page.evaluate(([x, y]) => {
    window.__fx.sparkles(x * 0.35, y * 0.4)
    window.__fx.hearts(x * 0.65, y * 0.6)
  }, [vp.width, vp.height])
  await page.waitForTimeout(220)
  await shot(page, 'fx-bursts')
  await page.waitForTimeout(1300)
  await expect(page.locator('#fx-layer .burst')).toHaveCount(0)

  // confetti
  const confettiDone = page.evaluate(() => window.__fx.confetti({ duration: 2500 }))
  await page.waitForTimeout(900)
  await shot(page, 'fx-confetti')
  await confettiDone
  await expect(page.locator('#fx-layer .confetti')).toHaveCount(0)

  // fireworks
  const t0 = Date.now()
  const fwDone = page.evaluate(() => window.__fx.fireworks(document.body, { duration: 4000 }))
  await page.waitForTimeout(1900)
  await shot(page, 'fx-fireworks')
  await fwDone
  expect(Date.now() - t0).toBeGreaterThanOrEqual(3900)
  await expect(page.locator('canvas.fireworks')).toHaveCount(0)

  // stop() leaves nothing behind
  await page.evaluate(() => {
    window.__stopStars()
    window.__stopFlies()
  })
  // (the house scene underneath keeps its own sky — only count what this test added to <body>)
  await expect(page.locator('body > svg.stars')).toHaveCount(0)
  await expect(page.locator('body > .firefly')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('reduced motion: still effects, fireworks resolve fast', async ({ page }) => {
  const errors = collectErrors(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, 'house')
  await loadFx(page)

  const result = await page.evaluate(async () => {
    const fx = window.__fx
    const stopStars = fx.starfield(document.body, { count: 40, shooting: true })
    const stopFlies = fx.fireflies(document.body, { count: 6 })
    const twinkling = document.querySelectorAll('.stars .star--twinkle').length
    const still = document.querySelectorAll('.firefly--still').length
    const t = performance.now()
    await fx.fireworks(document.body, { duration: 6000 })
    const fireworksMs = performance.now() - t
    await fx.confetti()
    window.__stop = () => (stopStars(), stopFlies())
    return { twinkling, still, fireworksMs }
  })
  expect(result.twinkling).toBe(0)
  expect(result.still).toBe(6)
  expect(result.fireworksMs).toBeLessThan(1000)
  await shot(page, 'fx-reduced')
  await page.evaluate(() => window.__stop())
  await expect(page.locator('body > .firefly')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('fireworks stop early: .stop() and an AbortSignal both clear the canvas and resolve', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'house')
  await loadFx(page)
  const viaStop = await page.evaluate(async () => {
    const show = window.__fx.fireworks(document.body, { duration: 20000 })
    await new Promise((r) => setTimeout(r, 600))
    const drawing = document.querySelectorAll('canvas.fireworks').length
    const t = performance.now()
    show.stop()
    await show
    return { drawing, ms: performance.now() - t, left: document.querySelectorAll('canvas.fireworks').length }
  })
  expect(viaStop.drawing).toBe(1)
  expect(viaStop.ms).toBeLessThan(100)
  expect(viaStop.left).toBe(0)

  const viaSignal = await page.evaluate(async () => {
    const ac = new AbortController()
    const show = window.__fx.fireworks(document.body, { duration: 20000, signal: ac.signal })
    await new Promise((r) => setTimeout(r, 300))
    const t = performance.now()
    ac.abort()
    await show
    return { ms: performance.now() - t, left: document.querySelectorAll('canvas.fireworks').length }
  })
  expect(viaSignal.ms).toBeLessThan(100)
  expect(viaSignal.left).toBe(0)
  expect(errors).toEqual([])
})
