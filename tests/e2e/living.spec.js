import { expect, test } from '@playwright/test'
import { checkLayout, collectErrors, open, pressLatency, shot, VIEWPORTS } from './helpers.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const today = () => {
  const d = new Date()
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
const seek = (page, t) => page.evaluate((x) => window.__living.seek(x), t)
const frameHrefs = (page) =>
  page.locator('[data-frame] [data-photo]').evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''))

async function clockCentre(page) {
  const box = await page.locator('[data-face]').boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, r: box.width / 2 }
}

/** Drag the pointer around the clock face. turns < 0 = anticlockwise. */
async function spin(page, turns, { release = true, steps = 24 } = {}) {
  const { x, y, r } = await clockCentre(page)
  const rr = r * 0.7
  const total = Math.abs(turns) * steps
  const dir = Math.sign(turns)
  await page.mouse.move(x, y - rr)
  await page.mouse.down()
  for (let i = 1; i <= total; i++) {
    const a = -Math.PI / 2 + (dir * i * 2 * Math.PI) / steps
    await page.mouse.move(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  if (release) {
    await page.waitForTimeout(120) // finger stops → no fling
    await page.mouse.up()
  }
}

test('mounts at now: date plate shows today, counter hidden', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'living')
  await expect(page.locator('[data-clock]')).toBeVisible()
  await expect(page.locator('[data-date]')).toHaveText(today())
  await expect(page.locator('[data-counter]')).toBeHidden()
  await expect(page.locator('[data-frame]')).toHaveCount(3)
  await page.waitForTimeout(1200)
  await shot(page, 'living-now')
  expect(errors).toEqual([])
})

test('turning the clock anticlockwise rewinds time', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'living')
  await spin(page, -1)
  const t = await page.evaluate(() => window.__living.t())
  expect(t).toBeLessThan(0.95)
  expect(t).toBeGreaterThan(0.9)
  await expect(page.locator('[data-date]')).not.toHaveText(today())
  // winding forward again comes back to now
  await spin(page, 1.5)
  expect(await page.evaluate(() => window.__living.t())).toBe(1)
  expect(errors).toEqual([])
})

test('seeking to the middle shows photos from before then', async ({ page }) => {
  await open(page, 'living')
  await seek(page, 0.5)
  await page.waitForTimeout(400)
  const hrefs = await frameHrefs(page)
  expect(hrefs.some((h) => h.includes('2024'))).toBe(true)
  expect(hrefs.every((h) => !/IMG_202(5|6)/.test(h))).toBe(true)
  // mid-2024 is months from any event: no card may be left up from the ones jumped past
  await expect(page.locator('[data-event]')).toBeHidden()
  await shot(page, 'living-mid')
  // close to the start the frames empty out — no photos before the first text
  await seek(page, 0.03)
  await page.waitForTimeout(400)
  const early = await frameHrefs(page)
  expect(early.filter(Boolean).every((h) => /IMG_2022/.test(h))).toBe(true)
  expect(early.some((h) => h.includes('20220420'))).toBe(false)
})

const tAt = (page, iso) => page.evaluate((d) => window.__living.tAt(d), iso)

test('event cards track the scrubbed date: they pop as she passes, and go when she moves on', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'living')
  const card = page.locator('[data-event]')
  // rewind to just before 9 Dec 2025 → that card pops
  await seek(page, await tAt(page, '2025-12-04'))
  await expect(card).toBeVisible()
  await expect(card).toContainText('ordinary days')
  await shot(page, 'living-event')
  // wind forward past it again → gone at once
  await seek(page, await tAt(page, '2025-12-20'))
  await expect(card).toBeHidden({ timeout: 400 })
  // pass it again, then keep rewinding far beyond it → gone at once
  await seek(page, await tAt(page, '2025-12-01'))
  await expect(card).toBeVisible()
  await seek(page, await tAt(page, '2024-07-21'))
  await expect(card).toBeHidden({ timeout: 400 })
  await expect(page.locator('[data-date]')).toHaveText('21 Jul 2024')
  expect(errors).toEqual([])
})

test('while flicking through the years, a visible card is never far from the date plate', async ({ page }) => {
  await open(page, 'living')
  // three hard flicks, sampling every frame: whenever a card is up, its date is within
  // ~2 months of the plate (and never after it)
  const worst = await page.evaluate(async () => {
    const card = document.querySelector('[data-event]')
    let worst = 0, seen = 0
    for (let k = 0; k < 4; k++) {
      window.__living.fling(-30)
      const t0 = performance.now()
      while (performance.now() - t0 < 2600) {
        await new Promise((r) => requestAnimationFrame(r))
        if (card.hidden || getComputedStyle(card).opacity < 0.5) continue
        seen++
        const gap = (+new Date(card.dataset.eventDate) - +new Date(window.__living.date())) / 864e5
        worst = Math.max(worst, Math.abs(gap))
      }
    }
    return { worst, seen, t: window.__living.t() }
  })
  expect(worst.seen).toBeGreaterThan(0)
  expect(worst.worst).toBeLessThan(75)
  // and four flicks are enough to reach the start (2022)
  expect(worst.t).toBeLessThan(0.02)
})

test('dawn: the phone glows, the first text, then back to tonight', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'living')
  await seek(page, 0)
  const scene = page.locator('.scene[data-scene="living"]')
  await expect(scene).toHaveClass(/living--dawn/)
  await expect(page.locator('[data-date]')).toHaveText('20 Apr 2022')
  await expect(page.locator('[data-time]')).toHaveText('4:30 AM')
  expect(await frameHrefs(page)).toEqual(['', '', ''])
  await page.waitForTimeout(2200)
  await shot(page, 'living-dawn')
  await page.locator('[data-phone]').click()
  await expect(page.locator('[data-bubble]')).toHaveText('I love you toooo')
  await page.waitForTimeout(1800)
  await shot(page, 'living-text')
  await expect(page.locator('[data-counter]')).toBeVisible({ timeout: 12_000 })
  await expect(page.locator('[data-counter]')).toContainText('days')
  await expect(scene).toHaveAttribute('data-done', 'true')
  await expect(scene).not.toHaveClass(/living--dawn/)
  await expect(page.locator('[data-date]')).toHaveText(today())
  await page.waitForTimeout(800)
  await shot(page, 'living-done')
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.living)
  expect(saved).toBe(true)
  await page.locator('[data-counter] [data-back]').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  expect(errors).toEqual([])
})

test('winding forward out of dawn before tapping relights the room', async ({ page }) => {
  await open(page, 'living')
  await seek(page, 0)
  await expect(page.locator('.scene[data-scene="living"]')).toHaveClass(/living--dawn/)
  await seek(page, 0.3)
  await expect(page.locator('.scene[data-scene="living"]')).not.toHaveClass(/living--dawn/)
  await expect(page.locator('[data-counter]')).toBeHidden()
})

test('rotating the screen mid-drag leaves nothing stuck', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'living')
  const size = page.viewportSize()
  await spin(page, -0.5, { release: false })
  await page.setViewportSize({ width: size.height, height: size.width })
  await page.waitForTimeout(200)
  await page.mouse.move(10, 10)
  await page.mouse.up()
  await page.waitForTimeout(1600) // any fling settles
  await shot(page, 'living-landscape')
  await seek(page, 0.4)
  expect(await page.evaluate(() => window.__living.t())).toBeCloseTo(0.4, 3)
  // a fresh drag still works in the new layout
  await spin(page, 1)
  expect(await page.evaluate(() => window.__living.t())).toBeGreaterThan(0.4)
  expect(errors).toEqual([])
})

test('re-entering a completed room starts at now and completes again', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'living', { done: ['living'] })
  expect(await page.evaluate(() => window.__living.t())).toBe(1)
  await expect(page.locator('[data-date]')).toHaveText(today())
  await expect(page.locator('[data-counter]')).toBeHidden()
  await seek(page, 0)
  await page.locator('[data-phone]').click()
  await expect(page.locator('[data-counter]')).toBeVisible({ timeout: 12_000 })
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.living)
  expect(saved).toBe(true)
  expect(errors).toEqual([])
})

test('leaving the room removes its debug hook', async ({ page }) => {
  await open(page, 'living')
  await page.evaluate(() => window.__home.go('house'))
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await expect.poll(() => page.evaluate(() => typeof window.__living)).toBe('undefined')
})

// ── responsiveness: every interactive thing inside the screen and ≥ 44 px, at every size ──
async function onScreen(page, selector, vp) {
  const box = await page.locator(selector).first().boundingBox()
  expect(box, selector).not.toBeNull()
  expect(box.x, `${selector} left @${vp.name}`).toBeGreaterThanOrEqual(-1)
  expect(box.y, `${selector} top @${vp.name}`).toBeGreaterThanOrEqual(-1)
  expect(box.x + box.width, `${selector} right @${vp.name}`).toBeLessThanOrEqual(vp.width + 1)
  expect(box.y + box.height, `${selector} bottom @${vp.name}`).toBeLessThanOrEqual(vp.height + 1)
  return box
}
const overlap = (a, b) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y)

test('every size: clock, phone, text card and counter are on screen and big enough', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'sizes are set explicitly; one project is enough')
  test.setTimeout(300_000)
  const errors = collectErrors(page)
  await open(page, 'living')
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp)
    await checkLayout(page, ['[data-face]', '.chip--home'], `living-${vp.name}-now`)
    await onScreen(page, '[data-plate]', vp)
    for (const i of [0, 1, 2]) await onScreen(page, `[data-frame="${i}"]`, vp)
    await seek(page, 0)
    await expect(page.locator('.scene[data-scene="living"]')).toHaveClass(/living--dawn/)
    await page.waitForTimeout(1900)
    await checkLayout(page, ['[data-phone]'], `living-${vp.name}-dawn`)
    await page.locator('[data-phone]').click()
    await expect(page.locator('[data-bubble]')).toBeVisible()
    await page.waitForTimeout(1900)
    await onScreen(page, '.lv-phonecard__phone', vp)
    await onScreen(page, '[data-bubble]', vp)
    // "tap to go on" sits clear of the phone (and the heart on the bubble)
    const on = await onScreen(page, '.lv-phonecard__on', vp)
    const phone = await page.locator('.lv-phonecard__phone').boundingBox()
    expect(overlap(on, phone), `"tap to go on" clear of the phone @${vp.name}`).toBe(false)
    await shot(page, `living-${vp.name}-text`)
    await page.locator('[data-phonecard]').click() // skip the wait
    await expect(page.locator('[data-counter]')).toBeVisible({ timeout: 12_000 })
    await page.waitForTimeout(900)
    await onScreen(page, '[data-counter]', vp)
    await checkLayout(page, ['[data-counter] [data-back]'], `living-${vp.name}-done`)
  }
  expect(errors).toEqual([])
})

test('the back button squashes under a press within 100 ms', async ({ page }) => {
  await open(page, 'living')
  await seek(page, 0)
  await page.waitForTimeout(1200)
  await page.locator('[data-phone]').click()
  await expect(page.locator('[data-bubble]')).toBeVisible()
  await page.waitForTimeout(1200)
  await page.locator('[data-phonecard]').click()
  await expect(page.locator('[data-counter]')).toBeVisible({ timeout: 12_000 })
  await page.waitForTimeout(900)
  expect(await pressLatency(page, '[data-counter] [data-back]')).toBeLessThan(100)
})

test('pressing the clock and poking things respond at once', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'living')
  const { x, y } = await clockCentre(page)
  await page.mouse.move(x, y - 30)
  await page.mouse.down()
  await page.waitForTimeout(100)
  const pressed = await page.locator('[data-clock]').getAttribute('transform')
  expect(pressed).toMatch(/matrix|scale/)
  await page.mouse.up()
  // a decorative frame swings when tapped
  const fb = await page.locator('[data-frame="1"]').boundingBox()
  await page.mouse.click(fb.x + fb.width / 2, fb.y + fb.height / 2)
  await page.waitForTimeout(60)
  const poked = await page.locator('[data-poke]:has([data-frame="1"])').getAttribute('transform')
  expect(poked).toMatch(/matrix|rotate/)
  expect(errors).toEqual([])
})

test('idle for a few seconds → the clock nudges itself', async ({ page }) => {
  await open(page, 'living')
  const deg = async () => parseFloat((await page.locator('[data-hand="minute"]').getAttribute('transform')).slice(7))
  await page.waitForTimeout(3500)
  const samples = []
  for (let i = 0; i < 70; i++) {
    samples.push(await deg())
    await page.waitForTimeout(50)
  }
  expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(3)
})
