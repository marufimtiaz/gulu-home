import { expect, test } from '@playwright/test'
import { checkLayout, collectErrors, open, pressLatency, shot, VIEWPORTS } from './helpers.js'
import config from '../../src/content/config.js'

const FIVE = ['living', 'kitchen', 'garden', 'rooftop', 'desk']
const WALLS = config.empty.walls
const STARTERS = config.empty.starters

const rgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}
const herNotes = (n) => Array.from({ length: n }, (_, i) => ({ text: `plan number ${i + 1}`, who: 'her', at: 1_700_000_000_000 + i }))
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).empty)

async function paintWith(page, i) {
  await page.locator(`[data-swatch="${i}"]`).click()
  await expect(page.locator('[data-wall]')).toHaveCSS('background-color', rgb(WALLS[i]), { timeout: 8000 })
  await expect(page.locator('[data-input]')).toBeVisible({ timeout: 8000 })
}

test('locked until the other five are lit: back to the house with a gentle toast', async ({ page }) => {
  // remember every toast (it may have faded by the time a busy machine looks)
  await page.addInitScript(() => {
    window.__toasts = []
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('toast')) window.__toasts.push(n.textContent)
    }).observe(document, { childList: true, subtree: true })
  })
  await open(page, 'empty', { done: ['living'], expect: 'house' })
  await expect(page).toHaveURL(/#\/house$/)
  await expect.poll(() => page.evaluate(() => window.__toasts.join(' | '))).toContain('not yet')
})

test('bare room: pick a colour → roller paints the wall → complete; starters in his ink', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'empty', { done: FIVE })
  await expect(page.locator('[data-swatch]')).toHaveCount(WALLS.length)
  await expect(page.locator('[data-input]')).toBeHidden()
  await expect(page.locator('.scene[data-scene="empty"]')).not.toHaveAttribute('data-done', 'true')
  await page.waitForTimeout(300)
  await shot(page, 'empty-bare')

  await page.locator('[data-swatch="2"]').click()
  await page.waitForTimeout(700)
  await shot(page, 'empty-painting')
  await expect(page.locator('[data-wall]')).toHaveCSS('background-color', rgb(WALLS[2]), { timeout: 8000 })
  await expect(page.locator('.scene[data-scene="empty"]')).toHaveAttribute('data-done', 'true')
  const mine = page.locator('[data-note][data-who="me"]')
  await expect(mine).toHaveCount(STARTERS.length)
  await expect(mine.first()).toBeVisible()
  await expect(page.locator('[data-input]')).toBeVisible({ timeout: 8000 })
  await page.waitForTimeout(600)
  await shot(page, 'empty-painted')

  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')))
  expect(s.done.empty).toBe(true)
  expect(s.empty.wall).toBe(WALLS[2])
  expect(errors).toEqual([])
})

test('a note she writes lands on the wall in berry and survives a reload', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'empty', { done: FIVE })
  await paintWith(page, 0)
  await page.locator('[data-input]').fill('a trip with no plan')
  await page.locator('[data-add]').click()
  const hers = page.locator('[data-note][data-who="her"]')
  await expect(hers).toHaveCount(1)
  await expect(hers.first()).toContainText('a trip with no plan')
  await expect(page.locator('[data-input]')).toHaveValue('')
  // Enter submits too
  await page.locator('[data-input]').fill('dance in the kitchen at 2am')
  await page.locator('[data-input]').press('Enter')
  await expect(hers).toHaveCount(2)
  await page.waitForTimeout(1200)
  await shot(page, 'empty-notes')

  await page.reload()
  await expect(page.locator('.scene[data-scene="empty"]')).toBeVisible()
  await expect(page.locator('[data-wall]')).toHaveCSS('background-color', rgb(WALLS[0]))
  await expect(hers).toHaveCount(2)
  await expect(hers.nth(0)).toContainText('a trip with no plan')
  await expect(page.locator('[data-input]')).toBeVisible()
  expect(errors).toEqual([])
})

test('whitespace-only is refused with a shake; 150 chars are kept at 140', async ({ page }) => {
  await open(page, 'empty', { done: FIVE, wall: WALLS[1] })
  const input = page.locator('[data-input]')
  await input.fill('     ')
  await page.locator('[data-add]').click()
  await expect(page.locator('[data-write]')).toHaveAttribute('data-refused', '1')
  await expect(page.locator('[data-note][data-who="her"]')).toHaveCount(0)
  expect((await stored(page)).notes).toEqual([])

  const long = 'we will '.repeat(19) // 152 chars
  await input.evaluate((el, v) => (el.value = v), long) // bypass maxlength, as a paste might
  await page.locator('[data-add]').click()
  await expect(page.locator('[data-note][data-who="her"]')).toHaveCount(1)
  const notes = (await stored(page)).notes
  expect(notes).toHaveLength(1)
  expect(notes[0].text.length).toBeLessThanOrEqual(140)
  expect(await input.getAttribute('maxlength')).toBe('140')
})

test('an empty notes list shows only his starters', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'empty', { done: FIVE, wall: WALLS[3], notes: [] })
  await expect(page.locator('[data-note]')).toHaveCount(STARTERS.length)
  await expect(page.locator('[data-note][data-who="her"]')).toHaveCount(0)
  await expect(page.locator('[data-full]')).toBeHidden()
  await expect(page.locator('[data-add]')).toBeEnabled()
  expect(errors).toEqual([])
})

test('30 notes: the wall is full, writing is off, nothing overlaps', async ({ page }) => {
  const errors = collectErrors(page)
  const notes = herNotes(30)
  notes[7].text = 'x'.repeat(140)
  await open(page, 'empty', { done: [...FIVE, 'empty'], wall: WALLS[4], notes })
  await expect(page.locator('[data-note]')).toHaveCount(30 + STARTERS.length)
  await expect(page.locator('[data-full]')).toBeVisible()
  await expect(page.locator('[data-add]')).toBeDisabled()
  await expect(page.locator('[data-input]')).toBeDisabled()
  await page.waitForTimeout(300)
  await shot(page, 'empty-full')
  // every note sits inside the wall and no two overlap
  const boxes = await page.locator('[data-note] .e-note__text').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))
  const wall = await page.locator('[data-wall]').boundingBox()
  for (const b of boxes) {
    expect(b.left).toBeGreaterThanOrEqual(wall.x - 6)
    expect(b.right).toBeLessThanOrEqual(wall.x + wall.width + 6)
    expect(b.top).toBeGreaterThanOrEqual(wall.y - 6)
    expect(b.bottom).toBeLessThanOrEqual(wall.y + wall.height + 6)
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]
      const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      expect(ix <= 4 || iy <= 4, `notes ${i} and ${j} overlap`).toBe(true)
    }
  }
  // even the 140-char one can be read in full
  await page.locator('[data-note="10"]').click() // 3 starters + index 7
  await expect(page.locator('[data-read]')).toBeVisible()
  await expect(page.locator('[data-read-text]')).toHaveText('x'.repeat(140))
  await page.waitForTimeout(500)
  await shot(page, 'empty-read')
  await page.locator('[data-read]').click()
  await expect(page.locator('[data-read]')).toBeHidden()
  // the state refuses a 31st too
  const added = await page.evaluate(() => window.__home.state.addNote('one more', 'her'))
  expect(added).toBe(null)
  expect(errors).toEqual([])
})

test('Bengali: the marker line speaks Bengali', async ({ page }) => {
  await open(page, 'empty', { done: FIVE, wall: WALLS[0], lang: 'bn' })
  const ph = await page.locator('[data-input]').getAttribute('placeholder')
  expect(ph).toMatch(/[ঀ-৿]/)
  await expect(page.locator('.e-title')).toHaveText(/[ঀ-৿]/)
  await shot(page, 'empty-bn')
})

test('re-entering a finished room keeps the wall and notes and never un-completes', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'empty', { done: [...FIVE, 'empty'], wall: WALLS[1], notes: herNotes(2) })
  await expect(page.locator('[data-wall]')).toHaveCSS('background-color', rgb(WALLS[1]))
  await expect(page.locator('[data-note][data-who="her"]')).toHaveCount(2)
  // repaint: roller again, the notes stay
  await page.locator('[data-swatch="3"]').click()
  await expect(page.locator('[data-wall]')).toHaveCSS('background-color', rgb(WALLS[3]), { timeout: 8000 })
  await expect(page.locator('[data-note][data-who="her"]')).toHaveCount(2)
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')))
  expect(s.done.empty).toBe(true)
  expect(s.empty.wall).toBe(WALLS[3])
  // leaving cleans up the debug hook
  await page.locator('.chip--home').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await expect.poll(() => page.evaluate(() => typeof window.__empty)).toBe('undefined')
  expect(errors).toEqual([])
})

test('phone keyboard: the marker line stays visible above it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'empty', { done: FIVE, wall: WALLS[2], notes: herNotes(4) })
  const input = page.locator('[data-input]')
  await input.focus()
  // the keyboard takes ~45% of the screen: the visible viewport shrinks
  await page.setViewportSize({ width: 390, height: 460 })
  await page.waitForTimeout(500)
  await shot(page, 'empty-keyboard')
  for (const sel of ['[data-input]', '[data-add]']) {
    const b = await page.locator(sel).boundingBox()
    expect(b.y, sel).toBeGreaterThanOrEqual(0)
    expect(b.y + b.height, `${sel} bottom above the keyboard`).toBeLessThanOrEqual(460)
    expect(b.height).toBeGreaterThanOrEqual(44)
  }
  // she can still write, and the new note is on the visible wall
  await input.fill('learn the harmonium')
  await input.press('Enter')
  const note = page.locator('[data-note][data-who="her"]').last()
  await expect(note).toContainText('learn the harmonium')
  await expect(input).toBeFocused()
  await page.waitForTimeout(1500)
  const nb = await note.boundingBox()
  expect(nb.y + nb.height).toBeLessThanOrEqual(460)
  // keyboard closes
  await page.setViewportSize({ width: 390, height: 844 })
  await input.blur()
  await page.waitForTimeout(400)
  await expect(page.locator('[data-swatch="0"]')).toBeVisible()
})

/** Any element in the room scrolled off its origin (focus / scrollIntoView shifting the layout). */
const scrolledBits = (page) =>
  page.evaluate(() =>
    [document.scrollingElement, ...document.querySelectorAll('.scene--empty, .scene--empty *')]
      .filter((el) => el.scrollLeft || el.scrollTop)
      .map((el) => `${el.className || el.tagName} ${el.scrollLeft},${el.scrollTop}`),
  )

/**
 * A phone scrolls every scrollable ancestor of a focused field to keep it in view while the
 * keyboard reflows the room. Do the same: if any of them can scroll, the room shifts and stays shifted.
 */
const shoveIntoView = (page) =>
  page.evaluate(() => {
    const input = document.querySelector('[data-input]')
    input.scrollIntoView({ block: 'end', inline: 'end' })
    for (let el = input.parentElement; el; el = el.parentElement) {
      el.scrollLeft = 60
      el.scrollTop = 60
    }
  })

test('after a note is added with the keyboard up, the room returns to full size', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'sets its own viewport')
  await page.setViewportSize({ width: 412, height: 915 })
  await open(page, 'empty', { done: FIVE, wall: WALLS[3], notes: herNotes(3) })
  await page.waitForTimeout(800)
  const full = await page.locator('[data-wall]').boundingBox()
  const input = page.locator('[data-input]')
  await input.focus()
  await page.setViewportSize({ width: 412, height: 480 }) // keyboard up
  await page.waitForTimeout(60)
  await shoveIntoView(page) // mid-reflow, while the notes are still moving
  expect(await scrolledBits(page), 'nothing in the room scrolls while the keyboard is up').toEqual([])
  await page.waitForTimeout(500)
  await input.fill('a picnic on the roof')
  await input.press('Enter')
  await expect(page.locator('[data-note][data-who="her"]').last()).toContainText('a picnic on the roof')
  await page.waitForTimeout(1200)
  await shoveIntoView(page)
  expect(await scrolledBits(page), 'nothing scrolls after the note lands').toEqual([])
  for (const sel of ['[data-input]', '[data-add]']) await expect(page.locator(sel), `${sel} whole, above the keyboard`).toBeInViewport({ ratio: 1 })
  // the keyboard goes down (the field may still be focused)
  await page.setViewportSize({ width: 412, height: 915 })
  await checkLayout(page, ['[data-input]', '[data-add]'], 'empty-after-keyboard')
  expect(await scrolledBits(page)).toEqual([])
  await expect(page.locator('.empty')).not.toHaveClass(/empty--typing/)
  const wall = await page.locator('[data-wall]').boundingBox()
  expect(Math.abs(wall.x - full.x), 'wall back in place').toBeLessThanOrEqual(1)
  expect(Math.abs(wall.width - full.width), 'wall full width again').toBeLessThanOrEqual(1)
  // (its top follows the prompt line above it, which may wrap differently; the bottom must not move)
  expect(Math.abs(wall.y + wall.height - (full.y + full.height)), 'wall full height again').toBeLessThanOrEqual(2)
  // and after blur
  await input.blur()
  await checkLayout(page, ['[data-input]', '[data-add]', '[data-swatch="0"]'])
  expect(await scrolledBits(page)).toEqual([])
})

test('the hearts for a new note burst from the marker, not over the words', async ({ page }) => {
  await open(page, 'empty', { done: FIVE, wall: WALLS[1], notes: herNotes(2) })
  // remember where each heart burst starts
  await page.evaluate(() => {
    window.__bursts = []
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) if (n.querySelector?.('.heart')) window.__bursts.push(n.style.transform)
    }).observe(document.getElementById('fx-layer'), { childList: true })
  })
  await page.locator('[data-input]').fill('stargazing from the roof')
  await page.locator('[data-add]').click()
  await expect.poll(() => page.evaluate(() => window.__bursts.length), { timeout: 6000 }).toBeGreaterThan(0)
  const [x, y] = (await page.evaluate(() => window.__bursts[0])).match(/-?[\d.]+/g).map(Number)
  const pen = await page.locator('[data-add]').boundingBox()
  expect(x).toBeGreaterThanOrEqual(pen.x)
  expect(x).toBeLessThanOrEqual(pen.x + pen.width)
  expect(y).toBeGreaterThanOrEqual(pen.y)
  expect(y).toBeLessThanOrEqual(pen.y + pen.height)
})

test('reduced motion paints and writes', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const errors = collectErrors(page)
  await open(page, 'empty', { done: FIVE })
  const t0 = Date.now()
  await paintWith(page, 1)
  expect(Date.now() - t0).toBeLessThan(8000) // generous: the machine is shared
  await page.locator('[data-input]').fill('slow mornings')
  await page.locator('[data-add]').click()
  await expect(page.locator('[data-note][data-who="her"]')).toContainText('slow mornings')
  expect(errors).toEqual([])
  await context.close()
})

test('idle: the paint cans get a nudge; then the marker line', async ({ page }) => {
  await open(page, 'empty', { done: FIVE })
  await expect(page.locator('[data-swatch="0"]')).toHaveClass(/nudge/, { timeout: 7000 })
  await paintWith(page, 2)
  await expect(page.locator('[data-swatch].nudge')).toHaveCount(0)
  await expect(page.locator('[data-write]')).toHaveClass(/nudge/, { timeout: 8000 })
})

test('press feedback lands within 100 ms', async ({ page }) => {
  await open(page, 'empty', { done: FIVE })
  const ms = await pressLatency(page, '[data-swatch="1"]')
  expect(ms).toBeLessThan(100)
})

for (const vp of VIEWPORTS) {
  test(`fits at ${vp.name}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'viewport loop runs once')
    test.setTimeout(60_000)
    const errors = collectErrors(page)
    await page.setViewportSize(vp)
    await open(page, 'empty', { done: FIVE })
    await checkLayout(page, ['[data-swatch="0"]', '[data-swatch="2"]', '[data-swatch="4"]', '.chip--home'], `empty-${vp.name}-bare`)
    await page.evaluate(() => window.__empty.paint(3))
    // painting completes the room: the "light came on" toast (top, under the chips) must not
    // cover the new prompt, the list heading or the starter notes being written
    await expect(page.locator('.toast')).toBeVisible({ timeout: 8000 })
    const toast = await page.locator('.toast').boundingBox()
    for (const sel of ['[data-prompt]', '[data-heading]', '[data-note]']) {
      const b = await page.locator(sel).first().boundingBox()
      const apart = b.y >= toast.y + toast.height - 1 || b.x >= toast.x + toast.width || b.x + b.width <= toast.x
      expect(apart, `${sel} clear of the toast at ${vp.name}`).toBe(true)
    }
    await expect(page.locator('[data-input]')).toBeVisible({ timeout: 8000 })
    await page.waitForTimeout(2600) // starters written, form landed
    await checkLayout(page, ['[data-input]', '[data-add]', '[data-swatch="0"]', '[data-swatch="4"]'], `empty-${vp.name}-painted`)
    for (const text of ['a trip with no plan at all', 'name the plants', 'a balcony full of chillies and one stubborn rose']) {
      await page.evaluate((t) => window.__empty.add(t), text)
    }
    await page.waitForTimeout(2500)
    await checkLayout(page, ['[data-input]', '[data-add]'], `empty-${vp.name}-notes`)
    // notes stay inside the wall at every size
    const wall = await page.locator('[data-wall]').boundingBox()
    const boxes = await page.locator('[data-note] .e-note__text').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))
    for (const b of boxes) {
      expect(b.right, `note inside wall at ${vp.name}`).toBeLessThanOrEqual(wall.x + wall.width + 6)
      expect(b.bottom, `note inside wall at ${vp.name}`).toBeLessThanOrEqual(wall.y + wall.height + 6)
    }
    expect(errors).toEqual([])
  })
}

// ── Task 17: the room answers like what it is ──
test('every thing in the room declares its reaction, and answers without errors', async ({ page }) => {
  const errors = collectErrors(page)
  await page.setViewportSize({ width: 1280, height: 800 }) // the paint tray shows from 560 px wide
  await open(page, 'empty', { done: FIVE })
  for (const sel of ['[data-bulb]', '[data-ladder]', '[data-box]', '[data-tray]', '[data-wall]', '.e-floor']) {
    await expect(page.locator(sel), sel).toHaveAttribute('data-react', /.+/)
    const b = await page.locator(sel).boundingBox()
    await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * (sel === '[data-wall]' ? 0.7 : sel === '.e-floor' ? 0.92 : 0.6))
    await page.waitForTimeout(80)
  }
  await page.waitForTimeout(300)
  expect(errors).toEqual([])
})

test('the moving box opens on one of her nicknames — a different one each time', async ({ page }) => {
  await open(page, 'empty', { done: FIVE })
  const box = await page.locator('[data-box]').boundingBox()
  await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.6)
  const slip = page.locator('.x-slip')
  await expect(slip).toContainText('Gulu')
  await page.waitForTimeout(400)
  await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.6)
  await expect(slip).toContainText('Puchu')
  await expect(slip).toContainText('rhymes with Gulu')
})

test('the bulb swings (and the light swings with it); the third tap puts the lights out — her call, Ledu', async ({ page }) => {
  await open(page, 'empty', { done: FIVE })
  const tap = async () => {
    const b = await page.locator('[data-bulb] .b-glass').boundingBox()
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  }
  await tap()
  await expect.poll(() => page.locator('.empty').evaluate((e) => Math.abs(Number(e.style.getPropertyValue('--shx') || 0)))).toBeGreaterThan(2)
  await page.waitForTimeout(300)
  await tap()
  await page.waitForTimeout(300)
  await tap()
  await expect(page.locator('[data-say]')).toContainText('Ledu')
  await expect.poll(() => page.locator('[data-dark]').evaluate((e) => Number(getComputedStyle(e).opacity))).toBeGreaterThan(0.5)
  // and back on by itself
  await expect.poll(() => page.locator('[data-dark]').evaluate((e) => Number(getComputedStyle(e).opacity)), { timeout: 5000 }).toBeLessThan(0.05)
})

test('knock knock on the bare wall', async ({ page }) => {
  await open(page, 'empty', { done: FIVE })
  const w = await page.locator('[data-wall]').boundingBox()
  for (let i = 0; i < 3; i++) {
    await page.mouse.click(w.x + w.width * 0.3, w.y + w.height * 0.7)
    await page.waitForTimeout(150)
  }
  await expect(page.locator('[data-say]')).toContainText('Gu-een')
})
