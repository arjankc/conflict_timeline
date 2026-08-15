# Contributing

Thank you for helping maintain this archive. The subject matter includes killings, torture, disappearance, and other human rights violations. Write and review as if survivors and families will read the page.

## Development setup

1. Install [Node.js 20+](https://nodejs.org/).
2. Clone the repository.
3. Run `npm install`.
4. Run `npm run dev`.

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Vite server |
| `npm test` | Unit tests (date parsing is required) |
| `npm run build` | Production typecheck and bundle |
| `npm run lint` | oxlint |

Please do not commit `node_modules/`, `dist/`, or `.env` files.

## What to change where

| Change | Where |
| --- | --- |
| Event text, dates, tags | `public/data/mastersheet.csv` (or the Google Sheet, then re-export — see DATA.md) |
| Date formats the app should accept | `src/lib/parseDate.ts` **and** `src/lib/parseDate.test.ts` |
| Fetch / CSV mapping | `src/lib/loadEvents.ts` |
| Layout and theming | `src/components/*`, `src/index.css` |
| Docs | `README.md`, `DATA.md`, this file |

## Pull requests

- Keep PRs focused. Data edits and UI edits are easier to review separately.
- Add or update tests when you change `parseDate`, tag parsing, or filtering.
- Do not introduce a backend, analytics, or third-party font CDN without discussion.
- Do not render `Detail` as HTML.
- Leave sensational styling out. The palette is paper, ink, and muted crimson on purpose.

If you edit the CSV, mention how many rows changed and whether Category / Organizations gained values (those filters appear automatically).

## Data edits

Prefer correcting the Google Sheet first, then replacing `public/data/mastersheet.csv`, so the spreadsheet and the deployed archive do not drift.

Do not silently “fix” historical claims in the parser. If a date string is wrong, correct the sheet. The parser’s job is to read formats, not to adjudicate facts.

## Conduct

Be respectful in issues, reviews, and commit messages. Do not include graphic imagery. Do not harass maintainers or people named in the archive. Harmful or extractive use of this dataset (doxxing, celebration of violence, targeting individuals) is not welcome.

If this project later adopts a formal Code of Conduct, it will be linked from the README. Until then, the Contributor Covenant is a reasonable baseline: https://www.contributor-covenant.org/
