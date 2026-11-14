#!/usr/bin/env node
/**
 * Review-queue helper for docs/FACTCHECK.md (layer 3 of the fact-check plan).
 * Read-only: ranks archival rows by the largest integer in Detail so editors
 * can prioritize casualty/figure claims for source verification.
 *
 * Usage: node scripts/factcheck-candidates.mjs [--top N]
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const TOP = (() => {
  const i = args.indexOf('--top')
  const n = Number(args[i + 1])
  return i >= 0 && Number.isFinite(n) && n > 0 ? Math.floor(n) : 15
})()

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

const rows = parseCsv(readFileSync(join(root, 'public/data/mastersheet_with_sources.csv'), 'utf8'))
const scored = []
for (const row of rows) {
  const nums = (row.Detail.match(/\d[\d,]*/g) ?? [])
    .map((n) => Number(n.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n))
  if (nums.length === 0) continue
  scored.push({ id: row.Event_ID, date: row.Date, max: Math.max(...nums), confidence: (row.Confidence ?? '').split(/[—–-]/)[0].trim(), detail: row.Detail.slice(0, 140) })
}
scored.sort((a, b) => b.max - a.max)
for (const s of scored.slice(0, TOP)) {
  console.log(`${s.id} | ${s.date} | max figure ${s.max} | ${s.confidence} | ${s.detail}…`)
}
console.log(`\n${scored.length} rows contain figures; showing top ${Math.min(TOP, scored.length)}`)
