import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from './lib/admin.js'

// Backup por script (sem Blaze, sem gcloud): serializa TODAS as colecoes em JSON.
// Snapshot: { meta: { exportedAt, version: 1 }, collections: { NOME: [{ id, data }] } }
// Timestamp vira { __ts: true, seconds, nanoseconds }. Tipo que nao sabemos guardar com
// fidelidade (referencia, GeoPoint, bytes...) lanca erro em vez de gerar backup incompleto.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SNAPSHOT_VERSION = 1

function isInside(child, parent) {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function encode(value, where) {
  if (value === null) return null
  if (value instanceof Timestamp) {
    return { __ts: true, seconds: value.seconds, nanoseconds: value.nanoseconds }
  }
  if (Array.isArray(value)) return value.map((v, i) => encode(v, `${where}[${i}]`))
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value
    case 'number':
      if (!Number.isFinite(value)) throw new Error(`Tipo nao suportado no backup: numero nao finito em ${where}`)
      return value
    case 'object': {
      if (!isPlainObject(value)) {
        const kind = value?.constructor?.name ?? 'desconhecido'
        throw new Error(`Tipo nao suportado no backup: ${kind} em ${where}`)
      }
      const out = {}
      for (const [k, v] of Object.entries(value)) {
        if (v === undefined) continue
        out[k] = encode(v, `${where}.${k}`)
      }
      return out
    }
    default:
      throw new Error(`Tipo nao suportado no backup: ${typeof value} em ${where}`)
  }
}

function decode(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(decode)
  if (value.__ts === true && Number.isInteger(value.seconds) && Number.isInteger(value.nanoseconds)) {
    return new Timestamp(value.seconds, value.nanoseconds)
  }
  const out = {}
  for (const [k, v] of Object.entries(value)) out[k] = decode(v)
  return out
}

// Le todas as colecoes de topo (enumeradas por listCollections) e devolve o snapshot.
export async function exportAll(db) {
  const collections = {}
  const refs = await db.listCollections()
  for (const col of refs) {
    const snap = await col.get()
    collections[col.id] = snap.docs.map((doc) => ({
      id: doc.id,
      data: encode(doc.data(), `${col.id}/${doc.id}`),
    }))
  }
  return { meta: { exportedAt: new Date().toISOString(), version: SNAPSHOT_VERSION }, collections }
}

// Protecao contra escrever em producao: so segue com FIRESTORE_EMULATOR_HOST definido.
export function assertEmulator(what = 'esta operacao') {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(`${what} so roda no emulador: defina FIRESTORE_EMULATOR_HOST (recusado para proteger producao)`)
  }
}

// Recarrega um snapshot. NUNCA escreve fora do emulador (protecao contra restaurar sobre producao).
export async function importAll(db, snapshot) {
  assertEmulator('importAll')
  if (snapshot?.meta?.version !== SNAPSHOT_VERSION || typeof snapshot.collections !== 'object') {
    throw new Error(`Snapshot invalido ou versao desconhecida (esperado ${SNAPSHOT_VERSION})`)
  }
  const errors = []
  const writer = db.bulkWriter()
  writer.onWriteError((err) => {
    errors.push({ path: err.documentRef?.path ?? '-', code: err.code })
    return false
  })
  for (const [name, docs] of Object.entries(snapshot.collections)) {
    for (const { id, data } of docs) {
      writer.set(db.collection(name).doc(id), decode(data))
    }
  }
  await writer.close()
  if (errors.length > 0) {
    throw new Error(`Falha ao importar ${errors.length} documento(s): ${errors.map((e) => `${e.path}(${e.code})`).join(', ')}`)
  }
}

// Contagem de documentos por colecao.
export function countsOf(snapshot) {
  const out = {}
  for (const [name, docs] of Object.entries(snapshot.collections)) out[name] = docs.length
  return out
}

// Backups tem dados financeiros: so dentro de backups/ (ignorada pelo git) ou fora do repositorio.
export function assertSafeOutPath(outPath) {
  const resolved = path.resolve(outPath)
  if (isInside(resolved, REPO_ROOT) && !isInside(resolved, path.join(REPO_ROOT, 'backups'))) {
    throw new Error('Caminho recusado: dentro do repositorio so e permitido a pasta backups/ (ignorada pelo git)')
  }
  return resolved
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = argv[++i]
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.out) {
    console.error('Uso: node server/scripts/export-firestore.js --out <caminho.json>  (dentro do repositorio, so em backups/)')
    process.exit(1)
  }
  const target = assertSafeOutPath(args.out)
  const { db, mode, app } = initAdmin()
  const snapshot = await exportAll(db)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, JSON.stringify(snapshot), { mode: 0o600 })
  fs.chmodSync(target, 0o600)

  const counts = countsOf(snapshot)
  console.log(`[script] modo=${mode} projeto=${app.options.projectId ?? '-'} arquivo=${target}`)
  let total = 0
  for (const [name, n] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`[script] ${name}: ${n}`)
    total += n
  }
  console.log(`[script] total: ${total} documento(s)`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`[script] ${err?.message ?? err}`)
    process.exit(1)
  })
}
