import { expect, test } from '@playwright/test'
import { collectErrors, open, shot, VIEWPORTS } from './helpers.js'
import config from '../../src/content/config.js'

const PS = config.letter.ps.map((s) => s.replaceAll('{nickname}', config.nickname))
/** Screenshot-only viewport review (the owner looks at these). */
const look = async (page, name) => {
  await page.waitForTimeout(350)
  if (name) await shot(page, name)
}
const on = (page) => page.locator('[data-letter] .w--on').count()

async function center(page, sel) {
  const b = await page.locator(sel).boundingBox()
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height }
}

/** Drag the chain's bead straight down by `px`. */
async function pullChain(page, px = 40) {
  const b = await page.locator('[data-chain]').boundingBox()
  const x = b.x + b.width / 2
  const y = b.y + b.height - 14
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + px, { steps: 8 })
  await page.mouse.up()
}

async function openLetter(page) {
  await pullChain(page)
  await expect(page.locator('[data-lamp]')).toHaveClass(/on/)
  await expect.poll(() => page.evaluate(() => window.__desk.phase())).toBe('lit')
  await page.locator('[data-envelope]').click()
  await expect(page.locator('[data-letter]')).toBeVisible()
}

test('dark room → pull the chain → the lamp comes on', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'desk')
  await expect(page.locator('[data-lamp]')).not.toHaveClass(/on/)
  await expect(page.locator('[data-letter]')).toBeHidden()
  await page.waitForTimeout(400)
  await shot(page, 'desk-dark')
  await pullChain(page, 40)
  await expect(page.locator('[data-lamp]')).toHaveClass(/on/)
  await expect(page.locator('[data-envelope]')).toBeVisible()
  await page.waitForTimeout(1300)
  await shot(page, 'desk-lit')
  expect(errors).toEqual([])
})

test('a short pull springs back and leaves the room dark', async ({ page }) => {
  await open(page, 'desk')
  await pullChain(page, 12)
  await page.waitForTimeout(300)
  await expect(page.locator('[data-lamp]')).not.toHaveClass(/on/)
  // and the envelope can't be read in the dark
  await page.locator('[data-envelope]').click()
  await expect(page.locator('[data-letter]')).toBeHidden()
})

test('the envelope opens and the letter writes itself, word by word', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'desk')
  await openLetter(page)
  await expect(page.locator('[data-nib] svg')).toBeVisible()
  await expect.poll(() => on(page), { timeout: 5000 }).toBeGreaterThanOrEqual(3)
  const a = await on(page)
  await page.waitForTimeout(900)
  const b = await on(page)
  expect(b).toBeGreaterThan(a) // still writing, not dumped all at once
  const total = await page.locator('[data-letter] .l-p .w').count()
  expect(b).toBeLessThan(total)
  await expect(page.locator('[data-letter] [data-hello]')).toHaveText(config.letter.hello.replace('{nickname}', config.nickname))
  await page.waitForTimeout(1500)
  await shot(page, 'desk-writing')
  expect(errors).toEqual([])
})

test('tap hurries the paragraph; hold shows it all and completes', async ({ page }) => {
  await open(page, 'desk')
  await openLetter(page)
  await expect.poll(() => page.locator('.l-p').first().locator('.w--on').count(), { timeout: 6000 }).toBeGreaterThan(1)
  const first = page.locator('.l-p').first()
  const words = await first.locator('.w').count()
  const before = await first.locator('.w--on').count()
  expect(before).toBeLessThan(words)
  const box = await center(page, '[data-scroll]')
  await page.mouse.click(box.x, box.y)
  await expect.poll(() => first.locator('.w--on').count(), { timeout: 600 }).toBe(words) // the count jumps
  await expect(page.locator('.scene--desk')).not.toHaveAttribute('data-done', 'true')

  // hold → everything
  await page.mouse.move(box.x, box.y)
  await page.mouse.down()
  await page.waitForTimeout(750)
  await page.mouse.up()
  const all = await page.locator('[data-letter] .w').count()
  await expect.poll(() => on(page), { timeout: 2000 }).toBe(all)
  await expect(page.locator('.l-sig')).toHaveText(config.myName)
  await expect(page.locator('.l-off')).toBeVisible()
  await expect(page.locator('.scene--desk')).toHaveAttribute('data-done', 'true', { timeout: 4000 })
  await expect(page.locator('[data-heart]')).toBeVisible()
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.desk)
  expect(done).toBe(true)
})

test('the heart writes one P.S. per press; the last one stays', async ({ page }) => {
  test.setTimeout(60_000)
  const errors = collectErrors(page)
  await open(page, 'desk')
  await page.evaluate(() => window.__desk.skip())
  await expect(page.locator('.scene--desk')).toHaveAttribute('data-done', 'true', { timeout: 10_000 })
  const heart = page.locator('[data-heart]')
  for (let i = 0; i < 3; i++) await heart.click()
  await expect(page.locator('[data-ps]')).toHaveCount(3)
  await expect(page.locator('[data-ps]').last()).toHaveText(PS[2])
  await page.waitForTimeout(900)
  await shot(page, 'desk-ps')
  for (let i = 0; i < 10; i++) await heart.click()
  await expect(page.locator('[data-ps]')).toHaveCount(PS.length)
  await expect(page.locator('[data-ps]').last()).toHaveText(PS.at(-1))
  await page.waitForTimeout(600)
  await shot(page, 'desk-ps-all')
  await page.locator('[data-back]').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  expect(errors).toEqual([])
})

test('Bengali: the hello line is in Bengali, in Atma', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'desk', { lang: 'bn' })
  await expect(page.locator('[data-prompt]')).toContainText('অন্ধকার')
  await page.evaluate(() => window.__desk.skip())
  await expect(page.locator('[data-hello]')).toContainText('গুলু')
  const font = await page.locator('[data-body]').evaluate((el) => getComputedStyle(el).fontFamily)
  expect(font).toMatch(/Atma/)
  await expect(page.locator('.scene--desk')).toHaveAttribute('data-done', 'true', { timeout: 10_000 })
  await page.locator('[data-heart]').click()
  await page.waitForTimeout(1200)
  await shot(page, 'desk-bn')
  expect(errors).toEqual([])
})

test('re-entering a finished desk starts dark again and stays done', async ({ page }) => {
  await open(page, 'desk', { done: ['desk'] })
  await expect(page.locator('[data-lamp]')).not.toHaveClass(/on/)
  await expect(page.locator('[data-chain]')).toBeVisible()
  await expect(page.locator('[data-letter]')).toBeHidden()
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.desk)
  expect(done).toBe(true)
})

test('tapping the chain also pulls it; keyboard works', async ({ page }) => {
  await open(page, 'desk')
  await page.locator('[data-chain]').click()
  await expect(page.locator('[data-lamp]')).toHaveClass(/on/)
  await expect.poll(() => page.evaluate(() => window.__desk.phase())).toBe('lit')
  await page.locator('[data-envelope]').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-letter]')).toBeVisible()
})

test('a long letter scrolls inside the paper, never the page', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await open(page, 'desk')
  await page.evaluate(() => window.__desk.skip())
  await expect(page.locator('.scene--desk')).toHaveAttribute('data-done', 'true', { timeout: 10_000 })
  await page.waitForTimeout(1800) // let "read it all" glide to the bottom
  const m = await page.locator('[data-scroll]').evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight, top: el.scrollTop }))
  expect(m.sh).toBeGreaterThan(m.ch) // it really is long here
  expect(m.top).toBeGreaterThan(0) // and we followed the pen down
  const pageScrolls = await page.evaluate(() => document.scrollingElement.scrollHeight > innerHeight + 1)
  expect(pageScrolls).toBe(false)
  await expect(page.locator('[data-heart]')).toBeInViewport()
})

test('reduced motion: the whole letter still arrives', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors = collectErrors(page)
  await open(page, 'desk')
  await pullChain(page)
  await expect.poll(() => page.evaluate(() => window.__desk.phase())).toBe('lit')
  await page.locator('[data-envelope]').click()
  await expect(page.locator('.scene--desk')).toHaveAttribute('data-done', 'true', { timeout: 20000 })
  expect(errors).toEqual([])
})

test('leaving mid-letter cleans up', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'desk')
  await openLetter(page)
  await page.waitForTimeout(600)
  await page.locator('.chip--home').click()
  await expect(page.locator('.scene[data-scene="house"]')).toBeVisible()
  await expect.poll(() => page.evaluate(() => typeof window.__desk)).toBe('undefined')
  await page.waitForTimeout(500)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('our-home')).done.desk)).toBe(false)
  expect(errors).toEqual([])
})

/**
 * Where each written line's baseline falls relative to the nearest rule (px; 0 = sitting on it).
 * A zero-size inline-block after a block's last word sits on that line's baseline; the rules are the
 * body's background tiles (bottom edge every line-height from the content box, shifted by --rule-y).
 */
async function ruleGaps(page) {
  return page.evaluate(() => {
    const body = document.querySelector('[data-body]')
    const cs = getComputedStyle(body)
    const lh = parseFloat(cs.lineHeight)
    const fs = parseFloat(cs.fontSize)
    const top = body.getBoundingClientRect().top + parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth)
    const ruleY = parseFloat(cs.backgroundPositionY) // px, set by the scene
    const out = []
    for (const el of body.querySelectorAll('.l-hello, .l-p, .l-off, .l-sig, .l-ps__line')) {
      if (!el.textContent.trim()) continue
      const i = document.createElement('i')
      i.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
      el.append(i)
      const y = i.getBoundingClientRect().top - top // the baseline, in the content box
      i.remove()
      const rule = ruleY + lh - 1.5 // the first rule's top edge
      let d = (y - rule) % lh
      if (d > lh / 2) d -= lh
      if (d < -lh / 2) d += lh
      out.push({ cls: el.className, gap: d + fs * 0.07 }) // the rule sits a hair under the baseline
    }
    return out
  })
}

for (const lang of ['en', 'bn']) {
  test(`every line sits on a rule (${lang})`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'viewport loop runs once')
    test.setTimeout(120_000)
    for (const vp of [VIEWPORTS[0], VIEWPORTS[1], VIEWPORTS[3], VIEWPORTS[4], VIEWPORTS[6]]) {
      await page.setViewportSize(vp)
      await open(page, 'desk', { lang })
      await page.evaluate(() => window.__desk.skip())
      await expect(page.locator('.scene--desk')).toHaveAttribute('data-done', 'true', { timeout: 10_000 })
      await page.locator('[data-heart]').click()
      await page.waitForTimeout(900)
      for (const { cls, gap } of await ruleGaps(page)) {
        const tol = cls.includes('l-sig') ? 3 : 1.5 // the signature is tilted a little
        expect(Math.abs(gap), `${cls} baseline vs rule at ${vp.name} (${lang})`).toBeLessThanOrEqual(tol)
      }
      await shot(page, `desk-rules-${lang}-${vp.name}`)
    }
  })
}

test('the "light came on" toast never covers the sign-off', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'viewport loop runs once')
  test.setTimeout(120_000)
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: vp, baseURL: info.project.use.baseURL })
    await open(page, 'desk')
    await page.evaluate(() => window.__desk.skip())
    await expect(page.locator('.toast')).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(1900) // the glide down to the end has landed; the toast is still up
    await expect(page.locator('.toast')).toBeVisible()
    const toast = await page.locator('.toast').boundingBox()
    const off = await page.locator('.l-off').boundingBox()
    expect(off.y, `sign-off below the toast at ${vp.name}`).toBeGreaterThan(toast.y + toast.height)
    await expect(page.locator('[data-back]'), `back button on the paper at ${vp.name}`).toBeInViewport({ ratio: 1 })
    await page.close()
  }
})

for (const vp of VIEWPORTS) {
  test(`desk screenshots at ${vp.name}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'viewport loop runs once')
    test.setTimeout(120_000) // a long walk through the room; slow when the machine is busy
    await page.setViewportSize(vp)
    await open(page, 'desk')
    await page.waitForTimeout(300)
    await look(page, `desk-dark-${vp.name}`)
    await page.locator('[data-chain]').click()
    await expect.poll(() => page.evaluate(() => window.__desk.phase())).toBe('lit')
    await look(page, `desk-lit-${vp.name}`)
    await page.locator('[data-envelope]').click()
    await page.waitForTimeout(4200)
    await look(page, `desk-writing-${vp.name}`)
    await page.evaluate(() => window.__desk.skip())
    await expect(page.locator('.scene--desk')).toHaveAttribute('data-done', 'true', { timeout: 10_000 })
    for (let i = 0; i < 2; i++) await page.locator('[data-heart]').click()
    await page.waitForTimeout(1500)
    await look(page, `desk-signed-${vp.name}`)
  })
}

test('rotating mid-letter keeps the paper on screen', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'runs once')
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'desk')
  await openLetter(page)
  await page.waitForTimeout(2500)
  await page.setViewportSize({ width: 844, height: 390 })
  await page.waitForTimeout(1200)
  await look(page, 'desk-rotated')
  await page.evaluate(() => window.__desk.skip())
  await expect(page.locator('.scene--desk')).toHaveAttribute('data-done', 'true', { timeout: 10_000 })
  await expect(page.locator('[data-heart]')).toBeVisible()
})
