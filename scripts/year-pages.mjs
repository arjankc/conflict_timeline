#!/usr/bin/env node
/**
 * Post-build year pages for shareable per-year unfurls.
 * Generates dist/year/YYYY/index.html with year-specific meta + redirect to ?year=YYYY,
 * and appends year URLs to dist/sitemap.xml.
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
const years = []
for (let y = 1995; y <= 2026; y += 1) years.push(y)

const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8')
const themeColor = indexHtml.match(/<meta name="theme-color" content="[^"]*" \/>/)?.[0] ?? ''

for (const year of years) {
  const dir = join(dist, 'year', String(year))
  mkdirSync(dir, { recursive: true })
  const title = `${year} · Nepal Conflict Timeline`
  const desc = `Nepal Conflict Timeline: events from ${year} — armed conflict (1996–2006) and transitional-justice aftermath through 2026.`
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

// Append year URLs to sitemap (after %SITE_URL% substitution by the vite plugin).
const sitemapPath = join(dist, 'sitemap.xml')
if (existsSync(sitemapPath)) {
  let sitemap = readFileSync(sitemapPath, 'utf8')
  if (!sitemap.includes('/year/2001')) {
    const entries = years
      .map((y) => `  <url>\n    <loc>${siteUrl}/year/${y}/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`)
      .join('\n')
    sitemap = sitemap.replace('</urlset>', `${entries}\n</urlset>`)
    writeFileSync(sitemapPath, sitemap)
  }
}

console.log(`year pages: ${years.length} generated`)
