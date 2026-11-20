# Analytics — Google Tag Manager (GTM-PKN7T9SJ)

## How it is wired

- `index.html` loads the official GTM snippet (`gtm.js` + `gtm.start`), gated:
  **skipped on localhost** (dev stays out of production data) and **skipped
  with Do Not Track**. A `<noscript>` iframe covers no-JS crawlers.
- `src/lib/analytics.ts` is the only place that pushes to `dataLayer`.
  Every helper no-ops on the server, with DNT, or when GTM is blocked —
  analytics can never break the archive.
- SPA views: `App.tsx` pushes a `page_view` (with `page_location` /
  `page_path`) every time the debounced filters or year change the URL.
  The site has no router; the query string *is* the view.

## Events pushed from code

| event | params | notes |
| --- | --- | --- |
| `page_view` | `page_location`, `page_path` | fired on every view change (filters, year) |
| `search` | `result_count`, `query_length` | one per distinct query; **raw text is never sent** |
| `filter_change` | `facet`, `value_count`, `values?`, `action?` | first differing facet; `action: reset` on Reset |
| `card_expand` | `event_id` (`NCT-…`) | expanding a card only, not collapsing |
| `permalink_copy` | `event_id` | |
| `citation_copy` | `event_id` | |
| `export` | `format` (`csv`/`json`), `result_count` | |
| `share` | `method` (`web-share`/`clipboard`) | |
| `year_navigate` | `year` (or null) | rail/dock/histogram jumps only, not scroll position |
| `saved_view` | `action` (`save`/`apply`/`delete`) | view names are user input — never sent |

Controlled-vocabulary values (facets, districts, sort modes) are public
taxonomy and safe to send. Raw free text (search box, view names) is
deliberately excluded — see the unit test in `src/lib/analytics.test.ts`
that asserts this.

## Container setup (GTM web UI — still to do in `GTM-PKN7T9SJ`)

Code pushes are inert until the container forwards them. Create:

1. **GA4 Configuration tag** with the property's Measurement ID.
   Trigger: Initialization (default). Uncheck *“Send a page view event when
   this configuration loads”* — the app sends `page_view` itself on every
   view change (avoids a double count on landing).
2. **Built-in variables**: enable `Event`. Add **User-Defined Variables**
   (Data Layer Variable, version 2) for: `page_location`, `page_path`,
   `result_count`, `query_length`, `facet`, `value_count`, `values`,
   `action`, `event_id`, `format`, `method`, `year`.
3. **One GA4 Event tag** (“Custom events”): Event Name `{{Event}}`,
   with all the above variables as Event Parameters (unset ones are
   dropped). Trigger: Custom Event, regex
   `^(page_view|search|filter_change|card_expand|permalink_copy|citation_copy|export|share|year_navigate|saved_view)$`.
4. Preview → Submit → Publish.

## Privacy notes

- GA4 anonymizes IPs by default; no login or fingerprinting is used here.
- Because filter state lives in the URL, GA4 page URLs contain `?q=`
  search text. If that is unwanted, turn off Enhanced Measurement's
  **Site search** (or URL-query redaction) in the GA4 property — the
  code-side `search` event already reports popularity without the text.
- DNT users are fully excluded (snippet + every event).
- Optional follow-ups (not implemented): a cookie/consent banner, or a
  one-line analytics disclosure in the footer.
