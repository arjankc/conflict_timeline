#!/usr/bin/env node
/**
 * Rebuilds dist/sitemap.xml from what was actually generated:
 * homepage + /presentation/ + /year/* + /event/*.
 * Runs last in the build chain (after year-pages and event-pages), so the
 * sitemap can never drift from the artifact set. Idempotent.
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html missing — run `vite build` first')
  process.exit(1)
}

const siteUrl = (process.env.VITE_SITE_URL || 'https://YOUR-GITHUB-USERNAME.github.io/conflict_timeline').replace(/\/+$/, '')
const today = new Date().toISOString().slice(0, 10)

function childDirs(parent) {
  if (!existsSync(parent)) return []
  return readdirSync(parent, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(parent, e.name, 'index.html')))
    .map((e) => e.name)
    .sort()
}

function entry(loc, changefreq, priority) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
}

const urls = [
  entry(`${siteUrl}/`, 'weekly', '1.0'),
  ...(existsSync(join(dist, 'presentation', 'index.html'))
    ? [entry(`${siteUrl}/presentation/`, 'monthly', '0.7')]
    : []),
  ...childDirs(join(dist, 'year')).map((y) => entry(`${siteUrl}/year/${y}/`, 'monthly', '0.6')),
  ...childDirs(join(dist, 'event')).map((id) => entry(`${siteUrl}/event/${id}/`, 'monthly', '0.5')),
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated at build time by scripts/sitemap.mjs. Do not edit dist output. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
writeFileSync(join(dist, 'sitemap.xml'), sitemap)
console.log(`sitemap: ${urls.length} urls (${childDirs(join(dist, 'year')).length} years, ${childDirs(join(dist, 'event')).length} events)`)
