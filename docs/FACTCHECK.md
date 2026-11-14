# Fact-check log

Code checks structure; humans check truth. Automated layers:

- **Link rot** — `npm run link:check` (`scripts/link-check.mjs`) checks every
  `Sources` URL, maps failures to `Event_ID`s. Rerun before each release.
- **Copy-vs-data** — `npm run data:lint` asserts every hardcoded claim
  (row counts, category list, confidence split, span, keyword count) so docs
  cannot drift from the CSVs.
- **Research claims** — this log. Sampling protocol below; verdicts need an
  editor with the cited source open. Never silently rewrite narratives —
  correct the Sheet, then re-export (see `DATA.md`).

## Link-check run — 2026-11-14

116 unique URLs across 2150 rows: **104 ok, 6 blocked, 6 dead**.
Full machine-readable report regenerable via
`node scripts/link-check.mjs --json link-report.json`.

### Dead (need editor action)

| URL | Rows | Note |
| --- | --- | --- |
| `https://reliefweb.int/report/nepal/nepal-chronology-decade-long-conflict` (406) | NCT-0003, NCT-0043, NCT-0049, NCT-0062, NCT-0063 +4 | Old ReliefWeb URL format; find current URL and update Sheet |
| `https://reliefweb.int/report/nepal/silenced-and-forgotten-survivors-nepal-s-conflict-era-sexual-violence` (406) | NCT-1844 | Same old-format issue |
| `https://reliefweb.int/report/nepal/preliminary-comments-draft-bill-amend-act-commission-investigation-disappeared-persons` (406) | NCT-1980 | Same old-format issue |
| `https://disappeared-asia.org.afad-online.org/…` (DNS ENOTFOUND) | NCT-1332 | Host looks malformed (`disappeared-asia.org.afad-online.org`); find correct AFAD URL |
| `https://www.fidh.org/en/region/asia/nepal/26-arrests-during-a-peaceful` (connect timeout ×2) | NCT-0551, NCT-0665 | Possibly transient or bot-blocked; recheck in browser, then update or drop |

### Alive but malformed

- NCT-0038 NHRC Annual Report URL has a **space glued to it**
  (`…/Annual_Report_English_2004_(1).pdf`). It resolves (200) as-written, but
  raw spaces are invalid in URLs and break naive extractors — normalize the
  encoding or add a `;` separator in the Sheet and verify in a browser.
  `data-lint` now warns on spaces glued to `Sources` URLs.

### Blocked by bot protection (verify manually in a browser)

`ohchr.org` Nepal Conflict Report (NCT-0003, NCT-0019, NCT-0075 +1),
`c-r.org` (NCT-0980), `loc.gov` (NCT-1868), `giga-hamburg.de` 429 (NCT-1873),
`commonslibrary.parliament.uk` + `crisisgroup.org` (NCT-1882). Not counted as
dead — open each and confirm the cited page still exists.

## Known research issues (from `DATA.md`, pending Sheet fixes)

| Row | Issue | Status |
| --- | --- | --- |
| NCT-0002 | `Date` is `Between 1996`, `Detail` starts `and 2006, …` — a comma in “Between 1996, and 2006” split the export across columns | Documented; needs Sheet repair, not parser repair |
| NCT-0008 / NCT-0009 | Seed date `March 2, 1996` for Dil Bahadur Ramtel conflicts with Scroll.in reporting 26 Feb 1996 | Flagged; corroborate before changing |

## Review queue (figure claims — regenerate with `node scripts/factcheck-candidates.mjs --top 15`)

754 rows contain figures (mostly NR amounts, which are low-risk). Prioritize
tolls and aggregates:

| Row | Claim | Confidence | Status |
| --- | --- | --- | --- |
| NCT-0002 | 13,000 killed; 1,300+ disappeared (war totals) | medium | _open_ |
| NCT-1502 | 115,760 victims overall (Ministry of Peace and Reconstruction revision) | medium | _open_ |
| NCT-0878 | ~200,000 attended Tundikhel mass meeting (estimate) | medium | _open_ |
| NCT-0573 | Medicines worth NR 500,000 seized | low | _open_ (low confidence already signals caution) |

## Review template

```
Row: NCT-____ | Reviewer: ____ | Date: ____
Claim checked:
Source opened (URL / archive copy):
Verdict: confirmed | corrected-in-sheet | flagged-needs-second-source
Notes:
```

Verdict rules: `confirmed` only with the cited source (or archived copy) open;
`corrected-in-sheet` means the Sheet was fixed and the CSV re-exported;
`flagged` means unresolved — leave the narrative untouched and note it here.
