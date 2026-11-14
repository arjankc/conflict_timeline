#!/usr/bin/env node
/**
 * Data lint for the Nepal Conflict Timeline CSVs.
 * Reads public/data/mastersheet.csv (runtime) and mastersheet_with_sources.csv (archival).
 * Fails (exit 1) on structural errors; warns on taxonomy quality issues.
 *
 * Usage: node scripts/data-lint.mjs [--strict]
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const slimPath = join(root, 'public/data/mastersheet.csv')
const fullPath = join(root, 'public/data/mastersheet_with_sources.csv')
const strict = process.argv.includes('--strict')

function parseCsv(text) {
  // Minimal CSV parser handling quoted fields with commas/quotes/newlines.
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
    else if (c === '\r') { /* skip, handled by \n */ }
    else field += c
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  const header = (rows.shift() ?? []).map((h) => h.trim())
  return { header, rows }
}

function cell(row, idx) {
  return (row[idx] ?? '').replace(/\u00a0/g, ' ').trim()
}

const errors = []
const warnings = []

function lintFile(path, { expectSources }) {
  if (!existsSync(path)) {
    errors.push(`${path}: file missing`)
    return null
  }
  const { header, rows } = parseCsv(readFileSync(path, 'utf8'))
  const name = path.split(/[\\/]/).at(-1)
  const need = expectSources
    ? ['Event_ID', 'Date', 'Detail', 'Keywords', 'Category', 'Organizations', 'Sources', 'Confidence']
    : ['Event_ID', 'Date', 'Detail', 'Keywords', 'Category', 'Organizations']
  for (const col of need) {
    if (!header.includes(col)) errors.push(`${name}: missing column ${col}`)
  }
  if (header[0] !== 'Event_ID') warnings.push(`${name}: first column should be Event_ID (got ${header[0]})`)

  const ids = new Map()
  const kwCounts = new Map()
  const catSet = new Set()
  const orgMerged = []
  let missingDate = 0
  let missingDetail = 0
  let missingOrg = 0
  let missingConfidence = 0
  let minYear = Infinity
  let maxYear = -Infinity
  const confLevels = { high: 0, medium: 0, low: 0, other: 0 }

  const idx = Object.fromEntries(header.map((h, i) => [h, i]))
  rows.forEach((r, n) => {
    const line = n + 2
    const id = cell(r, idx.Event_ID)
    if (!id) errors.push(`${name}:${line}: missing Event_ID`)
    else if (!/^NCT-\d{4}$/.test(id)) warnings.push(`${name}:${line}: unusual Event_ID ${id}`)
    else {
      if (ids.has(id)) errors.push(`${name}:${line}: duplicate Event_ID ${id} (first at line ${ids.get(id)})`)
      else ids.set(id, line)
    }
    const date = cell(r, idx.Date)
    const detail = cell(r, idx.Detail)
    if (!date) missingDate += 1
    if (!detail) missingDetail += 1
    // Mirror parseDate's two-digit expansion (00–49 → 20xx, 50–99 → 19xx)
    // so `11/1/95` counts as 1995.
    const fourDigit = date.match(/(19|20)\d{2}/)
    const twoDigit = !fourDigit && date.match(/\/(\d{2})(?![\d])/)
    const yearToken = fourDigit
      ? Number(fourDigit[0])
      : twoDigit
        ? Number(twoDigit[1]) >= 50
          ? 1900 + Number(twoDigit[1])
          : 2000 + Number(twoDigit[1])
        : null
    if (yearToken != null) {
      if (yearToken < minYear) minYear = yearToken
      if (yearToken > maxYear) maxYear = yearToken
    }
    for (const c of cell(r, idx.Category).split(',')) {
      const t = c.trim()
      if (t) catSet.add(t)
    }
    const kw = cell(r, idx.Keywords)
    for (const k of kw.split(',')) {
      const t = k.replace(/\s+/g, ' ').trim().replace(/[./:;]+$/g, '')
      if (!t) continue
      const key = t.toLowerCase()
      if (!kwCounts.has(key)) kwCounts.set(key, { label: t, count: 0, lines: [] })
      const e = kwCounts.get(key)
      e.count += 1
      if (e.lines.length < 3) e.lines.push(line)
      // flag trailing punctuation variants
      if (/[./:;]$/.test(k.trim())) warnings.push(`${name}:${line}: keyword trailing punctuation ${JSON.stringify(k.trim())}`)
    }
    const org = cell(r, idx.Organizations)
    if (!org) missingOrg += 1
    else if (!org.includes(';') && org.includes(',')) orgMerged.push({ line, id, org: org.slice(0, 80) })
    if (expectSources) {
      const conf = cell(r, idx.Confidence)
      if (!conf) missingConfidence += 1
      else {
        const m = conf.match(/^(high|medium|low)\b/i)
        if (m) confLevels[m[1].toLowerCase()] += 1
        else { confLevels.other += 1; warnings.push(`${name}:${line}: unrecognised Confidence ${JSON.stringify(conf.slice(0, 60))}`) }
      }
    }

    // Forward-compatible enrichment columns (absent in current sheet → skipped).
    if (idx.District != null) {
      const d = cell(r, idx.District)
      if (d) {
        for (const part of (d.includes(';') ? d.split(';') : d.split(','))) {
          const t = part.trim()
          if (t && !/^[A-Za-z][A-Za-z .()-]*$/.test(t)) {
            warnings.push(`${name}:${line}: unusual District value ${JSON.stringify(t.slice(0, 60))}`)
          }
        }
      }
    }
    for (const col of ['Victims_Killed', 'Victims_Injured', 'Victims_Disappeared']) {
      if (idx[col] != null) {
        const v = cell(r, idx[col]).replace(/,/g, '')
        if (v && !/^\d+$/.test(v)) {
          errors.push(`${name}:${line}: ${col} must be a non-negative integer (got ${JSON.stringify(v.slice(0, 20))})`)
        }
      }
    }
    if (idx.Related_Events != null) {
      const rel = cell(r, idx.Related_Events)
      if (rel) {
        for (const part of rel.split(/[;,\s]+/)) {
          const t = part.trim()
          if (!t) continue
          if (!/^NCT-\d{4}$/i.test(t)) {
            warnings.push(`${name}:${line}: Related_Events has non-ID value ${JSON.stringify(t.slice(0, 20))}`)
          }
        }
      }
    }
    // Year-range sanity: dataset spans 1995–2026.
    const ym = cell(r, idx.Date).match(/(19|20)\d{2}/)
    if (ym) {
      const y = Number(ym[0])
      if (y < 1995 || y > 2026) {
        warnings.push(`${name}:${line}: Date year ${y} outside 1995–2026 span`)
      }
    }
    // Raw spaces glued to a URL are invalid and break naive extractors
    // (cf. NCT-0038 `…2004_(1).pdf`, or a prose gloss with no `;` separator).
    // A space followed by `;`/`|` is the normal Sources delimiter — fine.
    if (idx.Sources != null) {
      const src = cell(r, idx.Sources)
      const m = src.match(/https?:\/\/\S+ (?![;|])\S/)
      if (m) {
        warnings.push(`${name}:${line}: space glued to Sources URL ${JSON.stringify((m[0] + '…').slice(0, 70))} — separate with ';' or encode it in the Sheet`)
      }
    }
  })

  // Near-duplicate keyword report (punctuation / plural / extra-space variants)
  const normGroups = new Map()
  for (const [key, v] of kwCounts) {
    const norm = key.replace(/\s+/g, ' ').replace(/[./]+$/g, '')
    if (!normGroups.has(norm)) normGroups.set(norm, [])
    normGroups.get(norm).push(v.label)
  }

  // District keyword coverage (approximation: exact keyword match only,
  // incl. known aliases/cities; the app also scans Detail prose).
  const DISTRICT_WORDS = new Set(
    'achham arghakhanchi baglung baitadi bajhang bajura banke bara bardiya bhaktapur bhojpur chitwan dadeldhura dailekh dang darchula dhading dhankuta dhanusha dolakha dolpa doti gorkha gulmi humla ilam jajarkot jhapa jumla kailali kalikot kanchanpur kapilvastu kaski kathmandu kavrepalanchok kavre khotang lalitpur lamjung mahottari makwanpur manang morang mugu mustang myagdi nawalparasi nuwakot okhaldhunga palpa panchthar parsa parbat pyuthan ramechhap rasuwa rautahat rolpa rukum rupandehi salyan sankhuwasabha saptari sarlahi sindhuli sindhupalchok sindhupalchowk siraha solukhumbu sunsari surkhet syangja tanahun taplejung terhathum udayapur nepalgunj birgunj biratnagar pokhara janakpur janakpurdham dhangadhi mahendranagar tansen panauti'.split(' '),
  )
  const districtCounts = new Map()
  let districtCovered = 0
  for (const row of rows) {
    const kw = cell(row, header.indexOf('Keywords'))
    let hit = false
    for (const k of kw.split(',')) {
      const key = k.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase().replace(/[./:;]+$/g, '')
      if (DISTRICT_WORDS.has(key)) {
        hit = true
        districtCounts.set(key, (districtCounts.get(key) ?? 0) + 1)
      }
    }
    if (hit) districtCovered += 1
  }
  const districtTop = [...districtCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }))

  return { name, rows: rows.length, ids, kwCounts, catSet, orgMerged, missingDate, missingDetail, missingOrg, missingConfidence, confLevels, minYear, maxYear, districtCoverage: { covered: districtCovered, pct: rows.length ? Math.round((districtCovered / rows.length) * 100) : 0, top: districtTop } }
}

const slim = lintFile(slimPath, { expectSources: false })
const full = lintFile(fullPath, { expectSources: true })

/**
 * Copy-vs-data assertions: every hardcoded claim in README/DATA must match.
 * Failures are errors (not warnings) — update the docs and this script together.
 */
function assertClaims() {
  const check = (label, actual, expected) => {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a === e) {
      console.log(`claim OK: ${label} = ${a}`)
    } else {
      errors.push(`claim MISMATCH: ${label} is ${a}, docs say ${e} — update README.md/DATA.md and this script together`)
    }
  }

  for (const res of [slim, full]) {
    if (!res) continue
    check(`${res.name} rows`, res.rows, 2150)
    check(`${res.name} unique ids`, res.ids.size, 2150)
    const canonicalKw = new Set(
      [...res.kwCounts.keys()].map((k) => k.replace(/\s+/g, ' ').replace(/[./:;]+$/g, '')),
    )
    check(`${res.name} canonical keywords`, canonicalKw.size, 500)
    check(`${res.name} year span`, [res.minYear, res.maxYear], [1995, 2026])
  }
  if (slim) {
    check('mastersheet.csv rows with Organizations', slim.rows - slim.missingOrg, 899)
    check('mastersheet.csv categories', [...slim.catSet].sort(), [
      'civil_society', 'combat', 'detention', 'disappearance', 'displacement',
      'killing', 'media', 'other', 'peace_process', 'policy', 'protest',
      'sexual_violence', 'transitional_justice',
    ])
  }
  if (full) {
    check('archival confidence split', [full.confLevels.high, full.confLevels.medium, full.confLevels.low, full.missingConfidence], [1167, 351, 632, 0])
  }
}

for (const res of [slim, full]) {
  if (!res) continue
  console.log(`\n== ${res.name}: ${res.rows} rows, ${res.ids.size} unique ids ==`)
  console.log(`missing date/detail/org: ${res.missingDate}/${res.missingDetail}/${res.missingOrg}`)
  if (res.missingConfidence) console.log(`missing confidence: ${res.missingConfidence}`)
  if (res.confLevels) console.log(`confidence: ${JSON.stringify(res.confLevels)}`)
  const ranked = [...res.kwCounts.values()].sort((a, b) => b.count - a.count)
  console.log(`unique keywords: ${ranked.length}; top 16: ${ranked.slice(0, 16).map((x) => `${x.label}(${x.count})`).join(', ')}`)
  const rare = ranked.filter((x) => x.count === 1).length
  console.log(`single-use keywords: ${rare}`)
  if (res.districtCoverage) {
    console.log(`district keyword coverage: ${res.districtCoverage.covered}/${res.rows} rows (${res.districtCoverage.pct}%) top: ${res.districtCoverage.top.map((x) => `${x.label}(${x.count})`).join(', ')}`)
  }
  if (res.orgMerged.length > 0) {
    console.log(`legacy comma-separated Organizations (no semicolon, contains comma): ${res.orgMerged.length} rows, e.g.`)
    for (const m of res.orgMerged.slice(0, 5)) console.log(`  line ${m.line} ${m.id}: ${m.org}`)
    warnings.push(`${res.name}: ${res.orgMerged.length} Organizations cells use commas without semicolons (parsed via legacy comma fallback)`)
  }
}

console.log(`\nerrors: ${errors.length}, warnings: ${warnings.length}`)
for (const e of errors) console.log(`ERROR: ${e}`)
const showWarnings = warnings.slice(0, 40)
for (const w of showWarnings) console.log(`warn: ${w}`)
if (warnings.length > showWarnings.length) console.log(`... and ${warnings.length - showWarnings.length} more warnings`)

assertClaims()
console.log(`\nerrors after claims: ${errors.length}, warnings: ${warnings.length}`)
for (const e of errors.filter((m) => m.startsWith('claim MISMATCH'))) console.log(`ERROR: ${e}`)

if (errors.length > 0 || (strict && warnings.length > 0)) {
  process.exit(1)
}
