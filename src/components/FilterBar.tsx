import { useEffect, useRef } from 'react'
import type { TimelineFilters } from '../lib/filterEvents'
import type { TagCount } from '../lib/parseTags'
import type { SearchSuggestion } from '../lib/searchSuggest'
import { KeywordCloud } from './KeywordCloud'
import { SearchSuggest } from './SearchSuggest'

/** Sticky search row. Publishes `--filter-h` (search chrome only; theme chips scroll away). */

type FilterBarProps = {
  filters: TimelineFilters
  categories: string[]
  organizations: string[]
  keywords: TagCount[]
  searchIndex: SearchSuggestion[]
  resultCount: number
  totalCount: number
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onOrganizationChange: (value: string) => void
  onKeywordClick: (keyword: string) => void
  onReset: () => void
}

export function FilterBar({
  filters,
  categories,
  organizations,
  keywords,
  searchIndex,
  resultCount,
  totalCount,
  onSearchChange,
  onCategoryChange,
  onOrganizationChange,
  onKeywordClick,
  onReset,
}: FilterBarProps) {
  const stickyRef = useRef<HTMLDivElement>(null)
  const hasKeywords = keywords.length > 0
  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.category !== '' ||
    filters.organization !== '' ||
    filters.keyword !== ''

  useEffect(() => {
    const nav = stickyRef.current
    if (!nav) return

    function syncHeight() {
      if (!nav) return
      // Skip-link targets and card permalinks sit below this measured bar.
      document.documentElement.style.setProperty(
        '--filter-h',
        `${Math.round(nav.getBoundingClientRect().height)}px`,
      )
    }

    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(nav)
    const classObserver = new MutationObserver(syncHeight)
    classObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    window.addEventListener('resize', syncHeight)
    return () => {
      observer.disconnect()
      classObserver.disconnect()
      window.removeEventListener('resize', syncHeight)
      document.documentElement.style.removeProperty('--filter-h')
    }
  }, [])

  return (
    <nav aria-label="Filter the timeline">
      <div
        ref={stickyRef}
        className="sticky top-0 z-30 border-b border-line bg-paper pt-[env(safe-area-inset-top)]"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-3 sm:px-8">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <SearchSuggest
              value={filters.search}
              index={searchIndex}
              onChange={onSearchChange}
            />

            {categories.length > 0 ? (
              <div className="hidden min-w-[10rem] sm:block sm:w-44">
                <label htmlFor="timeline-category" className="sr-only">
                  Category
                </label>
                <select
                  id="timeline-category"
                  value={filters.category}
                  onChange={(event) => onCategoryChange(event.target.value)}
                  className="input-field"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {organizations.length > 0 ? (
              <div className="hidden min-w-[10rem] sm:block sm:w-44">
                <label htmlFor="timeline-organization" className="sr-only">
                  Organization
                </label>
                <select
                  id="timeline-organization"
                  value={filters.organization}
                  onChange={(event) => onOrganizationChange(event.target.value)}
                  className="input-field"
                >
                  <option value="">All organizations</option>
                  {organizations.map((organization) => (
                    <option key={organization} value={organization}>
                      {organization}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex min-h-11 w-full min-w-0 shrink-0 items-center gap-2.5 sm:w-auto">
              <p role="status" aria-atomic="true" className="sr-only">
                Showing {resultCount} of {totalCount} events
                {filters.keyword ? ` tagged ${filters.keyword}` : ''}
              </p>
              <p
                className="inline-flex min-h-8 min-w-0 items-center truncate text-sm text-muted"
                aria-hidden="true"
              >
                <span className="sm:hidden">
                  {resultCount}/{totalCount}
                </span>
                <span className="hidden sm:inline">
                  {resultCount} of {totalCount} events
                </span>
              </p>
              {filters.keyword ? (
                <button
                  type="button"
                  aria-pressed="true"
                  aria-label={`${filters.keyword}, selected. Activate to remove filter.`}
                  onClick={() => onKeywordClick(filters.keyword)}
                  className="inline-flex min-h-11 max-w-[10rem] shrink-0 items-center truncate rounded-sm border border-crimson bg-crimson-soft px-3 text-sm font-medium text-crimson"
                >
                  {filters.keyword}
                </button>
              ) : null}
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={onReset}
                  className="btn-text-accent ms-auto shrink-0 px-2 sm:ms-0"
                >
                  Reset<span className="hidden sm:inline"> filters</span>
                </button>
              ) : null}
            </div>
          </div>

          {categories.length > 0 || organizations.length > 0 ? (
            <div className="flex min-w-0 flex-wrap gap-2 sm:hidden">
              {categories.length > 0 ? (
                <select
                  aria-label="Category"
                  value={filters.category}
                  onChange={(event) => onCategoryChange(event.target.value)}
                  className="input-field min-w-0 flex-1"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              ) : null}
              {organizations.length > 0 ? (
                <select
                  aria-label="Organization"
                  value={filters.organization}
                  onChange={(event) => onOrganizationChange(event.target.value)}
                  className="input-field min-w-0 flex-1"
                >
                  <option value="">All organizations</option>
                  {organizations.map((organization) => (
                    <option key={organization} value={organization}>
                      {organization}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {hasKeywords ? (
        <div className="border-b border-line/80 bg-paper/60">
          <div className="mx-auto max-w-5xl px-5 py-2.5 sm:px-8">
            <p className="mb-2 text-[0.7rem] font-medium tracking-[0.16em] text-muted uppercase">
              Themes
            </p>
            <KeywordCloud
              tags={keywords}
              activeKeyword={filters.keyword}
              onKeywordClick={onKeywordClick}
            />
          </div>
        </div>
      ) : null}
    </nav>
  )
}
