/** Brief year overlay while scrolling or scrubbing, in the spirit of a photos timeline HUD. */

type YearCueProps = {
  year: number | null
  open: boolean
}

export function YearCue({ year, open }: YearCueProps) {
  return (
    <div data-open={open} className="year-cue" aria-hidden="true">
      <p className="year-cue-label">{year == null ? 'Undated' : year}</p>
    </div>
  )
}
