import { canonicalDistrict } from './districts'

/** Non-negative integer or null for blank/invalid (never 0-by-default). */
export function parseCount(value: string | undefined): number | null {
  if (!value) return null
  const trimmed = value.replace(/\u00a0/g, ' ').trim().replace(/,/g, '')
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return null
  const n = Number(trimmed)
  if (!Number.isSafeInteger(n) || n < 0 || n > 1000000) return null
  return n
}

/** Split `;`-separated perpetrator attributions, trimmed, de-duplicated. */
export function parsePerpetrators(value: string | undefined): string[] {
  if (!value) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of value.split(';')) {
    const label = part.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out
}

const RELATED_ID_PATTERN = /^NCT-\d{4}$/i

/**
 * Parse `Related_Events` (`;`, `,` or whitespace separated `NCT-…` ids).
 * Keeps format-valid ids only, deduped, self excluded, max 12.
 */
export function parseRelatedIds(value: string | undefined, selfId: string): string[] {
  if (!value) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of value.split(/[;,\s]+/)) {
    const id = part.trim().toUpperCase()
    if (!id || !RELATED_ID_PATTERN.test(id)) continue
    if (id === selfId.toUpperCase()) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= 12) break
  }
  return out
}

/** Parse explicit `District` column (canonicalized, `;` preferred, `,` fallback). */
export function parseDistrictOverride(value: string | undefined): string[] {
  if (!value) return []
  const parts = value.includes(';') ? value.split(';') : value.split(',')
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of parts) {
    const district = canonicalDistrict(part)
    if (!district || seen.has(district)) continue
    seen.add(district)
    out.push(district)
  }
  return out
}
