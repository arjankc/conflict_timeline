import type { ConflictEvent } from '../types/event'

type PillKind = 'keyword' | 'category' | 'organization'

type EventCardProps = {
  event: ConflictEvent
  activeKeyword: string
  activeCategory: string
  activeOrganization: string
  onKeywordClick: (keyword: string) => void
  onCategoryClick: (category: string) => void
  onOrganizationClick: (organization: string) => void
}

const PILL_STYLES: Record<PillKind, string> = {
  keyword: 'border-stone-300 bg-stone-100 text-stone-800',
  category: 'border-stone-400 bg-stone-200 text-stone-900',
  organization: 'border-rose-200 bg-rose-50 text-rose-950',
}

function Pill({
  label,
  kind,
  pressed,
  onClick,
}: {
  label: string
  kind: PillKind
  pressed?: boolean
  onClick?: () => void
}) {
  const className = [
    'rounded-full border px-2.5 py-0.5 text-xs leading-5',
    PILL_STYLES[kind],
    onClick ? 'hover:border-crimson hover:text-crimson' : '',
    pressed ? 'border-crimson bg-crimson-soft text-crimson' : '',
  ].join(' ')

  if (!onClick) {
    return <span className={className}>{label}</span>
  }

  return (
    <button
      type="button"
      className={className}
      aria-pressed={pressed}
      aria-label={`Filter by ${kind} ${label}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export function EventCard({
  event,
  activeKeyword,
  activeCategory,
  activeOrganization,
  onKeywordClick,
  onCategoryClick,
  onOrganizationClick,
}: EventCardProps) {
  const hasPills =
    event.keywords.length > 0 ||
    event.categories.length > 0 ||
    event.organizations.length > 0

  return (
    <article className="py-6">
      <header>
        <time
          dateTime={event.dateTime}
          className="font-serif text-xl font-semibold text-crimson sm:text-2xl"
        >
          {event.dateLabel}
        </time>
      </header>
      <p className="mt-3 max-w-prose text-base leading-relaxed text-ink">{event.detail}</p>

      {hasPills ? (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Event metadata">
          {event.keywords.map((keyword) => (
            <li key={`keyword-${keyword}`}>
              <Pill
                kind="keyword"
                label={keyword}
                pressed={keyword.toLowerCase() === activeKeyword.toLowerCase()}
                onClick={() => onKeywordClick(keyword)}
              />
            </li>
          ))}
          {event.categories.map((category) => (
            <li key={`category-${category}`}>
              <Pill
                kind="category"
                label={category}
                pressed={category.toLowerCase() === activeCategory.toLowerCase()}
                onClick={() => onCategoryClick(category)}
              />
            </li>
          ))}
          {event.organizations.map((organization) => (
            <li key={`organization-${organization}`}>
              <Pill
                kind="organization"
                label={organization}
                pressed={
                  organization.toLowerCase() === activeOrganization.toLowerCase()
                }
                onClick={() => onOrganizationClick(organization)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}
