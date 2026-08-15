/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Published CSV URL. When unset, the app loads `/data/mastersheet.csv` under `base`. */
  readonly VITE_DATA_URL?: string
  /** Public origin with no trailing slash, used in Open Graph, sitemap, and robots.txt. */
  readonly VITE_SITE_URL?: string
}
