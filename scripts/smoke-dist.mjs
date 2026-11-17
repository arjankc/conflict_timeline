#!/usr/bin/env node
/**
 * Post-build smoke test for deploy artifacts. Fails the pipeline when the
 * generators silently break (year pages, sitemap entries, offline JSON).
 *
 * Usage: node scripts/smoke-dist.mjs  (run after `npm run build`)
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const failures = []

function check(label, cond) {
  console.log(`${cond ? 'ok' : 'FAIL'}: ${label}`)
  if (!cond) failures.push(label)
}

const indexHtml = join(dist, 'index.html')
check('dist/index.html exists', existsSync(indexHtml))
check('dist/presentation/index.html exists', existsSync(join(dist, 'presentation', 'index.html')))

const sitemap = join(dist, 'sitemap.xml')
const sitemapText = existsSync(sitemap) ? readFileSync(sitemap, 'utf8') : ''
check('dist/sitemap.xml exists', existsSync(sitemap))
check('sitemap has homepage entry', sitemapText.includes('/conflict_timeline/') || sitemapText.includes('%SITE_URL%'))
check('sitemap has year entries', sitemapText.includes('/year/1995/') && sitemapText.includes('/year/2026/'))

check('dist/robots.txt exists', existsSync(join(dist, 'robots.txt')))

let yearPages = 0
for (let y = 1995; y <= 2026; y += 1) {
  const page = join(dist, 'year', String(y), 'index.html')
  if (!existsSync(page)) {
    failures.push(`missing dist/year/${y}/index.html`)
    continue
  }
  const text = readFileSync(page, 'utf8')
  if (!text.includes(`?year=${y}`)) failures.push(`year page ${y} lacks ?year=${y} canonical`)
  else yearPages += 1
}
console.log(`ok: ${yearPages}/32 year pages with canonicals`)

const eventsJson = join(dist, 'data', 'events.json')
check('dist/data/events.json exists', existsSync(eventsJson))
if (existsSync(eventsJson)) {
  try {
    const rows = JSON.parse(readFileSync(eventsJson, 'utf8'))
    check('events.json has 2150 rows', Array.isArray(rows) && rows.length === 2150)
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
