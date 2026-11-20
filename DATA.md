# Data guide

The Nepal Conflict Timeline reads a CSV at runtime. There is no database server. Google Sheets remains the editorial workspace; the committed CSV is what the website actually loads.

Fact baseline: armed conflict 13 Feb 1996 – 21 Nov 2006 (Comprehensive Peace Accord).
Dataset spans 1 Nov 1995 (NCT-0001 Operation Romeo) to 8 Sept 2025 (NCT-2112),
**2112** rows: ~1 pre-conflict, ~958 conflict-era (1996–2006), ~1153
transitional-justice aftermath (2007–2025).

## File location

| Environment | Source |
| --- | --- |
| Default | [`public/data/mastersheet.csv`](public/data/mastersheet.csv) (**2112** events) |
| Archive (not loaded) | [`public/data/mastersheet_with_sources.csv`](public/data/mastersheet_with_sources.csv) |
| Offline mirror (build artifact) | `dist/data/events.json` (raw row mirror for field use; app still loads CSV first) |
| Override | `VITE_DATA_URL` (see `.env.example`). When unset and the CSV fetch fails, the app falls back to `data/events.json` (raw row mirror, no Sources/Confidence) — useful for field/captive-portal use. |

See [`docs/CHANGELOG.md`](docs/CHANGELOG.md) for data/app history.

### Offline and field use

- `npm run build` writes `dist/data/events.json` (2112 raw rows) alongside the 31 per-year share pages.
- The runtime still fetches `mastersheet.csv` first (localStorage + `If-None-Match`); `events.json` is a fallback only, so provenance columns stay authoritative.
- For fully offline work, use the filtered CSV/JSON download in the filter bar.

`VITE_DATA_URL` is a documented hook for a later published Google Sheets CSV endpoint. This version does not fetch Sheets unless you set that variable at build time.

The fetch path is:

```ts
`${import.meta.env.BASE_URL}data/mastersheet.csv`
```

That form works in local Vite, GitHub Pages (`/conflict_timeline/`), and a future Capacitor WebView.

## Column schema

The shipped runtime CSV starts with a stable `Event_ID` (`NCT-0001` … `NCT-2112`). There is **no** leading blank column. The parser still ignores unnamed headers if an export includes one, and it ignores extra columns it does not map. Locked column notes: [`docs/EVENT_SCHEMA.md`](docs/EVENT_SCHEMA.md).

| Column | Type | Notes |
| --- | --- | --- |
| Event_ID | string | Required first column. Format `NCT-` + four-digit pad. Romeo (rich HRW row) is `NCT-0001`. Never reuse an id. Card permalinks use this value |
| Date | string | Mixed human formats; see below |
| Detail | string | Plain text event narrative. Rendered as text, never as HTML |
| Keywords | comma-separated string | Theme tags; ~**500** unique values after canonicalization (raw 502; see `docs/TAXONOMY.md`) |
| Category | comma-separated string | Populated on every row (**13** values: `civil_society`, `combat`, `detention`, `disappearance`, `displacement`, `killing`, `media`, `other`, `peace_process`, `policy`, `protest`, `sexual_violence`, `transitional_justice`) |
| Organizations | semicolon-separated string (legacy comma fallback) | Populated on **885** of **2112** rows. Cells with `;` split on semicolons (comma-bearing names preserved); legacy cells without `;` split on commas (`Royal Nepal Army, Nepal Army` → two orgs). See `docs/TAXONOMY.md` |
| Sources | `;`-separated string | Parsed from the archival CSV into citations + extracted URLs (`src/lib/provenance.ts`). Shown in the expanded card under “Sources & confidence”. Empty in the slim runtime CSV |
| Confidence | `high` / `medium` / `low` + rationale | Parsed into level + note. Filterable via `?confidence=`. Current archival split: ~1150 high / 351 medium / 611 low |
| District | `;`-separated string, optional | **Not in current sheet.** When present, canonicalized (`src/lib/districts.ts`) and overrides inference. Shown in expanded card. |
| Victims_Killed / Victims_Injured / Victims_Disappeared | non-negative integer, optional | **Not in current sheet.** Null when blank; never 0-by-default. Shown in expanded card; included in CSV/JSON export. |
| Perpetrator_Alleged | `;`-separated string, optional | **Not in current sheet.** Attribution, not verdict. Searchable; shown in expanded card. |
| Related_Events | `NCT-…` ids, optional | **Not in current sheet.** `;`/`,`/space separated, self excluded, max 12. Rendered as `#event-NCT-…` links. |

An archival export with the same rows plus `Sources` and `Confidence` lives at [`public/data/mastersheet_with_sources.csv`](public/data/mastersheet_with_sources.csv). The app parses those columns when present and ignores them when absent, so both CSVs load.

Rows without both a Date and a Detail are dropped.

## Date contract

The sheet does not use one date format. `parseDate` accepts:

| Example | Precision | Sort key |
| --- | --- | --- |
| `11/1/95` | day | 1 November 1995 (`M/D/YY`, two-digit years) |
| `4/2/96` | day | 2 April 1996 |
| `18 April 2011` | day | 18 April 2011 (day-first, no comma — most sheet rows) |
| `13 February 1996` | day | 13 February 1996 |
| `2–3 May 2002` | range | start day `2` (day-first range) |
| `March 1996` | month | first of the month |
| `March 2, 1996` | day | 2 March 1996 |
| `June 04, 2001` | day | 4 June 2001 |
| `October 4 2001` | day | 4 October 2001 (no comma) |
| `September 13-14, 2001` | range | start day `13` |

Still unparsed (sort last, label verbatim): year-only (`2012`), month ranges
(`July–August 1997`), `Between 1996`, and count-led strings (`42 people 2015`).
These stay in the sheet until editors normalize them; the parser’s job is to
read formats, not to adjudicate facts.

Two-digit years: `00`–`49` → `2000`–`2049`; `50`–`99` → `1950`–`1999`. That maps this archive’s `95` → `1995` and `00`/`01` → `2000`/`2001`.

Unrecognised dates keep the original label and sort last. The parser does not rewrite the CSV. Known editorial issues stay in the sheet until editors fix them:

- NCT-0002: `Date` is `Between 1996` and `Detail` starts `and 2006, …` — a comma in “Between 1996, and 2006” split the export across columns. Read as 1996–2006 overview.
- NCT-0008 vs NCT-0009: seed Date `March 2, 1996` conflicts with Scroll.in reporting 26 Feb 1996 for Dil Bahadur Ramtel — flagged, not auto-changed.

Display labels use day-month-year (`2 March 1996`), which is the usual form in Nepali and British English archives.

## Metadata

Keywords and Category are split on commas; Organizations split on semicolons when present and fall back to commas for legacy rows. Values are trimmed, mapped through the keyword taxonomy (`taxonomy/keyword-taxonomy.csv` → `UCPN-M` → `UCPN-Maoist`; see `docs/TAXONOMY.md`), and de-duplicated case-insensitively. Filter dropdowns hide themselves when a column has no values. Category and Organizations now have values, so those filters appear alongside keyword pills.

Districts are **inferred**, not a sheet column (see `src/lib/districts.ts`, `src/lib/eventGeography.ts`): keyword exact/alias match first (incl. `Kavre`→`Kavrepalanchok`, cities `Nepalgunj`→`Banke`), else word-boundary match in Detail. 75 legacy districts matching sheet usage (`Nawalparasi`, `Rukum` pre-split). Filter with `?district=Rolpa,Kathmandu`. A sheet `District` column + true SVG choropleth would replace inference; canonical names stay.

The Filters drawer groups theme chips by taxonomy facet (Action, Policy, Actors, Institutions, Transitional justice, Political parties and movements, Regions) with search. Only `active`/`review` taxonomy terms render — 124 controlled themes; the full ~500-keyword sheet vocabulary stays in the data (filterable, searchable, exportable) but unmapped `pending` terms and `zero-hit` terms never show as chips, pills, or suggestions. Facets combine AND-across; within a facet the default is OR (`any`), with `?match=all` requiring every selected value. Run `npm run data:lint` for duplicate ids, keyword variants, legacy org cells, confidence coverage, and taxonomy sync.

Search (`?q=`) is case-insensitive and matches **Event_ID**, **Detail**, the raw date, the display date label, the year, tags (including legacy alias spellings), alleged perpetrators, confidence notes, source citations, and inferred districts. The index is built once per loaded event. Typeahead suggestions cover Event_IDs (type `NCT-` to jump to one card), districts, visible theme tags, years, and narrative tokens of four or more letters. Picking a suggestion fills `q` only; it does not set `tag` or `year`.

## Event identifiers

Each CSV row has a stable `Event_ID` (`NCT-0001` … `NCT-2112`), minted in chronological order. The loaded event’s `id` **is** that value. Romeo (Operation Romeo, November 1995) is `NCT-0001`.

The permalink on each card is:

```
https://<origin><pathname>#event-NCT-0001
```

The `event-` prefix keeps the fragment distinct from year sections (`year-2001`, `year-undated`). That URL **does not include** `?q=` / `?tag=` filters, so the event remains visible when the link is opened.

If the same `Event_ID` appears twice, the parser keeps the first row and skips the rest with a console warning. It does not merge the narratives.

Do not reuse an `Event_ID`. Append new events with the next id. Inserting a row no longer rewrites other permalinks, because links follow `Event_ID` rather than the row index.

## Refreshing the data from Google Sheets

The editorial workspace is the `NepalConflictTimeline.xlsx` workbook in
[`sheets/`](sheets/) (tabs: Events, Keywords, ReadMe) — upload it to Google
Sheets once; the Sheet is the living source afterwards. Two modes:

**Live (editors change the Sheet, app follows on next deploy).**
Share the spreadsheet as *Anyone with the link can view* and save the
per-tab `export?format=csv&gid=…` links as repository variables
(**Settings → Variables → Actions**): Events tab → `VITE_DATA_URL`,
Keywords tab → `TAXONOMY_CSV_URL`. The deploy workflow passes both through
at build time; empty variables build from the committed CSVs. If the Sheet
is unreachable at runtime, the app falls back to the committed offline
mirror.

**Manual (editors export, repo stays pinned).**
1. Open the master spreadsheet.
2. **File → Download → Comma Separated Values (.csv)** per tab.
3. Events tab → replace `public/data/mastersheet_with_sources.csv`; slim
   runtime `public/data/mastersheet.csv` is the first 6 columns
   (`Event_ID` first, **no** leading blank column). Keywords tab → replace
   `taxonomy/keyword-taxonomy.csv` (keep the header row exactly).
   Do not reuse Event_IDs; new events append with the next id.
4. Run `npm test` and `npm run data:lint`, then commit.

## License and provenance

The application code is MIT licensed. The event texts are compiled research. Do not assume they are MIT. Record the sheet’s source, editors, and any agreed data license here when maintainers confirm it.

## Fact-checking

- `npm run link:check` verifies every `Sources` URL and maps failures to `Event_ID`s (see `docs/FACTCHECK.md` for the latest run: 104/116 ok, rest blocked/dead with remediation notes).
- `npm run data:lint` asserts every hardcoded claim in these docs (row counts, categories, confidence split, span, keyword count) — update docs and script together on mismatch.
- Research claims (tolls, dates, names) are reviewed by editors against cited sources per the protocol in `docs/FACTCHECK.md`. Never silently rewrite narratives; fix the Sheet and re-export.
