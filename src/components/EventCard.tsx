import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import {
  eventCardId,
  eventPermalink,
  pageUrlWithEventHash,
} from '../lib/eventAnchor'
import {
  DESKTOP_TAG_LIMIT,
  DESKTOP_TEASER_MIN_WIDTH_PX,
  MOBILE_TAG_LIMIT,
  metadataPills,
  pickVisiblePills,
  type MetaPill,
  type MetaPillKind,
} from '../lib/eventCardTeaser'
import { splitHighlight } from '../lib/highlight'
import { MONTH_SHORT } from '../lib/parseDate'
import { showToast } from '../lib/toast'
import type { ConflictEvent } from '../types/event'

/** One chronology card: teaser (clamped text and tags), expand in place, permalink. */

type EventCardProps = {
  event: ConflictEvent
  search?: string
  activeKeyword: string
  activeCategory: string
  activeOrganization: string
  dateHeadingLevel?: 'h3' | 'h4'
  onKeywordClick: (keyword: string) => void
  onCategoryClick: (category: string) => void
  onOrganizationClick: (organization: string) => void
}

const PILL_STYLES: Record<MetaPillKind, string> = {
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
  kind: MetaPillKind
  pressed?: boolean
  onClick?: () => void
}) {
  const className = [
    'inline-flex min-h-11 items-center rounded-full border px-3.5 py-2 text-xs leading-snug tracking-wide',
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
      // Keep filters in the address bar; do not use the hash href (it would scroll).
      window.history.replaceState(
        null,
        '',
        pageUrlWithEventHash(
          window.location.pathname,
          window.location.search,
          cardId,
        ),
      )
      showToast('Link to this event copied to the clipboard')
      setCopied(true)
      window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
      showToast('Could not copy the link')
    }
  }

  function onPermalinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    event.preventDefault()
    void copyPermalink()
  }

  return (
    <a
      href={`${import.meta.env.BASE_URL}#${cardId}`}
      onClick={onPermalinkClick}
      aria-label={
        copied
          ? `Link to event on ${dateLabel} copied`
          : `Copy link to event on ${dateLabel}`
      }
      className="absolute top-2 end-2 z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:text-crimson"
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

function MobileDateBadge({ event }: { event: ConflictEvent }) {
  if (event.precision === 'unknown') {
    return (
      <span className="font-serif text-lg leading-tight text-crimson">
        {event.dateLabel}
      </span>
    )
  }

  const month = Math.floor((event.sortKey % 10000) / 100)
  const monthLabel = MONTH_SHORT[month - 1] ?? ''
  const day = badgeDay(event)

  return (
    <span className="inline-flex items-baseline gap-2 rounded-md bg-crimson-soft px-2.5 py-1 text-crimson">
      {monthLabel ? (
        <span className="text-xs font-semibold tracking-[0.08em] uppercase">
          {monthLabel}
        </span>
      ) : null}
      {day ? (
        <span className="font-serif text-xl leading-none tabular-nums">{day}</span>
      ) : null}
      {event.year != null ? (
        <span className="text-xs tabular-nums">{event.year}</span>
      ) : null}
    </span>
  )
}

function DateStack({ event }: { event: ConflictEvent }) {
  if (event.precision === 'unknown') {
    return (
      <span className="w-[4.75rem] shrink-0 px-1.5 text-center font-serif text-sm leading-snug text-crimson">
        {event.dateLabel}
      </span>
    )
  }

  const month = Math.floor((event.sortKey % 10000) / 100)
  const monthLabel = MONTH_SHORT[month - 1] ?? ''
  const day = badgeDay(event)

  return (
    <span className="flex w-[4.75rem] shrink-0 flex-col items-center rounded-md bg-crimson-soft px-1.5 py-2.5 text-crimson">
      <span className="text-xs font-semibold tracking-[0.08em] uppercase">
        {monthLabel}
      </span>
      {day ? (
        <span
          className={[
            'mt-1.5 font-serif leading-none tabular-nums',
            day.length > 2 ? 'text-lg tracking-tight' : 'text-2xl',
          ].join(' ')}
        >
          {day}
        </span>
      ) : null}
      <span className="mt-1.5 text-xs tabular-nums text-crimson">{event.year}</span>
    </span>
  )
}

function useWideTeaser(): boolean {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(min-width: ${DESKTOP_TEASER_MIN_WIDTH_PX}px)`).matches
      : false,
  )

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${DESKTOP_TEASER_MIN_WIDTH_PX}px)`)
    function sync() {
      setWide(media.matches)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return wide
}

export function EventCard({
  event,
  search = '',
  activeKeyword,
  activeCategory,
  activeOrganization,
  dateHeadingLevel = 'h4',
  onKeywordClick,
  onCategoryClick,
  onOrganizationClick,
}: EventCardProps) {
  const dateHeadingId = `${event.id}-date`
  const cardId = eventCardId(event.id)
  const DateHeading = dateHeadingLevel
  const highlightChunks = splitHighlight(event.detail, search)
  const pills = metadataPills(event)
  const wide = useWideTeaser()
  const tagLimit = wide ? DESKTOP_TAG_LIMIT : MOBILE_TAG_LIMIT
  const searching = search.trim() !== ''
  const [expanded, setExpanded] = useState(false)
  const [textOverflows, setTextOverflows] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)
  const isExpanded = expanded || searching
  const { visible, hiddenCount } = pickVisiblePills(
    pills,
    tagLimit,
    isExpanded,
    (pill) => pillIsSelected(pill, activeKeyword, activeCategory, activeOrganization),
  )
  const canExpand = !searching && (textOverflows || pills.length > tagLimit)

  useEffect(() => {
    setExpanded(false)
  }, [event.id])

  useLayoutEffect(() => {
    const node = textRef.current
    if (!node || isExpanded) return

    function measure() {
      if (!node) return
      setTextOverflows(node.scrollHeight > node.clientHeight + 2)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    let cancelled = false
    const fonts = document.fonts
    if (fonts?.ready) {
      void fonts.ready.then(() => {
        if (!cancelled) measure()
      })
    }
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [isExpanded, event.detail, search, wide])

  function onToggleExpand() {
    setExpanded((current) => !current)
  }

  function onArticleClick(click: MouseEvent<HTMLElement>) {
    if (!canExpand) return
    if (window.getSelection()?.toString()) return
    if ((click.target as HTMLElement | null)?.closest('a, button')) return
    onToggleExpand()
  }

  function onPillClick(pill: MetaPill) {
    if (pill.kind === 'keyword') onKeywordClick(pill.label)
    else if (pill.kind === 'category') onCategoryClick(pill.label)
    else onOrganizationClick(pill.label)
  }

  return (
    <article
      id={cardId}
      className={[
        'relative scroll-mt-[calc(var(--filter-h)+0.35rem)] rounded-lg border border-line bg-surface p-4 pe-14 sm:p-6 sm:pe-16',
        canExpand ? 'cursor-pointer' : '',
      ].join(' ')}
      aria-labelledby={dateHeadingId}
      onClick={onArticleClick}
    >
      <PermalinkControl cardId={cardId} dateLabel={event.dateLabel} />
      <div className="sm:flex sm:gap-5">
        <DateHeading id={dateHeadingId} className="mb-3 sm:mb-0">
          <time dateTime={event.dateTime} className="block sm:sr-only">
            <span className="sr-only">{event.dateLabel}</span>
            <span aria-hidden="true">
              <MobileDateBadge event={event} />
            </span>
          </time>
          <span className="hidden sm:block" aria-hidden="true">
            <DateStack event={event} />
          </span>
        </DateHeading>
        <div className="min-w-0 flex-1">
          <div className="relative">
            <p
              ref={textRef}
              className={[
                'max-w-[65ch] break-words text-pretty text-base leading-[1.75] text-ink',
                isExpanded ? '' : 'line-clamp-3 sm:line-clamp-4',
              ].join(' ')}
            >
              {highlightChunks.map((chunk, index) =>
                chunk.match ? (
                  <mark key={`${chunk.text}-${index}`}>{chunk.text}</mark>
                ) : (
                  <span key={`${chunk.text}-${index}`}>{chunk.text}</span>
                ),
              )}
            </p>
            {!isExpanded && textOverflows ? (
              <span aria-hidden="true" className="event-teaser-fade" />
            ) : null}
          </div>
          {visible.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2 sm:mt-5" aria-label="Event metadata">
              {visible.map((pill) => (
                <li key={`${pill.kind}-${pill.label}`}>
                  <Pill
                    kind={pill.kind}
                    label={pill.label}
                    pressed={pillIsSelected(
                      pill,
                      activeKeyword,
                      activeCategory,
                      activeOrganization,
                    )}
                    onClick={() => onPillClick(pill)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
          {canExpand ? (
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-label={
                isExpanded
                  ? `Show less, event on ${event.dateLabel}`
                  : hiddenCount > 0
                    ? `Show more, event on ${event.dateLabel}, ${hiddenCount} more themes`
                    : `Show more, event on ${event.dateLabel}`
              }
              className="mt-3 min-h-11 text-sm font-medium text-crimson underline underline-offset-2"
              onClick={onToggleExpand}
            >
              {isExpanded
                ? 'Show less'
                : hiddenCount > 0
                  ? `Show more · ${hiddenCount}`
                  : 'Show more'}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function pillIsSelected(
  pill: MetaPill,
  activeKeyword: string,
  activeCategory: string,
  activeOrganization: string,
): boolean {
  if (pill.kind === 'keyword') {
    return pill.label.toLowerCase() === activeKeyword.toLowerCase()
  }
  if (pill.kind === 'category') {
    return pill.label.toLowerCase() === activeCategory.toLowerCase()
  }
  return pill.label.toLowerCase() === activeOrganization.toLowerCase()
}
