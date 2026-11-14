import type { ConflictEvent } from '../types/event'

function csvCell(value: string): string {
  const flat = value.replace(/\r?\n/g, ' ').replace(/\u00a0/g, ' ')
  if (/[",]/.test(flat)) return `"${flat.replace(/"/g, '""')}"`
  return flat
}

export function eventsToCsv(events: ConflictEvent[]): string {
  const header =
    'Event_ID,Date,Detail,Keywords,Category,Organizations,District,Victims_Killed,Victims_Injured,Victims_Disappeared,Perpetrator_Alleged,Related_Events,Confidence,Sources'
  const lines = events.map((event) =>
    [
      csvCell(event.id),
      csvCell(event.rawDate),
      csvCell(event.detail),
      csvCell(event.keywords.join('; ')),
      csvCell(event.categories.join('; ')),
      csvCell(event.organizations.join('; ')),
      csvCell((event.districtOverride ?? []).join('; ')),
      csvCell(event.victims.killed != null ? String(event.victims.killed) : ''),
      csvCell(event.victims.injured != null ? String(event.victims.injured) : ''),
      csvCell(event.victims.disappeared != null ? String(event.victims.disappeared) : ''),
      csvCell((event.perpetrators ?? []).join('; ')),
      csvCell((event.relatedIds ?? []).join('; ')),
      csvCell(event.confidence ?? ''),
      csvCell(
        event.sources
          .map((s) => (s.urls.length > 0 ? `${s.citation} ${s.urls.join(' ')}` : s.citation))
          .join(' | '),
      ),
    ].join(','),
  )
  return [header, ...lines].join('\n')
}

export function eventsToJson(events: ConflictEvent[]): string {
  return JSON.stringify(
    events.map((event) => ({
      id: event.id,
      date: event.rawDate,
      dateLabel: event.dateLabel,
      detail: event.detail,
      keywords: event.keywords,
      categories: event.categories,
      organizations: event.organizations,
      districtOverride: event.districtOverride ?? [],
      victims: event.victims,
      perpetrators: event.perpetrators ?? [],
      relatedIds: event.relatedIds ?? [],
      confidence: event.confidence,
      confidenceNote: event.confidenceNote,
      sources: event.sources,
    })),
    null,
    2,
  )
}

export function downloadFile(filename: string, mime: string, text: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
