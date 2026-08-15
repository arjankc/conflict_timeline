import type { TimelineFilters } from '../lib/filterEvents'

type FilterBarProps = {
  filters: TimelineFilters
  categories: string[]
  organizations: string[]
  resultCount: number
  totalCount: number
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onOrganizationChange: (value: string) => void
  onKeywordClear: () => void
  onReset: () => void
}

export function FilterBar({
  filters,
  categories,
  organizations,
  resultCount,
  totalCount,
  onSearchChange,
  onCategoryChange,
  onOrganizationChange,
  onKeywordClear,
  onReset,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.category !== '' ||
    filters.organization !== '' ||
    filters.keyword !== ''

  return (
    <nav
      aria-label="Filter the timeline"
      className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="timeline-search" className="text-sm font-medium text-muted">
              Search event descriptions
            </label>
            <input
              id="timeline-search"
              type="search"
              value={filters.search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search details"
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-base text-ink placeholder:text-stone-400"
            />
          </div>

          {categories.length > 0 ? (
            <div className="sm:w-44">
              <label htmlFor="timeline-category" className="text-sm font-medium text-muted">
                Category
              </label>
              <select
                id="timeline-category"
                value={filters.category}
                onChange={(event) => onCategoryChange(event.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-base text-ink"
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
            <div className="sm:w-44">
              <label htmlFor="timeline-organization" className="text-sm font-medium text-muted">
                Organization
              </label>
              <select
                id="timeline-organization"
                value={filters.organization}
                onChange={(event) => onOrganizationChange(event.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-base text-ink"
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
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted" aria-live="polite">
            Showing {resultCount} of {totalCount} events
            {filters.keyword ? (
              <>
                {' '}
                tagged{' '}
                <span className="font-medium text-ink">{filters.keyword}</span>
              </>
            ) : null}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {filters.keyword ? (
              <button
                type="button"
                onClick={onKeywordClear}
                className="rounded-full border border-crimson bg-crimson-soft px-3 py-1 text-sm text-crimson"
              >
                Clear keyword
                <span className="sr-only"> {filters.keyword}</span>
              </button>
            ) : null}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={onReset}
                className="text-sm font-medium text-crimson underline-offset-2 hover:underline"
              >
                Reset filters
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  )
}
