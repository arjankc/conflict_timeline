import { describe, expect, it } from 'vitest'
import { countTags, parseTags, uniqueTags } from './parseTags'

describe('parseTags', () => {
  it('splits, trims, and drops empty fragments', () => {
    expect(parseTags(' election, political dialogue , , Maoist')).toEqual([
      'election',
      'political dialogue',
      'Maoist',
    ])
  })

  it('de-duplicates case-insensitively while keeping first casing', () => {
    expect(parseTags('State, state, STATE')).toEqual(['State'])
  })

  it('returns an empty array for missing values', () => {
    expect(parseTags(undefined)).toEqual([])
    expect(parseTags('')).toEqual([])
  })
})

describe('uniqueTags', () => {
  it('builds a sorted unique list across events', () => {
    expect(
      uniqueTags([
        ['Maoist', 'state'],
        ['State', 'Rolpa'],
      ]),
    ).toEqual(['Maoist', 'Rolpa', 'state'])
  })
})

describe('countTags', () => {
  it('ranks tags by frequency and keeps a limit', () => {
    expect(
      countTags(
        [
          ['Maoist', 'state'],
          ['State', 'Rolpa'],
          ['Maoist'],
        ],
        2,
      ),
    ).toEqual([
      { label: 'Maoist', count: 2 },
      { label: 'state', count: 2 },
    ])
  })
})
