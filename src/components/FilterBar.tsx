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
      // Sticky year headings and skip-link scroll-margin sit below this measured bar.
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
        className="sticky top-0 z-30 border-b border-line bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-2.5 sm:px-8">
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
                  className="min-h-11 w-full rounded-md border border-control bg-surface px-3 py-2.5 text-base text-ink"
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
                  className="min-h-11 w-full rounded-md border border-control bg-surface px-3 py-2.5 text-base text-ink"
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

            <div className="flex min-h-11 shrink-0 items-center gap-3">
              <p role="status" aria-atomic="true" className="sr-only">
                Showing {resultCount} of {totalCount} events
                {filters.keyword ? ` tagged ${filters.keyword}` : ''}
              </p>
              <p className="min-w-0 truncate text-sm text-muted" aria-hidden="true">
                <span className="sm:hidden">
                  {resultCount}/{totalCount}
                  {filters.keyword ? ` · ${filters.keyword}` : ''}
                </span>
                <span className="hidden sm:inline">
                  Showing {resultCount} of {totalCount} events
                  {filters.keyword ? ` tagged ${filters.keyword}` : ''}
                </span>
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={onReset}
                  className="min-h-11 shrink-0 px-2 text-sm font-medium text-crimson underline underline-offset-2"
                >
                  Reset filters
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
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-control bg-surface px-3 text-base text-ink"
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
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-control bg-surface px-3 text-base text-ink"
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
        <div className="border-b border-line bg-paper">
          <div className="mx-auto max-w-5xl px-5 py-2 sm:px-8">
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
