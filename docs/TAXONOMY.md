# Keyword taxonomy — canonical map (v1)

Parse-time only. The CSV is not rewritten; `canonicalKeyword()` in
`src/lib/parseTags.ts` maps variants to a canonical display form so filters merge.

Current sheet: ~500 unique keywords after canonicalization (was 502 raw),
277 single-use. Top 16 shown in the filter bar.

## Alias rules

- Collapse whitespace, strip trailing `./:;`, de-duplicate case-insensitively.
- `Maoist/`, `Maoist.` → `Maoist`; `Nepal police` → `police`.
- `Armed Police Force` → `APF`; `CPN-Maoist`, `Unified CPN-Maoist`, `UCPN-M`,
  `CPN-UML`, `Nepali Congress`, `TRC`, `CIEDP`, `YCL` keep their canonical casings.

## Known quality issues (from `npm run data:lint`)

- 272 `Organizations` cells use commas without semicolons
  (e.g. `Royal Nepal Army, Nepal Army`). Parser falls back to comma-split
  when no `;` is present; comma-bearing official names must keep using `;`.
- 277 single-use keywords — candidates for merging or back-filling in the Sheet.
- `other` category holds 443 rows — audit for `abduction`/`torture` splits.

## Next steps

1. Curate single-use keywords in the Sheet (merge synonyms, fix typos).
2. Convert legacy comma-separated `Organizations` to `;`-separated.
3. Decide whether faction labels (`CPN-Maoist` vs `Maoist` vs `UCPN-M`)
   should stay distinct for research or merge for browsing.
