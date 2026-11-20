import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  eventCardId,
  eventPermalink,
  pageUrlWithEventHash,
} from '../lib/eventAnchor'
import {
  DESKTOP_TAG_LIMIT,
  DESKTOP_TEASER_MIN_WIDTH_PX,
  MOBILE_TAG_LIMIT,
  eventDensity,
  metadataPills,
  pickVisiblePills,
  type MetaPill,
  type MetaPillKind,
} from '../lib/eventCardTeaser'
import { effectiveDistricts } from '../lib/eventGeography'
import { splitHighlight } from '../lib/highlight'
import { isVisibleKeyword } from '../lib/keywordTaxonomy'
import { MONTH_SHORT } from '../lib/parseDate'
import { formatCategoryLabel } from '../lib/parseTags'
import {
  trackCardExpand,
  trackCitationCopy,
  trackPermalinkCopy,
} from '../lib/analytics'
import { showToast } from '../lib/toast'
import type { ConflictEvent } from '../types/event'

/** One chronology card: teaser (clamped text and tags), expand in place, permalink. */

type EventCardProps = {
  event: ConflictEvent
  search?: string
  activeKeywords: string[]
  activeCategories: string[]
  activeOrganizations: string[]
  activeDistricts: string[]
  compact?: boolean
  dateHeadingLevel?: 'h3' | 'h4'
  onKeywordClick: (keyword: string) => void
  onCategoryClick: (category: string) => void
  onOrganizationClick: (organization: string) => void
  onDistrictClick: (district: string) => void
}

const PILL_STYLES: Record<MetaPillKind, string> = {
  keyword: 'border-control bg-chip text-ink',
  category: 'border-control bg-chip-strong text-ink',
  organization: 'border-control bg-chip-rose text-ink',
  district: 'border-control bg-surface text-ink',
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
    'inline-flex min-h-11 items-center rounded-sm border px-2.5 py-1.5 text-[0.8125rem] leading-snug transition-colors',
    pressed
      ? 'border-crimson bg-crimson-soft font-medium text-crimson'
      : `${PILL_STYLES[kind]} hover:border-control`,
  ].join(' ')
  // Categories are stored with underscores (`transitional_justice`) — show
  // them with spaces. Keywords arrive as canonical display Terms already.
  const text = kind === 'category' ? formatCategoryLabel(label) : label

  if (!onClick) {
    return <span className={className}>{text}</span>
  }

  return (
    <button
      type="button"
      className={className}
      aria-pressed={pressed}
      aria-label={
        pressed
          ? `${kind} ${text}, selected. Activate to remove filter.`
          : `Filter by ${kind} ${text}`
      }
      onClick={onClick}
    >
      {text}
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
      trackPermalinkCopy(cardId.replace(/^event-/, ''))
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
      className="absolute top-2 end-2 z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-muted transition-colors hover:bg-chip hover:text-crimson"
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

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={['size-3.5 transition-transform', expanded ? 'rotate-180' : ''].join(
        ' ',
      )}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function EventIdMark({ id }: { id: string }) {
  if (!id.startsWith('NCT-')) return null
  return (
    <span className="mt-1 block font-sans text-[0.65rem] tracking-[0.12em] text-muted uppercase">
      {id}
    </span>
  )
}

function MobileDateBadge({ event }: { event: ConflictEvent }) {
  if (event.precision === 'unknown') {
    return (
      <span className="font-display text-lg leading-tight text-crimson">
        {event.dateLabel}
        <EventIdMark id={event.id} />
      </span>
    )
  }

  const month = Math.floor((event.sortKey % 10000) / 100)
  const monthLabel = MONTH_SHORT[month - 1] ?? ''
  const day = badgeDay(event)

  return (
    <span className="block border-s-2 border-crimson ps-2">
      <span className="inline-flex items-baseline gap-2 text-crimson">
        {day ? (
          <span className="font-display text-[1.65rem] leading-none tabular-nums">
            {day}
          </span>
        ) : null}
        {monthLabel ? (
          <span className="text-[0.7rem] font-semibold tracking-[0.12em] uppercase">
            {monthLabel}
          </span>
        ) : null}
        {event.year != null ? (
          <span className="text-xs tabular-nums text-ink">{event.year}</span>
        ) : null}
      </span>
      <EventIdMark id={event.id} />
    </span>
  )
}

function DateStack({ event }: { event: ConflictEvent }) {
  if (event.precision === 'unknown') {
    return (
      <span className="w-[5.25rem] shrink-0 border-s-2 border-crimson ps-2 font-display text-sm leading-snug text-crimson">
        {event.dateLabel}
        <EventIdMark id={event.id} />
      </span>
    )
  }

  const month = Math.floor((event.sortKey % 10000) / 100)
  const monthLabel = MONTH_SHORT[month - 1] ?? ''
  const day = badgeDay(event)

  return (
    <span className="flex w-[5.25rem] shrink-0 flex-col items-start border-s-2 border-crimson ps-2 text-crimson">
      {day ? (
        <span
          className={[
            'font-display leading-none tabular-nums',
            day.length > 2 ? 'text-lg tracking-tight' : 'text-[1.85rem]',
          ].join(' ')}
        >
          {day}
        </span>
      ) : null}
      <span className="mt-1 text-[0.7rem] font-semibold tracking-[0.14em] uppercase">
        {monthLabel}
      </span>
      <span className="mt-0.5 text-xs tabular-nums text-ink">{event.year}</span>
      <EventIdMark id={event.id} />
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
  activeKeywords,
  activeCategories,
  activeOrganizations,
  activeDistricts,
  compact = false,
  dateHeadingLevel = 'h4',
  onKeywordClick,
  onCategoryClick,
  onOrganizationClick,
  onDistrictClick,
}: EventCardProps) {
  const dateHeadingId = `${event.id}-date`
  const cardId = eventCardId(event.id)
  const DateHeading = dateHeadingLevel
  const highlightChunks = splitHighlight(event.detail, search)
  const districts = useMemo(() => effectiveDistricts(event), [event])
  // Only taxonomy-visible keywords get pills (pending/zero-hit stay out).
  const pills = metadataPills({
    keywords: event.keywords.filter(isVisibleKeyword),
    categories: event.categories,
    organizations: event.organizations,
    districts,
  })
  const wide = useWideTeaser()
  const tagLimit = compact ? 2 : wide ? DESKTOP_TAG_LIMIT : MOBILE_TAG_LIMIT
  const searching = search.trim() !== ''
  const density = compact ? 'brief' : eventDensity(event.detail)
  const [expanded, setExpanded] = useState(false)
  const [textOverflows, setTextOverflows] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)
  const isExpanded = expanded || searching
  const { visible, hiddenCount } = pickVisiblePills(
    pills,
    tagLimit,
    isExpanded,
    (pill) => pillIsSelected(pill, activeKeywords, activeCategories, activeOrganizations, activeDistricts),
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
    const expanding = !expanded
    setExpanded(expanding)
    if (expanding) trackCardExpand(event.id)
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
    else if (pill.kind === 'district') onDistrictClick(pill.label)
    else onOrganizationClick(pill.label)
  }

  return (
    <article
      id={cardId}
      data-expanded={isExpanded ? 'true' : 'false'}
      className={[
        'event-card relative scroll-mt-[calc(var(--filter-h)+0.35rem)]',
        density === 'rich'
          ? 'event-card-rich'
          : density === 'brief'
            ? 'event-card-brief'
            : 'event-card-standard',
        canExpand ? 'cursor-pointer' : '',
      ].join(' ')}
      aria-labelledby={dateHeadingId}
      tabIndex={-1}
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
                'max-w-[65ch] break-words text-pretty text-ink',
                density === 'rich'
                  ? 'font-serif text-[1.05rem] leading-[1.7] sm:text-lg sm:leading-[1.65]'
                  : density === 'brief'
                    ? 'text-sm leading-snug'
                    : 'text-base leading-[1.7]',
                isExpanded
                  ? ''
                  : density === 'rich'
                    ? 'line-clamp-6 sm:line-clamp-8'
                    : density === 'brief'
                      ? 'line-clamp-2'
                      : 'line-clamp-3 sm:line-clamp-4',
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
                      activeKeywords,
                      activeCategories,
                      activeOrganizations,
                      activeDistricts,
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
              className="btn-text-accent mt-3 inline-flex items-center gap-1.5"
              onClick={onToggleExpand}
            >
              {isExpanded
                ? 'Show less'
                : hiddenCount > 0
                  ? `Show more · ${hiddenCount}`
                  : 'Show more'}
              <ChevronIcon expanded={isExpanded} />
            </button>
          ) : null}
          {isExpanded ? (
            <>
              <Enrichment event={event} />
              <Provenance event={event} dateLabel={event.dateLabel} />
              {canExpand ? (
                <button
                  type="button"
                  aria-expanded="true"
                  aria-label={`Show less, event on ${event.dateLabel}`}
                  className="btn-text-accent mt-3 inline-flex items-center gap-1.5"
                  onClick={onToggleExpand}
                >
                  Show less
                  <ChevronIcon expanded />
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function pillIsSelected(
  pill: MetaPill,
  activeKeywords: string[],
  activeCategories: string[],
  activeOrganizations: string[],
  activeDistricts: string[],
): boolean {
  const label = pill.label.toLowerCase()
  if (pill.kind === 'keyword') {
    return activeKeywords.some((value) => value.toLowerCase() === label)
  }
  if (pill.kind === 'category') {
    return activeCategories.some((value) => value.toLowerCase() === label)
  }
  if (pill.kind === 'district') {
    return activeDistricts.some((value) => value.toLowerCase() === label)
  }
  return activeOrganizations.some((value) => value.toLowerCase() === label)
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'border-crimson bg-crimson-soft text-crimson',
  medium: 'border-control bg-chip text-ink',
  low: 'border-line bg-paper text-muted',
}

function Enrichment({ event }: { event: ConflictEvent }) {
  const victims = event.victims
  const hasVictims =
    victims.killed != null || victims.injured != null || victims.disappeared != null
  const hasPerps = event.perpetrators.length > 0
  const hasRelated = event.relatedIds.length > 0
  const hasExplicitDistrict = event.districtOverride.length > 0
  if (!hasVictims && !hasPerps && !hasRelated && !hasExplicitDistrict) return null
  return (
    <dl className="mt-4 space-y-1.5 rounded-sm border border-line bg-paper/60 px-3 py-2.5 text-sm leading-relaxed">
      {hasVictims ? (
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-ink">Victims</dt>
          <dd className="text-muted">
            {[
              victims.killed != null ? `${victims.killed} killed` : null,
              victims.injured != null ? `${victims.injured} injured` : null,
              victims.disappeared != null ? `${victims.disappeared} disappeared` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </dd>
        </div>
      ) : null}
      {hasPerps ? (
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-ink">Alleged</dt>
          <dd className="text-muted">{event.perpetrators.join('; ')}</dd>
        </div>
      ) : null}
      {hasExplicitDistrict ? (
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-ink">District</dt>
          <dd className="text-muted">{event.districtOverride.join('; ')}</dd>
        </div>
      ) : null}
      {hasRelated ? (
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-ink">Related</dt>
          <dd className="flex flex-wrap gap-1.5">
            {event.relatedIds.map((id) => (
              <a
                key={id}
                href={`#event-${id}`}
                className="link-accent"
                aria-label={`Go to related event ${id}`}
              >
                {id}
              </a>
            ))}
          </dd>
        </div>
      ) : null}
    </dl>
  )
}

function Provenance({
  event,
  dateLabel,
}: {
  event: ConflictEvent
  dateLabel: string
}) {
  const hasProvenance =
    event.confidence != null || event.confidenceNote !== '' || event.sources.length > 0
  if (!hasProvenance) return null
  const citation = `${event.id} — Nepal Conflict Timeline. ${dateLabel}. ${event.detail} [${event.confidence ?? 'unrated'} confidence${event.confidenceNote ? `: ${event.confidenceNote}` : ''}]`

  async function copyCitation() {
    try {
      await navigator.clipboard.writeText(citation)
      showToast('Citation copied to the clipboard')
      trackCitationCopy(event.id)
    } catch {
      showToast('Could not copy the citation')
    }
  }

  return (
    <details className="mt-4 rounded-sm border border-line bg-paper/60 px-3 py-2.5 text-sm leading-relaxed">
      <summary className="cursor-pointer font-medium text-ink">
        Sources & confidence{' '}
        {event.confidence ? (
          <span
            className={[
              'ml-1 inline-flex items-center rounded-sm border px-1.5 py-0.5 align-middle text-[0.7rem] tracking-wide uppercase',
              CONFIDENCE_STYLES[event.confidence] ?? 'border-line text-muted',
            ].join(' ')}
          >
            {event.confidence}
          </span>
        ) : null}
      </summary>
      {event.confidenceNote ? (
        <p className="mt-2 text-muted">{event.confidenceNote}</p>
      ) : null}
      {event.sources.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {event.sources.map((source, index) => (
            <li key={index} className="break-words text-ink">
              <span>{source.citation || 'Source'}</span>{' '}
              {source.urls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="link-accent break-all"
                >
                  {hostOf(url)}
                </a>
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted">
          No source citation in the loaded file. See the archival CSV for the full record.
        </p>
      )}
      <button
        type="button"
        onClick={copyCitation}
        className="btn-text-accent mt-2 text-sm"
        aria-label={`Copy citation for event on ${dateLabel}`}
      >
        Copy citation
      </button>
    </details>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'link'
  }
}
