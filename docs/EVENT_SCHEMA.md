# Official Event Schema — LOCKED v1.1

Target columns (user format + swarm requirements):

| Column | Required | Notes |
|--------|----------|-------|
| Event_ID | yes | Stable id `NCT-0001` …; first column; never reuse; mint in chronological order |
| Date | yes | Keep source date text; add ISO only when day is certain |
| Detail | yes | Factual; no invention |
| Keywords | no | Comma-separated |
| Category | no | Only if supported; else blank |
| Organizations | no | Only if supported; else blank |
| Sources | yes | Citation (+ URL if known) — project rule |
| Confidence | yes | high / medium / low + brief rationale — project rule |

The GitHub Pages app loads the slim CSV at [`public/data/mastersheet.csv`](../public/data/mastersheet.csv) (`Event_ID` through `Organizations` only). The full schema, including `Sources` and `Confidence`, is in [`public/data/mastersheet_with_sources.csv`](../public/data/mastersheet_with_sources.csv). The live parser uses `Event_ID` for card permalinks (`#event-NCT-0001`).

Machine-readable copy: [`event_schema.json`](event_schema.json). Runtime column notes for this repo: [`DATA.md`](../DATA.md).
