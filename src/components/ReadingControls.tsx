import { useEffect, useState } from 'react'
import {
  applyReading,
  blurLabel,
  contrastLabel,
  nextTextSize,
  readBlurDetail,
  readContrast,
  readTextSize,
  textSizeLabel,
  writeBlurDetail,
  writeContrast,
  writeTextSize,
  type ContrastPreference,
  type TextSize,
} from '../lib/reading'

/** Text size, contrast, and graphic-detail toggles. Stored beside appearance in localStorage. */

export function ReadingControls() {
  const [size, setSize] = useState<TextSize>(() =>
    typeof window === 'undefined' ? 'default' : readTextSize(),
  )
  const [contrast, setContrast] = useState<ContrastPreference>(() =>
    typeof window === 'undefined' ? 'default' : readContrast(),
  )
  const [blur, setBlur] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : readBlurDetail(),
  )

  useEffect(() => {
    applyReading(size, contrast, blur)
  }, [size, contrast, blur])

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

  function onToggleBlur() {
    const next = !blur
    writeBlurDetail(next)
    setBlur(next)
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
      <button
        type="button"
        onClick={onToggleBlur}
        aria-pressed={blur}
        aria-label={blurLabel(blur)}
        title={blurLabel(blur)}
        className="icon-btn"
      >
        <BlurIcon />
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

function BlurIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-6 10-6c2.2 0 4.1.7 5.7 1.8" />
      <path d="M22 12s-3.5 6-10 6c-2.2 0-4.1-.7-5.7-1.8" />
      <path d="M4 4l16 16" />
    </svg>
  )
}
