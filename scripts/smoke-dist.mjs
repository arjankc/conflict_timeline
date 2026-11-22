#!/usr/bin/env node
/**
 * Post-build smoke test for deploy artifacts. Fails the pipeline when the
 * generators silently break (year/event pages, sitemap entries, offline JSON).
 * Expected years and row counts are derived from the CSV so the checks track
 * the dataset instead of hardcoded numbers.
 *
 * Usage: node scripts/smoke-dist.mjs  (run after `npm run build`)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const failures = []

function check(label, cond) {
  console.log(`${cond ? 'ok' : 'FAIL'}: ${label}`)
  if (!cond) failures.push(label)
}

function csvYearsAndIds() {
  const text = readFileSync(join(root, 'public/data/mastersheet.csv'), 'utf8')
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
  const idIdx = header.indexOf('Event_ID')
  let minYear = Infinity
  let maxYear = -Infinity
  const ids = []
  for (const r of rows) {
    if (!r.some((cell) => cell.trim() !== '')) continue
    const date = dateIdx >= 0 ? (r[dateIdx] ?? '').trim() : ''
    for (const m of date.matchAll(/(19|20)\d{2}/g)) {
      const y = Number(m[0])
      if (y < minYear) minYear = y
      if (y > maxYear) maxYear = y
    }
    for (const m of date.matchAll(/\/(\d{2})(?![\d])/g)) {
      const two = Number(m[1])
      const y = two >= 50 ? 1900 + two : 2000 + two
      if (y < minYear) minYear = y
      if (y > maxYear) maxYear = y
    }
    const id = idIdx >= 0 ? (r[idIdx] ?? '').trim() : ''
    if (/^NCT-\d{4}$/.test(id)) ids.push(id)
  }
  return { years: rangeYears(minYear, maxYear), ids, rows: ids.length }
}

function rangeYears(minYear, maxYear) {
  const out = []
  if (Number.isFinite(minYear) && Number.isFinite(maxYear)) {
    for (let y = minYear; y <= maxYear; y += 1) out.push(y)
  }
  return out
}

const { years: expectedYears, ids: expectedIds, rows: expectedRows } = csvYearsAndIds()
console.log(`dataset: ${expectedRows} rows, years ${expectedYears[0]}–${expectedYears[expectedYears.length - 1]}`)

const indexHtml = join(dist, 'index.html')
check('dist/index.html exists', existsSync(indexHtml))
check('dist/presentation/index.html exists', existsSync(join(dist, 'presentation', 'index.html')))

const sitemap = join(dist, 'sitemap.xml')
const sitemapText = existsSync(sitemap) ? readFileSync(sitemap, 'utf8') : ''
check('dist/sitemap.xml exists', existsSync(sitemap))
check('sitemap has homepage entry', sitemapText.includes('/conflict_timeline/') || sitemapText.includes('%SITE_URL%'))
check('sitemap has presentation entry', sitemapText.includes('/presentation/'))
for (const y of expectedYears) {
  if (!sitemapText.includes(`/year/${y}/`)) failures.push(`sitemap missing /year/${y}/`)
}
console.log(`ok: sitemap covers all ${expectedYears.length} year pages`)
check(
  'sitemap covers events',
  expectedIds.length > 0 &&
    sitemapText.includes(`/event/${expectedIds[0]}/`) &&
    sitemapText.includes(`/event/${expectedIds[expectedIds.length - 1]}/`),
)
const urlCount = (sitemapText.match(/<url>/g) ?? []).length
check(
  `sitemap url count matches artifacts (${urlCount})`,
  urlCount === 2 + expectedYears.length + expectedIds.length,
)

check('dist/robots.txt exists', existsSync(join(dist, 'robots.txt')))

let yearPages = 0
for (const y of expectedYears) {
  const page = join(dist, 'year', String(y), 'index.html')
  if (!existsSync(page)) {
    failures.push(`missing dist/year/${y}/index.html`)
    continue
  }
  const text = readFileSync(page, 'utf8')
  if (!text.includes(`?year=${y}`)) failures.push(`year page ${y} lacks ?year=${y} canonical`)
  else yearPages += 1
}
console.log(`ok: ${yearPages}/${expectedYears.length} year pages with canonicals`)

let eventPages = 0
const eventDir = join(dist, 'event')
const eventDirs = existsSync(eventDir)
  ? readdirSync(eventDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  : []
const eventIdSet = new Set(eventDirs)
const missingEvents = expectedIds.filter((id) => !eventIdSet.has(id))
for (const id of missingEvents.slice(0, 10)) failures.push(`missing dist/event/${id}/index.html`)
if (missingEvents.length > 10) failures.push(`... and ${missingEvents.length - 10} more missing event pages`)
else eventPages = expectedIds.length - missingEvents.length
console.log(`ok: ${eventPages}/${expectedIds.length} event pages present`)

// Spot-check first and last event pages for real content (not empty shells).
for (const id of [expectedIds[0], expectedIds[expectedIds.length - 1]].filter(Boolean)) {
  const page = join(dist, 'event', id, 'index.html')
  if (!existsSync(page)) continue
  const text = readFileSync(page, 'utf8')
  if (!text.includes(`/event/${id}/`)) failures.push(`event page ${id} lacks self canonical`)
  if (!text.includes('<h1>') || !text.includes('Open in the interactive timeline')) {
    failures.push(`event page ${id} lacks card content`)
  }
}
console.log('ok: first/last event pages carry content + canonical')

const eventsJson = join(dist, 'data', 'events.json')
check('dist/data/events.json exists', existsSync(eventsJson))
if (existsSync(eventsJson)) {
  try {
    const rows = JSON.parse(readFileSync(eventsJson, 'utf8'))
    check(`events.json has ${expectedRows} rows`, Array.isArray(rows) && rows.length === expectedRows)
    check(
      'events.json rows have Event_ID/Date/Detail',
      Array.isArray(rows) && rows.length > 0 && rows.every((r) => r.Event_ID && r.Date && r.Detail),
    )
  } catch {
    failures.push('events.json is not valid JSON')
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} smoke failure(s):`)
  for (const f of failures.slice(0, 20)) console.error(` - ${f}`)
  process.exit(1)
}
console.log('\ndist smoke test passed')
