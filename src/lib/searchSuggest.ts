import type { ConflictEvent } from '../types/event'
import { effectiveDistricts } from './eventGeography'
import { formatCategoryLabel } from './parseTags'
import { isVisibleKeyword } from './keywordTaxonomy'

export type SuggestionKind =
  | 'theme'
  | 'category'
  | 'organization'
  | 'district'
  | 'year'
  | 'term'
  | 'event'

export type SearchSuggestion = {
  id: string
  label: string
  kind: SuggestionKind
  count: number
}

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'had',
  'has',
  'have',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'them',
  'there',
  'these',
  'they',
  'this',
  'to',
  'was',
  'were',
  'which',
  'who',
  'with',
])

const KIND_BOOST: Record<SuggestionKind, number> = {
  event: 8,
  year: 6,
  theme: 5,
  district: 5,
  organization: 4,
  category: 4,
  term: 1,
}

const KIND_RANK: Record<SuggestionKind, number> = {
  event: 0,
  theme: 1,
  district: 2,
  organization: 3,
  category: 4,
  year: 5,
  term: 6,
}

function addTerm(
  map: Map<string, SearchSuggestion>,
  label: string,
  kind: SuggestionKind,
  weight = 1,
): void {
  const key = label.toLowerCase()
  if (!key) return
  const existing = map.get(key)
  if (!existing) {
    map.set(key, { id: `${kind}:${key}`, label, kind, count: weight })
    return
  }
  existing.count += weight
  if (KIND_RANK[kind] < KIND_RANK[existing.kind]) {
    existing.kind = kind
    existing.id = `${kind}:${key}`
    existing.label = label
  }
}

function detailTerms(detail: string): string[] {
  const terms: string[] = []
  for (const raw of detail.split(/[^A-Za-z0-9]+/)) {
    const token = raw.trim()
    if (token.length < 4) continue
    if (STOPWORDS.has(token.toLowerCase())) continue
    if (/^\d+$/.test(token)) continue
    terms.push(token)
  }
  return terms
}

/** Build a compact suggestion dictionary from the loaded archive (no server). */
export function buildSearchIndex(events: ConflictEvent[]): SearchSuggestion[] {
  const map = new Map<string, SearchSuggestion>()

  for (const event of events) {
    addTerm(map, event.id.toUpperCase(), 'event')
    // Only taxonomy-visible keywords are suggested (pending/zero-hit stay out).
    for (const tag of event.keywords) {
      if (isVisibleKeyword(tag)) addTerm(map, tag, 'theme')
    }
    for (const tag of event.categories) addTerm(map, formatCategoryLabel(tag), 'category')
    for (const tag of event.organizations) addTerm(map, tag, 'organization')
    for (const district of effectiveDistricts(event)) addTerm(map, district, 'district')
    if (event.year != null) addTerm(map, String(event.year), 'year')
    for (const term of detailTerms(event.detail)) addTerm(map, term, 'term')
  }

  return [...map.values()]
}

function matchScore(label: string, query: string): number | null {
  const hay = label.toLowerCase()
  if (hay === query) return 30
  if (hay.startsWith(query)) return 20
  const words = hay.split(/[\s/'’.–—-]+/)
  if (words.some((word) => word.startsWith(query))) return 16
  if (hay.includes(query)) return 8
  return null
}

export function shouldOfferSuggestions(query: string): boolean {
  return query.trim().length >= 2
}

/** Ranked typeahead. Prefixes beat mid-string hits; tags beat free-text terms. */
export function suggestSearch(
  index: SearchSuggestion[],
  query: string,
  limit = 8,
): SearchSuggestion[] {
  if (!shouldOfferSuggestions(query)) return []
  const needle = query.trim().toLowerCase()

  const ranked = index
    .map((item) => {
      const match = matchScore(item.label, needle)
      if (match == null) return null
      return {
        item,
        score: match + KIND_BOOST[item.kind] + Math.min(item.count, 12),
      }
    })
    .filter((row): row is { item: SearchSuggestion; score: number } => row != null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.item.count !== a.item.count) return b.item.count - a.item.count
      return a.item.label.localeCompare(b.item.label, 'en', { sensitivity: 'base' })
    })

  return ranked.slice(0, limit).map((row) => row.item)
}

export function suggestionKindLabel(kind: SuggestionKind): string {
  if (kind === 'theme') return 'Theme'
  if (kind === 'category') return 'Category'
  if (kind === 'organization') return 'Organization'
  if (kind === 'district') return 'District'
  if (kind === 'year') return 'Year'
  if (kind === 'event') return 'Event ID'
  return 'In events'
}
