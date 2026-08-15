import { describe, expect, it } from 'vitest'
import { expandYear, parseDate, toSortKey } from './parseDate'

describe('expandYear', () => {
  it('maps two-digit years in the archive range', () => {
    expect(expandYear(95)).toBe(1995)
    expect(expandYear(0)).toBe(2000)
    expect(expandYear(6)).toBe(2006)
  })

  it('leaves four-digit years unchanged', () => {
    expect(expandYear(1996)).toBe(1996)
    expect(expandYear(2001)).toBe(2001)
  })
})

describe('parseDate', () => {
  it('parses US numeric dates with two-digit years', () => {
    expect(parseDate('11/1/95')).toMatchObject({
      precision: 'day',
      year: 1995,
      sortKey: toSortKey(1995, 11, 1),
      dateLabel: '1 November 1995',
      dateTime: '1995-11-01',
    })
    expect(parseDate('4/2/96').sortKey).toBe(toSortKey(1996, 4, 2))
    expect(parseDate('2/13/96').sortKey).toBe(toSortKey(1996, 2, 13))
  })

  it('sorts numeric dates chronologically, not by sheet order', () => {
    expect(parseDate('2/13/96').sortKey).toBeLessThan(parseDate('4/2/96').sortKey)
  })

  it('parses month-only dates', () => {
    expect(parseDate('March 1996')).toMatchObject({
      precision: 'month',
      year: 1996,
      sortKey: toSortKey(1996, 3, 1),
      dateLabel: 'March 1996',
      dateTime: '1996-03',
    })
  })

  it('parses "Month D, YYYY" and "Month DD, YYYY"', () => {
    expect(parseDate('March 2, 1996')).toMatchObject({
      precision: 'day',
      dateLabel: '2 March 1996',
      dateTime: '1996-03-02',
    })
    expect(parseDate('June 04, 2001')).toMatchObject({
      dateLabel: '4 June 2001',
      dateTime: '2001-06-04',
    })
  })

  it('parses "Month D YYYY" without a comma', () => {
    expect(parseDate('October 4 2001')).toMatchObject({
      precision: 'day',
      year: 2001,
      dateLabel: '4 October 2001',
      dateTime: '2001-10-04',
    })
  })

  it('parses date ranges using the start day for sort order', () => {
    expect(parseDate('September 13-14, 2001')).toMatchObject({
      precision: 'range',
      year: 2001,
      sortKey: toSortKey(2001, 9, 13),
      dateLabel: '13–14 September 2001',
      dateTime: '2001-09-13',
    })
  })

  it('keeps unknown strings last and visible', () => {
    expect(parseDate('sometime in the 1990s')).toMatchObject({
      precision: 'unknown',
      year: null,
      dateLabel: 'sometime in the 1990s',
      sortKey: 99991231,
    })
  })

  it('treats empty values as unknown', () => {
    expect(parseDate('')).toMatchObject({
      precision: 'unknown',
      dateLabel: '',
      year: null,
    })
  })
})
