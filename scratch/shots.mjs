import { chromium } from '@playwright/test'
// node scratch/shots.mjs <route> <done,csv> <out> [w] [h] [query] [script.js]
const [, , route, done = '', out = 'shot', w = '390', h = '844', extra = '', script = ''] = process.argv
const b = await chromium.launch()
const video = process.env.VIDEO ? { recordVideo: { dir: 'scratch/video', size: { width: +w, height: +h } } } : {}
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: process.env.VIDEO ? 1 : 2, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference', ...video })
const page = await ctx.newPage()
globalThis.T0 = Date.now()
page.on('pageerror', (e) => console.log('ERR', e))
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && console.log('CONSOLE', m.text()))
const d = { living: false, kitchen: false, garden: false, rooftop: false, desk: false, empty: false, finale: false }
for (const r of done.split(',').filter(Boolean)) d[r] = true
await page.addInitScript((v) => localStorage.setItem('our-home', v), JSON.stringify({ v: 1, doorSeen: true, done: d, empty: { wall: null, notes: [] }, order: [], lang: 'en', sound: 'off' }))
await page.goto(`http://127.0.0.1:4201/?debug${extra}#/${route}`)
await page.waitForTimeout(2500)
if (script) {
  const mod = await import(new URL(script, `file://${process.cwd()}/`).href)
  await mod.default(page, out)
} else await page.screenshot({ path: `scratch/${out}.png` })
const v = page.video()
await ctx.close()
if (v) {
  const { renameSync } = await import('node:fs')
  renameSync(await v.path(), `scratch/video/${out}.webm`)
}
await b.close()
