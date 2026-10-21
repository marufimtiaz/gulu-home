import { describe, expect, it } from 'vitest'
import { treeAge, treeStage } from '../../src/scenes/garden/tree.js'

describe('treeAge', () => {
  it('is a sapling on the wedding day, inside the anniversary week', () => {
    expect(treeAge('2026-10-22', new Date(2026, 9, 22))).toEqual({ years: 0, anniversaryWeek: true })
  })
  it('turns one on the first anniversary and stays in the week for 7 days', () => {
    expect(treeAge('2026-10-22', new Date(2027, 9, 25))).toEqual({ years: 1, anniversaryWeek: true })
    expect(treeAge('2026-10-22', new Date(2027, 9, 28, 23, 59))).toEqual({ years: 1, anniversaryWeek: true })
    expect(treeAge('2026-10-22', new Date(2027, 9, 29))).toEqual({ years: 1, anniversaryWeek: false })
  })
  it('is outside the week a month later', () => {
    expect(treeAge('2026-10-22', new Date(2027, 10, 25))).toEqual({ years: 1, anniversaryWeek: false })
  })
  it('the day before an anniversary still counts the previous year', () => {
    expect(treeAge('2026-10-22', new Date(2028, 9, 21))).toEqual({ years: 1, anniversaryWeek: false })
    expect(treeAge('2026-10-22', new Date(2028, 9, 22))).toEqual({ years: 2, anniversaryWeek: true })
  })
  it('before the wedding: a sapling, no anniversary', () => {
    expect(treeAge('2026-10-22', new Date(2026, 5, 1))).toEqual({ years: 0, anniversaryWeek: false })
    expect(treeAge('2026-10-22', new Date(2026, 9, 21, 23))).toEqual({ years: 0, anniversaryWeek: false })
  })
})

describe('treeStage', () => {
  it('caps at five rings', () => {
    expect(treeStage(0)).toBe(0)
    expect(treeStage(3)).toBe(3)
    expect(treeStage(9)).toBe(5)
    expect(treeStage(-1)).toBe(0)
  })
})
