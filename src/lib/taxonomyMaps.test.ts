import { afterEach, describe, expect, it } from 'vitest'
import {
  aliasToCanonical,
  applyTaxonomyCsv,
  displayNames,
  facetOrder,
  resetTaxonomyMaps,
  visibleKeys,
} from './taxonomyMaps'

const MINI_CSV = `Term,Aliases,Facet,Status,Comment
Protest,protests,Action,active,
Killing,,Action,pending,
Custom Facet Term,,Brand New Facet,active,
`;

const BAD_CSV = `Term,Aliases,Facet,Status,Comment
Protest,,Action,bogus,
`;

afterEach(() => {
  resetTaxonomyMaps()
})

describe('applyTaxonomyCsv', () => {
  it('replaces the live maps with the fetched Sheet', () => {
    const before = { ...aliasToCanonical }
    const result = applyTaxonomyCsv(MINI_CSV)
    expect(result).toEqual({ applied: 3 })
    // New facet appears in drawer order.
    expect(facetOrder).toContain('Brand New Facet')
    // Unmapped-in-sheet terms fall back to themselves.
    expect(aliasToCanonical['killing']).toBe('killing')
    expect(visibleKeys.has('killing')).toBe(false)
    expect(displayNames['protest']).toBe('Protest')
    expect(before['protest']).toBe('protest')
  })

  it('rejects invalid CSV and keeps the current maps', () => {
    const snapshot = { ...aliasToCanonical }
    const result = applyTaxonomyCsv(BAD_CSV)
    expect(result).toEqual({
      error: 'line 2 (Protest): bad Status "bogus"',
    })
    expect(aliasToCanonical).toEqual(snapshot)
  })

  it('rejects a missing column', () => {
    expect(applyTaxonomyCsv('Term,Aliases\nProtest,x\n')).toEqual({
      error: 'taxonomy CSV missing column Facet',
    })
  })

  it('reset restores the baked generated maps', () => {
    applyTaxonomyCsv(MINI_CSV)
    expect(facetOrder).toContain('Brand New Facet')
    resetTaxonomyMaps()
    expect(facetOrder).not.toContain('Brand New Facet')
    expect(aliasToCanonical['ucpn-m']).toBe('ucpn-maoist')
  })
})
