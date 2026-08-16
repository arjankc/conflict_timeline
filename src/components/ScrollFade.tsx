/** Soft edge cues for a horizontal scroller. Sit inside a `relative` parent. */

type ScrollFadeProps = {
  start: boolean
  end: boolean
}

export function ScrollFade({ start, end }: ScrollFadeProps) {
  return (
    <>
      {start ? <div aria-hidden="true" className="scroll-fade-start" /> : null}
      {end ? <div aria-hidden="true" className="scroll-fade-end" /> : null}
    </>
  )
}
