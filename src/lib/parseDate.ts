import type { DatePrecision } from '../types/event'

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

export const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const MONTH_PATTERN = Object.keys(MONTHS).join('|')

export type ParsedDate = {
  sortKey: number
  dateLabel: string
  dateTime: string | undefined
  year: number | null
  precision: DatePrecision
}

const UNKNOWN_SORT_KEY = 99991231

function normalizeDateString(raw: string): string {
  return raw.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Two-digit years in this archive span 1995–2026 (conflict 1996–2006 plus
 * transitional-justice aftermath).
 * 00–49 → 2000–2049; 50–99 → 1950–1999.
 */
export function expandYear(year: number): number {
  if (year >= 100) return year
  return year >= 50 ? 1900 + year : 2000 + year
}

export function toSortKey(year: number, month: number, day: number): number {
  return year * 10000 + month * 100 + day
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function dayLabel(year: number, month: number, day: number): string {
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`
}

function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function rangeLabel(
  year: number,
  month: number,
  startDay: number,
  endDay: number,
): string {
  return `${startDay}–${endDay} ${MONTH_NAMES[month - 1]} ${year}`
}

/**
 * Interpret the mixed Date column. Numeric cells are US `M/D/YY`;
 * display labels are day-month-year. Unrecognised strings stay as-is and sort last.
 */
export function parseDate(raw: string): ParsedDate {
  const value = normalizeDateString(raw)

  if (!value) {
    return {
      sortKey: UNKNOWN_SORT_KEY,
      dateLabel: '',
      dateTime: undefined,
      year: null,
      precision: 'unknown',
    }
  }

  const rangeMatch = value.match(
    new RegExp(
      `^(${MONTH_PATTERN})\\s+(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2}),?\\s+(\\d{4})$`,
      'i',
    ),
  )
  if (rangeMatch) {
    const month = MONTHS[rangeMatch[1].toLowerCase()]
    const startDay = Number(rangeMatch[2])
    const endDay = Number(rangeMatch[3])
    const year = Number(rangeMatch[4])
    return {
      sortKey: toSortKey(year, month, startDay),
      dateLabel: rangeLabel(year, month, startDay, endDay),
      dateTime: `${year}-${pad(month)}-${pad(startDay)}`,
      year,
      precision: 'range',
    }
  }

  const monthDayYearMatch = value.match(
    new RegExp(`^(${MONTH_PATTERN})\\s+(\\d{1,2}),?\\s+(\\d{4})$`, 'i'),
  )
  if (monthDayYearMatch) {
    const month = MONTHS[monthDayYearMatch[1].toLowerCase()]
    const day = Number(monthDayYearMatch[2])
    const year = Number(monthDayYearMatch[3])
    return {
      sortKey: toSortKey(year, month, day),
      dateLabel: dayLabel(year, month, day),
      dateTime: `${year}-${pad(month)}-${pad(day)}`,
      year,
      precision: 'day',
    }
  }

  const monthYearMatch = value.match(
    new RegExp(`^(${MONTH_PATTERN})\\s+(\\d{4})$`, 'i'),
  )
  if (monthYearMatch) {
    const month = MONTHS[monthYearMatch[1].toLowerCase()]
    const year = Number(monthYearMatch[2])
    return {
      sortKey: toSortKey(year, month, 1),
      dateLabel: monthLabel(year, month),
      dateTime: `${year}-${pad(month)}`,
      year,
      precision: 'month',
    }
  }

  const numericMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (numericMatch) {
    const month = Number(numericMatch[1])
    const day = Number(numericMatch[2])
    const year = expandYear(Number(numericMatch[3]))
    return {
      sortKey: toSortKey(year, month, day),
      dateLabel: dayLabel(year, month, day),
      dateTime: `${year}-${pad(month)}-${pad(day)}`,
      year,
      precision: 'day',
    }
  }

  return {
    sortKey: UNKNOWN_SORT_KEY,
    dateLabel: value,
    dateTime: undefined,
    year: null,
    precision: 'unknown',
  }
}
