# Contributing

Thank you for helping maintain this archive. The subject matter includes killings, torture, disappearance, and other human rights violations. Write and review as if survivors and families will read the page.

## Development setup

1. Install [Node.js 20+](https://nodejs.org/).
2. Clone the repository.
3. Run `npm install`.
4. Run `npm run dev`.

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Vite server |
| `npm test` | Unit tests (parsers, filters, search, permalinks, teasers, reading prefs) |
| `npm run build` | Production typecheck and bundle |
| `npm run lint` | oxlint |

Please do not commit `node_modules/`, `dist/`, or `.env` files.

## What to change where

| Change | Where |
| --- | --- |
| Event text, dates, tags | `public/data/mastersheet.csv` (or the Google Sheet, then re-export — see DATA.md) |
| Date formats the app should accept | `src/lib/parseDate.ts` **and** `src/lib/parseDate.test.ts` |
| Fetch / CSV mapping / event ids | `src/lib/loadEvents.ts` (live Sheet CSVs, no cache or fallback; see DATA.md) |
| Sources & Confidence | `src/lib/provenance.ts`, expanded card in `src/components/EventCard.tsx` |
| Enrichment columns (District, Victims, Perpetrator, Related) | `src/lib/enrichment.ts`, `src/types/event.ts`, expanded card + `exportView.ts` |
| Reading prefs (text size, contrast, blur) | `src/lib/reading.ts`, `src/components/ReadingControls.tsx`, boot script in `index.html` |
| Data lint | `scripts/data-lint.mjs` (`npm run data:lint`), taxonomy notes in `docs/TAXONOMY.md` |
| Link rot | `scripts/link-check.mjs` (`npm run link:check`), log in `docs/FACTCHECK.md` |
| Fact-check review queue | `scripts/factcheck-candidates.mjs`, log in `docs/FACTCHECK.md` |
| Archive overview / histogram | `src/components/ArchiveOverview.tsx` |
| Search, filters, year grouping | `src/lib/filterEvents.ts` (OR-within/AND-across, `?match=all` option, sort, YYYY-MM range, districts; `normalizeFilters` migrates legacy shapes) |
| Filter bar layout | `src/components/FilterBar.tsx` (sticky search + Filters toggle; drawer holds themes, facets, districts, range, sort, saved views, export) |
| Districts (inferred) | `src/lib/districts.ts`, `src/lib/eventGeography.ts`, `src/components/DistrictOverview.tsx` |
| Export filtered view | `src/lib/exportView.ts` (CSV/JSON download in FilterBar) |
| Year share pages | `scripts/year-pages.mjs` (runs in `npm run build`, appends `/year/YYYY/` to sitemap) |
| Offline mirror + dist smoke test | `scripts/events-json.mjs`, `scripts/smoke-dist.mjs` (`npm run smoke:dist` runs in deploy after build) |
| Saved views (localStorage) | `src/lib/savedViews.ts`, `src/components/FilterBar.tsx` |
| Search typeahead (fills `q` only) | `src/lib/searchSuggest.ts`, `src/components/SearchSuggest.tsx` (Event_ID + district + tag + year + term) |
| Search highlighting (`<mark>` text nodes) | `src/lib/highlight.ts` |
| Card teasers (line/tag limits) | `src/lib/eventCardTeaser.ts`, `src/components/EventCard.tsx` |
| Keyword taxonomy (Term/Aliases/Facet/Status/Comment) | `taxonomy/keyword-taxonomy.csv`, `scripts/keyword-taxonomy.mjs` → `src/lib/keywordTaxonomy.generated.ts`, helpers in `src/lib/keywordTaxonomy.ts` |
| Query-string view state | `src/lib/urlState.ts` |
| Card permalinks | `src/lib/eventAnchor.ts`, `src/components/EventCard.tsx` |
| Copy / share confirmations | `src/lib/toast.ts`, `src/components/Toast.tsx` |
| Light / dark appearance | `src/lib/appearance.ts`, `src/index.css`, boot script in `index.html` |
| Text size, high contrast, and graphic-detail blur | `src/lib/reading.ts`, `src/components/ReadingControls.tsx` |
| Site name, OG substitution | `src/lib/site.ts`, `index.html`, `vite.site-url.ts` |
| Layout and theming | `src/components/*`, `src/index.css` |
| Docs | `README.md`, `DATA.md`, this file |

## Pull requests

- Keep PRs focused. Data edits and UI edits are easier to review separately.
- Add or update tests when you change `parseDate`, tag parsing, filtering, search suggestions, highlighting, URL state, permalinks, card teasers, appearance, or reading prefs.
- Do not introduce a backend, analytics, or a runtime font CDN (`fonts.googleapis.com`) without discussion. Type is self-hosted (Fontsource) in `src/index.css`.
- Do not render `Detail` as HTML. Search highlighting must wrap text nodes in React (`<mark>`), never `dangerouslySetInnerHTML`.
- Leave sensational styling out. The palette is paper, ink, and muted crimson on purpose (with a matching dark set in `src/index.css`).
- Do not insert rows in the middle of the CSV without calling out permalink breakage (ids include the row index).
- Keep `%SITE_URL%` in `index.html` / `robots.txt` / `sitemap.xml` if you add new absolute URLs; the Vite plugin replaces that token at build time.

If you edit the CSV, mention how many rows changed and whether Category / Organizations gained values (those filters appear automatically).

## Data edits

Prefer correcting the Google Sheet first, then replacing `public/data/mastersheet.csv`, so the spreadsheet and the deployed archive do not drift.

Do not silently “fix” historical claims in the parser. If a date string is wrong, correct the sheet. The parser’s job is to read formats, not to adjudicate facts.

## Conduct

Be respectful in issues, reviews, and commit messages. Do not include graphic imagery. Do not harass maintainers or people named in the archive. Harmful or extractive use of this dataset (doxxing, celebration of violence, targeting individuals) is not welcome.

If this project later adopts a formal Code of Conduct, it will be linked from the README. Until then, the Contributor Covenant is a reasonable baseline: https://www.contributor-covenant.org/
