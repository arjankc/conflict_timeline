import { describe, expect, it } from 'vitest'
import { eventsToCsv, eventsToJson } from './exportView'
import type { ConflictEvent } from '../types/event'

function event(): ConflictEvent {
  return {
    id: 'NCT-0001',
    rawDate: '11/1/95',
    sortKey: 19951101,
    dateLabel: '1 November 1995',
    dateTime: '1995-11-01',
    year: 1995,
    precision: 'day',
    detail: 'Operation Romeo, "quoted" crackdown',
    keywords: ['Rolpa'],
    categories: ['disappearance'],
    organizations: ['Nepal Police'],
    sources: [{ citation: 'HRW report', urls: ['https://example.org/r'] }],
    confidence: 'high',
    confidenceNote: 'solid',
    districtOverride: ['Rolpa'],
    victims: { killed: 132, injured: null, disappeared: null },
    perpetrators: ['Nepal Police'],
    relatedIds: ['NCT-0002'],
  }
}

describe('eventsToCsv', () => {
  it('quotes cells with commas/quotes and includes enrichment columns', () => {
    const csv = eventsToCsv([event()])
    const [header, row] = csv.split('\n')
    expect(header).toContain('Victims_Killed')
    expect(header).toContain('Related_Events')
    expect(row).toContain('"Operation Romeo, ""quoted"" crackdown"')
    expect(row).toContain('132')
    expect(row).toContain('NCT-0002')
  })
})

describe('eventsToJson', () => {
  it('serializes the filtered view with provenance', () => {
    const parsed = JSON.parse(eventsToJson([event()])) as Array<{ id: string }>
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.id).toBe('NCT-0001')
  })
})
