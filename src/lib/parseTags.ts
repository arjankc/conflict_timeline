/**
 * Canonical display names for keyword variants found in the sheet.
 * Source of truth is taxonomy/keyword-taxonomy.csv, compiled to
 * keywordTaxonomy.generated.ts (alias map + display names). The hand map
 * below is gone — run node scripts/keyword-taxonomy.mjs after editing the CSV.
 */

import {
  aliasToCanonical,
  displayNames,
} from './taxonomyMaps'

function canonicalKeywordDisplay(tag: string): string {
  // Collapse whitespace, strip trailing ./:/; fragments like `Maoist.` / `Maoist/`.
  const cleaned = tag
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[./:;]+$/g, '')
    .trim()
  if (!cleaned) return ''
  const key = cleaned.toLowerCase()
  const canonical = aliasToCanonical[key] ?? key
  return displayNames[canonical] ?? cleaned
}

export function canonicalKeyword(tag: string): string {
  return canonicalKeywordDisplay(tag)
}

/**
 * Display-only humanization for category values (`transitional_justice` →
 * `Transitional Justice`). Filter values, URLs, and CSV parsing keep the raw
 * underscore form — this is for visible text so cards never show ALL_CAPS
 * underscore pills.
 */
export function formatCategoryLabel(label: string): string {
  return label
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map((word) =>
      /[A-Za-z]/.test(word)
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word,
    )
    .join(' ')
}

/**
 * Display-only Title Case for keyword labels (`killing` → `Killing`,
 * `transitional justice` → `Transitional Justice`). Runs of letters that are
 * already all-uppercase (`TRC`, `CPN`, `II`, `NPL`) are acronyms/codes and
 * kept as-is; apostrophes stay inside words (`people's` → `People's`).
 * Filter values, URLs, and counts keep the raw label.
 */
export function formatKeywordLabel(label: string): string {
  return label
    .split(/([^A-Za-z']+)/)
    .map((part) => {
      if (!/[A-Za-z]/.test(part)) return part
      const letters = part.replace(/'/g, '')
      if (letters === letters.toUpperCase()) return part
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join('')
}

function parseDelimitedTags(value: string | undefined, delimiter: string): string[] {
  if (!value) return []

  const seen = new Set<string>()
  const tags: string[] = []

  for (const part of value.split(delimiter)) {
    const tag = part.replace(/\u00a0/g, ' ').trim()
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }

  return tags
}

/** Split a comma-separated field into trimmed, non-empty tags. Display text is preserved. */
export function parseTags(value: string | undefined): string[] {
  if (!value) return []
  const seen = new Set<string>()
  const tags: string[] = []
  for (const part of value.split(',')) {
    const canonical = canonicalKeyword(part)
    if (!canonical) continue
    const key = canonical.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(canonical)
  }
  return tags
}

/**
 * Split Organizations on semicolons so names can still contain commas.
 * Legacy rows in the slim CSV use commas (`Royal Nepal Army, Nepal Army`)
 * while comma-bearing official names use semicolons
 * (`Office …; Ministry of Law, Justice …`). When a cell has no semicolon,
 * fall back to comma-splitting so legacy lists do not stay merged.
 */
export function parseOrganizations(value: string | undefined): string[] {
  if (!value) return []
  if (value.includes(';')) return parseDelimitedTags(value, ';')
  return parseDelimitedTags(value, ',')
}

/** Unique tag list for filter controls, keeping first-seen display casing. */
export function uniqueTags(values: string[][]): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const group of values) {
    for (const tag of group) {
      const key = tag.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      tags.push(tag)
    }
  }

  return tags.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
}

/** Frequency-ranked tag counts; the Filters drawer groups them by taxonomy facet. */
export type TagCount = {
  label: string
  count: number
}

/** Count tags across events, keeping first-seen casing, ordered by frequency. */
export function countTags(values: string[][], limit?: number): TagCount[] {
  const counts = new Map<string, TagCount>()

  for (const group of values) {
    const seenInEvent = new Set<string>()
    for (const tag of group) {
      const key = tag.toLowerCase()
      if (seenInEvent.has(key)) continue
      seenInEvent.add(key)
      const existing = counts.get(key)
      if (existing) existing.count += 1
      else counts.set(key, { label: tag, count: 1 })
    }
  }

  const ranked = [...counts.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })
  })

  return limit == null ? ranked : ranked.slice(0, limit)
}
