export default async function (page, out) {
  const at = (label) => console.log(`${((Date.now() - globalThis.T0) / 1000).toFixed(2)}s ${label}`)
  const tap = async (sel, fx = 0.5, fy = 0.5) => {
    const b = await page.locator(sel).first().boundingBox()
    at(sel)
    await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy)
  }
  const wait = (ms) => page.waitForTimeout(ms)
  const snap = (n) => page.screenshot({ path: `scratch/${out}-${n}.png` })
  await wait(600)
  for (let i = 0; i < 4; i++) {
    await tap('.env-to__name')
    await wait(700)
  }
  await snap('nick')
  for (let i = 4; i < 18; i++) {
    await tap('.env-to__name')
    await wait(120)
  }
  await wait(600)
  await snap('bou')
  await page.evaluate(() => window.__card.crack())
  await wait(3200)
  at('gate idle')
  await wait(11000)
  await snap('gate-nudge')
  await page.evaluate(() => {
    window.__card.open()
    window.__card.finish()
  })
  await wait(800)
  for (let i = 0; i < 6; i++) {
    await tap('[data-alpana]')
    await wait(i === 5 ? 500 : 450)
  }
  await snap('alpana')
  await wait(1500)
  // drag across the card: the foil follows
  const b = await page.locator('[data-card-face]').boundingBox()
  at('drag')
  await page.mouse.move(b.x + 20, b.y + b.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width - 20, b.y + b.height * 0.4, { steps: 30 })
  await page.mouse.up()
  await snap('foil')
  await wait(1000)
  at('end')
}
