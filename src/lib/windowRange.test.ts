import { describe, expect, it } from 'vitest'
import { findRowIndex, prefixOffsets, visibleRange } from './windowRange'

describe('visibleRange', () => {
  const { offsets, total } = prefixOffsets([100, 100, 100, 100, 100])

  it('finds the row whose top is at or above y', () => {
    expect(findRowIndex(offsets, 0)).toBe(0)
    expect(findRowIndex(offsets, 100)).toBe(1)
    expect(findRowIndex(offsets, 250)).toBe(2)
  })

  it('windows a viewport and keeps an overscan buffer', () => {
    expect(visibleRange(offsets, total, 200, 300, 0)).toEqual({ start: 2, end: 4 })
    expect(visibleRange(offsets, total, 200, 300, 100)).toEqual({ start: 1, end: 5 })
  })

  it('returns an empty range when there are no rows', () => {
    expect(visibleRange([], 0, 0, 100, 10)).toEqual({ start: 0, end: 0 })
  })
})
