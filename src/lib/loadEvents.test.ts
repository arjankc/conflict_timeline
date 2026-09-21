import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseCsvEvents } from './loadEvents'

const SAMPLE = `,Date,Detail,Keywords,Category,Organizations
,4/2/96,"Forty-point demand",Maoist, dialogue,CPN
,2/13/96,"People's war launched","Holeri, Rolpa", conflict,
,March 1996,"All-party meeting",state,,
`

describe('parseCsvEvents', () => {
  it('skips the empty leading column and sorts chronologically', () => {
    const events = parseCsvEvents(SAMPLE)

    expect(events).toHaveLength(3)
    expect(events.map((event) => event.rawDate)).toEqual([
      '2/13/96',
      'March 1996',
      '4/2/96',
    ])
    expect(events[0]?.keywords).toEqual(['Holeri', 'Rolpa'])
    expect(events[2]?.categories).toEqual(['dialogue'])
    expect(events[2]?.organizations).toEqual(['CPN'])
  })

  it('parses the committed mastersheet in chronological order', () => {
    const csv = readFileSync('public/data/mastersheet.csv', 'utf8')
    const events = parseCsvEvents(csv)

    expect(events).toHaveLength(2150)
    const sortKeys = events.map((event) => event.sortKey)
    expect(sortKeys).toEqual([...sortKeys].sort((a, b) => a - b))
    expect(events[0]?.rawDate).toBe('11/1/95')
    expect(events.every((event) => event.categories.length > 0)).toBe(true)
    expect(events.some((event) => event.organizations.length > 0)).toBe(true)

    const romeo = events.filter((event) => /romeo/i.test(event.detail))
    expect(romeo).toHaveLength(1)
    expect(romeo[0]?.detail).toMatch(/organised police crackdown/i)
  })

  it('ignores extra Sources and Confidence columns on the archival CSV', () => {
    const csv = readFileSync('public/data/mastersheet_with_sources.csv', 'utf8')
    const events = parseCsvEvents(csv)

    expect(events).toHaveLength(2150)
    expect(events[0]?.rawDate).toBe('11/1/95')
    expect(events.every((event) => event.categories.length > 0)).toBe(true)
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
  })

  it('drops rows without a date or detail', () => {
    const events = parseCsvEvents(`Date,Detail
,missing date
2001-01-01,
`)
    expect(events).toHaveLength(0)
  })
})
