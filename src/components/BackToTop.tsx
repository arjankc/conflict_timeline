import { useEffect, useState } from 'react'

const SHOW_AFTER_PX = 480

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Fixed control to return to the page top after scrolling the feed. */

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  function scrollTop() {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  return (
    <button
      type="button"
      onClick={scrollTop}
      aria-label="Back to top"
      className="fixed end-4 z-40 bottom-[calc(var(--dock-h)+0.75rem)] inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line bg-surface/90 text-ink shadow-float backdrop-blur-sm transition-colors hover:border-control hover:bg-chip lg:bottom-6"
    >
      <ArrowUpIcon />
    </button>
  )
}

function ArrowUpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  )
}
