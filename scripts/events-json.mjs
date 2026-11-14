#!/usr/bin/env node
/**
 * Offline field-use artifact: mirrors the slim CSV rows as JSON.
 * Raw mirror (no parse) — the app still loads the CSV first.
 * Run: node scripts/events-json.mjs (also wired after year pages in build).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const csvPath = join(root, 'public/data/mastersheet.csv')

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

const rows = parseCsv(readFileSync(csvPath, 'utf8'))
const outDir = join(root, 'dist/data')
if (!existsSync(join(root, 'dist'))) {
  // Dev-time run: write beside public for inspection instead of failing.
  mkdirSync(join(root, 'public/data'), { recursive: true })
  writeFileSync(join(root, 'public/data/events.json'), JSON.stringify(rows))
  console.log(`events.json: ${rows.length} rows → public/data/events.json (dev)`)
} else {
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'events.json'), JSON.stringify(rows))
  console.log(`events.json: ${rows.length} rows → dist/data/events.json`)
}
