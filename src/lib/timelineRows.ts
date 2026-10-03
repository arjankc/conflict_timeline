import { eventCardId } from './eventAnchor'
import { eventDensity } from './eventCardTeaser'
import { groupEventsByMonth, yearSectionId, type YearGroup } from './filterEvents'
import { MONTH_NAMES } from './parseDate'
import { findRowIndex } from './windowRange'
import type { ConflictEvent } from '../types/event'

export type TimelineRow =
  | {
      kind: 'year'
      key: string
      year: number | null
      count: number
      sectionId: string
    }
  | { kind: 'month'; key: string; label: string }
  | {
      kind: 'event'
      key: string
      event: ConflictEvent
      dateHeadingLevel: 'h3' | 'h4'
    }

export function buildTimelineRows(groups: YearGroup[]): TimelineRow[] {
  const rows: TimelineRow[] = []

  for (const group of groups) {
    const months = groupEventsByMonth(group.events)
    const showMonths = months.length > 1
    const sectionId = yearSectionId(group.year)
    rows.push({
      kind: 'year',
      key: sectionId,
      year: group.year,
      count: group.events.length,
      sectionId,
    })

    for (const monthGroup of months) {
      if (showMonths) {
        const label = monthGroup.month
          ? MONTH_NAMES[monthGroup.month - 1]
          : 'Date unknown'
        rows.push({
          kind: 'month',
          key: `${sectionId}-month-${monthGroup.month ?? 'undated'}`,
          label,
        })
      }

      for (const event of monthGroup.events) {
        rows.push({
          kind: 'event',
          key: eventCardId(event.id),
          event,
          dateHeadingLevel: showMonths ? 'h4' : 'h3',
        })
      }
    }
  }

  return rows
}

export function estimateRowHeight(row: TimelineRow): number {
  if (row.kind === 'year') return 84
  if (row.kind === 'month') return 40
  const density = eventDensity(row.event.detail)
  if (density === 'brief') return 136
  if (density === 'rich') return 268
  return 196
}

/** Year heading that owns this offset, walking backward through the flat rows. */
export function yearAtOffset(
  rows: TimelineRow[],
  offsets: number[],
  y: number,
): number | null {
  if (rows.length === 0) return null
  const index = offsets.length === rows.length ? findRowIndex(offsets, y) : 0
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    const row = rows[cursor]
    if (row.kind === 'year') return row.year
  }
  return null
}
