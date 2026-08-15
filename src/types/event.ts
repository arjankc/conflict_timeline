export type DatePrecision = 'day' | 'range' | 'month' | 'unknown'

/** One chronology row after CSV parse. Ids are `row-<csvIndex>-<sortKey>`; see DATA.md. */
export type ConflictEvent = {
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
