import { describe, expect, it } from 'vitest'
import {
  appearanceLabel,
  isAppearance,
  nextAppearance,
  resolvedAppearance,
} from './appearance'

describe('resolvedAppearance', () => {
  it('follows the system when preference is system', () => {
    expect(resolvedAppearance('system', true)).toBe('dark')
    expect(resolvedAppearance('system', false)).toBe('light')
  })

  it('ignores the system when light or dark is chosen', () => {
    expect(resolvedAppearance('light', true)).toBe('light')
    expect(resolvedAppearance('dark', false)).toBe('dark')
  })
})

describe('nextAppearance', () => {
  it('cycles system → light → dark → system', () => {
    expect(nextAppearance('system')).toBe('light')
    expect(nextAppearance('light')).toBe('dark')
    expect(nextAppearance('dark')).toBe('system')
  })
})

describe('isAppearance', () => {
  it('accepts only the three stored values', () => {
    expect(isAppearance('system')).toBe(true)
    expect(isAppearance('auto')).toBe(false)
    expect(isAppearance(null)).toBe(false)
  })
})

describe('appearanceLabel', () => {
  it('names the next mode for the control', () => {
    expect(appearanceLabel('system', 'dark')).toContain('Switch to light')
    expect(appearanceLabel('light', 'light')).toContain('Switch to dark')
    expect(appearanceLabel('dark', 'dark')).toContain('Switch to system')
  })
})
