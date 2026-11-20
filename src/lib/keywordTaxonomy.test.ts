import { describe, expect, it } from 'vitest'
import {
  canonicalKeywordKey,
  displayKeyword,
  isVisibleKeyword,
  keywordFacet,
} from './keywordTaxonomy'

describe('canonicalKeywordKey', () => {
  it('maps legacy variants to the recommended canonical key', () => {
    expect(canonicalKeywordKey('UCPN-M')).toBe('ucpn-maoist')
    expect(canonicalKeywordKey('Nepal police')).toBe('police')
    expect(canonicalKeywordKey('Kavrepalanchowk')).toBe('kavrepalanchok')
  })

  it('leaves unmapped keywords on their own key', () => {
    expect(canonicalKeywordKey('Killing')).toBe('killing')
  })
})

describe('displayKeyword', () => {
  it('shows the recommended Term for mapped variants', () => {
    expect(displayKeyword('UCPN-M')).toBe('UCPN-Maoist')
    expect(displayKeyword('TRC')).toBe('Truth and Reconciliation Commission')
  })
})

describe('isVisibleKeyword', () => {
  it('shows active and review terms', () => {
    expect(isVisibleKeyword('Protest')).toBe(true)
    expect(isVisibleKeyword('UCPN-M')).toBe(true)
  })

  it('hides pending and zero-hit terms', () => {
    expect(isVisibleKeyword('Killing')).toBe(false)
    expect(isVisibleKeyword('Commissioner')).toBe(false)
    expect(isVisibleKeyword('TADA')).toBe(false)
  })
})

describe('keywordFacet', () => {
  it('assigns facets from the taxonomy', () => {
    expect(keywordFacet('UCPN-M')).toBe('Political parties and movements')
    expect(keywordFacet('Protest')).toBe('Action')
  })

  it('returns undefined for unfaceted terms', () => {
    expect(keywordFacet('Killing')).toBeUndefined()
  })
})
