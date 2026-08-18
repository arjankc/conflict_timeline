import { useEffect, useState } from 'react'
import {
  applyReading,
  contrastLabel,
  nextTextSize,
  readContrast,
  readTextSize,
  textSizeLabel,
  writeContrast,
  writeTextSize,
  type ContrastPreference,
  type TextSize,
} from '../lib/reading'

/** Text size and high-contrast toggles. Stored beside appearance in localStorage. */

export function ReadingControls() {
  const [size, setSize] = useState<TextSize>(() =>
    typeof window === 'undefined' ? 'default' : readTextSize(),
  )
  const [contrast, setContrast] = useState<ContrastPreference>(() =>
    typeof window === 'undefined' ? 'default' : readContrast(),
  )

  useEffect(() => {
    applyReading(size, contrast)
  }, [size, contrast])

  function onCycleSize() {
    const next = nextTextSize(size)
    writeTextSize(next)
    setSize(next)
  }

  function onToggleContrast() {
    const next: ContrastPreference = contrast === 'more' ? 'default' : 'more'
    writeContrast(next)
    setContrast(next)
  }

  return (
    <>
      <button
        type="button"
        onClick={onCycleSize}
        aria-label={textSizeLabel(size)}
        title={textSizeLabel(size)}
        data-active={size !== 'default' ? 'true' : undefined}
        className="icon-btn gap-0.5 px-2"
      >
        <span className="text-[0.7rem] leading-none" aria-hidden="true">
          A
        </span>
        <span className="text-base leading-none font-medium" aria-hidden="true">
          A
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleContrast}
        aria-pressed={contrast === 'more'}
        aria-label={contrastLabel(contrast)}
        title={contrastLabel(contrast)}
        className="icon-btn"
      >
        <ContrastIcon />
      </button>
    </>
  )
}

function ContrastIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 5a7 7 0 0 1 0 14V5z" />
    </svg>
  )
}
