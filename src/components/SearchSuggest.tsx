import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { splitHighlight } from '../lib/highlight'
import {
  suggestSearch,
  suggestionKindLabel,
  type SearchSuggestion,
} from '../lib/searchSuggest'

/** Accessible typeahead over the in-memory archive index. */

const LIST_ID = 'timeline-search-listbox'

type SearchSuggestProps = {
  value: string
  index: SearchSuggestion[]
  onChange: (value: string) => void
}

export function SearchSuggest({ value, index, onChange }: SearchSuggestProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  /** `-1` means the typed query is active; Enter keeps it. */
  const [activeIndex, setActiveIndex] = useState(-1)
  const suggestions = useMemo(
    () => suggestSearch(index, value),
    [index, value],
  )
  const listOpen = open && suggestions.length > 0
  const active = activeIndex >= 0 ? suggestions[activeIndex] : undefined
  const activeId =
    listOpen && active ? `${LIST_ID}-${activeIndex}` : undefined

  useEffect(() => {
    setActiveIndex(-1)
  }, [value])

  useEffect(() => {
    if (!listOpen || activeIndex < 0) return
    document
      .getElementById(`${LIST_ID}-${activeIndex}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [listOpen, activeIndex])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function pick(suggestion: SearchSuggestion) {
    onChange(suggestion.label)
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      if (suggestions.length === 0) return
      setActiveIndex((current) =>
        current < 0 ? 0 : Math.min(suggestions.length - 1, current + 1),
      )
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!listOpen) return
      setActiveIndex((current) => {
        if (current <= 0) return -1
        return current - 1
      })
      return
    }
    if (event.key === 'Enter' && listOpen && active) {
      event.preventDefault()
      pick(active)
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 basis-48">
      <label htmlFor="timeline-search" className="sr-only">
        Search events. Suggestions appear after two characters. Arrow keys choose
        a suggestion; Enter on the typed query keeps it.
      </label>
      <input
        id="timeline-search"
        type="search"
        role="combobox"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder="Search events"
        autoComplete="off"
        enterKeyHint="search"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={listOpen}
        aria-controls={listOpen ? LIST_ID : undefined}
        aria-activedescendant={activeId}
        aria-haspopup="listbox"
        className="min-h-11 w-full rounded-md border border-control bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted"
      />
      {listOpen ? (
        <ul
          id={LIST_ID}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-line bg-surface py-1 [scrollbar-width:thin]"
        >
          {suggestions.map((suggestion, index) => {
            const selected = index === activeIndex
            return (
              <li
                key={suggestion.id}
                id={`${LIST_ID}-${index}`}
                role="option"
                aria-selected={selected}
                className={[
                  'flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm',
                  selected ? 'bg-crimson-soft text-crimson' : 'text-ink',
                ].join(' ')}
                onPointerDown={(event) => {
                  event.preventDefault()
                  pick(suggestion)
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="min-w-0 truncate">
                  {splitHighlight(suggestion.label, value).map((chunk, chunkIndex) =>
                    chunk.match ? (
                      <mark key={`${chunk.text}-${chunkIndex}`}>{chunk.text}</mark>
                    ) : (
                      <span key={`${chunk.text}-${chunkIndex}`}>{chunk.text}</span>
                    ),
                  )}
                </span>
                <span
                  className={[
                    'shrink-0 text-xs',
                    selected ? 'text-crimson' : 'text-muted',
                  ].join(' ')}
                >
                  {suggestionKindLabel(suggestion.kind)}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
