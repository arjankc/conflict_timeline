import type { TagCount } from '../lib/parseTags'

/** Horizontal theme chips. Hidden entirely when Keywords is empty across the sheet. */

type KeywordCloudProps = {
  tags: TagCount[]
  activeKeyword: string
  onKeywordClick: (keyword: string) => void
}

export function KeywordCloud({
  tags,
  activeKeyword,
  onKeywordClick,
}: KeywordCloudProps) {
  if (tags.length === 0) return null

  return (
    <div
      className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 py-1 [scrollbar-width:thin] sm:mx-0 sm:px-0"
      aria-label="Filter by theme"
    >
      {tags.map((tag) => {
        const pressed = tag.label.toLowerCase() === activeKeyword.toLowerCase()
        return (
          <button
            key={tag.label.toLowerCase()}
            type="button"
            aria-pressed={pressed}
            aria-label={
              pressed
                ? `${tag.label}, ${tag.count} events, selected. Activate to remove filter.`
                : `Filter by keyword ${tag.label}, ${tag.count} events`
            }
            onClick={() => onKeywordClick(tag.label)}
            className={[
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm',
              pressed
                ? 'border-crimson bg-crimson-soft font-medium text-crimson'
                : 'border-control bg-surface text-ink',
            ].join(' ')}
          >
            <span>{tag.label}</span>
            <span className={pressed ? 'text-crimson' : 'text-muted'}>{tag.count}</span>
          </button>
        )
      })}
    </div>
  )
}
