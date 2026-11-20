# Nepal Conflict Timeline

An interactive, mobile-first digital archive of Nepal's internal armed conflict (1 November 1995 - 8 September 2025). The timeline is intended for transitional justice civil society: a chronological card explorer of events, filterable metadata, and a year-density navigator. Dataset spans 1995 (Operation Romeo) to 8 September 2025, 2112 events.

This is an open-source project. Event data currently ships as a static CSV exported from a Google Sheet.

## Features

- Chronological card explorer grouped by year and month
- Event cards with a calendar date stack, a clamped narrative teaser (expand in place), and metadata pills
- Expanded cards show Sources & confidence, a copyable citation, plus victims / alleged perpetrators / related events when the sheet provides them (forward-compatible optional columns)
- Reading toolbar: System → Light → Dark, Default → Large → Larger text, high contrast, and Reduce graphic detail blur (persisted, unblurs on expand/hover)
- Per-card permalink (link icon copies `#event-…`; a toast confirms; the feed does not jump)
- Side year navigator with a month-density heatmap; click, drag, or arrow-key scrub (the mobile density strip is a real slider)
- Theme chips grouped by taxonomy facet (Action, Policy, Actors, Institutions, Transitional justice, Parties, Regions) with search, confidence filter, and shareable URL filters (`?q=&tag=&year=&confidence=`), all inside the Filters drawer
- Multi-select categories/organizations/themes/districts (OR within, AND across; optional `?match=all` for AND-within), date range (`from`/`to` YYYY-MM), sort (oldest/newest/by category), density toggle, saved views, and export — all behind one Filters toggle so the timeline leads; search-match stepping (next/previous with position announced) walks through hits
- District view (inferred from keywords/detail — 75 legacy districts, top-8 ranking with counts, inside the Filters drawer), per-year share pages (`/year/YYYY/` with year meta + sitemap), filtered CSV/JSON export (incl. enrichment columns)
- Offline mirror `dist/data/events.json` (raw row mirror, generated at build) doubles as a CSV-fetch fallback for field use; enrichment columns + `docs/CHANGELOG.md`
- Typeahead covers Event_IDs (`NCT-…` jumps to one card), districts, tags, years, terms; `data:lint` reports district keyword coverage (~57%)
- Archive overview: event counts, source coverage, confidence split, and a per-year histogram that jumps to a year
- Light, dark, system appearance, text size, and high contrast, remembered in the browser
- Share control (Web Share on supported devices, copy-link fallback)
- Open Graph / Twitter preview cards, JSON-LD, robots.txt, and sitemap
- Mobile-first layout with a bottom year dock (density strip + year chips) on small screens
- Accessibility target: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) Level AA
- Anonymous usage analytics via Google Tag Manager (production only, skipped with Do Not Track; raw search text is never sent — see [`docs/ANALYTICS.md`](docs/ANALYTICS.md))
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
npm test        # parsers, filters, search, permalinks, reading prefs, teasers, provenance
npm run data:lint # CSV structure, keyword variants, org cells, confidence coverage, doc-claim assertions
npm run link:check # Sources URL health (report only; --strict fails on dead links)
npm run build   # typecheck + production bundle (year pages + events.json)
npm run smoke:dist # verify dist artifacts (year pages, sitemap, events.json)
npm run preview # serve the production build locally
npm run lint    # oxlint
```

Copy [`.env.example`](.env.example) to `.env` only if you need `VITE_DATA_URL` or a local `VITE_SITE_URL`. Neither is required for `npm run dev`.

## Data

The runtime dataset is [`public/data/mastersheet.csv`](public/data/mastersheet.csv). See [DATA.md](DATA.md) for the column schema, date formats, event IDs (used in permalinks), and how to refresh the file from Google Sheets.

The current sheet has **2112 events** with a stable `Event_ID` (`NCT-0001` … `NCT-2112`; Romeo is `NCT-0001`). Card permalinks are `#event-NCT-0001`. Keywords, Category, and Organizations are populated (Category on every row; Organizations on about 900). Search, keyword pills, category, organization, and confidence filters, typeahead, and the year navigator all work against this data. The filter bar shows controlled themes from `taxonomy/keyword-taxonomy.csv` (124 visible, grouped by facet); unmapped and zero-hit terms stay out of the UI. An archival CSV with Sources and Confidence is at [`public/data/mastersheet_with_sources.csv`](public/data/mastersheet_with_sources.csv); the app parses those columns when present. Schema: [`docs/EVENT_SCHEMA.md`](docs/EVENT_SCHEMA.md); taxonomy notes: [`docs/TAXONOMY.md`](docs/TAXONOMY.md).

## Architecture

```
public/data/mastersheet.csv  →  one fetch (localStorage + If-None-Match; events.json fallback offline)
                             →  PapaParse in batches of 80
                             →  parseDate / parseTags / provenance / enrichment / Event_ID
                             →  chronological ConflictEvent[]
                             →  indexed filter (no re-parse on keystroke)
                             →  windowed ChronologyExplorer
```

There is no backend and no React Router. The product is a single page so it can later be wrapped with Capacitor without a routing rewrite. Fetch URLs are relative (`import.meta.env.BASE_URL`) on purpose.

The header paints before the CSV is parsed. Rows are published in batches so the first events appear without waiting for the full sheet. A `localStorage` copy plus `If-None-Match` avoids a second download when the file is unchanged, and the page only starts one fetch (falling back to `data/events.json` offline). The feed mounts a window of rows around the scroll position (custom windowing, no list library) so 2,000 cards are not in the DOM at once. Search is debounced and matched against an index built once per event (`Event_ID`, date, detail, keywords, category, organizations, perpetrators, districts).

### Source map

| Path | Role |
| --- | --- |
| [`src/lib/loadEvents.ts`](src/lib/loadEvents.ts) | One CSV fetch (events.json fallback), local cache, batched PapaParse |
| [`src/lib/parseDate.ts`](src/lib/parseDate.ts) | Normalize mixed date strings; `M/D/YY` in, `2 March 1996` out |
| [`src/lib/parseTags.ts`](src/lib/parseTags.ts) | Split metadata fields into filterable tags (canonicalized) |
| [`src/lib/provenance.ts`](src/lib/provenance.ts) | Parse `Sources` + `Confidence` |
| [`src/lib/enrichment.ts`](src/lib/enrichment.ts) | Parse optional `District`/victims/perpetrator/related columns |
| [`src/lib/districts.ts`](src/lib/districts.ts) | District gazetteer + aliases + provinces |
| [`src/lib/eventGeography.ts`](src/lib/eventGeography.ts) | Infer districts (explicit override wins) |
| [`src/lib/filterEvents.ts`](src/lib/filterEvents.ts) | Search (narrative, date, year, tags, districts), multi-facets, sort, range, `normalizeFilters` |
| [`src/lib/searchSuggest.ts`](src/lib/searchSuggest.ts) | In-memory typeahead index: Event_ID, district, tag, year, term (no search server) |
| [`src/lib/eventCardTeaser.ts`](src/lib/eventCardTeaser.ts) | Collapsed card: line/tag limits |
| [`src/lib/urlState.ts`](src/lib/urlState.ts) | `?q=&tag=&category=&org=&district=&confidence=&sort=&match=&from=&to=&year=` (filters) plus preserved `#hash` |
| [`src/lib/eventAnchor.ts`](src/lib/eventAnchor.ts) | Card element ids and filter-free permalinks |
| [`src/lib/highlight.ts`](src/lib/highlight.ts) | Split search hits for `<mark>` (plain text only) |
| [`src/lib/appearance.ts`](src/lib/appearance.ts) | Light / dark / system preference |
| [`src/lib/reading.ts`](src/lib/reading.ts) | Text size, high contrast, and graphic-detail blur preferences |
| [`src/lib/savedViews.ts`](src/lib/savedViews.ts) | Browser-local saved views (legacy shapes normalized) |
| [`src/lib/exportView.ts`](src/lib/exportView.ts) | Filtered CSV/JSON download |
| [`src/lib/matchNav.ts`](src/lib/matchNav.ts) | Next/previous search-match cycling index |
| [`src/lib/toast.ts`](src/lib/toast.ts) | Copy/share status messages |
| [`src/lib/seo.ts`](src/lib/seo.ts) | Document title, share text, filtered share URL |
| [`src/lib/analytics.ts`](src/lib/analytics.ts) | GTM dataLayer events; container spec in `docs/ANALYTICS.md` |
| [`src/lib/site.ts`](src/lib/site.ts) | Site name, description, `%SITE_URL%` substitution |
| [`src/components/ChronologyExplorer.tsx`](src/components/ChronologyExplorer.tsx) | Year-grouped feed + dock/rail |
| [`src/components/ArchiveOverview.tsx`](src/components/ArchiveOverview.tsx) | Collection stats + per-year histogram |
| [`src/components/DistrictOverview.tsx`](src/components/DistrictOverview.tsx) | Inferred-district ranking + filter |
| [`src/components/TimelineFeed.tsx`](src/components/TimelineFeed.tsx) | Windowed cards on a year spine |
| [`src/components/EventCard.tsx`](src/components/EventCard.tsx) | Teaser card, expand, permalink |
| [`src/components/YearNavigator.tsx`](src/components/YearNavigator.tsx) | Jump-to-year density rail or mobile dock (scrub strip + year chips) |
| [`src/components/YearCue.tsx`](src/components/YearCue.tsx) | Brief year overlay while scrolling or scrubbing |
| [`src/components/ScrollFade.tsx`](src/components/ScrollFade.tsx) | Edge fade when a horizontal scroller can still move |
| [`src/lib/scrollOverflow.ts`](src/lib/scrollOverflow.ts) | Start/end overflow flags for those fades |
| [`src/components/FilterBar.tsx`](src/components/FilterBar.tsx) | Sticky search row + Filters toggle; drawer holds facet-grouped themes, facets, districts, range, sort, saved views, export; publishes `--filter-h` |
| [`src/components/KeywordFacets.tsx`](src/components/KeywordFacets.tsx) | Theme chips grouped by taxonomy facet, with search |
| [`src/lib/keywordTaxonomy.ts`](src/lib/keywordTaxonomy.ts) | Visible/facet helpers over the generated taxonomy |
| [`taxonomy/keyword-taxonomy.csv`](taxonomy/keyword-taxonomy.csv) | Controlled keyword vocabulary: Term, Aliases, Facet, Status, Comment |
| [`scripts/keyword-taxonomy.mjs`](scripts/keyword-taxonomy.mjs) | Compiles the taxonomy CSV to `keywordTaxonomy.generated.ts` (runs in build; `data:lint` asserts sync) |
| [`scripts/data-lint.mjs`](scripts/data-lint.mjs) | CSV structure checks + doc-claim assertions (`npm run data:lint`) |
| [`scripts/link-check.mjs`](scripts/link-check.mjs) | Sources URL health check (`npm run link:check`) |
| [`scripts/factcheck-candidates.mjs`](scripts/factcheck-candidates.mjs) | Figure-claim review queue seeding |
| [`scripts/year-pages.mjs`](scripts/year-pages.mjs) | Per-year share pages + sitemap entries (runs in build) |
| [`scripts/events-json.mjs`](scripts/events-json.mjs) | Offline `dist/data/events.json` mirror (runs in build) |
| [`scripts/smoke-dist.mjs`](scripts/smoke-dist.mjs) | Post-build dist verification (`npm run smoke:dist`) |
| [`docs/FACTCHECK.md`](docs/FACTCHECK.md) | Fact-check log: link results, known issues, review queue |
| [`docs/TAXONOMY.md`](docs/TAXONOMY.md) | Keyword taxonomy notes |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Release history |
| [`src/components/SearchSuggest.tsx`](src/components/SearchSuggest.tsx) | Combobox typeahead for search |
| [`src/components/ReadingControls.tsx`](src/components/ReadingControls.tsx) | Text size, high contrast, graphic-detail blur |
| [`src/components/ShareButton.tsx`](src/components/ShareButton.tsx) | Share current view |
| [`src/components/ThemeToggle.tsx`](src/components/ThemeToggle.tsx) | System / light / dark |
| [`src/components/Toast.tsx`](src/components/Toast.tsx) | Viewport copy confirmation |
| [`src/index.css`](src/index.css) | Colour tokens, self-hosted type, dark class, layout CSS variables |
| [`vite.site-url.ts`](vite.site-url.ts) | Replaces `%SITE_URL%` in HTML, robots.txt, sitemap |
| [`index.html`](index.html) | Static meta, Open Graph, JSON-LD, appearance boot script |

### Layout

The page leads with the timeline. The sticky bar holds only search, result count, match stepping, active filter pills, and one **Filters** toggle — everything else (themes, facets, district ranking, date range, sort, saved views, export) lives in the drawer, which opens below the bar and caps at 70% of viewport height.

On viewports **narrower than `lg` (1024px)** the year navigator is a fixed bottom **dock**: a full-span density strip (tap, drag, or arrow-key scrub — it is a real `slider`) plus a horizontal year list. The list fades at the edges when there is more to scroll. Cards and the footer use `--dock-h` (measured from the dock) so content can scroll above it. On **`lg` and up** the navigator is a sticky **rail** on the right; the dock is not shown.

It writes `--filter-h` so skip-link targets and card permalinks sit below the sticky bar, including while the drawer is open (height is re-measured). Year headings stay with their section and scroll away with the feed. While you scroll the timeline or scrub years, a large year overlay appears for a moment and then fades (similar to a photos year scrubber). The dock or rail keeps marking the year in view. An active filter stays visible as a pill (activate it again to clear). Event cards start as a teaser (compact date badge, three lines with a fade, and three tags on narrow screens; date stack, four lines, and five tags from `sm` / 640px) and expand in place, with a second “Show less” at the end of long expanded content.

## URL state

The address bar is the only “route”. Query parameters describe the **current view**. The fragment describes a **single card**.

| Piece | Example | Purpose |
| --- | --- | --- |
| `q` | `?q=Rolpa` | Search in narrative, date label, year, and tags. Typeahead fills `q`; it does not set `tag` or `year`. |
| `tag` | `?tag=Maoist,killing` | Keywords (OR within, AND across facets). Repeat `?tag=a&tag=b` also works; legacy single still loads. |
| `category` | `?category=combat` | Categories (OR within, multi-select). |
| `org` | `?org=Nepal+Army` | Organizations (OR within, multi-select). |
| `district` | `?district=Rolpa,Kathmandu` | Districts inferred from keywords/detail (OR within). See `src/lib/districts.ts`, `src/lib/eventGeography.ts`. |
| `confidence` | `?confidence=high` | `high`/`medium`/`low`. |
| `sort` | `?sort=reverse` | `reverse`/`category` (`chronological` default omitted). |
| `match` | `?match=all` | Within-facet `all` (AND) vs default `any` (OR). |
| `from`/`to` | `?from=2001-06&to=2002-03` | Inclusive `YYYY-MM` range; undated excluded while active. |
| `year` | `?year=2001` | Scroll the feed to that year on load |
| hash | `#event-NCT-0001` | Scroll to one card after the CSV loads. Romeo is `NCT-0001`. |

Filter changes use `history.replaceState` and **keep** an existing hash. Search is debounced (200ms) before it is written to the URL and applied to the list. The list filters an in-memory index; it does not parse the CSV again.

Two different copy actions:

- **Share** (header) copies or native-shares the **current view**, including `?q=&tag=&category=&org=&confidence=&sort=&from=&to=&year=`.
- **Card link icon** copies a **permalink** of `origin + pathname + #event-…` with **no query string**, so filters cannot hide the event when someone opens the link later.

Card hashes are `event-` plus the CSV `Event_ID`. They stay put when rows are inserted, as long as that id is not reused. See [DATA.md](DATA.md#event-identifiers).

Opening `#event-…` (including a pasted permalink) waits until that `Event_ID` has been parsed, then scrolls the card into view below the sticky search and outlines it (`:target`). The rest of the feed stays windowed. Clicking the card’s link icon copies that permalink and does **not** scroll. A `?year=` jump is skipped when a card hash is present, so the two do not fight.

## Appearance

The header **Reading and display** toolbar cycles **System → Light → Dark**, **Default → Large → Larger** text, and a high-contrast palette. Choices are stored as `localStorage.appearance`, `text-size`, and `contrast`. A blocking script in [`index.html`](index.html) applies the classes **before React loads**, so a system-dark or larger-text visitor does not flash the default palette. `color-scheme` and `theme-color` follow the resolved colours so scrollbars and the browser chrome match.

Native form controls pick up `color-scheme`. Tokens live in [`src/index.css`](src/index.css) (`--paper`, `--ink`, `--muted`, `--crimson`, `--surface`, and chip colours). Light vermillion is `#8b1e12` on paper `#f3eee4` (text contrast above 7:1); dark mode uses `#ffb59a` on `#13110f`. Titles, years, and date stacks use **Fraunces**; UI chrome and shorter event notes use **Source Sans 3**; long narratives use **Source Serif 4**. All three are self-hosted from Fontsource (OFL, Latin and Latin-extended) so the page never calls `fonts.googleapis.com`. Devanagari falls back to the system UI font. Short notes stay compact; longer Detail text gets more measure, serif type, and a vermillion rule. Search hits are wrapped in `<mark>` as React text nodes, not as HTML from the CSV. Permalink and view-share confirmations use a short toast. Motion is limited to colour and a year label fade, and `prefers-reduced-motion` collapses it.

## Sharing and SEO

Social crawlers read the **static** tags in `index.html`; they do not execute the React app. A filtered URL such as `?year=2001&tag=Maoist` therefore still unfurls the homepage card ([`public/og-image.png`](public/og-image.png), 1200×630). The in-page **Share** button is what passes the filtered URL to a person. `document.title` does update with filters, which helps bookmarks and the share sheet.

`%SITE_URL%` in `index.html`, [`public/robots.txt`](public/robots.txt), and [`public/sitemap.xml`](public/sitemap.xml) is replaced at build time (see `VITE_SITE_URL`). Until that is set, the placeholder is `https://YOUR-GITHUB-USERNAME.github.io/conflict_timeline`.

Because this is a GitHub Pages *project* site, `robots.txt` lives at `/conflict_timeline/robots.txt`, not at the domain root. The sitemap is also linked from the page head.

To preview tags locally:

```bash
VITE_SITE_URL=https://YOUR-GITHUB-USERNAME.github.io/conflict_timeline npm run build
npm run preview
```

JSON-LD describes a `WebSite` and a `Dataset` with `temporalCoverage` `1995/2025` and `spatialCoverage` Nepal. Event texts are **not** marked MIT in that markup. Uncomment `twitter:site` in `index.html` when the project has an official account.

## Accessibility

The target is WCAG 2.2 Level AA. Practical choices in this codebase:

- Colour tokens chosen for body and UI contrast; `prefers-contrast: more` or the high-contrast control darkens (or, in dark mode, lightens) muted line/control colours. If the operating system already requests more contrast, the in-page toggle will look unchanged.
- Text size control (112.5% / 125% root font-size); browser zoom still works independently
- Skip links to search, year navigation, and events
- Heading order: `h1` site title → `h2` year → `h3` month (when several months) → `h3`/`h4` event date
- Year navigator is **first in the grid DOM** on large screens (`lg:col-start-2`) so “skip to years” and tab order reach it before the long feed
- `aria-pressed` / `aria-current` on filters and the active year; live `role="status"` for result counts and copy/share toasts
- Controls are at least 44×44px; `viewport-fit=cover` and safe-area insets on the sticky chrome
- `prefers-reduced-motion` disables smooth scrolling and CSS animation; `prefers-reduced-transparency` removes backdrop blur
- `-webkit-text-size-adjust: auto` so iOS accessibility text sizes are not locked

## GitHub Pages

[`vite.config.ts`](vite.config.ts) sets `base: '/conflict_timeline/'`, which matches a project site at:

`https://<user>.github.io/conflict_timeline/`

1. Push this repository to GitHub (default branch `main`).
2. In the repo: **Settings → Pages → Source → GitHub Actions**.
3. The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds, tests, and deploys `dist/` on each push to `main`.

If the GitHub repository name is not `conflict_timeline`, change `base` in `vite.config.ts` to `/<repo-name>/`.

The deploy workflow sets `VITE_SITE_URL` to `https://<user>.github.io/<repo>` so sitemap, robots.txt, and social preview tags use the real origin. Override it with a repository variable named `SITE_URL` if you later attach a custom domain.

## Capacitor later

Keep these constraints when adding a native shell:

- Continue loading data with relative URLs or `VITE_DATA_URL`
- Do not introduce a required backend
- Fonts are bundled (Fraunces / Source Sans 3 / Source Serif 4); the WebView does not need `fonts.google.com`
- Clipboard permalinks and `navigator.share` need a secure context (HTTPS or localhost)

## Status and roadmap

Implemented: chronological explorer with windowed feed, multi-select filters behind one toggle (keywords, categories, organizations, inferred districts, confidence, `?match=all`, YYYY-MM range, sort, density), search with typeahead + next/previous match stepping, saved views, CSV/JSON export, per-year share pages, offline `events.json` with CSV-fetch fallback, Sources/Confidence provenance with citation copy, trauma-informed blur toggle, print stylesheet, and a fact-check pipeline (`data:lint` doc-claim assertions, `link:check`, `FACTCHECK.md` review queue). See [`docs/CHANGELOG.md`](docs/CHANGELOG.md) for history.

Deferred — each needs a human decision, not more code:

| Item | Blocked on |
| --- | --- |
| True district choropleth | A geojson source + license decision; the inferred ranking is the honest interim |
| Nepali UI / `Lang_NE` column | Translations + review workflow |
| Per-year PNG unfurls | A design asset (year pages already give crawlers year-specific meta) |
| Sheet fixes (NCT-0002 split, org commas, `other` audit, district/victim columns) | Editor sign-off in the Sheet, then re-export — see [`docs/FACTCHECK.md`](docs/FACTCHECK.md) |
| Data license confirmation | Maintainer sign-off; event texts are not MIT until then |
| Full service worker | Deliberately not built: untestable here and risky on a Pages project path; the JSON fallback covers field use |

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md). This archive describes political violence, detention, disappearance, and related harm. Contributions should be accurate, restrained, and respectful of survivors.

## License

Application code is licensed under the [MIT License](LICENSE). Fraunces is © The Fraunces Project Authors. Source Sans 3 and Source Serif 4 are © Google Inc. / Adobe. All three are licensed under the [SIL Open Font License 1.1](https://scripts.sil.org/OFL).

**Event narratives in the CSV are not automatically covered by that license.** Their provenance sits with the researchers and organizations who compiled the sheet. Do not republish the text under MIT until maintainers confirm the data license. See [DATA.md](DATA.md).
