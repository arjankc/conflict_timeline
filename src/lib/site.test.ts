import { describe, expect, it } from 'vitest'
import { applySiteUrl, normalizeSiteUrl, PLACEHOLDER_SITE_URL } from './site'

describe('applySiteUrl', () => {
  it('strips trailing slashes then substitutes placeholders', () => {
    expect(
      applySiteUrl(
        '%SITE_URL%/og-image.png',
        'https://example.github.io/conflict_timeline/',
      ),
    ).toBe('https://example.github.io/conflict_timeline/og-image.png')
  })

  it('keeps the documented placeholder origin', () => {
    expect(normalizeSiteUrl(PLACEHOLDER_SITE_URL)).toBe(PLACEHOLDER_SITE_URL)
  })
})
