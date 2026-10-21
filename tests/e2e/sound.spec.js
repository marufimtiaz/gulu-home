import { expect, test } from '@playwright/test'
import { collectErrors, open } from './helpers.js'

const EFFECTS_AND_LAYERS = async (page) =>
  page.evaluate(async () => {
    const { EFFECTS, LAYERS } = await import('/src/sound/index.js')
    return { EFFECTS, LAYERS }
  })

test('unlocks on a tap, plays effects, theme and layers without errors', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, 'house')
  await page.evaluate(() => window.__home.state.update({ sound: 'all' }))
  await page.mouse.click(200, 200)
  const result = await page.evaluate(async () => {
    const { sound, EFFECTS, LAYERS } = await import('/src/sound/index.js')
    const engine = await import('/src/sound/engine.js')
    sound.unlock()
    for (let i = 0; i < 50 && engine._state() !== 'running'; i++) await new Promise((r) => setTimeout(r, 20))
    sound.play('success')
    sound.theme('verse')
    sound.theme('verse') // no-op
    for (const n of EFFECTS) sound.play(n, { i: 3, rate: 0.5 })
    sound.play('no-such-effect')
    const stops = LAYERS.map((n) => sound.layer(n))
    stops[0].setRate?.(1)
    await new Promise((r) => setTimeout(r, 600))
    sound.theme('chorus')
    await new Promise((r) => setTimeout(r, 400))
    stops.forEach((s) => s())
    stops.forEach((s) => s()) // twice is fine
    sound.layer('nope')()
    sound.theme('off')
    return engine._state()
  })
  expect(result).toBe('running')
  expect(errors).toEqual([])
})

test('sound chip cycles the mode and its label', async ({ page }) => {
  await open(page, 'house')
  const chip = page.locator('.chip--sound')
  await expect(chip).toBeVisible()
  const seen = []
  for (let i = 0; i < 3; i++) {
    seen.push(await chip.getAttribute('aria-label'))
    await chip.click()
  }
  expect(new Set(seen).size).toBe(3)
  expect(await chip.getAttribute('aria-label')).toBe(seen[0])
  const modes = await page.evaluate(() => window.__home.state.get().sound)
  expect(modes).toBe('off') // seed starts at off; three clicks come back round
})

test('every effect, layer and theme part renders non-silent and unclipped', async ({ page }) => {
  test.setTimeout(60_000)
  await open(page, 'house')
  const { EFFECTS, LAYERS } = await EFFECTS_AND_LAYERS(page)
  const levels = await page.evaluate(
    async ({ EFFECTS, LAYERS }) => {
      const engine = await import('/src/sound/engine.js')
      const out = {}
      for (const e of EFFECTS) out[`fx:${e}`] = await engine._renderOffline({ effect: e, opts: { i: 5, rate: 1 }, seconds: 2.5 })
      for (const l of LAYERS) out[`layer:${l}`] = await engine._renderOffline({ layer: l, seconds: l === 'room' ? 8 : 4 })
      out['theme:verse'] = await engine._renderOffline({ part: 'verse', seconds: 30 })
      out['theme:chorus'] = await engine._renderOffline({ part: 'chorus', seconds: 20 })
      return out
    },
    { EFFECTS, LAYERS },
  )
  const report = Object.entries(levels).map(([k, v]) => `${k.padEnd(16)} peak ${v.peak.toFixed(3)}  rms ${v.rms.toFixed(4)}`)
  console.log(report.join('\n'))
  for (const [name, { peak }] of Object.entries(levels)) {
    expect(peak, name).toBeGreaterThan(0.02)
    expect(peak, name).toBeLessThan(0.98)
  }
})
