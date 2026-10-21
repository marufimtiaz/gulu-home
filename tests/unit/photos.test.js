import { describe, expect, it } from 'vitest'
import { build, dateFromName, upTo } from '../../src/photos.js'

describe('photos', () => {
  it('parses camera filenames', () => {
    expect(dateFromName('IMG_20251120_154558.jpg')).toEqual(new Date(2025, 10, 20, 15, 45))
    expect(dateFromName('IMG_20220420_043028770.jpg')).toEqual(new Date(2022, 3, 20, 4, 30))
    expect(dateFromName('flowers.jpg')).toBe(null)
    expect(dateFromName('IMG_20251320_000000.jpg')).toBe(null)
  })

  it('finds the latest photos up to a date', () => {
    const list = build([
      { file: 'IMG_20220101_120000.jpg', w: 1, h: 1 },
      { file: 'IMG_20230101_120000.jpg', w: null, h: null },
      { file: 'IMG_20240101_120000.jpg', w: 1, h: 1 },
      { file: 'nodate.jpg', w: 1, h: 1 },
    ])
    expect(upTo(new Date(2023, 5, 1), 3, list).map((p) => p.file)).toEqual(['IMG_20230101_120000.jpg', 'IMG_20220101_120000.jpg'])
    expect(list[1].thumb).toBe('/photos/IMG_20230101_120000.jpg')
  })

  it('ships the real photos', async () => {
    const { all } = await import('../../src/photos.js')
    expect(all().length).toBeGreaterThan(20)
  })
})
