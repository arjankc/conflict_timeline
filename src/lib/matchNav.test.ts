import { describe, expect, it } from 'vitest'
import { cycleMatchIndex } from './matchNav'

describe('cycleMatchIndex', () => {
  it('advances and wraps at the end', () => {
    expect(cycleMatchIndex(0, 1, 3)).toBe(1)
    expect(cycleMatchIndex(2, 1, 3)).toBe(0)
  })

  it('retreats and wraps at the start', () => {
    expect(cycleMatchIndex(0, -1, 3)).toBe(2)
    expect(cycleMatchIndex(1, -1, 3)).toBe(0)
  })

  it('stays at zero without matches', () => {
    expect(cycleMatchIndex(5, 1, 0)).toBe(0)
    expect(cycleMatchIndex(0, 1, 1)).toBe(0)
  })
})
