/** Split a comma-separated field into trimmed, non-empty tags. Display text is preserved. */
export function parseTags(value: string | undefined): string[] {
  if (!value) return []

  const seen = new Set<string>()
  const tags: string[] = []

  for (const part of value.split(',')) {
    const tag = part.replace(/\u00a0/g, ' ').trim()
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }

  return tags
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
