import { beforeEach, describe, expect, it } from 'vitest'
import * as state from '../../src/state.js'
import * as i18n from '../../src/i18n.js'

beforeEach(() => {
  localStorage.clear()
  state._reload()
})

describe('i18n', () => {
  it('fills tokens', () => {
    i18n.init('')
    expect(i18n.c('finale.plate')).toBe('Maruf & Sneha')
    expect(i18n.fill('hi {nickname} {x}', { x: 3 })).toBe('hi Gulu 3')
    expect(i18n.fill('{unknown}')).toBe('{unknown}')
  })

  it('overlays Bengali with English fallback', () => {
    i18n.init('?lang=bn')
    expect(i18n.lang()).toBe('bn')
    expect(i18n.c('finale.plate')).toBe('মারুফ & স্নেহা')
    // not translated yet → English
    expect(i18n.c('card.invocationLabel')).toBe('Bismillahir Rahmanir Rahim') // no Bengali override → English
    expect(i18n.num(2026)).toBe('২০২৬')
    expect(i18n.date('2022-04-20')).toBe('২০ এপ্রিল ২০২২')
    i18n.init('?lang=en')
  })

  it('overlay merges object lists by position, replaces text lists', () => {
    const base = { list: [{ a: 1, b: 'x' }, { a: 2, b: 'y' }], words: ['a', 'b'] }
    const out = i18n.overlay(base, { list: [{ b: 'X' }], words: ['c'] })
    expect(out.list).toEqual([{ a: 1, b: 'X' }, { a: 2, b: 'y' }])
    expect(out.words).toEqual(['c'])
  })

  it('formats dates and days', () => {
    i18n.init('?lang=en')
    expect(i18n.date('2022-04-20T04:30', 'long')).toBe('20 April 2022')
    expect(i18n.date('2022-04-20T04:30', 'short')).toBe('20 Apr 2022')
    expect(i18n.date('2022-04-20T04:30', 'time')).toBe('4:30 AM')
    expect(i18n.days(new Date(2022, 3, 21, 4, 30))).toBe(1)
  })

  it('missing strings return the key', () => {
    i18n.init('')
    expect(i18n.t('nope.missing')).toBe('nope.missing')
    expect(i18n.t('reward.lit')).toBe('a light came on ♥')
  })
})
