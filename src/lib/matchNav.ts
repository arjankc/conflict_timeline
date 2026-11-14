/**
 * Cycling index for next/previous search-match navigation.
 * Wraps around like find-in-page; total of 0 stays at 0.
 */
export function cycleMatchIndex(
  current: number,
  delta: 1 | -1,
  total: number,
): number {
  if (total <= 0) return 0
  return (((current + delta) % total) + total) % total
}
