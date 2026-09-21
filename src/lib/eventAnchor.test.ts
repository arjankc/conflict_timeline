import { describe, expect, it } from 'vitest'
import {
  eventCardId,
  eventPermalink,
  pageUrlWithEventHash,
  readEventHash,
} from './eventAnchor'

describe('eventCardId', () => {
  it('namespaces Event_IDs so they do not collide with year headings', () => {
    expect(eventCardId('NCT-0001')).toBe('event-NCT-0001')
  })
})

describe('readEventHash', () => {
  it('accepts a leading hash', () => {
    expect(readEventHash('#event-NCT-0001')).toBe('event-NCT-0001')
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
        'event-NCT-0001',
        'https://example.github.io',
        '/conflict_timeline/',
      ),
    ).toBe('https://example.github.io/conflict_timeline/#event-NCT-0001')
  })
})

describe('pageUrlWithEventHash', () => {
  it('keeps the current query string when setting the card fragment', () => {
    expect(
      pageUrlWithEventHash(
        '/conflict_timeline/',
        '?year=1996',
        'event-NCT-0001',
      ),
    ).toBe('/conflict_timeline/?year=1996#event-NCT-0001')
  })
})
