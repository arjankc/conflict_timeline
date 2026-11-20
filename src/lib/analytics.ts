/**
 * Google Tag Manager dataLayer events (container GTM-PKN7T9SJ).
 *
 * Privacy rules for this archive:
 * - Never send raw free-text input (search box, view names) — it may contain
 *   victim names. Send lengths/counts instead.
 * - Controlled-vocabulary values (facets, districts, sort modes) are public
 *   taxonomy and are safe to send.
 * - All tracking is skipped with Do Not Track, and the GTM snippet itself
 *   does not load on localhost (see index.html).
 * Container-side setup: docs/ANALYTICS.md.
 */

import type { TimelineFilters } from './filterEvents'

export type DataLayerEvent = {
  event: string
  [key: string]: unknown
}

function trackingAllowed(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const dnt =
    navigator.doNotTrack === '1' ||
    (window as unknown as { doNotTrack?: string }).doNotTrack === '1'
  return !dnt
}

/** Push a custom event. No-op on the server, with DNT, or when blocked. */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!trackingAllowed()) return
  try {
    const layer = (window as unknown as { dataLayer?: DataLayerEvent[] })
    layer.dataLayer = layer.dataLayer ?? []
    layer.dataLayer.push({ event: name, ...params })
  } catch {
    /* analytics must never break the archive */
  }
}

/** Last tracked view — skips consecutive duplicates (StrictMode, re-renders). */
let lastPagePath: string | null = null

/** SPA view: call after the address bar reflects the current filters/year. */
export function trackPageView(path: string): void {
  if (path === lastPagePath) return
  lastPagePath = path
  trackEvent('page_view', {
    page_location: path,
    page_path: path,
  })
}

export function trackSearch(resultCount: number, queryLength: number): void {
  trackEvent('search', { result_count: resultCount, query_length: queryLength })
}

export function trackFilterChange(
  facet: 'keywords' | 'categories' | 'organizations' | 'districts' | 'confidence' | 'sort' | 'match' | 'range' | 'all',
  valueCount: number,
  values?: string[],
): void {
  trackEvent('filter_change', { facet, value_count: valueCount, ...(values ? { values } : {}) })
}

export function trackFilterReset(): void {
  trackEvent('filter_change', { facet: 'all', value_count: 0, action: 'reset' })
}

export function trackCardExpand(eventId: string): void {
  trackEvent('card_expand', { event_id: eventId })
}

export function trackPermalinkCopy(eventId: string): void {
  trackEvent('permalink_copy', { event_id: eventId })
}

export function trackCitationCopy(eventId: string): void {
  trackEvent('citation_copy', { event_id: eventId })
}

export function trackExport(format: 'csv' | 'json', resultCount: number): void {
  trackEvent('export', { format, result_count: resultCount })
}

export function trackShare(method: 'web-share' | 'clipboard'): void {
  trackEvent('share', { method })
}

export function trackYearNavigate(year: number | null): void {
  trackEvent('year_navigate', { year })
}

export function trackSavedView(action: 'save' | 'apply' | 'delete'): void {
  trackEvent('saved_view', { action })
}

export type FilterChangeFacet =
  | 'keywords'
  | 'categories'
  | 'organizations'
  | 'districts'
  | 'confidence'
  | 'sort'
  | 'match'
  | 'range'

export type FilterChange =
  | { facet: FilterChangeFacet; valueCount: number; values: string[] }
  | null

/**
 * Pure facet diff: names the first facet that differs (priority order).
 * The App shell calls this inside its filters effect and tracks the result.
 */
export function detectFilterChange(
  prev: TimelineFilters,
  next: TimelineFilters,
): FilterChange {
  const list = (values: string[]) => values.join(' | ')
  if (list(prev.keywords) !== list(next.keywords)) {
    return { facet: 'keywords', valueCount: next.keywords.length, values: next.keywords }
  }
  if (list(prev.categories) !== list(next.categories)) {
    return { facet: 'categories', valueCount: next.categories.length, values: next.categories }
  }
  if (list(prev.organizations) !== list(next.organizations)) {
    return { facet: 'organizations', valueCount: next.organizations.length, values: next.organizations }
  }
  if (list(prev.districts) !== list(next.districts)) {
    return { facet: 'districts', valueCount: next.districts.length, values: next.districts }
  }
  if (prev.confidence !== next.confidence) {
    return {
      facet: 'confidence',
      valueCount: next.confidence === '' ? 0 : 1,
      values: next.confidence === '' ? [] : [next.confidence],
    }
  }
  if (prev.sort !== next.sort) {
    return { facet: 'sort', valueCount: 1, values: [next.sort] }
  }
  if (prev.match !== next.match) {
    return { facet: 'match', valueCount: 1, values: [next.match] }
  }
  if (prev.from !== next.from || prev.to !== next.to) {
    const range = [next.from, next.to].filter((part) => part !== '')
    return { facet: 'range', valueCount: range.length, values: range }
  }
  return null
}
