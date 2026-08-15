import { describe, expect, it } from 'vitest'
import { eventCardId, eventPermalink, readEventHash } from './eventAnchor'

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
