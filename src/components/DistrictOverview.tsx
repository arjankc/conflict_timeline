import type { TagCount } from '../lib/parseTags'

type DistrictOverviewProps = {
  districtCounts: TagCount[]
  activeDistricts: string[]
  onToggleDistrict: (district: string) => void
}

/** Place view: inferred-district ranking with filter toggles. Not a choropleth. */
export function DistrictOverview({
  districtCounts,
  activeDistricts,
  onToggleDistrict,
}: DistrictOverviewProps) {
  const top = districtCounts.slice(0, 24)
  const max = Math.max(1, ...top.map((d) => d.count))
  const activeSet = new Set(activeDistricts.map((d) => d.toLowerCase()))
  const covered = districtCounts.reduce((sum, d) => sum + d.count, 0)

  if (top.length === 0) return null

  return (
    <section
      aria-label="Districts"
      className="mx-auto max-w-5xl px-5 pt-2 sm:px-8"
    >
      <div className="rounded-sm border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg text-ink">Districts</h2>
          <p className="text-xs text-muted">
            Inferred from keywords + detail ({districtCounts.length} districts,{' '}
            {covered} assignments). No sheet District column yet.
          </p>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {top.map((d) => {
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
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Methodology: keyword exact/alias match first (incl. Kavre→Kavrepalanchok,
          Nepalgunj→Banke), else word-boundary match in Detail. A true SVG
          choropleth and a sheet District column are planned; this ranking is the
          honest interim.
        </p>
      </div>
    </section>
  )
}
