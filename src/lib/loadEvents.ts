import { parse } from 'papaparse'
import type { ConflictEvent, RawCsvRow } from '../types/event'
import { parseDate } from './parseDate'
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

  return {
    id: eventIdForRow(row, sourceIndex),
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

export async function loadEvents(): Promise<ConflictEvent[]> {
  const url = import.meta.env.VITE_DATA_URL || DEFAULT_DATA_PATH
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Unable to load timeline data (${response.status})`)
  }

  const csvText = await response.text()
  return parseCsvEvents(csvText)
}
