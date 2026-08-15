import { useEffect, useRef, useState } from 'react'
import { eventCardId, eventPermalink } from '../lib/eventAnchor'
import { MONTH_SHORT } from '../lib/parseDate'
import type { ConflictEvent } from '../types/event'

/** One chronology card: date stack, narrative, tag pills, permalink (copies `#event-…`). */

type PillKind = 'keyword' | 'category' | 'organization'

type EventCardProps = {
  event: ConflictEvent
  activeKeyword: string
  activeCategory: string
  activeOrganization: string
  dateHeadingLevel?: 'h3' | 'h4'
  onKeywordClick: (keyword: string) => void
  onCategoryClick: (category: string) => void
  onOrganizationClick: (organization: string) => void
}

const PILL_STYLES: Record<PillKind, string> = {
  keyword: 'border-control bg-chip text-ink',
  category: 'border-control bg-chip-strong text-ink',
  organization: 'border-control bg-chip-rose text-ink',
}

function Pill({
  label,
  kind,
  pressed,
  onClick,
}: {
  label: string
  kind: PillKind
  pressed?: boolean
  onClick?: () => void
}) {
  const className = [
    'inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-xs leading-none tracking-wide',
    pressed
      ? 'border-crimson bg-crimson-soft font-medium text-crimson'
      : PILL_STYLES[kind],
  ].join(' ')

  if (!onClick) {
    return <span className={className}>{label}</span>
  }

  return (
    <button
      type="button"
      className={className}
      aria-pressed={pressed}
      aria-label={
        pressed
          ? `${kind} ${label}, selected. Activate to remove filter.`
          : `Filter by ${kind} ${label}`
      }
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function badgeDay(event: ConflictEvent): string {
  if (event.precision === 'month' || event.precision === 'unknown') return ''
  if (event.precision === 'range') {
    const range = event.dateLabel.match(/^(\d+–\d+)/)
    return range?.[1] ?? String(event.sortKey % 100)
  }
  return String(event.sortKey % 100)
}

function PermalinkControl({
  cardId,
  dateLabel,
}: {
  cardId: string
  dateLabel: string
}) {
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef(0)

  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])

  async function copyPermalink() {
    // Origin + path + hash only: opening this URL must not apply the copier’s search filters.
    const url = eventPermalink(
      cardId,
      window.location.origin,
      window.location.pathname,
    )
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <a
      href={`#${cardId}`}
      onClick={() => void copyPermalink()}
      aria-live="polite"
      aria-label={
        copied
          ? `Link to event on ${dateLabel} copied`
          : `Copy link to event on ${dateLabel}`
      }
      className="absolute top-1.5 end-1.5 z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:text-crimson"
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
    </a>
  )
}

function LinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l1.91-1.91a5 5 0 0 0-7.07-7.07L10.66 6.3" />
      <path d="M14 11a5 5 0 0 0-7.54-.54L4.55 12.38a5 5 0 0 0 7.07 7.07l1.72-1.71" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  )
}

function DateStack({ event }: { event: ConflictEvent }) {
  if (event.precision === 'unknown') {
    return (
      <span className="w-16 shrink-0 text-center font-serif text-sm leading-snug text-crimson">
        {event.dateLabel}
      </span>
    )
  }

  const month = Math.floor((event.sortKey % 10000) / 100)
  const monthLabel = MONTH_SHORT[month - 1] ?? ''
  const day = badgeDay(event)

  return (
    <span className="flex w-16 shrink-0 flex-col items-center rounded-md bg-crimson-soft px-1 py-2 text-crimson">
      <span className="text-xs font-semibold tracking-[0.12em] uppercase">
        {monthLabel}
      </span>
      {day ? (
        <span
          className={[
            'mt-1 font-serif leading-none',
            day.length > 2 ? 'text-lg' : 'text-2xl',
          ].join(' ')}
        >
          {day}
        </span>
      ) : null}
      <span className="mt-1 text-xs text-crimson">{event.year}</span>
    </span>
  )
}

export function EventCard({
  event,
  activeKeyword,
  activeCategory,
  activeOrganization,
  dateHeadingLevel = 'h4',
  onKeywordClick,
  onCategoryClick,
  onOrganizationClick,
}: EventCardProps) {
  const hasPills =
    event.keywords.length > 0 ||
    event.categories.length > 0 ||
    event.organizations.length > 0
  const dateHeadingId = `${event.id}-date`
  const cardId = eventCardId(event.id)

  const DateHeading = dateHeadingLevel

  return (
    <article
      id={cardId}
      className="relative scroll-mt-[calc(var(--filter-h)+0.5rem)] rounded-lg border border-line bg-surface p-3.5 pe-12 sm:p-5 sm:pe-14"
      aria-labelledby={dateHeadingId}
    >
      <PermalinkControl cardId={cardId} dateLabel={event.dateLabel} />
      <div className="sm:flex sm:gap-4">
        <DateHeading id={dateHeadingId} className="mb-2 sm:mb-0">
          <time
            dateTime={event.dateTime}
            className="block font-serif text-lg leading-tight text-crimson sm:sr-only"
          >
            {event.dateLabel}
          </time>
          <span className="hidden sm:block" aria-hidden="true">
            <DateStack event={event} />
          </span>
        </DateHeading>
        <div className="min-w-0 flex-1">
          <p className="text-base leading-relaxed text-ink">{event.detail}</p>
          {hasPills ? (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Event metadata">
              {event.keywords.map((keyword) => (
                <li key={`keyword-${keyword}`}>
                  <Pill
                    kind="keyword"
                    label={keyword}
                    pressed={keyword.toLowerCase() === activeKeyword.toLowerCase()}
                    onClick={() => onKeywordClick(keyword)}
                  />
                </li>
              ))}
              {event.categories.map((category) => (
                <li key={`category-${category}`}>
                  <Pill
                    kind="category"
                    label={category}
                    pressed={category.toLowerCase() === activeCategory.toLowerCase()}
                    onClick={() => onCategoryClick(category)}
                  />
                </li>
              ))}
              {event.organizations.map((organization) => (
                <li key={`organization-${organization}`}>
                  <Pill
                    kind="organization"
                    label={organization}
                    pressed={
                      organization.toLowerCase() === activeOrganization.toLowerCase()
                    }
                    onClick={() => onOrganizationClick(organization)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </article>
  )
}
