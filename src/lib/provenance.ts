import type { ConfidenceLevel, EventSource } from '../types/event'

const URL_PATTERN = /https?:\/\/[^\s),;"]+/g

/** Split Sources on `;`, keep citation text, pull out embedded URLs. */
export function parseSources(value: string | undefined): EventSource[] {
  if (!value) return []
  const sources: EventSource[] = []
  for (const part of value.split(';')) {
    const raw = part.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
    if (!raw) continue
    const urls = raw.match(URL_PATTERN) ?? []
    const citation = raw
      .replace(URL_PATTERN, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:—–-])/g, '$1')
      .trim()
      .replace(/^[—–-]\s*/, '')
    // Skip bare file pointers like `batch3/source_06.txt` with no prose.
    if (!citation && urls.length === 0) continue
    sources.push({ citation: citation || raw, urls })
  }
  return sources
}

const CONFIDENCE_PATTERN = /^\s*(high|medium|low)\b\s*[—–\-:.]?\s*(.*)$/is

/** `high — rationale` → `{ level: 'high', note: 'rationale' }`. Unknown → null. */
export function parseConfidence(value: string | undefined): {
  level: ConfidenceLevel | null
  note: string
} {
  if (!value) return { level: null, note: '' }
  const match = value.replace(/\u00a0/g, ' ').trim().match(CONFIDENCE_PATTERN)
  if (!match) return { level: null, note: value.trim().slice(0, 280) }
  return {
    level: match[1].toLowerCase() as ConfidenceLevel,
    note: (match[2] ?? '').replace(/\s+/g, ' ').trim().slice(0, 280),
  }
}
