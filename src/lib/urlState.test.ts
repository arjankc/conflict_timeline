import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS } from './filterEvents'
import { explorerQueryString, parseExplorerQuery } from './urlState'

describe('parseExplorerQuery', () => {
  it('reads search, tag, and year from the query string', () => {
    expect(parseExplorerQuery('?q=rolpa&tag=Maoist&year=2001')).toEqual({
      filters: {
        ...EMPTY_FILTERS,
        search: 'rolpa',
        keyword: 'Maoist',
      },
      year: 2001,
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
        { ...EMPTY_FILTERS, search: 'talks', keyword: 'dialogue initiative' },
        2001,
      ),
    ).toBe('?q=talks&tag=dialogue+initiative&year=2001')
  })

  it('returns an empty string when nothing is active', () => {
    expect(explorerQueryString(EMPTY_FILTERS)).toBe('')
  })
})
