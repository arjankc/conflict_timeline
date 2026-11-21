import { parse, type Parser } from 'papaparse'
import type { ConflictEvent, RawCsvRow } from '../types/event'
import { warmEventSearch } from './eventSearch'
import { parseDate } from './parseDate'
import {
  parseCount,
  parseDistrictOverride,
  parsePerpetrators,
  parseRelatedIds,
} from './enrichment'
import { parseConfidence, parseSources } from './provenance'
import { parseOrganizations, parseTags } from './parseTags'
import { applyTaxonomyCsv } from './taxonomyMaps'

/** Relative URL so GitHub Pages (`/conflict_timeline/`) and a later Capacitor shell both resolve. */
const DEFAULT_DATA_PATH = `${import.meta.env.BASE_URL}data/mastersheet.csv`

/**
 * Live taxonomy Sheet URL (repo variable `VITE_TAXONOMY_CSV_URL`).
 * Unset in dev, so local work uses the baked generated maps; production
 * wires the published Keywords tab. Null means "no live taxonomy".
 */
const TAXONOMY_URL: string = import.meta.env.VITE_TAXONOMY_CSV_URL || import.meta.env.TAXONOMY_CSV_URL || ''

/**
 * Fetch the live taxonomy CSV, or null when no Sheet is configured (dev).
 * Throws on network failure — the caller treats a configured-but-broken
 * Sheet as a load error rather than silently rendering stale taxonomy.
 */
async function fetchTaxonomyCsv(): Promise<string | null> {
  if (!TAXONOMY_URL) return null
  const response = await fetch(TAXONOMY_URL, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`taxonomy fetch failed (${response.status})`)
  return response.text()
}

function cell(row: RawCsvRow, key: string): string {
  const direct = row[key]
  if (typeof direct === 'string') return direct.trim()

  // Sheets exports often add a leading empty column or pad header names with spaces.
  const match = Object.entries(row).find(
    ([header]) => header.trim().toLowerCase() === key.toLowerCase(),
  )
  return typeof match?.[1] === 'string' ? match[1].trim() : ''
}

/**
 * Prefer the sheet's Event_ID. A missing id is not invented and is not a
 * public permalink — only fixtures without the column hit this path.
 */
function eventIdForRow(row: RawCsvRow, sourceIndex: number): string {
  const eventId = cell(row, 'Event_ID')
  if (eventId) return eventId
  return `unassigned-${sourceIndex}`
}

export function rowToEvent(row: RawCsvRow, sourceIndex: number): ConflictEvent | null {
  const detail = cell(row, 'Detail').replace(/\u00a0/g, ' ').trim()
  const rawDate = cell(row, 'Date')

  if (!detail || !rawDate) return null

  const parsed = parseDate(rawDate)
  const confidence = parseConfidence(cell(row, 'Confidence'))
  const id = eventIdForRow(row, sourceIndex)

  return {
    id,
    rawDate,
    sortKey: parsed.sortKey,
    dateLabel: parsed.dateLabel,
    dateTime: parsed.dateTime,
    year: parsed.year,
    precision: parsed.precision,
    detail,
    keywords: parseTags(cell(row, 'Keywords')),
    categories: parseTags(cell(row, 'Category')),
    organizations: parseOrganizations(cell(row, 'Organizations')),
    sources: parseSources(cell(row, 'Sources')),
    confidence: confidence.level,
    confidenceNote: confidence.note,
    districtOverride: parseDistrictOverride(cell(row, 'District')),
    victims: {
      killed: parseCount(cell(row, 'Victims_Killed')),
      injured: parseCount(cell(row, 'Victims_Injured')),
      disappeared: parseCount(cell(row, 'Victims_Disappeared')),
    },
    perpetrators: parsePerpetrators(cell(row, 'Perpetrator_Alleged')),
    relatedIds: parseRelatedIds(cell(row, 'Related_Events'), id),
  }
}

/** Keep the first row for an Event_ID. Later copies are different incidents, not merges. */
export function takeUniqueEvent(
  event: ConflictEvent | null,
  seen: Set<string>,
  into: ConflictEvent[],
): void {
  if (!event) return
  if (seen.has(event.id)) {
    console.warn(
      `Duplicate Event_ID ${event.id} skipped; keeping the first row.`,
    )
    return
  }
  seen.add(event.id)
  into.push(event)
  warmEventSearch(event)
}

export function sortEvents(events: ConflictEvent[]): ConflictEvent[] {
  events.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey
    return a.id.localeCompare(b.id)
  })
  return events
}

export function parseCsvEvents(csvText: string): ConflictEvent[] {
  const parsed = parse<RawCsvRow>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  })

  const events: ConflictEvent[] = []
  const seen = new Set<string>()

  parsed.data.forEach((row, index) => {
    takeUniqueEvent(rowToEvent(row, index), seen, events)
  })

  return sortEvents(events)
}

/** Rows per turn so the main thread can paint between chunks of the ~2112-row sheet. */
export const PARSE_BATCH_SIZE = 80

export type TimelineLoadUpdate = {
  events: ConflictEvent[]
  done: boolean
  error?: string
}

/**
 * Parse in batches. `onBatch` sees a growing list; `done` is the sorted snapshot.
 * Returns a cancel function. Duplicate Event_IDs are skipped, not merged.
 */
export function parseCsvEventsProgressive(
  csvText: string,
  onBatch: (events: ConflictEvent[], done: boolean) => void,
): () => void {
  let cancelled = false
  let finished = false
  let parser: Parser | undefined
  const events: ConflictEvent[] = []
  const seen = new Set<string>()
  let sourceIndex = 0
  let sinceFlush = 0

  parse<RawCsvRow>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    step(result, stepParser) {
      parser = stepParser
      if (cancelled) {
        stepParser.abort()
        return
      }
      takeUniqueEvent(rowToEvent(result.data, sourceIndex), seen, events)
      sourceIndex += 1
      sinceFlush += 1
      if (sinceFlush < PARSE_BATCH_SIZE) return
      sinceFlush = 0
      const snapshot = events.slice()
      stepParser.pause()
      setTimeout(() => {
        if (cancelled || finished) return
        onBatch(snapshot, false)
        stepParser.resume()
      }, 0)
    },
    complete() {
      if (cancelled || finished) return
      finished = true
      sortEvents(events)
      onBatch(events.slice(), true)
    },
  })

  return () => {
    cancelled = true
    parser?.abort()
  }
}

let loadStarted = false
let published: TimelineLoadUpdate | null = null
const listeners = new Set<(update: TimelineLoadUpdate) => void>()

function publish(update: TimelineLoadUpdate) {
  published = update
  for (const listener of listeners) listener(update)
}

async function fetchCsv(): Promise<string> {
  const url = import.meta.env.VITE_DATA_URL || DEFAULT_DATA_PATH
  // Never serve the Sheet from the browser HTTP cache: Google marks the
  // export max-age=300, so plain refreshes could show up-to-5-minute-old
  // edits. (Google's own export generation can still lag edits by minutes.)
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Unable to load timeline data (${response.status})`)
  }
  return response.text()
}

/**
 * Live-only load: the events CSV and the taxonomy CSV are fetched fresh on
 * every page load. There is deliberately no localStorage cache and no
 * events.json fallback — the committed files go stale once editors work in
 * the Sheet, and showing stale data silently is worse than showing an
 * honest error with a retry button. (Dev builds with no Sheet URLs set
 * simply load the committed CSVs; the exported mirror in dist/ remains for
 * researchers.)
 */
async function runTimelineLoad() {
  try {
    const [taxResult, csvResult] = await Promise.allSettled([fetchTaxonomyCsv(), fetchCsv()])
    if (taxResult.status === 'rejected') {
      throw new Error('The live keyword list could not be reached. Check your connection and try again.')
    }
    if (csvResult.status === 'rejected') throw csvResult.reason
    if (taxResult.value) {
      const applied = applyTaxonomyCsv(taxResult.value)
      if ('error' in applied) {
        throw new Error(`The live keyword list is invalid: ${applied.error}`)
      }
    }
    await new Promise<void>((resolve) => {
      parseCsvEventsProgressive(csvResult.value, (events, done) => {
        publish({ events, done })
        if (done) resolve()
      })
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load timeline data'
    publish({ events: [], done: true, error: message })
  }
}

/** One in-flight CSV fetch per page load. Later subscribers receive the same snapshots. */
export function subscribeTimelineLoad(
  listener: (update: TimelineLoadUpdate) => void,
): () => void {
  listeners.add(listener)
  if (published) listener(published)
  if (!loadStarted) {
    loadStarted = true
    void runTimelineLoad()
  }
  return () => {
    listeners.delete(listener)
  }
}

export function loadEvents(): Promise<ConflictEvent[]> {
  if (published?.done && !published.error) return Promise.resolve(published.events)
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {}
    let completed = false
    unsubscribe = subscribeTimelineLoad((update) => {
      if (!update.done) return
      completed = true
      unsubscribe()
      if (update.error && update.events.length === 0) {
        reject(new Error(update.error))
        return
      }
      resolve(update.events)
    })
    if (completed) unsubscribe()
  })
}
