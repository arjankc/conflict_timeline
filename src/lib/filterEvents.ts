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

export function filterEvents(
  events: ConflictEvent[],
  filters: TimelineFilters,
): ConflictEvent[] {
  const needle = filters.search.trim().toLowerCase()

  return events.filter((event) => {
    if (needle && !event.detail.toLowerCase().includes(needle)) return false
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

export function countEventsByYear(
  events: ConflictEvent[],
  years: number[],
): Array<{ year: number; count: number }> {
  const counts = new Map<number, number>()
  for (const event of events) {
    if (event.year == null) continue
    counts.set(event.year, (counts.get(event.year) ?? 0) + 1)
  }

  return years.map((year) => ({ year, count: counts.get(year) ?? 0 }))
}

export function collectYears(events: ConflictEvent[]): number[] {
  const years = new Set<number>()
  for (const event of events) {
    if (event.year != null) years.add(event.year)
  }
  return [...years].sort((a, b) => a - b)
}
