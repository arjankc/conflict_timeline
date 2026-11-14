/** About / methodology / how-to-cite block for civil-society users. */
export function AboutArchive() {
  return (
    <section
      aria-label="About this archive"
      className="mx-auto max-w-5xl px-5 pt-6 sm:px-8"
    >
      <details className="rounded-sm border border-line bg-surface px-4 py-3 sm:px-5">
        <summary className="cursor-pointer font-display text-lg text-ink">
          About, methodology & how to cite
        </summary>
        <div className="mt-3 max-w-prose space-y-3 text-sm leading-[1.75] text-muted">
          <p>
            This archive records Nepal&apos;s internal armed conflict (1996–2006)
            — from pre-conflict Operation Romeo (1995) through
            transitional-justice aftermath (2007–2026). It is compiled for
            transitional justice civil society — researchers, journalists,
            victims&apos; groups, and legal teams.
          </p>
          <p>
            <strong className="font-semibold text-ink">Methodology.</strong>{' '}
            Each row keeps its source date text and a factual narrative. Dates are
            normalized for sorting only. Confidence (<em>high / medium / low</em>)
            records how well the sources support the row; open any expanded card
            for its sources and rationale. Low confidence does not mean false —
            it means corroborate before citing in legal filings.
          </p>
          <p>
            <strong className="font-semibold text-ink">Content note.</strong>{' '}
            Entries describe killings, detention, disappearance, torture, and
            sexual violence. Narratives are intentionally brief and non-graphic.
          </p>
          <p>
            <strong className="font-semibold text-ink">How to cite.</strong>{' '}
            Use the card permalink (<span aria-hidden="true">🔗</span> copies{' '}
            <code>#event-NCT-…</code>) plus the “Copy citation” button in the
            expanded card. For the dataset, cite the repository and the archival
            CSV with Sources and Confidence.
          </p>
        </div>
      </details>
    </section>
  )
}
