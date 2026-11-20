import { useState } from 'react'
import type { TagCount } from '../lib/parseTags'

/** Theme chips grouped by taxonomy facet (Districts live in their own UI). */

export type FacetGroup = {
  facet: string
  tags: TagCount[]
}

type KeywordFacetsProps = {
  groups: FacetGroup[]
  activeKeywords: string[]
  onKeywordClick: (keyword: string) => void
}

export function KeywordFacets({
  groups,
  activeKeywords,
  onKeywordClick,
}: KeywordFacetsProps) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const activeSet = new Set(activeKeywords.map((k) => k.toLowerCase()))
  const shown = needle
    ? groups
        .map((group) => ({
          facet: group.facet,
          tags: group.tags.filter((tag) =>
            tag.label.toLowerCase().includes(needle),
          ),
        }))
        .filter((group) => group.tags.length > 0)
    : groups

  if (groups.length === 0) return null

  return (
    <div>
      <div className="mb-2 max-w-xs">
        <label htmlFor="facet-search" className="sr-only">
          Search themes
        </label>
        <input
          id="facet-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search themes…"
          className="input-field"
        />
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted" role="status">
          No themes match “{query.trim()}”.
        </p>
      ) : (
        shown.map((group) => (
          <section key={group.facet} aria-label={`${group.facet} themes`} className="mt-3 first:mt-0">
            <p className="mb-1.5 text-[0.7rem] font-medium tracking-[0.12em] text-muted uppercase">
              {group.facet}
            </p>
            <ul className="flex flex-wrap gap-2">
              {group.tags.map((tag) => {
                const pressed = activeSet.has(tag.label.toLowerCase())
                // Labels are already canonical display Terms — render as-is.
                const text = tag.label
                return (
                  <li key={tag.label.toLowerCase()} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={pressed}
                      aria-label={
                        pressed
                          ? `${text}, ${tag.count} events, selected. Activate to remove filter.`
                          : `Filter by theme ${text}, ${tag.count} events`
                      }
                      onClick={() => onKeywordClick(tag.label)}
                      className={[
                        'inline-flex min-h-9 items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[0.8125rem]',
                        pressed
                          ? 'border-crimson bg-crimson-soft font-medium text-crimson'
                          : 'border-line bg-surface text-ink hover:border-control hover:bg-chip',
                      ].join(' ')}
                    >
                      <span>{text}</span>
                      <span className={pressed ? 'text-crimson' : 'text-muted'}>
                        {tag.count}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
