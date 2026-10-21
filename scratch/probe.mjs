export default async function (page) {
  const sels = process.env.SELS.split('|')
  for (const sel of sels) {
    const r = await page.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return 'missing'
      const b = el.getBoundingClientRect()
      const pts = [[0.5, 0.5], [0.5, 0.3], [0.3, 0.7]].map(([fx, fy]) => {
        const t = document.elementFromPoint(b.left + b.width * fx, b.top + b.height * fy)
        return t ? `${t.tagName}.${t.getAttribute('class')}` : 'none'
      })
      return { box: [b.left, b.top, b.width, b.height].map(Math.round), react: el.dataset.react, pts }
    }, sel)
    console.log(sel, JSON.stringify(r))
  }
}
