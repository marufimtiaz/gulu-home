export default async function (page, out) {
  const b = await page.locator('[data-cat] .w-hit').boundingBox()
  const clip = { x: b.x - 30, y: b.y - 25, width: b.width + 90, height: b.height + 40 }
  await page.screenshot({ path: `scratch/${out}-0.png`, clip })
  for (let i = 1; i <= 4; i++) {
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    await page.waitForTimeout(i === 3 ? 900 : 550)
    await page.screenshot({ path: `scratch/${out}-${i}.png`, clip })
    await page.waitForTimeout(2400)
  }
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `scratch/${out}-5.png`, clip })
}
