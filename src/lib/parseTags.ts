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
  return parseDelimitedTags(value, ',')
}

/** Split Organizations on semicolons so names can still contain commas. */
export function parseOrganizations(value: string | undefined): string[] {
  return parseDelimitedTags(value, value?.includes(';') ? ';' : ',')
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
