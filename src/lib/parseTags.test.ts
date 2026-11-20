import { describe, expect, it } from 'vitest'
import { canonicalKeyword, countTags, formatCategoryLabel, formatKeywordLabel, parseOrganizations, parseTags, uniqueTags } from './parseTags'

describe('parseTags', () => {
  it('splits, trims, and drops empty fragments', () => {
    expect(parseTags(' election, political dialogue , , Maoist')).toEqual([
      'Election',
      'Political Dialogue',
      'Maoist',
    ])
  })

  it('de-duplicates case-insensitively while keeping first casing', () => {
    expect(parseTags('State, state, STATE')).toEqual(['State'])
  })

  it('canonicalizes trailing-punctuation variants', () => {
    expect(parseTags('Maoist/, Maoist., Maoist')).toEqual(['Maoist'])
    expect(canonicalKeyword('Nepal police')).toBe('Police')
  })

  it('returns an empty array for missing values', () => {
    expect(parseTags(undefined)).toEqual([])
    expect(parseTags('')).toEqual([])
  })
})

describe('formatCategoryLabel', () => {
  it('replaces underscores and hyphens with spaces for display', () => {
    expect(formatCategoryLabel('transitional_justice')).toBe('Transitional Justice')
    expect(formatCategoryLabel('sexual-violence')).toBe('Sexual Violence')
    expect(formatCategoryLabel('killing')).toBe('Killing')
  })
})

describe('formatKeywordLabel', () => {
  it('title-cases ordinary words', () => {
    expect(formatKeywordLabel('killing')).toBe('Killing')
    expect(formatKeywordLabel('transitional justice')).toBe('Transitional Justice')
    expect(formatKeywordLabel('protest')).toBe('Protest')
    expect(formatKeywordLabel('police crackdown')).toBe('Police Crackdown')
  })

  it('keeps acronyms, codes, and numbers untouched', () => {
    expect(formatKeywordLabel('TRC')).toBe('TRC')
    expect(formatKeywordLabel('CPN-Maoist')).toBe('CPN-Maoist')
    expect(formatKeywordLabel('TRC Act amendment')).toBe('TRC Act Amendment')
    expect(formatKeywordLabel('UNSCR 1325')).toBe('UNSCR 1325')
    expect(formatKeywordLabel('extortion/land')).toBe('Extortion/Land')
    expect(formatKeywordLabel("people's war")).toBe("People's War")
  })
})

describe('parseOrganizations', () => {
  it('splits semicolon-delimited values without breaking names that contain commas', () => {
    expect(
      parseOrganizations(
        'Office of the President; Ministry of Law, Justice and Parliamentary Affairs; CIEDP',
      ),
    ).toEqual([
      'Office of the President',
      'Ministry of Law, Justice and Parliamentary Affairs',
      'CIEDP',
    ])
  })

  it('falls back to commas for legacy rows without semicolons', () => {
    expect(
      parseOrganizations('Royal Nepal Army, Nepal Army, Armed Police Force'),
    ).toEqual(['Royal Nepal Army', 'Nepal Army', 'Armed Police Force'])
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
