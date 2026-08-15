import { describe, expect, it } from 'vitest'
import type { ConflictEvent } from '../types/event'
import {
  buildSearchIndex,
  shouldOfferSuggestions,
  suggestSearch,
  suggestionKindLabel,
} from './searchSuggest'

function event(
  partial: Partial<ConflictEvent> & Pick<ConflictEvent, 'id' | 'detail'>,
): ConflictEvent {
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

describe('shouldOfferSuggestions', () => {
  it('waits for two characters', () => {
    expect(shouldOfferSuggestions('')).toBe(false)
    expect(shouldOfferSuggestions('m')).toBe(false)
    expect(shouldOfferSuggestions('ma')).toBe(true)
    expect(shouldOfferSuggestions('19')).toBe(true)
    expect(shouldOfferSuggestions('1')).toBe(false)
    expect(shouldOfferSuggestions('  ')).toBe(false)
    expect(shouldOfferSuggestions('  ma')).toBe(true)
  })
})

describe('suggestSearch', () => {
  const index = buildSearchIndex([
    event({
      id: '1',
      detail: 'Maoist leader Baburam Bhattarai submitted demands in Kathmandu.',
      keywords: ['Maoist', '40-point demand'],
      year: 1996,
    }),
    event({
      id: '2',
      detail: 'Police crackdown in Rolpa.',
      keywords: ['Maoist', 'Rolpa'],
      year: 1996,
    }),
  ])

  it('ranks a theme prefix above a mid-string term', () => {
    const labels = suggestSearch(index, 'mao').map((item) => item.label)
    expect(labels[0]).toBe('Maoist')
  })

  it('suggests years from numeric input', () => {
    expect(suggestSearch(index, '19').some((item) => item.label === '1996')).toBe(
      true,
    )
  })

  it('matches a later word in a multi-word theme', () => {
    expect(
      suggestSearch(index, 'demand').some((item) => item.label === '40-point demand'),
    ).toBe(true)
  })

  it('returns nothing until the query is long enough', () => {
    expect(suggestSearch(index, 'm')).toEqual([])
  })
})

describe('suggestionKindLabel', () => {
  it('names each suggestion kind for the listbox', () => {
    expect(suggestionKindLabel('theme')).toBe('Theme')
    expect(suggestionKindLabel('term')).toBe('In events')
    expect(suggestionKindLabel('year')).toBe('Year')
  })
})
