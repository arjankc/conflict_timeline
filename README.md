# Nepal Conflict Timeline

An interactive, mobile-first digital archive of Nepal's internal armed conflict (1996–2006). The timeline is intended for transitional justice civil society: a chronological newsfeed of events, filterable metadata, and a simple yearly overview.

This is an open-source project. Event data currently ships as a static CSV exported from a Google Sheet.

## Features

- Chronological, vertically scrolling event feed
- Event cards with a prominent date, narrative detail, and metadata pills
- Sticky search across event descriptions
- Filters for category, organization, and keyword (pill click)
- Accessible yearly bar chart of event counts
- GitHub Pages deployment with Vite `base` set to `/conflict_timeline/`

## Requirements

- Node.js 20 or later
- npm 10 or later

## Local development

```bash
npm install
npm run dev
```

The app is served by Vite. Open the printed local URL. Because the production `base` path is `/conflict_timeline/`, Vite still resolves it correctly in development.

```bash
npm test        # date parsing, CSV mapping, and filters
npm run build   # typecheck + production bundle
npm run preview # serve the production build locally
npm run lint    # oxlint
```

## Data

The runtime dataset is [`public/data/mastersheet.csv`](public/data/mastersheet.csv). See [DATA.md](DATA.md) for the column schema, date formats, and how to refresh the file from Google Sheets.

The current sheet has **52 events**. Category and Organizations columns are present but empty; Keywords are populated. Search, keyword pills, and the year chart all work against this data today. Category and organization filters appear once those columns have values.

## Architecture

```
public/data/mastersheet.csv  →  PapaParse  →  parseDate / parseTags
                                           →  chronological ConflictEvent[]
                                           →  FilterBar + YearOverview + TimelineFeed
```

| Path | Role |
| --- | --- |
| [`src/lib/loadEvents.ts`](src/lib/loadEvents.ts) | Fetch and parse CSV |
| [`src/lib/parseDate.ts`](src/lib/parseDate.ts) | Normalize mixed date strings |
| [`src/lib/parseTags.ts`](src/lib/parseTags.ts) | Split comma-separated metadata |
| [`src/lib/filterEvents.ts`](src/lib/filterEvents.ts) | Search and filter |
| [`src/components/TimelineFeed.tsx`](src/components/TimelineFeed.tsx) | Chronological card list |
| [`src/components/YearOverview.tsx`](src/components/YearOverview.tsx) | Events-per-year chart |

There is no backend and no React Router in this version. The product is a single page so it can later be wrapped with Capacitor without a routing rewrite. Fetch URLs are relative (`import.meta.env.BASE_URL`) on purpose.

List virtualization is not used yet. Add it if the sheet grows into the thousands of rows.

## GitHub Pages

[`vite.config.ts`](vite.config.ts) sets `base: '/conflict_timeline/'`, which matches a project site at:

`https://<user>.github.io/conflict_timeline/`

1. Push this repository to GitHub (default branch `main`).
2. In the repo: **Settings → Pages → Source → GitHub Actions**.
3. The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds, tests, and deploys `dist/` on each push to `main`.

If the GitHub repository name is not `conflict_timeline`, change `base` in `vite.config.ts` to `/<repo-name>/`.

## Capacitor later

Keep these constraints when adding a native shell:

- Continue loading data with relative URLs or `VITE_DATA_URL`
- Do not introduce a required backend
- Prefer system fonts (already in use) so the WebView does not depend on Google Fonts

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md). This archive describes political violence, detention, disappearance, and related harm. Contributions should be accurate, restrained, and respectful of survivors.

## License

Application code is licensed under the [MIT License](LICENSE).

**Event narratives in the CSV are not automatically covered by that license.** Their provenance sits with the researchers and organizations who compiled the sheet. Do not republish the text under MIT until maintainers confirm the data license. See [DATA.md](DATA.md).
