/** localStorage keys. Must match the blocking script in `index.html`. */
export const TEXT_SIZE_STORAGE_KEY = 'text-size'
export const CONTRAST_STORAGE_KEY = 'contrast'
export const BLUR_STORAGE_KEY = 'nct-blur-detail'

export type TextSize = 'default' | 'large' | 'larger'
export type ContrastPreference = 'default' | 'more'

export const TEXT_SIZE_ORDER = [
  'default',
  'large',
  'larger',
] as const satisfies readonly TextSize[]

export function isTextSize(value: string | null): value is TextSize {
  return value === 'default' || value === 'large' || value === 'larger'
}

export function isContrastPreference(value: string | null): value is ContrastPreference {
  return value === 'default' || value === 'more'
}

export function nextTextSize(current: TextSize): TextSize {
  const index = TEXT_SIZE_ORDER.indexOf(current)
  return TEXT_SIZE_ORDER[(index + 1) % TEXT_SIZE_ORDER.length]
}

export function readTextSize(): TextSize {
  try {
    const stored = localStorage.getItem(TEXT_SIZE_STORAGE_KEY)
    return isTextSize(stored) ? stored : 'default'
  } catch {
    return 'default'
  }
}

export function writeTextSize(size: TextSize): void {
  try {
    localStorage.setItem(TEXT_SIZE_STORAGE_KEY, size)
  } catch {
    /* private mode */
  }
}

export function readContrast(): ContrastPreference {
  try {
    const stored = localStorage.getItem(CONTRAST_STORAGE_KEY)
    return isContrastPreference(stored) ? stored : 'default'
  } catch {
    return 'default'
  }
}

export function writeContrast(preference: ContrastPreference): void {
  try {
    localStorage.setItem(CONTRAST_STORAGE_KEY, preference)
  } catch {
    /* private mode */
  }
}

/** Apply `text-size-*`, `contrast-more`, and `blur-detail` on `<html>`. */
export function applyReading(
  size: TextSize,
  contrast: ContrastPreference,
  blurDetail = false,
): void {
  const root = document.documentElement
  root.classList.toggle('text-size-large', size === 'large')
  root.classList.toggle('text-size-larger', size === 'larger')
  root.classList.toggle('contrast-more', contrast === 'more')
  root.classList.toggle('blur-detail', blurDetail)
}

export function readBlurDetail(): boolean {
  try {
    return localStorage.getItem(BLUR_STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

export function writeBlurDetail(on: boolean): void {
  try {
    localStorage.setItem(BLUR_STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    /* private mode */
  }
}

export function blurLabel(on: boolean): string {
  return on
    ? 'Reduce graphic detail: On. Switch off'
    : 'Reduce graphic detail: Off. Switch on'
}

export function textSizeLabel(size: TextSize): string {
  if (size === 'default') return 'Text size: Default. Switch to large'
  if (size === 'large') return 'Text size: Large. Switch to larger'
  return 'Text size: Larger. Switch to default'
}

export function contrastLabel(preference: ContrastPreference): string {
  return preference === 'more'
    ? 'High contrast: On. Switch off'
    : 'High contrast: Off. Switch on'
}
