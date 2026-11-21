import { useMemo } from 'react'
import type { ConflictEvent } from '../types/event'

type ArchiveOverviewProps = {
  events: ConflictEvent[]
  totalCount: number
  withSources: number
  confidence: { high: number; medium: number; low: number }
  span: string | null
  focusYear?: number
  onYearSelect: (year: number | null) => void
}

/** Collection stats + year histogram. Full-archive counts; bars jump to that year. */
export function ArchiveOverview({
  events,
  totalCount,
  withSources,
  confidence,
  span,
  focusYear,
  onYearSelect,
}: ArchiveOverviewProps) {
  const perYear = useMemo(() => {
    const map = new Map<number, number>()
    for (const event of events) {
      if (event.year == null) continue
      map.set(event.year, (map.get(event.year) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [events])

  const max = Math.max(1, ...perYear.map(([, count]) => count))
  const sourcesPct =
    totalCount > 0 ? Math.round((withSources / totalCount) * 100) : 0

  if (perYear.length === 0) return null

  return (
    <section
      aria-label="Archive overview"
      className="mx-auto max-w-5xl px-5 sm:px-8"
    >
      <div className="rounded-sm border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <span>
            <strong className="font-semibold text-ink">{totalCount}</strong> events
            {span ? ` · ${span}` : ''}
          </span>
          <span>
            <strong className="font-semibold text-ink">{sourcesPct}%</strong> with source citations
          </span>
          <span aria-label={`Confidence: ${confidence.high} high, ${confidence.medium} medium, ${confidence.low} low`}>
            <strong className="font-semibold text-ink">{confidence.high}</strong> high ·{' '}
            <strong className="font-semibold text-ink">{confidence.medium}</strong> medium ·{' '}
            <strong className="font-semibold text-ink">{confidence.low}</strong> low
          </span>
        </div>
        <div
          role="group"
          aria-label="Events per year. Activate a bar to jump to that year."
          className="mt-4 flex items-end gap-1"
        >
          {perYear.map(([year, count]) => {
            const current = focusYear === year
            return (
              <button
                key={year}
                type="button"
                onClick={() => onYearSelect(current ? null : year)}
                aria-pressed={current}
                aria-label={`${year}, ${count} events${current ? ', selected' : ''}`}
                title={`${year}: ${count}`}
                className={[
                  'group flex min-h-11 min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-sm px-0.5 py-1',
                  current ? 'bg-crimson-soft ring-1 ring-crimson' : 'hover:bg-chip',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'w-full max-w-6 rounded-sm',
                    current ? 'bg-crimson' : 'bg-crimson/60 group-hover:bg-crimson',
                  ].join(' ')}
                  style={{ height: `${8 + (count / max) * 56}px` }}
                />
                <span
                  className={[
                    'text-[0.6rem] leading-none tabular-nums sm:text-[0.65rem]',
                    current ? 'font-semibold text-crimson' : 'text-muted',
                  ].join(' ')}
                >
                  {String(year).slice(2)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
