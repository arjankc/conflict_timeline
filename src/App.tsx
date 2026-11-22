import { useEffect, useMemo, useRef, useState } from 'react'
import { ArchiveOverview } from './components/ArchiveOverview'
import { BackToTop } from './components/BackToTop'
import { ChronologyExplorer } from './components/ChronologyExplorer'
import { FilterBar } from './components/FilterBar'
import { HeaderLinks } from './components/HeaderLinks'
import { ShareButton } from './components/ShareButton'
import { ThemeToggle } from './components/ThemeToggle'
import { ReadingControls } from './components/ReadingControls'
import { Toast } from './components/Toast'
import { showToast } from './lib/toast'
import { EMPTY_FILTERS, filterEvents, normalizeFilters, type TimelineFilters } from './lib/filterEvents'
import { eventCardId } from './lib/eventAnchor'
import { cycleMatchIndex } from './lib/matchNav'
import { subscribeTimelineLoad } from './lib/loadEvents'
import { countTags, uniqueTags, type TagCount } from './lib/parseTags'
import {
  facetOrder,
  isVisibleKeyword,
  keywordFacet,
} from './lib/keywordTaxonomy'
import { buildSearchIndex } from './lib/searchSuggest'
import { effectiveDistricts } from './lib/eventGeography'
import { downloadFile, eventsToCsv, eventsToJson } from './lib/exportView'
import {
  deleteView,
  loadSavedViews,
  saveView,
  type SavedView,
} from './lib/savedViews'
import { pageDescription, pageTitle } from './lib/seo'
import { DATA_DOC_URL, FEEDBACK_FORM_URL, REPO_URL, SITE_NAME } from './lib/site'
import {
  detectFilterChange,
  trackExport,
  trackFilterChange,
  trackFilterReset,
  trackPageView,
  trackSavedView,
  trackSearch,
  trackYearNavigate,
} from './lib/analytics'
import { readExplorerQuery, writeExplorerQuery } from './lib/urlState'
import { useDebouncedValue } from './lib/useDebouncedValue'
import type { ConflictEvent } from './types/event'

/**
 * Root shell: skip links, header (appearance + share), sticky filters, explorer, footer.
 * View state is the query string; there is no React Router.
 */

const SEARCH_DEBOUNCE_MS = 200

type LoadState = {
  status: 'loading' | 'parsing' | 'ready' | 'error'
  events: ConflictEvent[]
  message?: string
}

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>({
    status: 'loading',
    events: [],
  })
  const [filters, setFilters] = useState<TimelineFilters>(
    () => normalizeFilters(readExplorerQuery().filters),
  )
  const [focusYear, setFocusYear] = useState<number | undefined>(
    () => readExplorerQuery().year,
  )
  const [compact, setCompact] = useState(false)
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => loadSavedViews())
  const [matchIndex, setMatchIndex] = useState(0)
  const [matchAnchor, setMatchAnchor] = useState<{ id: string; sequence: number } | undefined>()
  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    return subscribeTimelineLoad((update) => {
      if (update.error && update.events.length === 0) {
        setLoadState({ status: 'error', events: [], message: update.error })
        return
      }
      setLoadState({
        status: update.done ? 'ready' : update.events.length > 0 ? 'parsing' : 'loading',
        events: update.events,
      })
    })
  }, [])

  const appliedFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  )

  // Debounced filters so the address bar and the list stay in sync without a write on every keystroke.
  useEffect(() => {
    writeExplorerQuery(appliedFilters, focusYear)
    trackPageView(window.location.pathname + window.location.search)
  }, [appliedFilters, focusYear])

  const categories = useMemo(
    () =>
      loadState.events.length > 0
        ? uniqueTags(loadState.events.map((event) => event.categories))
        : [],
    [loadState],
  )

  const organizations = useMemo(
    () =>
      loadState.events.length > 0
        ? uniqueTags(loadState.events.map((event) => event.organizations))
        : [],
    [loadState],
  )

  const categoryCounts = useMemo(
    () =>
      loadState.events.length > 0
        ? countTags(loadState.events.map((event) => event.categories))
        : [],
    [loadState],
  )

  const organizationCounts = useMemo(
    () =>
      loadState.events.length > 0
        ? countTags(loadState.events.map((event) => event.organizations))
        : [],
    [loadState],
  )

  const districtCounts = useMemo(
    () =>
      loadState.events.length > 0
        ? countTags(loadState.events.map((event) => effectiveDistricts(event)))
        : [],
    [loadState],
  )

  const districts = useMemo(() => districtCounts.map((d) => d.label), [districtCounts])

  const keywordCounts = useMemo(
    () =>
      loadState.events.length > 0
        ? countTags(
            loadState.events.map((event) =>
              event.keywords.filter(isVisibleKeyword),
            ),
          )
        : [],
    [loadState],
  )

  /** Visible keywords grouped by taxonomy facet (Districts live in their own UI). */
  const facetGroups = useMemo(() => {
    const byFacet = new Map<string, TagCount[]>()
    for (const tag of keywordCounts) {
      const facet = keywordFacet(tag.label)
      if (!facet || facet === 'Districts') continue
      const list = byFacet.get(facet) ?? []
      list.push(tag)
      byFacet.set(facet, list)
    }
    return facetOrder().map((facet) => ({
      facet,
      tags: byFacet.get(facet) ?? [],
    })).filter((group) => group.tags.length > 0)
  }, [keywordCounts])

  const visibleThemeCount = useMemo(
    () => facetGroups.reduce((sum, group) => sum + group.tags.length, 0),
    [facetGroups],
  )

  const searchIndex = useMemo(
    () =>
      loadState.status === 'ready' ? buildSearchIndex(loadState.events) : [],
    [loadState],
  )

  const filteredEvents = useMemo(
    () =>
      loadState.events.length > 0
        ? filterEvents(loadState.events, appliedFilters)
        : [],
    [loadState, appliedFilters],
  )

  // One search event per distinct query (raw text never leaves the browser).
  const prevTrackedSearch = useRef('')
  useEffect(() => {
    const query = debouncedSearch.trim()
    if (query === '') {
      prevTrackedSearch.current = ''
      return
    }
    if (query !== prevTrackedSearch.current) {
      prevTrackedSearch.current = query
      trackSearch(filteredEvents.length, query.length)
    }
  }, [debouncedSearch, filteredEvents.length])

  // One filter event per change, naming the first facet that differs.
  const prevTrackedFilters = useRef<TimelineFilters | null>(null)
  const skipFilterDiff = useRef(false)
  useEffect(() => {
    const prev = prevTrackedFilters.current
    prevTrackedFilters.current = appliedFilters
    if (!prev) return
    if (skipFilterDiff.current) {
      skipFilterDiff.current = false
      return
    }
    const change = detectFilterChange(prev, appliedFilters)
    if (change) trackFilterChange(change.facet, change.valueCount, change.values)
  }, [appliedFilters])

  const searching = appliedFilters.search.trim() !== ''
  // Every filtered event contains the needle, so the feed order is the match order.
  const matchTotal = searching ? filteredEvents.length : 0

  // Restart match navigation whenever the result set changes.
  useEffect(() => {
    setMatchIndex(0)
    setMatchAnchor(undefined)
  }, [appliedFilters])

  function stepMatch(delta: 1 | -1) {
    if (matchTotal === 0) return
    const next = cycleMatchIndex(matchIndex, delta, matchTotal)
    setMatchIndex(next)
    const id = filteredEvents[next]?.id
    if (id) {
      setMatchAnchor((current) => ({
        id: eventCardId(id),
        sequence: (current?.sequence ?? 0) + 1,
      }))
    }
  }

  const collectionMeta = useMemo(() => {
    if (loadState.events.length === 0) return null
    const years = loadState.events
      .map((event) => event.year)
      .filter((year): year is number => year != null)
    const span =
      years.length === 0
        ? null
        : Math.min(...years) === Math.max(...years)
          ? String(Math.min(...years))
          : `${Math.min(...years)}–${Math.max(...years)}`
    const withSources = loadState.events.filter(
      (event) => event.sources.length > 0,
    ).length
    const confidence = {
      high: loadState.events.filter((event) => event.confidence === 'high').length,
      medium: loadState.events.filter((event) => event.confidence === 'medium').length,
      low: loadState.events.filter((event) => event.confidence === 'low').length,
    }
    return { count: loadState.events.length, span, withSources, confidence }
  }, [loadState])

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.keywords.length > 0 ||
    filters.categories.length > 0 ||
    filters.organizations.length > 0 ||
    filters.districts.length > 0 ||
    filters.confidence !== '' ||
    filters.sort !== 'chronological' ||
    filters.match !== 'any' ||
    filters.from !== '' ||
    filters.to !== ''

  // Browser tab title only. Open Graph / Twitter tags in index.html stay on the homepage copy.
  useEffect(() => {
    document.title = pageTitle(appliedFilters, focusYear)
    const description = pageDescription(
      appliedFilters,
      focusYear,
      loadState.events.length > 0 ? filteredEvents.length : undefined,
    )
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', description)
  }, [appliedFilters, focusYear, filteredEvents.length, loadState.events.length])

  function updateFilter<K extends keyof TimelineFilters>(
    key: K,
    value: TimelineFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function toggleListFilter(
    key: 'keywords' | 'categories' | 'organizations' | 'districts',
    value: string,
  ) {
    setFilters((current) => {
      const list = current[key]
      const k = value.toLowerCase()
      const exists = list.some((item) => item.toLowerCase() === k)
      return {
        ...current,
        [key]: exists
          ? list.filter((item) => item.toLowerCase() !== k)
          : [...list, value],
      }
    })
  }

  function handleYearSelect(year: number | null) {
    setFocusYear(year ?? undefined)
    trackYearNavigate(year)
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <div className="masthead-rule" aria-hidden="true" />
      <nav aria-label="Skip links" className="contents">
        <a
          href="#timeline-search"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-[max(0.75rem,env(safe-area-inset-top))] focus:z-50 focus:rounded-sm focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to search
        </a>
        <a
          href="#years"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-[max(3.25rem,calc(env(safe-area-inset-top)+2.5rem))] focus:z-50 focus:rounded-sm focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to year navigation
        </a>
        <a
          href="#timeline"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-[max(5.75rem,calc(env(safe-area-inset-top)+5rem))] focus:z-50 focus:rounded-sm focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
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
              </p>
              <h1 className="mt-2.5 text-balance font-display text-[2rem] leading-[1.05] tracking-tight text-ink sm:text-5xl sm:leading-[1.08]">
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
              <HeaderLinks />
            </div>
          </div>
          <p className="mt-4 max-w-prose text-pretty text-sm leading-[1.75] text-muted sm:mt-6 sm:text-base">
            A chronological record of Nepal&apos;s internal armed conflict
            (1 November 1995 - 8 September 2025)
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

      {loadState.events.length > 0 ? (
        <FilterBar
          filters={filters}
          categories={categories}
          organizations={organizations}
          districts={districts}
          categoryCounts={categoryCounts}
          organizationCounts={organizationCounts}
          districtCounts={districtCounts}
          facetGroups={facetGroups}
          themeCount={visibleThemeCount}
          searchIndex={searchIndex}
          resultCount={filteredEvents.length}
          totalCount={loadState.events.length}
          compact={compact}
          savedViews={savedViews}
          onSearchChange={(value) => updateFilter('search', value)}
          onToggleKeyword={(keyword) => toggleListFilter('keywords', keyword)}
          onToggleCategory={(category) => toggleListFilter('categories', category)}
          onToggleOrganization={(organization) =>
            toggleListFilter('organizations', organization)
          }
          onToggleDistrict={(district) => toggleListFilter('districts', district)}
          onClearFacet={(facet) => updateFilter(facet, [])}
          onConfidenceChange={(value) => updateFilter('confidence', value)}
          onSortChange={(value) => updateFilter('sort', value)}
          onMatchChange={(value) => updateFilter('match', value)}
          onFromChange={(value) => updateFilter('from', value)}
          onToChange={(value) => updateFilter('to', value)}
          onCompactChange={setCompact}
          matchIndex={matchIndex}
          matchTotal={matchTotal}
          showMatches={searching && matchTotal > 0}
          onNextMatch={() => stepMatch(1)}
          onPrevMatch={() => stepMatch(-1)}
          onSaveView={(name) => {
            setSavedViews(saveView(name, appliedFilters, focusYear))
            trackSavedView('save')
          }}
          onApplyView={(view) => {
            setFilters(normalizeFilters(view.filters))
            setFocusYear(view.year)
            trackSavedView('apply')
          }}
          onDeleteView={(id) => {
            setSavedViews(deleteView(id))
            trackSavedView('delete')
          }}
          onExportCsv={() => {
            downloadFile('nepal-conflict-timeline.csv', 'text/csv', eventsToCsv(filteredEvents))
            showToast(`Exported ${filteredEvents.length} events as CSV`)
            trackExport('csv', filteredEvents.length)
          }}
          onExportJson={() => {
            downloadFile('nepal-conflict-timeline.json', 'application/json', eventsToJson(filteredEvents))
            showToast(`Exported ${filteredEvents.length} events as JSON`)
            trackExport('json', filteredEvents.length)
          }}
          onReset={() => {
            skipFilterDiff.current = true
            setFilters(EMPTY_FILTERS)
            trackFilterReset()
          }}
        />
      ) : null}

      <main id="timeline" tabIndex={-1} className="pt-5 outline-none sm:pt-8">
        {loadState.status === 'loading' ? <ArchiveSkeleton /> : null}

        {loadState.events.length > 0 && collectionMeta ? (
          <div className="pb-5">
            <ArchiveOverview
              events={loadState.events}
              totalCount={collectionMeta.count}
              withSources={collectionMeta.withSources}
              confidence={collectionMeta.confidence}
              span={collectionMeta.span}
              focusYear={focusYear}
              onYearSelect={(year) => handleYearSelect(year)}
            />
          </div>
        ) : null}

        {loadState.status === 'parsing' ? (
          <p
            className="mx-auto max-w-5xl px-5 pb-3 text-sm text-muted sm:px-8"
            role="status"
          >
            Reading the archive… {loadState.events.length} events so far
          </p>
        ) : null}

        {loadState.status === 'error' ? (
          <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8" role="alert">
            <div className="max-w-lg rounded-sm border border-line bg-surface p-6 sm:p-8">
              <p className="font-display text-xl text-ink">
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

        {loadState.events.length > 0 ? (
          <ChronologyExplorer
            events={filteredEvents}
            focusYear={focusYear}
            search={appliedFilters.search}
            activeKeywords={filters.keywords}
            activeCategories={filters.categories}
            activeOrganizations={filters.organizations}
            activeDistricts={filters.districts}
            compact={compact}
            matchAnchor={matchAnchor}
            onYearChange={(year) => handleYearSelect(year)}
            onKeywordClick={(keyword) => toggleListFilter('keywords', keyword)}
            onCategoryClick={(category) => toggleListFilter('categories', category)}
            onOrganizationClick={(organization) =>
              toggleListFilter('organizations', organization)
            }
            onDistrictClick={(district) => toggleListFilter('districts', district)}
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
          loadState.events.length > 0 && filteredEvents.length > 0
            ? 'pb-[calc(var(--dock-h)+1.25rem)] lg:pb-0'
            : '',
        ].join(' ')}
      >
        <div className="mx-auto max-w-5xl px-5 py-10 text-sm leading-[1.75] text-muted sm:px-8">
          <p className="font-display text-base text-ink">{SITE_NAME}</p>
          <p className="mt-3 max-w-prose">
            Open-source public archive. Application code is MIT licensed —
            source on{' '}
            <a href={REPO_URL} className="link-accent">
              GitHub
            </a>
            . Event texts retain the provenance of the source sheet,
            documented in{' '}
            <a href={DATA_DOC_URL} className="link-accent">
              DATA.md
            </a>
            .
          </p>
          <p className="mt-3 max-w-prose">
            This is a living archive.{' '}
            <a href={FEEDBACK_FORM_URL} className="link-accent">
              Give feedback or contribute a correction
            </a>
            .
          </p>
        </div>
      </footer>
      {loadState.events.length > 0 ? <BackToTop /> : null}
      <Toast />
    </div>
  )
}

function ArchiveSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-16 sm:px-8" role="status">
      <p className="sr-only">Loading the archive…</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="skeleton h-11 flex-1 rounded-sm" />
        <div className="skeleton hidden h-11 w-40 rounded-sm sm:block" />
      </div>
      <div className="mt-5 flex gap-2.5 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="skeleton h-10 w-24 shrink-0 rounded-sm"
          />
        ))}
      </div>
      <div className="mt-12 h-px bg-line/80" />
      <div className="mt-8 flex items-center gap-3">
        <span className="skeleton size-2.5" />
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
              className="absolute -start-[1.3rem] top-6 size-2 border-2 border-paper bg-chip-strong sm:-start-[1.85rem] sm:top-7"
            />
            <div className="rounded-sm border border-line bg-surface p-4 sm:p-6">
              <div className="sm:flex sm:gap-5">
                <div className="skeleton mb-3 h-16 w-20 rounded-lg sm:mb-0" />
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="skeleton h-4 w-full rounded-md" />
                  <div className="skeleton h-4 w-[92%] rounded-md" />
                  <div className="skeleton h-4 w-[70%] rounded-md" />
                  <div className="mt-4 flex gap-2">
                    <div className="skeleton h-9 w-20 rounded-sm" />
                    <div className="skeleton h-9 w-24 rounded-sm" />
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
