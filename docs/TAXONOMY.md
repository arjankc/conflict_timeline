# Keyword taxonomy — controlled vocabulary (v2)

Source of truth: [`taxonomy/keyword-taxonomy.csv`](../taxonomy/keyword-taxonomy.csv)
(soon: the published Google Sheet tab, same columns). The sheet is never
rewritten by code; `scripts/keyword-taxonomy.mjs` compiles the CSV to
`src/lib/keywordTaxonomy.generated.ts` (alias map, display names, facet
assignment, visible set) before `tsc`. `npm run data:lint` asserts the
generated file is in sync, every current keyword is covered, active terms all
occur, and the Districts facet matches the gazetteer.

## Columns

| Column | Role |
| --- | --- |
| Term | Recommended/canonical display (`UCPN-Maoist`, `Kavrepalanchok`) |
| Aliases | `;`-separated sheet variants that roll up (`UCPN-M; Unified CPN-Maoist`) |
| Facet | Action / Policy / Actors / Institutions / Transitional justice / Political parties and movements / Districts / Regions (blank = unclassified) |
| Status | `active` (renders) / `review` (renders, needs editor decision) / `pending` (hidden until mapped) / `zero-hit` (stored, never renders) |
| Comment | Editorial notes only — never read by code, never rendered |

## Statuses

- `active` — recommended term with data behind it (exact or safe alias).
- `review` — renders, but flagged for editors (faction merges like
  `UCPN-M` → `UCPN-Maoist`, display changes like `TRC` → full name,
  roll-ups like press → Media). Resolve to `active` or split; the Comment
  says what is open. `data:lint` lists the queue as warnings.
- `pending` — sheet vocabulary with no recommended mapping yet. Stays in the
  data (filtering via `?tag=`, old URLs, and CSV export keep working) but shows
  no pills, chips, counts, or suggestions until editors map it.
- `zero-hit` — recommended term (or glossary entry like `TADA`, `VDC`,
  `Mustang`) with no events. Stored so the vocabulary is complete; the UI
  only lists terms that occur, so these cannot render.

## Runtime behavior

- Parse: `parseTags()` maps every keyword through the alias table, so
  `UCPN-M` and `Unified CPN-Maoist` arrive as `UCPN-Maoist` everywhere
  (counts, filters, export).
- Display: Title Case with acronyms kept (`Police Crackdown`, `TRC`,
  `CPN-Maoist`); categories render spaces instead of underscores.
- Filter: selected keywords are canonicalized, so old URLs and saved views
  with legacy spellings still match.
- Search: alias variants are indexed, so `UCPN-M` still finds its events;
  typeahead suggests only visible themes.

## Known quality issues (from `npm run data:lint`)

- 272 `Organizations` cells use commas without semicolons
  (e.g. `Royal Nepal Army, Nepal Army`). Parser falls back to comma-split
  when no `;` is present; comma-bearing official names must keep using `;`.
- 14 taxonomy rows in `review` — see the lint warnings for the queue.
- `other` category holds 443 rows — audit for `abduction`/`torture` splits.

## Next steps (editors)

1. Resolve the 14 `review` rows in the Sheet (merge/keep/split + Comment).
2. Map high-frequency `pending` terms (`Killing` 555, `Clash` 265,
   `Transitional Justice` 199, `Abduction` 173, `YCL` 94 events).
3. Convert legacy comma-separated `Organizations` to `;`-separated.
