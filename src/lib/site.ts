/**
 * Canonical strings for the header, JSON-LD, and Open Graph.
 * `%SITE_URL%` in static files is replaced at build time — see `vite.site-url.ts`.
 * Fact baseline: armed conflict 1996–2006; dataset spans 1995 (Operation Romeo)
 * through 8 September 2025, 2112 rows.
 */

export const SITE_NAME = 'Nepal Conflict Timeline'

export const SITE_TAGLINE =
  "A digital archive of Nepal's internal armed conflict (1 November 1995 - 8 September 2025)."

export const SITE_DESCRIPTION =
  "A chronological record of Nepal's internal armed conflict (1 November 1995 - 8 September 2025)."

/** Fallback used in HTML meta tags when VITE_SITE_URL is not set at build time. */
export const PLACEHOLDER_SITE_URL =
  'https://YOUR-GITHUB-USERNAME.github.io/conflict_timeline'

/** Canonical GitHub repository for source and documentation links. */
export const REPO_URL = 'https://github.com/arjankc/conflict_timeline'

export const DATA_DOC_URL = `${REPO_URL}/blob/main/DATA.md`

export function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

export function applySiteUrl(source: string, siteUrl: string): string {
  return source.replaceAll('%SITE_URL%', normalizeSiteUrl(siteUrl))
}
