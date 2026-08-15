/**
 * View state in the query string. Hash fragments (`#event-…`) are preserved but
 * not parsed here — see `eventAnchor.ts`.
 */
import { EMPTY_FILTERS, type TimelineFilters } from './filterEvents'

export type ExplorerQuery = {
  filters: TimelineFilters
  year: number | undefined
}

export function parseExplorerQuery(search: string): ExplorerQuery {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  )

  const yearRaw = params.get('year')
  let year: number | undefined
  if (yearRaw && /^\d{4}$/.test(yearRaw)) year = Number(yearRaw)

  return {
    filters: {
      search: params.get('q') ?? '',
      keyword: params.get('tag') ?? '',
      category: params.get('category') ?? '',
      organization: params.get('org') ?? '',
    },
    year,
  }
}

export function explorerQueryString(
  filters: TimelineFilters,
  year?: number,
): string {
  const params = new URLSearchParams()
  const q = filters.search.trim()
  if (q) params.set('q', q)
  if (filters.keyword) params.set('tag', filters.keyword)
  if (filters.category) params.set('category', filters.category)
  if (filters.organization) params.set('org', filters.organization)
  if (year != null) params.set('year', String(year))

  const encoded = params.toString()
  return encoded ? `?${encoded}` : ''
}

export function writeExplorerQuery(
  filters: TimelineFilters,
  year?: number,
): void {
  // Keep `#event-…` (and any other fragment) when filters change.
  const next = `${window.location.pathname}${explorerQueryString(filters, year)}${window.location.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next === current) return
  window.history.replaceState(null, '', next)
}

export function readExplorerQuery(): ExplorerQuery {
  if (typeof window === 'undefined') {
    return { filters: EMPTY_FILTERS, year: undefined }
  }
  return parseExplorerQuery(window.location.search)
}
