# Data guide

The Nepal Conflict Timeline reads a CSV at runtime. There is no database server. Google Sheets remains the editorial workspace; the committed CSV is what the website actually loads.

## File location

| Environment | Source |
| --- | --- |
| Default | [`public/data/mastersheet.csv`](public/data/mastersheet.csv) (**2150** events) |
| Archive (not loaded) | [`public/data/mastersheet_with_sources.csv`](public/data/mastersheet_with_sources.csv) |
| Override | `VITE_DATA_URL` (see `.env.example`) |

`VITE_DATA_URL` is a documented hook for a later published Google Sheets CSV endpoint. This version does not fetch Sheets unless you set that variable at build time.

The fetch path is:

```ts
`${import.meta.env.BASE_URL}data/mastersheet.csv`
```

That form works in local Vite, GitHub Pages (`/conflict_timeline/`), and a future Capacitor WebView.

## Column schema

The shipped runtime CSV starts with a stable `Event_ID` (`NCT-0001` … `NCT-2150`). There is **no** leading blank column. The parser still ignores unnamed headers if an export includes one, and it ignores extra columns it does not map. Locked column notes: [`docs/EVENT_SCHEMA.md`](docs/EVENT_SCHEMA.md).

| Column | Type | Notes |
| --- | --- | --- |
| Event_ID | string | Required first column. Format `NCT-` + four-digit pad. Romeo (rich HRW row) is `NCT-0001`. Never reuse an id. Card permalinks use this value |
| Date | string | Mixed human formats; see below |
| Detail | string | Plain text event narrative. Rendered as text, never as HTML |
| Keywords | comma-separated string | Theme tags; about **502** unique values in the current sheet |
| Category | comma-separated string | Populated on every row (**13** values: `civil_society`, `combat`, `detention`, `disappearance`, `displacement`, `killing`, `media`, `other`, `peace_process`, `policy`, `protest`, `sexual_violence`, `transitional_justice`) |
| Organizations | semicolon-separated string | Populated on **899** of **2150** rows (**79** unique values); commas inside organization names are preserved |

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

Search (`?q=`) is case-insensitive and matches **Event_ID**, **Detail**, the raw date, the display date label, the year, and every tag field. The index is built once per loaded event. Typeahead suggestions come from an in-memory index of those tags, years, and narrative tokens of four or more letters. Picking a suggestion fills `q` only; it does not set `tag` or `year`.

## Event identifiers

Each CSV row has a stable `Event_ID` (`NCT-0001` … `NCT-2150`), minted in chronological order. The loaded event’s `id` **is** that value. Romeo (Operation Romeo, November 1995) is `NCT-0001`.

The permalink on each card is:

```
https://<origin><pathname>#event-NCT-0001
```

The `event-` prefix keeps the fragment distinct from year sections (`year-2001`, `year-undated`). That URL **does not include** `?q=` / `?tag=` filters, so the event remains visible when the link is opened.

If the same `Event_ID` appears twice, the parser keeps the first row and skips the rest with a console warning. It does not merge the narratives.

Do not reuse an `Event_ID`. Append new events with the next id. Inserting a row no longer rewrites other permalinks, because links follow `Event_ID` rather than the row index.

## Refreshing the CSV from Google Sheets

1. Open the master spreadsheet.
2. **File → Download → Comma Separated Values (.csv)**.
3. Replace `public/data/mastersheet.csv` (the runtime file) with a **clean** export: `Event_ID` first, **no** leading blank column. Optionally also replace `public/data/mastersheet_with_sources.csv` if Sources / Confidence changed. Do not reuse Event_IDs.
4. Run `npm test` and `npm run dev`, then commit the CSV if the parse still looks right.

If Sheets later adds an official published-CSV link, set `VITE_DATA_URL` to that URL. Keep a committed CSV fallback until the live URL is treated as reliable.

## License and provenance

The application code is MIT licensed. The event texts are compiled research. Do not assume they are MIT. Record the sheet’s source, editors, and any agreed data license here when maintainers confirm it.
