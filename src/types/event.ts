export type DatePrecision = 'day' | 'range' | 'month' | 'unknown'

export type ConflictEvent = {
  id: string
  rawDate: string
  sortKey: number
  dateLabel: string
  /** Value for the HTML `<time datetime>` attribute, when known. */
  dateTime: string | undefined
  year: number | null
  precision: DatePrecision
  detail: string
  keywords: string[]
  categories: string[]
  organizations: string[]
}

export type RawCsvRow = Record<string, string | undefined>
