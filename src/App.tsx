import { useEffect, useMemo, useState } from 'react'
import { ChronologyExplorer } from './components/ChronologyExplorer'
import { FilterBar } from './components/FilterBar'
import { ShareButton } from './components/ShareButton'
import { ThemeToggle } from './components/ThemeToggle'
import { EMPTY_FILTERS, filterEvents, type TimelineFilters } from './lib/filterEvents'
import { loadEvents } from './lib/loadEvents'
import { countTags, uniqueTags } from './lib/parseTags'
import { pageDescription, pageTitle } from './lib/seo'
import { SITE_NAME } from './lib/site'
import { readExplorerQuery, writeExplorerQuery } from './lib/urlState'
import { useDebouncedValue } from './lib/useDebouncedValue'
import type { ConflictEvent } from './types/event'

/**
 * Root shell: skip links, header (appearance + share), sticky filters, explorer, footer.
 * View state is the query string; there is no React Router.
 */

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; events: ConflictEvent[] }

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [filters, setFilters] = useState<TimelineFilters>(
    () => readExplorerQuery().filters,
  )
  const [focusYear, setFocusYear] = useState<number | undefined>(
    () => readExplorerQuery().year,
  )
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

  // Debounced filters so the address bar and the list stay in sync without a write on every keystroke.
  useEffect(() => {
    writeExplorerQuery(appliedFilters, focusYear)
  }, [appliedFilters, focusYear])

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

  const keywordCounts = useMemo(
    () =>
      loadState.status === 'ready'
        ? countTags(loadState.events.map((event) => event.keywords), 16)
        : [],
    [loadState],
  )

  const filteredEvents = useMemo(
    () =>
      loadState.status === 'ready'
        ? filterEvents(loadState.events, appliedFilters)
        : [],
    [loadState, appliedFilters],
  )

  // Browser tab title only. Open Graph / Twitter tags in index.html stay on the homepage copy.
  useEffect(() => {
    document.title = pageTitle(appliedFilters, focusYear)
    const description = pageDescription(
      appliedFilters,
      focusYear,
      loadState.status === 'ready' ? filteredEvents.length : undefined,
    )
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', description)
  }, [appliedFilters, focusYear, filteredEvents.length, loadState.status])

  function updateFilter<K extends keyof TimelineFilters>(
    key: K,
    value: TimelineFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <nav aria-label="Skip links" className="contents">
        <a
          href="#years"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-[max(0.75rem,env(safe-area-inset-top))] focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to year navigation
        </a>
        <a
          href="#timeline"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-[max(3.25rem,calc(env(safe-area-inset-top)+2.5rem))] focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to events
        </a>
      </nav>

      <header className="border-b border-line">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-crimson uppercase sm:text-sm">
                Digital archive
              </p>
              <h1 className="mt-1.5 font-serif text-2xl leading-tight text-ink sm:mt-2 sm:text-4xl">
                {SITE_NAME}
              </h1>
            </div>
            <div className="flex shrink-0 items-start gap-2">
              <ThemeToggle />
              <ShareButton filters={appliedFilters} year={focusYear} />
            </div>
          </div>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted sm:mt-4 sm:text-base">
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
          keywords={keywordCounts}
          resultCount={filteredEvents.length}
          totalCount={loadState.events.length}
          onSearchChange={(value) => updateFilter('search', value)}
          onCategoryChange={(value) => updateFilter('category', value)}
          onOrganizationChange={(value) => updateFilter('organization', value)}
          onKeywordClick={(keyword) =>
            updateFilter(
              'keyword',
              filters.keyword.toLowerCase() === keyword.toLowerCase()
                ? ''
                : keyword,
            )
          }
          onReset={() => setFilters(EMPTY_FILTERS)}
        />
      ) : null}

      <main id="timeline" tabIndex={-1} className="pt-4 outline-none sm:pt-8">
        {loadState.status === 'loading' ? (
          <p className="mx-auto max-w-5xl px-4 py-12 text-muted sm:px-6" role="status">
            Loading the archive…
          </p>
        ) : null}

        {loadState.status === 'error' ? (
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6" role="alert">
            <p className="text-ink">{loadState.message}</p>
            <button
              type="button"
              className="mt-4 min-h-11 font-medium text-crimson underline underline-offset-2"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : null}

        {loadState.status === 'ready' ? (
          <ChronologyExplorer
            events={filteredEvents}
            focusYear={focusYear}
            activeKeyword={filters.keyword}
            activeCategory={filters.category}
            activeOrganization={filters.organization}
            onYearChange={(year) => setFocusYear(year ?? undefined)}
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
        ) : null}
      </main>

      <footer
        className={[
          'border-t border-line',
          // Extra space so the license line sits above the fixed mobile year dock.
          loadState.status === 'ready'
            ? 'pb-[calc(var(--dock-h)+1.25rem)] lg:pb-0'
            : '',
        ].join(' ')}
      >
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted sm:px-6">
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
