/** localStorage key. Must match the blocking script in `index.html`. */
export const APPEARANCE_STORAGE_KEY = 'appearance'

export const PAPER_LIGHT = '#fafaf9'
export const PAPER_DARK = '#1c1917'

export type Appearance = 'light' | 'dark' | 'system'
export type ResolvedAppearance = 'light' | 'dark'

/** Cycle order for the header control: follow the OS, then lock light, then lock dark. */
export const APPEARANCE_ORDER = ['system', 'light', 'dark'] as const satisfies readonly Appearance[]

export function isAppearance(value: string | null): value is Appearance {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function nextAppearance(current: Appearance): Appearance {
  const index = APPEARANCE_ORDER.indexOf(current)
  return APPEARANCE_ORDER[(index + 1) % APPEARANCE_ORDER.length]
}

export function resolvedAppearance(
  preference: Appearance,
  prefersDark: boolean,
): ResolvedAppearance {
  if (preference === 'system') return prefersDark ? 'dark' : 'light'
  return preference
}

export function readAppearance(): Appearance {
  try {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY)
    return isAppearance(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function writeAppearance(preference: Appearance): void {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, preference)
  } catch {
    /* private mode */
  }
}

export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Apply `html.dark`, `color-scheme`, and `theme-color` for the resolved palette. */
export function applyAppearance(preference: Appearance): ResolvedAppearance {
  const resolved = resolvedAppearance(preference, systemPrefersDark())
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.style.colorScheme = resolved
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? PAPER_DARK : PAPER_LIGHT)
  return resolved
}

export function appearanceLabel(
  preference: Appearance,
  resolved: ResolvedAppearance,
): string {
  if (preference === 'system') {
    return `Appearance: System (${resolved}). Switch to light`
  }
  if (preference === 'light') return 'Appearance: Light. Switch to dark'
  return 'Appearance: Dark. Switch to system'
}
