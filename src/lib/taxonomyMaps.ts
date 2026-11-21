import {
  FACET_ORDER as GENERATED_FACET_ORDER,
  KEYWORD_ALIAS_TO_CANONICAL as GENERATED_ALIASES,
  KEYWORD_DISPLAY as GENERATED_DISPLAY,
  KEYWORD_FACET as GENERATED_FACET,
  KEYWORD_STATUS as GENERATED_STATUS,
  KEYWORD_VARIANTS as GENERATED_VARIANTS,
  TAXONOMY_DISTRICTS as GENERATED_DISTRICTS,
  VISIBLE_KEYWORD_CANONICALS as GENERATED_VISIBLE,
} from './keywordTaxonomy.generated'

/**
 * Live taxonomy maps. Seeded from the generated build-time module so the
 * archive works offline; replaced wholesale when a fresher Sheet CSV loads
 * (see applyTaxonomyCsv). Importers must read these bindings at call time,
 * never snapshot them at module load.
 */

export const RENDERED_STATUS = new Set(['active', 'review'])

export const aliasToCanonical: Record<string, string> = { ...GENERATED_ALIASES }
export const displayNames: Record<string, string> = { ...GENERATED_DISPLAY }
export const facetOf: Record<string, string> = { ...GENERATED_FACET }
export const statusOf: Record<string, string> = { ...GENERATED_STATUS }
export const variantsOf: Record<string, string[]> = Object.fromEntries(
  Object.entries(GENERATED_VARIANTS).map(([k, v]) => [k, [...v]]),
)
export const visibleKeys = new Set<string>(GENERATED_VISIBLE)
export const facetOrder: string[] = [...GENERATED_FACET_ORDER]
export const taxonomyDistricts: string[] = [...GENERATED_DISTRICTS]

const REQUIRED_COLUMNS = ['Term', 'Aliases', 'Facet', 'Status', 'Comment']
const VALID_STATUS = new Set(['active', 'review', 'pending', 'zero-hit'])

/** Must match the key cleaning in parseTags + the generator. */
export function normalizeTaxonomyKey(raw: string): string {
  return raw
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[./:;]+$/g, '')
    .trim()
    .toLowerCase()
}

function splitCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1 }
        else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

type ParsedTerm = {
  key: string
  term: string
  aliases: string[]
  facet: string
  status: string
}

/**
 * Validate a taxonomy CSV exactly like the generator does. Returns the parsed
 * terms, or an error string (maps left untouched on error).
 */
function parseTaxonomyCsv(csvText: string): { terms: ParsedTerm[] } | { error: string } {
  const rows = splitCsv(csvText)
  const header = (rows.shift() ?? []).map((h) => h.trim())
  for (const col of REQUIRED_COLUMNS) {
    if (!header.includes(col)) return { error: `taxonomy CSV missing column ${col}` }
  }
  const idx = Object.fromEntries(header.map((h, i) => [h, i]))
  const terms: ParsedTerm[] = []
  const seenTerms = new Map<string, number>()
  const aliasOwner = new Map<string, string>()
  for (let n = 0; n < rows.length; n += 1) {
    const r = rows[n]
    if (r.every((cell) => (cell ?? '').trim() === '')) continue
    const line = n + 2
    const term = (r[idx.Term] ?? '').trim()
    const facet = (r[idx.Facet] ?? '').trim()
    const status = (r[idx.Status] ?? '').trim()
    if (!term) return { error: `line ${line}: empty Term` }
    if (!VALID_STATUS.has(status)) {
      return { error: `line ${line} (${term}): bad Status ${JSON.stringify(status)}` }
    }
    const key = normalizeTaxonomyKey(term)
    if (!key) return { error: `line ${line}: Term normalizes to empty` }
    if (seenTerms.has(key)) {
      return { error: `line ${line} (${term}): duplicate of line ${seenTerms.get(key)}` }
    }
    seenTerms.set(key, line)
    const aliases = (r[idx.Aliases] ?? '').split(';').map((a) => a.trim()).filter(Boolean)
    for (const a of aliases) {
      const ak = normalizeTaxonomyKey(a)
      if (!ak || ak === key) continue
      if (aliasOwner.has(ak) && aliasOwner.get(ak) !== key) {
        return { error: `line ${line} (${term}): alias ${JSON.stringify(a)} already maps to another term` }
      }
      aliasOwner.set(ak, key)
    }
    terms.push({ key, term, aliases, facet, status })
  }
  return { terms }
}

/**
 * Replace the live maps with a freshly fetched Sheet CSV. Same validation as
 * the build-time generator; on any error the current maps are left untouched
 * (the app keeps working on the baked taxonomy).
 */
export function applyTaxonomyCsv(csvText: string): { applied: number } | { error: string } {
  const parsed = parseTaxonomyCsv(csvText)
  if ('error' in parsed) return parsed

  const nextAlias: Record<string, string> = {}
  const nextDisplay: Record<string, string> = {}
  const nextFacet: Record<string, string> = {}
  const nextStatus: Record<string, string> = {}
  const nextVariants: Record<string, string[]> = {}
  const nextVisible = new Set<string>()
  const nextDistricts: string[] = []
  const nextFacetOrder: string[] = []
  for (const t of parsed.terms) {
    nextDisplay[t.key] = t.term
    nextStatus[t.key] = t.status
    if (t.facet) {
      nextFacet[t.key] = t.facet
      if (!nextFacetOrder.includes(t.facet)) nextFacetOrder.push(t.facet)
    }
    nextAlias[t.key] = t.key
    nextVariants[t.key] = []
    if (RENDERED_STATUS.has(t.status)) nextVisible.add(t.key)
    if (t.facet === 'Districts' && (t.status === 'active' || t.status === 'zero-hit')) {
      nextDistricts.push(t.term)
    }
  }
  for (const t of parsed.terms) {
    for (const a of t.aliases) {
      const ak = normalizeTaxonomyKey(a)
      if (!ak || ak === t.key) continue
      nextAlias[ak] = t.key
      const raw = t.aliases.find((x) => normalizeTaxonomyKey(x) === ak)
      nextVariants[t.key].push(raw ?? ak)
    }
  }
  nextDistricts.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))

  // Commit: mutate in place so every importer sees the new maps.
  for (const k of Object.keys(aliasToCanonical)) delete aliasToCanonical[k]
  Object.assign(aliasToCanonical, nextAlias)
  for (const k of Object.keys(displayNames)) delete displayNames[k]
  Object.assign(displayNames, nextDisplay)
  for (const k of Object.keys(facetOf)) delete facetOf[k]
  Object.assign(facetOf, nextFacet)
  for (const k of Object.keys(statusOf)) delete statusOf[k]
  Object.assign(statusOf, nextStatus)
  for (const k of Object.keys(variantsOf)) delete variantsOf[k]
  Object.assign(variantsOf, nextVariants)
  visibleKeys.clear()
  for (const k of nextVisible) visibleKeys.add(k)
  facetOrder.length = 0
  facetOrder.push(...nextFacetOrder)
  taxonomyDistricts.length = 0
  taxonomyDistricts.push(...nextDistricts)
  return { applied: parsed.terms.length }
}

/** Reset maps to the baked build-time snapshot (tests). */
export function resetTaxonomyMaps(): void {
  for (const k of Object.keys(aliasToCanonical)) delete aliasToCanonical[k]
  Object.assign(aliasToCanonical, GENERATED_ALIASES)
  for (const k of Object.keys(displayNames)) delete displayNames[k]
  Object.assign(displayNames, GENERATED_DISPLAY)
  for (const k of Object.keys(facetOf)) delete facetOf[k]
  Object.assign(facetOf, GENERATED_FACET)
  for (const k of Object.keys(statusOf)) delete statusOf[k]
  Object.assign(statusOf, GENERATED_STATUS)
  for (const k of Object.keys(variantsOf)) delete variantsOf[k]
  Object.assign(
    variantsOf,
    Object.fromEntries(Object.entries(GENERATED_VARIANTS).map(([k, v]) => [k, [...v]])),
  )
  visibleKeys.clear()
  for (const k of GENERATED_VISIBLE) visibleKeys.add(k)
  facetOrder.length = 0
  facetOrder.push(...GENERATED_FACET_ORDER)
  taxonomyDistricts.length = 0
  taxonomyDistricts.push(...GENERATED_DISTRICTS)
}
