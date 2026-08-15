import { describe, expect, it } from 'vitest'
import {
  collectYears,
  countEventsByYear,
  EMPTY_FILTERS,
  filterEvents,
} from './filterEvents'
import type { ConflictEvent } from '../types/event'

function event(partial: Partial<ConflictEvent> & Pick<ConflictEvent, 'id' | 'detail'>): ConflictEvent {
  return {
    rawDate: '2001',
    sortKey: 20010101,
    dateLabel: '2001',
    dateTime: '2001',
    year: 2001,
    precision: 'month',
    keywords: [],
    categories: [],
    organizations: [],
    ...partial,
  }
}

describe('filterEvents', () => {
  const events = [
    event({
      id: '1',
      detail: 'Talks in Kathmandu',
      keywords: ['dialogue'],
      categories: ['politics'],
      year: 2000,
    }),
    event({
      id: '2',
      detail: 'Attack in Rolpa',
      keywords: ['violence'],
      organizations: ['Maoist'],
      year: 2001,
    }),
  ]

  it('filters the Detail column by case-insensitive search', () => {
    expect(
      filterEvents(events, { ...EMPTY_FILTERS, search: 'kathmandu' }).map((item) => item.id),
    ).toEqual(['1'])
  })

  it('filters by keyword, category, and organization', () => {
    expect(
      filterEvents(events, { ...EMPTY_FILTERS, keyword: 'Violence' }).map((item) => item.id),
    ).toEqual(['2'])
    expect(
      filterEvents(events, { ...EMPTY_FILTERS, category: 'politics' }).map((item) => item.id),
    ).toEqual(['1'])
    expect(
      filterEvents(events, { ...EMPTY_FILTERS, organization: 'maoist' }).map((item) => item.id),
    ).toEqual(['2'])
  })
})

describe('countEventsByYear', () => {
  it('keeps the archive year axis and counts the filtered set', () => {
    const events = [
      event({ id: '1', detail: 'a', year: 2000 }),
      event({ id: '2', detail: 'b', year: 2000 }),
      event({ id: '3', detail: 'c', year: 2001 }),
    ]

    expect(collectYears(events)).toEqual([2000, 2001])
    expect(countEventsByYear([events[0]!], [2000, 2001])).toEqual([
      { year: 2000, count: 1 },
      { year: 2001, count: 0 },
    ])
  })
})
