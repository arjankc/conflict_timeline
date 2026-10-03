import { useEffect, useRef, useState } from 'react'
import { subscribeToast } from '../lib/toast'

const TOAST_MS = 2800

/** Viewport toast for copy confirmations. Sits above the mobile year dock. */

export function Toast() {
  const [message, setMessage] = useState<string | null>(null)
  const hideTimer = useRef(0)

  useEffect(() => {
    return subscribeToast((next) => {
      setMessage(next)
      window.clearTimeout(hideTimer.current)
      hideTimer.current = window.setTimeout(() => setMessage(null), TOAST_MS)
    })
  }, [])

  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-4 z-50 bottom-[calc(var(--dock-h)+0.75rem)] lg:bottom-6"
    >
      <p className="mx-auto max-w-sm rounded-sm border border-line bg-ink px-4 py-3 text-center text-sm leading-snug text-paper">
        {message}
      </p>
    </div>
  )
}
