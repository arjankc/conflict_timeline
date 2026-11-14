import { DISTRICTS, canonicalDistrict } from './districts'
import type { ConflictEvent } from '../types/event'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Infer districts for an event: keyword exact/alias match first, then
 * word-boundary match in Detail. Keywords win because detail prose can
 * mention places in passing. Returns canonical names, first-seen order.
 * Results are memoized per event object (the feed calls this per card).
 */
const inferCache = new WeakMap<object, string[]>()

export function inferDistricts(event: Pick<ConflictEvent, 'keywords' | 'detail'>): string[] {
  const cached = inferCache.get(event)
  if (cached) return cached
  const out = inferDistrictsUncached(event)
  inferCache.set(event, out)
  return out
}

function inferDistrictsUncached(event: Pick<ConflictEvent, 'keywords' | 'detail'>): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  for (const keyword of event.keywords) {
    const district = canonicalDistrict(keyword)
    if (district && !seen.has(district)) {
      seen.add(district)
      out.push(district)
    }
  }

  if (out.length === 0) {
    const detail = event.detail
    if (detail) {
      for (const district of listDistrictsForScan()) {
        if (seen.has(district.canonical)) continue
        const pattern = new RegExp(`\\b${escapeRegExp(district.match)}\\b`, 'i')
        if (pattern.test(detail)) {
          seen.add(district.canonical)
          out.push(district.canonical)
        }
      }
    }
  }

  return out
}

/**
 * Effective districts: explicit `District` column override wins when present,
 * else inference from keywords/detail. Single place for UI, search, counts.
 */
export function effectiveDistricts(
  event: Pick<ConflictEvent, 'keywords' | 'detail'> & { districtOverride?: string[] },
): string[] {
  if (event.districtOverride && event.districtOverride.length > 0) {
    return event.districtOverride
  }
  return inferDistricts(event)
}

const CITY_MATCHES: Array<{ match: string; canonical: string }> = [
  { match: 'Nepalgunj', canonical: 'Banke' },
  { match: 'Birgunj', canonical: 'Parsa' },
  { match: 'Biratnagar', canonical: 'Morang' },
  { match: 'Pokhara', canonical: 'Kaski' },
  { match: 'Janakpurdham', canonical: 'Dhanusha' },
  { match: 'Janakpur', canonical: 'Dhanusha' },
  { match: 'Dhangadhi', canonical: 'Kailali' },
  { match: 'Mahendranagar', canonical: 'Kanchanpur' },
  { match: 'Tansen', canonical: 'Palpa' },
  { match: 'Panauti', canonical: 'Kavrepalanchok' },
]

function listDistrictsForScan(): Array<{ match: string; canonical: string }> {
  return [
    ...DISTRICTS.map((canonical) => ({ match: canonical, canonical })),
    { match: 'Kavre', canonical: 'Kavrepalanchok' },
    ...CITY_MATCHES,
  ]
}
