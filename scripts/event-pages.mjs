#!/usr/bin/env node
/**
 * Static per-event pages for crawlers and unfurls.
 * Card permalinks (#event-NCT-…) are hash fragments, which crawlers strip —
 * without this, individual events are invisible to search. Each page carries
 * real content (title, meta/OG description, narrative, tags, sources) plus a
 * link into the interactive timeline. Self-canonical: this is where the
 * content lives.
 *
 * Reads public/data/mastersheet.csv (same source the app loads).
 * Run after `vite build`: node scripts/event-pages.mjs
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html missing — run `vite build` first')
  process.exit(1)
}

const siteUrl = (process.env.VITE_SITE_URL || 'https://YOUR-GITHUB-USERNAME.github.io/conflict_timeline').replace(/\/+$/, '')

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1 }
        else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  const header = (rows.shift() ?? []).map((h) => h.trim())
  return rows
    .filter((r) => r.some((cell) => cell.trim() !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])))
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS = Object.fromEntries(MONTH_NAMES.map((m, i) => [m.toLowerCase(), i + 1]))
const MONTH_PATTERN = Object.keys(MONTHS).join('|')

function expandYear(year) {
  if (year >= 100) return year
  return year >= 50 ? 1900 + year : 2000 + year
}

/**
 * Display label mirroring src/lib/parseDate.ts for the formats it accepts.
 * Unknown formats fall back to the raw cell verbatim — never invent a date.
 */
function displayLabel(raw) {
  const value = raw.replace(/\s+/g, ' ').trim()
  let m
  if ((m = value.match(new RegExp(`^(${MONTH_PATTERN})\\s+(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2}),?\\s+(\\d{4})$`, 'i')))) {
    return `${Number(m[2])}–${Number(m[3])} ${MONTH_NAMES[MONTHS[m[1].toLowerCase()] - 1]} ${m[4]}`
  }
  if ((m = value.match(new RegExp(`^(${MONTH_PATTERN})\\s+(\\d{1,2}),?\\s+(\\d{4})$`, 'i')))) {
    return `${Number(m[2])} ${MONTH_NAMES[MONTHS[m[1].toLowerCase()] - 1]} ${m[3]}`
  }
  if ((m = value.match(new RegExp(`^(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(\\d{4})$`, 'i')))) {
    return `${Number(m[1])} ${MONTH_NAMES[MONTHS[m[2].toLowerCase()] - 1]} ${m[3]}`
  }
  if ((m = value.match(new RegExp(`^(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(\\d{4})$`, 'i')))) {
    return `${Number(m[1])}–${Number(m[2])} ${MONTH_NAMES[MONTHS[m[3].toLowerCase()] - 1]} ${m[4]}`
  }
  if ((m = value.match(new RegExp(`^(${MONTH_PATTERN})\\s+(\\d{4})$`, 'i')))) {
    return `${MONTH_NAMES[MONTHS[m[1].toLowerCase()] - 1]} ${m[2]}`
  }
  if ((m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) {
    return `${Number(m[2])} ${MONTH_NAMES[Number(m[1]) - 1] ?? m[1]} ${expandYear(Number(m[3]))}`
  }
  return value
}

function splitList(value) {
  return String(value ?? '')
    .split(/[;]+/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function extractUrls(text) {
  const found = String(text ?? '').match(/https?:\/\/[^\s),;\]"']+/g) ?? []
  return [...new Set(found.map((u) => u.replace(/[.。,;:!?)\]]+$/g, '')))]
}

function tagList(items) {
  if (items.length === 0) return ''
  return `<ul>\n${items.map((t) => `      <li>${esc(t)}</li>`).join('\n')}\n    </ul>`
}

const rows = parseCsv(readFileSync(join(root, 'public/data/mastersheet.csv'), 'utf8'))
let written = 0
let skipped = 0
for (const row of rows) {
  const id = (row.Event_ID || '').trim()
  const detail = (row.Detail || '').trim()
  const date = (row.Date || '').trim()
  if (!id || !detail || !date || !/^[A-Za-z0-9_-]+$/.test(id)) {
    skipped += 1
    continue
  }
  const keywords = splitList(row.Keywords).flatMap((k) => k.split(',').map((s) => s.trim()).filter(Boolean))
  const categories = splitList(row.Category)
  const organizations = row.Organizations && row.Organizations.includes(';')
    ? splitList(row.Organizations)
    : String(row.Organizations || '').split(',').map((s) => s.trim()).filter(Boolean)
  const sources = splitList(row.Sources)
  const confidence = (row.Confidence || '').trim()
  const desc = detail.length > 160 ? detail.slice(0, 157).replace(/\s+\S*$/, '') + '…' : detail
  const label = displayLabel(date)
  const dir = join(dist, 'event', id)
  mkdirSync(dir, { recursive: true })
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<link rel="canonical" href="${siteUrl}/event/${id}/" />
<meta name="robots" content="index, follow" />
<meta name="theme-color" content="#f3eee4" />
<title>${esc(label)} · Nepal Conflict Timeline</title>
<meta name="description" content="${esc(desc)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Nepal Conflict Timeline" />
<meta property="og:title" content="${esc(label)} · Nepal Conflict Timeline" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${siteUrl}/event/${id}/" />
<meta property="og:image" content="${siteUrl}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(label)} · Nepal Conflict Timeline" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${siteUrl}/og-image.png" />
<style>body{font-family:Georgia,serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1b1613;background:#f3eee4}a{color:#8b1e12}.meta{font-family:system-ui,sans-serif;font-size:.85rem;color:#3f3832}ul{padding-left:1.2rem}.cta{display:inline-block;margin-top:1rem;padding:.6rem 1rem;border:1px solid #8b1e12;border-radius:4px;text-decoration:none}</style>
</head>
<body>
<p class="meta"><a href="${siteUrl}/">Nepal Conflict Timeline</a> · ${esc(id)}</p>
<h1>${esc(label)}</h1>
<p>${esc(detail)}</p>
${keywords.length ? `<h2>Themes</h2>\n    ${tagList(keywords)}` : ''}
${categories.length ? `<h2>Categories</h2>\n    ${tagList(categories)}` : ''}
${organizations.length ? `<h2>Organizations</h2>\n    ${tagList(organizations)}` : ''}
${confidence ? `<p class="meta">Confidence: ${esc(confidence)}</p>` : ''}
${sources.length ? `<h2>Sources</h2>\n    <ul>\n${sources.map((s) => {
    const urls = extractUrls(s)
    const citation = esc(urls.reduce((acc, u) => acc.split(u).join('').replace(/https?:\/\/\S*/g, ''), s).replace(/\s+/g, ' ').trim() || s)
    return `      <li>${citation}${urls.map((u) => ` <a href="${esc(u)}" rel="nofollow">${esc(u.replace(/^https?:\/\//, '').split('/')[0])}</a>`).join('')}</li>`
  }).join('\n')}\n    </ul>` : ''}
<p><a class="cta" href="${siteUrl}/#event-${esc(id)}">Open in the interactive timeline →</a></p>
</body>
</html>`
  writeFileSync(join(dir, 'index.html'), page)
  written += 1
}
console.log(`event pages: ${written} generated, ${skipped} rows skipped`)
