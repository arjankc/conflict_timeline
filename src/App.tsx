import { useEffect, useMemo, useState } from 'react'
import { BackToTop } from './components/BackToTop'
import { ChronologyExplorer } from './components/ChronologyExplorer'
import { FilterBar } from './components/FilterBar'
import { ShareButton } from './components/ShareButton'
import { ThemeToggle } from './components/ThemeToggle'
import { ReadingControls } from './components/ReadingControls'
import { Toast } from './components/Toast'
import { EMPTY_FILTERS, filterEvents, type TimelineFilters } from './lib/filterEvents'
import { loadEvents } from './lib/loadEvents'
import { countTags, KEYWORD_CLOUD_LIMIT, uniqueTags } from './lib/parseTags'
import { buildSearchIndex } from './lib/searchSuggest'
import { pageDescription, pageTitle } from './lib/seo'
import { DATA_DOC_URL, SITE_NAME } from './lib/site'
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
        ? countTags(loadState.events.map((event) => event.keywords), KEYWORD_CLOUD_LIMIT)
        : [],
    [loadState],
  )

  const searchIndex = useMemo(
    () =>
      loadState.status === 'ready' ? buildSearchIndex(loadState.events) : [],
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
          href="#timeline-search"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-[max(0.75rem,env(safe-area-inset-top))] focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to search
        </a>
        <a
          href="#years"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-[max(3.25rem,calc(env(safe-area-inset-top)+2.5rem))] focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to year navigation
        </a>
        <a
          href="#timeline"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-[max(5.75rem,calc(env(safe-area-inset-top)+5rem))] focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to events
        </a>
      </nav>

      <header className="border-b border-line">
        <div className="mx-auto max-w-5xl px-5 py-4 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-wide text-crimson uppercase sm:text-sm">
                Digital archive
              </p>
              <h1 className="mt-2 text-balance font-serif text-2xl leading-snug text-ink sm:text-4xl">
                {SITE_NAME}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0 sm:justify-end">
              <div
                role="toolbar"
                aria-label="Reading and display"
                className="flex flex-wrap gap-2"
              >
                <ThemeToggle />
                <ReadingControls />
              </div>
              <ShareButton filters={appliedFilters} year={focusYear} />
            </div>
          </div>
          <p className="mt-3 max-w-prose text-sm leading-[1.7] text-muted sm:mt-5 sm:text-base">
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
          searchIndex={searchIndex}
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

      <main id="timeline" tabIndex={-1} className="pt-5 outline-none sm:pt-10">
        {loadState.status === 'loading' ? (
          <p className="mx-auto max-w-5xl px-5 py-12 text-muted sm:px-8" role="status">
            Loading the archive…
          </p>
        ) : null}

        {loadState.status === 'error' ? (
          <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8" role="alert">
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
            search={appliedFilters.search}
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
        aria-label="About this archive"
        className={[
          'border-t border-line',
          // Extra space so the license line sits above the fixed mobile year dock.
          loadState.status === 'ready' && filteredEvents.length > 0
            ? 'pb-[calc(var(--dock-h)+1.25rem)] lg:pb-0'
            : '',
        ].join(' ')}
      >
        <div className="mx-auto max-w-5xl px-5 py-8 text-sm leading-[1.7] text-muted sm:px-8">
          <p>
            Open-source public archive. Application code is MIT licensed. Event
            texts retain the provenance of the source sheet, documented in{' '}
            <a
              href={DATA_DOC_URL}
              className="font-medium text-crimson underline underline-offset-2"
            >
              DATA.md
            </a>
            .
          </p>
        </div>
      </footer>
      {loadState.status === 'ready' ? <BackToTop /> : null}
      <Toast />
    </div>
  )
}
