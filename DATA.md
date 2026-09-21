# Data guide

The Nepal Conflict Timeline reads a CSV at runtime. There is no database server. Google Sheets remains the editorial workspace; the committed CSV is what the website actually loads.

## File location

| Environment | Source |
| --- | --- |
| Default | [`public/data/mastersheet.csv`](public/data/mastersheet.csv) (**2173** events) |
| Archive (not loaded) | [`public/data/mastersheet_with_sources.csv`](public/data/mastersheet_with_sources.csv) |
| Override | `VITE_DATA_URL` (see `.env.example`) |

`VITE_DATA_URL` is a documented hook for a later published Google Sheets CSV endpoint. This version does not fetch Sheets unless you set that variable at build time.

The fetch path is:

```ts
`${import.meta.env.BASE_URL}data/mastersheet.csv`
```

That form works in local Vite, GitHub Pages (`/conflict_timeline/`), and a future Capacitor WebView.

## Column schema

Google Sheets exports often include a leading empty column. The parser ignores unnamed columns and reads these headers:

| Column | Type | Notes |
| --- | --- | --- |
| Date | string | Mixed human formats; see below |
| Detail | string | Plain text event narrative. Rendered as text, never as HTML |
| Keywords | comma-separated string | Theme tags; about **502** unique values in the current sheet |
| Category | comma-separated string | Populated on every row (**13** values: `civil_society`, `combat`, `detention`, `disappearance`, `displacement`, `killing`, `media`, `other`, `peace_process`, `policy`, `protest`, `sexual_violence`, `transitional_justice`) |
| Organizations | semicolon-separated string | Populated on **899** of **2173** rows (**79** unique values); commas inside organization names are preserved |

An archival export with the same rows plus `Sources` and `Confidence` lives at [`public/data/mastersheet_with_sources.csv`](public/data/mastersheet_with_sources.csv). The app does not fetch that file; extra columns are ignored if it is parsed.

Rows without both a Date and a Detail are dropped.

## Date contract

The sheet does not use one date format. `parseDate` accepts:

| Example | Precision | Sort key |
| --- | --- | --- |
| `11/1/95` | day | 1 November 1995 (`M/D/YY`, two-digit years) |
| `4/2/96` | day | 2 April 1996 |
| `March 1996` | month | first of the month |
| `March 2, 1996` | day | 2 March 1996 |
| `June 04, 2001` | day | 4 June 2001 |
| `October 4 2001` | day | 4 October 2001 (no comma) |
| `September 13-14, 2001` | range | start day `13` |

Two-digit years: `00`–`49` → `2000`–`2049`; `50`–`99` → `1950`–`1999`. That maps this archive’s `95` → `1995` and `00`/`01` → `2000`/`2001`.

Unrecognised dates keep the original label and sort last. The parser does not rewrite the CSV. Known editorial issues (a date that disagrees with the narrative, typos in keywords) stay in the sheet until editors fix them.

Display labels use day-month-year (`2 March 1996`), which is the usual form in Nepali and British English archives.

## Metadata

Keywords and Category are split on commas; Organizations are split on semicolons so names can still contain commas. Values are trimmed and de-duplicated case-insensitively. Filter dropdowns hide themselves when a column has no values. Category and Organizations now have values, so those filters appear alongside keyword pills.

The filter bar shows the **16** most frequent keywords (`KEYWORD_CLOUD_LIMIT` in `src/lib/parseTags.ts`). The current sheet has about **502** unique keywords; the rest still appear on event cards.

Search (`?q=`) is case-insensitive and matches **Detail**, the display date label, the year, and every tag field. Typeahead suggestions come from an in-memory index of those tags, years, and narrative tokens of four or more letters. Picking a suggestion fills `q` only; it does not set `tag` or `year`.

## Event identifiers

Each loaded row gets an id:

```
row-<csvIndex>-<sortKey>
```

`csvIndex` is the 0-based index in PapaParse’s `data` array (invalid rows still occupy an index). `sortKey` is `YYYYMMDD` from `parseDate` (unknown dates use `99991231`).

The permalink on each card is:

```
https://<origin><pathname>#event-row-<csvIndex>-<sortKey>
```

That URL **does not include** `?q=` / `?tag=` filters, so the event remains visible when the link is opened.

**Ids move if the CSV is edited.** Inserting, deleting, or reordering rows changes `csvIndex` for everything after the change. Correcting a Date cell changes `sortKey`. Either change breaks previously copied card links. Prefer appending new events and fixing dates only when the displayed date was wrong; if you must insert rows, say so in the pull request so maintainers know permalinks will shift.

HTML ids are prefixed with `event-` so they cannot collide with year section ids (`year-2001`, `year-undated`).

## Refreshing the CSV from Google Sheets

1. Open the master spreadsheet.
2. **File → Download → Comma Separated Values (.csv)**.
3. Replace `public/data/mastersheet.csv` (the runtime file). Optionally also replace `public/data/mastersheet_with_sources.csv` if Sources / Confidence changed.
4. Run `npm test` and `npm run dev`, then commit the CSV if the parse still looks right.

If Sheets later adds an official published-CSV link, set `VITE_DATA_URL` to that URL. Keep a committed CSV fallback until the live URL is treated as reliable.

## License and provenance

The application code is MIT licensed. The event texts are compiled research. Do not assume they are MIT. Record the sheet’s source, editors, and any agreed data license here when maintainers confirm it.
