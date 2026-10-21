/*
 * Shared e2e helpers. Every scene spec should use these.
 *
 *   await open(page, 'kitchen', { done: ['living'], doorSeen: true, lang: 'en' })
 *     (opts.expect: the scene id to wait for, if a guard redirects; opts.query: extra URL params)
 *     → seeds localStorage, loads /?debug#/kitchen, waits for the scene to mount.
 *   collectErrors(page) → array that fills with console errors + page errors.
 *   await shot(page, 'kitchen-start') → screenshot into test-results/shots/<project>/.
 */
import { expect } from '@playwright/test'

export const ROOMS = ['living', 'kitchen', 'garden', 'rooftop', 'desk', 'empty']

export function seed({ doorSeen = true, done = [], lang = 'en', notes = [], wall = null } = {}) {
  const d = { living: false, kitchen: false, garden: false, rooftop: false, desk: false, empty: false, finale: false }
  for (const r of done) d[r] = true
  return { v: 1, doorSeen, done: d, empty: { wall, notes }, lang, sound: 'off' }
}

export async function open(page, route, opts = {}) {
  const s = seed(opts)
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('our-home', value)
      sessionStorage.setItem('seeded', '1')
    }
  }, JSON.stringify(s))
  const q = opts.query ? `&${opts.query}` : ''
  await page.goto(`/?debug${q}#/${route}`)
  await expect(page.locator(`.scene[data-scene="${opts.expect ?? route}"]`)).toBeVisible()
  // let the crossfade finish
  await page.waitForTimeout(150)
}

export function collectErrors(page) {
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !/fonts\.g(oogleapis|static)/.test(m.text())) errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  return errors
}

export async function shot(page, name) {
  const project = test_info_project()
  await page.screenshot({ path: `test-results/shots/${project}/${name}.png` })
}

import { test } from '@playwright/test'
function test_info_project() {
  try {
    return test.info().project.name
  } catch {
    return 'default'
  }
}
