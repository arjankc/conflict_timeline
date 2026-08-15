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
    <ul
      className="-mx-5 flex list-none gap-2.5 overflow-x-auto overscroll-x-contain px-5 py-0.5 [scrollbar-width:thin] sm:mx-0 sm:px-0"
      aria-label="Filter by theme"
    >
      {tags.map((tag) => {
        const pressed = tag.label.toLowerCase() === activeKeyword.toLowerCase()
        return (
          <li key={tag.label.toLowerCase()} className="shrink-0">
            <button
              type="button"
              aria-pressed={pressed}
              aria-label={
                pressed
                  ? `${tag.label}, ${tag.count} events, selected. Activate to remove filter.`
                  : `Filter by keyword ${tag.label}, ${tag.count} events`
              }
              onClick={() => onKeywordClick(tag.label)}
              className={[
                'inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm leading-snug',
                pressed
                  ? 'border-crimson bg-crimson-soft font-medium text-crimson'
                  : 'border-control bg-surface text-ink',
              ].join(' ')}
            >
              <span>{tag.label}</span>
              <span className={pressed ? 'text-crimson' : 'text-muted'}>
                {tag.count}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
