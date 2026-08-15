import { useEffect, useMemo, useState } from 'react'
import { FilterBar } from './components/FilterBar'
import { TimelineFeed } from './components/TimelineFeed'
import { YearOverview } from './components/YearOverview'
import {
  collectYears,
  countEventsByYear,
  EMPTY_FILTERS,
  filterEvents,
  type TimelineFilters,
} from './lib/filterEvents'
import { loadEvents } from './lib/loadEvents'
import { uniqueTags } from './lib/parseTags'
import { useDebouncedValue } from './lib/useDebouncedValue'
import type { ConflictEvent } from './types/event'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; events: ConflictEvent[] }

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [filters, setFilters] = useState<TimelineFilters>(EMPTY_FILTERS)
  const debouncedSearch = useDebouncedValue(filters.search, 150)

  useEffect(() => {
    let cancelled = false

    loadEvents()
      .then((events) => {
        if (!cancelled) setLoadState({ status: 'ready', events })
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unable to load timeline data'
        if (!cancelled) setLoadState({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const appliedFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  )

  const categories = useMemo(
    () =>
      loadState.status === 'ready'
        ? uniqueTags(loadState.events.map((event) => event.categories))
        : [],
    [loadState],
  )

  const organizations = useMemo(
    () =>
      loadState.status === 'ready'
        ? uniqueTags(loadState.events.map((event) => event.organizations))
        : [],
    [loadState],
  )

  const years = useMemo(
    () => (loadState.status === 'ready' ? collectYears(loadState.events) : []),
    [loadState],
  )

  const filteredEvents = useMemo(
    () =>
      loadState.status === 'ready'
        ? filterEvents(loadState.events, appliedFilters)
        : [],
    [loadState, appliedFilters],
  )

  const yearSeries = useMemo(
    () => countEventsByYear(filteredEvents, years),
    [filteredEvents, years],
  )

  function updateFilter<K extends keyof TimelineFilters>(
    key: K,
    value: TimelineFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <a
        href="#timeline"
        className="absolute left-4 top-0 z-50 -translate-y-full rounded-md bg-crimson px-3 py-2 text-white focus:translate-y-4"
      >
        Skip to timeline
      </a>

      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="text-sm font-medium tracking-wide text-crimson uppercase">
            Digital archive
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">
            Nepal Conflict Timeline
          </h1>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-muted">
            A chronological record of Nepal&apos;s internal armed conflict
            (1996–2006), compiled for transitional justice civil society. The
            archive currently opens with pre-conflict events from 1995.
          </p>
        </div>
      </header>

      {loadState.status === 'ready' ? (
        <FilterBar
          filters={filters}
          categories={categories}
          organizations={organizations}
          resultCount={filteredEvents.length}
          totalCount={loadState.events.length}
          onSearchChange={(value) => updateFilter('search', value)}
          onCategoryChange={(value) => updateFilter('category', value)}
          onOrganizationChange={(value) => updateFilter('organization', value)}
          onKeywordClear={() => updateFilter('keyword', '')}
          onReset={() => setFilters(EMPTY_FILTERS)}
        />
      ) : null}

      <main id="timeline" className="pb-16">
        {loadState.status === 'loading' ? (
          <p className="mx-auto max-w-3xl px-4 py-12 text-muted sm:px-6" aria-live="polite">
            Loading the archive…
          </p>
        ) : null}

        {loadState.status === 'error' ? (
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6" role="alert">
            <p className="text-ink">{loadState.message}</p>
            <button
              type="button"
              className="mt-4 font-medium text-crimson underline-offset-2 hover:underline"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : null}

        {loadState.status === 'ready' ? (
          <>
            <div className="py-8">
              <YearOverview series={yearSeries} />
            </div>
            <TimelineFeed
              events={filteredEvents}
              activeKeyword={filters.keyword}
              activeCategory={filters.category}
              activeOrganization={filters.organization}
              onKeywordClick={(keyword) =>
                updateFilter(
                  'keyword',
                  filters.keyword.toLowerCase() === keyword.toLowerCase()
                    ? ''
                    : keyword,
                )
              }
              onCategoryClick={(category) =>
                updateFilter(
                  'category',
                  filters.category.toLowerCase() === category.toLowerCase()
                    ? ''
                    : category,
                )
              }
              onOrganizationClick={(organization) =>
                updateFilter(
                  'organization',
                  filters.organization.toLowerCase() === organization.toLowerCase()
                    ? ''
                    : organization,
                )
              }
            />
          </>
        ) : null}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-muted sm:px-6">
          <p>
            Open-source public archive. Application code is MIT licensed. Event
            texts retain the provenance of the source sheet, documented in
            DATA.md.
          </p>
        </div>
      </footer>
    </div>
  )
}
