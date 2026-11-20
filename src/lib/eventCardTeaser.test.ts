import { describe, expect, it } from 'vitest'
import {
  DESKTOP_TAG_LIMIT,
  MOBILE_TAG_LIMIT,
  eventDensity,
  metadataPills,
  pickVisiblePills,
  type MetaPill,
} from './eventCardTeaser'

const sample: MetaPill[] = [
  { kind: 'keyword', label: 'state' },
  { kind: 'keyword', label: 'Maoist' },
  { kind: 'keyword', label: 'violence' },
  { kind: 'keyword', label: 'assassination' },
  { kind: 'organization', label: 'RNA' },
]

function selectedLabels(...labels: string[]) {
  const set = new Set(labels.map((label) => label.toLowerCase()))
  return (pill: MetaPill) => set.has(pill.label.toLowerCase())
}

describe('metadataPills', () => {
  it('lists keywords then categories then organizations', () => {
    expect(
      metadataPills({
        keywords: ['Maoist'],
        categories: ['State'],
        organizations: ['RNA'],
      }),
    ).toEqual([
      { kind: 'keyword', label: 'Maoist' },
      { kind: 'category', label: 'State' },
      { kind: 'organization', label: 'RNA' },
    ])
  })

  it('drops a later pill that repeats an earlier label (e.g. protest keyword + protest category)', () => {
    expect(
      metadataPills({
        keywords: ['killing', 'protest'],
        categories: ['protest'],
        organizations: [],
      }),
    ).toEqual([
      { kind: 'keyword', label: 'killing' },
      { kind: 'keyword', label: 'protest' },
    ])
  })

  it('treats underscores and spaces as the same label (transitional justice vs transitional_justice)', () => {
    expect(
      metadataPills({
        keywords: ['TRC', 'transitional justice'],
        categories: ['transitional_justice'],
        organizations: ['Truth and Reconciliation Commission'],
      }),
    ).toEqual([
      { kind: 'keyword', label: 'TRC' },
      { kind: 'keyword', label: 'transitional justice' },
      { kind: 'organization', label: 'Truth and Reconciliation Commission' },
    ])
  })
})

describe('pickVisiblePills', () => {
  it('returns every pill when expanded or under the limit', () => {
    expect(pickVisiblePills(sample, MOBILE_TAG_LIMIT, true, () => false)).toEqual({
      visible: sample,
      hiddenCount: 0,
    })
    expect(
      pickVisiblePills(sample.slice(0, 2), MOBILE_TAG_LIMIT, false, () => false),
    ).toEqual({
      visible: sample.slice(0, 2),
      hiddenCount: 0,
    })
  })

  it('keeps three pills on a compact teaser', () => {
    const result = pickVisiblePills(sample, MOBILE_TAG_LIMIT, false, () => false)
    expect(result.visible.map((pill) => pill.label)).toEqual([
      'state',
      'Maoist',
      'violence',
    ])
    expect(result.hiddenCount).toBe(2)
  })

  it('keeps a selected pill that would otherwise be clipped', () => {
    const result = pickVisiblePills(
      sample,
      MOBILE_TAG_LIMIT,
      false,
      selectedLabels('RNA'),
    )
    expect(result.visible.map((pill) => pill.label)).toEqual([
      'state',
      'Maoist',
      'RNA',
    ])
    expect(result.hiddenCount).toBe(2)
  })

  it('allows five pills on the desktop teaser', () => {
    const result = pickVisiblePills(sample, DESKTOP_TAG_LIMIT, false, () => false)
    expect(result.visible).toEqual(sample)
    expect(result.hiddenCount).toBe(0)
  })
})

describe('eventDensity', () => {
  it('treats short notes as brief and long narratives as rich', () => {
    expect(eventDensity('Police raid in Rolpa.')).toBe('brief')
    expect(eventDensity('x'.repeat(96))).toBe('standard')
    expect(eventDensity('x'.repeat(280))).toBe('rich')
  })
})
