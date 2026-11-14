import { describe, expect, it } from 'vitest'
import { buildTimelineRows, estimateRowHeight, yearAtOffset } from './timelineRows'
import type { ConflictEvent } from '../types/event'

function event(
  partial: Partial<ConflictEvent> & Pick<ConflictEvent, 'id' | 'detail' | 'sortKey'>,
): ConflictEvent {
  return {
    rawDate: '1/1/96',
    dateLabel: '1 January 1996',
    dateTime: '1996-01-01',
    year: 1996,
    precision: 'day',
    keywords: [],
    categories: [],
    organizations: [],
    sources: [],
    confidence: null,
    confidenceNote: '',
    districtOverride: [],
    victims: { killed: null, injured: null, disappeared: null },
    perpetrators: [],
    relatedIds: [],
    ...partial,
  }
}

describe('buildTimelineRows', () => {
  it('uses Event_ID permalink keys and skips a lone month heading', () => {
    const rows = buildTimelineRows([
      {
        year: 1996,
        events: [
          event({ id: 'NCT-0001', detail: 'Operation Romeo', sortKey: 19960102 }),
          event({ id: 'NCT-0002', detail: 'x'.repeat(300), sortKey: 19960115 }),
        ],
      },
    ])

    expect(rows.map((row) => row.kind)).toEqual(['year', 'event', 'event'])
    expect(rows[1]?.key).toBe('event-NCT-0001')
    expect(rows[0]?.kind === 'year' ? rows[0].key : '').toBe('year-1996')
  })

  it('inserts month headings when a year spans months', () => {
    const rows = buildTimelineRows([
      {
        year: 1996,
        events: [
          event({ id: 'NCT-0001', detail: 'January', sortKey: 19960102 }),
          event({ id: 'NCT-0002', detail: 'March', sortKey: 19960302 }),
        ],
      },
    ])
    expect(rows.map((row) => row.kind)).toEqual(['year', 'month', 'event', 'month', 'event'])
  })
})

describe('yearAtOffset', () => {
  it('reports the year that owns a scrolled offset', () => {
    const rows = buildTimelineRows([
      { year: 1995, events: [event({ id: 'NCT-0001', detail: 'Romeo', sortKey: 19951101, year: 1995 })] },
      { year: 1996, events: [event({ id: 'NCT-0002', detail: 'Later', sortKey: 19960213, year: 1996 })] },
    ])
    const offsets = rows.map((_, index) => index * 100)
    expect(yearAtOffset(rows, offsets, 0)).toBe(1995)
    expect(yearAtOffset(rows, offsets, 250)).toBe(1996)
  })
})

describe('estimateRowHeight', () => {
  it('gives long narratives more room than brief notes', () => {
    const brief = estimateRowHeight({
      kind: 'event',
      key: 'event-NCT-0001',
      dateHeadingLevel: 'h3',
      event: event({ id: 'NCT-0001', detail: 'Short', sortKey: 19951101 }),
    })
    const rich = estimateRowHeight({
      kind: 'event',
      key: 'event-NCT-0002',
      dateHeadingLevel: 'h3',
      event: event({ id: 'NCT-0002', detail: 'x'.repeat(300), sortKey: 19960101 }),
    })
    expect(rich).toBeGreaterThan(brief)
  })
})
