import type { ConflictEvent } from '../types/event'
import { effectiveDistricts } from './eventGeography'

export type EventSearchIndex = {
  /** Lowercased Event_ID, dates, narrative, and tags. Built once per event object. */
  searchText: string
  keywords: Set<string>
  categories: Set<string>
  organizations: Set<string>
  districts: Set<string>
}

const cache = new WeakMap<ConflictEvent, EventSearchIndex>()

function lowerSet(values: string[]): Set<string> {
  const set = new Set<string>()
  for (const value of values) set.add(value.toLowerCase())
  return set
}

function buildIndex(event: ConflictEvent): EventSearchIndex {
  const districts = effectiveDistricts(event)
  return {
    searchText: [
      event.id,
      event.rawDate,
      event.dateLabel,
      event.year ?? '',
      event.detail,
      event.keywords.join('\n'),
      event.categories.join('\n'),
      event.organizations.join('\n'),
      (event.perpetrators ?? []).join('\n'),
      event.confidence ?? '',
      event.confidenceNote ?? '',
      (event.sources ?? []).map((source) => source.citation).join('\n'),
      districts.join('\n'),
    ]
      .join('\n')
      .toLowerCase(),
    keywords: lowerSet(event.keywords),
    categories: lowerSet(event.categories),
    organizations: lowerSet(event.organizations),
    districts: lowerSet(districts),
  }
}

/** Indexed fields for filter/search. Reuses the index for the same event object. */
export function eventSearchIndex(event: ConflictEvent): EventSearchIndex {
  const hit = cache.get(event)
  if (hit) return hit
  const built = buildIndex(event)
  cache.set(event, built)
  return built
}

export function warmEventSearch(event: ConflictEvent): void {
  eventSearchIndex(event)
}
