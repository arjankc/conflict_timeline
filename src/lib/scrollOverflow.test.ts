import { describe, expect, it } from 'vitest'
import { overflowEdges } from './scrollOverflow'

describe('overflowEdges', () => {
  it('is clear at both ends when content fits', () => {
    expect(overflowEdges(0, 320, 320)).toEqual({ start: false, end: false })
  })

  it('marks the end when content is clipped on the right', () => {
    expect(overflowEdges(0, 640, 320)).toEqual({ start: false, end: true })
  })

  it('marks the start after scrolling in', () => {
    expect(overflowEdges(80, 640, 320)).toEqual({ start: true, end: true })
  })

  it('clears the end near the last pixel, allowing a small slop', () => {
    expect(overflowEdges(316, 640, 320)).toEqual({ start: true, end: false })
  })
})
