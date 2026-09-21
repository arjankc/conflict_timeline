/** Pure window math for the timeline. Heights are in pixels. */

export function findRowIndex(offsets: number[], y: number): number {
  if (offsets.length === 0) return 0
  let lo = 0
  let hi = offsets.length - 1
  let answer = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (offsets[mid] <= y) {
      answer = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return answer
}

export function visibleRange(
  offsets: number[],
  total: number,
  viewStart: number,
  viewEnd: number,
  overscan: number,
): { start: number; end: number } {
  if (offsets.length === 0) return { start: 0, end: 0 }
  const startY = Math.max(0, viewStart - overscan)
  const endY = Math.min(Math.max(total - 1, 0), Math.max(viewEnd + overscan, startY))
  const start = findRowIndex(offsets, startY)
  let end = findRowIndex(offsets, endY) + 1
  if (end <= start) end = start + 1
  return { start, end: Math.min(offsets.length, end) }
}

export function prefixOffsets(heights: number[]): { offsets: number[]; total: number } {
  const offsets = new Array<number>(heights.length)
  let y = 0
  for (let index = 0; index < heights.length; index += 1) {
    offsets[index] = y
    y += heights[index]
  }
  return { offsets, total: y }
}
