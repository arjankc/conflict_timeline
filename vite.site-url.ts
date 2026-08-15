/**
 * Replaces `%SITE_URL%` in `index.html` during transform, and in `robots.txt` /
 * `sitemap.xml` after they are copied from `public/` (those files skip HTML transform).
 */
import fs from 'node:fs'
import path from 'node:path'
import { type Plugin } from 'vite'
import {
  applySiteUrl,
  normalizeSiteUrl,
  PLACEHOLDER_SITE_URL,
} from './src/lib/site.ts'

function resolvedSiteUrl(): string {
  return normalizeSiteUrl(process.env.VITE_SITE_URL || PLACEHOLDER_SITE_URL)
}

export function siteUrlPlugin(): Plugin {
  return {
    name: 'site-url-placeholders',
    transformIndexHtml(html) {
      return applySiteUrl(html, resolvedSiteUrl())
    },
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve('dist')
      for (const file of ['robots.txt', 'sitemap.xml']) {
        const full = path.join(outDir, file)
        if (!fs.existsSync(full)) continue
        fs.writeFileSync(full, applySiteUrl(fs.readFileSync(full, 'utf8'), resolvedSiteUrl()))
      }
    },
  }
}
