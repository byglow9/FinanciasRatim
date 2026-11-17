import { pathToFileURL } from 'node:url'
import { initAdmin } from './lib/admin.js'
import { normalize } from '../../shared/core/classify.js'
import {
  buildCategoryDefs,
  ensureCategoryDefs,
  resolveCategoryId,
  DEFAULT_CATEGORY_DEFS,
} from '../../shared/core/categories.js'

// Backfill de ownerId e categoryId (FUND-02, FUND-05, D-13).
// - Dry-run por padrao; so --apply escreve.
// - So preenche campos AUSENTES: nunca sobrescreve, nunca remove campo, nunca apaga documento.
// - Nunca toca createdAt, description nem o texto de category.
// - Idempotente: a segunda rodada nao tem nada a escrever.

export const KNOWN_COLLECTIONS = [
  'savings',
  'transactions',
  'events',
  'goals',
  'eventCategories',
  'notes',
  'fixedExpenses',
  'fixedExpensePayments',
  'goalContributions',
  'settings',
  'bankConnections',
  'bankImports',
]

// Colecoes com texto de categoria (category) a que o categoryId deve ser acrescentado.
const CATEGORY_COLLECTIONS = ['transactions', 'fixedExpenses', 'bankImports']
const SETTINGS_COLLECTION = 'settings'
const SETTINGS_DOC_ID = 'main'
const MAX_ATTEMPTS = 3
const HID_RE = /^[A-Za-z0-9_-]{8,64}$/

// Mesma regra do create-users.
export function assertHid(hid) {
  if (typeof hid !== 'string' || !HID_RE.test(hid)) {
    throw new Error('hid invalido: use letras, numeros, hifen ou sublinhado, de 8 a 64 caracteres')
  }
}

// Definicoes de categoria a partir de settings/main: categoryDefs existentes, ou montadas dos
// nomes em categories (cor padrao quando o nome coincide com uma categoria padrao).
function baseDefs(settings) {
  if (Array.isArray(settings.categoryDefs) && settings.categoryDefs.length > 0) {
    return { defs: settings.categoryDefs, existing: true }
  }
  const names = Array.isArray(settings.categories) ? settings.categories : []
  const defs = buildCategoryDefs(names).map((def) => {
    const known = DEFAULT_CATEGORY_DEFS.find((d) => normalize(d.name) === normalize(def.name))
    return known?.color ? { ...def, color: known.color } : def
  })
  return { defs, existing: false }
}

function cleanDef(def) {
  return Object.fromEntries(Object.entries(def).filter(([, v]) => v !== undefined))
}

export async function runBackfill({ db, hid, apply = false, log = () => {} }) {
  assertHid(hid)

  // 1. Validacoes antes de qualquer escrita.
  const present = (await db.listCollections()).map((c) => c.id)
  const unknown = present.filter((name) => !KNOWN_COLLECTIONS.includes(name))
  if (unknown.length > 0) {
    throw new Error(
      `Colecao(oes) desconhecida(s): ${unknown.join(', ')}. Inclua em KNOWN_COLLECTIONS (e nas regras) antes de migrar`
    )
  }
  const settingsRef = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID)
  const settingsSnap = await settingsRef.get()
  if (!settingsSnap.exists) {
    throw new Error('settings/main nao existe: abra o app uma vez ou crie o documento antes de migrar')
  }

  // 2. Ler tudo (before).
  const report = {
    apply: Boolean(apply),
    hid,
    collections: {},
    categoryDefsAdded: [],
    conflicts: [],
    errors: [],
  }
  const snaps = {}
  for (const name of KNOWN_COLLECTIONS) {
    snaps[name] = present.includes(name) ? (await db.collection(name).get()).docs : []
    report.collections[name] = { before: snaps[name].length, after: 0, toWrite: 0, written: 0 }
  }

  // 3. Definicoes de categoria: existentes (ou montadas) + orfaos arquivados (D-08).
  const settings = settingsSnap.data()
  const { defs: base, existing } = baseDefs(settings)
  const usedTexts = []
  for (const name of CATEGORY_COLLECTIONS) {
    for (const doc of snaps[name]) {
      const owner = doc.get('ownerId')
      if (owner && owner !== hid) continue
      const text = doc.get('category')
      if (typeof text === 'string' && text.trim()) usedTexts.push(text)
    }
  }
  const { defs, added } = ensureCategoryDefs(base, usedTexts)
  report.categoryDefsAdded = added.map((d) => d.name)

  // 4. Montar um patch por documento, somente com campos ausentes.
  const plan = []
  for (const name of KNOWN_COLLECTIONS) {
    for (const doc of snaps[name]) {
      const owner = doc.get('ownerId')
      if (owner && owner !== hid) {
        report.conflicts.push({ collection: name, id: doc.id, ownerId: owner })
        continue
      }
      const patch = {}
      if (!owner) patch.ownerId = hid
      if (CATEGORY_COLLECTIONS.includes(name)) {
        const text = doc.get('category')
        if (typeof text === 'string' && text.trim() && !doc.get('categoryId')) {
          const id = resolveCategoryId(text, defs)
          if (id) patch.categoryId = id
        }
      }
      if (name === SETTINGS_COLLECTION && doc.id === SETTINGS_DOC_ID && (!existing || added.length > 0)) {
        patch.categoryDefs = defs.map(cleanDef)
      }
      if (Object.keys(patch).length === 0) continue
      report.collections[name].toWrite++
      plan.push({ ref: doc.ref, name, patch })
    }
  }

  // 5. Escrever (so com apply), campo a campo, sem repetir indefinidamente.
  if (apply && plan.length > 0) {
    const writer = db.bulkWriter()
    writer.onWriteError((err) => {
      if (err.failedAttempts < MAX_ATTEMPTS) return true
      report.errors.push({ path: err.documentRef?.path ?? '-', code: err.code })
      return false
    })
    for (const item of plan) {
      writer
        .update(item.ref, item.patch)
        .then(() => {
          report.collections[item.name].written++
        })
        .catch(() => {
          // ja registrado em onWriteError
        })
    }
    await writer.close()
  }

  // 6. Contar de novo (after).
  for (const name of KNOWN_COLLECTIONS) {
    report.collections[name].after = present.includes(name) ? (await db.collection(name).get()).size : 0
  }
  log(`[script] backfill ${apply ? 'apply' : 'dry-run'} concluido`)
  return report
}

function parseArgs(argv) {
  const args = { apply: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--apply') args.apply = true
    else if (argv[i] === '--hid') args.hid = argv[++i]
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.hid) {
    console.error('Uso: node server/scripts/backfill.js --hid <id-do-casal> [--apply]  (sem --apply e so simulacao)')
    process.exit(1)
  }
  const { db } = initAdmin()
  const report = await runBackfill({ db, hid: args.hid, apply: args.apply, log: console.log })

  console.log(`[script] modo=${report.apply ? 'APPLY' : 'dry-run'} hid=${report.hid}`)
  console.log('[script] colecao | antes | depois | a escrever | escritos')
  for (const [name, c] of Object.entries(report.collections)) {
    console.log(`[script] ${name} | ${c.before} | ${c.after} | ${c.toWrite} | ${c.written}`)
  }
  if (report.categoryDefsAdded.length > 0) {
    console.log(`[script] categorias orfas arquivadas: ${report.categoryDefsAdded.length}`)
  }
  for (const c of report.conflicts) {
    console.log(`[script] CONFLITO ${c.collection}/${c.id} ownerId diferente do hid (nao alterado)`)
  }
  for (const e of report.errors) console.log(`[script] ERRO ${e.path} codigo=${e.code}`)
  if (!report.apply) console.log('[script] Simulacao: nada foi escrito. Use --apply para gravar.')
  if (report.errors.length > 0 || report.conflicts.length > 0) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`[script] ${err?.message ?? err}`)
    process.exit(1)
  })
}
