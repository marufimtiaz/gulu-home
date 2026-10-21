import { chromium } from '@playwright/test'
const b = await chromium.launch(); const p = await b.newPage()
const failed = []; p.on('requestfailed', r => failed.push(r.url())); p.on('request', r => { if (/googleapis|gstatic/.test(r.url())) failed.push('REMOTE ' + r.url()) })
await p.goto('http://127.0.0.1:4199/?debug&skip&lang=bn#/house'); await p.waitForTimeout(800)
await p.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<p style="font-family:Galada">শুভ বৌভাত</p><p style="font-family:Pinyon Script">Maruf</p><p style="font-family:Fraunces">x</p>'))
await p.waitForTimeout(800)
console.log(await p.evaluate(async () => { await document.fonts.ready; return ['Galada','Pinyon Script','Fraunces','Hind Siliguri'].map(f => f + ':' + document.fonts.check(`16px "${f}"`, 'শx')) }), failed)
await b.close()
