import { describe, expect, it } from 'vitest'
import {
  contrastLabel,
  isContrastPreference,
  isTextSize,
  nextTextSize,
  textSizeLabel,
} from './reading'

describe('nextTextSize', () => {
  it('cycles default → large → larger → default', () => {
    expect(nextTextSize('default')).toBe('large')
    expect(nextTextSize('large')).toBe('larger')
    expect(nextTextSize('larger')).toBe('default')
  })
})

describe('isTextSize', () => {
  it('rejects unknown values', () => {
    expect(isTextSize('huge')).toBe(false)
    expect(isTextSize('large')).toBe(true)
  })
})

describe('isContrastPreference', () => {
  it('accepts stored contrast values', () => {
    expect(isContrastPreference('more')).toBe(true)
    expect(isContrastPreference('default')).toBe(true)
    expect(isContrastPreference('high')).toBe(false)
  })
})

describe('labels', () => {
  it('name the next control action', () => {
    expect(textSizeLabel('default')).toContain('Switch to large')
    expect(contrastLabel('more')).toContain('Switch off')
  })
})
