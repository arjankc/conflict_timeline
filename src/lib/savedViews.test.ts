import { describe, expect, it, vi } from 'vitest'
import { deleteView, loadSavedViews, saveView } from './savedViews'
import { EMPTY_FILTERS } from './filterEvents'

describe('savedViews', () => {
  it('saves and lists views with filters', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    })
    const filters = { ...EMPTY_FILTERS, keywords: ['Maoist'], sort: 'reverse' as const }
    const next = saveView('Rolpa test', filters, 2001)
    expect(next).toHaveLength(1)
    expect(next[0]?.name).toBe('Rolpa test')
    expect(loadSavedViews()).toHaveLength(1)
    const afterDelete = deleteView(next[0]?.id ?? '')
    expect(afterDelete).toHaveLength(0)
    vi.unstubAllGlobals()
  })

  it('migrates legacy single-string filters on load', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    })
    store.set(
      'nct-saved-views-v1',
      JSON.stringify([
        {
          id: 'legacy-1',
          name: 'Old view',
          filters: { search: '', keyword: 'Maoist', category: '', organization: '' },
          savedAt: '2025-01-01T00:00:00.000Z',
        },
      ]),
    )
    const views = loadSavedViews()
    expect(views).toHaveLength(1)
    expect(views[0]?.filters.keywords).toEqual(['Maoist'])
    expect(views[0]?.filters.districts).toEqual([])
    expect(views[0]?.filters.match).toBe('any')
    vi.unstubAllGlobals()
  })
})
