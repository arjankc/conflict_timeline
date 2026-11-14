import { describe, expect, it } from 'vitest'
import { canonicalDistrict, DISTRICTS } from './districts'
import { inferDistricts } from './eventGeography'

describe('canonicalDistrict', () => {
  it('matches canonical names case-insensitively', () => {
    expect(canonicalDistrict('Rolpa')).toBe('Rolpa')
    expect(canonicalDistrict('kathmandu')).toBe('Kathmandu')
  })

  it('resolves aliases and cities', () => {
    expect(canonicalDistrict('Kavre')).toBe('Kavrepalanchok')
    expect(canonicalDistrict('Nepalgunj')).toBe('Banke')
    expect(canonicalDistrict('Maoist')).toBeNull()
  })

  it('covers the legacy sheet districts', () => {
    expect(DISTRICTS).toContain('Nawalparasi')
    expect(DISTRICTS).toContain('Rukum')
  })
})

describe('inferDistricts', () => {
  it('prefers keyword matches', () => {
    expect(
      inferDistricts({ keywords: ['Maoist', 'Rolpa'], detail: 'Attack in Kathmandu.' }),
    ).toEqual(['Rolpa'])
  })

  it('falls back to detail prose with word boundaries', () => {
    expect(
      inferDistricts({ keywords: ['Maoist'], detail: 'Blast in Pokhara bazaar.' }),
    ).toEqual(['Kaski'])
    expect(
      inferDistricts({ keywords: [], detail: 'No place here.' }),
    ).toEqual([])
  })
})
