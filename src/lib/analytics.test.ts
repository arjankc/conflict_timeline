import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  detectFilterChange,
  trackCitationCopy,
  trackEvent,
  trackExport,
  trackFilterChange,
  trackPageView,
  trackSearch,
  trackShare,
} from './analytics'
import { EMPTY_FILTERS } from './filterEvents'
import type { TimelineFilters } from './filterEvents'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubBrowser(doNotTrack: string | undefined) {
  const dataLayer: Record<string, unknown>[] = []
  vi.stubGlobal('window', { dataLayer })
  vi.stubGlobal(
    'navigator',
    doNotTrack === undefined ? {} : { doNotTrack },
  )
  return dataLayer
}

describe('trackEvent', () => {
  it('pushes custom events to the dataLayer', () => {
    const dataLayer = stubBrowser(undefined)
    trackEvent('card_expand', { event_id: 'NCT-0001' })
    expect(dataLayer).toEqual([{ event: 'card_expand', event_id: 'NCT-0001' }])
  })

  it('never sends raw free-text input', () => {
    const dataLayer = stubBrowser(undefined)
    trackSearch(12, 7)
    expect(dataLayer).toEqual([
      { event: 'search', result_count: 12, query_length: 7 },
    ])
    expect(JSON.stringify(dataLayer)).not.toContain('Rolpa')
  })

  it('skips tracking with Do Not Track', () => {
    const dataLayer = stubBrowser('1')
    trackPageView('/conflict_timeline/?q=test')
    trackFilterChange('keywords', 1, ['Maoist'])
    trackExport('csv', 3)
    trackShare('clipboard')
    trackCitationCopy('NCT-0001')
    expect(dataLayer).toEqual([])
  })

  it('no-ops without a browser environment', () => {
    expect(() => trackEvent('search', { result_count: 0 })).not.toThrow()
  })
})

describe('detectFilterChange', () => {
  const base: TimelineFilters = { ...EMPTY_FILTERS }

  it('returns null when nothing changed', () => {
    expect(detectFilterChange(base, { ...base })).toBeNull()
  })

  it('names the changed facet with its values', () => {
    expect(
      detectFilterChange(base, { ...base, keywords: ['Maoist'] }),
    ).toEqual({ facet: 'keywords', valueCount: 1, values: ['Maoist'] })
    expect(
      detectFilterChange(base, { ...base, from: '2001-06' }),
    ).toEqual({ facet: 'range', valueCount: 1, values: ['2001-06'] })
  })

  it('prefers the first differing facet in priority order', () => {
    expect(
      detectFilterChange(base, {
        ...base,
        keywords: ['Maoist'],
        sort: 'reverse' as const,
      }),
    ).toEqual({ facet: 'keywords', valueCount: 1, values: ['Maoist'] })
  })
})
