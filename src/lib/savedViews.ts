import { normalizeFilters, type TimelineFilters } from './filterEvents'

export type SavedView = {
  id: string
  name: string
  filters: TimelineFilters
  year?: number
  savedAt: string
}

const STORAGE_KEY = 'nct-saved-views-v1'

function isBrowser(): boolean {
  return typeof localStorage !== 'undefined'
}

export function loadSavedViews(): SavedView[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedView[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (view) =>
          view && typeof view.id === 'string' && typeof view.name === 'string' && view.filters,
      )
      // Normalize legacy shapes (pre-multi-select single strings, missing fields).
      .map((view) => ({ ...view, filters: normalizeFilters(view.filters) }))
  } catch {
    return []
  }
}

function persist(views: SavedView[]): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch {
    /* quota or private mode — views stay in memory only */
  }
}

export function saveView(name: string, filters: TimelineFilters, year?: number): SavedView[] {
  const views = loadSavedViews()
  const view: SavedView = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, 60) || 'Untitled view',
    filters: JSON.parse(JSON.stringify(filters)) as TimelineFilters,
    year,
    savedAt: new Date().toISOString(),
  }
  const next = [view, ...views].slice(0, 20)
  persist(next)
  return next
}

export function deleteView(id: string): SavedView[] {
  const next = loadSavedViews().filter((view) => view.id !== id)
  persist(next)
  return next
}
