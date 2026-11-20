import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS } from './filterEvents'
import { pageDescription, pageTitle, shareText } from './seo'

describe('pageTitle', () => {
  it('uses the site name when nothing is filtered', () => {
    expect(pageTitle(EMPTY_FILTERS)).toBe('Nepal Conflict Timeline')
  })

  it('prepends theme, year, and search', () => {
    expect(
      pageTitle({ ...EMPTY_FILTERS, keywords: ['Maoist'], search: 'Rolpa' }, 2001),
    ).toBe('Maoist · 2001 · “Rolpa” · Nepal Conflict Timeline')
  })
})

describe('shareText', () => {
  it('falls back to the tagline on the unfiltered archive', () => {
    expect(shareText(EMPTY_FILTERS)).toMatch(/1 November 1995 - 8 September 2025/)
  })
})

describe('pageDescription', () => {
  it('mentions active filters', () => {
    expect(
      pageDescription({ ...EMPTY_FILTERS, keywords: ['Maoist'] }, 2001, 12),
    ).toContain('Maoist')
  })
})
