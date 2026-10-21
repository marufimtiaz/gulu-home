import probe from './probe.mjs'
export default async function (page, out) {
  await page.evaluate(() => window.__finale.stick())
  await page.waitForTimeout(15000)
  await probe(page, out)
  const b = await page.locator('.fin-svg .mat').boundingBox()
  const clip = { x: b.x - 40, y: b.y - 60, width: b.width + 80, height: b.height + 80 }
  await page.screenshot({ path: `scratch/${out}-mat0.png`, clip })
  await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.7)
  await page.waitForTimeout(300)
  await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.7)
  await page.waitForTimeout(350)
  await page.screenshot({ path: `scratch/${out}-mat1.png`, clip })
  await page.screenshot({ path: `scratch/${out}-mat2.png` })
}
