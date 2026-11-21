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
   - Keywords tab → `VITE_TAXONOMY_CSV_URL`
3. The next push to `main` wires the variables in
   (`.github/workflows/deploy.yml` passes both through).
   Unset/empty variables use the committed CSVs — nothing else changes.
4. If the Sheet is unreachable at runtime, or the live taxonomy is
   invalid, the app shows an error screen with a retry button — it never
   renders stale committed data. Both tabs are fetched fresh on every load
   (no cache of any kind).
5. Timing: Google generates the export a few minutes behind Sheet edits —
   allow ~5 minutes, then refresh. No rebuild is ever needed for content
   edits; only code changes require a deploy.

## Syncing back to the repo

Periodically (**File → Download → CSV** per tab):

- Events tab → `public/data/mastersheet_with_sources.csv`; slim runtime
  file `public/data/mastersheet.csv` is the first 6 columns
  (`Event_ID,Date,Detail,Keywords,Category,Organizations`).
- Keywords tab → `taxonomy/keyword-taxonomy.csv` (keep header order).
- Then `npm test && npm run data:lint` must pass before committing.
