import { useEffect, useRef, useState } from 'react'
import type { TimelineFilters } from '../lib/filterEvents'
import { pageTitle, shareText, shareUrl } from '../lib/seo'
import { writeExplorerQuery } from '../lib/urlState'

/** Shares the current filtered view (query string). Individual cards use the permalink control instead. */

type ShareButtonProps = {
  filters: TimelineFilters
  year?: number
}

export function ShareButton({ filters, year }: ShareButtonProps) {
  const [status, setStatus] = useState('')
  const statusTimer = useRef(0)

  useEffect(() => () => window.clearTimeout(statusTimer.current), [])

  function announce(message: string) {
    setStatus(message)
    window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => setStatus(''), 2500)
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url)
    announce('Link copied')
  }

  async function onShare() {
    writeExplorerQuery(filters, year)
    const url = shareUrl(filters, year)
    const title = pageTitle(filters, year)
    const text = shareText(filters, year)

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
        announce('Shared')
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    try {
      await copyLink(url)
    } catch {
      announce('Copy the address bar to share this view')
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void onShare()}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-control bg-surface px-3 text-sm font-medium text-ink"
      >
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
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
          <path d="M12 16V3" />
          <path d="m8 7 4-4 4 4" />
        </svg>
        Share
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
      {status ? (
        <p aria-hidden="true" className="max-w-36 text-right text-xs text-muted">
          {status}
        </p>
      ) : null}
    </div>
  )
}
