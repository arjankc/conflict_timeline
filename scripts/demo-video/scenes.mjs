/**
 * Storyboard for the ~4.5-minute silent + captions walkthrough (1080p, local build).
 * Each scene: stable URL + caption + ordered steps. run.mjs interprets `do`.
 *
 * Step ops (all failure-tolerant, logged, never abort the recording):
 *   { op: 'goto', url }            — path incl. /conflict_timeline/ base
 *   { op: 'move', selector }       — glide cursor to element center
 *   { op: 'click', selector }      — move + click
 *   { op: 'type', selector, text } — click, clear, type with delay
 *   { op: 'press', key }           — keyboard press (Enter, Escape, ArrowDown…)
 *   { op: 'scroll', y }            — smooth scroll by y px
 *   { op: 'scrollTo', selector }   — smooth scroll element to center
 *   { op: 'focus', on }            — cursor-following focus glow on/off
 *   { op: 'zoom', selector, scale } / { op: 'unzoom' } (kept, rarely used)
 *   { op: 'spot', selector } / { op: 'unspot' }
 *   { op: 'pulse', selector }
 *   { op: 'say', text }            — small callout near cursor
 *   { op: 'wait', ms }             — hold for readability (also lets video breathe)
 *   { op: 'waitFor', selector }    — wait until app data renders
 *   { op: 'results' }              — log feed size; warn if a filter emptied it
 */

export const BASE = '/conflict_timeline/';

export const SCENES = [
  {
    id: 'intro',
    title: 'Nepal Conflict Timeline — a digital archive',
    sub: '2,112 events · 1 Nov 1995 – 8 Sep 2025 · built for transitional-justice research',
    dwell: 25000,
    steps: [
      { op: 'goto', url: `${BASE}` },
      { op: 'waitFor', selector: 'article.event-card' },
      { op: 'focus', on: true },
      { op: 'scrollTo', selector: 'section[aria-label="Archive overview"]' },
      { op: 'move', selector: 'section[aria-label="Archive overview"]' },
      { op: 'spot', selector: 'section[aria-label="Archive overview"]' },
      { op: 'wait', ms: 6000 },
      { op: 'unspot' },
      { op: 'pulse', selector: 'section[aria-label="Archive overview"]' },
      { op: 'wait', ms: 2500 },
    ],
  },
  {
    id: 'feed',
    title: 'Scroll 30 years, one card at a time',
    sub: 'Chronological feed grouped by year and month · cards expand in place',
    dwell: 45000,
    steps: [
      { op: 'goto', url: `${BASE}?year=2009#event-NCT-1407` },
      { op: 'waitFor', selector: '#event-NCT-1407' },
      { op: 'scrollTo', selector: '#event-NCT-1407' },
      { op: 'move', selector: '#event-NCT-1407' },
      { op: 'wait', ms: 2500 },
      { op: 'spot', selector: '#event-NCT-1407' },
      { op: 'wait', ms: 3000 },
      { op: 'waitFor', selector: '#event-NCT-1407 button[aria-label^="Show more"]' },
      { op: 'click', selector: '#event-NCT-1407 button[aria-label^="Show more"]' },
      { op: 'wait', ms: 4000 },
      { op: 'say', text: 'Full narrative + all metadata pills' },
      { op: 'wait', ms: 4000 },
      { op: 'unspot' },
      { op: 'scroll', y: 900 },
      { op: 'wait', ms: 3500 },
    ],
  },
  {
    id: 'search',
    title: 'Search with typeahead — try “Rolpa”',
    sub: 'Matches narrative, dates, tags and districts · step through hits with ↑ ↓',
    dwell: 40000,
    steps: [
      { op: 'scrollTo', selector: '#timeline-search' },
      { op: 'spot', selector: 'nav[aria-label="Filter the timeline"]' },
      { op: 'wait', ms: 2500 },
      { op: 'unspot' },
      { op: 'type', selector: '#timeline-search', text: 'Rolpa' },
      { op: 'wait', ms: 3500 },
      { op: 'say', text: 'Typeahead: Event_IDs, districts, tags, years' },
      { op: 'press', key: 'Enter' },
      { op: 'wait', ms: 4000 },
      { op: 'results' },
      { op: 'pulse', selector: 'nav[aria-label="Filter the timeline"]' },
      { op: 'scroll', y: 700 },
      { op: 'wait', ms: 4000 },
      { op: 'scrollTo', selector: '#timeline-search' },
      { op: 'press', key: 'Escape' },
      { op: 'type', selector: '#timeline-search', text: '' },
      { op: 'wait', ms: 2000 },
    ],
  },
  {
    id: 'filters',
    title: 'One Filters drawer — themes, facets, dates',
    sub: 'Theme chips by facet · categories · organizations · sorting · date range',
    dwell: 55000,
    steps: [
      { op: 'click', selector: 'button[aria-label="Show filters"], button[aria-label="Hide filters"]' },
      { op: 'wait', ms: 2000 },
      { op: 'spot', selector: 'section[aria-label^="Themes"]' },
      { op: 'wait', ms: 4500 },
      { op: 'unspot' },
      { op: 'click', selector: 'section[aria-label^="Themes"] button' },
      { op: 'wait', ms: 3500 },
      { op: 'spot', selector: 'section[aria-label="Categories, organizations, and confidence"]' },
      { op: 'wait', ms: 3500 },
      { op: 'unspot' },
      { op: 'click', selector: '#timeline-sort' },
      { op: 'wait', ms: 1500 },
      { op: 'press', key: 'ArrowDown' },
      { op: 'press', key: 'Enter' },
      { op: 'wait', ms: 3000 },
      { op: 'say', text: 'Filters stay in the URL — shareable views' },
      { op: 'wait', ms: 3500 },
      { op: 'click', selector: 'button[aria-label="Show filters"], button[aria-label="Hide filters"]' },
      { op: 'wait', ms: 2000 },
      { op: 'results' },
    ],
  },
  {
    id: 'years',
    title: 'Jump by year — rail, histogram, or link',
    sub: 'Density bars show where the archive is thickest · ?year=2001 scrolls here',
    dwell: 35000,
    steps: [
      { op: 'goto', url: `${BASE}?year=2001` },
      { op: 'waitFor', selector: 'article.event-card' },
      { op: 'scrollTo', selector: 'section[aria-label="Archive overview"]' },
      { op: 'spot', selector: 'section[aria-label="Archive overview"]' },
      { op: 'wait', ms: 4000 },
      { op: 'click', selector: 'section[aria-label="Archive overview"] button[aria-label^="2002"]' },
      { op: 'wait', ms: 4000 },
      { op: 'unspot' },
      { op: 'scrollTo', selector: 'nav[aria-label^="Jump to a year"]:visible' },
      { op: 'spot', selector: 'nav[aria-label^="Jump to a year"]:visible' },
      { op: 'move', selector: 'nav[aria-label^="Jump to a year"]:visible button[data-year="2005"]' },
      { op: 'wait', ms: 4000 },
      { op: 'click', selector: 'nav[aria-label^="Jump to a year"]:visible button[data-year="2005"]' },
      { op: 'wait', ms: 4000 },
      { op: 'unspot' },
    ],
  },
  {
    id: 'districts-share',
    title: 'Districts, permalinks, and export',
    sub: 'Top-8 inferred districts · per-card link · share view · CSV / JSON download',
    dwell: 30000,
    steps: [
      { op: 'goto', url: `${BASE}` },
      { op: 'waitFor', selector: 'article.event-card' },
      { op: 'click', selector: 'button[aria-label="Show filters"], button[aria-label="Hide filters"]' },
      { op: 'wait', ms: 2000 },
      { op: 'scrollTo', selector: 'section[aria-label="Districts"]' },
      { op: 'spot', selector: 'section[aria-label="Districts"]' },
      { op: 'wait', ms: 4000 },
      { op: 'click', selector: 'section[aria-label="Districts"] button' },
      { op: 'wait', ms: 3500 },
      { op: 'results' },
      { op: 'unspot' },
      { op: 'click', selector: 'button[aria-label="Show filters"], button[aria-label="Hide filters"]' },
      { op: 'wait', ms: 1500 },
      { op: 'scrollTo', selector: 'article.event-card' },
      { op: 'move', selector: 'article.event-card a[aria-label^="Copy link"]' },
      { op: 'say', text: '#event-NCT-… links never carry filters' },
      { op: 'wait', ms: 3500 },
      { op: 'move', selector: 'button[aria-label="Share this view"]' },
      { op: 'pulse', selector: 'button[aria-label="Share this view"]' },
      { op: 'wait', ms: 3500 },
    ],
  },
  {
    id: 'reading',
    title: 'Reading-first: larger text, contrast, reduced detail',
    sub: 'System / light / dark · Default / Large / Larger · choices persist',
    dwell: 25000,
    steps: [
      { op: 'scrollTo', selector: 'header' },
      { op: 'move', selector: 'header [role="toolbar"]' },
      { op: 'spot', selector: 'header [role="toolbar"]' },
      { op: 'wait', ms: 4000 },
      { op: 'click', selector: 'header [role="toolbar"] button' },
      { op: 'wait', ms: 2500 },
      { op: 'click', selector: 'header [role="toolbar"] button' },
      { op: 'wait', ms: 2500 },
      { op: 'unspot' },
    ],
  },
  {
    id: 'outro',
    title: 'Open data, open code',
    sub: 'CSV mirror in dist/data/events.json · MIT code · event texts keep sheet provenance',
    dwell: 15000,
    steps: [
      { op: 'goto', url: `${BASE}` },
      { op: 'waitFor', selector: 'article.event-card' },
      { op: 'scrollTo', selector: 'footer' },
      { op: 'move', selector: 'footer' },
      { op: 'wait', ms: 5000 },
      { op: 'scrollTo', selector: 'header' },
      { op: 'wait', ms: 3000 },
      { op: 'focus', on: false },
    ],
  },
];
