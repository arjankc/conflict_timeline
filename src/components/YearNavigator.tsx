import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { monthCountsForYear, type YearGroup } from '../lib/filterEvents'
import { MONTH_SHORT } from '../lib/parseDate'

/** `dock` is a fixed bottom scroller on small screens; `rail` is the desktop sidebar (drag optional). */

type YearNavigatorProps = {
  groups: YearGroup[]
  activeYear: number | null
  onYearSelect: (year: number | null) => void
  variant: 'dock' | 'rail'
}

function YearHeat({ events }: { events: YearGroup['events'] }) {
  const counts = monthCountsForYear(events)
  const max = Math.max(...counts, 1)

  return (
    <div className="mt-1 grid grid-cols-12 gap-px" aria-hidden="true">
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

export function YearNavigator({
  groups,
  activeYear,
  onYearSelect,
  variant,
}: YearNavigatorProps) {
  const datedGroups = groups.filter(
    (group): group is YearGroup & { year: number } => group.year != null,
  )
  const undated = groups.find((group) => group.year == null)
  const maxCount = Math.max(...datedGroups.map((group) => group.events.length), 1)
  const dockRef = useRef<HTMLElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const lastYearRef = useRef<number | null | undefined>(undefined)
  const [scrubYear, setScrubYear] = useState<number | null | undefined>(undefined)

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
    window.addEventListener('resize', syncHeight)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncHeight)
    }
  }, [variant])

  useEffect(() => {
    if (variant !== 'dock') return
    const key = activeYear == null ? 'undated' : String(activeYear)
    const button = railRef.current?.querySelector(`[data-year="${key}"]`)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    button?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [activeYear, variant])

  if (groups.length === 0) return null

  function selectFromPoint(clientY: number) {
    const rail = railRef.current
    if (!rail) return
    const buttons = Array.from(rail.querySelectorAll('[data-year]'))
    let next: number | null | undefined
    for (const button of buttons) {
      const rect = button.getBoundingClientRect()
      if (clientY >= rect.top && clientY <= rect.bottom) {
        const value = (button as HTMLElement).dataset.year
        next = value === 'undated' ? null : Number(value)
        break
      }
    }
    if (next === undefined) {
      const first = buttons[0]?.getBoundingClientRect()
      const last = buttons.at(-1)?.getBoundingClientRect()
      if (first && clientY < first.top) {
        const value = (buttons[0] as HTMLElement | undefined)?.dataset.year
        next = value === 'undated' ? null : Number(value)
      } else if (last && clientY > last.bottom) {
        const value = (buttons.at(-1) as HTMLElement | undefined)?.dataset.year
        next = value === 'undated' ? null : Number(value)
      }
    }
    if (
      next === undefined ||
      (typeof next === 'number' && Number.isNaN(next)) ||
      next === lastYearRef.current
    ) {
      return
    }
    lastYearRef.current = next
    setScrubYear(next)
    onYearSelect(next)
  }

  // Drag-to-scrub is desktop-rail only; the dock is a horizontal button row (click / swipe scroll).
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
    setScrubYear(undefined)
  }

  if (variant === 'dock') {
    return (
      <nav
        ref={dockRef}
        aria-label="Jump to a year"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
      >
        <div
          ref={railRef}
          className="flex gap-2 overflow-x-auto overscroll-x-contain px-3 py-2 [scrollbar-width:thin]"
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
                  'inline-flex min-h-11 shrink-0 flex-col justify-center rounded-full px-3.5 text-left',
                  current
                    ? 'bg-crimson-soft font-medium text-crimson ring-2 ring-crimson'
                    : 'bg-surface text-ink ring-1 ring-control',
                ].join(' ')}
              >
                <span className="font-serif text-base leading-none">{group.year}</span>
                <span className="mt-0.5 text-xs text-muted">
                  {group.events.length} {group.events.length === 1 ? 'event' : 'events'}
                </span>
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
                'inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-sm',
                activeYear == null
                  ? 'bg-crimson-soft font-medium text-crimson ring-2 ring-crimson'
                  : 'bg-surface text-ink ring-1 ring-control',
              ].join(' ')}
            >
              Undated
            </button>
          ) : null}
        </div>
      </nav>
    )
  }

  return (
    <nav
      aria-label="Jump to a year. Year buttons move focus in the feed. Dragging the rail is optional."
      className="relative flex h-full min-h-0 flex-col rounded-lg border border-line bg-paper/90 px-2 py-2 backdrop-blur-sm"
    >
      <p className="mb-2 px-1 text-xs font-medium tracking-wide text-muted uppercase">
        Years
      </p>
      <div
        ref={railRef}
        className="flex min-h-0 flex-1 touch-none flex-col gap-1 py-1 select-none"
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
                'flex min-h-11 flex-col justify-center rounded-md px-2 py-2 text-left',
                current
                  ? 'bg-crimson-soft font-medium text-crimson ring-2 ring-crimson'
                  : 'text-muted ring-1 ring-transparent hover:bg-surface hover:text-ink',
              ].join(' ')}
              style={{ flexGrow: weight }}
            >
              <span className="flex items-baseline justify-between gap-1">
                <span className="font-serif text-base leading-none">{group.year}</span>
                <span className="font-sans text-xs tabular-nums">
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
              'min-h-11 rounded-md px-2 py-2 text-left text-sm',
              activeYear == null
                ? 'bg-crimson-soft font-medium text-crimson ring-2 ring-crimson'
                : 'text-muted hover:bg-surface',
            ].join(' ')}
          >
            Undated
          </button>
        ) : null}
      </div>
      {scrubYear !== undefined ? (
        <div
          className="pointer-events-none absolute top-1/2 -left-2 -translate-x-full -translate-y-1/2 rounded-md bg-ink px-3 py-2 text-paper"
          aria-hidden="true"
        >
          <p className="font-serif text-2xl leading-none">
            {scrubYear == null ? 'Undated' : scrubYear}
          </p>
        </div>
      ) : null}
    </nav>
  )
}
