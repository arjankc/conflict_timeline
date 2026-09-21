export type DatePrecision = 'day' | 'range' | 'month' | 'unknown'

/**
 * One chronology row after CSV parse.
 * `id` is the CSV `Event_ID` (`NCT-0001`). Card permalinks are `#event-${id}`.
 */
export type ConflictEvent = {
  /** Stable `Event_ID` from the sheet. Not a row index. */
  id: string
  /** Original Date cell; not rewritten. */
  rawDate: string
  /** Numeric YYYYMMDD used only for sort order (unknown → 99991231). */
  sortKey: number
  /** Display label, day-month-year (`2 March 1996`). */
  dateLabel: string
  /** Value for the HTML `<time datetime>` attribute, when known. */
  dateTime: string | undefined
  year: number | null
  precision: DatePrecision
  /** Plain-text narrative. Never passed to `dangerouslySetInnerHTML`. */
  detail: string
  keywords: string[]
  categories: string[]
  organizations: string[]
}

export type RawCsvRow = Record<string, string | undefined>
