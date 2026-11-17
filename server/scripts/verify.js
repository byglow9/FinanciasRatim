import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { initAdmin } from './lib/admin.js'
import { KNOWN_COLLECTIONS, assertHid } from './backfill.js'
import { countsOf } from './export-firestore.js'

// Portao do cutover (D-13): zero documentos sem ownerId, com ownerId errado ou sem categoryId,
// e contagens comparadas com a linha de base do backup. So imprime contagens e mensagens, nunca dados.

const CATEGORY_COLLECTIONS = ['transactions', 'fixedExpenses', 'bankImports']

// baseline: snapshot do backup ({ collections: { NOME: [docs] } }) ou objeto de contagens { NOME: n }.
function baselineCounts(baseline) {
  if (!baseline) return null
  if (baseline.collections && typeof baseline.collections === 'object') return countsOf(baseline)
  return baseline
}

export async function runVerify({ db, hid, baseline, strict = false }) {
  assertHid(hid)
  const expected = baselineCounts(baseline)
  if (strict && !expected) {
    throw new Error('strict exige uma linha de base (baseline): informe o backup ou as contagens')
  }

  const failures = []
  const collections = {}
  const present = (await db.listCollections()).map((c) => c.id)

  for (const name of present.filter((n) => !KNOWN_COLLECTIONS.includes(n))) {
    failures.push(`${name}: colecao desconhecida (fora das 12 conhecidas)`)
  }

  const names = [...KNOWN_COLLECTIONS, ...present.filter((n) => !KNOWN_COLLECTIONS.includes(n))]
  for (const name of names) {
    const row = { count: 0, withoutOwner: 0, wrongOwner: 0, withoutCategoryId: 0 }
    if (present.includes(name)) {
      const snap = await db.collection(name).get()
      row.count = snap.size
      for (const doc of snap.docs) {
        const owner = doc.get('ownerId')
        if (!owner) row.withoutOwner++
        else if (owner !== hid) row.wrongOwner++
        if (CATEGORY_COLLECTIONS.includes(name)) {
          const text = doc.get('category')
          if (typeof text === 'string' && text.trim() && !doc.get('categoryId')) row.withoutCategoryId++
        }
      }
    }
    collections[name] = row
    if (row.withoutOwner > 0) failures.push(`${name}: ${row.withoutOwner} documento(s) sem ownerId`)
    if (row.wrongOwner > 0) failures.push(`${name}: ${row.wrongOwner} documento(s) com ownerId diferente do hid`)
    if (row.withoutCategoryId > 0) failures.push(`${name}: ${row.withoutCategoryId} documento(s) sem categoryId`)
  }

  const settings = await db.collection('settings').doc('main').get()
  if (!settings.exists) {
    failures.push('settings/main: documento ausente')
  } else {
    const defs = settings.get('categoryDefs')
    if (!Array.isArray(defs) || defs.length === 0) failures.push('settings/main: sem categoryDefs')
  }

  if (expected) {
    for (const name of new Set([...Object.keys(expected), ...names])) {
      const base = expected[name] ?? 0
      const count = collections[name]?.count ?? 0
      if (count < base) {
        failures.push(`${name}: ${count} documento(s), menor que a linha de base (${base})`)
      } else if (strict && count !== base) {
        failures.push(`${name}: ${count} documento(s), diferente da linha de base (${base}); modo estrito exige igual`)
      }
    }
  }

  return { ok: failures.length === 0, collections, failures }
}

function parseArgs(argv) {
  const args = { strict: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--hid') args.hid = argv[++i]
    else if (argv[i] === '--baseline') args.baseline = argv[++i]
    else if (argv[i] === '--strict-counts') args.strict = true
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.hid) {
    console.error('Uso: node server/scripts/verify.js --hid <id-do-casal> [--baseline <backup.json>] [--strict-counts]')
    process.exit(1)
  }
  const baseline = args.baseline ? JSON.parse(fs.readFileSync(args.baseline, 'utf8')) : undefined
  const { db } = initAdmin()
  const result = await runVerify({ db, hid: args.hid, baseline, strict: args.strict })

  console.log('[script] colecao | documentos | sem ownerId | ownerId errado | sem categoryId')
  for (const [name, c] of Object.entries(result.collections)) {
    console.log(`[script] ${name} | ${c.count} | ${c.withoutOwner} | ${c.wrongOwner} | ${c.withoutCategoryId}`)
  }
  for (const f of result.failures) console.log(`[script] FALHA ${f}`)
  console.log(`[script] verify: ${result.ok ? 'OK' : 'FALHOU'}`)
  if (!result.ok) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`[script] ${err?.message ?? err}`)
    process.exit(1)
  })
}
