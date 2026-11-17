import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { siteUrlPlugin } from './vite.site-url.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.VITE_SITE_URL) process.env.VITE_SITE_URL = env.VITE_SITE_URL

  return {
    // Project Pages URL: https://<user>.github.io/conflict_timeline/
    base: '/conflict_timeline/',
    plugins: [react(), tailwindcss(), siteUrlPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(process.cwd(), 'index.html'),
          'presentation/index': resolve(process.cwd(), 'presentation/index.html'),
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
