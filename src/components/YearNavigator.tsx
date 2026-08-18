import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { monthCountsForYear, type YearGroup } from '../lib/filterEvents'
import { MONTH_SHORT } from '../lib/parseDate'
import { useScrollOverflow } from '../lib/useScrollOverflow'
import { ScrollFade } from './ScrollFade'

/** `dock` is a fixed bottom scroller on small screens; `rail` is the desktop sidebar (drag optional). */

type YearNavigatorProps = {
  groups: YearGroup[]
  activeYear: number | null
  onYearSelect: (year: number | null) => void
  /** `undefined` means the pointer left the scrubber; keep the overlay up while a year is passed. */
  onYearCue?: (year: number | null | undefined) => void
  variant: 'dock' | 'rail'
}

type DatedGroup = YearGroup & { year: number }

function yearKey(year: number | null): string {
  return year == null ? 'undated' : String(year)
}

function parseYearKey(value: string | undefined): number | null | undefined {
  if (value == null) return undefined
  return value === 'undated' ? null : Number(value)
}

function selectYearFromClient(
  container: HTMLElement,
  client: number,
  axis: 'x' | 'y',
): number | null | undefined {
  const buttons = Array.from(container.querySelectorAll('[data-year]'))
  let next: number | null | undefined

  for (const button of buttons) {
    const rect = button.getBoundingClientRect()
    const start = axis === 'x' ? rect.left : rect.top
    const end = axis === 'x' ? rect.right : rect.bottom
    if (client >= start && client <= end) {
      next = parseYearKey((button as HTMLElement).dataset.year)
      break
    }
  }

  if (next === undefined) {
    const first = buttons[0]?.getBoundingClientRect()
    const last = buttons.at(-1)?.getBoundingClientRect()
    if (axis === 'x') {
      if (first && client < first.left) {
        next = parseYearKey((buttons[0] as HTMLElement | undefined)?.dataset.year)
      } else if (last && client > last.right) {
        next = parseYearKey((buttons.at(-1) as HTMLElement | undefined)?.dataset.year)
      }
    } else if (first && client < first.top) {
      next = parseYearKey((buttons[0] as HTMLElement | undefined)?.dataset.year)
    } else if (last && client > last.bottom) {
      next = parseYearKey((buttons.at(-1) as HTMLElement | undefined)?.dataset.year)
    }
  }

  if (typeof next === 'number' && Number.isNaN(next)) return undefined
  return next
}

function YearHeat({ events }: { events: YearGroup['events'] }) {
  const counts = monthCountsForYear(events)
  const max = Math.max(...counts, 1)

  return (
    <div className="mt-1.5 grid grid-cols-12 gap-px" aria-hidden="true">
      {counts.map((count, index) => {
        const opacity = count === 0 ? 0.12 : 0.28 + (count / max) * 0.72
        return (
          <span
            key={MONTH_SHORT[index]}
            className="h-1.5 rounded-sm bg-crimson sm:h-2"
            style={{ opacity }}
            title={`${MONTH_SHORT[index]}: ${count}`}
          />
        )
      })}
    </div>
  )
}

function YearDockScrub({
  datedGroups,
  undated,
  activeYear,
  maxCount,
  onYearSelect,
  onYearCue,
}: {
  datedGroups: DatedGroup[]
  undated: YearGroup | undefined
  activeYear: number | null
  maxCount: number
  onYearSelect: (year: number | null) => void
  onYearCue?: (year: number | null | undefined) => void
}) {
  const scrubRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const lastYearRef = useRef<number | null | undefined>(undefined)

  function pickFromPoint(clientX: number) {
    const scrub = scrubRef.current
    if (!scrub) return
    const next = selectYearFromClient(scrub, clientX, 'x')
    if (next === undefined || next === lastYearRef.current) return
    lastYearRef.current = next
    onYearCue?.(next)
    onYearSelect(next)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    pickFromPoint(event.clientX)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    pickFromPoint(event.clientX)
  }

  function endDrag() {
    draggingRef.current = false
    lastYearRef.current = undefined
    onYearCue?.(undefined)
  }

  return (
    <div
      ref={scrubRef}
      role="presentation"
      aria-hidden="true"
      className="mx-4 flex h-11 cursor-ew-resize touch-none items-stretch gap-px rounded-xl bg-chip px-1.5 pt-1.5 select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {datedGroups.map((group) => {
        const current = activeYear === group.year
        const height = 28 + (group.events.length / maxCount) * 72
        return (
          <div
            key={group.year}
            data-year={group.year}
            className="flex min-h-11 min-w-0 flex-1 flex-col justify-end"
          >
            <span
              className={[
                'w-full rounded-sm bg-crimson',
                current ? 'opacity-100' : 'opacity-40',
              ].join(' ')}
              style={{ height: `${height}%` }}
            />
          </div>
        )
      })}
      {undated ? (
        <div
          data-year="undated"
          className="flex min-h-11 w-4 shrink-0 flex-col justify-end"
        >
          <span
            className={[
              'w-full rounded-sm bg-control',
              activeYear == null ? 'opacity-100' : 'opacity-40',
            ].join(' ')}
            style={{ height: '40%' }}
          />
        </div>
      ) : null}
    </div>
  )
}

export function YearNavigator({
  groups,
  activeYear,
  onYearSelect,
  onYearCue,
  variant,
}: YearNavigatorProps) {
  const datedGroups = groups.filter(
    (group): group is DatedGroup => group.year != null,
  )
  const undated = groups.find((group) => group.year == null)
  const maxCount = Math.max(...datedGroups.map((group) => group.events.length), 1)
  const dockRef = useRef<HTMLElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const chipRowRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const lastYearRef = useRef<number | null | undefined>(undefined)
  const ignoreChipScroll = useRef(false)
  const chipCueYear = useRef<number | null | undefined>(undefined)
  const chipIdleTimer = useRef(0)
  const chipOverflow = useScrollOverflow(chipRowRef)

  useEffect(() => {
    if (variant !== 'dock') return
    const dock = dockRef.current
    if (!dock) return

    // Footer padding and scroll-padding use this height so the dock does not cover copy.
    function syncHeight() {
      if (!dock) return
      document.documentElement.style.setProperty(
        '--dock-h',
        `${Math.round(dock.getBoundingClientRect().height)}px`,
      )
    }

    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(dock)
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
      document.documentElement.style.removeProperty('--dock-h')
    }
  }, [variant])

  useEffect(() => {
    if (variant !== 'dock') return
    const button = chipRowRef.current?.querySelector(
      `[data-year="${yearKey(activeYear)}"]`,
    )
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ignoreChipScroll.current = true
    button?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    })
    const release = window.setTimeout(() => {
      ignoreChipScroll.current = false
    }, reduce ? 50 : 450)
    return () => window.clearTimeout(release)
  }, [activeYear, variant])

  useEffect(() => {
    return () => window.clearTimeout(chipIdleTimer.current)
  }, [])

  if (groups.length === 0) return null

  function selectFromPoint(clientY: number) {
    const rail = railRef.current
    if (!rail) return
    const next = selectYearFromClient(rail, clientY, 'y')
    if (next === undefined || next === lastYearRef.current) return
    lastYearRef.current = next
    onYearCue?.(next)
    onYearSelect(next)
  }

  // Drag-to-scrub is desktop-rail only; the dock uses the density strip above the chips.
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (variant !== 'rail' || event.button !== 0) return
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    selectFromPoint(event.clientY)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (variant !== 'rail' || !draggingRef.current) return
    selectFromPoint(event.clientY)
  }

  function endDrag() {
    draggingRef.current = false
    lastYearRef.current = undefined
    onYearCue?.(undefined)
  }

  function onChipRowScroll() {
    if (ignoreChipScroll.current) return
    const row = chipRowRef.current
    if (!row) return
    const mid = row.getBoundingClientRect().left + row.clientWidth / 2
    const next = selectYearFromClient(row, mid, 'x')
    if (next === undefined) return
    if (next !== chipCueYear.current) {
      chipCueYear.current = next
      onYearCue?.(next)
    }
    window.clearTimeout(chipIdleTimer.current)
    chipIdleTimer.current = window.setTimeout(() => {
      chipCueYear.current = undefined
      onYearCue?.(undefined)
    }, 180)
  }

  if (variant === 'dock') {
    return (
      <nav
        ref={dockRef}
        aria-label="Jump to a year. Drag the density strip or swipe the year list."
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-paper/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(28_25_23/0.08)] backdrop-blur-md"
      >
        <p className="px-4 pt-2.5 text-[0.7rem] font-medium tracking-[0.16em] text-muted uppercase">
          Years
        </p>
        <YearDockScrub
          datedGroups={datedGroups}
          undated={undated}
          activeYear={activeYear}
          maxCount={maxCount}
          onYearSelect={onYearSelect}
          onYearCue={onYearCue}
        />
        <div className="relative">
          <div
            ref={chipRowRef}
            className="flex snap-x snap-proximity gap-2.5 overflow-x-auto overscroll-x-contain px-4 py-2 [scrollbar-width:thin]"
            onScroll={onChipRowScroll}
          >
            {datedGroups.map((group) => {
              const current = activeYear === group.year
              return (
                <button
                  key={group.year}
                  type="button"
                  data-year={group.year}
                  aria-current={current ? 'true' : undefined}
                  aria-label={`${group.year}, ${group.events.length} events${current ? ', current year in view' : ''}`}
                  onClick={() => onYearSelect(group.year)}
                  className={[
                    'inline-flex min-h-11 shrink-0 snap-start flex-col justify-center rounded-full px-4 py-2 text-left transition-colors',
                    current
                      ? 'bg-crimson-soft font-medium text-crimson ring-2 ring-crimson'
                      : 'bg-surface text-ink ring-1 ring-line hover:bg-chip hover:ring-control',
                  ].join(' ')}
                >
                  <span className="flex items-baseline gap-2">
                    <span className="font-serif text-base leading-tight">{group.year}</span>
                    <span className="font-sans text-xs tabular-nums leading-tight text-muted">
                      {group.events.length}
                    </span>
                  </span>
                  <YearHeat events={group.events} />
                </button>
              )
            })}
            {undated ? (
              <button
                type="button"
                data-year="undated"
                aria-current={activeYear == null ? 'true' : undefined}
                aria-label={`Undated, ${undated.events.length} events${activeYear == null ? ', current section in view' : ''}`}
                onClick={() => onYearSelect(null)}
                className={[
                  'inline-flex min-h-11 shrink-0 snap-start items-center rounded-full px-4 py-2 text-sm transition-colors',
                  activeYear == null
                    ? 'bg-crimson-soft font-medium text-crimson ring-2 ring-crimson'
                    : 'bg-surface text-ink ring-1 ring-line hover:bg-chip hover:ring-control',
                ].join(' ')}
              >
                Undated
              </button>
            ) : null}
          </div>
          <ScrollFade start={chipOverflow.start} end={chipOverflow.end} />
        </div>
      </nav>
    )
  }

  return (
    <nav
      aria-label="Jump to a year. Year buttons move focus in the feed. Dragging the rail is optional."
      className="relative flex h-full min-h-0 flex-col rounded-2xl border border-line/80 bg-surface/80 px-2.5 py-3 shadow-card backdrop-blur-sm"
    >
      <p className="mb-2.5 px-1.5 text-[0.7rem] font-medium tracking-[0.16em] text-muted uppercase">
        Years
      </p>
      <div
        ref={railRef}
        className="flex min-h-0 flex-1 touch-none flex-col gap-1.5 overflow-y-auto py-1 select-none [scrollbar-width:thin]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {datedGroups.map((group) => {
          const current = activeYear === group.year
          const weight = Math.max(group.events.length / maxCount, 0.2)

          return (
            <button
              key={group.year}
              type="button"
              data-year={group.year}
              aria-current={current ? 'true' : undefined}
              aria-label={`${group.year}, ${group.events.length} events${current ? ', current year in view' : ''}`}
              onClick={() => onYearSelect(group.year)}
              className={[
                'flex min-h-11 flex-col justify-center rounded-xl px-2.5 py-2.5 text-left transition-colors',
                current
                  ? 'bg-crimson-soft font-medium text-crimson ring-2 ring-crimson'
                  : 'text-muted ring-1 ring-transparent hover:bg-chip hover:text-ink',
              ].join(' ')}
              style={{ flexGrow: weight }}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-serif text-base leading-tight">{group.year}</span>
                <span className="font-sans text-xs tabular-nums leading-tight">
                  {group.events.length}
                </span>
              </span>
              <YearHeat events={group.events} />
            </button>
          )
        })}
        {undated ? (
          <button
            type="button"
            data-year="undated"
            aria-current={activeYear == null ? 'true' : undefined}
            aria-label={`Undated, ${undated.events.length} events${activeYear == null ? ', current section in view' : ''}`}
            onClick={() => onYearSelect(null)}
            className={[
              'min-h-11 shrink-0 rounded-xl px-2.5 py-2.5 text-left text-sm transition-colors',
              activeYear == null
                ? 'bg-crimson-soft font-medium text-crimson ring-2 ring-crimson'
                : 'text-muted hover:bg-chip hover:text-ink',
            ].join(' ')}
          >
            Undated
          </button>
        ) : null}
      </div>
    </nav>
  )
}
