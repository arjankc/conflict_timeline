import { useEffect, useState } from 'react'
import {
  appearanceLabel,
  applyAppearance,
  nextAppearance,
  readAppearance,
  resolvedAppearance,
  systemPrefersDark,
  writeAppearance,
  type Appearance,
  type ResolvedAppearance,
} from '../lib/appearance'

/** Cycles System → Light → Dark. Preference is `localStorage.appearance`; class `dark` is on `<html>`. */

export function ThemeToggle() {
  const [preference, setPreference] = useState<Appearance>(() =>
    typeof window === 'undefined' ? 'system' : readAppearance(),
  )
  const [resolved, setResolved] = useState<ResolvedAppearance>(() =>
    typeof window === 'undefined'
      ? 'light'
      : resolvedAppearance(readAppearance(), systemPrefersDark()),
  )

  useEffect(() => {
    setResolved(applyAppearance(preference))
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function onSystemChange() {
      if (readAppearance() !== 'system') return
      setResolved(applyAppearance('system'))
    }
    media.addEventListener('change', onSystemChange)
    return () => media.removeEventListener('change', onSystemChange)
  }, [preference])

  function onCycle() {
    const next = nextAppearance(preference)
    writeAppearance(next)
    setPreference(next)
    setResolved(applyAppearance(next))
  }

  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={appearanceLabel(preference, resolved)}
      title={appearanceLabel(preference, resolved)}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-control bg-surface text-ink"
    >
      {preference === 'dark' ? (
        <MoonIcon />
      ) : preference === 'light' ? (
        <SunIcon />
      ) : (
        <SystemIcon />
      )}
    </button>
  )
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.5M12 19.5V21M4.93 4.93l1.06 1.06M17.99 17.99l1.06 1.06M3 12h1.5M19.5 12H21M4.93 19.07l1.06-1.06M17.99 6.01l1.06-1.06" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
    </svg>
  )
}

function SystemIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  )
}
