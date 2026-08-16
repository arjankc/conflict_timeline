/** Start/end overflow flags for a scroller. Used to show edge fades. */

export function overflowEdges(
  scrollStart: number,
  scrollSize: number,
  clientSize: number,
  slop = 4,
): { start: boolean; end: boolean } {
  return {
    start: scrollStart > slop,
    end: scrollStart + clientSize < scrollSize - slop,
  }
}
