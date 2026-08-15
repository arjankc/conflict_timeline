export type HighlightChunk = {
  text: string
  match: boolean
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Split plain text so search hits can be wrapped in `<mark>` as React nodes.
 * Does not interpret the source as HTML.
 */
export function splitHighlight(text: string, query: string): HighlightChunk[] {
  const needle = query.trim()
  if (!needle) return [{ text, match: false }]

  const pattern = new RegExp(escapeRegExp(needle), 'gi')
  const chunks: HighlightChunk[] = []
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > lastIndex) {
      chunks.push({ text: text.slice(lastIndex, start), match: false })
    }
    chunks.push({ text: match[0], match: true })
    lastIndex = start + match[0].length
  }

  if (lastIndex < text.length) {
    chunks.push({ text: text.slice(lastIndex), match: false })
  }

  return chunks.length > 0 ? chunks : [{ text, match: false }]
}
