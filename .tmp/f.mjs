import { chromium } from '@playwright/test'
const b = await chromium.launch(); const p = await b.newPage()
await p.goto('http://127.0.0.1:4199/?debug&skip&lang=bn#/house'); await p.waitForTimeout(800)
console.log(await p.evaluate(async () => { const r = await document.fonts.load('16px "Hind Siliguri"', 'শ'); return [r.length, getComputedStyle(document.body).fontFamily, document.documentElement.lang] }))
await b.close()
