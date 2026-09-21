import { describe, expect, it } from 'vitest'
import {
  EMPTY_FILTERS,
  filterEvents,
  groupEventsByYear,
  monthCountsForYear,
  groupEventsByMonth,
  yearSectionId,
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
      dateLabel: '8 June 2001',
      year: 2001,
    }),
  ]

  it('filters the narrative by case-insensitive search', () => {
    expect(
      filterEvents(events, { ...EMPTY_FILTERS, search: 'kathmandu' }).map((item) => item.id),
    ).toEqual(['1'])
  })

  it('matches year and keyword fields, not only the narrative', () => {
    expect(
      filterEvents(events, { ...EMPTY_FILTERS, search: '2000' }).map((item) => item.id),
    ).toEqual(['1'])
    expect(
      filterEvents(events, { ...EMPTY_FILTERS, search: 'dialogue' }).map((item) => item.id),
    ).toEqual(['1'])
  })

  it('matches Event_ID without scanning the narrative', () => {
    expect(
      filterEvents(events, { ...EMPTY_FILTERS, search: 'nct-0009' }).map((item) => item.id),
    ).toEqual([])
    expect(
      filterEvents(
        [event({ id: 'NCT-0001', detail: 'Operation Romeo commenced' })],
        { ...EMPTY_FILTERS, search: 'NCT-0001' },
      ).map((item) => item.id),
    ).toEqual(['NCT-0001'])
  })

  it('matches the display date label', () => {
    expect(
      filterEvents(events, { ...EMPTY_FILTERS, search: '8 June' }).map((item) => item.id),
    ).toEqual(['2'])
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

describe('groupEventsByYear', () => {
  it('keeps chronological year groups and names section ids', () => {
    const events = [
      event({ id: '1', detail: 'a', year: 2000, sortKey: 20000301 }),
      event({ id: '2', detail: 'b', year: 2000, sortKey: 20001101 }),
      event({ id: '3', detail: 'c', year: 2001, sortKey: 20010601 }),
      event({
        id: '4',
        detail: 'undated',
        year: null,
        precision: 'unknown',
        sortKey: 99991231,
      }),
    ]

    const groups = groupEventsByYear(events)
    expect(groups.map((group) => group.year)).toEqual([2000, 2001, null])
    expect(groups[0]?.events.map((item) => item.id)).toEqual(['1', '2'])
    expect(yearSectionId(2000)).toBe('year-2000')
    expect(yearSectionId(null)).toBe('year-undated')
  })
})

describe('monthCountsForYear', () => {
  it('counts events into a 12-month heatmap', () => {
    const events = [
      event({ id: '1', detail: 'a', year: 2001, sortKey: 20010608, precision: 'day' }),
      event({ id: '2', detail: 'b', year: 2001, sortKey: 20010616, precision: 'day' }),
      event({ id: '3', detail: 'c', year: 2001, sortKey: 20011101, precision: 'month' }),
    ]

    expect(monthCountsForYear(events)).toEqual([
      0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0,
    ])
  })
})

describe('groupEventsByMonth', () => {
  it('clusters a year into chronological months', () => {
    const events = [
      event({ id: '1', detail: 'a', year: 2001, sortKey: 20010301, precision: 'month' }),
      event({ id: '2', detail: 'b', year: 2001, sortKey: 20010608, precision: 'day' }),
      event({ id: '3', detail: 'c', year: 2001, sortKey: 20010616, precision: 'day' }),
    ]

    expect(groupEventsByMonth(events).map((group) => [group.month, group.events.length])).toEqual([
      [3, 1],
      [6, 2],
    ])
  })
})
