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
      className="-mx-1 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 py-1 font-serif text-xl leading-snug text-ink outline-none sm:mb-5 sm:text-3xl"
    >
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-crimson sm:size-2.5" />
      <span>{label}</span>
      <span className="font-sans text-sm font-normal text-muted">
        {count} {count === 1 ? 'event' : 'events'}
      </span>
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
    <li className="relative pb-5 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute -start-[1.3rem] top-6 size-2.5 rounded-full border-2 border-paper bg-crimson sm:-start-[1.85rem] sm:top-7"
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
}: TimelineFeedProps) {
  if (groups.length === 0) {
    return (
      <p className="px-1 py-12 text-center text-muted" role="status">
        No events match the current search and filters.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-12">
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
                  <h3 className="ms-1 pb-2.5 pt-1.5 text-xs font-medium tracking-[0.14em] text-muted uppercase">
                    {monthGroup.month
                      ? MONTH_NAMES[monthGroup.month - 1]
                      : 'Date unknown'}
                  </h3>
                ) : null}
                <ol className="relative ms-1.5 border-s-2 border-control ps-5 sm:ms-3 sm:ps-8">
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
