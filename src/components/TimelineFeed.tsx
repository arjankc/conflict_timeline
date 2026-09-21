import { groupEventsByMonth, yearSectionId, type YearGroup } from '../lib/filterEvents'
import { MONTH_NAMES } from '../lib/parseDate'
import type { ConflictEvent } from '../types/event'
import { EventCard } from './EventCard'

/** Year sections on a spine. Heading levels depend on whether a year is split into months. */

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
      className="-mx-1 mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1 py-1 font-display text-[1.85rem] leading-none tracking-tight text-ink outline-none sm:mb-6 sm:text-4xl"
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

function EventEntry({
  event,
  search,
  activeKeyword,
  activeCategory,
  activeOrganization,
  dateHeadingLevel,
  onKeywordClick,
  onCategoryClick,
  onOrganizationClick,
}: {
  event: ConflictEvent
  search: string
  activeKeyword: string
  activeCategory: string
  activeOrganization: string
  dateHeadingLevel: 'h3' | 'h4'
  onKeywordClick: (keyword: string) => void
  onCategoryClick: (category: string) => void
  onOrganizationClick: (organization: string) => void
}) {
  return (
    <li className="relative pb-6 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute -start-[1.35rem] top-7 size-2 border-2 border-paper bg-crimson sm:-start-[1.9rem] sm:top-8"
      />
      <EventCard
        event={event}
        search={search}
        activeKeyword={activeKeyword}
        activeCategory={activeCategory}
        activeOrganization={activeOrganization}
        dateHeadingLevel={dateHeadingLevel}
        onKeywordClick={onKeywordClick}
        onCategoryClick={onCategoryClick}
        onOrganizationClick={onOrganizationClick}
      />
    </li>
  )
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
}: TimelineFeedProps) {
  if (groups.length === 0) {
    return (
      <div className="mx-auto max-w-md px-1 py-16 text-center" role="status">
        <p className="font-display text-2xl tracking-tight text-ink">
          No matching events
        </p>
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
    <div className="flex flex-col gap-14">
      {groups.map((group) => {
        const months = groupEventsByMonth(group.events)
        // Month labels only when a year contains more than one month; then the date heading drops to h4.
        const showMonths = months.length > 1
        const sectionId = yearSectionId(group.year)
        const headingId = `${sectionId}-heading`

        return (
          <section
            key={sectionId}
            id={sectionId}
            aria-labelledby={headingId}
            className="scroll-mt-[calc(var(--filter-h)+0.35rem)]"
          >
            <YearHeading year={group.year} count={group.events.length} headingId={headingId} />
            {months.map((monthGroup) => (
              <div key={monthGroup.month ?? 'undated'} className="mb-2 last:mb-0">
                {showMonths ? (
                  <h3 className="ms-1 pb-3 pt-2 text-xs font-medium tracking-[0.16em] text-muted uppercase">
                    {monthGroup.month
                      ? MONTH_NAMES[monthGroup.month - 1]
                      : 'Date unknown'}
                  </h3>
                ) : null}
                <ol className="relative ms-1.5 border-s-2 border-crimson/25 ps-5 sm:ms-3 sm:ps-8">
                  {monthGroup.events.map((event) => (
                    <EventEntry
                      key={event.id}
                      event={event}
                      search={search}
                      activeKeyword={activeKeyword}
                      activeCategory={activeCategory}
                      activeOrganization={activeOrganization}
                      dateHeadingLevel={showMonths ? 'h4' : 'h3'}
                      onKeywordClick={onKeywordClick}
                      onCategoryClick={onCategoryClick}
                      onOrganizationClick={onOrganizationClick}
                    />
                  ))}
                </ol>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
