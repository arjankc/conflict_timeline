import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { SortMode, TimelineFilters } from '../lib/filterEvents'
import type { TagCount } from '../lib/parseTags'
import type { SavedView } from '../lib/savedViews'
import type { SearchSuggestion } from '../lib/searchSuggest'
import { KeywordCloud } from './KeywordCloud'
import { SearchSuggest } from './SearchSuggest'

/** Sticky search row. Publishes `--filter-h` (search chrome only; theme chips scroll away). */

type FilterBarProps = {
  filters: TimelineFilters
  categories: string[]
  organizations: string[]
  districts: string[]
  categoryCounts: TagCount[]
  organizationCounts: TagCount[]
  districtCounts: TagCount[]
  keywords: TagCount[]
  allKeywords: TagCount[]
  searchIndex: SearchSuggestion[]
  resultCount: number
  totalCount: number
  compact: boolean
  savedViews: SavedView[]
  onSearchChange: (value: string) => void
  onToggleKeyword: (keyword: string) => void
  onToggleCategory: (category: string) => void
  onToggleOrganization: (organization: string) => void
  onToggleDistrict: (district: string) => void
  onClearFacet: (facet: 'keywords' | 'categories' | 'organizations' | 'districts') => void
  onConfidenceChange: (value: TimelineFilters['confidence']) => void
  onSortChange: (value: SortMode) => void
  onMatchChange: (value: TimelineFilters['match']) => void
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onCompactChange: (value: boolean) => void
  onSaveView: (name: string) => void
  onApplyView: (view: SavedView) => void
  onDeleteView: (id: string) => void
  onExportCsv: () => void
  onExportJson: () => void
  onReset: () => void
}

function FacetDropdown({
  id,
  label,
  options,
  counts,
  selected,
  onToggle,
  onClear,
}: {
  id: string
  label: string
  options: string[]
  counts: TagCount[]
  selected: string[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const countByKey = new Map(counts.map((c) => [c.label.toLowerCase(), c.count]))
  const selectedSet = new Set(selected.map((s) => s.toLowerCase()))

  function onKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.currentTarget.removeAttribute('open')
    }
  }

  return (
    <details
      name="filter-facets"
      className="relative min-w-[10rem] sm:w-44"
      onKeyDown={onKeyDown}
    >
      <summary className="input-field cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {label}
        {selected.length > 0 ? ` (${selected.length})` : ''}
      </summary>
      <div className="absolute z-40 mt-1 max-h-72 w-64 overflow-y-auto rounded-sm border border-line bg-surface p-2 shadow-float">
        {options.length === 0 ? (
          <p className="px-2 py-2 text-sm text-muted">No options</p>
        ) : (
          <ul className="space-y-0.5">
            {options.map((option) => {
              const checked = selectedSet.has(option.toLowerCase())
              const count = countByKey.get(option.toLowerCase())
              const checkboxId = `${id}-${option.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
              return (
                <li key={option}>
                  <label
                    htmlFor={checkboxId}
                    className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm hover:bg-chip"
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(option)}
                      className="size-4 shrink-0 accent-crimson"
                    />
                    <span className="min-w-0 flex-1 truncate">{option}</span>
                    {count != null ? (
                      <span className="shrink-0 text-xs text-muted tabular-nums">{count}</span>
                    ) : null}
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="btn-text-accent mt-1 px-2 text-sm"
          >
            Clear {label.toLowerCase()}
          </button>
        ) : null}
      </div>
    </details>
  )
}

export function FilterBar({
  filters,
  categories,
  organizations,
  districts,
  categoryCounts,
  organizationCounts,
  districtCounts,
  keywords,
  allKeywords,
  searchIndex,
  resultCount,
  totalCount,
  compact,
  savedViews,
  onSearchChange,
  onToggleKeyword,
  onToggleCategory,
  onToggleOrganization,
  onToggleDistrict,
  onClearFacet,
  onConfidenceChange,
  onSortChange,
  onMatchChange,
  onFromChange,
  onToChange,
  onCompactChange,
  onSaveView,
  onApplyView,
  onDeleteView,
  onExportCsv,
  onExportJson,
  onReset,
}: FilterBarProps) {
  const stickyRef = useRef<HTMLDivElement>(null)
  const hasKeywords = keywords.length > 0
  const [viewName, setViewName] = useState('')
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

  // Non-search controls, for the mobile disclosure badge.
  const filterCount =
    filters.keywords.length +
    filters.categories.length +
    filters.organizations.length +
    filters.districts.length +
    (filters.confidence !== '' ? 1 : 0) +
    (filters.sort !== 'chronological' ? 1 : 0) +
    (filters.match !== 'any' ? 1 : 0) +
    (filters.from !== '' || filters.to !== '' ? 1 : 0)

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

  function saveCurrentView() {
    if (!viewName.trim()) return
    onSaveView(viewName.trim())
    setViewName('')
  }

  function closeOnEscape(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') event.currentTarget.removeAttribute('open')
  }

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

            <div className="hidden sm:contents">
              <FacetDropdown
                id="timeline-category"
                label="Categories"
                options={categories}
                counts={categoryCounts}
                selected={filters.categories}
                onToggle={onToggleCategory}
                onClear={() => onClearFacet('categories')}
              />
              <FacetDropdown
                id="timeline-organization"
                label="Organizations"
                options={organizations}
                counts={organizationCounts}
                selected={filters.organizations}
                onToggle={onToggleOrganization}
                onClear={() => onClearFacet('organizations')}
              />
              <FacetDropdown
                id="timeline-district"
                label="Districts"
                options={districts}
                counts={districtCounts}
                selected={filters.districts}
                onToggle={onToggleDistrict}
                onClear={() => onClearFacet('districts')}
              />
            </div>

            <div className="hidden min-w-[8rem] sm:block sm:w-36">
              <label htmlFor="timeline-confidence" className="sr-only">
                Confidence
              </label>
              <select
                id="timeline-confidence"
                value={filters.confidence}
                onChange={(event) =>
                  onConfidenceChange(
                    event.target.value as TimelineFilters['confidence'],
                  )
                }
                className="input-field"
              >
                <option value="">Any confidence</option>
                <option value="high">High confidence</option>
                <option value="medium">Medium confidence</option>
                <option value="low">Low confidence</option>
              </select>
            </div>

            <div className="hidden min-w-[8rem] sm:block sm:w-36">
              <label htmlFor="timeline-sort" className="sr-only">
                Sort order
              </label>
              <select
                id="timeline-sort"
                value={filters.sort}
                onChange={(event) => onSortChange(event.target.value as SortMode)}
                className="input-field"
              >
                <option value="chronological">Oldest first</option>
                <option value="reverse">Newest first</option>
                <option value="category">Grouped by category</option>
              </select>
            </div>

            <div
              role="group"
              aria-label="Match mode within facets"
              className="hidden min-w-[8rem] items-center rounded-sm border border-line bg-surface sm:inline-flex"
            >
              {(['any', 'all'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={filters.match === mode}
                  title={
                    mode === 'any'
                      ? 'Match any selected value (OR)'
                      : 'Match every selected value (AND)'
                  }
                  onClick={() => onMatchChange(mode)}
                  className={[
                    'min-h-11 flex-1 px-2 text-[0.8125rem] capitalize transition-colors',
                    filters.match === mode
                      ? 'font-medium text-crimson'
                      : 'text-muted hover:text-ink',
                  ].join(' ')}
                >
                  {mode === 'any' ? 'Any' : 'All'}
                </button>
              ))}
            </div>

            <button
              type="button"
              aria-pressed={compact}
              title={compact ? 'Comfortable density' : 'Compact density'}
              onClick={() => onCompactChange(!compact)}
              className="icon-btn hidden px-3 text-sm sm:inline-flex"
            >
              {compact ? 'Comfortable' : 'Compact'}
            </button>

            <div className="flex min-h-11 w-full min-w-0 shrink-0 items-center gap-2.5 sm:w-auto">
              <p role="status" aria-atomic="true" className="sr-only">
                Showing {resultCount} of {totalCount} events
                {filters.keywords.length > 0 ? ` tagged ${filters.keywords.join(', ')}` : ''}
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

          <div className="hidden min-w-0 flex-wrap items-center gap-2 sm:flex">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted sm:flex-none">
              From
              <input
                type="month"
                value={filters.from}
                min="1995-01"
                max="2026-12"
                onChange={(event) => onFromChange(event.target.value)}
                className="input-field min-w-0 flex-1 sm:w-36 sm:flex-none"
                aria-label="Filter from month"
              />
            </label>
            <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted sm:flex-none">
              To
              <input
                type="month"
                value={filters.to}
                min="1995-01"
                max="2026-12"
                onChange={(event) => onToChange(event.target.value)}
                className="input-field min-w-0 flex-1 sm:w-36 sm:flex-none"
                aria-label="Filter to month"
              />
            </label>
          </div>

          <details className="sm:hidden">
            <summary className="input-field cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              Filters{filterCount > 0 ? ` (${filterCount})` : ''}
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted">
                  From
                  <input
                    type="month"
                    value={filters.from}
                    min="1995-01"
                    max="2026-12"
                    onChange={(event) => onFromChange(event.target.value)}
                    className="input-field min-w-0 flex-1"
                    aria-label="Filter from month"
                  />
                </label>
                <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted">
                  To
                  <input
                    type="month"
                    value={filters.to}
                    min="1995-01"
                    max="2026-12"
                    onChange={(event) => onToChange(event.target.value)}
                    className="input-field min-w-0 flex-1"
                    aria-label="Filter to month"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-pressed={compact}
                  onClick={() => onCompactChange(!compact)}
                  className="icon-btn px-3 text-sm"
                >
                  {compact ? 'Comfort' : 'Compact'}
                </button>
                <label className="sr-only" htmlFor="timeline-sort-mobile">
                  Sort order
                </label>
                <select
                  id="timeline-sort-mobile"
                  value={filters.sort}
                  onChange={(event) => onSortChange(event.target.value as SortMode)}
                  className="input-field min-w-0 flex-1"
                >
                  <option value="chronological">Oldest</option>
                  <option value="reverse">Newest</option>
                  <option value="category">By category</option>
                </select>
                <div
                  role="group"
                  aria-label="Match mode within facets"
                  className="inline-flex items-center rounded-sm border border-line bg-surface"
                >
                  {(['any', 'all'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={filters.match === mode}
                      onClick={() => onMatchChange(mode)}
                      className={[
                        'min-h-11 px-2.5 text-[0.8125rem] capitalize',
                        filters.match === mode
                          ? 'font-medium text-crimson'
                          : 'text-muted',
                      ].join(' ')}
                    >
                      {mode === 'any' ? 'Any' : 'All'}
                    </button>
                  ))}
                </div>
              </div>
            <div className="flex min-w-0 flex-wrap gap-2">
            <details name="filter-facets" className="min-w-0 flex-1" onKeyDown={closeOnEscape}>
              <summary className="input-field cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                Categories{filters.categories.length > 0 ? ` (${filters.categories.length})` : ''}
              </summary>
              <ul className="mt-1 max-h-64 space-y-0.5 overflow-y-auto rounded-sm border border-line bg-surface p-2">
                {categories.map((category) => (
                  <li key={category}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-sm px-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.categories.some(
                          (c) => c.toLowerCase() === category.toLowerCase(),
                        )}
                        onChange={() => onToggleCategory(category)}
                        className="size-4 accent-crimson"
                      />
                      <span className="truncate">{category}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </details>
            <details name="filter-facets" className="min-w-0 flex-1" onKeyDown={closeOnEscape}>
              <summary className="input-field cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                Orgs{filters.organizations.length > 0 ? ` (${filters.organizations.length})` : ''}
              </summary>
              <ul className="mt-1 max-h-64 space-y-0.5 overflow-y-auto rounded-sm border border-line bg-surface p-2">
                {organizations.map((organization) => (
                  <li key={organization}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-sm px-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.organizations.some(
                          (o) => o.toLowerCase() === organization.toLowerCase(),
                        )}
                        onChange={() => onToggleOrganization(organization)}
                        className="size-4 accent-crimson"
                      />
                      <span className="truncate">{organization}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </details>
            <details name="filter-facets" className="min-w-0 flex-1" onKeyDown={closeOnEscape}>
              <summary className="input-field cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                Districts{filters.districts.length > 0 ? ` (${filters.districts.length})` : ''}
              </summary>
              <ul className="mt-1 max-h-64 space-y-0.5 overflow-y-auto rounded-sm border border-line bg-surface p-2">
                {districts.map((district) => (
                  <li key={district}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-sm px-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.districts.some(
                          (d) => d.toLowerCase() === district.toLowerCase(),
                        )}
                        onChange={() => onToggleDistrict(district)}
                        className="size-4 accent-crimson"
                      />
                      <span className="truncate">{district}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </details>
            <select
              aria-label="Confidence"
              value={filters.confidence}
              onChange={(event) =>
                onConfidenceChange(
                  event.target.value as TimelineFilters['confidence'],
                )
              }
              className="input-field min-w-0 flex-1"
            >
              <option value="">Any confidence</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            </div>
          </div>
          </details>

          {hasActiveFilters ? (
            <ul className="flex flex-wrap gap-2" aria-label="Active filters">
              {filters.keywords.map((keyword) => (
                <li key={`kw-${keyword.toLowerCase()}`}>
                  <button
                    type="button"
                    aria-label={`${keyword}, selected. Activate to remove filter.`}
                    onClick={() => onToggleKeyword(keyword)}
                    className="inline-flex min-h-9 max-w-[12rem] items-center truncate rounded-sm border border-crimson bg-crimson-soft px-2.5 text-[0.8125rem] font-medium text-crimson"
                  >
                    {keyword} ✕
                  </button>
                </li>
              ))}
              {filters.categories.map((category) => (
                <li key={`cat-${category.toLowerCase()}`}>
                  <button
                    type="button"
                    aria-label={`${category}, selected. Activate to remove filter.`}
                    onClick={() => onToggleCategory(category)}
                    className="inline-flex min-h-9 max-w-[12rem] items-center truncate rounded-sm border border-crimson bg-crimson-soft px-2.5 text-[0.8125rem] font-medium text-crimson"
                  >
                    {category} ✕
                  </button>
                </li>
              ))}
              {filters.organizations.map((organization) => (
                <li key={`org-${organization.toLowerCase()}`}>
                  <button
                    type="button"
                    aria-label={`${organization}, selected. Activate to remove filter.`}
                    onClick={() => onToggleOrganization(organization)}
                    className="inline-flex min-h-9 max-w-[12rem] items-center truncate rounded-sm border border-crimson bg-crimson-soft px-2.5 text-[0.8125rem] font-medium text-crimson"
                  >
                    {organization} ✕
                  </button>
                </li>
              ))}
              {filters.districts.map((district) => (
                <li key={`dist-${district.toLowerCase()}`}>
                  <button
                    type="button"
                    aria-label={`${district} district, selected. Activate to remove filter.`}
                    onClick={() => onToggleDistrict(district)}
                    className="inline-flex min-h-9 max-w-[12rem] items-center truncate rounded-sm border border-crimson bg-crimson-soft px-2.5 text-[0.8125rem] font-medium text-crimson"
                  >
                    {district} ✕
                  </button>
                </li>
              ))}
              {filters.from || filters.to ? (
                <li>
                  <button
                    type="button"
                    aria-label={`Date range ${filters.from || '…'} to ${filters.to || '…'}, selected. Activate to clear.`}
                    onClick={() => {
                      onFromChange('')
                      onToChange('')
                    }}
                    className="inline-flex min-h-9 items-center rounded-sm border border-crimson bg-crimson-soft px-2.5 text-[0.8125rem] font-medium text-crimson"
                  >
                    {filters.from || '…'}–{filters.to || '…'} ✕
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}

          <details>
            <summary className="cursor-pointer text-sm font-medium text-crimson underline decoration-crimson/35 underline-offset-4">
              Saved views{savedViews.length > 0 ? ` (${savedViews.length})` : ''} · Export
            </summary>
            <div className="mt-2 flex max-w-md items-center gap-2">
              <label htmlFor="save-view-name" className="sr-only">
                Name this view
              </label>
              <input
                id="save-view-name"
                type="text"
                value={viewName}
                onChange={(event) => setViewName(event.target.value)}
                placeholder="Name this view…"
                className="input-field min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={saveCurrentView}
                disabled={!viewName.trim()}
                className="icon-btn shrink-0 px-3 text-sm disabled:opacity-50"
              >
                Save
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={onExportCsv} className="icon-btn px-3 text-sm">
                Download CSV ({resultCount})
              </button>
              <button type="button" onClick={onExportJson} className="icon-btn px-3 text-sm">
                Download JSON ({resultCount})
              </button>
            </div>
            {savedViews.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {savedViews.map((view) => (
                  <li
                    key={view.id}
                    className="flex items-center gap-2 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => onApplyView(view)}
                      className="min-w-0 flex-1 truncate text-left font-medium text-ink hover:text-crimson"
                    >
                      {view.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteView(view.id)}
                      aria-label={`Delete saved view ${view.name}`}
                      className="btn-text-accent shrink-0 text-sm"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted">
                Save the current filters, year, sort, and range for one-click recall. Stored only in this browser.
              </p>
            )}
          </details>
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
              activeKeywords={filters.keywords}
              onKeywordClick={onToggleKeyword}
            />
            <AllThemes
              tags={allKeywords}
              activeKeywords={filters.keywords}
              onKeywordClick={onToggleKeyword}
            />
          </div>
        </div>
      ) : null}
    </nav>
  )
}

function AllThemes({
  tags,
  activeKeywords,
  onKeywordClick,
}: {
  tags: TagCount[]
  activeKeywords: string[]
  onKeywordClick: (keyword: string) => void
}) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const activeSet = new Set(activeKeywords.map((k) => k.toLowerCase()))
  const matches = needle
    ? tags.filter((tag) => tag.label.toLowerCase().includes(needle))
    : tags
  const shown = matches.slice(0, 100)

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm font-medium text-crimson underline decoration-crimson/35 underline-offset-4">
        Browse all {tags.length} themes
        {needle ? ` matching “${query.trim()}”` : ''}
      </summary>
      <div className="mt-2">
        <label htmlFor="all-themes-search" className="sr-only">
          Search all themes
        </label>
        <input
          id="all-themes-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search themes…"
          className="input-field max-w-xs"
        />
        <ul className="mt-2 flex max-h-64 flex-wrap gap-2 overflow-y-auto" aria-label="All themes">
          {shown.map((tag) => {
            const pressed = activeSet.has(tag.label.toLowerCase())
            return (
              <li key={tag.label.toLowerCase()} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => onKeywordClick(tag.label)}
                  className={[
                    'inline-flex min-h-9 items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[0.8125rem]',
                    pressed
                      ? 'border-crimson bg-crimson-soft font-medium text-crimson'
                      : 'border-line bg-surface text-ink hover:border-control hover:bg-chip',
                  ].join(' ')}
                >
                  <span>{tag.label}</span>
                  <span className={pressed ? 'text-crimson' : 'text-muted'}>{tag.count}</span>
                </button>
              </li>
            )
          })}
        </ul>
        {matches.length > shown.length ? (
          <p className="mt-2 text-xs text-muted" role="status">
            Showing {shown.length} of {matches.length} matching themes. Refine the search to see more.
          </p>
        ) : null}
      </div>
    </details>
  )
}
