export default async function (page, out) {
  const at = (label) => console.log(`${((Date.now() - globalThis.T0) / 1000).toFixed(2)}s ${label}`)
  const tap = async (sel, fx = 0.5, fy = 0.5) => {
    const b = await page.locator(sel).first().boundingBox()
    at(sel)
    await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy)
  }
  const wait = (ms) => page.waitForTimeout(ms)
  for (let i = 0; i < 5; i++) {
    await tap('[data-cat] .w-hit')
    await wait(i === 4 ? 1500 : 2600)
  }
  await page.screenshot({ path: `scratch/${out}-catgone.png` })
  await tap('.h-chimney .w-hit')
  await wait(700)
  await page.screenshot({ path: `scratch/${out}-chimney.png` })
  await wait(500)
  for (let i = 0; i < 3; i++) {
    await tap('[data-tank] .w-hit')
    await wait(500)
  }
  await page.screenshot({ path: `scratch/${out}-tank.png` })
  for (let i = 0; i < 3; i++) {
    await tap('.sky-moon')
    await wait(i === 2 ? 600 : 1800)
    if (i === 2) await page.screenshot({ path: `scratch/${out}-moon.png` })
  }
  await wait(1200)
  await tap('[data-door-knock]', 0.5, 0.3)
  await wait(600)
  await page.screenshot({ path: `scratch/${out}-door.png` })
  await wait(1500)
  await tap('[data-fairy-hit] circle:nth-child(40)')
  await wait(300)
  await page.screenshot({ path: `scratch/${out}-fairy.png` })
  await tap('.g-shroom')
  await wait(500)
  await tap('.g-bush--l')
  await tap('.g-bush--l')
  await tap('.g-bush--l')
  await wait(1000)
  await page.screenshot({ path: `scratch/${out}-garden.png` })
  await wait(5000)
  at('end')
}
