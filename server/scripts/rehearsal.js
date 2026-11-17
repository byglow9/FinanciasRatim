import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { initAdmin } from './lib/admin.js'
import { assertEmulator, countsOf, importAll } from './export-firestore.js'
import { KNOWN_COLLECTIONS, assertHid, runBackfill } from './backfill.js'
import { runVerify } from './verify.js'

// Ensaio completo da migracao (D-13): carrega um backup no emulador, roda backfill em dry-run e
// apply, verify estrito e uma segunda rodada idempotente. So imprime contagens, nunca dados.
// Qualquer divergencia imprime uma linha comecando com MISMATCH e devolve ok falso.
export async function runRehearsal({ db, backupPath, hid, log = () => {} }) {
  assertEmulator('rehearsal')
  assertHid(hid)
  if ((await db.listCollections()).length > 0) {
    throw new Error('O emulador precisa estar vazio para o ensaio: limpe os dados do emulador e rode de novo')
  }

  const snapshot = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
  const mismatches = []
  const mismatch = (message) => {
    mismatches.push(message)
    log(`MISMATCH ${message}`)
  }
  const finish = (tabela) => ({ ok: mismatches.length === 0, tabela, mismatches })

  const backupCounts = countsOf(snapshot)
  const missingOwner = Object.values(snapshot.collections).reduce(
    (acc, docs) => acc + docs.filter((d) => !d.data?.ownerId).length,
    0
  )

  // 1. Importar o backup e conferir as contagens.
  await importAll(db, snapshot)
  const imported = await runVerify({ db, hid })
  for (const [name, n] of Object.entries(backupCounts)) {
    const got = imported.collections[name]?.count ?? 0
    if (got !== n) mismatch(`importacao de ${name}: backup ${n}, emulador ${got}`)
  }

  // 2 e 3. Dry-run (nao pode escrever) e apply.
  let dry
  let applied
  let again
  try {
    dry = await runBackfill({ db, hid, apply: false })
    const dryWritten = Object.values(dry.collections).reduce((a, c) => a + c.written, 0)
    const dryToWrite = Object.values(dry.collections).reduce((a, c) => a + c.toWrite, 0)
    if (dryWritten !== 0) mismatch(`dry-run escreveu ${dryWritten} documento(s)`)
    if (missingOwner > 0 && dryToWrite === 0) mismatch('dry-run nao encontrou nada a escrever, mas ha documentos sem ownerId')

    applied = await runBackfill({ db, hid, apply: true })
    for (const c of applied.conflicts) mismatch(`conflito de ownerId em ${c.collection}`)
    for (const e of applied.errors) mismatch(`erro de escrita em ${e.path} (${e.code})`)
    for (const [name, c] of Object.entries(applied.collections)) {
      if (c.written !== c.toWrite) mismatch(`apply de ${name}: previstos ${c.toWrite}, escritos ${c.written}`)
    }
  } catch (err) {
    mismatch(`backfill falhou: ${err?.message ?? err}`)
    return finish([])
  }

  // 4. Verify estrito com o backup como linha de base.
  const verified = await runVerify({ db, hid, baseline: snapshot, strict: true })
  for (const f of verified.failures) mismatch(`verify: ${f}`)

  // 5. Segunda rodada: idempotente.
  again = await runBackfill({ db, hid, apply: true })
  const againWritten = Object.values(again.collections).reduce((a, c) => a + c.written, 0)
  const againToWrite = Object.values(again.collections).reduce((a, c) => a + c.toWrite, 0)
  if (againWritten !== 0 || againToWrite !== 0) {
    mismatch(`segunda rodada nao e idempotente: previstos ${againToWrite}, escritos ${againWritten}`)
  }

  // 6. Tabela antes e depois, uma linha por colecao.
  const tabela = KNOWN_COLLECTIONS.map((name) => ({
    collection: name,
    before: backupCounts[name] ?? 0,
    after: verified.collections[name]?.count ?? 0,
    withoutOwner: verified.collections[name]?.withoutOwner ?? 0,
  }))
  log('[script] colecao | antes | depois | sem dono')
  for (const row of tabela) {
    log(`[script] ${row.collection} | ${row.before} | ${row.after} | ${row.withoutOwner}`)
    if (row.before !== row.after) mismatch(`contagem de ${row.collection}: antes ${row.before}, depois ${row.after}`)
  }
  log(`[script] ensaio: ${mismatches.length === 0 ? 'OK' : 'FALHOU'}`)
  return finish(tabela)
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--backup') args.backup = argv[++i]
    else if (argv[i] === '--hid') args.hid = argv[++i]
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.backup || !args.hid) {
    console.error('Uso: node server/scripts/rehearsal.js --backup <backup.json> --hid <id-do-casal>  (so no emulador)')
    process.exit(1)
  }
  const { db } = initAdmin()
  const out = await runRehearsal({ db, backupPath: args.backup, hid: args.hid, log: console.log })
  if (!out.ok) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`[script] ${err?.message ?? err}`)
    process.exit(1)
  })
}
