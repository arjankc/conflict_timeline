import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS } from './filterEvents'
import { explorerQueryString, parseExplorerQuery } from './urlState'

describe('parseExplorerQuery', () => {
  it('reads search, tag, and year from the query string (legacy single tag)', () => {
    expect(parseExplorerQuery('?q=rolpa&tag=Maoist&year=2001')).toEqual({
      filters: {
        ...EMPTY_FILTERS,
        search: 'rolpa',
        keywords: ['Maoist'],
      },
      year: 2001,
    })
  })

  it('reads multi-value tags, sort, and date range', () => {
    expect(parseExplorerQuery('?tag=Maoist,killing&sort=reverse&from=2001-06&to=2002-03')).toEqual({
      filters: {
        ...EMPTY_FILTERS,
        keywords: ['Maoist', 'killing'],
        sort: 'reverse',
        from: '2001-06',
        to: '2002-03',
      },
      year: undefined,
    })
    expect(parseExplorerQuery('?tag=a&tag=b')).toEqual({
      filters: { ...EMPTY_FILTERS, keywords: ['a', 'b'] },
      year: undefined,
    })
    expect(parseExplorerQuery('?district=Rolpa,Kathmandu')).toEqual({
      filters: { ...EMPTY_FILTERS, districts: ['Rolpa', 'Kathmandu'] },
      year: undefined,
    })
  })

  it('reads confidence from the query string', () => {
    expect(parseExplorerQuery('?confidence=high')).toEqual({
      filters: { ...EMPTY_FILTERS, confidence: 'high' },
      year: undefined,
    })
    expect(parseExplorerQuery('?confidence=bogus')).toEqual({
      filters: EMPTY_FILTERS,
      year: undefined,
    })
  })

  it('returns empty filters when the URL has no params', () => {
    expect(parseExplorerQuery('')).toEqual({
      filters: EMPTY_FILTERS,
      year: undefined,
    })
  })
})

describe('explorerQueryString', () => {
  it('omits empty params and keeps a shareable order', () => {
    expect(
      explorerQueryString(
        { ...EMPTY_FILTERS, search: 'talks', keywords: ['dialogue initiative'] },
        2001,
      ),
    ).toBe('?q=talks&tag=dialogue+initiative&year=2001')
  })

  it('includes confidence, sort, and range when set', () => {
    expect(
      explorerQueryString({ ...EMPTY_FILTERS, confidence: 'low' }),
    ).toBe('?confidence=low')
    expect(
      explorerQueryString({ ...EMPTY_FILTERS, sort: 'reverse', from: '2001-06', to: '2002-03' }),
    ).toBe('?sort=reverse&from=2001-06&to=2002-03')
    expect(
      explorerQueryString({ ...EMPTY_FILTERS, match: 'all', keywords: ['a', 'b'] }),
    ).toBe('?tag=a%2Cb&match=all')
    expect(parseExplorerQuery('?match=all').filters.match).toBe('all')
    expect(parseExplorerQuery('?match=bogus').filters.match).toBe('any')
  })

  it('returns an empty string when nothing is active', () => {
    expect(explorerQueryString(EMPTY_FILTERS)).toBe('')
  })
})
