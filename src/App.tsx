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

  const collectionMeta = useMemo(() => {
    if (loadState.status !== 'ready') return null
    const years = loadState.events
      .map((event) => event.year)
      .filter((year): year is number => year != null)
    const span =
      years.length === 0
        ? null
        : Math.min(...years) === Math.max(...years)
          ? String(Math.min(...years))
          : `${Math.min(...years)}–${Math.max(...years)}`
    return { count: loadState.events.length, span }
  }, [loadState])

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.category !== '' ||
    filters.organization !== '' ||
    filters.keyword !== ''

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
      <div className="masthead-rule" aria-hidden="true" />
      <nav aria-label="Skip links" className="contents">
        <a
          href="#timeline-search"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-[max(0.75rem,env(safe-area-inset-top))] focus:z-50 focus:rounded-xl focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to search
        </a>
        <a
          href="#years"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-[max(3.25rem,calc(env(safe-area-inset-top)+2.5rem))] focus:z-50 focus:rounded-xl focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to year navigation
        </a>
        <a
          href="#timeline"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-[max(5.75rem,calc(env(safe-area-inset-top)+5rem))] focus:z-50 focus:rounded-xl focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to events
        </a>
      </nav>

      <header>
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-[0.16em] text-crimson uppercase sm:text-sm">
                Digital archive
                <span className="mx-2 text-muted" aria-hidden="true">
                  ·
                </span>
                <span className="tracking-[0.12em] text-muted">1995–2006</span>
              </p>
              <h1 className="mt-2.5 text-balance font-serif text-3xl leading-tight tracking-tight text-ink sm:text-5xl sm:leading-[1.12]">
                {SITE_NAME}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              <div
                role="toolbar"
                aria-label="Reading and display"
                className="flex flex-wrap gap-1.5"
              >
                <ThemeToggle />
                <ReadingControls />
              </div>
              <ShareButton filters={appliedFilters} year={focusYear} />
            </div>
          </div>
          <p className="mt-4 max-w-prose text-pretty text-sm leading-[1.75] text-muted sm:mt-6 sm:text-base">
            A chronological record of Nepal&apos;s internal armed conflict
            (1996–2006), compiled for transitional justice civil society. The
            archive currently opens with pre-conflict events from 1995.
          </p>
          {collectionMeta ? (
            <p className="mt-4 text-xs font-medium tracking-[0.12em] text-muted uppercase">
              {collectionMeta.count}{' '}
              {collectionMeta.count === 1 ? 'event' : 'events'}
              {collectionMeta.span ? ` · ${collectionMeta.span}` : ''}
            </p>
          ) : null}
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

      <main id="timeline" tabIndex={-1} className="pt-5 outline-none sm:pt-8">
        {loadState.status === 'loading' ? <ArchiveSkeleton /> : null}

        {loadState.status === 'error' ? (
          <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8" role="alert">
            <div className="max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
              <p className="font-serif text-xl text-ink">
                The archive could not be loaded
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {loadState.message}
              </p>
              <button
                type="button"
                className="btn-text-accent mt-5"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
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
            onReset={
              hasActiveFilters ? () => setFilters(EMPTY_FILTERS) : undefined
            }
          />
        ) : null}
      </main>

      <footer
        aria-label="About this archive"
        className={[
          'border-t border-line/80',
          // Extra space so the license line sits above the fixed mobile year dock.
          loadState.status === 'ready' && filteredEvents.length > 0
            ? 'pb-[calc(var(--dock-h)+1.25rem)] lg:pb-0'
            : '',
        ].join(' ')}
      >
        <div className="mx-auto max-w-5xl px-5 py-10 text-sm leading-[1.75] text-muted sm:px-8">
          <p className="font-serif text-base text-ink">{SITE_NAME}</p>
          <p className="mt-3 max-w-prose">
            Open-source public archive. Application code is MIT licensed. Event
            texts retain the provenance of the source sheet, documented in{' '}
            <a href={DATA_DOC_URL} className="link-accent">
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

function ArchiveSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-16 sm:px-8" role="status">
      <p className="sr-only">Loading the archive…</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="skeleton h-11 flex-1 rounded-xl" />
        <div className="skeleton hidden h-11 w-40 rounded-xl sm:block" />
      </div>
      <div className="mt-5 flex gap-2.5 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="skeleton h-10 w-24 shrink-0 rounded-full"
          />
        ))}
      </div>
      <div className="mt-12 h-px bg-line/80" />
      <div className="mt-8 flex items-center gap-3">
        <span className="skeleton size-2.5 rounded-full" />
        <div className="skeleton h-8 w-24 rounded-md" />
        <div className="skeleton h-4 w-16 rounded-md" />
      </div>
      <div className="relative ms-1.5 mt-6 border-s-2 border-line ps-5 sm:ms-3 sm:ps-8">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="relative pb-5 last:pb-0"
          >
            <span
              aria-hidden="true"
              className="absolute -start-[1.3rem] top-6 size-2.5 rounded-full border-2 border-paper bg-chip-strong sm:-start-[1.85rem] sm:top-7"
            />
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-6">
              <div className="sm:flex sm:gap-5">
                <div className="skeleton mb-3 h-16 w-20 rounded-lg sm:mb-0" />
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="skeleton h-4 w-full rounded-md" />
                  <div className="skeleton h-4 w-[92%] rounded-md" />
                  <div className="skeleton h-4 w-[70%] rounded-md" />
                  <div className="mt-4 flex gap-2">
                    <div className="skeleton h-9 w-20 rounded-full" />
                    <div className="skeleton h-9 w-24 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
