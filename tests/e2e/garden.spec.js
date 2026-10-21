import { expect, test } from '@playwright/test'
import { collectErrors, open, shot, VIEWPORTS } from './helpers.js'

// real-pointer tests on a shared machine: generous time rather than shortened gestures
// (one retry only covers helpers.open()'s fixed 5 s mount wait when other agents load the box)
test.describe.configure({ timeout: 90_000, retries: 1 })

const growth = (page) => page.locator('[data-growth]').getAttribute('data-growth').then(Number)
const phase = (page) => page.locator('.garden').getAttribute('data-phase')

async function center(page, sel) {
  const b = await page.locator(sel).first().boundingBox()
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

/** Holds the pointer on sel for ms; returns how long the hold really lasted (ms). */
async function holdOn(page, sel, ms) {
  const p = await center(page, sel)
  await page.mouse.move(p.x, p.y)
  // timed in the page, pointerdown → pointerup (test-side clocks include IPC lag under load)
  await page.evaluate((s) => {
    const el = document.querySelector(s)
    window.__held = new Promise((resolve) => {
      let t0 = 0
      el.addEventListener('pointerdown', () => (t0 = performance.now()), { once: true })
      el.addEventListener('pointerup', () => resolve(performance.now() - t0), { once: true })
    })
  }, sel)
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
  return page.evaluate(() => window.__held)
}

test('plant, water by holding, grow, then see the future', async ({ page }) => {
  test.setTimeout(90_000)
  const errors = collectErrors(page)
  await open(page, 'garden')
  await page.waitForTimeout(400)
  await shot(page, 'garden-start')
  await expect(page.locator('[data-soil]')).toBeVisible()
  await expect(page.locator('[data-tag]')).toBeHidden()
  await expect(page.locator('[data-future]')).toBeHidden()

  // tap the soil: a seed drops in, then it asks for water
  const soil = await center(page, '[data-soil]')
  await page.mouse.click(soil.x, soil.y)
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('[data-seed]')).opacity).then(Number), { timeout: 2000 }).toBeGreaterThan(0)
  await expect.poll(() => phase(page), { timeout: 4000 }).toBe('water')
  await expect(page.locator('[data-prompt]')).toContainText('hold')

  // hold 1.4 s: growth ≈ 0.55, and it pauses once released
  const held = await holdOn(page, '[data-soil]', 1400)
  const g1 = await growth(page)
  expect(g1).toBeGreaterThan(0.4) // ≈ 0.55 for 1.4 s
  expect(g1).toBeLessThan(1)
  expect(Math.abs(g1 - held / 2500)).toBeLessThan(0.15) // tracks the real hold time
  await page.waitForTimeout(500)
  expect(await growth(page)).toBe(g1)
  await shot(page, 'garden-watering')

  // hold the can this time until it's grown
  await holdOn(page, '[data-can]', 1800)
  expect(await growth(page)).toBe(1)
  await expect(page.locator('[data-tag]')).toBeVisible()
  await expect(page.locator('[data-tag]')).toContainText('Maruf & Sneha')
  await expect(page.locator('[data-future]')).toBeVisible({ timeout: 12_000 })
  await expect(page.locator('[data-future]')).toContainText('what will it look like?')
  await page.waitForTimeout(600)
  await shot(page, 'garden-grown')

  // the time-lapse: grows to year five, then back to today and done
  await page.locator('[data-future]').click()
  await expect(page.locator('.garden.g--full')).toBeAttached({ timeout: 25_000 })
  await page.waitForTimeout(300)
  await shot(page, 'garden-future')
  await expect(page.locator('[data-after]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-after]')).toContainText('one year at a time')
  await expect(page.locator('.scene[data-scene="garden"]')).toHaveAttribute('data-done', 'true')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.garden)).toBe(true)
  await page.waitForTimeout(500)
  await shot(page, 'garden-after')

  await page.locator('[data-back]').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  expect(errors).toEqual([])
})

test('the can before the seed points back at the soil', async ({ page }) => {
  await open(page, 'garden')
  await holdOn(page, '[data-can]', 300)
  await expect(page.locator('[data-prompt]')).toContainText('the seed first')
  expect(await phase(page)).toBe('plant')
  expect(await growth(page)).toBe(0)
})

test('an idle garden nudges the next thing to touch', async ({ page }) => {
  await open(page, 'garden')
  await expect(page.locator('[data-soil]')).toHaveClass(/nudge/, { timeout: 7000 })
  await page.evaluate(() => window.__garden.plant())
  await expect(page.locator('[data-can]')).toHaveClass(/nudge/, { timeout: 7000 })
})

test('re-entering a grown garden shows today\'s tree, no soil', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'garden', { done: ['garden'] })
  await expect(page.locator('[data-soil]')).toBeHidden()
  await expect(page.locator('[data-tag]')).toBeVisible()
  await expect(page.locator('[data-future]')).toBeVisible()
  await expect(page.locator('[data-back]')).toBeVisible()
  await expect(page.locator('[data-anniversary]')).toBeHidden()
  expect(await growth(page)).toBe(1)
  await page.waitForTimeout(300)
  await shot(page, 'garden-reentry')
  // the future replays, and completion is never lost
  await page.evaluate(() => { window.__garden.future() })
  expect(await phase(page)).toBe('future')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.garden)).toBe(true)
  expect(errors).toEqual([])
})

test('on the first anniversary the tree is a year old and blossoms', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2027, 9, 22, 21, 0))
  await open(page, 'garden', { done: ['garden'] })
  await expect(page.locator('[data-anniversary]')).toBeVisible()
  await expect(page.locator('[data-anniversary]')).toContainText('happy anniversary')
  const g = await page.evaluate(() => window.__garden.get())
  expect(g.stage).toBe(1)
  expect(g.anniversary).toBe(true)
  const blooming = await page.evaluate(() => [...document.querySelectorAll('.tree .bl[data-st="1"]')].every((b) => Number(getComputedStyle(b).opacity) > 0.9))
  expect(blooming).toBe(true)
  await page.waitForTimeout(300)
  await shot(page, 'garden-anniversary')
})

test('five years on, the tree is full grown', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2032, 2, 1, 21, 0))
  await open(page, 'garden', { done: ['garden'] })
  const g = await page.evaluate(() => window.__garden.get())
  expect(g.stage).toBe(5)
  await expect(page.locator('[data-anniversary]')).toBeHidden()
  await page.waitForTimeout(300)
  await shot(page, 'garden-year5')
})

test('reduced motion: the whole room still plays, quickly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors = collectErrors(page)
  await open(page, 'garden')
  const t0 = Date.now()
  await page.evaluate(() => window.__garden.hold(3000))
  await expect(page.locator('[data-future]')).toBeVisible({ timeout: 3000 })
  await page.locator('[data-future]').click()
  await expect(page.locator('[data-after]')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.scene[data-scene="garden"]')).toHaveAttribute('data-done', 'true')
  expect(Date.now() - t0).toBeLessThan(9000)
  expect(errors).toEqual([])
})

test('leaving the garden removes its debug hook', async ({ page }) => {
  await open(page, 'garden')
  expect(await page.evaluate(() => typeof window.__garden)).toBe('object')
  await page.locator('.chip--home').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await expect.poll(() => page.evaluate(() => typeof window.__garden)).toBe('undefined')
})

for (const vp of VIEWPORTS) {
  test(`garden fits at ${vp.name}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'viewport loop runs once')
    test.setTimeout(60_000)
    await page.setViewportSize(vp)
    await open(page, 'garden')
    await page.waitForTimeout(350)
    await shot(page, `garden-start-${vp.name}`)
    await page.evaluate(() => window.__garden.hold(3000))
    await expect(page.locator('[data-future]')).toBeVisible({ timeout: 12_000 })
    await page.waitForTimeout(1200)
    await page.waitForTimeout(350)
    await shot(page, `garden-grown-${vp.name}`)
    // the year-five tree, mid time-lapse
    await page.evaluate(() => { window.__garden.future() })
    await page.evaluate(() => { window.__garden.seek('full') })
    await page.waitForTimeout(400)
    await shot(page, `garden-future-${vp.name}`)
    await page.evaluate(() => { window.__garden.seek('after+=1') })
    await page.waitForTimeout(350)
    await shot(page, `garden-after-${vp.name}`)
    // the "light came on" toast (top, under the chips) arrives with the closing line: it must not cover it
    await expect(page.locator('.toast')).toBeVisible()
    const toast = await page.locator('.toast').boundingBox()
    for (const sel of ['.g-after', '[data-back]']) {
      const b = await page.locator(sel).boundingBox()
      const apart = b.y >= toast.y + toast.height || b.x >= toast.x + toast.width || b.x + b.width <= toast.x
      expect(apart, `${sel} clear of the toast at ${vp.name}`).toBe(true)
    }
  })
}

test('Bengali: the garden speaks Bengali, years in Bengali numerals', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'garden', { lang: 'bn' })
  await expect(page.locator('.g-title')).toContainText('গাছ')
  await page.evaluate(() => window.__garden.hold(3000))
  await expect(page.locator('[data-future]')).toBeVisible({ timeout: 12_000 })
  await page.evaluate(() => { window.__garden.future() })
  await page.evaluate(() => { window.__garden.seek('full') })
  await expect(page.locator('[data-year]')).toHaveText('২০৩১')
  await page.waitForTimeout(300)
  await shot(page, 'garden-bn-future')
  expect(errors).toEqual([])
})

// ── Task 17: scenery answers like what it is, with payoffs ──
test('every piece of garden scenery declares its reaction, and answers without errors', async ({ page }) => {
  const errors = collectErrors(page)
  await page.setViewportSize({ width: 1920, height: 1080 }) // wide: the well, bench, cat, pot, door are on screen
  await open(page, 'garden')
  const missing = await page.evaluate(() =>
    [...document.querySelectorAll('.g-back .pk, .g-back .pk-swing, .g-back .g-lights, .g-fence .picket, [data-tag], [data-tree], [data-sapling]')]
      .filter((el) => !el.dataset.react)
      .map((el) => el.getAttribute('class')),
  )
  expect(missing).toEqual([])
  for (const sel of ['.g-back .fl .fl-head', '.g-back .wild', '.g-back .shroom', '.g-post .lantern', '.g-moon .moon-disc', '.g-back .rtree', '.g-well .g-water', '.g-back .g-bench', '.g-gift__box', '.g-cat', '.g-pot', '.g-pipe', '.g-door', '.g-lights .bulb-glow', '.picket[data-k="3"]']) {
    const b = await page.locator(sel).first().boundingBox()
    await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.5)
    await page.waitForTimeout(80)
  }
  await page.waitForTimeout(300)
  expect(errors).toEqual([])
})
