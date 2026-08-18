import type { TimelineFilters } from '../lib/filterEvents'
import { pageTitle, shareText, shareUrl } from '../lib/seo'
import { showToast } from '../lib/toast'
import { writeExplorerQuery } from '../lib/urlState'

/** Shares the current filtered view (query string). Individual cards use the permalink control instead. */

type ShareButtonProps = {
  filters: TimelineFilters
  year?: number
}

export function ShareButton({ filters, year }: ShareButtonProps) {
  async function onShare() {
    writeExplorerQuery(filters, year)
    const url = shareUrl(filters, year)
    const title = pageTitle(filters, year)
    const text = shareText(filters, year)

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
        showToast('Shared this view')
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      showToast('Link to this view copied to the clipboard')
    } catch {
      showToast('Copy the address bar to share this view')
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      aria-label="Share this view"
      className="icon-btn gap-2 px-3 text-sm font-medium hover:border-crimson hover:text-crimson"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0"
        aria-hidden="true"
      >
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M12 16V3" />
        <path d="m8 7 4-4 4 4" />
      </svg>
      <span className="hidden sm:inline">Share</span>
    </button>
  )
}
