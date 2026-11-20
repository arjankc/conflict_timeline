import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PARSE_BATCH_SIZE, parseCsvEvents, parseCsvEventsProgressive } from './loadEvents'

const SAMPLE = `,Date,Detail,Keywords,Category,Organizations
,4/2/96,"Forty-point demand",Maoist, dialogue,CPN
,2/13/96,"People's war launched","Holeri, Rolpa", conflict,
,March 1996,"All-party meeting",state,,
`

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('parseCsvEvents', () => {
  it('skips the empty leading column and sorts chronologically', () => {
    const events = parseCsvEvents(SAMPLE)

    expect(events).toHaveLength(3)
    expect(events.map((event) => event.rawDate)).toEqual([
      '2/13/96',
      'March 1996',
      '4/2/96',
    ])
    expect(events[0]?.keywords).toEqual(['Rolpa'])
    expect(events[2]?.categories).toEqual(['dialogue'])
    expect(events[2]?.organizations).toEqual(['CPN'])
  })

  it('parses the committed mastersheet in chronological order', () => {
    const csv = readFileSync('public/data/mastersheet.csv', 'utf8')
    const events = parseCsvEvents(csv)

    expect(events).toHaveLength(2112)
    const sortKeys = events.map((event) => event.sortKey)
    expect(sortKeys).toEqual([...sortKeys].sort((a, b) => a - b))
    expect(events[0]?.rawDate).toBe('11/1/95')
    expect(events[0]?.id).toBe('NCT-0001')
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length)
    // Day-first dates must parse: a parser regression would strand ~1800 rows as undated.
    expect(events.filter((event) => event.year == null)).toHaveLength(54)
    expect(events.every((event) => event.categories.length > 0)).toBe(true)
    expect(events.some((event) => event.organizations.length > 0)).toBe(true)

    const romeo = events.filter((event) => /romeo/i.test(event.detail))
    expect(romeo).toHaveLength(1)
    expect(romeo[0]?.id).toBe('NCT-0001')
    expect(romeo[0]?.detail).toMatch(/organised police crackdown/i)

    const [header, firstRow] = csv.split(/\r?\n/)
    expect(header).toBe(
      'Event_ID,Date,Detail,Keywords,Category,Organizations',
    )
    expect(firstRow?.startsWith('NCT-0001,11/1/95,')).toBe(true)
    expect(firstRow).toMatch(/Operation Romeo commenced/)
  })

  it('ignores extra Sources and Confidence columns on the archival CSV', () => {
    const csv = readFileSync('public/data/mastersheet_with_sources.csv', 'utf8')
    const events = parseCsvEvents(csv)

    expect(events).toHaveLength(2112)
    expect(events[0]?.id).toBe('NCT-0001')
    expect(events[0]?.rawDate).toBe('11/1/95')
    expect(events.every((event) => event.categories.length > 0)).toBe(true)
    expect(csv.split(/\r?\n/, 1)[0]).toBe(
      'Event_ID,Date,Detail,Keywords,Category,Organizations,Sources,Confidence',
    )
  })

  it('parses semicolon-delimited Organizations in archival rows without splitting comma-bearing names', () => {
    const events = parseCsvEvents(`Date,Detail,Keywords,Category,Organizations,Sources,Confidence
5 February 2021,Example event,TRC,transitional_justice,"Office of the President; Ministry of Law, Justice and Parliamentary Affairs; CIEDP",example source,high
`)

    expect(events[0]?.organizations).toEqual([
      'Office of the President',
      'Ministry of Law, Justice and Parliamentary Affairs',
      'CIEDP',
    ])
    expect(events[0]?.sources).toEqual([
      { citation: 'example source', urls: [] },
    ])
    expect(events[0]?.confidence).toBe('high')
  })

  it('parses Sources urls and Confidence rationale from the archival CSV', () => {
    const csv = readFileSync('public/data/mastersheet_with_sources.csv', 'utf8')
    const events = parseCsvEvents(csv)
    const romeo = events.find((event) => event.id === 'NCT-0001')
    expect(romeo?.confidence).toBe('high')
    expect(romeo?.confidenceNote).toMatch(/Operation Romeo/i)
    expect(romeo?.sources.length).toBeGreaterThan(0)
    expect(romeo?.sources[0]?.urls[0]).toMatch(/^https?:/)
  })

  it('parses optional enrichment columns when present, defaults when absent', () => {
    const events = parseCsvEvents(`Event_ID,Date,Detail,Keywords,Category,Organizations,District,Victims_Killed,Victims_Injured,Victims_Disappeared,Perpetrator_Alleged,Related_Events
NCT-0001,1/1/96,First,Rolpa,combat,Nepal Police,Rolpa; Kavre,13,2,,Nepal Army,NCT-0002
NCT-0002,2/1/96,Second,Kathmandu,other,,Kathmandu,,,,,
`)
    expect(events[0]?.victims).toEqual({ killed: 13, injured: 2, disappeared: null })
    expect(events[0]?.perpetrators).toEqual(['Nepal Army'])
    expect(events[0]?.relatedIds).toEqual(['NCT-0002'])
    expect(events[0]?.districtOverride).toEqual(['Rolpa', 'Kavrepalanchok'])
    expect(events[1]?.victims).toEqual({ killed: null, injured: null, disappeared: null })
    expect(events[1]?.relatedIds).toEqual([])
  })

  it('canonicalizes keywords through the taxonomy at parse time', () => {
    const events = parseCsvEvents(`Event_ID,Date,Detail,Keywords,Category,Organizations
NCT-0990,1/1/05,Rally,UCPN-M,killing,
NCT-0991,2/1/05,Clash,killing,combat,
`)
    expect(events[0]?.keywords).toEqual(['UCPN-Maoist'])
    expect(events[1]?.keywords).toEqual(['Killing'])
  })

  it('keeps the first row when Event_ID is duplicated and does not merge the incidents', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const events = parseCsvEvents(`Event_ID,Date,Detail,Keywords,Category,Organizations
NCT-0001,1/1/96,First Romeo narrative,Rolpa,disappearance,Nepal Police
NCT-0001,6/2/96,A different later incident,Kathmandu,protest,
NCT-0002,3/3/96,Separate event,Rolpa,combat,
`)

    expect(events.map((event) => event.id)).toEqual(['NCT-0001', 'NCT-0002'])
    expect(events.map((event) => event.detail)).toEqual([
      'First Romeo narrative',
      'Separate event',
    ])
    expect(warn).toHaveBeenCalledWith(
      'Duplicate Event_ID NCT-0001 skipped; keeping the first row.',
    )
    warn.mockRestore()
  })

  it('parses in batches and finishes with every row', async () => {
    const lines = ['Event_ID,Date,Detail']
    const count = PARSE_BATCH_SIZE + 25
    for (let index = 1; index <= count; index += 1) {
      lines.push(`NCT-${String(index).padStart(4, '0')},1/1/96,Event ${index}`)
    }
    const sizes: number[] = []
    const events = await new Promise<ReturnType<typeof parseCsvEvents>>((resolve) => {
      parseCsvEventsProgressive(lines.join('\n'), (batch, done) => {
        sizes.push(batch.length)
        if (done) resolve(batch)
      })
    })

    expect(sizes[0]).toBe(PARSE_BATCH_SIZE)
    expect(sizes.at(-1)).toBe(count)
    expect(sizes.length).toBeGreaterThan(1)
    expect(events[0]?.id).toBe('NCT-0001')
    expect(events).toHaveLength(count)
  })

  it('drops rows without a date or detail', () => {
    const events = parseCsvEvents(`Date,Detail
,missing date
2001-01-01,
`)
    expect(events).toHaveLength(0)
  })
})

describe('loadEvents', () => {
  it('waits for cached parsing to finish when the network refresh fails', async () => {
    vi.resetModules()
    const count = PARSE_BATCH_SIZE + 5
    const lines = ['Event_ID,Date,Detail']
    for (let index = 1; index <= count; index += 1) {
      lines.push(`NCT-${String(index).padStart(4, '0')},1/1/96,Event ${index}`)
    }
    const body = lines.join('\n')
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ etag: null, body }),
    })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const { loadEvents } = await import('./loadEvents')
    const events = await loadEvents()

    expect(events).toHaveLength(count)
  })

  it('falls back to events.json when the CSV fetch fails', async () => {
    vi.resetModules()
    vi.stubGlobal('localStorage', { getItem: () => null })
    const rows = [
      { Event_ID: 'NCT-0001', Date: '1/1/96', Detail: 'Fallback event' },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (String(url).endsWith('events.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(rows),
          })
        }
        return Promise.reject(new Error('csv offline'))
      }),
    )

    const { loadEvents } = await import('./loadEvents')
    const events = await loadEvents()

    expect(events).toHaveLength(1)
    expect(events[0]?.id).toBe('NCT-0001')
  })

  it('still falls back to events.json when the live Sheet URL fails', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_DATA_URL', 'https://docs.google.com/spreadsheets/d/abc/export?format=csv')
    vi.stubGlobal('localStorage', { getItem: () => null })
    const rows = [
      { Event_ID: 'NCT-0001', Date: '1/1/96', Detail: 'Fallback event' },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (String(url).endsWith('events.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(rows),
          })
        }
        return Promise.reject(new Error('sheet offline'))
      }),
    )

    const { loadEvents } = await import('./loadEvents')
    const events = await loadEvents()

    expect(events).toHaveLength(1)
    expect(events[0]?.id).toBe('NCT-0001')
  })

  it('replays a terminal error without throwing during subscription', async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { loadEvents } = await import('./loadEvents')

    await expect(loadEvents()).rejects.toThrow('offline')
    await expect(loadEvents()).rejects.toThrow('offline')
  })
})
