import type { ConflictEvent } from '../types/event'
import { EventCard } from './EventCard'

type TimelineFeedProps = {
  events: ConflictEvent[]
  activeKeyword: string
  activeCategory: string
  activeOrganization: string
  onKeywordClick: (keyword: string) => void
  onCategoryClick: (category: string) => void
  onOrganizationClick: (organization: string) => void
}

export function TimelineFeed({
  events,
  activeKeyword,
  activeCategory,
  activeOrganization,
  onKeywordClick,
  onCategoryClick,
  onOrganizationClick,
}: TimelineFeedProps) {
  if (events.length === 0) {
    return (
      <p className="mx-auto max-w-3xl px-4 py-12 text-center text-muted sm:px-6">
        No events match the current search and filters.
      </p>
    )
  }

  return (
    <ol className="mx-auto max-w-3xl px-4 sm:px-6">
      {events.map((event) => (
        <li key={event.id} className="border-b border-line last:border-b-0">
          <EventCard
            event={event}
            activeKeyword={activeKeyword}
            activeCategory={activeCategory}
            activeOrganization={activeOrganization}
            onKeywordClick={onKeywordClick}
            onCategoryClick={onCategoryClick}
            onOrganizationClick={onOrganizationClick}
          />
        </li>
      ))}
    </ol>
  )
}
