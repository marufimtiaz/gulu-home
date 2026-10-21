export default async function (page, out) {
  const at = (label) => console.log(`${((Date.now() - globalThis.T0) / 1000).toFixed(2)}s ${label}`)
  const tap = async (sel, fx = 0.5, fy = 0.5) => {
    const b = await page.locator(sel).first().boundingBox()
    at(sel)
    await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy)
  }
  const wait = (ms) => page.waitForTimeout(ms)
  const snap = (n) => page.screenshot({ path: `scratch/${out}-${n}.png` })
  for (let i = 0; i < 3; i++) {
    await tap('.fin-svg .h-cat .hit')
    await wait(i === 2 ? 900 : 2200)
  }
  await snap('cat')
  await wait(1500)
  await tap('[data-win="living"]')
  await wait(700)
  await tap('[data-win="living"]')
  await wait(500)
  await snap('window')
  await wait(2500)
  for (let i = 0; i < 3; i++) {
    await tap('.fin-svg .h-tank')
    await wait(400)
  }
  await snap('tank')
  await page.evaluate(() => window.__finale.hang())
  await wait(7000)
  at('stick')
  await page.evaluate(() => window.__finale.stick())
  await wait(14000)
  await snap('home')
  for (let i = 0; i < 5; i++) {
    const vp = page.viewportSize()
    at('sky')
    await page.mouse.click(vp.width * (0.25 + i * 0.12), 110 + (i % 2) * 40)
    await wait(i === 4 ? 520 : 700)
  }
  await snap('sky')
  await wait(1000)
  await tap('.fin-svg .mat')
  await wait(400)
  await tap('.fin-svg .mat')
  await wait(500)
  await snap('mat')
  await wait(3000)
  at('end')
}
