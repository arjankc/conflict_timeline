# Google Sheets workspace

`NepalConflictTimeline.xlsx` is the **one-time bootstrap snapshot** for the
editorial Google Sheet. Upload it once (**Drive → New → File upload**, then
*Open with Google Sheets*); the Sheet becomes the living source afterwards.

The committed CSVs stay the repo source of truth and the offline fallback:
`public/data/mastersheet*.csv`, `taxonomy/keyword-taxonomy.csv`.

## Tabs

- **Events** — 2,112 rows (`NCT-0001`…`NCT-2112`, 1 Nov 1995 – 8 Sept 2025).
  Full archival columns plus empty enrichment columns (`District`,
  `Victims_Killed/Injured/Disappeared`, `Perpetrator_Alleged`,
  `Related_Events`) ready for editors to fill. `Event_ID` and `Date` are
  formatted as plain text so Sheets never coerces them.
- **Keywords** — 408 controlled-vocabulary rows (`Term`, `Aliases`,
  `Facet`, `Status`, `Comment`). `Status` and `Facet` have dropdown
  validation. See `docs/TAXONOMY.md` for what each status means.
- **ReadMe** — the same instructions, inside the workbook for editors.

## Going live

1. **Share** the spreadsheet as *Anyone with the link can view*.
2. Copy the per-tab CSV export links and save them as repository variables
   (**Settings → Variables → Actions**):
   `https://docs.google.com/spreadsheets/d/<KEY>/export?format=csv&gid=<TAB>`
   - Events tab → `VITE_DATA_URL`
   - Keywords tab → `TAXONOMY_CSV_URL`
3. The next push to `main` rebuilds the app from the Sheet
   (`.github/workflows/deploy.yml` passes both variables through).
   Unset/empty variables build from the committed CSVs — nothing else changes.
4. If the Sheet is unreachable at runtime, the app falls back to the
   committed offline mirror (`dist/data/events.json`); taxonomy always
   ships the last generated build.

## Syncing back to the repo

Periodically (**File → Download → CSV** per tab):

- Events tab → `public/data/mastersheet_with_sources.csv`; slim runtime
  file `public/data/mastersheet.csv` is the first 6 columns
  (`Event_ID,Date,Detail,Keywords,Category,Organizations`).
- Keywords tab → `taxonomy/keyword-taxonomy.csv` (keep header order).
- Then `npm test && npm run data:lint` must pass before committing.
