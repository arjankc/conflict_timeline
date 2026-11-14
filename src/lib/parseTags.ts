/**
 * Canonical display names for keyword variants found in the sheet.
 * Keys are lowercased, punctuation-stripped forms; values are the display form.
 * The sheet is not rewritten — this maps at parse time so filters merge.
 */
const KEYWORD_ALIASES: Record<string, string> = {
  'maoist': 'Maoist',
  'maoist offensive': 'Maoist offensive',
  'nepal police': 'police',
  'police shooting': 'police shooting',
  'police killings': 'police killings',
  'police crackdown': 'police crackdown',
  'armed police force': 'APF',
  'cpn-maoist': 'CPN-Maoist',
  'unified cpn-maoist': 'Unified CPN-Maoist',
  'ucpn-m': 'UCPN-M',
  'cpn-uml': 'CPN-UML',
  'nepali congress': 'Nepali Congress',
  'truth and reconciliation commission': 'TRC',
  'commission of investigation on enforced disappeared persons': 'CIEDP',
  'young communist league': 'YCL',
}

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
  return KEYWORD_ALIASES[key] ?? cleaned
}

export function canonicalKeyword(tag: string): string {
  return canonicalKeywordDisplay(tag)
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

/** Frequency-ranked chips in the filter bar; remaining keywords stay on cards. */
export const KEYWORD_CLOUD_LIMIT = 16

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
