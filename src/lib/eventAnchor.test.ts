import { describe, expect, it } from 'vitest'
import {
  eventCardId,
  eventPermalink,
  pageUrlWithEventHash,
  readEventHash,
} from './eventAnchor'

describe('eventCardId', () => {
  it('namespaces row ids so they do not collide with year headings', () => {
    expect(eventCardId('row-12-20010608')).toBe('event-row-12-20010608')
  })
})

describe('readEventHash', () => {
  it('accepts a leading hash', () => {
    expect(readEventHash('#event-row-1-19960101')).toBe('event-row-1-19960101')
  })

  it('ignores year and unrelated fragments', () => {
    expect(readEventHash('#year-2001')).toBeUndefined()
    expect(readEventHash('#')).toBeUndefined()
  })

  it('does not throw on a malformed percent encoding', () => {
    expect(readEventHash('#event-%')).toBeUndefined()
  })
})

describe('eventPermalink', () => {
  it('copies origin, path, and card fragment without query filters', () => {
    expect(
      eventPermalink(
        'event-row-1-19960101',
        'https://example.github.io',
        '/conflict_timeline/',
      ),
    ).toBe(
      'https://example.github.io/conflict_timeline/#event-row-1-19960101',
    )
  })
})

describe('pageUrlWithEventHash', () => {
  it('keeps the current query string when setting the card fragment', () => {
    expect(
      pageUrlWithEventHash(
        '/conflict_timeline/',
        '?year=1996',
        'event-row-1-19960101',
      ),
    ).toBe('/conflict_timeline/?year=1996#event-row-1-19960101')
  })
})
