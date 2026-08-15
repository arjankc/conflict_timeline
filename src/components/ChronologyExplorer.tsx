import { useEffect, useMemo, useRef, useState } from 'react'
import { readEventHash } from '../lib/eventAnchor'
import { groupEventsByYear, yearSectionId } from '../lib/filterEvents'
import type { ConflictEvent } from '../types/event'
import { TimelineFeed } from './TimelineFeed'
import { YearNavigator } from './YearNavigator'

/** Year-grouped feed plus the dock (small screens) or rail (large screens). */

type ChronologyExplorerProps = {
  events: ConflictEvent[]
  focusYear?: number
  activeKeyword: string
  activeCategory: string
  activeOrganization: string
  onKeywordClick: (keyword: string) => void
  onCategoryClick: (category: string) => void
  onOrganizationClick: (organization: string) => void
  onYearChange?: (year: number | null) => void
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ChronologyExplorer({
  events,
  focusYear,
  activeKeyword,
  activeCategory,
  activeOrganization,
  onKeywordClick,
  onCategoryClick,
  onOrganizationClick,
  onYearChange,
}: ChronologyExplorerProps) {
  const groups = useMemo(() => groupEventsByYear(events), [events])
  const [activeYear, setActiveYear] = useState<number | null>(
    focusYear ?? groups[0]?.year ?? null,
  )
  const didFocus = useRef(false)
  const didHashFocus = useRef(false)

  function updateActiveYear(year: number | null, persist = false) {
    setActiveYear(year)
    if (persist) onYearChange?.(year)
  }

  useEffect(() => {
    setActiveYear((current) => {
      if (groups.some((group) => group.year === current)) return current
      return groups[0]?.year ?? null
    })
  }, [groups])

  useEffect(() => {
    const id = readEventHash(window.location.hash)
    if (!id || didHashFocus.current) return
    const node = document.getElementById(id)
    if (!node) return
    didHashFocus.current = true
    node.scrollIntoView({
      block: 'start',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [groups])

  useEffect(() => {
    if (didFocus.current || focusYear == null) return
    // A card permalink is more specific than ?year=; do not override it.
    if (readEventHash(window.location.hash)) return
    const section = document.getElementById(yearSectionId(focusYear))
    if (!section) return
    didFocus.current = true
    section.scrollIntoView({ block: 'start' })
    setActiveYear(focusYear)
  }, [focusYear, groups])

  useEffect(() => {
    const sections = groups
      .map((group) => document.getElementById(yearSectionId(group.year)))
      .filter((section): section is HTMLElement => section != null)

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const id = visible[0]?.target.id
        if (!id) return
        if (id === 'year-undated') {
          setActiveYear(null)
          return
        }
        const parsed = Number(id.replace('year-', ''))
        if (!Number.isNaN(parsed)) setActiveYear(parsed)
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 },
    )

    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [groups])

  function scrollToYear(year: number | null) {
    const section = document.getElementById(yearSectionId(year))
    const heading = document.getElementById(`${yearSectionId(year)}-heading`)
    section?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
    heading?.focus({ preventScroll: true })
    updateActiveYear(year, true)
  }

  // Year nav is DOM-first (skip link / tab) but visually column 2 on large screens.
  return (
    <div className="relative mx-auto grid max-w-5xl grid-cols-1 px-4 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_7.5rem] lg:gap-8 lg:pb-16">
      {events.length > 0 ? (
        <div
          id="years"
          tabIndex={-1}
          className="outline-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-[calc(var(--filter-h)+0.75rem)] lg:h-[calc(100dvh-var(--filter-h)-1.5rem)]"
        >
          <div className="lg:hidden">
            <YearNavigator
              variant="dock"
              groups={groups}
              activeYear={activeYear}
              onYearSelect={scrollToYear}
            />
          </div>
          <div className="hidden h-full lg:block">
            <YearNavigator
              variant="rail"
              groups={groups}
              activeYear={activeYear}
              onYearSelect={scrollToYear}
            />
          </div>
        </div>
      ) : null}

      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <TimelineFeed
          groups={groups}
          activeKeyword={activeKeyword}
          activeCategory={activeCategory}
          activeOrganization={activeOrganization}
          onKeywordClick={onKeywordClick}
          onCategoryClick={onCategoryClick}
          onOrganizationClick={onOrganizationClick}
        />
      </div>
    </div>
  )
}
