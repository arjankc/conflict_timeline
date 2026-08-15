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

    expect(events).toHaveLength(53)
    const sortKeys = events.map((event) => event.sortKey)
    expect(sortKeys).toEqual([...sortKeys].sort((a, b) => a - b))
    expect(events[0]?.rawDate).toBe('11/1/95')
  })

  it('drops rows without a date or detail', () => {
    const events = parseCsvEvents(`Date,Detail
,missing date
2001-01-01,
`)
    expect(events).toHaveLength(0)
  })
})
