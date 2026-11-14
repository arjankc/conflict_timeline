#!/usr/bin/env node
/**
 * Link-rot check for Sources citations in the archival CSV.
 * Read-only: extracts http(s) URLs, checks each once, maps failures to Event_IDs.
 *
 * Usage: node scripts/link-check.mjs [--limit N] [--timeout MS] [--concurrency N]
 *        [--json report.json] [--strict]
 * Exit 1 with --strict when any URL is dead (blocked 401/403/429 counts separately).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const csvPath = join(root, 'public/data/mastersheet_with_sources.csv')

const args = process.argv.slice(2)
function flag(name, fallback) {
  const i = args.indexOf(name)
  if (i < 0) return fallback
  const raw = Number(args[i + 1])
  return Number.isFinite(raw) && raw > 0 ? raw : fallback
}
const LIMIT = flag('--limit', Infinity)
const TIMEOUT_MS = flag('--timeout', 20000)
const CONCURRENCY = Math.min(flag('--concurrency', 6), 32)
const JSON_OUT = (() => {
  const i = args.indexOf('--json')
  return i >= 0 && args[i + 1] ? args[i + 1] : null
})()
const STRICT = args.includes('--strict')

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

function extractUrls(text) {
  const found = text.match(/https?:\/\/[^\s),;\]"']+/g) ?? []
  return [...new Set(found.map((u) => u.replace(/[.。,;:!?)\]]+$/g, '')))].filter(Boolean)
}

async function checkUrl(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('timeout')), TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'NepalConflictTimeline-linkcheck/1.0 (+research archive)' },
    })
    // Status resolves after headers; abort the body — we only need the code.
    controller.abort()
    const finalUrl = response.url && response.url !== url ? response.url : null
    return { url, status: response.status, finalUrl }
  } catch (error) {
    return { url, status: 0, error: error instanceof Error ? (error.cause?.code ?? error.message) : String(error) }
  } finally {
    clearTimeout(timer)
  }
}

function classify(status) {
  if (status >= 200 && status < 400) return 'ok'
  if (status === 401 || status === 403 || status === 429) return 'blocked'
  return 'dead'
}

async function main() {
  const rows = parseCsv(readFileSync(csvPath, 'utf8'))
  const byUrl = new Map()
  for (const row of rows) {
    for (const url of extractUrls(row.Sources ?? '')) {
      if (!byUrl.has(url)) byUrl.set(url, [])
      byUrl.get(url).push(row.Event_ID)
    }
  }
  const urls = [...byUrl.keys()].slice(0, LIMIT)
  console.log(`checking ${urls.length} unique URLs (${rows.length} rows) — concurrency ${CONCURRENCY}, timeout ${TIMEOUT_MS}ms`)

  const results = []
  let done = 0
  const queue = urls.slice()
  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift()
      const checked = await checkUrl(url)
      // Retry once on network-level failure (not on HTTP status).
      const retry = checked.status === 0 ? await checkUrl(url) : checked
      results.push({ ...retry, kind: classify(retry.status), ids: byUrl.get(url) })
      done += 1
      if (done % 50 === 0 || done === urls.length) console.log(`  ${done}/${urls.length}`)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker))

  const ok = results.filter((r) => r.kind === 'ok')
  const blocked = results.filter((r) => r.kind === 'blocked')
  const dead = results.filter((r) => r.kind === 'dead')
  console.log(`\nok: ${ok.length}, blocked (401/403/429): ${blocked.length}, dead: ${dead.length}`)
  for (const r of dead) {
    console.log(`DEAD ${r.status || r.error} ${r.url}  [${r.ids.slice(0, 5).join(', ')}${r.ids.length > 5 ? ` +${r.ids.length - 5}` : ''}]`)
  }
  for (const r of blocked) {
    console.log(`BLOCKED ${r.status} ${r.url}  [${r.ids.slice(0, 3).join(', ')}${r.ids.length > 3 ? ` +${r.ids.length - 3}` : ''}]`)
  }
  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify({ checkedAt: new Date().toISOString(), counts: { ok: ok.length, blocked: blocked.length, dead: dead.length }, dead, blocked: blocked.map(({ url, status, ids }) => ({ url, status, ids })) }, null, 2))
    console.log(`report written to ${JSON_OUT}`)
  }
  if (STRICT && dead.length > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(2)
})
