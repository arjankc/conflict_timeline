import {
  aliasToCanonical,
  displayNames,
  facetOf,
  facetOrder as liveFacetOrder,
  normalizeTaxonomyKey,
  variantsOf,
  visibleKeys,
} from './taxonomyMaps'
import { formatKeywordLabel } from './parseTags'

/**
 * Hand-written helpers over the live taxonomy maps (see taxonomyMaps.ts).
 * Only Status active/review keywords render anywhere; pending/zero-hit
 * stay in the data (filterable, searchable, exportable) but invisible.
 */

/** Facet section order for the Filters drawer (live, Sheet-driven). */
export function facetOrder(): string[] {
  return [...liveFacetOrder]
}

/** Canonical key for any raw keyword (alias → recommended, else itself). */
export function canonicalKeywordKey(raw: string): string {
  const key = normalizeTaxonomyKey(raw)
  if (!key) return ''
  return aliasToCanonical[key] ?? key
}

/** Display form: taxonomy Term when mapped, Title Case fallback otherwise. */
export function displayKeyword(raw: string): string {
  const canon = canonicalKeywordKey(raw)
  if (!canon) return raw
  return displayNames[canon] ?? formatKeywordLabel(raw)
}

/** Whether a keyword may appear in pills, chips, counts, and suggestions. */
export function isVisibleKeyword(raw: string): boolean {
  const canon = canonicalKeywordKey(raw)
  return canon !== '' && visibleKeys.has(canon)
}

/** Facet for a keyword, if the taxonomy assigns one. */
export function keywordFacet(raw: string): string | undefined {
  return facetOf[canonicalKeywordKey(raw)]
}

/** Raw alias variants of a canonical key (for full-text search recall). */
export function keywordVariants(canonicalKey: string): string[] {
  return variantsOf[canonicalKey.toLowerCase()] ?? []
}
