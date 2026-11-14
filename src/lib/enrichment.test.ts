import { describe, expect, it } from 'vitest'
import {
  parseCount,
  parseDistrictOverride,
  parsePerpetrators,
  parseRelatedIds,
} from './enrichment'

describe('parseCount', () => {
  it('parses non-negative integers, null otherwise', () => {
    expect(parseCount('13')).toBe(13)
    expect(parseCount('1,300')).toBe(1300)
    expect(parseCount('')).toBeNull()
    expect(parseCount(undefined)).toBeNull()
    expect(parseCount('unknown')).toBeNull()
    expect(parseCount('-2')).toBeNull()
  })
})

describe('parsePerpetrators', () => {
  it('splits and dedupes attributions', () => {
    expect(parsePerpetrators('Nepal Army; Maoist; Nepal Army')).toEqual([
      'Nepal Army',
      'Maoist',
    ])
  })
})

describe('parseRelatedIds', () => {
  it('keeps valid ids, drops bad ones and self', () => {
    expect(parseRelatedIds('NCT-0012; bogus, nct-0034; NCT-0001', 'NCT-0001')).toEqual([
      'NCT-0012',
      'NCT-0034',
    ])
  })
})

describe('parseDistrictOverride', () => {
  it('canonicalizes explicit districts', () => {
    expect(parseDistrictOverride('Rolpa; Kavre')).toEqual(['Rolpa', 'Kavrepalanchok'])
    expect(parseDistrictOverride('')).toEqual([])
  })
})
