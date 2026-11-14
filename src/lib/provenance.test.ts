import { describe, expect, it } from 'vitest'
import { parseConfidence, parseSources } from './provenance'

describe('parseSources', () => {
  it('splits on semicolons and extracts urls', () => {
    const sources = parseSources(
      'Human Rights Watch, Background, https://www.hrw.org/reports/2004/nepal1004/2.htm ; Wikipedia summary — prefer HRW primary',
    )
    expect(sources).toHaveLength(2)
    expect(sources[0]?.urls).toEqual([
      'https://www.hrw.org/reports/2004/nepal1004/2.htm',
    ])
    expect(sources[0]?.citation).toMatch(/Human Rights Watch/)
    expect(sources[0]?.citation).not.toMatch(/https?:/)
    expect(sources[1]?.urls).toEqual([])
  })

  it('returns empty for missing values', () => {
    expect(parseSources(undefined)).toEqual([])
    expect(parseSources('')).toEqual([])
  })
})

describe('parseConfidence', () => {
  it('parses high/medium/low prefixes with em-dash rationale', () => {
    expect(parseConfidence('high — HRW documents Romeo abuses')).toEqual({
      level: 'high',
      note: 'HRW documents Romeo abuses',
    })
    expect(parseConfidence('medium — date fuzzy')).toEqual({
      level: 'medium',
      note: 'date fuzzy',
    })
    expect(parseConfidence('low — fragmentary date/detail')).toEqual({
      level: 'low',
      note: 'fragmentary date/detail',
    })
  })

  it('returns null level for blank or unknown values', () => {
    expect(parseConfidence(undefined)).toEqual({ level: null, note: '' })
    expect(parseConfidence('')).toEqual({ level: null, note: '' })
  })
})
