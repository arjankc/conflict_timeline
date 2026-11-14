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

/** Relative URL so GitHub Pages (`/conflict_timeline/`) and a later Capacitor shell both resolve. */
const DEFAULT_DATA_PATH = `${import.meta.env.BASE_URL}data/mastersheet.csv`

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

/** Rows per turn so the main thread can paint between chunks of the ~2150-row sheet. */
export const PARSE_BATCH_SIZE = 80

const CSV_CACHE_KEY = 'nct-mastersheet-v1'

export type TimelineLoadUpdate = {
  events: ConflictEvent[]
  done: boolean
  error?: string
}

type StoredCsv = { etag: string | null; body: string }

function readStoredCsv(): StoredCsv | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(CSV_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredCsv
    if (!parsed || typeof parsed.body !== 'string' || !parsed.body.includes('Event_ID')) {
      return null
    }
    return {
      etag: typeof parsed.etag === 'string' ? parsed.etag : null,
      body: parsed.body,
    }
  } catch {
    return null
  }
}

function writeStoredCsv(value: StoredCsv): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CSV_CACHE_KEY, JSON.stringify(value))
  } catch {
    /* quota or private mode — the network copy still renders */
  }
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

async function fetchCsv(): Promise<{ body: string; etag: string | null; notModified: boolean }> {
  const url = import.meta.env.VITE_DATA_URL || DEFAULT_DATA_PATH
  const stored = readStoredCsv()
  const headers = new Headers()
  if (stored?.etag) headers.set('If-None-Match', stored.etag)
  const response = await fetch(url, { headers })
  if (response.status === 304 && stored) {
    return { body: stored.body, etag: stored.etag, notModified: true }
  }
  if (!response.ok) {
    throw new Error(`Unable to load timeline data (${response.status})`)
  }
  return {
    body: await response.text(),
    etag: response.headers.get('etag'),
    notModified: false,
  }
}

/**
 * Offline/field fallback: `dist/data/events.json` (raw row mirror from
 * `scripts/events-json.mjs`). Only tried for the default path when the CSV
 * fetch fails. Returns CSV text so the progressive parser stays single-path.
 */
async function fetchJsonFallback(): Promise<string | null> {
  if (import.meta.env.VITE_DATA_URL) return null
  const url = `${import.meta.env.BASE_URL}data/events.json`
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const rows = (await response.json()) as RawCsvRow[]
    if (!Array.isArray(rows) || rows.length === 0) return null
    const header = 'Event_ID,Date,Detail,Keywords,Category,Organizations,Sources,Confidence'
    const esc = (value: string | undefined): string => {
      const flat = (value ?? '').replace(/\r?\n/g, ' ')
      if (/[",\n]/.test(flat)) return `"${flat.replace(/"/g, '""')}"`
      return flat
    }
    const lines = rows.map((row) =>
      [
        esc(row['Event_ID']),
        esc(row['Date']),
        esc(row['Detail']),
        esc(row['Keywords']),
        esc(row['Category']),
        esc(row['Organizations']),
        esc(row['Sources']),
        esc(row['Confidence']),
      ].join(','),
    )
    return [header, ...lines].join('\n')
  } catch {
    return null
  }
}

async function runTimelineLoad() {
  const stored = readStoredCsv()
  let generation = 0
  let cancel: (() => void) | null = null
  let parsingBody: string | null = null

  const startParse = (body: string) => {
    if (parsingBody === body) return
    const token = ++generation
    parsingBody = body
    cancel?.()
    cancel = parseCsvEventsProgressive(body, (events, done) => {
      if (token !== generation) return
      publish({ events, done })
    })
  }

  if (stored?.body) startParse(stored.body)

  try {
    const result = await fetchCsv()
    writeStoredCsv({ etag: result.etag, body: result.body })
    startParse(result.body)
  } catch (error) {
    // Field fallback: events.json mirror (no Sources/Confidence) when CSV is unreachable.
    try {
      const fallback = await fetchJsonFallback()
      if (fallback) {
        startParse(fallback)
        return
      }
    } catch {
      /* fall through to the error below */
    }
    if (parsingBody) return
    if (published && published.events.length > 0) {
      publish({ events: published.events, done: true })
      return
    }
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
