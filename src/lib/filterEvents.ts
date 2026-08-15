import type { ConflictEvent } from '../types/event'

export type TimelineFilters = {
  search: string
  category: string
  organization: string
  keyword: string
}

export const EMPTY_FILTERS: TimelineFilters = {
  search: '',
  category: '',
  organization: '',
  keyword: '',
}

function hasTag(tags: string[], selected: string): boolean {
  const needle = selected.toLowerCase()
  return tags.some((tag) => tag.toLowerCase() === needle)
}

function eventMatchesSearch(event: ConflictEvent, needle: string): boolean {
  if (event.detail.toLowerCase().includes(needle)) return true
  if (event.dateLabel.toLowerCase().includes(needle)) return true
  if (event.year != null && String(event.year).includes(needle)) return true
  return (
    event.keywords.some((tag) => tag.toLowerCase().includes(needle)) ||
    event.categories.some((tag) => tag.toLowerCase().includes(needle)) ||
    event.organizations.some((tag) => tag.toLowerCase().includes(needle))
  )
}

/** Case-insensitive search of narrative, date, year, and tags; empty fields mean “no filter”. */
export function filterEvents(
  events: ConflictEvent[],
  filters: TimelineFilters,
): ConflictEvent[] {
  const needle = filters.search.trim().toLowerCase()

  return events.filter((event) => {
    if (needle && !eventMatchesSearch(event, needle)) return false
    if (filters.category && !hasTag(event.categories, filters.category)) {
      return false
    }
    if (
      filters.organization &&
      !hasTag(event.organizations, filters.organization)
    ) {
      return false
    }
    if (filters.keyword && !hasTag(event.keywords, filters.keyword)) {
      return false
    }
    return true
  })
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
