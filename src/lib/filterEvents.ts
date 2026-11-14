import type { ConflictEvent, ConfidenceLevel } from '../types/event'
import { eventSearchIndex } from './eventSearch'

export type SortMode = 'chronological' | 'reverse' | 'category'

/** Within-facet combination: `any` (OR) is the default; `all` requires every value. */
export type MatchMode = 'any' | 'all'

export type TimelineFilters = {
  search: string
  /** OR (`any`) or AND (`all`) within a facet, AND across facets. Case-insensitive. */
  keywords: string[]
  categories: string[]
  organizations: string[]
  /** Inferred districts (see `eventGeography.ts`). OR/AND within per match mode. */
  districts: string[]
  confidence: ConfidenceLevel | ''
  sort: SortMode
  match: MatchMode
  /** Inclusive `YYYY-MM` bounds. Empty = unbounded. */
  from: string
  to: string
}

export const EMPTY_FILTERS: TimelineFilters = {
  search: '',
  keywords: [],
  categories: [],
  organizations: [],
  districts: [],
  confidence: '',
  sort: 'chronological',
  match: 'any',
  from: '',
  to: '',
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    const seen = new Set<string>()
    const out: string[] = []
    for (const item of value) {
      if (typeof item !== 'string') continue
      const trimmed = item.trim()
      if (!trimmed) continue
      const key = trimmed.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(trimmed)
    }
    return out
  }
  if (typeof value === 'string' && value.trim() !== '') {
    // Legacy single-string filters (pre-multi-select saved views / URLs).
    return [value.trim()]
  }
  return []
}

/**
 * Coerce unknown/legacy filter shapes (old saved views, hand-edited URLs)
 * into a valid TimelineFilters. Never throws.
 */
export function normalizeFilters(raw: unknown): TimelineFilters {
  const input = (raw ?? {}) as Partial<Record<keyof TimelineFilters, unknown>>
  const sort = input.sort
  const match = input.match
  const confidence = input.confidence
  const from = typeof input.from === 'string' ? input.from.trim() : ''
  const to = typeof input.to === 'string' ? input.to.trim() : ''
  return {
    search: typeof input.search === 'string' ? input.search : '',
    keywords: asList(input.keywords ?? (input as Record<string, unknown>)['keyword']),
    categories: asList(input.categories ?? (input as Record<string, unknown>)['category']),
    organizations: asList(
      input.organizations ?? (input as Record<string, unknown>)['organization'],
    ),
    districts: asList(input.districts),
    confidence: confidence === 'high' || confidence === 'medium' || confidence === 'low' ? confidence : '',
    sort: sort === 'reverse' || sort === 'category' || sort === 'chronological' ? sort : 'chronological',
    match: match === 'all' ? 'all' : 'any',
    from: isValidMonthBound(from) ? from : '',
    to: isValidMonthBound(to) ? to : '',
  }
}

function lowerList(values: string[]): Set<string> {
  const set = new Set<string>()
  for (const value of values) {
    const key = value.toLowerCase()
    if (key) set.add(key)
  }
  return set
}

function hasAny(haystack: Set<string>, needles: Set<string>): boolean {
  for (const needle of needles) {
    if (haystack.has(needle)) return true
  }
  return false
}

function hasAll(haystack: Set<string>, needles: Set<string>): boolean {
  for (const needle of needles) {
    if (!haystack.has(needle)) return false
  }
  return true
}

function facetMatch(haystack: Set<string>, needles: Set<string>, match: MatchMode): boolean {
  if (needles.size === 0) return true
  return match === 'all' ? hasAll(haystack, needles) : hasAny(haystack, needles)
}

const MONTH_BOUND_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

function yearMonthBound(raw: string): number | null {
  const match = raw.trim().match(MONTH_BOUND_PATTERN)
  if (!match) return null
  return Number(match[1]) * 100 + Number(match[2])
}

function eventYearMonth(event: ConflictEvent): number | null {
  if (event.year == null) return null
  if (event.precision === 'unknown') return null
  const month = Math.floor((event.sortKey % 10000) / 100)
  if (month < 1 || month > 12) return null
  return event.year * 100 + month
}

/**
 * Case-insensitive search of indexed Event_ID, date, narrative, and tags.
 * The index is built once per event object — keystrokes do not re-parse the CSV.
 * Facets are OR-within / AND-across. Sorting is applied here so year groups
 * inherit the order (reverse flips the timeline; category sorts within each year).
 */
export function filterEvents(
  events: ConflictEvent[],
  filters: TimelineFilters,
): ConflictEvent[] {
  const needle = filters.search.trim().toLowerCase()
  const keywordSet = lowerList(filters.keywords)
  const categorySet = lowerList(filters.categories)
  const organizationSet = lowerList(filters.organizations)
  const districtSet = lowerList(filters.districts)
  const confidence = filters.confidence.toLowerCase()
  const fromYm = filters.from ? yearMonthBound(filters.from) : null
  const toYm = filters.to ? yearMonthBound(filters.to) : null

  const filtered = events.filter((event) => {
    const index = eventSearchIndex(event)
    if (needle && !index.searchText.includes(needle)) return false
    if (!facetMatch(index.categories, categorySet, filters.match)) return false
    if (!facetMatch(index.organizations, organizationSet, filters.match)) return false
    if (!facetMatch(index.keywords, keywordSet, filters.match)) return false
    if (!facetMatch(index.districts, districtSet, filters.match)) return false
    if (confidence && (event.confidence ?? '') !== confidence) return false
    if (fromYm != null || toYm != null) {
      const ym = eventYearMonth(event)
      if (ym == null) return false
      if (fromYm != null && ym < fromYm) return false
      if (toYm != null && ym > toYm) return false
    }
    return true
  })

  return sortFiltered(filtered, filters.sort)
}

function firstCategory(event: ConflictEvent): string {
  return event.categories[0]?.toLowerCase() ?? ''
}

function compareYearAsc(a: ConflictEvent, b: ConflictEvent): number {
  if (a.year == null && b.year == null) return 0
  if (a.year == null) return 1
  if (b.year == null) return -1
  return a.year - b.year
}

export function sortFiltered(
  events: ConflictEvent[],
  sort: SortMode,
): ConflictEvent[] {
  const out = events.slice()
  if (sort === 'reverse') {
    out.sort((a, b) => {
      if (a.sortKey !== b.sortKey) return b.sortKey - a.sortKey
      return b.id.localeCompare(a.id)
    })
    return out
  }
  if (sort === 'category') {
    out.sort((a, b) => {
      const year = compareYearAsc(a, b)
      if (year !== 0) return year
      const cat = firstCategory(a).localeCompare(firstCategory(b))
      if (cat !== 0) return cat
      if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey
      return a.id.localeCompare(b.id)
    })
    return out
  }
  out.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey
    return a.id.localeCompare(b.id)
  })
  return out
}

export function isValidMonthBound(raw: string): boolean {
  if (!raw) return true
  return MONTH_BOUND_PATTERN.test(raw.trim())
}

export type YearGroup = {
  year: number | null
  events: ConflictEvent[]
}

/** DOM id for a year block. Distinct from card permalinks (`event-…`). */
export function yearSectionId(year: number | null): string {
  return year == null ? 'year-undated' : `year-${year}`
}

/** Groups in first-seen year order. Callers pass events already sorted chronologically. */
export function groupEventsByYear(events: ConflictEvent[]): YearGroup[] {
  const groups: YearGroup[] = []
  const indexByYear = new Map<number | null, YearGroup>()

  for (const event of events) {
    const year = event.year
    const existing = indexByYear.get(year)
    if (existing) {
      existing.events.push(event)
      continue
    }

    const group: YearGroup = { year, events: [event] }
    indexByYear.set(year, group)
    groups.push(group)
  }

  return groups
}

function monthFromEvent(event: ConflictEvent): number | null {
  if (event.precision === 'unknown' || event.year == null) return null
  const month = Math.floor((event.sortKey % 10000) / 100)
  if (month < 1 || month > 12) return null
  return month
}

export type MonthGroup = {
  month: number | null
  events: ConflictEvent[]
}

export function groupEventsByMonth(events: ConflictEvent[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  const indexByMonth = new Map<number | null, MonthGroup>()

  for (const event of events) {
    const month = monthFromEvent(event)
    const existing = indexByMonth.get(month)
    if (existing) {
      existing.events.push(event)
      continue
    }

    const group: MonthGroup = { month, events: [event] }
    indexByMonth.set(month, group)
    groups.push(group)
  }

  return groups
}

/** Twelve month buckets for the year-rail heatmap (index 0 = January). */
export function monthCountsForYear(events: ConflictEvent[]): number[] {
  const counts = Array.from({ length: 12 }, () => 0)
  for (const event of events) {
    const month = monthFromEvent(event)
    if (month) counts[month - 1] += 1
  }
  return counts
}
