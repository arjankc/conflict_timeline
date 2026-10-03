import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { YearGroup } from '../lib/filterEvents'
import {
  buildTimelineRows,
  estimateRowHeight,
  yearAtOffset,
  type TimelineRow,
} from '../lib/timelineRows'
import { visibleRange } from '../lib/windowRange'
import { EventCard } from './EventCard'

/** Year sections on a spine. Only the rows near the viewport are mounted. */

const OVERSCAN_PX = 720

type TimelineFeedProps = {
  groups: YearGroup[]
  search?: string
  activeKeyword: string
  activeCategory: string
  activeOrganization: string
  onKeywordClick: (keyword: string) => void
  onCategoryClick: (category: string) => void
  onOrganizationClick: (organization: string) => void
  onReset?: () => void
  /** `event-NCT-0001` or `year-1996`, with a sequence for repeat requests. */
  anchorRequest?: { id: string; sequence: number }
  onYearInView?: (year: number | null) => void
}

function YearHeading({
  year,
  count,
  headingId,
}: {
  year: number | null
  count: number
  headingId: string
}) {
  const label = year == null ? 'Undated' : String(year)

  return (
    <h2
      id={headingId}
      tabIndex={-1}
      className="-mx-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1 py-1 font-display text-[1.85rem] leading-none tracking-tight text-ink outline-none sm:text-4xl"
    >
      <span aria-hidden="true" className="size-2 shrink-0 self-center bg-crimson sm:size-2.5" />
      <span>{label}</span>
      <span className="font-sans text-sm font-normal tracking-normal text-muted">
        {count} {count === 1 ? 'event' : 'events'}
      </span>
      <span aria-hidden="true" className="ms-1 h-px min-w-8 flex-1 bg-line" />
    </h2>
  )
}

function filterOffsetPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--filter-h')
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : 88
}

function listDocumentTop(node: HTMLElement): number {
  return node.getBoundingClientRect().top + window.scrollY
}

export function TimelineFeed({
  groups,
  search = '',
  activeKeyword,
  activeCategory,
  activeOrganization,
  onKeywordClick,
  onCategoryClick,
  onOrganizationClick,
  onReset,
  anchorRequest,
  onYearInView,
}: TimelineFeedProps) {
  const rows = useMemo(() => buildTimelineRows(groups), [groups])
  const indexByKey = useMemo(() => {
    const map = new Map<string, number>()
    rows.forEach((row, index) => map.set(row.key, index))
    return map
  }, [rows])

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-md px-1 py-16 text-center" role="status">
        <p className="font-display text-2xl tracking-tight text-ink">No matching events</p>
        <p className="mt-3 text-pretty text-muted">
          Nothing in the archive matches the current search and filters.
        </p>
        {onReset ? (
          <button type="button" className="btn-text-accent mt-5" onClick={onReset}>
            Clear filters
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <WindowedRows
      rows={rows}
      indexByKey={indexByKey}
      anchorRequest={anchorRequest}
      onYearInView={onYearInView}
      search={search}
      activeKeyword={activeKeyword}
      activeCategory={activeCategory}
      activeOrganization={activeOrganization}
      onKeywordClick={onKeywordClick}
      onCategoryClick={onCategoryClick}
      onOrganizationClick={onOrganizationClick}
    />
  )
}

function WindowedRows({
  rows,
  indexByKey,
  anchorRequest,
  onYearInView,
  search,
  activeKeyword,
  activeCategory,
  activeOrganization,
  onKeywordClick,
  onCategoryClick,
  onOrganizationClick,
}: {
  rows: TimelineRow[]
  indexByKey: Map<string, number>
  anchorRequest?: { id: string; sequence: number }
  onYearInView?: (year: number | null) => void
  search: string
  activeKeyword: string
  activeCategory: string
  activeOrganization: string
  onKeywordClick: (keyword: string) => void
  onCategoryClick: (category: string) => void
  onOrganizationClick: (organization: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const heightsRef = useRef(new Map<string, number>())
  const offsetsRef = useRef<number[]>([])
  const totalRef = useRef(0)
  const onYearRef = useRef(onYearInView)
  const lastYearRef = useRef<number | null | undefined>(undefined)
  const [tick, setTick] = useState(0)
  const [scrollRange, setScrollRange] = useState({ start: 0, end: 14 })
  const [settledAnchor, setSettledAnchor] = useState<number>()

  onYearRef.current = onYearInView

  const estimates = useMemo(() => rows.map((row) => estimateRowHeight(row)), [rows])

  const { offsets, total } = useMemo(() => {
    // `tick` is the measurement revision. Heights live in a ref, so the
    // revision has to be read or the offsets stay on their estimates.
    const revision = tick
    const nextOffsets = new Array<number>(rows.length)
    let y = 0
    for (let index = 0; index < rows.length; index += 1) {
      nextOffsets[index] = y
      const measured = revision >= 0 ? heightsRef.current.get(rows[index].key) : undefined
      y += measured ?? estimates[index]
    }
    return { offsets: nextOffsets, total: y }
  }, [rows, estimates, tick])

  offsetsRef.current = offsets
  totalRef.current = total

  const reportYear = useCallback((viewStart: number) => {
    const year = yearAtOffset(rows, offsetsRef.current, Math.max(0, viewStart + 12))
    if (lastYearRef.current === year) return
    lastYearRef.current = year
    onYearRef.current?.(year)
  }, [rows])

  const updateRange = useCallback(() => {
    const node = containerRef.current
    if (!node || rows.length === 0) return
    const top = listDocumentTop(node)
    const viewStart = window.scrollY - top
    const viewEnd = viewStart + window.innerHeight
    const next = visibleRange(
      offsetsRef.current,
      totalRef.current,
      viewStart,
      viewEnd,
      OVERSCAN_PX,
    )
    setScrollRange((current) =>
      current.start === next.start && current.end === next.end ? current : next,
    )
    reportYear(viewStart)
  }, [reportYear, rows.length])

  useEffect(() => {
    let frame = 0
    function onScroll() {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        updateRange()
      })
    }
    updateRange()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [updateRange])

  const anchorId = anchorRequest?.id
  const anchorIndex = anchorId != null ? indexByKey.get(anchorId) : undefined
  const locking =
    anchorRequest != null &&
    anchorRequest.sequence !== settledAnchor &&
    anchorIndex != null
  const range = locking
    ? {
        start: Math.max(0, anchorIndex - 2),
        end: Math.min(rows.length, anchorIndex + 8),
      }
    : scrollRange

  useLayoutEffect(() => {
    if (!locking || anchorIndex == null || !anchorId) return
    const node = containerRef.current
    if (!node) return
    const snap = () => {
      const current = containerRef.current
      if (!current) return
      const top =
        listDocumentTop(current) +
        offsetsRef.current[anchorIndex] -
        filterOffsetPx() -
        8
      const root = document.documentElement
      const previous = root.style.scrollBehavior
      root.style.scrollBehavior = 'auto'
      window.scrollTo(0, Math.max(0, top))
      root.style.scrollBehavior = previous
    }
    snap()
    const focusId = anchorId.startsWith('year-') ? `${anchorId}-heading` : anchorId
    const frame = window.requestAnimationFrame(() => {
      snap()
      const element = document.getElementById(focusId)
      const filter = filterOffsetPx()
      const near =
        element != null && Math.abs(element.getBoundingClientRect().top - filter) < 280
      if (!near) return
      element.focus({ preventScroll: true })
      setScrollRange({
        start: Math.max(0, anchorIndex - 3),
        end: Math.min(rows.length, anchorIndex + 10),
      })
      setSettledAnchor(anchorRequest.sequence)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [locking, anchorIndex, anchorId, anchorRequest, offsets, rows.length])

  const measure = useCallback((key: string, index: number, height: number) => {
    const previous = heightsRef.current.get(key)
    const baseline = previous ?? estimates[index] ?? height
    if (Math.abs(baseline - height) < 1) {
      if (previous == null) heightsRef.current.set(key, height)
      return
    }
    heightsRef.current.set(key, height)
    // While a permalink is still settling, scroll corrections fight the snap.
    if (anchorRequest != null && settledAnchor !== anchorRequest.sequence) {
      setTick((value) => value + 1)
      return
    }
    const node = containerRef.current
    const rowOffset = offsetsRef.current[index]
    if (node && rowOffset != null) {
      const rowTop = listDocumentTop(node) + rowOffset
      if (rowTop < window.scrollY - 2) {
        window.scrollBy(0, height - baseline)
      }
    }
    setTick((value) => value + 1)
  }, [estimates, anchorRequest, settledAnchor])

  const top = offsets[range.start] ?? 0
  const bottom = Math.max(0, total - (offsets[range.end] ?? total))
  const eventCount = rows.reduce((count, row) => count + (row.kind === 'event' ? 1 : 0), 0)

  return (
    <div ref={containerRef} className="timeline-window">
      <p className="sr-only">
        {eventCount} {eventCount === 1 ? 'event' : 'events'} in this view. Off-screen
        events are not mounted until you scroll to them.
      </p>
      <div aria-hidden="true" style={{ height: top }} />
      {rows.slice(range.start, range.end).map((row, offset) => {
        const index = range.start + offset
        return (
          <MeasuredRow
            key={row.key}
            rowKey={row.key}
            index={index}
            onMeasure={measure}
          >
            <TimelineRowView
              row={row}
              search={search}
              activeKeyword={activeKeyword}
              activeCategory={activeCategory}
              activeOrganization={activeOrganization}
              onKeywordClick={onKeywordClick}
              onCategoryClick={onCategoryClick}
              onOrganizationClick={onOrganizationClick}
              isFirstRow={index === 0}
            />
          </MeasuredRow>
        )
      })}
      <div aria-hidden="true" style={{ height: bottom }} />
    </div>
  )
}

function MeasuredRow({
  rowKey,
  index,
  onMeasure,
  children,
}: {
  rowKey: string
  index: number
  onMeasure: (key: string, index: number, height: number) => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onMeasureRef = useRef(onMeasure)
  onMeasureRef.current = onMeasure

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => {
      const height = node.getBoundingClientRect().height
      if (height > 0) onMeasureRef.current(rowKey, index, height)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [rowKey, index])

  return <div ref={ref}>{children}</div>
}

function TimelineRowView({
  row,
  search,
  activeKeyword,
  activeCategory,
  activeOrganization,
  onKeywordClick,
  onCategoryClick,
  onOrganizationClick,
  isFirstRow,
}: {
  row: TimelineRow
  search: string
  activeKeyword: string
  activeCategory: string
  activeOrganization: string
  onKeywordClick: (keyword: string) => void
  onCategoryClick: (category: string) => void
  onOrganizationClick: (organization: string) => void
  isFirstRow: boolean
}) {
  if (row.kind === 'year') {
    return (
      <div id={row.sectionId} className={isFirstRow ? 'pb-5 pt-0' : 'pb-5 pt-8'}>
        <YearHeading
          year={row.year}
          count={row.count}
          headingId={`${row.sectionId}-heading`}
        />
      </div>
    )
  }

  if (row.kind === 'month') {
    return (
      <h3 className="pb-2 pt-2 text-xs font-medium tracking-[0.16em] text-muted uppercase">
        {row.label}
      </h3>
    )
  }

  return (
    <div className="relative border-s-2 border-crimson/25 pb-6 ps-5 sm:ps-8">
      <span
        aria-hidden="true"
        className="absolute -start-[5px] top-7 size-2 border-2 border-paper bg-crimson"
      />
      <EventCard
        event={row.event}
        search={search}
        activeKeyword={activeKeyword}
        activeCategory={activeCategory}
        activeOrganization={activeOrganization}
        dateHeadingLevel={row.dateHeadingLevel}
        onKeywordClick={onKeywordClick}
        onCategoryClick={onCategoryClick}
        onOrganizationClick={onOrganizationClick}
      />
    </div>
  )
}
