/**
 * Titles and copy for the live document and the Share sheet.
 * Open Graph tags in `index.html` stay generic: crawlers do not run this module.
 */
import type { TimelineFilters } from './filterEvents'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from './site'
import { explorerQueryString } from './urlState'

export function pageTitle(
  filters: TimelineFilters,
  year?: number,
): string {
  const parts: string[] = []
  if (filters.keyword) parts.push(filters.keyword)
  if (year != null) parts.push(String(year))
  if (filters.search.trim()) parts.push(`“${filters.search.trim()}”`)
  return parts.length > 0 ? `${parts.join(' · ')} · ${SITE_NAME}` : SITE_NAME
}

export function pageDescription(
  filters: TimelineFilters,
  year?: number,
  resultCount?: number,
): string {
  const bits: string[] = []
  if (year != null) bits.push(`Year ${year}`)
  if (filters.keyword) bits.push(`theme “${filters.keyword}”`)
  if (filters.search.trim()) bits.push(`search “${filters.search.trim()}”`)
  if (bits.length === 0) return SITE_DESCRIPTION
  const count =
    resultCount == null ? '' : ` Showing ${resultCount} matching events.`
  return `${SITE_TAGLINE} Filtered by ${bits.join(', ')}.${count}`
}

export function shareText(filters: TimelineFilters, year?: number): string {
  const title = pageTitle(filters, year)
  if (title === SITE_NAME) return SITE_TAGLINE
  return `${title}. ${SITE_TAGLINE}`
}

/** Current view (filters + year), without `#event-…`. Card copies use `eventPermalink`. */
export function shareUrl(filters: TimelineFilters, year?: number): string {
  return `${window.location.origin}${window.location.pathname}${explorerQueryString(filters, year)}`
}
