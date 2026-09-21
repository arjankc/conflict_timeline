# Nepal Conflict Timeline

An interactive, mobile-first digital archive of Nepal's internal armed conflict (1996–2006). The timeline is intended for transitional justice civil society: a chronological card explorer of events, filterable metadata, and a year-density navigator.

This is an open-source project. Event data currently ships as a static CSV exported from a Google Sheet.

## Features

- Chronological card explorer grouped by year and month
- Event cards with a calendar date stack, a clamped narrative teaser (expand in place), and metadata pills
- Per-card permalink (link icon copies `#event-…`; a toast confirms; the feed does not jump)
- Side year navigator with a month-density heatmap; click or drag to scrub
- Theme chips (most frequent 16) and search with typeahead, shareable URL filters (`?q=&tag=&year=`), and highlighted matches
- Light, dark, system appearance, text size, and high contrast, remembered in the browser
- Share control (Web Share on supported devices, copy-link fallback)
- Open Graph / Twitter preview cards, JSON-LD, robots.txt, and sitemap
- Mobile-first layout with a bottom year dock (density strip + year chips) on small screens
- Accessibility target: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) Level AA
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
npm test        # parsers, filters, search, permalinks, reading prefs, teasers
npm run build   # typecheck + production bundle
npm run preview # serve the production build locally
npm run lint    # oxlint
```

Copy [`.env.example`](.env.example) to `.env` only if you need `VITE_DATA_URL` or a local `VITE_SITE_URL`. Neither is required for `npm run dev`.

## Data

The runtime dataset is [`public/data/mastersheet.csv`](public/data/mastersheet.csv). See [DATA.md](DATA.md) for the column schema, date formats, event IDs (used in permalinks), and how to refresh the file from Google Sheets.

The current sheet has **2150 events** with a stable `Event_ID` (`NCT-0001` … `NCT-2150`; Romeo is `NCT-0001`). Card permalinks are `#event-NCT-0001`. Keywords, Category, and Organizations are populated (Category on every row; Organizations on about 900). Search, keyword pills, category and organization filters, typeahead, and the year navigator all work against this data. The filter bar shows the 16 most frequent keywords; the rest remain on event cards. An archival CSV with Sources and Confidence is at [`public/data/mastersheet_with_sources.csv`](public/data/mastersheet_with_sources.csv); the live app does not load it. Schema: [`docs/EVENT_SCHEMA.md`](docs/EVENT_SCHEMA.md).

## Architecture

```
public/data/mastersheet.csv  →  one fetch (localStorage + If-None-Match)
                             →  PapaParse in batches of 80
                             →  parseDate / parseTags / Event_ID
                             →  chronological ConflictEvent[]
                             →  indexed filter (no re-parse on keystroke)
                             →  windowed ChronologyExplorer
```

There is no backend and no React Router. The product is a single page so it can later be wrapped with Capacitor without a routing rewrite. Fetch URLs are relative (`import.meta.env.BASE_URL`) on purpose.

The header paints before the CSV is parsed. Rows are published in batches so the first events appear without waiting for the full sheet. A `localStorage` copy plus `If-None-Match` avoids a second download when the file is unchanged, and the page only starts one fetch. The feed mounts a window of rows around the scroll position (custom windowing, no list library) so 2,000 cards are not in the DOM at once. Search is debounced and matched against an index built once per event (`Event_ID`, date, detail, keywords, category, organizations).

### Source map

| Path | Role |
| --- | --- |
| [`src/lib/loadEvents.ts`](src/lib/loadEvents.ts) | One CSV fetch, local cache, batched PapaParse |
| [`src/lib/parseDate.ts`](src/lib/parseDate.ts) | Normalize mixed date strings; `M/D/YY` in, `2 March 1996` out |
| [`src/lib/parseTags.ts`](src/lib/parseTags.ts) | Split metadata fields into filterable tags |
| [`src/lib/filterEvents.ts`](src/lib/filterEvents.ts) | Search (narrative, date, year, tags), filters, year/month grouping |
| [`src/lib/searchSuggest.ts`](src/lib/searchSuggest.ts) | In-memory typeahead index (no search server) |
| [`src/lib/eventCardTeaser.ts`](src/lib/eventCardTeaser.ts) | Collapsed card: line/tag limits |
| [`src/lib/urlState.ts`](src/lib/urlState.ts) | `?q=&tag=&year=` (filters) plus preserved `#hash` |
| [`src/lib/eventAnchor.ts`](src/lib/eventAnchor.ts) | Card element ids and filter-free permalinks |
| [`src/lib/highlight.ts`](src/lib/highlight.ts) | Split search hits for `<mark>` (plain text only) |
| [`src/lib/appearance.ts`](src/lib/appearance.ts) | Light / dark / system preference |
| [`src/lib/reading.ts`](src/lib/reading.ts) | Text size and high-contrast preference |
| [`src/lib/toast.ts`](src/lib/toast.ts) | Copy/share status messages |
| [`src/lib/seo.ts`](src/lib/seo.ts) | Document title, share text, filtered share URL |
| [`src/lib/site.ts`](src/lib/site.ts) | Site name, description, `%SITE_URL%` substitution |
| [`src/components/ChronologyExplorer.tsx`](src/components/ChronologyExplorer.tsx) | Year-grouped feed + dock/rail |
| [`src/components/TimelineFeed.tsx`](src/components/TimelineFeed.tsx) | Windowed cards on a year spine |
| [`src/components/EventCard.tsx`](src/components/EventCard.tsx) | Teaser card, expand, permalink |
| [`src/components/YearNavigator.tsx`](src/components/YearNavigator.tsx) | Jump-to-year density rail or mobile dock (scrub strip + year chips) |
| [`src/components/YearCue.tsx`](src/components/YearCue.tsx) | Brief year overlay while scrolling or scrubbing |
| [`src/components/ScrollFade.tsx`](src/components/ScrollFade.tsx) | Edge fade when a horizontal scroller can still move |
| [`src/lib/scrollOverflow.ts`](src/lib/scrollOverflow.ts) | Start/end overflow flags for those fades |
| [`src/components/FilterBar.tsx`](src/components/FilterBar.tsx) | Sticky search row; publishes `--filter-h` |
| [`src/components/KeywordCloud.tsx`](src/components/KeywordCloud.tsx) | Theme chips under search (scroll away with the page) |
| [`src/components/SearchSuggest.tsx`](src/components/SearchSuggest.tsx) | Combobox typeahead for search |
| [`src/components/ReadingControls.tsx`](src/components/ReadingControls.tsx) | Text size and high contrast |
| [`src/components/ShareButton.tsx`](src/components/ShareButton.tsx) | Share current view |
| [`src/components/ThemeToggle.tsx`](src/components/ThemeToggle.tsx) | System / light / dark |
| [`src/components/Toast.tsx`](src/components/Toast.tsx) | Viewport copy confirmation |
| [`src/index.css`](src/index.css) | Colour tokens, self-hosted type, dark class, layout CSS variables |
| [`vite.site-url.ts`](vite.site-url.ts) | Replaces `%SITE_URL%` in HTML, robots.txt, sitemap |
| [`index.html`](index.html) | Static meta, Open Graph, JSON-LD, appearance boot script |

### Layout

On viewports **narrower than `lg` (1024px)** the year navigator is a fixed bottom **dock**: a full-span density strip (tap or drag to jump) plus a horizontal year list. The list and the theme chips fade at the edges when there is more to scroll. Cards and the footer use `--dock-h` (measured from the dock) so content can scroll above it. On **`lg` and up** the navigator is a sticky **rail** on the right; the dock is not shown.

The search row is sticky. It writes `--filter-h` so skip-link targets and card permalinks sit below it. Year headings stay with their section and scroll away with the feed. While you scroll the timeline or swipe the year dock, a large year overlay appears for a moment and then fades (similar to a photos year scrubber). The dock or rail keeps marking the year in view. An active theme stays as a chip on that row (activate it again to clear). Theme chips sit under that row and scroll away with the page. Event cards start as a teaser (compact date badge, three lines with a fade, and three tags on narrow screens; date stack, four lines, and five tags from `sm` / 640px) and expand in place.

The year dock/rail still switches at **`lg` (1024px)** — that breakpoint is independent of the card teaser.

## URL state

The address bar is the only “route”. Query parameters describe the **current view**. The fragment describes a **single card**.

| Piece | Example | Purpose |
| --- | --- | --- |
| `q` | `?q=Rolpa` | Search in narrative, date label, year, and tags. Typeahead fills `q`; it does not set `tag` or `year`. |
| `tag` | `?tag=Maoist` | Keyword / theme filter |
| `category` | `?category=…` | Category filter |
| `org` | `?org=…` | Organization filter |
| `year` | `?year=2001` | Scroll the feed to that year on load |
| hash | `#event-NCT-0001` | Scroll to one card after the CSV loads. Romeo is `NCT-0001`. |

Filter changes use `history.replaceState` and **keep** an existing hash. Search is debounced (200ms) before it is written to the URL and applied to the list. The list filters an in-memory index; it does not parse the CSV again.

Two different copy actions:

- **Share** (header) copies or native-shares the **current view**, including `?q=&tag=&year=`.
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

JSON-LD describes a `WebSite` and a `Dataset` with `temporalCoverage` `1995/2006` and `spatialCoverage` Nepal. Event texts are **not** marked MIT in that markup. Uncomment `twitter:site` in `index.html` when the project has an official account.

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

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md). This archive describes political violence, detention, disappearance, and related harm. Contributions should be accurate, restrained, and respectful of survivors.

## License

Application code is licensed under the [MIT License](LICENSE). Fraunces is © The Fraunces Project Authors. Source Sans 3 and Source Serif 4 are © Google Inc. / Adobe. All three are licensed under the [SIL Open Font License 1.1](https://scripts.sil.org/OFL).

**Event narratives in the CSV are not automatically covered by that license.** Their provenance sits with the researchers and organizations who compiled the sheet. Do not republish the text under MIT until maintainers confirm the data license. See [DATA.md](DATA.md).
