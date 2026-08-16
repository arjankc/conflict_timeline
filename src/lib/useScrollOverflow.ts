import { useLayoutEffect, useState, type RefObject } from 'react'
import { overflowEdges } from './scrollOverflow'

/** Tracks whether a horizontal (or vertical) scroller can move further in either direction. */

export function useScrollOverflow(
  ref: RefObject<HTMLElement | null>,
  axis: 'x' | 'y' = 'x',
) {
  const [start, setStart] = useState(false)
  const [end, setEnd] = useState(false)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    function sync() {
      if (!node) return
      const edges =
        axis === 'x'
          ? overflowEdges(node.scrollLeft, node.scrollWidth, node.clientWidth)
          : overflowEdges(node.scrollTop, node.scrollHeight, node.clientHeight)
      setStart(edges.start)
      setEnd(edges.end)
    }

    sync()
    node.addEventListener('scroll', sync, { passive: true })
    const observer = new ResizeObserver(sync)
    observer.observe(node)
    const child = node.firstElementChild
    if (child) observer.observe(child)
    const mutations = new MutationObserver(sync)
    mutations.observe(node, { childList: true, subtree: true })
    return () => {
      node.removeEventListener('scroll', sync)
      observer.disconnect()
      mutations.disconnect()
    }
  }, [axis, ref])

  return { start, end }
}
