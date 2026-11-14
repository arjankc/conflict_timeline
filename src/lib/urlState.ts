/**
 * View state in the query string. Hash fragments (`#event-…`) are preserved but
 * not parsed here — see `eventAnchor.ts`.
 */
import { EMPTY_FILTERS, type TimelineFilters } from './filterEvents'

export type ExplorerQuery = {
  filters: TimelineFilters
  year: number | undefined
}

function parseListParam(params: URLSearchParams, keys: string[]): string[] {
  const values: string[] = []
  for (const key of keys) {
    for (const raw of params.getAll(key)) {
      for (const part of raw.split(',')) {
        const value = part.trim()
        if (value) values.push(value)
      }
    }
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const k = value.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(value)
  }
  return out
}

function parseSortParam(raw: string | null): TimelineFilters['sort'] {
  if (raw === 'reverse' || raw === 'category' || raw === 'chronological') return raw
  return 'chronological'
}

function parseMatchParam(raw: string | null): TimelineFilters['match'] {
  return raw === 'all' ? 'all' : 'any'
}

function parseMonthParam(raw: string | null): string {
  if (!raw) return ''
  const value = raw.trim()
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value
  if (/^\d{4}$/.test(value)) return `${value}-01`
  return ''
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
      // `tag` is the legacy + canonical key; accept both single and comma/repeat forms.
      keywords: parseListParam(params, ['tag', 'tags']),
      categories: parseListParam(params, ['category', 'categories']),
      organizations: parseListParam(params, ['org', 'orgs', 'organization', 'organizations']),
      districts: parseListParam(params, ['district', 'districts']),
      confidence: parseConfidenceParam(params.get('confidence')),
      sort: parseSortParam(params.get('sort')),
      match: parseMatchParam(params.get('match')),
      from: parseMonthParam(params.get('from')),
      to: parseMonthParam(params.get('to')),
    },
    year,
  }
}

function parseConfidenceParam(
  raw: string | null,
): TimelineFilters['confidence'] {
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw
  return ''
}

export function explorerQueryString(
  filters: TimelineFilters,
  year?: number,
): string {
  const params = new URLSearchParams()
  const q = filters.search.trim()
  if (q) params.set('q', q)
  if (filters.keywords.length > 0) params.set('tag', filters.keywords.join(','))
  if (filters.categories.length > 0) params.set('category', filters.categories.join(','))
  if (filters.organizations.length > 0) params.set('org', filters.organizations.join(','))
  if (filters.districts.length > 0) params.set('district', filters.districts.join(','))
  if (filters.confidence) params.set('confidence', filters.confidence)
  if (filters.sort !== 'chronological') params.set('sort', filters.sort)
  if (filters.match !== 'any') params.set('match', filters.match)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
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
