import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { checkLayout, collectErrors, open, pressLatency, ROOMS, shot, VIEWPORTS } from './helpers.js'
import config from '../../src/content/config.js'

const ALL = [...ROOMS, 'finale']
const card = config.card
const stage = (page) => page.locator('.cs')
const finish = (page) => page.evaluate(() => window.__card.finish())

async function toGate(page) {
  await page.locator('[data-seal]').click({ force: true }) // it wobbles, so it is never "stable"
  await expect(stage(page)).toHaveAttribute('data-stage', 'gate', { timeout: 15_000 })
}
async function toOpen(page, { fast = false } = {}) {
  if (fast) {
    await page.evaluate(() => window.__card.crack())
    await finish(page)
    await expect(stage(page)).toHaveAttribute('data-stage', 'gate')
    await page.evaluate(() => window.__card.open())
    await finish(page)
  } else {
    await toGate(page)
    await page.locator('[data-gate="left"]').click({ force: true }) // the doors breathe
    await page.locator('[data-gate="right"]').click({ force: true })
  }
  await expect(stage(page)).toHaveAttribute('data-stage', 'open', { timeout: 15_000 })
  if (fast) await finish(page)
  await expect(page.locator('[data-save]')).toBeVisible({ timeout: 15_000 })
}

test('the card is guarded behind the finale', async ({ page }) => {
  // remember every toast, however briefly it shows
  await page.addInitScript(() => {
    window.__toasts = []
    new MutationObserver(() => document.querySelectorAll('.toast').forEach((t) => window.__toasts.push(t.textContent))).observe(document, { childList: true, subtree: true })
  })
  await open(page, 'card', { done: ROOMS, expect: 'house' })
  await expect(page).toHaveURL(/#\/house$/)
  await expect(page.locator('.scene[data-scene="card"]')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => window.__toasts.join(' '))).toContain('this one comes last')
})

test('seal → doors → the card, with the content on it', async ({ page }) => {
  test.setTimeout(90_000)
  const errors = collectErrors(page)
  await open(page, 'card', { done: ALL })
  await expect(page.locator('[data-envelope]')).toBeVisible()
  await expect(page.locator('[data-seal]')).toBeVisible()
  await page.waitForTimeout(800)
  await shot(page, 'card-envelope')

  await toGate(page)
  await expect(page.locator('[data-envelope]')).toBeHidden()
  await expect(page.locator('[data-gate="left"]')).toBeVisible()
  await expect(page.locator('[data-gate="right"]')).toBeVisible()
  await page.waitForTimeout(400)
  await shot(page, 'card-gate')
  await finish(page) // let the doors' idle "breathing" settle so the drag starts from rest

  // drag the right door outward 120 px, tap the left one
  const r = await page.locator('[data-gate="right"]').boundingBox()
  const y = r.y + r.height / 2
  await page.mouse.move(r.x + r.width * 0.4, y)
  await page.mouse.down()
  await page.mouse.move(r.x + r.width * 0.4 + 120, y, { steps: 10 })
  await page.mouse.up()
  await expect(page.locator('[data-gate="right"]')).toHaveClass(/open/)
  await page.locator('[data-gate="left"]').click({ force: true })
  await expect(page.locator('[data-gate="left"]')).toHaveClass(/open/)
  await expect(stage(page)).toHaveAttribute('data-stage', 'open', { timeout: 15_000 })
  await expect(page.locator('[data-card-face]')).toBeVisible()
  await expect(page.locator('[data-save]')).toBeVisible({ timeout: 15_000 })

  const face = page.locator('[data-card-face]')
  await expect(page.locator('[data-names]')).toContainText(card.groom)
  await expect(page.locator('[data-names]')).toContainText(card.bride)
  await expect(page.locator('[data-names]')).toContainText(card.groomFull)
  await expect(page.locator('[data-names]')).toContainText(card.brideFull)
  await expect(face).toContainText(card.titleBn)
  await expect(face).toContainText(card.titleEn)
  await expect(face).toContainText(card.subtitleEn)
  await expect(face).toContainText(card.hosts)
  await expect(face).toContainText(card.brideOf)
  await expect(page.locator('[data-details]')).toContainText('23 October 2026')
  await expect(page.locator('[data-details]')).toContainText('২৩ অক্টোবর ২০২৬')
  await expect(page.locator('[data-details]')).toContainText(card.time)
  await expect(page.locator('[data-details]')).toContainText(card.venue)
  const bism = page.locator('.cf-bism')
  await expect(bism).toHaveText(card.invocation)
  await expect(bism).toHaveAttribute('dir', 'rtl')
  await expect(bism).toHaveAttribute('aria-label', card.invocationLabel)
  // nulls are simply not rendered; no dashes, no "not printed" framing
  await expect(page.locator('.cf-compl')).toHaveCount(0)
  await expect(page.locator('[data-map]')).toHaveCount(0)
  await expect(page.locator('[data-note]')).toHaveCount(0)
  await expect(face).not.toContainText('——')
  await expect(page.locator('.scene--card')).not.toContainText(/print/i)
  await page.waitForTimeout(600)
  await shot(page, 'card-face')

  // the card is not a room
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')))
  expect(s.done.card).toBeUndefined()
  expect(errors).toEqual([])
})

test('flip shows the back, and back again', async ({ page }) => {
  test.setTimeout(60_000)
  await open(page, 'card', { done: ALL })
  await toOpen(page, { fast: true })
  await expect(page.locator('[data-card-back]')).toBeHidden()
  await page.locator('[data-flip]').click()
  await expect(page.locator('[data-card-back]')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[data-card-face]')).toBeHidden({ timeout: 10_000 })
  await expect(page.locator('[data-card-back]')).toContainText(card.groom)
  await page.waitForTimeout(400)
  await shot(page, 'card-back')
  await page.locator('[data-flip]').click()
  await expect(page.locator('[data-card-face]')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[data-card-back]')).toBeHidden({ timeout: 10_000 })
})

test('save downloads a 1080 × 1512 PNG of the card face', async ({ page }, info) => {
  test.setTimeout(90_000)
  const errors = collectErrors(page)
  await open(page, 'card', { done: ALL })
  await toOpen(page, { fast: true })
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 45_000 }), page.locator('[data-save]').click()])
  expect(download.suggestedFilename()).toMatch(/\.png$/)
  const buf = readFileSync(await download.path())
  expect(buf.subarray(1, 4).toString()).toBe('PNG')
  const w = buf.readUInt32BE(16)
  const h = buf.readUInt32BE(20)
  expect(w).toBeGreaterThanOrEqual(1080)
  expect(h).toBe(Math.round((w * 7) / 5))
  expect(buf.length).toBeGreaterThan(150_000) // a real, detailed render — not a blank canvas
  const dir = `test-results/shots/${info.project.name}`
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/card-export.png`, buf)
  await expect(page.locator('[data-save]')).toHaveText(/saved/)
  expect(errors).toEqual([])
})

test('Bengali: the card stays bilingual, only the UI changes', async ({ browser }) => {
  test.setTimeout(90_000)
  const text = {}
  for (const lang of ['en', 'bn']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await open(page, 'card', { done: ALL, lang })
    await toOpen(page, { fast: true })
    text[lang] = await page.locator('[data-card-face]').innerText()
    if (lang === 'bn') {
      await expect(page.locator('[data-flip]')).toHaveText('কার্ডের পেছন')
      await expect(page.locator('[data-save]')).toHaveText('কার্ডটা রেখে দাও')
      await shot(page, 'card-face-bn')
    }
    await context.close()
  }
  expect(text.bn).toBe(text.en)
})

test('the type never overflows or collides', async ({ page }) => {
  await open(page, 'card', { done: ALL })
  const problems = await page.evaluate(() => {
    const out = []
    const face = document.querySelector('[data-card-face]')
    const fr = face.getBoundingClientRect()
    const k = fr.width / face.offsetWidth // screen px per design px
    const inner = { l: fr.left + 15.5 * k, r: fr.right - 15.5 * k, t: fr.top + 15.5 * k, b: fr.bottom - 15.5 * k }
    const texts = [...face.querySelectorAll('.cf-body p, .cf-body h1, .cf-body dt, .cf-body dd')]
    for (const el of texts) {
      if (el.scrollWidth > el.clientWidth + 1) out.push(`overflows: ${el.className}`)
      const r = el.getBoundingClientRect()
      if (r.left < inner.l || r.right > inner.r || r.top < inner.t || r.bottom > inner.b) out.push(`outside the frame: ${el.className}`)
    }
    const groups = [...face.querySelector('.cf-body').children].map((g) => [g.className.baseVal ?? g.className, g.getBoundingClientRect()])
    for (let i = 1; i < groups.length; i++) {
      const gap = (groups[i][1].top - groups[i - 1][1].bottom) / k
      if (gap < 3) out.push(`${groups[i - 1][0]} / ${groups[i][0]} gap ${gap.toFixed(1)}`)
    }
    // the bride's and groom's columns, the date/time/venue columns: no overlaps
    for (const sel of ['.cf-couple__full > div', '.cf-when__item']) {
      const rs = [...face.querySelectorAll(sel)].map((e) => e.getBoundingClientRect())
      for (let i = 1; i < rs.length; i++) if (rs[i].left < rs[i - 1].right - 0.5) out.push(`${sel} overlap`)
    }
    return out
  })
  expect(problems).toEqual([])
})

test('tap the card to look closer, tap again to step back', async ({ page }) => {
  test.setTimeout(60_000)
  await open(page, 'card', { done: ALL })
  await toOpen(page, { fast: true })
  const f = await page.locator('[data-names]').boundingBox()
  await page.mouse.click(f.x + f.width / 2, f.y + f.height / 2)
  await expect(stage(page)).toHaveClass(/cs--zoomed/)
  await page.waitForTimeout(700)
  await shot(page, 'card-zoom')
  await page.mouse.click(f.x + f.width / 2, f.y + f.height / 2)
  await expect(stage(page)).not.toHaveClass(/cs--zoomed/)
})

test('idle nudges the seal; touching stops it', async ({ page }) => {
  await open(page, 'card', { done: ALL })
  await expect(page.locator('[data-seal]')).toHaveClass(/nudge/, { timeout: 8000 })
  await page.mouse.click(5, 400)
  await expect(page.locator('[data-seal]')).not.toHaveClass(/nudge/)
})

test('press feedback lands within 100 ms', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'mouse-driven measurement runs once')
  test.setTimeout(60_000)
  await open(page, 'card', { done: ALL })
  await toOpen(page, { fast: true })
  // pressLatency() times from when its listener is installed, so press right after it starts
  // (retrying until it is listening). Best of five: the test machine is shared.
  const box = await page.locator('[data-save]').boundingBox()
  const samples = []
  for (let i = 0; i < 16 && samples.length < 5; i++) {
    // a fresh probe each time (a probe that missed its press is simply ignored)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2) // where the helper will point
    // the helper needs ~3 round trips (box, move, evaluate) before it listens: wait about that
    const t0 = Date.now()
    await page.evaluate(() => 0)
    const rt = Date.now() - t0
    const pending = pressLatency(page, '[data-save]')
    await page.waitForTimeout(Math.min(150, rt * (2.6 + (i % 4) * 0.5)))
    await page.mouse.down()
    const ms = await Promise.race([pending, page.waitForTimeout(400).then(() => null)])
    await page.mouse.move(2, 2) // leave without releasing on it: no save
    await page.mouse.up()
    if (ms !== null) samples.push(ms)
    await page.waitForTimeout(900) // let the button spring fully back before the next probe
  }
  expect(Math.min(...samples)).toBeLessThan(100)
})

test('re-entering starts at the envelope again and cleans up after itself', async ({ page }) => {
  test.setTimeout(60_000)
  const errors = collectErrors(page)
  await open(page, 'card', { done: ALL })
  await toOpen(page, { fast: true })
  await page.locator('.chip--home').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await expect.poll(() => page.evaluate(() => typeof window.__card)).toBe('undefined')
  await page.evaluate(() => window.__home.go('card'))
  await expect(stage(page)).toHaveAttribute('data-stage', 'envelope')
  await expect(page.locator('[data-seal]')).toBeVisible()
  expect(errors).toEqual([])
})

test('reduced motion: static foil, the flow still works', async ({ browser }) => {
  test.setTimeout(60_000)
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const errors = collectErrors(page)
  await open(page, 'card', { done: ALL })
  await toOpen(page)
  const fx = () => page.evaluate(() => getComputedStyle(document.querySelector('.cs')).getPropertyValue('--fx').trim())
  const before = await fx()
  await page.mouse.move(20, 100)
  await page.mouse.move(370, 700, { steps: 8 })
  await page.waitForTimeout(500)
  expect(await fx()).toBe(before)
  await page.locator('[data-flip]').click()
  await expect(page.locator('[data-card-back]')).toBeVisible()
  expect(errors).toEqual([])
  await context.close()
})

// ── responsive: every stage, every size ──
for (const vp of VIEWPORTS) {
  test(`card fits at ${vp.name}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'viewport loop runs once')
    test.setTimeout(90_000)
    const errors = collectErrors(page)
    await page.setViewportSize(vp)
    await open(page, 'card', { done: ALL })
    await page.waitForTimeout(800)
    await checkLayout(page, ['[data-seal]', '.chip--home', '.chip--lang', '.chip--sound'], `card-${vp.name}-envelope`)
    await page.evaluate(() => window.__card.crack())
    await finish(page)
    await expect(stage(page)).toHaveAttribute('data-stage', 'gate')
    await checkLayout(page, ['[data-gate="left"]', '[data-gate="right"]'], `card-${vp.name}-gate`)
    await page.evaluate(() => window.__card.open())
    await finish(page)
    await finish(page)
    await expect(stage(page)).toHaveAttribute('data-stage', 'open')
    await checkLayout(page, ['[data-flip]', '[data-save]', '[data-card-face]'], `card-${vp.name}-face`)
    // the open doors, when shown beside the card, stay on screen and clear of the chips
    const doors = await page.locator('[data-gate]').evaluateAll((els) => els.filter((e) => getComputedStyle(e).visibility !== 'hidden').map((e) => e.getBoundingClientRect().toJSON()))
    for (const d of doors) {
      expect(d.left).toBeGreaterThanOrEqual(-1)
      expect(d.right).toBeLessThanOrEqual(vp.width + 1)
    }
    // controls never overlap the card
    const face = await page.locator('[data-card-face]').boundingBox()
    for (const sel of ['[data-flip]', '[data-save]']) {
      const b = await page.locator(sel).boundingBox()
      const apart = b.y >= face.y + face.height - 1 || b.x >= face.x + face.width - 1
      expect(apart, `${sel} clear of the card at ${vp.name}`).toBe(true)
    }
    await page.evaluate(() => window.__card.flip())
    await finish(page)
    await checkLayout(page, ['[data-flip]', '[data-save]'], `card-${vp.name}-back`)
    expect(errors).toEqual([])
  })
}
