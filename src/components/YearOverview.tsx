type YearCount = {
  year: number
  count: number
}

type YearOverviewProps = {
  series: YearCount[]
}

export function YearOverview({ series }: YearOverviewProps) {
  const visible = series.some((item) => item.count > 0)
  if (!visible) return null

  const maxCount = Math.max(...series.map((item) => item.count), 1)
  const chartHeight = 120
  const barWidth = 28
  const gap = 16
  const labelSpace = 28
  const width = series.length * (barWidth + gap) + gap
  const height = chartHeight + labelSpace
  const summary = series
    .map((item) => `${item.year}: ${item.count}`)
    .join('. ')

  return (
    <section aria-labelledby="year-overview-heading" className="mx-auto max-w-3xl px-4 sm:px-6">
      <h2 id="year-overview-heading" className="font-serif text-xl text-ink">
        Events per year
      </h2>
      <p className="mt-1 text-sm text-muted">
        Counts update with the current search and filters.
      </p>

      <figure className="mt-4 overflow-x-auto">
        <svg
          role="img"
          aria-labelledby="year-overview-heading year-overview-desc"
          viewBox={`0 0 ${width} ${height}`}
          className="h-44 w-full min-w-[20rem]"
        >
          <title>Events recorded in the archive, by year</title>
          <desc id="year-overview-desc">{summary}</desc>
          {series.map((item, index) => {
            const barHeight =
              item.count === 0 ? 0 : Math.max(4, (item.count / maxCount) * chartHeight)
            const x = gap + index * (barWidth + gap)
            const y = chartHeight - barHeight
            return (
              <g key={item.year}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  className="fill-crimson"
                />
                {item.count > 0 ? (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    className="fill-ink text-[11px]"
                  >
                    {item.count}
                  </text>
                ) : null}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 18}
                  textAnchor="middle"
                  className="fill-muted text-[11px]"
                >
                  {item.year}
                </text>
              </g>
            )
          })}
        </svg>
        <figcaption className="sr-only">
          Horizontal axis: year. Vertical axis: number of events. {summary}.
        </figcaption>
      </figure>
    </section>
  )
}
