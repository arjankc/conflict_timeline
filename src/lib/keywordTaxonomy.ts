import {
  KEYWORD_ALIAS_TO_CANONICAL,
  KEYWORD_DISPLAY,
  KEYWORD_FACET,
  KEYWORD_VARIANTS,
  TAXONOMY_DISTRICTS,
  VISIBLE_KEYWORD_CANONICALS,
} from './keywordTaxonomy.generated'
import { formatKeywordLabel } from './parseTags'

/**
 * Hand-written helpers over the generated taxonomy
 * (taxonomy/keyword-taxonomy.csv → keywordTaxonomy.generated.ts).
 * Only Status active/review keywords render anywhere; pending/zero-hit
 * stay in the data (filterable, searchable, exportable) but invisible.
 */

const VISIBLE = new Set(VISIBLE_KEYWORD_CANONICALS)

/** Order of facet sections in the Filters drawer (Districts has its own UI). */
export const KEYWORD_FACETS = [
  'Action',
  'Policy',
  'Actors',
  'Institutions',
  'Transitional justice',
  'Political parties and movements',
  'Regions',
] as const

/** Canonical key for any raw keyword (alias → recommended, else itself). */
export function canonicalKeywordKey(raw: string): string {
  const key = raw
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[./:;]+$/g, '')
    .trim()
    .toLowerCase()
  if (!key) return ''
  return KEYWORD_ALIAS_TO_CANONICAL[key] ?? key
}

/** Display form: taxonomy Term when mapped, Title Case fallback otherwise. */
export function displayKeyword(raw: string): string {
  const canon = canonicalKeywordKey(raw)
  if (!canon) return raw
  return KEYWORD_DISPLAY[canon] ?? formatKeywordLabel(raw)
}

/** Whether a keyword may appear in pills, chips, counts, and suggestions. */
export function isVisibleKeyword(raw: string): boolean {
  const canon = canonicalKeywordKey(raw)
  return canon !== '' && VISIBLE.has(canon)
}

/** Facet for a keyword, if the taxonomy assigns one. */
export function keywordFacet(raw: string): string | undefined {
  return KEYWORD_FACET[canonicalKeywordKey(raw)]
}

/** Raw alias variants of a canonical key (for search recall). */
export function keywordVariants(canonicalKey: string): string[] {
  return KEYWORD_VARIANTS[canonicalKey.toLowerCase()] ?? []
}

/** Canonical district names from the taxonomy (lint asserts gazetteer sync). */
export function taxonomyDistricts(): string[] {
  return TAXONOMY_DISTRICTS
}
