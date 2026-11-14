import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  blurLabel,
  contrastLabel,
  isContrastPreference,
  isTextSize,
  nextTextSize,
  readBlurDetail,
  textSizeLabel,
  writeBlurDetail,
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

describe('blurDetail', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads and writes the blur preference', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    })
    expect(readBlurDetail()).toBe(false)
    writeBlurDetail(true)
    expect(readBlurDetail()).toBe(true)
    expect(blurLabel(true)).toContain('Switch off')
  })
})
