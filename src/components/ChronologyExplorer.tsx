import { useEffect, useMemo, useRef, useState } from 'react'
import { readEventHash } from '../lib/eventAnchor'
import { groupEventsByYear, yearSectionId } from '../lib/filterEvents'
import type { ConflictEvent } from '../types/event'
import { TimelineFeed } from './TimelineFeed'
import { YearCue } from './YearCue'
import { YearNavigator } from './YearNavigator'

/** Year-grouped feed plus the dock (small screens) or rail (large screens). */

const YEAR_CUE_HOLD_MS = 1100
const YEAR_CUE_ARM_MS = 450

type ChronologyExplorerProps = {
  events: ConflictEvent[]
  focusYear?: number
  search?: string
  activeKeyword: string
  activeCategory: string
  activeOrganization: string
  onKeywordClick: (keyword: string) => void
  onCategoryClick: (category: string) => void
  onOrganizationClick: (organization: string) => void
  onYearChange?: (year: number | null) => void
  onReset?: () => void
}

export function ChronologyExplorer({
  events,
  focusYear,
  search = '',
  activeKeyword,
  activeCategory,
  activeOrganization,
  onKeywordClick,
  onCategoryClick,
  onOrganizationClick,
  onYearChange,
  onReset,
}: ChronologyExplorerProps) {
  const groups = useMemo(() => groupEventsByYear(events), [events])
  const [activeYear, setActiveYear] = useState<number | null>(
    focusYear ?? groups[0]?.year ?? null,
  )
  const [cueYear, setCueYear] = useState<number | null>(
    focusYear ?? groups[0]?.year ?? null,
  )
  const [cueOpen, setCueOpen] = useState(false)
  const [anchorId, setAnchorId] = useState<string | undefined>(() => {
    const fromHash = readEventHash(window.location.hash)
    if (fromHash) return fromHash
    if (focusYear != null) return yearSectionId(focusYear)
    return undefined
  })
  const cueArmed = useRef(false)
  const cueHideTimer = useRef(0)
  const cueHold = useRef(false)
  const activeYearRef = useRef(activeYear)

  activeYearRef.current = activeYear

  function revealYear(year: number | null, hold = false) {
    if (!cueArmed.current) return
    cueHold.current = hold
    setCueYear(year)
    setCueOpen(true)
    window.clearTimeout(cueHideTimer.current)
    if (hold) return
    cueHideTimer.current = window.setTimeout(() => {
      setCueOpen(false)
    }, YEAR_CUE_HOLD_MS)
  }

  function updateActiveYear(year: number | null, persist = false) {
    setActiveYear(year)
    if (persist) onYearChange?.(year)
  }

  useEffect(() => {
    cueArmed.current = false
    setCueOpen(false)
    const arm = window.setTimeout(() => {
      cueArmed.current = true
    }, YEAR_CUE_ARM_MS)
    return () => window.clearTimeout(arm)
  }, [groups])

  useEffect(() => {
    return () => window.clearTimeout(cueHideTimer.current)
  }, [])

  useEffect(() => {
    setActiveYear((current) => {
      if (groups.some((group) => group.year === current)) return current
      return groups[0]?.year ?? null
    })
  }, [groups])

  useEffect(() => {
    if (cueHold.current) {
      setCueYear(activeYear)
      return
    }
    revealYear(activeYear)
  }, [activeYear])

  useEffect(() => {
    function onScroll() {
      if (cueHold.current) {
        setCueYear(activeYearRef.current)
        setCueOpen(true)
        return
      }
      revealYear(activeYearRef.current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function onHashChange() {
      const id = readEventHash(window.location.hash)
      if (id) setAnchorId(id)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function scrollToYear(year: number | null) {
    setAnchorId(yearSectionId(year))
    updateActiveYear(year, true)
  }

  function onYearInView(year: number | null) {
    setActiveYear((current) => (current === year ? current : year))
  }

  function onNavigatorCue(year: number | null | undefined) {
    if (year === undefined) {
      revealYear(activeYearRef.current)
      return
    }
    revealYear(year, true)
  }

  // Year nav is DOM-first (skip link / tab) but visually column 2 on large screens.
  return (
    <div className="relative mx-auto grid max-w-5xl grid-cols-1 px-5 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_10rem] lg:gap-10 lg:pb-16">
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
              onYearCue={onNavigatorCue}
            />
          </div>
          <div className="hidden h-full lg:block">
            <YearNavigator
              variant="rail"
              groups={groups}
              activeYear={activeYear}
              onYearSelect={scrollToYear}
              onYearCue={onNavigatorCue}
            />
          </div>
        </div>
      ) : null}

      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <TimelineFeed
          groups={groups}
          search={search}
          activeKeyword={activeKeyword}
          activeCategory={activeCategory}
          activeOrganization={activeOrganization}
          onKeywordClick={onKeywordClick}
          onCategoryClick={onCategoryClick}
          onOrganizationClick={onOrganizationClick}
          onReset={onReset}
          anchorId={anchorId}
          onYearInView={onYearInView}
        />
      </div>
      <YearCue year={cueYear} open={cueOpen} />
    </div>
  )
}
