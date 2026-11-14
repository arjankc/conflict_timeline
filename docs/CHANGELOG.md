# Changelog

All notable changes to data handling and the app. Dates are release dates (UTC).

## Unreleased

- Forward-compatible enrichment columns: `District`, `Victims_Killed`,
  `Victims_Injured`, `Victims_Disappeared`, `Perpetrator_Alleged`,
  `Related_Events` parsed when present (absent in current sheet → empty).
  Explicit `District` overrides inference; related ids link `#event-NCT-…`.
- Reading preference: “Reduce graphic detail” blur toggle (persisted
  `nct-blur-detail`, `blur-detail` class, unblurs on expand/hover/focus).
- Offline artifact: `dist/data/events.json` raw row mirror generated at build.
- `data:lint`: year-range (1995–2026), victim-integer, related-id, and District
  sanity checks; district keyword coverage (~56% of rows); enrichment columns optional.
- Typeahead: Event_ID (`NCT-…`), district, tag, year, and term suggestions
  (picking fills `q` only).
- Loader: CSV-first with `data/events.json` fallback when the CSV fetch fails
  (field/captive-portal use; fallback rows lack Sources/Confidence).
- Filter hardening: `normalizeFilters` coerces legacy saved views and URLs;
  `?match=all` requires every selected value within a facet (default `any`);
  district inference memoized; facet dropdowns are exclusive accordions with
  Escape-to-close; legacy saved views auto-migrate on load.
- Build pipeline: `scripts/smoke-dist.mjs` (`npm run smoke:dist`, wired into
  the deploy workflow) verifies year pages, sitemap entries, and the offline
  JSON after every build.
- Mobile filter bar collapses range/sort/facets behind a “Filters (n)”
  disclosure; the year-dock density strip is now a real `slider`
  (arrow/Home/End keys, blur releases the year cue); expanded cards get a
  bottom “Show less”; the Undated section explains itself.
- District overview shows the top 8 with “show all” (selected districts always
  visible); search-match navigation (`src/lib/matchNav.ts`) steps through hits
  via the anchor pipeline, with position announced to screen readers.
- Timeline-first layout: search, counts, match stepping, pills, and one
  Filters toggle stay visible; themes, facets, district ranking, range, sort,
  saved views, and export moved into the drawer.
- Fact-checking: `npm run link:check` (`scripts/link-check.mjs`) verifies
  Sources URLs (2026-11-14 run: 104/116 ok, 6 blocked, 6 dead — see
  `docs/FACTCHECK.md`); `data-lint` asserts doc claims and warns on raw
  spaces in Sources URLs; `scripts/factcheck-candidates.mjs` seeds the
  figure-claim review queue.

## 0.1.0 — 2026-11-14

- Fact baseline: dataset spans 1995 (Operation Romeo) to May 2026, 2150 rows;
  conflict 1996–2006 is the subset. Copy, meta, JSON-LD `temporalCoverage`
  `1995/2026` fixed across `App.tsx`, `site.ts`, `index.html`, README, DATA.
- Provenance: `Sources` + `Confidence` parsed, expanded-card disclosure,
  citation copy, `?confidence=` filter.
- Taxonomy: keyword canonicalization, org legacy comma fallback,
  `npm run data:lint`, `docs/TAXONOMY.md`.
- Findability: multi-select facets (OR-within/AND-across), `?tag=&category=`
  `&org=&district=`, YYYY-MM range, sort, density toggle, saved views.
- Place: inferred districts (75 legacy + aliases/cities), `DistrictOverview`,
  district pills + facet.
- Export filtered CSV/JSON; per-year share pages `/year/YYYY/` + sitemap.
