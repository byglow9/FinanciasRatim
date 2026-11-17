import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { initAdmin } from './lib/admin.js'

const FAILED_PRECONDITION = 9
const RETRY_MS = 15_000
const DEFAULT_INDEXES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'firestore.indexes.json')

// Valores de igualdade usados nas consultas de prova. goalId e um marcador que nao existe:
// a consulta so precisa ter indice pronto, nao devolver documentos.
const probeValue = (field, hid) => {
  switch (field) {
    case 'ownerId':
      return hid
    case 'person':
      return 'ele'
    case 'isActive':
      return true
    case 'goalId':
      return '__check-indexes__'
    default:
      throw new Error(`Campo de igualdade sem valor de prova definido: ${field}`)
  }
}

// Uma consulta por indice composto que comeca em ownerId: igualdade em todos os campos
// menos o ultimo, orderBy no ultimo na direcao do indice.
export function buildProbeQueries(indexesJson, hid, db) {
  const probes = []
  for (const index of indexesJson.indexes ?? []) {
    const fields = index.fields ?? []
    if (fields.length < 2 || fields[0].fieldPath !== 'ownerId') continue
    let q = db.collection(index.collectionGroup)
    for (const field of fields.slice(0, -1)) {
      q = q.where(field.fieldPath, '==', probeValue(field.fieldPath, hid))
    }
    const last = fields[fields.length - 1]
    q = q.orderBy(last.fieldPath, last.order === 'DESCENDING' ? 'desc' : 'asc')
    probes.push({
      name: `${index.collectionGroup} (${fields.map((x) => x.fieldPath).join(', ')})`,
      query: q,
    })
  }
  return probes
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Executa todas as consultas com limit 1. FAILED_PRECONDITION (9) = indice ainda nao pronto:
// repete a cada 15 s ate waitSeconds. Qualquer outro erro e relancado.
export async function runChecks({ db, hid, indexesJson, waitSeconds = 0, sleep = defaultSleep, log = () => {} }) {
  let pending = buildProbeQueries(indexesJson, hid, db)
  const total = pending.length
  let waited = 0
  for (;;) {
    const stillPending = []
    for (const probe of pending) {
      try {
        await probe.query.limit(1).get()
      } catch (err) {
        if (err?.code !== FAILED_PRECONDITION) throw err
        stillPending.push(probe)
      }
    }
    pending = stillPending
    if (pending.length === 0) return { ok: true, pending: [], total }
    if (waited >= waitSeconds) break
    log(`${pending.length} indice(s) ainda nao prontos; nova tentativa em ${RETRY_MS / 1000}s`)
    await sleep(RETRY_MS)
    waited += RETRY_MS / 1000
  }
  return { ok: false, pending: pending.map((p) => p.name), total }
}

function parseArgs(argv) {
  const args = { wait: 0 }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--hid') args.hid = argv[++i]
    else if (argv[i] === '--wait') args.wait = Number(argv[++i])
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.hid || Number.isNaN(args.wait)) {
    console.error('Uso: node server/scripts/check-indexes.js --hid <id-do-casal> [--wait <segundos>]')
    process.exit(1)
  }
  const { db } = initAdmin()
  const indexesJson = JSON.parse(fs.readFileSync(DEFAULT_INDEXES, 'utf8'))
  const result = await runChecks({ db, hid: args.hid, indexesJson, waitSeconds: args.wait, log: console.log })
  if (result.ok) {
    console.log(`Todos os ${result.total} indices compostos estao prontos.`)
    return
  }
  console.error(`Indices pendentes (${result.pending.length} de ${result.total}):`)
  for (const name of result.pending) console.error(`  - ${name}`)
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`[script] ${err?.message ?? err}`)
    process.exit(1)
  })
}
