import { useState } from 'react'
import type { TagCount } from '../lib/parseTags'

type DistrictOverviewProps = {
  districtCounts: TagCount[]
  activeDistricts: string[]
  onToggleDistrict: (district: string) => void
  /** Render inline without the page-level section wrapper (for the filter drawer). */
  bare?: boolean
}

const COLLAPSED_COUNT = 8

/** Place view: inferred-district ranking with filter toggles. Not a choropleth. */
export function DistrictOverview({
  districtCounts,
  activeDistricts,
  onToggleDistrict,
  bare = false,
}: DistrictOverviewProps) {
  const [expanded, setExpanded] = useState(false)
  const max = Math.max(1, ...districtCounts.map((d) => d.count))
  const activeSet = new Set(activeDistricts.map((d) => d.toLowerCase()))
  // Always keep selected districts visible, even outside the collapsed top slice.
  const shown = expanded
    ? districtCounts
    : [
        ...districtCounts.slice(0, COLLAPSED_COUNT),
        ...districtCounts
          .slice(COLLAPSED_COUNT)
          .filter((d) => activeSet.has(d.label.toLowerCase())),
      ]

  if (districtCounts.length === 0) return null

  const heading = bare ? (
    <p className="text-[0.7rem] font-medium tracking-[0.16em] text-muted uppercase">
      Districts
    </p>
  ) : (
    <h2 className="font-display text-lg text-ink">Districts</h2>
  )

  const body = (
    <div className="rounded-sm border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {heading}
      </div>
        <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {shown.map((d) => {
            const pressed = activeSet.has(d.label.toLowerCase())
            return (
              <li key={d.label}>
                <button
                  type="button"
                  onClick={() => onToggleDistrict(d.label)}
                  aria-pressed={pressed}
                  aria-label={`Filter by ${d.label} district, ${d.count} events`}
                  className={[
                    'flex w-full min-h-11 items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-left text-sm',
                    pressed
                      ? 'bg-crimson-soft font-medium text-crimson ring-1 ring-crimson'
                      : 'hover:bg-chip',
                  ].join(' ')}
                >
                  <span className="min-w-0 flex-1 truncate">{d.label}</span>
                  <span
                    aria-hidden="true"
                    className="h-2 min-w-8 flex-1 rounded-sm bg-crimson/30"
                    style={{ maxWidth: '6rem' }}
                  >
                    <span
                      className={pressed ? 'bg-crimson' : 'bg-crimson/60'}
                      style={{
                        display: 'block',
                        height: '100%',
                        width: `${Math.max(6, (d.count / max) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-xs text-muted tabular-nums">
                    {d.count}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {districtCounts.length > COLLAPSED_COUNT ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className="btn-text-accent mt-2 text-sm"
          >
            {expanded
              ? 'Show fewer districts'
              : `Show all ${districtCounts.length} districts`}
          </button>
        ) : null}
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Methodology: keyword exact/alias match first (incl. Kavre→Kavrepalanchok,
          Nepalgunj→Banke), else word-boundary match in Detail.
        </p>
      </div>
  )

  if (bare) {
    return <section aria-label="Districts">{body}</section>
  }

  return (
    <section
      aria-label="Districts"
      className="mx-auto max-w-5xl px-5 pt-2 sm:px-8"
    >
      {body}
    </section>
  )
}
