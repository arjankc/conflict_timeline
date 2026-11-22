#!/usr/bin/env node
/**
 * Post-build year pages for shareable per-year unfurls.
 * Generates dist/year/YYYY/index.html with year-specific meta + redirect to ?year=YYYY.
 * Years are derived from public/data/mastersheet.csv so the range tracks the dataset.
 * (dist/sitemap.xml is rebuilt separately by scripts/sitemap.mjs.)
 * Run after `vite build` (needs VITE_SITE_URL at build time for canonical tags).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html missing — run `npm run build` first')
  process.exit(1)
}

const siteUrl = (process.env.VITE_SITE_URL || 'https://YOUR-GITHUB-USERNAME.github.io/conflict_timeline').replace(/\/+$/, '')

// Derive the year range from the Date column only (never prose/URLs/figures),
// mirroring the two-digit expansion in src/lib/parseDate.ts.
function parseCsvDates(text) {
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
  const dateIdx = header.indexOf('Date')
  return rows
    .filter((r) => r.some((cell) => cell.trim() !== ''))
    .map((r) => (dateIdx >= 0 ? (r[dateIdx] ?? '').trim() : ''))
}

const dates = parseCsvDates(readFileSync(join(root, 'public/data/mastersheet.csv'), 'utf8'))
let minYear = Infinity
let maxYear = -Infinity
for (const date of dates) {
  for (const m of date.matchAll(/(19|20)\d{2}/g)) {
    const y = Number(m[0])
    if (y < minYear) minYear = y
    if (y > maxYear) maxYear = y
  }
  // Two-digit M/D/YY dates (`11/1/95`): 00–49 → 20xx, 50–99 → 19xx.
  for (const m of date.matchAll(/\/(\d{2})(?![\d])/g)) {
    const two = Number(m[1])
    const y = two >= 50 ? 1900 + two : 2000 + two
    if (y < minYear) minYear = y
    if (y > maxYear) maxYear = y
  }
}
if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
  console.error('no years found in mastersheet.csv')
  process.exit(1)
}
const years = []
for (let y = minYear; y <= maxYear; y += 1) years.push(y)

const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8')
const themeColor = indexHtml.match(/<meta name="theme-color" content="[^"]*" \/>/)?.[0] ?? ''

for (const year of years) {
  const dir = join(dist, 'year', String(year))
  mkdirSync(dir, { recursive: true })
  const title = `${year} · Nepal Conflict Timeline`
  const desc = `Nepal Conflict Timeline: events from ${year} — armed conflict (1996–2006) and transitional-justice aftermath, in chronological record from 1995.`
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<link rel="canonical" href="${siteUrl}/?year=${year}" />
<meta name="robots" content="index, follow" />
${themeColor}
<title>${title}</title>
<meta name="description" content="${desc}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Nepal Conflict Timeline" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:url" content="${siteUrl}/?year=${year}" />
<meta property="og:image" content="${siteUrl}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${desc}" />
<meta name="twitter:image" content="${siteUrl}/og-image.png" />
<meta http-equiv="refresh" content="0; url=${siteUrl}/?year=${year}" />
</head>
<body>
<p><a href="${siteUrl}/?year=${year}">View ${year} in the Nepal Conflict Timeline</a></p>
<script>location.replace("${siteUrl}/?year=${year}");</script>
</body>
</html>`
  writeFileSync(join(dir, 'index.html'), page)
}

console.log(`year pages: ${years.length} generated (${years[0]}–${years[years.length - 1]})`)
