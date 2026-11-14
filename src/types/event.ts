export type DatePrecision = 'day' | 'range' | 'month' | 'unknown'

/**
 * One chronology row after CSV parse.
 * `id` is the CSV `Event_ID` (`NCT-0001`). Card permalinks are `#event-${id}`.
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type EventSource = {
  /** Full citation text for one `;`-separated Sources entry, URLs removed. */
  citation: string
  /** URLs extracted from that entry. */
  urls: string[]
}

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
  /** Parsed `Sources` column (`;`-separated). Empty when the slim CSV is loaded. */
  sources: EventSource[]
  /** Parsed `Confidence` level (`high`/`medium`/`low`). Null when blank/unknown. */
  confidence: ConfidenceLevel | null
  /** Rationale after the level prefix (`high — …`). Empty when none. */
  confidenceNote: string
  /**
   * Explicit `District` column override (canonicalized). Absent in current
   * sheet — inference (`eventGeography.ts`) fills the gap. Explicit wins.
   */
  districtOverride: string[]
  /** Optional victim counts. Null = unknown/blank (never 0-by-default). */
  victims: {
    killed: number | null
    injured: number | null
    disappeared: number | null
  }
  /** Optional `Perpetrator_Alleged` (`;`-separated). Attribution, not verdict. */
  perpetrators: string[]
  /** Optional `Related_Events` (`NCT-…` ids, self excluded). */
  relatedIds: string[]
}

export type RawCsvRow = Record<string, string | undefined>
