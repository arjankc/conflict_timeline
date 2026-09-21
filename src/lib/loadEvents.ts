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

export function rowToEvent(row: RawCsvRow, sourceIndex: number): ConflictEvent | null {
  const detail = cell(row, 'Detail').replace(/\u00a0/g, ' ').trim()
  const rawDate = cell(row, 'Date')

  if (!detail || !rawDate) return null

  const parsed = parseDate(rawDate)

  return {
    // csvIndex + sortKey: stable for a given file, but breaks if rows are inserted. See DATA.md.
    id: `row-${sourceIndex}-${parsed.sortKey}`,
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

export function parseCsvEvents(csvText: string): ConflictEvent[] {
  const parsed = parse<RawCsvRow>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  })

  const events: ConflictEvent[] = []

  parsed.data.forEach((row, index) => {
    const event = rowToEvent(row, index)
    if (event) events.push(event)
  })

  events.sort((a, b) => {
    // Chronological feed. Id is the deterministic tie-break when two rows share a date.
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey
    return a.id.localeCompare(b.id)
  })

  return events
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
